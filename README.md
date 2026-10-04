# AI Job Intelligence & Resume Copilot

A full-stack, **100% local** GenAI project: upload a resume, paste a job
description, and get AI-powered analysis, matching, interview prep, and a
learning plan - powered entirely by **Ollama + Llama 3.2** (no OpenAI key
needed, no cloud LLM calls).

---

## 1. Project Overview

This project is a learning-focused, beginner-friendly demo that touches
every core piece of the modern GenAI stack: prompting, structured output,
manual RAG, LangChain RAG, LangGraph multi-step workflows, LLM tool
calling, the Model Context Protocol (MCP), and basic evaluation/guardrails
- all wired into a real Next.js + FastAPI app.

## 2. Features

- Upload a resume PDF and get a structured analysis (skills, experience,
  technologies, projects, strengths, improvements)
- Chat with your resume using **two different RAG implementations** (manual
  and LangChain) so you can compare them
- Paste a job description and extract structured requirements
- Compare resume vs. job description: matching / missing / partial skills
- Auto-generate interview questions and a 7-day learning plan via a
  **LangGraph** multi-step workflow
- A working **LLM tool-calling** demo (`agent.py`)
- A working **MCP server + client** with job-search and skill-matching tools
- Basic **AI response evaluation** (relevance, groundedness, hallucination,
  completeness) and **guardrails** against hallucination and bad input

## 3. Architecture

```
User
  |
  v
Next.js Frontend (React, JavaScript only)
  |
  v
FastAPI Backend
  |
  v
Ollama running Llama 3.2 (local)
```

**Manual RAG pipeline** (`rag.py`):
```
Resume PDF -> Text Extraction -> Chunking -> Embeddings (Sentence Transformers)
  -> FAISS -> Retriever -> Relevant Context -> Llama 3.2 -> Answer
```

**LangGraph workflow** (`langgraph_workflow.py`):
```
START -> analyze_resume -> analyze_job -> find_skill_gap
      -> generate_questions -> generate_learning_plan -> END
```

**MCP flow** (`mcp_server.py` + `mcp_client.py`):
```
AI Application -> MCP Client -> MCP Server -> Tools -> Job data / skill matching
```

## 4. Tech Stack

| Layer | Tech |
|---|---|
| Frontend | Next.js, React, plain CSS (JavaScript only, no TypeScript) |
| Backend | Python, FastAPI |
| Local LLM | Ollama running `llama3.2` |
| RAG / GenAI | LangChain, LangGraph, Sentence Transformers, FAISS |
| Tooling | MCP Python SDK |
| Documents | PyPDF |

## 5. Folder Structure

```
aiJobCopilot/
├── backend/
│   ├── main.py                 # FastAPI app + all endpoints
│   ├── rag.py                  # Manual RAG (hand-written)
│   ├── langchain_rag.py        # RAG built with LangChain
│   ├── langgraph_workflow.py   # LangGraph multi-step workflow
│   ├── agent.py                # LLM tool-calling demo
│   ├── mcp_server.py           # MCP server ("Job Copilot")
│   ├── mcp_client.py           # MCP client demo script
│   ├── evaluation.py           # Answer evaluation logic
│   ├── jobs.json               # DEMO job data (not real postings)
│   ├── requirements.txt
│   ├── .env.example
│   └── README.md
├── frontend/
│   ├── app/
│   │   ├── page.js             # Main dashboard
│   │   ├── layout.js
│   │   ├── globals.css
│   │   ├── lib/api.js          # Fetch helper
│   │   └── components/         # ResumeUpload, ResumeChat, JobAnalyzer, ...
│   ├── package.json
│   └── README.md
└── README.md                   # This file
```

## 6. Prerequisites

- **Windows 10/11** (this guide is written for Windows, but the same
  commands work on macOS/Linux with the noted shell differences)
- **Python 3.10+**
- **Node.js 18+** and npm
- **Ollama** installed (see below)
- ~5 GB free disk space for the Llama 3.2 model + embedding model

## 7. Install & Run Ollama

1. Download and install Ollama from https://ollama.com/download
2. Pull the model:
   ```bash
   ollama pull llama3.2
   ```
3. Start the model (keep this terminal open, or let the Ollama background
   service handle it - either way it listens on `http://localhost:11434`):
   ```bash
   ollama run llama3.2
   ```
4. Verify it's up:
   ```bash
   curl http://localhost:11434
   ```

## 8. Python Setup

```bash
cd aiJobCopilot/backend
python -m venv venv
venv\Scripts\activate          REM Windows
# source venv/bin/activate     # macOS/Linux

pip install -r requirements.txt
```

The first run will also download the `all-MiniLM-L6-v2` embedding model
from Hugging Face (a few hundred MB) - this happens automatically the
first time `rag.py` / `langchain_rag.py` runs and is cached afterward.

