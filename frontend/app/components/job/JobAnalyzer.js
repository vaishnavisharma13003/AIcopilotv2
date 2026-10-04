"use client";

import { useState } from "react";
import Link from "next/link";

import { apiFetchJSON } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import Icon from "../ui/Icon";
import TagList from "../TagList";

const SAMPLE_JD = `Full Stack Developer — AI Products

We are looking for a Full Stack Developer with 2+ years of experience to build GenAI-powered features.

Required: React, Next.js, JavaScript/TypeScript, Python, FastAPI, REST APIs, PostgreSQL.
Preferred: LangChain, RAG pipelines, Docker, AWS, CI/CD.

You will work with LLMs, vector databases and modern frontend tooling, collaborate with designers, and ship production features quickly.`;

const SECTIONS = [
  ["required_skills", "Required skills", "match"],
  ["preferred_skills", "Preferred skills", "partial"],
  ["frontend_technologies", "Frontend"],
  ["backend_technologies", "Backend"],
  ["ai_genai_technologies", "AI / GenAI"],
  ["databases", "Databases"],
  ["other_requirements", "Other requirements"],
];

export default function JobAnalyzer() {
  const { job, setJob, setMatch, setWorkflow, toast } = useApp();

  const [text, setText] = useState(job?.text || "");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analysis = job?.analysis;
  const dirty = job && job.text !== text;

  async function handleAnalyze() {
    if (!text.trim()) {
      setError("Paste a job description first.");
      return;
    }
    setError("");
    setLoading(true);

    try {
      const data = await apiFetchJSON("/analyze-job", { job_description: text });
      setJob({ text, analysis: data });
      setMatch(null);
      setWorkflow(null);
      toast("Job description analyzed.", "success");
    } catch (err) {
      setError(err.message || "Failed to analyze job description.");
      toast("Job analysis failed.", "error");
    } finally {
      setLoading(false);
    }
  }

  function handleClear() {
    setText("");
    setJob(null);
    setMatch(null);
    setWorkflow(null);
  }

  return (
    <div className="stack">
      <div className="input-card">
        <div className="card-header">
          <div>
            <span className="step">02</span>
            <div>
              <h3>Target Job</h3>
              <p>Paste the job description you want to target</p>
            </div>
          </div>
          {analysis && !dirty && <span className="success-badge">✓ Analyzed</span>}
          {dirty && <span className="success-badge warn">Edited — re-analyze</span>}
        </div>

        <textarea
          className="job-textarea"
          value={text}
          onChange={(e) => {
            setText(e.target.value);
            setError("");
          }}
          placeholder="Paste the complete job description here..."
          rows={11}
        />

        <div className="job-actions">
          <span>{text.length.toLocaleString()} characters</span>

          <div className="inline-actions">
            <button type="button" className="ghost-button" onClick={() => setText(SAMPLE_JD)}>
              Use sample
            </button>
            {(text || job) && (
              <button type="button" className="ghost-button" onClick={handleClear}>
                Clear
              </button>
            )}
            <button
              type="button"
              className="primary-button"
              onClick={handleAnalyze}
              disabled={!text.trim() || loading}
            >
              {loading ? "Analyzing…" : "Analyze job"} {!loading && <Icon name="arrow" size={15} />}
            </button>
          </div>
        </div>

        {error && <div className="error-message">{error}</div>}

        {loading && (
          <div className="analysis-loading">
            <p>AI is extracting requirements…</p>
            <small>This usually takes 10–40 seconds on a local model.</small>
          </div>
        )}
      </div>

      {analysis && !loading && (
        <div className="result-card">
          <div className="result-card-head">
            <h3>Job analysis</h3>
            <span className="success-badge">✓ Completed</span>
          </div>

          <div className="exp-callout">
            <span>Experience required</span>
            <strong>{analysis.experience_requirements || "Not specified"}</strong>
          </div>

          <div className="result-grid">
            {SECTIONS.map(([key, title, variant]) => (
              <section key={key}>
                <h4>{title}</h4>
                <TagList items={analysis[key]} variant={variant} emptyText="Not specified." />
              </section>
            ))}
          </div>

          <div className="cta-row">
            <Link href="/match" className="primary-button">
              Next: compare with resume <Icon name="arrow" size={15} />
            </Link>
            <Link href="/jobs" className="secondary-button">
              Browse demo jobs
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
