"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiDelete, apiGet } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import Icon from "../ui/Icon";
import { timeAgo } from "../ui/utils";

const KINDS = [
  ["", "All"],
  ["resume", "Resumes"],
  ["job", "Jobs"],
  ["match", "Matches"],
  ["workflow", "Plans"],
];

const KIND_META = {
  resume: { icon: "file", label: "Resume", route: "/resume" },
  job: { icon: "briefcase", label: "Job", route: "/job" },
  match: { icon: "target", label: "Match", route: "/match" },
  workflow: { icon: "flow", label: "Plan", route: "/workflow" },
};

function summarize(item) {
  const p = item.payload;
  if (item.kind === "resume") {
    const a = p.analysis || {};
    return `${(a.skills || []).length + (a.technologies || []).length} skills · ${a.word_count || 0} words`;
  }
  if (item.kind === "job") return (p.analysis?.required_skills || []).slice(0, 4).join(", ") || "Job analysis";
  if (item.kind === "match") return p.job_preview || "";
  return "Skill gap, questions and 7-day plan";
}

export default function HistoryList() {
  const router = useRouter();
  const { setResume, setJob, setMatch, setWorkflow, setChat, toast } = useApp();

  const [kind, setKind] = useState("");
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const data = await apiGet(`/history${kind ? `?kind=${kind}` : ""}`);
      setItems(data.items);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }, [kind]);

  useEffect(() => {
    load();
  }, [load]);

  async function restore(item) {
    try {
      const full = await apiGet(`/history/${item.id}`);
      const p = full.payload;

      if (item.kind === "resume") {
        setResume({ analysis: p.analysis, text: p.resume_text, filename: p.analysis?.filename });
        setMatch(null);
        setWorkflow(null);
        setChat((c) => ({ engine: c.engine, messages: [] }));
      } else if (item.kind === "job") {
        setJob({ text: p.job_description, analysis: p.analysis });
        setMatch(null);
        setWorkflow(null);
      } else if (item.kind === "match") {
        setMatch(p.result);
      } else if (item.kind === "workflow") {
        setWorkflow({
          state: {
            interview_questions: p.interview_questions,
            learning_plan: p.learning_plan,
            skill_gap: p.skill_gap,
          },
          history_id: item.id,
        });
      }
      toast(`${KIND_META[item.kind].label} restored.`, "success");
      router.push(KIND_META[item.kind].route);
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function remove(id) {
    try {
      await apiDelete(`/history/${id}`);
      setItems((list) => list.filter((i) => i.id !== id));
    } catch (err) {
      toast(err.message, "error");
    }
  }

  async function clearAll() {
    if (!window.confirm("Delete ALL saved history? This cannot be undone.")) return;
    try {
      await apiDelete("/history");
      setItems([]);
      toast("History cleared.", "info");
    } catch (err) {
      toast(err.message, "error");
    }
  }

  return (
    <div className="stack">
      <div className="tabs">
        {KINDS.map(([id, label]) => (
          <button key={id} type="button" className={kind === id ? "active" : ""} onClick={() => setKind(id)}>
            {label}
          </button>
        ))}
        <span className="tabs-spacer" />
        <button type="button" className="ghost-button danger" onClick={clearAll} disabled={!items.length}>
          <Icon name="trash" size={14} /> Clear all
        </button>
      </div>

      {error && <div className="error-message">{error}</div>}
      {loading && <div className="skeleton-block" />}

      {!loading && items.length === 0 && !error && (
        <div className="gate inner">
          <div className="empty-icon">
            <Icon name="clock" size={22} />
          </div>
          <h2>Nothing saved yet</h2>
          <p>Every resume, job, match and plan you generate is saved here automatically.</p>
        </div>
      )}

      <div className="history-list">
        {items.map((item) => {
          const meta = KIND_META[item.kind] || KIND_META.resume;
          return (
            <article className="history-item" key={item.id}>
              <span className={`history-icon ${item.kind}`}>
                <Icon name={meta.icon} />
              </span>

              <div className="history-body">
                <strong>{item.title}</strong>
                <small>
                  {meta.label} · {timeAgo(item.created_at)}
                </small>
                <p>{summarize(item)}</p>
              </div>

              <div className="inline-actions">
                <button type="button" className="secondary-button" onClick={() => restore(item)}>
                  Restore
                </button>
                <button type="button" className="icon-button" onClick={() => remove(item.id)} aria-label="Delete">
                  <Icon name="trash" size={14} />
                </button>
              </div>
            </article>
          );
        })}
      </div>
    </div>
  );
}
