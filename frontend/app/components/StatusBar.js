"use client";

import { useEffect, useState } from "react";
import { API_BASE } from "../lib/api";

export default function StatusBar() {
  const [status, setStatus] = useState("unknown"); // "unknown" | "ok" | "bad"

  useEffect(() => {
    let cancelled = false;

    async function check() {
      try {
        const res = await fetch(`${API_BASE}/`, { cache: "no-store" });
        if (!cancelled) setStatus(res.ok ? "ok" : "bad");
      } catch {
        if (!cancelled) setStatus("bad");
      }
    }

    check();
    const interval = setInterval(check, 15000);
    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const label =
    status === "ok"
      ? "Backend connected"
      : status === "bad"
      ? "Backend unreachable - start it with: uvicorn main:app --reload --port 8000"
      : "Checking backend...";

  const dotClass =
    status === "ok" ? "status-ok" : status === "bad" ? "status-bad" : "status-unknown";

  return (
    <div className="status-bar">
      <span>
        <span className={`status-dot ${dotClass}`} />
        {label}
      </span>
      <span>Model: llama3.2 (via Ollama at http://localhost:11434)</span>
    </div>
  );
}
