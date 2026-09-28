"use client";
import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import {
  ArrowLeft,
  ArrowUpRight,
  BookOpen,
  CalendarDays,
  CheckSquare,
  ChevronDown,
  FileText,
  FolderOpen,
  GraduationCap,
  Home,
  Layers,
  Menu,
  Plus,
  Search,
  Settings2,
  Sparkles,
  Wifi,
  X,
} from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { useAuth } from "@/lib/auth";
import { initAutoSync } from "@/lib/sync";
import { demoWorkspace, emptyWorkspace } from "@/lib/demo";
import { entity, type View } from "@/types/school";
import { BoardLibrary } from "@/features/board-library";
import { Dashboard } from "@/features/dashboard";
import { Capture, type CaptureKind } from "@/features/capture";
import { Calendar, Learn, Tasks } from "@/features/organization";
import { Settings, WebUntis } from "@/features/settings";
import { Empty, Modal } from "./ui";
const Canvas = dynamic(() => import("@/features/canvas"), {
  ssr: false,
  loading: () => <div className="empty">Canvas wird geladen …</div>,
});
const NoteEditor = dynamic(
  () => import("@/features/notes").then((m) => m.NoteEditor),
  { ssr: false },
);
const Chat = dynamic(() => import("@/features/chat").then((m) => m.Chat), {
  ssr: false,
});
const Files = dynamic(() => import("@/features/files").then((m) => m.Files), {
  ssr: false,
});
const navigation = [
  { id: "canvas", label: "Whiteboards", icon: Layers },
  { id: "today", label: "Heute", icon: Home },
  { id: "calendar", label: "Kalender", icon: CalendarDays },
  { id: "tasks", label: "Aufgaben", icon: CheckSquare },
  { id: "ai", label: "KI-Assistent", icon: Sparkles },
] as const;
const workspaceNav = [
  { id: "notes", label: "Notizen", icon: FileText },

  { id: "files", label: "Dateien", icon: FolderOpen },
  { id: "learn", label: "Lernkarten", icon: BookOpen },
] as const;
function plural(n: number, one: string, many: string) {
  return `${n} ${n === 1 ? one : many}`;
}
const titles: Record<View, string> = {
  today: "Heute",
  calendar: "Kalender",
  tasks: "Aufgaben",
  ai: "KI-Assistent",
  notes: "Notizen",
  canvas: "Whiteboards",
  files: "Dateien",
  learn: "Lernkarten",
  subjects: "Fächer",
  settings: "Einstellungen",
  webuntis: "WebUntis",
};
export function SchoolApp() {
  const w = useWorkspace();
  const [view, setView] = useState<View>("canvas");
  const [subjectId, setSubjectId] = useState<string | null>(null);
  const [activeId, setActiveId] = useState<string | null>(null);
  const [capture, setCapture] = useState<CaptureKind | null>(null);
  const [search, setSearch] = useState(false);
  const [query, setQuery] = useState("");
  const [mobile, setMobile] = useState(false);
  const [aiPanel, setAiPanel] = useState(false);
  const [context, setContext] = useState("");
  const [online, setOnline] = useState(true);
  const [notice, setNotice] = useState("");
  const [quick, setQuick] = useState(false);
  useEffect(() => {
    void Promise.resolve(useWorkspace.persist.rehydrate()).finally(() =>
      useWorkspace.getState().hydrate(),
    );
    useAuth.getState().init();
    initAutoSync();
    const sync = () => setOnline(navigator.onLine);
    sync();
    window.addEventListener("online", sync);
    window.addEventListener("offline", sync);
    return () => {
      window.removeEventListener("online", sync);
      window.removeEventListener("offline", sync);
    };
  }, []);
  useEffect(() => {
    document.documentElement.dataset.theme = w.theme;
  }, [w.theme]);
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        setSearch((s) => !s);
        return;
      }
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && e.code === "Space") {
        e.preventDefault();
        setQuick(true);
        return;
      }
      if (
        (e.target as HTMLElement).closest(
          'input,textarea,[contenteditable="true"],.excalidraw',
        ) ||
        e.ctrlKey ||
        e.metaKey ||
        document.querySelector("dialog[open]")
      )
        return;
      if (e.key === "n") setCapture("note");
      if (e.key === "c") setCapture("board");
      if (e.key === "t") setCapture("task");
      if (e.key === "a") setAiPanel((s) => !s);
      if (e.key === "/") {
        e.preventDefault();
        setSearch(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);
  function go(next: View, subject?: string) {
    setView(next);
    setSubjectId(subject || null);
    setActiveId(null);
    setMobile(false);
  }
  function open(next: "notes" | "canvas", id: string) {
    setView(next);
    setActiveId(id);
    const current = useWorkspace.getState();
    const item =
      next === "canvas"
        ? current.boards.find((b) => b.id === id)
        : current.notes.find((n) => n.id === id);
    setSubjectId(item?.subjectId || null);
    setSearch(false);
  }
  function ask(text: string) {
    setContext(text.slice(0, 12000));
    setAiPanel(true);
  }
  function addToCanvas(text: string) {
    const id = entity();
    w.patch({
      boards: [{ ...id, title: "KI · Lernübersicht", subjectId }, ...w.boards],
    });
    sessionStorage.setItem(`canvas-addition:${id.id}`, text);
    open("canvas", id.id);
    setAiPanel(false);
  }
  const subject = w.subjects.find((s) => s.id === subjectId);
  const notes = w.notes.filter((n) => !subjectId || n.subjectId === subjectId);
  if (!w.ready)
    return (
      <div className="boot">
        <GraduationCap size={38} />
        <strong>School OS</strong>
        <span>Dein Workspace wird geladen …</span>
      </div>
    );
  if (!w.onboarded)
    return (
      <div className="onboarding">
        <div className="onboarding-art">
          <div className="brand">
            <span>
              <GraduationCap size={22} />
            </span>{" "}
            school<span className="brand-os">os</span>
          </div>
          <div>
            <span className="eyebrow">WENIGER CHAOS. MEHR KLARHEIT.</span>
            <h1>
              Dein Schulalltag.
              <br />
              Ein Workspace.
              <br />
              <i>Alles verbunden.</i>
            </h1>
            <p>
              Ein Zuhause für deine Gedanken, Aufgaben
              <br />
              und die großen Aha-Momente.
            </p>
          </div>
          <small>Notizen · Canvas · Organisation · KI</small>
        </div>
        <div className="onboarding-form">
          <span className="eyebrow">WILLKOMMEN BEI SCHOOL OS</span>
          <h2>Mach Platz für gute Ideen.</h2>
          <p>Starte lokal. Ohne Konto. In deinem Tempo.</p>
          <form
            className="form"
            onSubmit={(e) => {
              e.preventDefault();
              const data = new FormData(e.currentTarget);
              const base = data.get("demo")
                ? demoWorkspace()
                : emptyWorkspace();
              w.reset({
                ...base,
                onboarded: true,
                profile: {
                  name: String(data.get("name")).trim(),
                  school: String(data.get("school")),
                  grade: String(data.get("grade")),
                },
              });
            }}
          >
            <label>
              Wie heißt du?
              <input name="name" placeholder="Dein Vorname" maxLength={40} />
            </label>
            <div className="form-row">
              <label>
                Schule
                <input name="school" placeholder="Optional" />
              </label>
              <label>
                Klassenstufe
                <input name="grade" placeholder="Optional" />
              </label>
            </div>
            <label className="checkbox-label">
              <input type="checkbox" name="demo" defaultChecked /> Mit
              Demo-Fächern und Beispielinhalten starten
            </label>
            <button className="button primary">
              Workspace öffnen <ArrowUpRight size={17} />
            </button>
          </form>
          <small>
            Deine Daten bleiben in diesem Browser. KI-Anfragen werden nur beim
            Absenden an Groq übertragen.
          </small>
        </div>
      </div>
    );
  return (
    <div
      className={`app ${aiPanel ? "with-ai" : ""}`}
      onDragOver={(e) => {
        if (Array.from(e.dataTransfer.types).includes("Files"))
          e.preventDefault();
      }}
      onDrop={async (e) => {
        if ((e.target as HTMLElement).closest(".canvas-workspace")) return;
        e.preventDefault();
        if (e.dataTransfer.files.length) {
          try {
            const { saveFiles } = await import("@/features/files");
            await saveFiles(Array.from(e.dataTransfer.files), subjectId);
            setNotice("Dateien gespeichert. Du findest sie unter Dateien.");
          } catch (err) {
            setNotice(
              err instanceof Error
                ? err.message
                : "Dateien konnten nicht gespeichert werden.",
            );
          }
        }
      }}
    >
      {mobile && (
        <button
          className="mobile-scrim"
          aria-label="Menü schließen"
          onClick={() => setMobile(false)}
        />
      )}
      <aside className={`sidebar ${mobile ? "mobile-open" : ""}`}>
        <button className="brand" onClick={() => go("canvas")}>
          <span>
            <GraduationCap size={21} />
          </span>
          school<span className="brand-os">os</span>
        </button>
        <button className="workspace-picker" onClick={() => go("settings")}>
          <span className="avatar">
            {w.profile.name.charAt(0).toUpperCase() || "S"}
          </span>
          <span>
            <strong>
              {w.profile.name
                ? `${w.profile.name}s Workspace`
                : "Mein Workspace"}
            </strong>
            <small>{w.profile.school || "Dein persönlicher Lernraum"}</small>
          </span>
          <ChevronDown size={13} />
        </button>
        <button className="search-button" onClick={() => setSearch(true)}>
          <Search size={15} />
          <span>Suchen</span>
          <kbd>Ctrl K</kbd>
        </button>
        <nav>
          {navigation.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => go(item.id)}
            >
              <item.icon size={17} />
              {item.label}
              {item.id === "tasks" && (
                <small>
                  {w.tasks.filter((t) => t.status !== "done").length}
                </small>
              )}
              {item.id === "ai" && <span className="mini-badge">AI</span>}
            </button>
          ))}
        </nav>
        <div className="nav-heading">WORKSPACE</div>
        <nav>
          {workspaceNav.map((item) => (
            <button
              key={item.id}
              className={view === item.id ? "active" : ""}
              onClick={() => go(item.id)}
            >
              <item.icon size={17} />
              {item.label}
            </button>
          ))}
        </nav>
        <div className="nav-heading">
          <button onClick={() => go("subjects")}>DEINE FÄCHER</button>
          <button title="Fach hinzufügen" onClick={() => setCapture("subject")}>
            <Plus size={14} />
          </button>
        </div>
        <nav className="subject-nav">
          {w.subjects.map((s) => (
            <button
              key={s.id}
              className={subjectId === s.id ? "active" : ""}
              onClick={() => go("subjects", s.id)}
            >
              <span className="subject-dot" style={{ background: s.color }} />
              {s.name}
            </button>
          ))}
          <button className="subtle" onClick={() => setCapture("subject")}>
            <Plus size={15} /> Fach hinzufügen
          </button>
        </nav>
        <div className="sidebar-bottom">
          <button className="webuntis-link" onClick={() => go("webuntis")}>
            <span>W</span> WebUntis <span className="connection-dot" />
          </button>
          <button
            className={view === "settings" ? "active" : ""}
            onClick={() => go("settings")}
          >
            <Settings2 size={17} /> Einstellungen
          </button>
          <div className="local-status">
            <span className="live-dot" />
            {online ? "Lokal gespeichert" : "Offline · Lokal verfügbar"}
            <Wifi size={12} />
          </div>
        </div>
      </aside>
      <div className="main-shell">
        <header className="topbar">
          <div>
            <button
              className="icon-button menu-toggle"
              aria-label="Menü"
              onClick={() => setMobile(!mobile)}
            >
              <Menu size={19} />
            </button>
            <span className="breadcrumb">Mein Workspace</span>
            <span className="breadcrumb-slash">/</span>
            <strong>{subject?.name || titles[view]}</strong>
            {w.demo && <span className="demo-label">DEMO</span>}
          </div>
          <div>
            <span className="top-date">
              {new Date().toLocaleDateString("de-AT", {
                day: "numeric",
                month: "short",
              })}
            </span>
            <button className="ai-toggle" onClick={() => setAiPanel(!aiPanel)}>
              <Sparkles size={16} />
              <span>Frag die KI</span>
            </button>
            <button className="new-button" onClick={() => setQuick(true)}>
              <Plus size={16} />
              <span>Neu</span>
            </button>
          </div>
        </header>
        {(notice || w.storageError) && (
          <div className="notice" role="status">
            {w.storageError || notice}
            <button
              onClick={() => {
                setNotice("");
                useWorkspace.setState({ storageError: null });
              }}
            >
              ×
            </button>
          </div>
        )}
        <main
          className={
            view === "ai"
              ? "main-content chat-page"
              : view === "canvas" && activeId
                ? "main-content canvas-page"
                : "main-content"
          }
        >
          {view !== "today" && view !== "ai" && view !== "canvas" && (
            <div className="page-heading">
              <div>
                {activeId && (
                  <button
                    className="text-button"
                    onClick={() => setActiveId(null)}
                  >
                    <ArrowLeft size={14} /> Zur Übersicht
                  </button>
                )}
                <span className="eyebrow">DEIN WORKSPACE</span>
                <h1>{activeId ? "Notizen" : subject?.name || titles[view]}</h1>
              </div>
              {subject && (
                <span className="muted">
                  {subject.teacher} ·{" "}
                  {subject.room ? `Raum ${subject.room}` : ""}
                </span>
              )}
            </div>
          )}
          {view === "today" && (
            <Dashboard
              go={go}
              create={setCapture}
              openNote={(id) => open("notes", id)}
              openBoard={(id) => open("canvas", id)}
            />
          )}
          {view === "subjects" && (
            <>
              {subject ? (
                <>
                  <div className="view-actions">
                    <p>Alles zu {subject.name}, an einem Ort.</p>
                    <button
                      className="button"
                      onClick={() => {
                        setContext(`Aktuelles Fach: ${subject.name}`);
                        setAiPanel(true);
                      }}
                    >
                      <Sparkles size={15} /> Fach mit KI erkunden
                    </button>
                  </div>
                  <div className="subject-actions">
                    <button
                      className="panel"
                      onClick={() => go("canvas", subject.id)}
                    >
                      <Layers size={24} />
                      <h3>Whiteboards</h3>
                      <small>
                        {plural(
                          w.boards.filter((b) => b.subjectId === subject.id)
                            .length,
                          "Whiteboard",
                          "Whiteboards",
                        )}
                      </small>
                      <ArrowUpRight size={16} />
                    </button>
                    <button
                      className="panel"
                      onClick={() => go("notes", subject.id)}
                    >
                      <FileText size={24} />
                      <h3>Notizen</h3>
                      <small>
                        {plural(
                          w.notes.filter((n) => n.subjectId === subject.id)
                            .length,
                          "Notiz",
                          "Notizen",
                        )}
                      </small>
                      <ArrowUpRight size={16} />
                    </button>
                    <button
                      className="panel"
                      onClick={() => go("files", subject.id)}
                    >
                      <FolderOpen size={24} />
                      <h3>Dateien</h3>
                      <small>
                        {plural(
                          w.files.filter((f) => f.subjectId === subject.id)
                            .length,
                          "Datei",
                          "Dateien",
                        )}
                      </small>
                      <ArrowUpRight size={16} />
                    </button>
                    <button
                      className="panel"
                      onClick={() => go("learn", subject.id)}
                    >
                      <BookOpen size={24} />
                      <h3>Lernkarten</h3>
                      <small>
                        {plural(
                          w.flashcards.filter(
                            (c) => c.subjectId === subject.id,
                          ).length,
                          "Lernkarte",
                          "Lernkarten",
                        )}
                      </small>
                      <ArrowUpRight size={16} />
                    </button>
                    <button
                      className="panel"
                      onClick={() => go("tasks", subject.id)}
                    >
                      <CheckSquare size={24} />
                      <h3>Aufgaben</h3>
                      <small>
                        {plural(
                          w.tasks.filter(
                            (t) =>
                              t.subjectId === subject.id &&
                              t.status !== "done",
                          ).length,
                          "offene Aufgabe",
                          "offene Aufgaben",
                        )}
                      </small>
                      <ArrowUpRight size={16} />
                    </button>
                  </div>
                  <h2 className="spaced-heading">Notizen in diesem Fach</h2>
                  <div className="item-grid">
                    {notes.map((n) => (
                      <button
                        className="item-card panel"
                        key={n.id}
                        onClick={() => open("notes", n.id)}
                      >
                        <FileText />
                        <h3>{n.title}</h3>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <>
                  <div className="view-actions">
                    <p>Dein Wissen. Nach Fächern geordnet.</p>
                    <button
                      className="button primary"
                      onClick={() => setCapture("subject")}
                    >
                      <Plus size={16} /> Fach hinzufügen
                    </button>
                  </div>
                  <div className="item-grid">
                    {w.subjects.map((s) => (
                      <button
                        className="item-card panel"
                        key={s.id}
                        onClick={() => go("subjects", s.id)}
                      >
                        <span
                          className="subject-symbol"
                          style={{ background: s.color + "20", color: s.color }}
                        >
                          {s.icon}
                        </span>
                        <h2>{s.name}</h2>
                        <p>
                          {s.teacher || "Keine Lehrkraft eingetragen"}
                          {s.room ? ` · Raum ${s.room}` : ""}
                        </p>
                        <small>
                          {w.notes.filter((n) => n.subjectId === s.id).length}{" "}
                          Notizen
                        </small>
                      </button>
                    ))}
                  </div>
                  {!w.subjects.length && (
                    <Empty
                      title="Dein erstes Fach wartet"
                      description="Lege ein Fach an und sammle dort deine Lernmaterialien."
                    />
                  )}
                </>
              )}
            </>
          )}
          {view === "notes" &&
            (activeId ? (
              <NoteEditor
                key={activeId}
                id={activeId}
                ask={ask}
                close={() => setActiveId(null)}
              />
            ) : (
              <>
                <div className="view-actions">
                  <p>Gedanken festhalten. Zusammenhänge verstehen.</p>
                  <button
                    className="button primary"
                    onClick={() => setCapture("note")}
                  >
                    <Plus size={16} /> Neue Notiz
                  </button>
                </div>
                <div className="item-grid">
                  {notes.map((n) => (
                    <button
                      className="item-card panel"
                      key={n.id}
                      onClick={() => open("notes", n.id)}
                    >
                      <FileText size={23} />
                      <h3>{n.title || "Unbenannte Notiz"}</h3>
                      <p>
                        {n.content.replace(/<[^>]*>/g, " ").slice(0, 130) ||
                          "Eine leere Seite voller Möglichkeiten."}
                      </p>
                      <small>
                        {w.subjects.find((s) => s.id === n.subjectId)?.name ||
                          "Inbox"}
                      </small>
                    </button>
                  ))}
                </div>
                {!notes.length && (
                  <Empty
                    title="Jeder Gedanke zählt"
                    description="Erstelle deine erste Notiz."
                  />
                )}
              </>
            ))}
          {view === "canvas" &&
            (activeId ? (
              <Canvas
                key={activeId}
                id={activeId}
                ask={ask}
                back={() => setActiveId(null)}
                create={() => setCapture("board")}
                switchBoard={(id) => open("canvas", id)}
              />
            ) : (
              <BoardLibrary
                subjectId={subjectId}
                chooseSubject={setSubjectId}
                open={(id) => open("canvas", id)}
                create={() => setCapture("board")}
              />
            ))}
          {view === "tasks" && (
            <Tasks subjectId={subjectId} create={() => setCapture("task")} />
          )}
          {view === "calendar" && (
            <Calendar create={() => setCapture("exam")} />
          )}
          {view === "files" && <Files subjectId={subjectId} ask={ask} />}
          {view === "learn" && (
            <Learn
              subjectId={subjectId}
              create={() => setCapture("flashcard")}
            />
          )}
          {view === "settings" && <Settings />}
          {view === "webuntis" && <WebUntis />}
          {view === "ai" && (
            <Chat
              subjectId={subjectId}
              context={context}
              addToCanvas={addToCanvas}
            />
          )}
        </main>
        <footer className="app-footer">
          <span>Ein bisschen organisierter. Ein bisschen entspannter.</span>
          <span>
            school os <span>✳</span>
          </span>
        </footer>
      </div>
      {aiPanel && (
        <aside className="ai-panel">
          <header>
            <Sparkles size={17} />
            <strong>Dein Lernpartner</strong>
            <button
              className="icon-button"
              onClick={() => setAiPanel(false)}
              aria-label="KI schließen"
            >
              <X size={18} />
            </button>
          </header>
          <Chat
            subjectId={subjectId}
            context={context}
            addToCanvas={addToCanvas}
          />
        </aside>
      )}
      {capture && (
        <Capture
          kind={capture}
          subjectId={subjectId}
          close={() => setCapture(null)}
          created={(id) => {
            if (capture === "note") open("notes", id);
            if (capture === "board") open("canvas", id);
            if (capture === "subject") go("subjects", id);
          }}
        />
      )}
      {quick && (
        <Modal
          title="Was möchtest du festhalten?"
          close={() => setQuick(false)}
        >
          <div className="quick-grid">
            {(
              [
                ["note", "Notiz"],
                ["board", "Canvas"],
                ["task", "Aufgabe"],
                ["exam", "Prüfung"],
                ["subject", "Fach"],
                ["flashcard", "Lernkarte"],
              ] as const
            ).map(([kind, label]) => (
              <button
                className="button"
                key={kind}
                onClick={() => {
                  setQuick(false);
                  setCapture(kind);
                }}
              >
                <Plus size={15} />
                {label}
              </button>
            ))}
            <button
              className="button"
              onClick={() => {
                go("files");
                setQuick(false);
              }}
            >
              Datei hochladen
            </button>
            <button
              className="button"
              onClick={() => {
                go("ai");
                setQuick(false);
              }}
            >
              KI fragen
            </button>
          </div>
        </Modal>
      )}
      {search && (
        <Modal title="Suchen & entdecken" close={() => setSearch(false)}>
          <input
            autoFocus
            className="search-input"
            placeholder="Fächer, Notizen, Canvas, Aufgaben …"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <div className="search-results">
            {[
              ...w.subjects.map((s) => ({
                id: s.id,
                title: s.name,
                type: "Fach",
                action: () => go("subjects", s.id),
              })),
              ...w.notes.map((n) => ({
                id: n.id,
                title: n.title,
                type: "Notiz",
                action: () => open("notes", n.id),
              })),
              ...w.boards.map((b) => ({
                id: b.id,
                title: b.title,
                type: "Canvas",
                action: () => open("canvas", b.id),
              })),
              ...w.tasks.map((t) => ({
                id: t.id,
                title: t.title,
                type: "Aufgabe",
                action: () => go("tasks", t.subjectId || undefined),
              })),
              ...w.files.map((f) => ({
                id: f.id,
                title: f.name,
                type: "Datei",
                action: () => go("files", f.subjectId || undefined),
              })),
              ...Object.entries(titles).map(([id, title]) => ({
                id,
                title,
                type: "Öffnen",
                action: () => go(id as View),
              })),
            ]
              .filter((r) =>
                r.title.toLowerCase().includes(query.toLowerCase()),
              )
              .slice(0, 20)
              .map((r) => (
                <button
                  key={r.id}
                  onClick={() => {
                    r.action();
                    setSearch(false);
                  }}
                >
                  <Search size={15} />
                  <span>{r.title}</span>
                  <small>{r.type}</small>
                  <ArrowUpRight size={14} />
                </button>
              ))}
          </div>
        </Modal>
      )}
    </div>
  );
}
