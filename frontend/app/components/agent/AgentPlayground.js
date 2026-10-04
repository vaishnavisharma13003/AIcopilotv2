"use client";

import { useState } from "react";

import { apiFetchJSON } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import Icon from "../ui/Icon";

const PROMPTS = [
  "Create a 5 day learning plan for Docker",
  "Generate interview questions for React",
  "Create a 7 day learning plan for FastAPI",
  "Generate interview questions for Python backend development",
];

export default function AgentPlayground() {
  const { resumeText, toast } = useApp();
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [runs, setRuns] = useState([]);

  async function run(text) {
    const msg = (text ?? message).trim();
    if (!msg || loading) return;

    setLoading(true);
    setMessage("");
    try {
      const data = await apiFetchJSON("/tool-demo", { message: msg });
      setRuns((r) => [{ message: msg, ...data }, ...r]);
    } catch (err) {
      toast(err.message, "error");
    } finally {
      setLoading(false);
    }
  }

  function analyzeMySkills() {
    run(`Use your tool to extract the skills from this resume text:\n${resumeText.slice(0, 3000)}`);
  }

  return (
    <div className="stack">
      <div className="input-card">
        <div className="card-header">
          <div>
            <span className="step">
              <Icon name="wrench" size={14} />
            </span>
            <div>
              <h3>Tool-calling playground</h3>
              <p>
                The model decides whether to call <code>analyze_skills</code>,{" "}
                <code>generate_interview_questions</code> or <code>create_learning_plan</code>. A tool is only
                shown as called if the model really requested it.
              </p>
            </div>
          </div>
        </div>

        <div className="chat-input-wrapper">
          <input
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && run()}
            placeholder="Ask the agent to do something…"
            disabled={loading}
          />
          <button type="button" onClick={() => run()} disabled={loading || !message.trim()} aria-label="Run">
            <Icon name="send" size={18} strokeWidth={2.4} />
          </button>
        </div>

        <div className="suggestions left">
          {PROMPTS.map((p) => (
            <button key={p} type="button" onClick={() => run(p)} disabled={loading}>
              {p}
            </button>
          ))}
          {resumeText && (
            <button type="button" onClick={analyzeMySkills} disabled={loading} className="accent">
              ✦ Extract skills from my resume
            </button>
          )}
        </div>

        {loading && <p className="loading-text">The model is deciding which tool to call…</p>}
      </div>

      {runs.map((r, i) => (
        <div className="result-card" key={i}>
          <div className="trace">
            <div className="trace-step">
              <span className="trace-dot user">1</span>
              <div>
                <small>You asked</small>
                <p>{r.message.length > 220 ? `${r.message.slice(0, 220)}…` : r.message}</p>
              </div>
            </div>

            <div className="trace-step">
              <span className="trace-dot">2</span>
              <div>
                <small>Model decision</small>
                {r.tool_called ? (
                  <p>
                    Called <code className="tool-name">{r.tool_called}</code> with{" "}
                    <code>{JSON.stringify(r.tool_input)}</code>
                  </p>
                ) : (
                  <p>No tool was needed — the model answered directly.</p>
                )}
              </div>
            </div>

            {r.tool_called && (
              <div className="trace-step">
                <span className="trace-dot">3</span>
                <div>
                  <small>Tool result</small>
                  <pre>{r.tool_result}</pre>
                </div>
              </div>
            )}

            <div className="trace-step">
              <span className="trace-dot final">✓</span>
              <div>
                <small>Final answer</small>
                <p className="pre-wrap">{r.final_answer}</p>
              </div>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
