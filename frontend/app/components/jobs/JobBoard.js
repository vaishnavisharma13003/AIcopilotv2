"use client";

import { useCallback, useEffect, useState } from "react";
import { useRouter } from "next/navigation";

import { apiFetchJSON, apiGet } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import Icon from "../ui/Icon";
import ScoreRing from "../ui/ScoreRing";
import TagList from "../TagList";
import { collectSkills } from "../ui/utils";

export default function JobBoard() {
  const router = useRouter();
  const { resume, setJob, setMatch, setWorkflow, toast } = useApp();

  const [keyword, setKeyword] = useState("");
  const [location, setLocation] = useState("");
  const [viaMcp, setViaMcp] = useState(false);
  const [rank, setRank] = useState(false);

  const [jobs, setJobs] = useState([]);
  const [locations, setLocations] = useState([]);
  const [source, setSource] = useState("");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const skills = collectSkills(resume?.analysis);

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      if (rank && skills.length) {
        const data = await apiFetchJSON("/jobs/recommend", { skills });
        const kw = keyword.toLowerCase().trim();
        const loc = location.toLowerCase().trim();
        setJobs(
          data.jobs.filter(
            (j) =>
              (!kw || `${j.title} ${j.description} ${j.keywords.join(" ")}`.toLowerCase().includes(kw)) &&
              (!loc || j.location.toLowerCase().includes(loc)),
          ),
        );
        setSource("ranked for your resume");
      } else {
        const qs = new URLSearchParams({ keyword, location, via_mcp: String(viaMcp) });
        const data = await apiGet(`/jobs/search?${qs}`);
        setJobs(data.jobs);
        setLocations(data.locations || []);
        setSource(data.source === "mcp" ? "MCP server" : "direct");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [keyword, location, viaMcp, rank]);

  // debounce typing
  useEffect(() => {
    const id = setTimeout(load, 300);
    return () => clearTimeout(id);
  }, [load]);

  // location chips need the full list even when ranking
  useEffect(() => {
    apiGet("/jobs/search").then((d) => setLocations(d.locations || [])).catch(() => {});
  }, []);

  function target(job) {
    const text = `${job.title} — ${job.company} (${job.location})\n\n${job.description}\n\nKey skills: ${job.keywords.join(", ")}`;
    setJob({ text, analysis: null });
    setMatch(null);
    setWorkflow(null);
    toast(`"${job.title}" set as your target job.`, "success");
    router.push("/job");
  }

  return (
    <div className="stack">
      <div className="notice-bar">
        <Icon name="alert" size={15} />
        These are fictional demo postings from <code>jobs.json</code> — not real vacancies.
      </div>

      <div className="filters">
        <div className="search-input">
          <Icon name="search" size={16} />
          <input
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            placeholder="Search by title, skill or keyword…"
          />
        </div>

        <div className="chip-row">
          <button type="button" className={`chip ${location === "" ? "active" : ""}`} onClick={() => setLocation("")}>
            All locations
          </button>
          {locations.map((l) => (
            <button
              key={l}
              type="button"
              className={`chip ${location === l ? "active" : ""}`}
              onClick={() => setLocation(location === l ? "" : l)}
            >
              {l}
            </button>
          ))}
        </div>

        <div className="toggle-row">
          <label className={`switch ${!skills.length ? "disabled" : ""}`} title={!skills.length ? "Upload a resume first" : ""}>
            <input type="checkbox" checked={rank} disabled={!skills.length} onChange={(e) => setRank(e.target.checked)} />
            <span /> Rank by my resume
          </label>
          <label className={`switch ${rank ? "disabled" : ""}`}>
            <input type="checkbox" checked={viaMcp} disabled={rank} onChange={(e) => setViaMcp(e.target.checked)} />
            <span /> Search through MCP server
          </label>
        </div>
      </div>

      {error && <div className="error-message">{error}</div>}

      <p className="muted-text">
        {loading ? "Searching…" : `${jobs.length} job${jobs.length === 1 ? "" : "s"} · ${source}`}
      </p>

      <div className="job-grid">
        {jobs.map((job) => (
          <article className="job-card" key={job.id}>
            <div className="job-card-top">
              <div>
                <h3>{job.title}</h3>
                <p>
                  {job.company} · <Icon name="pin" size={12} /> {job.location}
                </p>
              </div>
              {job.match_score !== undefined && <ScoreRing value={job.match_score} size={64} label="" />}
            </div>

            <p className="job-desc">{job.description}</p>

            {job.matched_skills ? (
              <>
                <TagList items={job.matched_skills} variant="match" emptyText="No overlap yet." />
                {job.missing_skills.length > 0 && <TagList items={job.missing_skills} variant="missing" />}
              </>
            ) : (
              <TagList items={job.keywords} />
            )}

            <button type="button" className="secondary-button" onClick={() => target(job)}>
              Use as target job <Icon name="arrow" size={14} />
            </button>
          </article>
        ))}
      </div>

      {!loading && jobs.length === 0 && !error && (
        <div className="gate inner">
          <h2>No jobs match</h2>
          <p>Try a different keyword or clear the location filter.</p>
        </div>
      )}
    </div>
  );
}
