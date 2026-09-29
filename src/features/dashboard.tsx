"use client";
import { Fragment } from "react";
import {
  ArrowRight,
  ArrowUpRight,
  Check,
  Clock3,
  FileText,
  Layers,
  Plus,
  Sparkles,
  Sun,
  BookOpen,
} from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { localDate, type View, type Task } from "@/types/school";
import {
  gapBetweenLessons,
  gapLabel,
  type TimetableGapKind,
} from "@/providers/school";
import { Empty, SectionTitle } from "@/components/ui";

const gapClass: Record<TimetableGapKind, string> = {
  pause: "gap-pause",
  "big-break": "gap-big",
  free: "gap-free",
};
export function TaskRow({ task }: { task: Task }) {
  const w = useWorkspace();
  const subject = w.subjects.find((s) => s.id === task.subjectId);
  return (
    <div className={`task-row ${task.status === "done" ? "completed" : ""}`}>
      <button
        aria-label={`${task.title} ${task.status === "done" ? "wieder öffnen" : "abschließen"}`}
        className="check"
        onClick={() =>
          w.patch({
            tasks: w.tasks.map((t) =>
              t.id === task.id
                ? {
                    ...t,
                    status: t.status === "done" ? "todo" : "done",
                    updatedAt: new Date().toISOString(),
                  }
                : t,
            ),
          })
        }
      >
        {task.status === "done" && <Check size={12} />}
      </button>
      <div>
        <strong>{task.title}</strong>
        <small>
          <span style={{ color: subject?.color }}>●</span>{" "}
          {subject?.name || "Inbox"} <span>·</span>{" "}
          {task.due === localDate()
            ? "Heute"
            : new Date(task.due + "T12:00").toLocaleDateString("de-AT", {
                day: "numeric",
                month: "short",
              })}
        </small>
      </div>
      {task.priority === "high" && <span className="pill">Wichtig</span>}
    </div>
  );
}
export function Dashboard({
  go,
  create,
  openNote,
  openBoard,
}: {
  go: (view: View, subject?: string) => void;
  create: (kind: "note" | "board" | "task") => void;
  openNote: (id: string) => void;
  openBoard: (id: string) => void;
}) {
  const w = useWorkspace();
  const today = localDate();
  const lessons = w.lessons
    .filter((l) => l.start.startsWith(today))
    .sort((a, b) => a.start.localeCompare(b.start));
  const upcoming = lessons.find(
    (l) => new Date(l.end) > new Date() && l.status !== "cancelled",
  );
  const nextSubject = w.subjects.find((s) => s.id === upcoming?.subjectId);
  const tasks = w.tasks
    .filter((t) => t.status !== "done")
    .sort((a, b) => a.due.localeCompare(b.due));
  const exam = [...w.exams]
    .filter((e) => e.date >= today)
    .sort((a, b) => a.date.localeCompare(b.date))[0];
  return (
    <div className="dashboard">
      <div className="eyebrow">
        <Sun size={15} />
        {new Date().toLocaleDateString("de-AT", {
          weekday: "long",
          day: "numeric",
          month: "long",
        })}
      </div>
      <div className="welcome">
        <div>
          <h1>
            Alles bereit für deinen Tag
            {w.profile.name ? `, ${w.profile.name}` : ""}.
          </h1>
          <p>Ein klarer Kopf. Ein guter Plan. Dein Raum zum Lernen.</p>
        </div>
        <button className="button" onClick={() => create("note")}>
          <Plus size={16} /> Schnell erfassen
        </button>
      </div>
      <div className="overview-grid">
        <div className="next-lesson">
          <div className="eyebrow">
            <span className="live-dot" />
            {upcoming ? "ALS NÄCHSTES" : "DEIN WORKSPACE"}
          </div>
          <h2>{nextSubject?.name || "Platz für neue Gedanken."}</h2>
          <p>
            {upcoming
              ? `${upcoming.start.slice(11)}–${upcoming.end.slice(11)} · Raum ${upcoming.room}`
              : "Sammle Ideen. Verbinde Wissen. Mach es zu deinem."}
          </p>
          <button
            onClick={() =>
              upcoming ? go("subjects", upcoming.subjectId) : create("board")
            }
          >
            {upcoming ? "Fach öffnen" : "Canvas öffnen"}
            <ArrowUpRight size={17} />
          </button>
          <div className="orbit-art" aria-hidden="true">
            <div />
            <div />
            <span>✳</span>
          </div>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <Check size={19} />
          </div>
          <span>Offene Aufgaben</span>
          <strong>{tasks.length.toString().padStart(2, "0")}</strong>
          <small>
            {tasks.filter((t) => t.due <= today).length} heute oder früher
            fällig
          </small>
        </div>
        <div className="stat-card">
          <div className="stat-icon">
            <BookOpen size={19} />
          </div>
          <span>Nächste Prüfung</span>
          <strong>
            {exam
              ? Math.max(
                  0,
                  Math.round(
                    (new Date(exam.date + "T12:00").getTime() -
                      new Date(today + "T12:00").getTime()) /
                      86400000,
                  ),
                )
              : "—"}
            {exam && <em>Tage</em>}
          </strong>
          <small>{exam?.title || "Alles im grünen Bereich"}</small>
        </div>
      </div>
      <div className="dashboard-columns">
        <div>
          <SectionTitle
            title="Dein Stundenplan"
            action="Kalender öffnen"
            onClick={() => go("calendar")}
          />
          <div className="panel schedule">
            {lessons.length ? (
              lessons.map((l, i) => {
                const s = w.subjects.find((s) => s.id === l.subjectId);
                const gap =
                  i > 0
                    ? gapBetweenLessons(lessons[i - 1].end, l.start)
                    : null;
                return (
                  <Fragment key={l.id}>
                    {gap && (
                      <div
                        className={`lesson-gap ${gapClass[gap.kind]}`}
                        aria-label={gapLabel(gap)}
                      >
                        <span>{gapLabel(gap)}</span>
                      </div>
                    )}
                  <button
                    className={`lesson ${upcoming?.id === l.id ? "current" : ""}`}
                    onClick={() => go("subjects", l.subjectId)}
                  >
                    <div className="lesson-time">
                      {l.start.slice(11)}
                      <small>{l.end.slice(11)}</small>
                    </div>
                    <span
                      className="lesson-number"
                      style={{ background: s?.color + "20", color: s?.color }}
                    >
                      {i + 1}
                    </span>
                    <div className="lesson-info">
                      <strong>{s?.name || "Fach"}</strong>
                      <small>
                        {l.teacher} · Raum {l.room}
                      </small>
                    </div>
                    {upcoming?.id === l.id ? (
                      <span className="pill">Als Nächstes</span>
                    ) : (
                      <ArrowUpRight size={15} />
                    )}
                  </button>
                  </Fragment>
                );
              })
            ) : (
              <Empty
                title="Heute kein Unterricht eingetragen"
                description="Eigene Termine findest du im Kalender. WebUntis ist noch nicht verbunden."
              />
            )}
          </div>
          <SectionTitle
            title="Zuletzt bearbeitet"
            action="Alle Notizen"
            onClick={() => go("notes")}
          />
          <div className="recent-grid">
            {[...w.notes]
              .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
              .slice(0, 2)
              .map((n) => (
                <button
                  className="recent-card"
                  key={n.id}
                  onClick={() => openNote(n.id)}
                >
                  <div className="note-preview">
                    <FileText size={19} />
                    <span />
                    <span />
                    <span />
                  </div>
                  <strong>{n.title}</strong>
                  <small>
                    {w.subjects.find((s) => s.id === n.subjectId)?.name ||
                      "Inbox"}{" "}
                    · Notiz
                  </small>
                </button>
              ))}
            {w.boards.slice(0, 1).map((b) => (
              <button
                className="recent-card"
                key={b.id}
                onClick={() => openBoard(b.id)}
              >
                <div className="board-preview">
                  <span>Idee</span>
                  <i />
                  <span>Wissen</span>
                </div>
                <strong>{b.title}</strong>
                <small>Canvas · Freiraum für Ideen</small>
              </button>
            ))}
            {!w.notes.length && !w.boards.length && (
              <button className="recent-card" onClick={() => create("note")}>
                <Plus />
                <strong>Deine erste Notiz</strong>
                <small>Ein Gedanke ist ein guter Anfang.</small>
              </button>
            )}
          </div>
        </div>
        <div>
          <SectionTitle
            title="Im Fokus"
            action="Alle Aufgaben"
            onClick={() => go("tasks")}
          />
          <div className="panel task-panel">
            {tasks.slice(0, 4).map((t) => (
              <TaskRow key={t.id} task={t} />
            ))}
            {!tasks.length && (
              <Empty
                title="Alles erledigt"
                description="Zeit für etwas Neues."
              />
            )}
            <button className="add-line" onClick={() => create("task")}>
              <Plus size={15} /> Aufgabe hinzufügen
            </button>
          </div>
          <div className="ai-invitation">
            <div className="ai-mark">
              <Sparkles size={19} />
            </div>
            <span className="eyebrow">DEIN LERNPARTNER</span>
            <h2>
              Aus „verstehe ich nicht“
              <br />
              wird „hab ich drauf“.
            </h2>
            <p>
              Lass dir ein Thema erklären oder entwickle Schritt für Schritt
              einen Lernplan.
            </p>
            <button className="button" onClick={() => go("ai")}>
              Frag deine KI
              <ArrowRight size={16} />
            </button>
          </div>
          <div className="quiet-note">
            <Clock3 size={16} />
            <span>
              In deinem Tempo.
              <br />
              <strong>Ein Schritt nach dem anderen.</strong>
            </span>
          </div>
        </div>
      </div>
      <SectionTitle
        title="Deine Fächer"
        action="Alle Fächer"
        onClick={() => go("subjects")}
      />
      <div className="subject-strip">
        {w.subjects.map((s) => (
          <button key={s.id} onClick={() => go("subjects", s.id)}>
            <span
              className="subject-symbol"
              style={{ color: s.color, background: s.color + "18" }}
            >
              {s.icon}
            </span>
            <span>
              <strong>{s.name}</strong>
              <small>
                {w.notes.filter((n) => n.subjectId === s.id).length} Notizen ·{" "}
                {w.boards.filter((b) => b.subjectId === s.id).length} Canvas
              </small>
            </span>
            <Layers size={15} />
          </button>
        ))}
      </div>
    </div>
  );
}
