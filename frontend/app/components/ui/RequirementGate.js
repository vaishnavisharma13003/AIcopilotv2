"use client";

import Link from "next/link";
import Icon from "./Icon";
import { useApp } from "../../context/AppContext";

/**
 * Wraps a page that needs a resume and/or a job. If something is missing it
 * shows a friendly prompt with links instead of the page content.
 */
export default function RequirementGate({ needResume, needJob, children }) {
  const { hydrated, resumeText, jobText } = useApp();

  if (!hydrated) return <div className="skeleton-block" />;

  const missing = [];
  if (needResume && !resumeText)
    missing.push({
      href: "/resume",
      icon: "file",
      title: "Upload your resume",
      text: "We need your resume to analyze it.",
    });
  if (needJob && !jobText)
    missing.push({
      href: "/job",
      icon: "briefcase",
      title: "Add a target job",
      text: "Paste the job description you are targeting.",
    });

  if (missing.length === 0) return children;

  return (
    <section className="gate">
      <div className="empty-icon">
        <Icon name="sparkles" size={22} />
      </div>
      <h2>A couple of things first</h2>
      <p>This tool works on your own data. Complete the step{missing.length > 1 ? "s" : ""} below to unlock it.</p>

      <div className="gate-items">
        {missing.map((m) => (
          <Link key={m.href} href={m.href} className="gate-item">
            <span className="gate-icon">
              <Icon name={m.icon} />
            </span>
            <span>
              <strong>{m.title}</strong>
              <small>{m.text}</small>
            </span>
            <Icon name="arrow" size={16} />
          </Link>
        ))}
      </div>
    </section>
  );
}
