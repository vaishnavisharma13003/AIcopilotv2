"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { API_BASE } from "../lib/api";

const STORAGE_KEY = "aijc:v2";

const AppContext = createContext(null);

export function useApp() {
  const ctx = useContext(AppContext);
  if (!ctx) throw new Error("useApp must be used inside <AppProvider>");
  return ctx;
}

export function AppProvider({ children }) {
  const [hydrated, setHydrated] = useState(false);

  // resume: { analysis, text, filename } | null
  const [resume, setResume] = useState(null);
  // job: { text, analysis } | null
  const [job, setJob] = useState(null);
  const [match, setMatch] = useState(null);
  const [chat, setChat] = useState({ engine: "manual", messages: [] });
  // workflow: { state, history_id } | null
  const [workflow, setWorkflow] = useState(null);

  const [health, setHealth] = useState({ status: "checking" });
  const [toasts, setToasts] = useState([]);
  const toastId = useRef(0);

  // ---------- hydrate from localStorage ----------
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem(STORAGE_KEY) || "null");
      if (saved) {
        setResume(saved.resume || null);
        setJob(saved.job || null);
        setMatch(saved.match || null);
        setChat(saved.chat || { engine: "manual", messages: [] });
        setWorkflow(saved.workflow || null);
      }
    } catch {
      // corrupted storage - start fresh
    }
    setHydrated(true);
  }, []);

  // ---------- persist ----------
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ resume, job, match, chat, workflow }),
      );
    } catch {
      // storage full / disabled - ignore
    }
  }, [hydrated, resume, job, match, chat, workflow]);

  // ---------- backend health polling ----------
  const refreshHealth = useCallback(async () => {
    try {
      const res = await fetch(`${API_BASE}/health`, { cache: "no-store" });
      if (!res.ok) throw new Error("bad status");
      const data = await res.json();
      setHealth({ status: data.ollama ? "online" : "degraded", ...data });
    } catch {
      setHealth({ status: "offline" });
    }
  }, []);

  useEffect(() => {
    refreshHealth();
    const id = setInterval(refreshHealth, 20000);
    return () => clearInterval(id);
  }, [refreshHealth]);

  // ---------- toasts ----------
  const dismissToast = useCallback((id) => {
    setToasts((list) => list.filter((t) => t.id !== id));
  }, []);

  const toast = useCallback(
    (message, type = "info") => {
      const id = ++toastId.current;
      setToasts((list) => [...list, { id, message, type }]);
      setTimeout(() => dismissToast(id), 4200);
    },
    [dismissToast],
  );

  // ---------- derived ----------
  const resumeText = resume?.text || "";
  const jobText = job?.text || "";

  const resetSession = useCallback(() => {
    setResume(null);
    setJob(null);
    setMatch(null);
    setChat((c) => ({ engine: c.engine, messages: [] }));
    setWorkflow(null);
  }, []);

  const value = useMemo(
    () => ({
      hydrated,
      resume,
      setResume,
      job,
      setJob,
      match,
      setMatch,
      chat,
      setChat,
      workflow,
      setWorkflow,
      resumeText,
      jobText,
      health,
      refreshHealth,
      toasts,
      toast,
      dismissToast,
      resetSession,
    }),
    [
      hydrated,
      resume,
      job,
      match,
      chat,
      workflow,
      resumeText,
      jobText,
      health,
      refreshHealth,
      toasts,
      toast,
      dismissToast,
      resetSession,
    ],
  );

  return <AppContext.Provider value={value}>{children}</AppContext.Provider>;
}
