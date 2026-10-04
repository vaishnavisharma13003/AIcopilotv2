"use client";

import { useState } from "react";
import Link from "next/link";

import { apiFetchJSON } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import Icon from "../ui/Icon";
import ScoreRing from "../ui/ScoreRing";
import TagList from "../TagList";

const STATUS = {
  match: { label: "Matched", fill: 100 },
  partial: { label: "Partial", fill: 50 },
  missing: { label: "Missing", fill: 6 },
};

export default function MatchResult() {
  const { resumeText, jobText, match, setMatch, setWorkflow, toast } = useApp();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function run() {
    setLoading(true);
    setError("");
    try {
      const data = await apiFetchJSON("/match-resume", {
        resume_text: resumeText,
        job_description: jobText,
      });
      setMatch(data);
      setWorkflow(null);
      toast(`Match complete: ${data.overall_score}%`, "success");
    } catch (err) {
      setError(err.message);
      toast("Match analysis failed.", "error");
    } finally {
      setLoading(false);
    }
  }

  if (!match) {
    return (
      <section className="gate">
        <div className="empty-icon">
          <Icon name="target" size={22} />
        </div>
        <h2>Ready to compare</h2>
        <p>
          Your resume and target job are loaded. Run the AI comparison to get a match score, skill
          compatibility and concrete suggestions.
        </p>
        {error && <div className="error-message">{error}</div>}
        <button type="button" className="primary-button" onClick={run} disabled={loading}>
          {loading ? "Comparing with Llama 3.2…" : "Run match analysis"}
        </button>
        {loading && <p className="loading-text">This can take up to a minute on a local model.</p>}
      </section>
    );
  }

  const skills = [
    ...match.matching_skills.map((name) => ({ name, type: "match" })),
    ...match.partially_matching_skills.map((name) => ({ name, type: "partial" })),
    ...match.missing_skills.map((name) => ({ name, type: "missing" })),
  ];
  const gaps = [...match.missing_skills, ...match.partially_matching_skills].slice(0, 3);

  return (
    <div className="match-dashboard">
      <div className="match-overview">
        <div className="score-card">
          <ScoreRing value={match.overall_score} />
          <div>
            <h3>{match.verdict}</h3>
            <p>{match.experience_match || "Comparison of your resume against the target role."}</p>
          </div>
        </div>

        <div className="metric">
          <span>Skills</span>
          <strong>{match.skills_score}%</strong>
        </div>
        <div className="metric">
          <span>Experience</span>
          <strong>{match.experience_score}%</strong>
        </div>
        <div className="metric">
          <span>ATS keywords</span>
          <strong>{match.ats_score}%</strong>
        </div>
      </div>

      <div className="skills-section">
        <div className="skills-column">
          <div className="result-card-head">
            <h3>Skill compatibility</h3>
            <button type="button" className="ghost-button" onClick={run} disabled={loading}>
              <Icon name="refresh" size={14} /> {loading ? "Re-analyzing…" : "Re-analyze"}
            </button>
          </div>

          {skills.length === 0 && <p className="muted-text">No skills were compared.</p>}

          {skills.map((skill) => (
            <div className="skill-row" key={`${skill.type}-${skill.name}`}>
              <div className="skill-name">
                <span>{skill.name}</span>
                <span className={`status-pill ${skill.type}`}>{STATUS[skill.type].label}</span>
              </div>
              <div className="progress-track">
                <div
                  className={`progress-fill ${skill.type}`}
                  style={{ width: `${STATUS[skill.type].fill}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        <div className="recommendation-box">
          <span className="eyebrow">AI RECOMMENDATION</span>
          <h3>{gaps.length ? `Focus on ${gaps.join(", ")}` : "Your profile covers this role"}</h3>
          <p>
            {match.explanation ||
              "These skills appear in the target role but are weakly represented in your resume."}
          </p>
          <Link href="/workflow" className="secondary-button light">
            Build my learning plan <Icon name="arrow" size={14} />
          </Link>
        </div>
      </div>

      <div className="result-grid card-grid">
        <section className="panel">
          <h4>Relevant projects</h4>
          <TagList items={match.relevant_projects} emptyText="No clearly relevant projects found." />
        </section>
        <section className="panel">
          <h4>Resume improvement suggestions</h4>
          {match.resume_improvement_suggestions.length ? (
            <ul className="check-list">
              {match.resume_improvement_suggestions.map((s, i) => (
                <li key={i}>{s}</li>
              ))}
            </ul>
          ) : (
            <p className="muted-text">No suggestions.</p>
          )}
        </section>
      </div>

      {error && <div className="error-message">{error}</div>}
    </div>
  );
}