## 9. Backend Setup

```bash
cd aiJobCopilot/backend
copy .env.example .env         REM Windows
# cp .env.example .env         # macOS/Linux

uvicorn main:app --reload --port 8000
```

Backend now runs at **http://localhost:8000** (interactive docs at
`/docs`).

## 10. Frontend Setup

```bash
cd aiJobCopilot/frontend
npm install
npm run dev
```

Frontend now runs at **http://localhost:3000**.

## 11. How to Run (all pieces, in order)

1. **Ollama**: `ollama run llama3.2` (leave running)
2. **Backend**: `uvicorn main:app --reload --port 8000` (from `backend/`)
3. **Frontend**: `npm run dev` (from `frontend/`)
4. Open http://localhost:3000 in your browser
5. **MCP client demo** (optional, separate terminal, from `backend/` with
   the venv active): `python mcp_client.py`

## 12. How to Test Each API

You can test everything with the frontend UI, or directly with `curl` /
the FastAPI docs page at http://localhost:8000/docs.

- **Health endpoint**: `curl http://localhost:8000/`
- **Simple LLM**: `curl "http://localhost:8000/ask?question=What is FastAPI?"`
- **Resume analyzer**: `POST /analyze-resume` with a PDF file field named `file`
- **Structured resume analyzer**: `POST /analyze-resume-structured`, same file field
- **Job analyzer**: `POST /analyze-job` with JSON `{"job_description": "..."}`
- **Resume/job matching**: `POST /match-resume` with JSON `{"resume_text": "...", "job_description": "..."}`
- **Manual RAG**: `POST /upload-resume-rag` (file) then `GET /resume-chat?question=...`
- **LangChain RAG**: `POST /langchain-upload-resume` (file) then `GET /langchain-resume-chat?question=...`
- **LangGraph workflow**: `POST /run-job-workflow` with JSON `{"resume_text": "...", "job_description": "..."}`
- **Tool calling demo**: `POST /tool-demo` with JSON `{"message": "What skills are in this resume: Python, React, Docker"}`
- **Evaluation**: `POST /evaluate-answer` with JSON `{"question": "...", "context": "...", "answer": "..."}`

## 13. How to Test MCP

```bash
cd backend
venv\Scripts\activate
python mcp_client.py
```

This will: launch `mcp_server.py` as a subprocess, initialize the MCP
session, list the available tools, then call `search_jobs` and
`calculate_skill_match`, printing the results to your terminal.

## 14. How RAG Works (manual, `rag.py`)

1. Extract text from the uploaded PDF with PyPDF
2. Split the text into overlapping chunks (character-based)
3. Embed each chunk with Sentence Transformers (`all-MiniLM-L6-v2`)
4. Store the embeddings in a FAISS `IndexFlatL2` index
5. When a question comes in, embed it the same way and search FAISS for
   the closest chunks
6. Send only those retrieved chunks + the question to Llama 3.2, with a
   prompt that forbids answering outside the given context

## 15. How LangChain Is Used

`langchain_rag.py` re-implements the exact same RAG pipeline using
LangChain's building blocks instead of hand-written code:
`RecursiveCharacterTextSplitter` for chunking, `HuggingFaceEmbeddings` for
embeddings, LangChain's `FAISS` vector store wrapper, `ChatOllama` for
generation, and an LCEL chain (`retriever | prompt | llm | parser`) to
wire it all together. Comparing this file to `rag.py` is a good way to
see exactly what a framework abstracts away.

## 16. How LangGraph Is Used

`langgraph_workflow.py` defines a shared `TypedDict` state
(`resume`, `job_description`, `resume_analysis`, `job_analysis`,
`skill_gap`, `interview_questions`, `learning_plan`) and five node
functions, each reading from and writing to that state. `StateGraph` wires
the nodes into a linear pipeline (`START -> ... -> END`), which is
compiled once and invoked per request from `/run-job-workflow`.

## 17. How Agents / Tools Are Used

`agent.py` defines three LangChain tools (`analyze_skills`,
`generate_interview_questions`, `create_learning_plan`) and binds them to
`ChatOllama` with `.bind_tools()`. When you call `/tool-demo`, the model
itself decides whether to call a tool (visible in `response.tool_calls`);
our code only executes a tool if the model actually requested it, then
sends the tool's result back to the model for a final natural-language
answer.

## 18. How MCP Is Used

`mcp_server.py` uses the official MCP Python SDK's `FastMCP` helper to
expose two tools (`search_jobs`, `calculate_skill_match`) over the MCP
protocol via stdio transport. `mcp_client.py` is a standalone script that
launches the server as a subprocess, performs the MCP handshake
(`session.initialize()`), lists tools (`session.list_tools()`), and calls
them (`session.call_tool(...)`). This is the same pattern you'd use to let
any MCP-compatible AI app (not just this one) use these tools.

