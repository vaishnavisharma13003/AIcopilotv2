"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import Icon from "../ui/Icon";
import { useApp } from "../../context/AppContext";
import { NAV_GROUPS } from "./nav";

export default function Sidebar({ open, onClose }) {
  const pathname = usePathname();
  const { hydrated, resume, job, match, chat, workflow, health } = useApp();

  // small "done" markers so the sidebar doubles as a progress tracker
  const done = {
    "/resume": !!resume,
    "/job": !!job?.analysis,
    "/match": !!match,
    "/chat": (chat?.messages?.length || 0) > 1,
    "/workflow": !!workflow,
  };

  const isActive = (href) => (href === "/" ? pathname === "/" : pathname.startsWith(href));

  const statusTone =
    health.status === "online"
      ? "online"
      : health.status === "degraded"
        ? "warn"
        : health.status === "offline"
          ? "offline"
          : "checking";

  const statusLabel =
    health.status === "online"
      ? "ON"
      : health.status === "degraded"
        ? "NO LLM"
        : health.status === "offline"
          ? "OFF"
          : "...";

  return (
    <aside className={`side ${open ? "open" : ""}`} aria-label="Primary">
      {/* Logo */}
      <Link href="/" className="side-brand">
        <span className="side-logo">
          <Icon name="sparkles" size={20} />
        </span>
        <span>
          <strong>AI Copilot</strong>
          <small>Resume Intelligence</small>
        </span>
      </Link>

      {/* Menu */}
      <nav className="side-nav">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="side-group">
            <p className="side-label">{group.label}</p>

            {group.items.map((item) => {
              const active = isActive(item.href);
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={onClose}
                  className={`side-link ${active ? "active" : ""}`}
                  aria-current={active ? "page" : undefined}
                >
                  <Icon name={item.icon} size={17} />
                  <span>{item.label}</span>

                  {hydrated && done[item.href] && !active && (
                    <span className="side-done" title="Completed">
                      <Icon name="check" size={11} strokeWidth={3} />
                    </span>
                  )}
                  {active && <Icon name="arrow" size={15} className="side-arrow" />}
                </Link>
              );
            })}
          </div>
        ))}
      </nav>

      {/* AI engine status (live) */}
      <div className="side-status">
        <span className={`status-orb ${statusTone}`} />
        <div>
          <strong>AI Engine</strong>
          <small>
            {health.status === "offline"
              ? "Backend unreachable"
              : `Ollama · ${health.model || "llama3.2"}`}
          </small>
        </div>
        <span className={`status-chip ${statusTone}`}>{statusLabel}</span>
      </div>
    </aside>
  );
}
