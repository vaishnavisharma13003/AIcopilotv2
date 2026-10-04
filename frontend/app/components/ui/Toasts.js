"use client";

import Icon from "./Icon";
import { useApp } from "../../context/AppContext";

export default function Toasts() {
  const { toasts, dismissToast } = useApp();

  return (
    <div className="toast-stack" role="status" aria-live="polite">
      {toasts.map((t) => (
        <div key={t.id} className={`toast ${t.type}`}>
          <Icon name={t.type === "error" ? "alert" : "check"} size={16} />
          <span>{t.message}</span>
          <button type="button" onClick={() => dismissToast(t.id)} aria-label="Dismiss">
            <Icon name="x" size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}
