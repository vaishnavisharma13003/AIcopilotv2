"use client";

import { useMemo, useState } from "react";

import { apiStreamNDJSON } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import Icon from "../ui/Icon";
import RichText from "../ui/RichText";
import { copyText, downloadText } from "../ui/utils";

const STEPS = [
  { node: "analyze_resume", title: "Analyze resume", text: "Summarize skills and experience." },
  { node: "analyze_job", title: "Analyze job", text: "Extract requirements and level." },
  { node: "find_skill_gap", title: "Find skill gaps", text: "Compare resume against the role." },
  { node: "generate_questions", title: "Interview questions", text: "Technical + behavioral questions." },
  { node: "generate_learning_plan", title: "7-day learning plan", text: "Close the gap before applying." },
];

const TABS = [
  ["questions", "Interview questions", "interview_questions"],
  ["plan", "Learning plan", "learning_plan"],
  ["gap", "Skill gap", "skill_gap"],
  ["summary", "Summaries", null],
];

// "Day 3: Build a small FastAPI service" -> { day: 3, text: "..." }
function parseDays(text) {
  const days = [];
  String(text || "")
    .split(/\r?\n/)
    .forEach((line) => {
      const m = line.replace(/\*\*/g, "").match(/^\W*Day\s*(\d+)\s*[:\-–.]?\s*(.*)$/i);
      if (m) days.push({ day: Number(m[1]), text: m[2] || "" });
    });
  return days.length >= 3 ? days : null;
}

export default function WorkflowPanel() {
  const { resumeText, jobText, workflow, setWorkflow, toast } = useApp();

  const [running, setRunning] = useState(false);
  const [done, setDone] = useState(() => (workflow ? STEPS.map((s) => s.node) : []));
  const [error, setError] = useState("");
  const [tab, setTab] = useState("questions");

  const state = workflow?.state;
  const currentIndex = running ? STEPS.findIndex((s) => !done.includes(s.node)) : -1;
  const days = useMemo(() => parseDays(state?.learning_plan), [state]);

  async function run() {
    setRunning(true);
    setError("");
    setDone([]);
    setWorkflow(null);

    let latest = {};
    let historyId = null;

    try {
      await apiStreamNDJSON(
        "/run-job-workflow-stream",
        { resume_text: resumeText, job_description: jobText },
        (event) => {
          if (event.event === "step") {
            latest = event.state;
            setDone((d) => [...d, event.node]);
            setWorkflow({ state: event.state, history_id: null });
          } else if (event.event === "done") {
            historyId = event.history_id;
          } else if (event.event === "error") {
            throw new Error(event.detail);
          }
        },
      );
      setWorkflow({ state: latest, history_id: historyId });
      toast("Interview plan ready.", "success");
    } catch (err) {
      setError(err.message);
      toast("Workflow failed.", "error");
    } finally {
      setRunning(false);
    }
  }

  function exportMarkdown() {
    const md = [
      "# Interview preparation plan",
      "## Skill gap\n" + (state.skill_gap || ""),
      "## Interview questions\n" + (state.interview_questions || ""),
      "## 7-day learning plan\n" + (state.learning_plan || ""),
    ].join("\n\n");
    downloadText("interview-plan.md", md);
  }

  async function copyCurrent() {
    const key = TABS.find((t) => t[0] === tab)?.[2];
    const ok = await copyText(key ? state[key] : `${state.resume_analysis}\n\n${state.job_analysis}`);
    toast(ok ? "Copied to clipboard." : "Copy failed.", "info");
  }

  return (
    <div className="workflow-layout">
      <aside className="workflow-rail">
        <h3>LangGraph pipeline</h3>

        <div className="workflow-list">
          {STEPS.map((step, i) => {
            const complete = done.includes(step.node);
            const active = running && i === currentIndex;
            return (
              <div
                key={step.node}
                className={`workflow-step ${complete ? "complete" : ""} ${active ? "active" : ""}`}
              >
                <div className="workflow-number">
                  {complete ? <Icon name="check" size={14} strokeWidth={3} /> : `0${i + 1}`}
                </div>
                <div>
                  <h4>{step.title}</h4>
                  <p>{active ? "Running…" : step.text}</p>
                </div>
              </div>
            );
          })}
        </div>

        <button type="button" className="primary-button workflow-button" onClick={run} disabled={running}>
          {running ? "Generating…" : state ? "Regenerate plan" : "Generate interview plan"}
          {!running && <Icon name="arrow" size={15} />}
        </button>

        {running && <p className="loading-text">Each step calls the model, so this takes a few minutes locally.</p>}
        {error && <div className="error-message">{error}</div>}
      </aside>

      <section className="workflow-output">
        {!state ? (
          <div className="gate inner">
            <div className="empty-icon">
              <Icon name="flow" size={22} />
            </div>
            <h2>Your preparation plan appears here</h2>
            <p>Run the pipeline to get skill gaps, tailored interview questions and a 7-day learning plan.</p>
          </div>
        ) : (
          <>
            <div className="tabs">
              {TABS.map(([id, label, key]) => (
                <button
                  key={id}
                  type="button"
                  className={tab === id ? "active" : ""}
                  onClick={() => setTab(id)}
                  disabled={key && !state[key]}
                >
                  {label}
                </button>
              ))}

              <span className="tabs-spacer" />
              <button type="button" className="ghost-button" onClick={copyCurrent}>
                <Icon name="copy" size={14} /> Copy
              </button>
              {!running && (
                <button type="button" className="ghost-button" onClick={exportMarkdown}>
                  <Icon name="download" size={14} /> Export .md
                </button>
              )}
            </div>

            <div className="output-panel">
              {tab === "questions" && <RichText text={state.interview_questions} />}

              {tab === "plan" &&
                (days ? (
                  <div className="day-grid">
                    {days.map((d) => (
                      <div className="day-card" key={d.day}>
                        <span>Day {d.day}</span>
                        <p>{d.text}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <RichText text={state.learning_plan} />
                ))}

              {tab === "gap" && <RichText text={state.skill_gap} />}

              {tab === "summary" && (
                <div className="summary-split">
                  <div>
                    <h4>Resume summary</h4>
                    <RichText text={state.resume_analysis} />
                  </div>
                  <div>
                    <h4>Job summary</h4>
                    <RichText text={state.job_analysis} />
                  </div>
                </div>
              )}
            </div>
          </>
        )}
      </section>
    </div>
  );
}
