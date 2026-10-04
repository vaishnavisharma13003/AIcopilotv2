"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import Icon from "../ui/Icon";
import { useApp } from "../../context/AppContext";
import { findItem } from "./nav";

export default function Topbar({ onMenu }) {
  const pathname = usePathname();
  const { health, refreshHealth, resume, resetSession, toast } = useApp();
  const current = findItem(pathname);

  const label =
    health.status === "online"
      ? "Local AI connected"
      : health.status === "degraded"
        ? "Backend up · Ollama not reachable"
        : health.status === "offline"
          ? "Backend offline"
          : "Connecting...";

  const dot =
    health.status === "online" ? "online" : health.status === "checking" ? "checking" : "offline";

  function handleReset() {
    if (!window.confirm("Clear the current resume, job, match and chat from this workspace?")) return;
    resetSession();
    toast("Workspace cleared. Saved history is kept.", "info");
  }

  return (
    <header className="topbar">
      <div className="topbar-left">
        <button type="button" className="menu-button" onClick={onMenu} aria-label="Open menu">
          <Icon name="menu" />
        </button>

        <span className="breadcrumb">
          Workspace / <strong>{current.crumb}</strong>
        </span>
      </div>

      <div className="topbar-actions">
        <button
          type="button"
          className="system-status"
          onClick={refreshHealth}
          title="Click to re-check the backend"
        >
          <span className={`online-dot ${dot}`} />
          {label}
        </button>

        <button
          type="button"
          className="icon-button"
          onClick={handleReset}
          title="Start a new session"
          aria-label="Start a new session"
        >
          <Icon name="refresh" size={15} />
        </button>

        <Link href="/history" className="profile">
          <div className="avatar">
            {(resume?.analysis?.name || "Me")
              .split(" ")
              .map((w) => w[0])
              .join("")
              .slice(0, 2)
              .toUpperCase()}
          </div>

          <div className="profile-text">
            <strong>{resume?.analysis?.name || "Career Workspace"}</strong>
            <span>{resume ? resume.filename || "Resume loaded" : "No resume yet"}</span>
          </div>
        </Link>
      </div>
    </header>
  );
}
