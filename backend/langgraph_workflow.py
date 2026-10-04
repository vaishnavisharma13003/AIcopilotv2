"""
langgraph_workflow.py - MULTI-STEP AI WORKFLOW WITH LANGGRAPH

LangGraph lets us define a pipeline of steps ("nodes") that all read/write
a SHARED STATE object, instead of manually chaining function calls together.

Graph:

    START -> analyze_resume -> analyze_job -> find_skill_gap
          -> generate_questions -> generate_learning_plan -> END
"""

import os
from typing import TypedDict
from langgraph.graph import StateGraph, START, END
from langchain_ollama import ChatOllama

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

_llm = ChatOllama(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL, temperature=0.2)


class JobState(TypedDict):
    resume: str
    job_description: str
    resume_analysis: str
    job_analysis: str
    skill_gap: str
    interview_questions: str
    learning_plan: str


def _ask_llm(prompt: str) -> str:
    try:
        response = _llm.invoke(prompt)
        return response.content.strip()
    except Exception as e:
        # Guardrail: never let one failed LLM call crash the whole graph
        return f"[Error generating this section: {e}]"


# ---------- Node 1: analyze_resume ----------
def analyze_resume(state: JobState) -> JobState:
    prompt = f"""Summarize this resume in a few sentences: key skills,
experience level, and technologies used. Base your summary ONLY on the
text below - do not invent anything.

RESUME:
{state['resume']}
"""
    state["resume_analysis"] = _ask_llm(prompt)
    return state


# ---------- Node 2: analyze_job ----------
def analyze_job(state: JobState) -> JobState:
    prompt = f"""Summarize this job description: required skills, preferred
skills, and experience level needed. Base this ONLY on the text below.

JOB DESCRIPTION:
{state['job_description']}
"""
    state["job_analysis"] = _ask_llm(prompt)
    return state


# ---------- Node 3: find_skill_gap ----------
def find_skill_gap(state: JobState) -> JobState:
    prompt = f"""Compare the resume summary and job summary below.
List: matching skills, missing skills, and partially matching skills.
Do NOT invent skills that were not mentioned in either summary.

RESUME SUMMARY:
{state['resume_analysis']}

JOB SUMMARY:
{state['job_analysis']}
"""
    state["skill_gap"] = _ask_llm(prompt)
    return state


# ---------- Node 4: generate_questions ----------
def generate_questions(state: JobState) -> JobState:
    prompt = f"""Based on this skill gap analysis, write 5 interview
questions a recruiter might ask this candidate for this role. Mix
technical and behavioral questions.

SKILL GAP ANALYSIS:
{state['skill_gap']}
"""
    state["interview_questions"] = _ask_llm(prompt)
    return state


# ---------- Node 5: generate_learning_plan ----------
def generate_learning_plan(state: JobState) -> JobState:
    prompt = f"""Based on the missing/partial skills below, create a
simple 7-day learning plan (one short goal per day) to help the candidate
close the gap before applying.

SKILL GAP ANALYSIS:
{state['skill_gap']}
"""
    state["learning_plan"] = _ask_llm(prompt)
    return state


def build_workflow_graph():
    """Wire up the nodes into a graph and compile it."""
    graph = StateGraph(JobState)

    graph.add_node("analyze_resume", analyze_resume)
    graph.add_node("analyze_job", analyze_job)
    graph.add_node("find_skill_gap", find_skill_gap)
    graph.add_node("generate_questions", generate_questions)
    graph.add_node("generate_learning_plan", generate_learning_plan)

    graph.add_edge(START, "analyze_resume")
    graph.add_edge("analyze_resume", "analyze_job")
    graph.add_edge("analyze_job", "find_skill_gap")
    graph.add_edge("find_skill_gap", "generate_questions")
    graph.add_edge("generate_questions", "generate_learning_plan")
    graph.add_edge("generate_learning_plan", END)

    return graph.compile()


# Compiled once, reused for every request
job_workflow = build_workflow_graph()


def run_job_workflow(resume_text: str, job_description: str) -> dict:
    """Entry point used by the /run-job-workflow endpoint."""
    initial_state: JobState = {
        "resume": resume_text,
        "job_description": job_description,
        "resume_analysis": "",
        "job_analysis": "",
        "skill_gap": "",
        "interview_questions": "",
        "learning_plan": "",
    }
    final_state = job_workflow.invoke(initial_state)
    return dict(final_state)


WORKFLOW_STEPS = [
    "analyze_resume",
    "analyze_job",
    "find_skill_gap",
    "generate_questions",
    "generate_learning_plan",
]


def stream_job_workflow(resume_text: str, job_description: str):
    """
    Generator used by the streaming endpoint. Yields (node_name, state) after
    EACH real graph node finishes, so the UI can show true progress.
    """
    initial_state: JobState = {
        "resume": resume_text,
        "job_description": job_description,
        "resume_analysis": "",
        "job_analysis": "",
        "skill_gap": "",
        "interview_questions": "",
        "learning_plan": "",
    }
    for update in job_workflow.stream(initial_state, stream_mode="updates"):
        for node_name, state in update.items():
            yield node_name, dict(state)
