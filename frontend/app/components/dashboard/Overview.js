"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

import { apiGet } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import Icon from "../ui/Icon";
import { timeAgo } from "../ui/utils";

export default function Overview() {
  const { resume, job, match, chat, workflow, health } = useApp();
  const [recent, setRecent] = useState([]);

  useEffect(() => {
    apiGet("/history")
      .then((d) => setRecent(d.items.slice(0, 4)))
      .catch(() => setRecent([]));
  }, []);

  const steps = [
    { href: "/resume", icon: "file", title: "Upload resume", done: !!resume, text: resume ? resume.filename : "PDF analysis + chat index" },
    { href: "/job", icon: "briefcase", title: "Add target job", done: !!job?.analysis, text: job?.analysis ? "Requirements extracted" : "Paste a job description" },
    { href: "/match", icon: "target", title: "Match & gaps", done: !!match, text: match ? `${match.overall_score}% — ${match.verdict}` : "Score your fit" },
    { href: "/chat", icon: "chat", title: "Ask your resume", done: (chat?.messages?.length || 0) > 1, text: "RAG-powered Q&A" },
    { href: "/workflow", icon: "flow", title: "Interview plan", done: !!workflow, text: "Questions + 7-day plan" },
  ];

  const doneCount = steps.filter((s) => s.done).length;
  const next = steps.find((s) => !s.done);
  const skillCount = (resume?.analysis?.skills?.length || 0) + (resume?.analysis?.technologies?.length || 0);

  const stats = [
    { label: "Journey", value: `${doneCount}/5`, hint: "steps completed" },
    { label: "Match score", value: match ? `${match.overall_score}%` : "—", hint: match?.verdict || "not run yet" },
    { label: "Skills detected", value: skillCount || "—", hint: resume ? "from your resume" : "upload a resume" },
    { label: "Saved items", value: health.history_count ?? "—", hint: "in history" },
  ];

  return (
    <div className="stack">
      <section className="hero">
        <div>
          <span className="eyebrow">AI-POWERED CAREER INTELLIGENCE</span>
          <h1>
            Turn your resume into
            <br />
            your career advantage.
          </h1>
          <p>
            Analyze job descriptions, identify skill gaps and prepare for interviews using your local AI
            assistant — private, offline and free.
          </p>

          <div className="cta-row">
            {next ? (
              <Link href={next.href} className="primary-button">
                {doneCount === 0 ? "Get started" : `Continue: ${next.title}`} <Icon name="arrow" size={15} />
              </Link>
            ) : (
              <Link href="/jobs" className="primary-button">
                Explore matching jobs <Icon name="arrow" size={15} />
              </Link>
            )}
          </div>
        </div>

        <div className="hero-badge">
          <span>✦</span> Powered by {health.model || "Llama 3.2"}
        </div>
      </section>

      <section className="stat-grid">
        {stats.map((s) => (
          <div className="stat-card" key={s.label}>
            <span>{s.label}</span>
            <strong>{s.value}</strong>
            <small>{s.hint}</small>
          </div>
        ))}
      </section>

      <section>
        <div className="section-heading">
          <div>
            <h2>Your journey</h2>
            <p>Follow the steps in order, or jump to any tool from the sidebar.</p>
          </div>
        </div>

        <div className="journey">
          {steps.map((s, i) => (
            <Link href={s.href} key={s.href} className={`journey-card ${s.done ? "done" : ""}`}>
              <span className="journey-num">{s.done ? <Icon name="check" size={14} strokeWidth={3} /> : i + 1}</span>
              <Icon name={s.icon} size={20} />
              <strong>{s.title}</strong>
              <small>{s.text}</small>
            </Link>
          ))}
        </div>
      </section>

      <section className="two-column-section">
        <div className="panel">
          <div className="section-heading tight">
            <h3>Recent activity</h3>
            <Link href="/history" className="link-small">
              View all
            </Link>
          </div>

          {recent.length === 0 ? (
            <p className="muted-text">Nothing yet — your analyses will show up here.</p>
          ) : (
            <ul className="activity-list">
              {recent.map((r) => (
                <li key={r.id}>
                  <span className={`history-icon ${r.kind} small`}>
                    <Icon name={{ resume: "file", job: "briefcase", match: "target", workflow: "flow" }[r.kind]} size={14} />
                  </span>
                  <span>{r.title}</span>
                  <small>{timeAgo(r.created_at)}</small>
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="panel">
          <div className="section-heading tight">
            <h3>System</h3>
          </div>
          <ul className="system-list">
            <li><span>Backend</span><b className={health.status === "offline" ? "bad" : "good"}>{health.status === "offline" ? "Offline" : "Online"}</b></li>
            <li><span>Ollama</span><b className={health.ollama ? "good" : "bad"}>{health.ollama ? "Connected" : "Not reachable"}</b></li>
            <li><span>Model</span><b className={health.model_ready ? "good" : "bad"}>{health.model || "—"}{health.ollama && !health.model_ready ? " (not pulled)" : ""}</b></li>
            <li><span>Manual RAG index</span><b className={health.manual_rag_ready ? "good" : ""}>{health.manual_rag_ready ? "Ready" : "Empty"}</b></li>
            <li><span>LangChain index</span><b className={health.langchain_rag_ready ? "good" : ""}>{health.langchain_available === false ? "Unavailable" : health.langchain_rag_ready ? "Ready" : "Empty"}</b></li>
          </ul>
        </div>
      </section>
    </div>
  );
}
