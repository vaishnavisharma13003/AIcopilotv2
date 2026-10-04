"use client";

import { useState } from "react";
import { apiFetchJSON } from "../lib/api";
import TagList from "./TagList";

export default function JobAnalyzer({ onJobDescriptionChange }) {
  const [jobText, setJobText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);

  async function handleAnalyze() {
    if (!jobText.trim()) {
      setError("Paste a job description first.");
      return;
    }
    setLoading(true);
    setError("");
    setAnalysis(null);
    try {
      const data = await apiFetchJSON("/analyze-job", { job_description: jobText });
      setAnalysis(data);
      onJobDescriptionChange?.(jobText);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>🧭 Job Analyzer</h2>
      <p className="subtitle">Paste a job description to break it down into structured requirements.</p>

      <textarea
        placeholder="Paste job description..."
        value={jobText}
        onChange={(e) => setJobText(e.target.value)}
      />
      <div className="row" style={{ marginTop: 10 }}>
        <button onClick={handleAnalyze} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze Job"}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}

      {analysis && (
        <div className="result-block">
          <h4>Required Skills</h4>
          <TagList items={analysis.required_skills} />

          <h4>Preferred Skills</h4>
          <TagList items={analysis.preferred_skills} />

          <h4>Experience</h4>
          <p>{analysis.experience_requirements || "Not specified."}</p>

          <h4>Frontend</h4>
          <TagList items={analysis.frontend_technologies} />

          <h4>Backend</h4>
          <TagList items={analysis.backend_technologies} />

          <h4>AI / GenAI</h4>
          <TagList items={analysis.ai_genai_technologies} />

          <h4>Databases</h4>
          <TagList items={analysis.databases} />

          <h4>Other Requirements</h4>
          <TagList items={analysis.other_requirements} />
        </div>
      )}
    </div>
  );
}
