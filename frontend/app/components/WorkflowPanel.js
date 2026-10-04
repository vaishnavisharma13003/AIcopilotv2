"use client";

import { useState } from "react";
import { apiFetchJSON } from "../lib/api";

export default function WorkflowPanel({ resumeText, jobDescription }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleRun() {
    if (!resumeText || !jobDescription) {
      setError("Analyze a resume AND a job description above first.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await apiFetchJSON("/run-job-workflow", {
        resume_text: resumeText,
        job_description: jobDescription,
      });
      setResult(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="grid grid-2">
      <div className="card">
        <h2>🎤 Interview Preparation</h2>
        <p className="subtitle">Runs the full LangGraph workflow (resume → job → gap → questions → plan).</p>
        <button onClick={handleRun} disabled={loading}>
          {loading ? "Running workflow..." : "Generate Interview Questions & Plan"}
        </button>
        {error && <div className="error-box">{error}</div>}
        {result && <div className="answer-box">{result.interview_questions}</div>}
      </div>

      <div className="card">
        <h2>📚 Learning Plan</h2>
        <p className="subtitle">7-day plan generated from the same workflow run.</p>
        {result ? (
          <div className="answer-box">{result.learning_plan}</div>
        ) : (
          <p className="loading-text">Run the workflow on the left to see your plan here.</p>
        )}
      </div>
    </div>
  );
}
