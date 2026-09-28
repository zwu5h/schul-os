"use client";
import { useEffect, useRef, useState } from "react";
import {
  ArrowUp,
  Copy,
  FilePlus,
  Layers,
  Sparkles,
  Square,
  Trash2,
} from "lucide-react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeKatex from "rehype-katex";
import "katex/dist/katex.min.css";
import { trackDelete, useWorkspace } from "@/lib/store";
import { entity } from "@/types/school";
import { retrieveNotes } from "@/lib/retrieval";
export function Chat({
  subjectId,
  context = "",
  addToCanvas,
}: {
  subjectId: string | null;
  context?: string;
  addToCanvas: (text: string) => void;
}) {
  const w = useWorkspace();
  const [text, setText] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [includeNotes, setIncludeNotes] = useState(false);
  const controller = useRef<AbortController | null>(null);
  const bottom = useRef<HTMLDivElement>(null);
  useEffect(() => {
    bottom.current?.scrollIntoView({ block: "nearest" });
  }, [w.messages, busy]);
  useEffect(() => () => controller.current?.abort(), []);
  async function send(prompt = text) {
    if (!prompt.trim() || busy) return;
    const state = useWorkspace.getState();
    const user = { ...entity(), role: "user" as const, content: prompt.trim() };
    const history = [...state.messages, user];
    const answer = { ...entity(), role: "assistant" as const, content: "" };
    state.patch({ messages: [...history, answer] });
    setText("");
    setBusy(true);
    setError("");
    controller.current = new AbortController();
    const currentSubject = state.subjects.find((s) => s.id === subjectId);
    const selectedContext = [
      context,
      currentSubject ? `Aktuelles Fach: ${currentSubject.name}` : "",
      includeNotes ? retrieveNotes(prompt, state.notes, subjectId) : "",
    ]
      .filter(Boolean)
      .join("\n\n")
      .slice(0, 16000);
    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          messages: history
            .filter((m) => m.content.trim())
            .slice(-20)
            .map(({ role, content }) => ({ role, content })),
          context: selectedContext,
        }),
        signal: controller.current.signal,
      });
      if (!response.ok) {
        const data = await response.json();
        throw new Error(data.error || "Die Anfrage ist fehlgeschlagen.");
      }
      const reader = response.body!.getReader();
      const decoder = new TextDecoder();
      let buffer = "";
      let accumulated = "";
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() || "";
        for (const line of lines) {
          if (!line.startsWith("data: ") || line.slice(6).trim() === "[DONE]")
            continue;
          const event = JSON.parse(line.slice(6));
          if (event.error)
            throw new Error(
              "Die Antwort wurde unterbrochen. Bitte versuche es erneut.",
            );
          const delta = event.choices?.[0]?.delta?.content;
          if (delta) {
            accumulated += delta;
            const latest = useWorkspace.getState();
            latest.patch({
              messages: latest.messages.map((m) =>
                m.id === answer.id ? { ...m, content: accumulated } : m,
              ),
            });
          }
        }
      }
      if (!accumulated)
        throw new Error(
          "Das Modell hat keine Textantwort geliefert. Bitte versuche es erneut.",
        );
    } catch (err) {
      if (!(err instanceof DOMException && err.name === "AbortError"))
        setError(
          err instanceof Error
            ? err.message
            : "Die Verbindung wurde unterbrochen.",
        );
    } finally {
      setBusy(false);
      const latest = useWorkspace.getState();
      latest.patch({
        messages: latest.messages.filter(
          (m) => m.id !== answer.id || m.content.length > 0,
        ),
      });
    }
  }
  return (
    <div className="chat">
      <div className="chat-meta">
        <span className="pill">
          <span className="live-dot" /> Groq · GPT OSS 20B · Free Tier
        </span>
        <button
          className="icon-button"
          disabled={busy}
          title="Chat leeren"
          onClick={() => {
            if (confirm("Diesen Chat löschen?")) {
              trackDelete(...w.messages.map((m) => m.id));
              w.patch({ messages: [] });
            }
          }}
        >
          <Trash2 size={16} />
        </button>
      </div>
      <div className="chat-scroll">
        {!w.messages.length && (
          <div className="chat-intro">
            <div className="large-ai-mark">
              <Sparkles size={30} />
            </div>
            <span className="eyebrow">DEIN PERSÖNLICHER LERNPARTNER</span>
            <h1>
              Was möchtest du
              <br />
              heute verstehen?
            </h1>
            <p>
              Komplizierte Themen. Einfache Erklärungen.
              <br />
              Gemeinsam machen wir den nächsten Schritt.
            </p>
            <div className="suggestions">
              {[
                "Erkläre quadratische Funktionen mit einem Beispiel.",
                "Wie strukturiere ich einen guten Lernplan?",
                "Erstelle 5 Übungsfragen zur Fotosynthese.",
              ].map((t) => (
                <button key={t} onClick={() => setText(t)}>
                  {t}
                  <ArrowUp size={15} />
                </button>
              ))}
            </div>
          </div>
        )}
        {w.messages.map((m) => (
          <div key={m.id} className={`message ${m.role}`}>
            <span className="eyebrow">
              {m.role === "user" ? "DU" : "SCHOOL AI"}
            </span>
            <div className="markdown">
              <ReactMarkdown
                remarkPlugins={[remarkGfm, remarkMath]}
                rehypePlugins={[rehypeKatex]}
              >
                {m.content || "Denkt nach …"}
              </ReactMarkdown>
            </div>
            {m.role === "assistant" && m.content && (
              <div className="message-actions">
                <button
                  onClick={() => void navigator.clipboard.writeText(m.content)}
                >
                  <Copy size={13} /> Kopieren
                </button>
                <button
                  onClick={() => {
                    const latest = useWorkspace.getState();
                    const escaped = m.content
                      .replace(/&/g, "&amp;")
                      .replace(/</g, "&lt;")
                      .replace(/>/g, "&gt;");
                    latest.patch({
                      notes: [
                        {
                          ...entity(),
                          title: "KI · " + m.content.slice(0, 45),
                          subjectId,
                          content: `<p>${escaped.replace(/\n/g, "</p><p>")}</p>`,
                        },
                        ...latest.notes,
                      ],
                    });
                    setError("Als Notiz gespeichert.");
                  }}
                >
                  <FilePlus size={13} /> Als Notiz
                </button>
                <button onClick={() => addToCanvas(m.content)}>
                  <Layers size={13} /> Als Canvas
                </button>
              </div>
            )}
          </div>
        ))}
        <div ref={bottom} />
      </div>
      {error && (
        <div role="status" className="notice">
          {error}
          <button onClick={() => setError("")}>×</button>
        </div>
      )}
      <div className="chat-composer">
        {context && (
          <div className="context-chip">
            Ausgewählte Inhalte · {context.length} Zeichen
          </div>
        )}
        <label className="context-choice">
          <input
            type="checkbox"
            checked={includeNotes}
            onChange={(e) => setIncludeNotes(e.target.checked)}
          />{" "}
          Relevante Notizausschnitte mitsenden
        </label>
        <form
          onSubmit={(e) => {
            e.preventDefault();
            void send();
          }}
        >
          <textarea
            aria-label="Nachricht an KI"
            rows={2}
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Frag etwas. Mach den nächsten Schritt."
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                void send();
              }
            }}
          />
          {busy ? (
            <button
              type="button"
              className="send-button"
              aria-label="Antwort stoppen"
              onClick={() => controller.current?.abort()}
            >
              <Square size={16} />
            </button>
          ) : (
            <button
              className="send-button"
              disabled={!text.trim()}
              aria-label="Nachricht senden"
            >
              <ArrowUp size={20} />
            </button>
          )}
        </form>
        <small>
          Nachrichten und gewählter Kontext werden an Groq gesendet. KI kann
          Fehler machen.
        </small>
      </div>
    </div>
  );
}