## 19. Evaluation and Guardrails

- **Evaluation** (`evaluation.py`): given a question/context/answer triple,
  asks the model to self-grade relevance, groundedness, hallucination, and
  completeness (1-5), requesting strict JSON output. Malformed or
  out-of-range output is caught and replaced with a safe "could not
  evaluate" fallback rather than crashing.
- **Guardrails** across the backend:
  - Every structured-output prompt explicitly forbids inventing
    skills/companies/projects/experience
  - RAG answers are restricted to retrieved context only, with a fixed
    fallback sentence when nothing relevant is found
  - Uploaded files are validated (must be a non-empty PDF with
    extractable text) before any LLM call is made
  - Ollama connection failures return a clear `503` with a helpful message
    instead of a raw stack trace
  - Malformed JSON from the model is caught and re-parsed defensively
    (`extract_json_object`), with a clear `502` error if it still fails
  - `jobs.json` is explicitly labeled as demo data everywhere it's used

## 20. Troubleshooting

| Problem | Fix |
|---|---|
| `Could not reach Ollama` errors | Make sure `ollama run llama3.2` is running and reachable at `http://localhost:11434` |
| Backend status bar shows "unreachable" | Start the backend: `uvicorn main:app --reload --port 8000` from `backend/` |
| `ModuleNotFoundError` in backend | Activate your venv, then `pip install -r requirements.txt` again |
| CORS errors in browser console | Confirm the frontend runs on `http://localhost:3000` (matches `FRONTEND_ORIGIN` in `.env`) |
| Slow first request | The embedding model + Llama 3.2 both need to "warm up" on first use - this is normal |
| "No extractable text found in this PDF" | The PDF is likely a scanned image; use a text-based PDF resume |
| `faiss` install issues on Windows | Make sure you're using `faiss-cpu` (already in `requirements.txt`), not `faiss-gpu` |
| MCP client hangs or errors | Make sure you're running `python mcp_client.py` from inside `backend/` with the venv active, and that `mcp_server.py` is in the same folder |
| Model output isn't valid JSON | The backend already retries/parses defensively; if it still fails, Llama 3.2 sometimes needs a re-run - just click the button again |

## 21. Interview Preparation

Short, interview-ready explanations for concepts used in this project:

- **Generative AI**: AI models that generate new content (text, images,
  code) rather than just classifying or predicting a label, typically by
  learning the statistical patterns of huge training datasets.
- **LLM (Large Language Model)**: A neural network, usually
  transformer-based, trained on massive text corpora to predict the next
  token in a sequence - which turns out to be enough to power
  conversation, reasoning, and generation.
- **Tokens**: The chunks (often sub-words) that text is broken into before
  being fed to a model; models process and generate one token at a time,
  and API/compute costs are usually measured in tokens.
- **Embeddings**: Numeric vector representations of text where semantic
  similarity maps to geometric closeness - "dog" and "puppy" end up near
  each other in vector space, letting us do similarity search.
- **Transformers**: The neural network architecture behind modern LLMs,
  built around the self-attention mechanism, which lets the model weigh
  the relevance of every other token when processing each token.
- **Attention**: The mechanism that lets a transformer decide, for each
  token, how much to "attend to" every other token in the sequence -
  this is how the model captures context and relationships between words.
- **RAG (Retrieval-Augmented Generation)**: Instead of relying purely on
  what the model memorized during training, you retrieve relevant
  documents/chunks at query time and feed them into the prompt, grounding
  the answer in real, up-to-date, specific data.
- **Vector database**: A database optimized for storing embeddings and
  doing fast nearest-neighbor similarity search (this project uses FAISS,
  a library rather than a full server-based vector DB, which is common
  for local/demo projects).
- **LangChain**: A framework that provides reusable building blocks
  (prompts, chains, retrievers, tool wrappers, model integrations) so you
  don't have to hand-write every piece of an LLM pipeline.
- **LangGraph**: A LangChain-adjacent library for building multi-step,
  stateful LLM workflows as a graph of nodes that read/write shared state
  - useful when a task needs several ordered (or branching) LLM steps.
- **AI agents**: Systems where an LLM doesn't just answer directly, but
  can decide to take actions (call tools, retrieve data, loop) to
  accomplish a goal, based on its own reasoning about what's needed.
- **Tool calling / function calling**: A capability where the model can
  emit a structured request ("call function X with these arguments")
  instead of, or in addition to, plain text - your code then executes the
  real function and optionally returns the result to the model.
- **MCP (Model Context Protocol)**: An open, standardized protocol for
  connecting AI applications to external tools/data sources, so a tool
  built once (an MCP server) can be reused by any MCP-compatible client,
  instead of writing custom integration code per AI app.
