"""
evaluation.py - BASIC AI RESPONSE EVALUATION

Given a (question, context, answer) triple, this asks Llama 3.2 to grade
the answer on 4 dimensions. We ask for strict JSON output, then validate
and fall back to safe defaults if the model returns something malformed
(guardrail against bad/unparseable model output).
"""

import os
import json
import re
import ollama

OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3.2")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL", "http://localhost:11434")

_client = ollama.Client(host=OLLAMA_BASE_URL)

EVAL_PROMPT_TEMPLATE = """You are an evaluator grading an AI assistant's answer.

QUESTION:
{question}

CONTEXT (the ONLY source of truth the assistant was allowed to use):
{context}

ANSWER (given by the assistant):
{answer}

Grade the ANSWER on these 4 dimensions, each on a scale of 1 (bad) to 5 (excellent):
- relevance: does the answer address the question?
- groundedness: is the answer supported by the context (not made up)?
- hallucination: does the answer contain claims NOT found in the context?
  (score 5 = no hallucination, score 1 = heavily hallucinated)
- completeness: does the answer fully cover what the context allows?

Respond with ONLY valid JSON, no extra text, in exactly this shape:
{{
  "relevance": <1-5>,
  "groundedness": <1-5>,
  "hallucination": <1-5>,
  "completeness": <1-5>,
  "summary": "<one short sentence explaining the scores>"
}}
"""

_DEFAULT_RESULT = {
    "relevance": None,
    "groundedness": None,
    "hallucination": None,
    "completeness": None,
    "summary": "Could not evaluate this answer automatically.",
    "valid": False,
}


def _extract_json(text: str) -> dict | None:
    """Try to pull a JSON object out of the model's raw text output."""
    try:
        return json.loads(text)
    except json.JSONDecodeError:
        pass

    match = re.search(r"\{.*\}", text, re.DOTALL)
    if match:
        try:
            return json.loads(match.group(0))
        except json.JSONDecodeError:
            return None
    return None


def _validate_scores(data: dict) -> bool:
    required_keys = ["relevance", "groundedness", "hallucination", "completeness"]
    for key in required_keys:
        value = data.get(key)
        if not isinstance(value, (int, float)) or not (1 <= value <= 5):
            return False
    return True


def evaluate_answer(question: str, context: str, answer: str) -> dict:
    """Main entry point used by POST /evaluate-answer."""
    if not question or not answer:
        return {**_DEFAULT_RESULT, "summary": "Missing question or answer to evaluate."}

    prompt = EVAL_PROMPT_TEMPLATE.format(
        question=question,
        context=context or "(no context provided)",
        answer=answer,
    )

    try:
        response = _client.chat(
            model=OLLAMA_MODEL,
            messages=[{"role": "user", "content": prompt}],
            format="json",  # ask Ollama to constrain output to valid JSON
        )
        raw_text = response["message"]["content"]
    except Exception as e:
        return {**_DEFAULT_RESULT, "summary": f"Evaluation LLM call failed: {e}"}

    parsed = _extract_json(raw_text)
    if parsed is None or not _validate_scores(parsed):
        return {**_DEFAULT_RESULT, "summary": "Model returned malformed evaluation JSON."}

    return {
        "relevance": parsed["relevance"],
        "groundedness": parsed["groundedness"],
        "hallucination": parsed["hallucination"],
        "completeness": parsed["completeness"],
        "summary": parsed.get("summary", ""),
        "valid": True,
    }
