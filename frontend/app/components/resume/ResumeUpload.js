"use client";

import { useRef, useState } from "react";
import Link from "next/link";

import { apiFetchForm } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import Icon from "../ui/Icon";
import TagList from "../TagList";

export default function ResumeUpload() {
  const { resume, setResume, setMatch, setWorkflow, setChat, toast } = useApp();
  const inputRef = useRef(null);

  const [file, setFile] = useState(null);
  const [dragging, setDragging] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const analysis = resume?.analysis;

  function pick(selected) {
    if (!selected) return;
    setError("");
    if (!selected.name.toLowerCase().endsWith(".pdf")) {
      setError("Please upload a PDF resume.");
      return;
    }
    if (selected.size > 10 * 1024 * 1024) {
      setError("That file is larger than 10 MB.");
      return;
    }
    setFile(selected);
  }

  async function handleAnalyze() {
    if (!file) return;
    setLoading(true);
    setError("");

    try {
      const data = await apiFetchForm("/resume/upload", file);
      const { resume_text, ...rest } = data;

      setResume({ analysis: rest, text: resume_text, filename: file.name });

      // a new resume invalidates everything derived from the old one
      setMatch(null);
      setWorkflow(null);
      setChat((c) => ({ engine: c.engine, messages: [] }));

      toast("Resume analyzed and indexed for chat.", "success");
      setFile(null);
    } catch (err) {
      setError(err.message || "Unable to analyze resume.");
      toast("Resume analysis failed.", "error");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="stack">
      <div className="input-card">
        <div className="card-header">
          <div>
            <span className="step">01</span>
            <div>
              <h3>{analysis ? "Replace your resume" : "Your Resume"}</h3>
              <p>Upload a PDF — it is parsed, analyzed and indexed for chat in one step.</p>
            </div>
          </div>
          {loading && <span className="success-badge pulse">Processing…</span>}
        </div>

        <input
          ref={inputRef}
          type="file"
          accept="application/pdf,.pdf"
          hidden
          onChange={(e) => pick(e.target.files?.[0])}
        />

        <div
          className={`upload-box ${dragging ? "dragging" : ""}`}
          onClick={() => !loading && inputRef.current?.click()}
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (!loading) pick(e.dataTransfer.files?.[0]);
          }}
        >
          <div className="upload-icon">
            <Icon name="upload" />
          </div>
          <h4>{file ? file.name : "Drop your resume here"}</h4>
          <p>{file ? `${(file.size / 1024).toFixed(0)} KB · ready to analyze` : "PDF only · up to 10 MB"}</p>
          <button
            type="button"
            className="upload-button"
            disabled={loading}
            onClick={(e) => {
              e.stopPropagation();
              inputRef.current?.click();
            }}
          >
            {file ? "Change file" : "Choose file"}
          </button>
        </div>

        {error && <p className="error-message">{error}</p>}

        <button
          type="button"
          className="analyze-button"
          onClick={handleAnalyze}
          disabled={!file || loading}
        >
          {loading ? "Analyzing with Llama 3.2…" : "Analyze resume"}
        </button>

        {loading && (
          <p className="loading-text">
            Reading the PDF, extracting structure and building the search index. The first run can take a
            minute while the model loads.
          </p>
        )}
      </div>

      {analysis && !loading && (
        <div className="result-card">
          <div className="profile-hero">
            <div className="avatar large">
              {(analysis.name || "R")
                .split(" ")
                .map((w) => w[0])
                .join("")
                .slice(0, 2)
                .toUpperCase()}
            </div>
            <div className="profile-hero-text">
              <h2>{analysis.name || resume.filename}</h2>
              <p>{analysis.headline || analysis.experience || "Resume analyzed"}</p>
            </div>
            <div className="profile-facts">
              <span>
                <strong>{analysis.word_count}</strong> words
              </span>
              <span>
                <strong>{analysis.chunk_count}</strong> chunks indexed
              </span>
              <span>
                <strong>{(analysis.skills?.length || 0) + (analysis.technologies?.length || 0)}</strong> skills
              </span>
            </div>
          </div>

          <div className="result-grid">
            <section>
              <h4>Skills</h4>
              <TagList items={analysis.skills} />
            </section>
            <section>
              <h4>Technologies</h4>
              <TagList items={analysis.technologies} />
            </section>
            <section>
              <h4>Experience</h4>
              <p>{analysis.experience || "Not specified."}</p>
            </section>
            <section>
              <h4>Projects</h4>
              <TagList items={analysis.projects} emptyText="No projects detected." />
            </section>
            <section>
              <h4>Strengths</h4>
              <TagList items={analysis.strengths} variant="match" />
            </section>
            <section>
              <h4>Areas to improve</h4>
              <TagList items={analysis.improvements} variant="partial" />
            </section>
          </div>

          <div className="cta-row">
            <Link href="/job" className="primary-button">
              Next: add a target job <Icon name="arrow" size={15} />
            </Link>
            <Link href="/chat" className="secondary-button">
              <Icon name="chat" size={15} /> Chat with this resume
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
