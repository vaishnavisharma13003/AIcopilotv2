"use client";

import { useState } from "react";
import { apiFetchJSON } from "../lib/api";
import TagList from "./TagList";

export default function MatchResult({ resumeText, jobDescription }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState(null);

  async function handleMatch() {
    if (!resumeText || !jobDescription) {
      setError("Analyze a resume AND a job description above first, then come back and compare.");
      return;
    }
    setLoading(true);
    setError("");
    setResult(null);
    try {
      const data = await apiFetchJSON("/match-resume", {
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
    <div className="card">
      <h2>🔍 Resume vs Job Match</h2>
      <p className="subtitle">Compares your analyzed resume against the analyzed job description.</p>

      <button onClick={handleMatch} disabled={loading}>
        {loading ? "Comparing..." : "Compare Resume to Job"}
      </button>

      {error && <div className="error-box">{error}</div>}

      {result && (
        <div className="result-block">
          <h4>Matching Skills</h4>
          <TagList items={result.matching_skills} />

          <h4>Missing Skills</h4>
          <TagList items={result.missing_skills} variant="missing" emptyText="No gaps found." />

          <h4>Partial Matches</h4>
          <TagList items={result.partially_matching_skills} variant="partial" />

          <h4>Relevant Projects</h4>
          <TagList items={result.relevant_projects} />

          <h4>Experience Match</h4>
          <p>{result.experience_match || "Not specified."}</p>

          <h4>Explanation</h4>
          <p>{result.explanation}</p>

          <h4>Suggestions</h4>
          <TagList items={result.resume_improvement_suggestions} />
        </div>
      )}
    </div>
  );
}
