"""
agent.py - AI TOOL CALLING DEMO

This shows real LLM tool calling (a.k.a. "function calling"), not a fake
simulation. The flow is:

    LLM reads the user's message
        |
        v
    LLM DECIDES whether a tool is needed, and if so, which one + what
    arguments to pass (this decision literally comes back as structured
    data called `tool_calls` in the model's response)
        |
        v
    OUR PYTHON CODE executes the chosen tool function
        |
        v
    We send the tool's result back to the LLM
        |
        v
    LLM writes a final natural-language answer using the tool result

IMPORTANT: We only ever say "the model called tool X" when
`response.tool_calls` actually contains that tool. We never fabricate it.
"""

import os
import json
from langchain_core.tools import tool
from langchain_ollama import ChatOllama

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")


# ---------------------------------------------------------------------
# TOOL DEFINITIONS
# Each function decorated with @tool becomes something the LLM can choose
# to call. LangChain turns the docstring + type hints into a schema the
# model understands.
# ---------------------------------------------------------------------

@tool
def analyze_skills(resume_text: str) -> str:
    """Extract a short comma-separated list of technical skills mentioned
    in the given resume text. Only list skills that literally appear in
    the text."""
    # Simple heuristic extraction (kept dependency-free and deterministic).
    common_skills = [
        "python", "javascript", "react", "next.js", "node", "fastapi",
        "django", "flask", "sql", "postgresql", "mongodb", "docker",
        "kubernetes", "aws", "azure", "gcp", "langchain", "langgraph",
        "machine learning", "deep learning", "pandas", "numpy", "git",
        "java", "c++", "typescript", "html", "css", "tailwind",
    ]
    text_lower = resume_text.lower()
    found = [s for s in common_skills if s in text_lower]
    return ", ".join(found) if found else "No common technical skills detected."


@tool
def generate_interview_questions(topic: str) -> str:
    """Generate 3 short interview question prompts (as plain text) for a
    given technical topic, e.g. 'React' or 'Python backend development'."""
    return (
        f"1. Explain a core concept in {topic} and why it matters.\n"
        f"2. Describe a challenging problem you solved using {topic}.\n"
        f"3. How would you debug a performance issue in a {topic} project?"
    )


@tool
def create_learning_plan(skill: str, days: int = 7) -> str:
    """Create a short day-by-day learning plan (as plain text) for
    learning the given skill over the given number of days."""
    plan_lines = [f"Day {i+1}: Study and practice '{skill}' (build a small exercise)."
                   for i in range(days)]
    return "\n".join(plan_lines)


TOOLS = [analyze_skills, generate_interview_questions, create_learning_plan]
TOOLS_BY_NAME = {t.name: t for t in TOOLS}


def run_tool_calling_demo(user_message: str) -> dict:
    """
    Sends `user_message` to Llama 3.2 with the tools bound. Returns a dict
    describing exactly what happened, including whether a tool was
    actually called by the model.
    """
    llm = ChatOllama(model=OLLAMA_MODEL, base_url=OLLAMA_BASE_URL, temperature=0)
    llm_with_tools = llm.bind_tools(TOOLS)

    # Step 1: LLM decides
    ai_response = llm_with_tools.invoke(user_message)

    tool_calls = getattr(ai_response, "tool_calls", None) or []

    if not tool_calls:
        # The model did NOT call a tool - be honest about that.
        return {
            "tool_called": None,
            "tool_input": None,
            "tool_result": None,
            "final_answer": ai_response.content,
        }

    # Step 2 & 3: Execute the FIRST tool call the model actually made
    call = tool_calls[0]
    tool_name = call["name"]
    tool_args = call["args"]

    if tool_name not in TOOLS_BY_NAME:
        return {
            "tool_called": tool_name,
            "tool_input": tool_args,
            "tool_result": None,
            "final_answer": f"Model requested unknown tool '{tool_name}'.",
        }

    tool_result = TOOLS_BY_NAME[tool_name].invoke(tool_args)

    # Step 4: Send the tool result back to the LLM for a final answer
    follow_up_prompt = (
        f"The tool '{tool_name}' was called with arguments {json.dumps(tool_args)} "
        f"and returned:\n{tool_result}\n\n"
        f"Using this result, write a short final answer to the user's original "
        f"request: \"{user_message}\""
    )
    final_response = llm.invoke(follow_up_prompt)

    return {
        "tool_called": tool_name,
        "tool_input": tool_args,
        "tool_result": tool_result,
        "final_answer": final_response.content,
    }
