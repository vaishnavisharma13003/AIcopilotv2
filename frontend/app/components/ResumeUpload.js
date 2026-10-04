"use client";

import { useState } from "react";
import { apiFetchForm } from "../lib/api";
import TagList from "./TagList";

export default function ResumeUpload({ onResumeAnalyzed }) {
  const [file, setFile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [analysis, setAnalysis] = useState(null);

  async function handleAnalyze() {
    if (!file) {
      setError("Please choose a PDF file first.");
      return;
    }
    setLoading(true);
    setError("");
    setAnalysis(null);

    try {
      const data = await apiFetchForm("/analyze-resume-structured", file);
      setAnalysis(data);
      onResumeAnalyzed?.(data.resume_text || "");
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>📄 Resume Upload</h2>
      <p className="subtitle">Upload your resume PDF to analyze it with Llama 3.2.</p>

      <div className="row">
        <input
          type="file"
          accept="application/pdf"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
        />
        <button onClick={handleAnalyze} disabled={loading}>
          {loading ? "Analyzing..." : "Analyze Resume"}
        </button>
      </div>

      {loading && <p className="loading-text">Reading PDF and asking Llama 3.2 to analyze it...</p>}
      {error && <div className="error-box">{error}</div>}

      {analysis && (
        <div className="result-block">
          <h4>Skills</h4>
          <TagList items={analysis.skills} />

          <h4>Experience</h4>
          <p>{analysis.experience || "Not specified."}</p>

          <h4>Technologies</h4>
          <TagList items={analysis.technologies} />

          <h4>Projects</h4>
          <TagList items={analysis.projects} emptyText="No projects detected." />

          <h4>Strengths</h4>
          <TagList items={analysis.strengths} />

          <h4>Areas to Improve</h4>
          <TagList items={analysis.improvements} />
        </div>
      )}
    </div>
  );
}
