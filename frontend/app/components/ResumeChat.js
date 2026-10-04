"use client";

import { useState } from "react";
import { apiFetch, apiFetchForm } from "../lib/api";

export default function ResumeChat() {
  const [file, setFile] = useState(null);
  const [indexed, setIndexed] = useState(false);
  const [question, setQuestion] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function handleIndex() {
    if (!file) {
      setError("Choose a PDF first, then index it before asking questions.");
      return;
    }
    setLoading(true);
    setError("");
    try {
      await apiFetchForm("/upload-resume-rag", file);
      setIndexed(true);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleAsk() {
    if (!indexed) {
      setError("Upload and index a resume first.");
      return;
    }
    if (!question.trim()) {
      setError("Type a question first.");
      return;
    }
    setLoading(true);
    setError("");
    setAnswer("");
    try {
      const data = await apiFetch(`/resume-chat?question=${encodeURIComponent(question)}`);
      setAnswer(data.answer);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="card">
      <h2>💬 Resume Chat (RAG)</h2>
      <p className="subtitle">Ask questions - answered ONLY from your resume's retrieved content.</p>

      <div className="row">
        <input type="file" accept="application/pdf" onChange={(e) => setFile(e.target.files?.[0] || null)} />
        <button className="secondary" onClick={handleIndex} disabled={loading}>
          {indexed ? "Re-index Resume" : "Index Resume"}
        </button>
      </div>

      <div className="row" style={{ marginTop: 12 }}>
        <input
          type="text"
          placeholder="Ask something about your resume..."
          value={question}
          onChange={(e) => setQuestion(e.target.value)}
        />
        <button onClick={handleAsk} disabled={loading}>
          {loading ? "Thinking..." : "Ask AI"}
        </button>
      </div>

      {error && <div className="error-box">{error}</div>}
      {answer && <div className="answer-box">{answer}</div>}
    </div>
  );
}
