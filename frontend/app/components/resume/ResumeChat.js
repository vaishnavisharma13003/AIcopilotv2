"use client";

import { useEffect, useRef, useState } from "react";

import { apiFetchJSON } from "../../lib/api";
import { useApp } from "../../context/AppContext";
import Icon from "../ui/Icon";
import { copyText } from "../ui/utils";

const WELCOME = {
  role: "assistant",
  text: "Hi! Ask me anything about your resume. I answer only from its content — if it isn't there, I'll say so.",
};

const SUGGESTIONS = [
  "Summarize my experience in 3 sentences",
  "What are my strongest technical skills?",
  "Which projects show leadership?",
  "What certifications or education do I have?",
];

export default function ResumeChat() {
  const { resume, resumeText, chat, setChat, health, toast } = useApp();
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [openSources, setOpenSources] = useState(null);
  const [evals, setEvals] = useState({}); // index -> evaluation result | "loading"
  const endRef = useRef(null);

  const messages = chat.messages.length ? chat.messages : [WELCOME];
  const engine = chat.engine;

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [chat.messages.length, loading]);

  async function send(question) {
    const q = (question ?? input).trim();
    if (!q || loading) return;

    setInput("");
    setLoading(true);
    setChat((c) => ({ ...c, messages: [...(c.messages.length ? c.messages : [WELCOME]), { role: "user", text: q }] }));

    try {
      const data = await apiFetchJSON("/chat", { question: q, engine, resume_text: resumeText });
      setChat((c) => ({
        ...c,
        messages: [
          ...c.messages,
          {
            role: "assistant",
            text: data.answer,
            sources: data.sources,
            engine: data.engine,
            latency: data.latency_ms,
            question: q,
          },
        ],
      }));
    } catch (err) {
      setChat((c) => ({
        ...c,
        messages: [...c.messages, { role: "assistant", text: err.message, error: true }],
      }));
    } finally {
      setLoading(false);
    }
  }

  async function evaluate(index) {
    const m = messages[index];
    setEvals((e) => ({ ...e, [index]: "loading" }));
    try {
      const result = await apiFetchJSON("/evaluate-answer", {
        question: m.question,
        context: (m.sources || []).join("\n---\n"),
        answer: m.text,
      });
      setEvals((e) => ({ ...e, [index]: result }));
    } catch (err) {
      setEvals((e) => ({ ...e, [index]: undefined }));
      toast(err.message, "error");
    }
  }

  async function copy(text) {
    toast((await copyText(text)) ? "Copied to clipboard." : "Copy failed.", "info");
  }

  return (
    <div className="chat-shell">
      <div className="chat-toolbar">
        <div className="engine-toggle" role="tablist" aria-label="RAG engine">
          {[
            ["manual", "Manual RAG", "FAISS + SentenceTransformers"],
            ["langchain", "LangChain RAG", "LCEL chain"],
          ].map(([id, label, hint]) => (
            <button
              key={id}
              type="button"
              role="tab"
              aria-selected={engine === id}
              className={engine === id ? "active" : ""}
              title={hint}
              disabled={id === "langchain" && health.langchain_available === false}
              onClick={() => setChat((c) => ({ ...c, engine: id }))}
            >
              {label}
            </button>
          ))}
        </div>

        <span className="chat-context">
          <Icon name="file" size={13} /> {resume?.filename || "resume"}
        </span>

        <button
          type="button"
          className="ghost-button"
          disabled={!chat.messages.length}
          onClick={() => {
            setChat((c) => ({ ...c, messages: [] }));
            setEvals({});
          }}
        >
          <Icon name="trash" size={14} /> Clear chat
        </button>
      </div>

      <div className="chat-messages">
        {messages.map((item, index) => (
          <div key={index} className={`chat-message ${item.role}`}>
            <div className="message-avatar">{item.role === "assistant" ? "✦" : "ME"}</div>

            <div className="message-body">
              <div className={`message-content ${item.error ? "error" : ""}`}>{item.text}</div>

              {item.role === "assistant" && !item.error && item.question && (
                <div className="message-meta">
                  <span>
                    {item.engine === "langchain" ? "LangChain" : "Manual"} RAG · {(item.latency / 1000).toFixed(1)}s
                  </span>
                  <button type="button" onClick={() => copy(item.text)}>
                    <Icon name="copy" size={12} /> Copy
                  </button>
                  <button type="button" onClick={() => setOpenSources(openSources === index ? null : index)}>
                    {item.sources?.length || 0} sources
                  </button>
                  <button type="button" onClick={() => evaluate(index)} disabled={evals[index] === "loading"}>
                    <Icon name="shield" size={12} /> {evals[index] === "loading" ? "Evaluating…" : "Evaluate"}
                  </button>
                </div>
              )}

              {openSources === index && (
                <div className="sources">
                  {(item.sources || []).map((s, i) => (
                    <blockquote key={i}>{s}</blockquote>
                  ))}
                </div>
              )}

              {evals[index] && evals[index] !== "loading" && (
                <div className="eval-card">
                  {evals[index].valid ? (
                    <>
                      {["relevance", "groundedness", "hallucination", "completeness"].map((k) => (
                        <div key={k}>
                          <strong>{evals[index][k]}/5</strong>
                          <span>{k === "hallucination" ? "no hallucination" : k}</span>
                        </div>
                      ))}
                      <p>{evals[index].summary}</p>
                    </>
                  ) : (
                    <p>{evals[index].summary}</p>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}

        {loading && (
          <div className="chat-message assistant">
            <div className="message-avatar">✦</div>
            <div className="message-content typing">
              <i /> <i /> <i />
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>

      {chat.messages.length === 0 && (
        <div className="suggestions">
          {SUGGESTIONS.map((s) => (
            <button key={s} type="button" onClick={() => send(s)}>
              {s}
            </button>
          ))}
        </div>
      )}

      <div className="chat-input-wrapper">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && !e.shiftKey && send()}
          placeholder="Ask something about your resume..."
          disabled={loading}
        />
        <button type="button" onClick={() => send()} disabled={loading || !input.trim()} aria-label="Send">
          <Icon name="send" size={18} strokeWidth={2.4} />
        </button>
      </div>
    </div>
  );
}
