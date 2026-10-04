"""
main.py - FastAPI backend for the AI Job Intelligence & Resume Copilot

Run with:
    uvicorn main:app --reload --port 8000

Make sure Ollama is running first:
    ollama run llama3.2
"""

import os
import io
import json
import re
from dotenv import load_dotenv

from fastapi import FastAPI, UploadFile, File, HTTPException, Query
from fastapi.responses import StreamingResponse
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from pypdf import PdfReader
import ollama

import rag

try:  # LangChain RAG is optional - the app still works with manual RAG only
    import langchain_rag
except Exception as _lc_err:  # pragma: no cover
    langchain_rag = None
    print(f"[warn] LangChain RAG unavailable: {_lc_err}")

import langgraph_workflow
import agent
import evaluation
import store

load_dotenv()

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")
FRONTEND_ORIGIN = os.getenv("FRONTEND_ORIGIN", "http://localhost:3000")

app = FastAPI(title="AI Job Copilot Backend")

app.add_middleware(
    CORSMiddleware,
    allow_origins=list({FRONTEND_ORIGIN, "http://localhost:3000", "http://127.0.0.1:3000"}),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

_ollama_client = ollama.Client(host=OLLAMA_BASE_URL)

# Keeps the most recently analyzed resume's raw text in memory so the
# frontend doesn't have to re-upload the PDF for every follow-up request
# (simple in-memory demo state - not multi-user safe, which is fine here).
_last_resume_text = {"text": ""}


# ---------------------------------------------------------------------
# Helpers / guardrails
# ---------------------------------------------------------------------

def call_ollama(prompt: str, as_json: bool = False) -> str:
    """Central place to call Ollama, with connection-error guardrails."""
    try:
        kwargs = {"model": OLLAMA_MODEL, "messages": [{"role": "user", "content": prompt}]}
        if as_json:
            kwargs["format"] = "json"
        response = _ollama_client.chat(**kwargs)
        return response["message"]["content"].strip()
    except Exception as e:
        raise HTTPException(
            status_code=503,
            detail=(
                "Could not reach Ollama. Make sure it is running "
                f"(`ollama run {OLLAMA_MODEL}`) and reachable at {OLLAMA_BASE_URL}. "
                f"Original error: {e}"
            ),
        )


def extract_json_object(text: str) -> dict:
    """Guardrail: pull a JSON object out of model output, handling malformed cases."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass
    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            pass
    raise HTTPException(
        status_code=502,
        detail="The model returned output that could not be parsed as JSON. Please try again.",
    )


async def read_and_validate_pdf(file: UploadFile) -> tuple[bytes, str]:
    """Guardrail: reject empty/invalid files before we waste an LLM call."""
    if not file.filename.lower().endswith(".pdf"):
        raise HTTPException(status_code=400, detail="Only PDF files are accepted.")

    file_bytes = await file.read()
    if not file_bytes:
        raise HTTPException(status_code=400, detail="Uploaded file is empty.")

    try:
        reader = PdfReader(io.BytesIO(file_bytes))
        text = "\n".join((page.extract_text() or "") for page in reader.pages).strip()
    except Exception as e:
        raise HTTPException(status_code=400, detail=f"Could not read PDF: {e}")

    if not text:
        raise HTTPException(
            status_code=400,
            detail="No extractable text found in this PDF (it may be a scanned image).",
        )

    return file_bytes, text


# ---------------------------------------------------------------------
# Request models
# ---------------------------------------------------------------------

class JobDescriptionRequest(BaseModel):
    job_description: str


class MatchRequest(BaseModel):
    resume_text: str
    job_description: str


class WorkflowRequest(BaseModel):
    resume_text: str
    job_description: str


class EvaluateRequest(BaseModel):
    question: str
    context: str
    answer: str


class ToolDemoRequest(BaseModel):
    message: str


# ---------------------------------------------------------------------
# 1. Health check
# ---------------------------------------------------------------------

@app.get("/")
def health_check():
    return {"message": "AI Job Copilot Backend is running"}


# ---------------------------------------------------------------------
# 2. Simple LLM test
# ---------------------------------------------------------------------

@app.get("/ask")
def ask(question: str = Query(..., min_length=1)):
    answer = call_ollama(question)
    return {"question": question, "answer": answer}


# ---------------------------------------------------------------------
# 3. Resume analysis (free text)
# ---------------------------------------------------------------------

@app.post("/analyze-resume")
async def analyze_resume(file: UploadFile = File(...)):
    _, resume_text = await read_and_validate_pdf(file)
    _last_resume_text["text"] = resume_text

    prompt = f"""Analyze the resume below. Summarize the candidate's skills,
experience, and technologies. Base your analysis ONLY on the text given -
do not invent details that are not present.

RESUME:
{resume_text}
"""
    analysis = call_ollama(prompt)
    
    return {"resume_text": resume_text, "analysis": analysis}


# ---------------------------------------------------------------------
# 4. Structured resume analysis
# ---------------------------------------------------------------------

@app.post("/analyze-resume-structured")
async def analyze_resume_structured(file: UploadFile = File(...)):
    _, resume_text = await read_and_validate_pdf(file)
    _last_resume_text["text"] = resume_text

    prompt = f"""Read the resume text below and extract structured information.

Respond with ONLY valid JSON, no extra commentary, in exactly this shape:
{{
  "skills": [],
  "experience": "",
  "technologies": [],
  "projects": [],
  "strengths": [],
  "improvements": []
}}

Rules:
- Only include information that is ACTUALLY present in the resume text.
- Do NOT invent skills, companies, projects, or years of experience.
- "experience" should be a short text summary (e.g. "2 years, mostly backend").
- If a field has nothing relevant, return an empty list or empty string.

RESUME:
{resume_text}
"""
    raw = call_ollama(prompt, as_json=True)
    data = extract_json_object(raw)

    expected_keys = ["skills", "experience", "technologies", "projects", "strengths", "improvements"]
    for key in expected_keys:
        if key not in data:
            data[key] = [] if key != "experience" else ""

    data["resume_text"] = resume_text
    return data


# ---------------------------------------------------------------------
# 5. Job analysis
# ---------------------------------------------------------------------

@app.post("/analyze-job")
def analyze_job(payload: JobDescriptionRequest):
    if not payload.job_description.strip():
        raise HTTPException(status_code=400, detail="job_description cannot be empty.")

    prompt = f"""Read the job description below and extract structured information.

Respond with ONLY valid JSON, no extra commentary, in exactly this shape:
{{
  "required_skills": [],
  "preferred_skills": [],
  "experience_requirements": "",
  "frontend_technologies": [],
  "backend_technologies": [],
  "ai_genai_technologies": [],
  "databases": [],
  "other_requirements": []
}}

Only include information ACTUALLY present in the text below. Do not invent
requirements that aren't mentioned.

JOB DESCRIPTION:
{payload.job_description}
"""
    raw = call_ollama(prompt, as_json=True)
    data = extract_json_object(raw)

    expected_keys = [
        "required_skills", "preferred_skills", "experience_requirements",
        "frontend_technologies", "backend_technologies",
        "ai_genai_technologies", "databases", "other_requirements",
    ]
    for key in expected_keys:
        if key not in data:
            data[key] = [] if key != "experience_requirements" else ""

    saved = store.add_item("job", "Job analysis", {
        "analysis": data,
        "job_description": payload.job_description,
    })
    data["history_id"] = saved["id"]
    return data


# ---------------------------------------------------------------------
# 6. Resume vs job matching
# ---------------------------------------------------------------------

def _norm(items) -> list[str]:
    if not isinstance(items, list):
        return []
    return [str(i).strip() for i in items if str(i).strip()]


def _clamp(value, default: int) -> int:
    try:
        return max(0, min(100, int(round(float(value)))))
    except (TypeError, ValueError):
        return default


def compute_scores(data: dict) -> dict:
    """Deterministic scoring from the skill lists (small LLMs are bad at numbers)."""
    matching = len(data["matching_skills"])
    partial = len(data["partially_matching_skills"])
    missing = len(data["missing_skills"])
    total = matching + partial + missing
    skills_score = round(((matching + 0.5 * partial) / total) * 100) if total else 0
    experience_score = _clamp(data.get("experience_score"), skills_score)
    ats_score = _clamp(data.get("ats_score"), skills_score)
    overall = round(0.6 * skills_score + 0.25 * experience_score + 0.15 * ats_score)
    if overall >= 80:
        verdict = "Strong alignment"
    elif overall >= 60:
        verdict = "Good potential"
    elif overall >= 40:
        verdict = "Partial fit"
    else:
        verdict = "Significant gaps"
    return {
        "overall_score": overall,
        "skills_score": skills_score,
        "experience_score": experience_score,
        "ats_score": ats_score,
        "verdict": verdict,
    }


@app.post("/match-resume")
def match_resume(payload: MatchRequest):
    if not payload.resume_text.strip() or not payload.job_description.strip():
        raise HTTPException(status_code=400, detail="resume_text and job_description are both required.")

    prompt = f"""Compare the RESUME and JOB DESCRIPTION below.

Respond with ONLY valid JSON, no extra commentary, in exactly this shape:
{{
  "matching_skills": [],
  "missing_skills": [],
  "partially_matching_skills": [],
  "relevant_projects": [],
  "experience_match": "",
  "explanation": "",
  "resume_improvement_suggestions": [],
  "experience_score": 0,
  "ats_score": 0
}}

Rules:
- Never invent skills or experience that are not present in the RESUME text.
- "experience_score" is an integer 0-100: how well the candidate's experience level fits the job.
- "ats_score" is an integer 0-100: how well the resume's wording/keywords match the job description.
- Keep each skill short (1-3 words).

RESUME:
{payload.resume_text}

JOB DESCRIPTION:
{payload.job_description}
"""
    raw = call_ollama(prompt, as_json=True)
    data = extract_json_object(raw)

    list_keys = ["matching_skills", "missing_skills", "partially_matching_skills",
                 "relevant_projects", "resume_improvement_suggestions"]
    for key in list_keys:
        data[key] = _norm(data.get(key))
    for key in ("experience_match", "explanation"):
        data[key] = str(data.get(key) or "")

    data.update(compute_scores(data))

    saved = store.add_item("match", f"Match {data['overall_score']}% - {data['verdict']}", {
        "result": data,
        "job_preview": payload.job_description[:160],
    })
    data["history_id"] = saved["id"]
    return data


# ---------------------------------------------------------------------
# 7. Manual RAG endpoints
# ---------------------------------------------------------------------

@app.post("/upload-resume-rag")
async def upload_resume_rag(file: UploadFile = File(...)):
    file_bytes, _ = await read_and_validate_pdf(file)

    text = rag.extract_text_from_pdf(file_bytes)
    chunks = rag.chunk_text(text)
    if not chunks:
        raise HTTPException(status_code=400, detail="Could not build chunks from this resume.")

    rag.build_faiss_index(chunks)
    return {"message": "Resume indexed for manual RAG.", "chunk_count": len(chunks)}


@app.get("/resume-chat")
def resume_chat(question: str = Query(..., min_length=1)):
    if not rag.manual_rag_store.is_ready():
        raise HTTPException(
            status_code=400,
            detail="No resume has been uploaded for manual RAG yet. Call /upload-resume-rag first.",
        )
    try:
        return rag.answer_resume_question(question)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


# ---------------------------------------------------------------------
# 8. LangChain RAG endpoints
# ---------------------------------------------------------------------

@app.post("/langchain-upload-resume")
async def langchain_upload_resume(file: UploadFile = File(...)):
    if langchain_rag is None:
        raise HTTPException(status_code=503, detail="LangChain RAG is not installed on this server.")
    file_bytes, _ = await read_and_validate_pdf(file)
    try:
        chunk_count = langchain_rag.build_langchain_index(file_bytes)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    return {"message": "Resume indexed with LangChain RAG.", "chunk_count": chunk_count}


@app.get("/langchain-resume-chat")
def langchain_resume_chat(question: str = Query(..., min_length=1)):
    if langchain_rag is None or not langchain_rag.langchain_rag_store.is_ready():
        raise HTTPException(
            status_code=400,
            detail="No resume has been uploaded for LangChain RAG yet. Call /langchain-upload-resume first.",
        )
    try:
        return langchain_rag.answer_question_langchain(question)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))


# ---------------------------------------------------------------------
# 9. LangGraph workflow
# ---------------------------------------------------------------------

@app.post("/run-job-workflow")
def run_job_workflow(payload: WorkflowRequest):
    if not payload.resume_text.strip() or not payload.job_description.strip():
        raise HTTPException(status_code=400, detail="resume_text and job_description are both required.")
    try:
        result = langgraph_workflow.run_job_workflow(payload.resume_text, payload.job_description)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Workflow failed: {e}")
    return result


# ---------------------------------------------------------------------
# 10. Tool calling demo (agent.py)
# ---------------------------------------------------------------------

@app.post("/tool-demo")
def tool_demo(payload: ToolDemoRequest):
    if not payload.message.strip():
        raise HTTPException(status_code=400, detail="message cannot be empty.")
    try:
        return agent.run_tool_calling_demo(payload.message)
    except Exception as e:
        raise HTTPException(status_code=503, detail=f"Tool calling demo failed: {e}")


# ---------------------------------------------------------------------
# 11. Evaluation
# ---------------------------------------------------------------------

@app.post("/evaluate-answer")
def evaluate_answer(payload: EvaluateRequest):
    return evaluation.evaluate_answer(payload.question, payload.context, payload.answer)


# =====================================================================
# NEW APIs powering the sidebar pages
# =====================================================================

import asyncio
import time
from typing import Optional

import langgraph_workflow as _lgw

_RESUME_PROMPT = """Read the resume text below and extract structured information.

Respond with ONLY valid JSON, no extra commentary, in exactly this shape:
{{
  "name": "",
  "headline": "",
  "skills": [],
  "experience": "",
  "technologies": [],
  "projects": [],
  "strengths": [],
  "improvements": []
}}

Rules:
- Only include information that is ACTUALLY present in the resume text.
- Do NOT invent skills, companies, projects, or years of experience.
- "name" is the candidate's name if clearly present, else "".
- "headline" is a one-line professional summary (max 14 words).
- "experience" is a short text summary (e.g. "2 years, mostly backend").
- If a field has nothing relevant, return an empty list or empty string.

RESUME:
{resume}
"""


def _ensure_manual_index(resume_text: str) -> int:
    chunks = rag.chunk_text(resume_text)
    if not chunks:
        raise HTTPException(status_code=400, detail="Could not build chunks from this resume.")
    rag.build_faiss_index(chunks)
    return len(chunks)


# ---------------------------------------------------------------------
# 12. Health / system status (sidebar status card + settings)
# ---------------------------------------------------------------------

@app.get("/health")
def health():
    started = time.time()
    ollama_ok, models, error = False, [], None
    try:
        listing = _ollama_client.list()
        raw = listing["models"] if isinstance(listing, dict) else getattr(listing, "models", [])
        for m in raw:
            name = m.get("model") if isinstance(m, dict) else getattr(m, "model", None)
            if name:
                models.append(name)
        ollama_ok = True
    except Exception as e:
        error = str(e)

    model_ready = any(m.split(":")[0] == OLLAMA_MODEL.split(":")[0] for m in models)
    return {
        "backend": True,
        "ollama": ollama_ok,
        "model": OLLAMA_MODEL,
        "model_ready": model_ready,
        "available_models": models,
        "manual_rag_ready": rag.manual_rag_store.is_ready(),
        "langchain_rag_ready": bool(langchain_rag and langchain_rag.langchain_rag_store.is_ready()),
        "langchain_available": langchain_rag is not None,
        "resume_loaded": bool(_last_resume_text["text"]),
        "history_count": len(store.list_items()),
        "latency_ms": round((time.time() - started) * 1000),
        "error": error,
    }


# ---------------------------------------------------------------------
# 13. One-shot resume upload: analyze + index for chat (both RAG engines)
# ---------------------------------------------------------------------

@app.post("/resume/upload")
async def resume_upload(file: UploadFile = File(...)):
    file_bytes, resume_text = await read_and_validate_pdf(file)
    _last_resume_text["text"] = resume_text

    raw = call_ollama(_RESUME_PROMPT.format(resume=resume_text), as_json=True)
    data = extract_json_object(raw)
    for key in ["skills", "technologies", "projects", "strengths", "improvements"]:
        data[key] = _norm(data.get(key))
    for key in ["name", "headline", "experience"]:
        data[key] = str(data.get(key) or "")

    chunk_count = _ensure_manual_index(resume_text)
    langchain_chunks = 0
    if langchain_rag is not None:
        try:
            langchain_chunks = langchain_rag.build_langchain_index(file_bytes)
        except Exception as e:  # never fail the upload because of the optional engine
            print(f"[warn] LangChain indexing failed: {e}")

    data.update({
        "resume_text": resume_text,
        "filename": file.filename,
        "word_count": len(resume_text.split()),
        "chunk_count": chunk_count,
        "langchain_chunk_count": langchain_chunks,
    })
    saved = store.add_item("resume", data.get("name") or file.filename, {
        "analysis": {k: v for k, v in data.items() if k != "resume_text"},
        "resume_text": resume_text,
    })
    data["history_id"] = saved["id"]
    return data


# ---------------------------------------------------------------------
# 14. Unified chat endpoint (manual RAG or LangChain RAG)
# ---------------------------------------------------------------------

class ChatRequest(BaseModel):
    question: str
    engine: str = "manual"            # "manual" | "langchain"
    resume_text: Optional[str] = None  # lets us rebuild the index after a server restart


@app.post("/chat")
def chat(payload: ChatRequest):
    question = payload.question.strip()
    if not question:
        raise HTTPException(status_code=400, detail="question cannot be empty.")

    resume_text = payload.resume_text or _last_resume_text["text"]
    if not rag.manual_rag_store.is_ready():
        if not resume_text:
            raise HTTPException(status_code=400, detail="Upload a resume first so I have something to answer from.")
        _ensure_manual_index(resume_text)

    engine = payload.engine
    started = time.time()
    try:
        if engine == "langchain" and langchain_rag and langchain_rag.langchain_rag_store.is_ready():
            result = langchain_rag.answer_question_langchain(question)
        else:
            engine = "manual"
            result = rag.answer_resume_question(question)
    except RuntimeError as e:
        raise HTTPException(status_code=503, detail=str(e))

    return {
        "question": question,
        "answer": result["answer"],
        "sources": result.get("context_used", []),
        "engine": engine,
        "latency_ms": round((time.time() - started) * 1000),
    }


# ---------------------------------------------------------------------
# 15. Streaming LangGraph workflow (real per-node progress, NDJSON)
# ---------------------------------------------------------------------

@app.post("/run-job-workflow-stream")
def run_job_workflow_stream(payload: WorkflowRequest):
    if not payload.resume_text.strip() or not payload.job_description.strip():
        raise HTTPException(status_code=400, detail="resume_text and job_description are both required.")

    def generate():
        final_state = {}
        try:
            for node, state in _lgw.stream_job_workflow(payload.resume_text, payload.job_description):
                final_state = state
                yield json.dumps({"event": "step", "node": node, "state": state}) + "\n"
            saved = store.add_item("workflow", "Interview plan", {
                "interview_questions": final_state.get("interview_questions", ""),
                "learning_plan": final_state.get("learning_plan", ""),
                "skill_gap": final_state.get("skill_gap", ""),
            })
            yield json.dumps({"event": "done", "history_id": saved["id"]}) + "\n"
        except Exception as e:
            yield json.dumps({"event": "error", "detail": f"Workflow failed: {e}"}) + "\n"

    return StreamingResponse(generate(), media_type="application/x-ndjson")


# ---------------------------------------------------------------------
# 16. Job board (demo data, optionally through the real MCP server)
# ---------------------------------------------------------------------

_JOBS_FILE = os.path.join(os.path.dirname(__file__), "jobs.json")


def _load_jobs() -> list[dict]:
    with open(_JOBS_FILE, "r", encoding="utf-8") as f:
        return json.load(f).get("jobs", [])


@app.get("/jobs/search")
async def jobs_search(keyword: str = "", location: str = "", via_mcp: bool = False):
    if via_mcp:
        try:
            import mcp_client
            text = await asyncio.wait_for(
                mcp_client.call_mcp_tool("search_jobs", {"keyword": keyword, "location": location}), 30
            )
            data = json.loads(text)
            data["source"] = "mcp"
            data["locations"] = sorted({j["location"] for j in _load_jobs()})
            return data
        except Exception as e:
            print(f"[warn] MCP search failed, using direct search: {e}")

    kw, loc = keyword.lower().strip(), location.lower().strip()
    jobs = _load_jobs()
    results = []
    for job in jobs:
        hay = " ".join([job["title"], job["description"], " ".join(job["keywords"])]).lower()
        if (not kw or kw in hay) and (not loc or loc in job["location"].lower()):
            results.append(job)
    return {
        "notice": "DEMO DATA - not real, live job postings.",
        "source": "direct",
        "count": len(results),
        "jobs": results,
        "locations": sorted({j["location"] for j in jobs}),
    }


class RecommendRequest(BaseModel):
    skills: list[str]


@app.post("/jobs/recommend")
def jobs_recommend(payload: RecommendRequest):
    """Rank demo jobs by overlap between the candidate's skills and each job's keywords."""
    cand = {s.strip().lower() for s in payload.skills if s.strip()}
    if not cand:
        raise HTTPException(status_code=400, detail="No skills provided. Analyze a resume first.")

    ranked = []
    for job in _load_jobs():
        req = {k.lower() for k in job["keywords"]}
        # a candidate skill counts if it equals, or is contained in / contains, a job keyword
        matched = sorted(k for k in req if any(c == k or c in k or k in c for c in cand))
        missing = sorted(req - set(matched))
        score = round(len(matched) / len(req) * 100) if req else 0
        ranked.append({**job, "match_score": score, "matched_skills": matched, "missing_skills": missing})
    ranked.sort(key=lambda j: j["match_score"], reverse=True)
    return {"notice": "DEMO DATA - not real, live job postings.", "jobs": ranked}


# ---------------------------------------------------------------------
# 17. History
# ---------------------------------------------------------------------

@app.get("/history")
def history_list(kind: Optional[str] = None):
    items = store.list_items(kind)
    # light list view: strip heavy payloads such as the resume text
    light = []
    for i in items:
        payload = i["payload"]
        light.append({**i, "payload": {k: v for k, v in payload.items() if k != "resume_text"}})
    return {"items": light}


@app.get("/history/{item_id}")
def history_get(item_id: str):
    item = store.get_item(item_id)
    if not item:
        raise HTTPException(status_code=404, detail="History item not found.")
    return item


@app.delete("/history/{item_id}")
def history_delete(item_id: str):
    if not store.delete_item(item_id):
        raise HTTPException(status_code=404, detail="History item not found.")
    return {"deleted": item_id}


@app.delete("/history")
def history_clear():
    return {"deleted": store.clear_items()}