- **Hallucination**: When a model confidently generates information that
  is false or not supported by its input/context - a core risk that RAG,
  grounding prompts, and evaluation all try to reduce.
- **Guardrails**: Rules and checks - in prompts and in application code -
  that constrain model behavior (e.g., "only answer from this context",
  input validation, output validation) to reduce hallucination, unsafe
  output, or application crashes from bad model output.
- **Evaluation**: Systematically measuring how good an AI system's outputs
  are (e.g., relevance, groundedness, completeness) rather than just
  eyeballing a few examples - critical for catching regressions.
- **Structured output**: Constraining a model's response to a specific
  machine-readable format (usually JSON) so downstream code can reliably
  parse and use it, instead of parsing free-form text.

## 22. Future Improvements

- Persist RAG indexes and analysis history per user (currently in-memory,
  single-session)
- Stream LLM responses token-by-token to the frontend instead of waiting
  for the full response
- Add authentication if this were to become multi-user
- Swap FAISS for a persistent vector DB (e.g., Chroma, Qdrant) for larger
  document sets
- Add automated tests (pytest for backend, React Testing Library for
  frontend)
- Add real job-board API integration behind the MCP server (clearly
  distinct from the current demo data)

---

## Installation Commands (all in order)

```bash
# 1. Ollama
ollama pull llama3.2

# 2. Backend
cd aiJobCopilot/backend
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
copy .env.example .env

# 3. Frontend
cd ../frontend
npm install
```

## Run Commands

```bash
# Terminal 1 - Ollama
ollama run llama3.2

# Terminal 2 - Backend
cd aiJobCopilot/backend
venv\Scripts\activate
uvicorn main:app --reload --port 8000

# Terminal 3 - Frontend
cd aiJobCopilot/frontend
npm run dev

# Terminal 4 (optional) - MCP client demo
cd aiJobCopilot/backend
venv\Scripts\activate
python mcp_client.py
```

## Testing Checklist

- [ ] `curl http://localhost:8000/` returns the health message
- [ ] `/ask?question=...` returns an answer from Llama 3.2
- [ ] Upload a resume PDF in the UI → structured analysis appears
- [ ] Index a resume in "Resume Chat" → ask a question → grounded answer appears
- [ ] Paste a job description → "Analyze Job" → structured requirements appear
- [ ] With both a resume and job analyzed, "Compare Resume to Job" shows matches/gaps
- [ ] "Generate Interview Questions & Plan" runs the LangGraph workflow end-to-end
- [ ] `POST /evaluate-answer` returns relevance/groundedness/hallucination/completeness scores
- [ ] `python mcp_client.py` lists tools and prints `search_jobs` + `calculate_skill_match` results

## Troubleshooting

See section 20 above.

## Interview Preparation

See section 21 above.


---

## 9. Sidebar pages (v2)

Every sidebar item is now a real route backed by a real API. Your resume, job,
match, chat and plan are shared between pages and persisted in the browser, and
every generated result is also saved on the backend (`backend/data/history.json`).

| Page | Route | What it does | Backend API |
|---|---|---|---|
| Dashboard | `/` | Journey tracker, live stats, recent activity, system status | `GET /health`, `GET /history` |
| Resume Analyzer | `/resume` | Drag & drop PDF -> structured analysis + indexes the resume for chat (manual + LangChain RAG) | `POST /resume/upload` |
| Job Analyzer | `/job` | Extract requirements from a job description | `POST /analyze-job` |
| Resume Match | `/match` | Overall / skills / experience / ATS scores, skill compatibility, suggestions | `POST /match-resume` |
| Resume Chat | `/chat` | RAG chat with engine switch, sources, and per-answer evaluation | `POST /chat`, `POST /evaluate-answer` |
| AI Workflow | `/workflow` | LangGraph pipeline with real per-step progress, export to Markdown | `POST /run-job-workflow-stream` |
| Job Board | `/jobs` | Search demo jobs (optionally via the MCP server), rank them by your resume | `GET /jobs/search`, `POST /jobs/recommend` |
| AI Agent | `/agent` | Tool-calling playground with a full call trace | `POST /tool-demo` |
| History | `/history` | Restore or delete anything you generated | `GET/DELETE /history` |

Existing endpoints (`/analyze-resume-structured`, `/upload-resume-rag`, `/resume-chat`,
`/langchain-*`, `/run-job-workflow`, ...) are unchanged.

### Run it

```bash
# terminal 1
ollama pull llama3.2 && ollama serve
# terminal 2
cd backend && pip install -r requirements.txt && uvicorn main:app --reload --port 8000
# terminal 3
cd frontend && npm install && npm run dev
```
