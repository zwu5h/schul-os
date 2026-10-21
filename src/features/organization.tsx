"use client";
import { SubjectSelect } from "@/components/subject-select";
import { Fragment, useState } from "react";
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Trash2,
} from "lucide-react";
import { trackDelete, useWorkspace } from "@/lib/store";
import { localDate } from "@/types/school";
import {
  gapBetweenLessons,
  gapLabel,
  type TimetableGapKind,
} from "@/providers/school";
import { Empty } from "@/components/ui";
import { TaskRow } from "./dashboard";

const gapClass: Record<TimetableGapKind, string> = {
  pause: "gap-pause",
  "big-break": "gap-big",
  free: "gap-free",
};
export function Tasks({
  subjectId,
  create,
}: {
  subjectId: string | null;
  create: () => void;
}) {
  const w = useWorkspace();
  const [filter, setFilter] = useState("open");
  const tasks = w.tasks
    .filter(
      (t) =>
        (!subjectId || t.subjectId === subjectId) &&
        (filter === "all" ||
          (filter === "done" ? t.status === "done" : t.status !== "done")),
    )
    .sort((a, b) => a.due.localeCompare(b.due));
  return (
    <>
      <div className="view-actions">
        <div className="tabs">
          {[
            ["open", "Offen"],
            ["done", "Erledigt"],
            ["all", "Alle"],
          ].map(([id, label]) => (
            <button
              key={id}
              className={filter === id ? "active" : ""}
              onClick={() => setFilter(id)}
            >
              {label}
            </button>
          ))}
        </div>
        <button className="button primary" onClick={create}>
          <Plus size={16} /> Neue Aufgabe
        </button>
      </div>
      <div className="panel">
        {tasks.map((t) => (
          <div className="task-manage" key={t.id}>
            <TaskRow task={t} />
            <SubjectSelect kind="tasks" id={t.id} />
            <select
              aria-label={`Status ${t.title}`}
              value={t.status}
              onChange={(e) =>
                w.patch({
                  tasks: w.tasks.map((x) =>
                    x.id === t.id
                      ? {
                          ...x,
                          status: e.target.value as typeof t.status,
                          updatedAt: new Date().toISOString(),
                        }
                      : x,
                  ),
                })
              }
            >
              <option value="todo">Offen</option>
              <option value="progress">In Arbeit</option>
              <option value="done">Erledigt</option>
            </select>
            <button
              className="icon-button"
              aria-label={`${t.title} löschen`}
              onClick={() => {
                if (confirm("Aufgabe löschen?")) {
                  w.patch({ tasks: w.tasks.filter((x) => x.id !== t.id) });
                  trackDelete(t.id);
                }
              }}
            >
              <Trash2 size={15} />
            </button>
          </div>
        ))}
        {!tasks.length && (
          <Empty
            title="Ein freier Kopf"
            description="Hier gibt es gerade keine Aufgaben."
          />
        )}
      </div>
    </>
  );
}
export function Calendar({ create }: { create: () => void }) {
  const w = useWorkspace();
  const [offset, setOffset] = useState(0);
  const today = new Date();
  today.setDate(today.getDate() - ((today.getDay() + 6) % 7) + offset * 7);
  const days = Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(d.getDate() + i);
    return d;
  });
  return (
    <>
      <div className="view-actions">
        <div className="calendar-navigation">
          <button
            className="icon-button"
            aria-label="Vorherige Woche"
            onClick={() => setOffset(offset - 1)}
          >
            <ChevronLeft size={18} />
          </button>
          <strong>
            {days[0].toLocaleDateString("de-AT", {
              day: "numeric",
              month: "long",
            })}{" "}
            –{" "}
            {days[6].toLocaleDateString("de-AT", {
              day: "numeric",
              month: "long",
            })}
          </strong>
          <button
            className="icon-button"
            aria-label="Nächste Woche"
            onClick={() => setOffset(offset + 1)}
          >
            <ChevronRight size={18} />
          </button>
          <button className="text-button" onClick={() => setOffset(0)}>
            Heute
          </button>
        </div>
        <button className="button primary" onClick={create}>
          <Plus size={16} /> Prüfung eintragen
        </button>
      </div>
      <div className="calendar-grid">
        {days.map((d) => {
          const key = localDate(d);
          const dayLessons = w.lessons
            .filter((l) => l.start.startsWith(key))
            .sort(
              (a, b) =>
                a.start.localeCompare(b.start) || a.end.localeCompare(b.end),
            );
          return (
            <div
              className={`calendar-day ${key === localDate() ? "is-today" : ""}`}
              key={key}
            >
              <header>
                <small>
                  {d.toLocaleDateString("de-AT", { weekday: "short" })}
                </small>
                <strong>{d.getDate()}</strong>
              </header>
              {dayLessons.map((l, i) => {
                const gap =
                  i > 0
                    ? gapBetweenLessons(dayLessons[i - 1].end, l.start)
                    : null;
                return (
                  <Fragment key={l.id}>
                    {gap && (
                      <div
                        className={`calendar-gap ${gapClass[gap.kind]}`}
                        aria-label={gapLabel(gap)}
                      >
                        <span>{gapLabel(gap)}</span>
                      </div>
                    )}
                    <div
                      className="calendar-event"
                      style={{
                        borderColor: w.subjects.find(
                          (s) => s.id === l.subjectId,
                        )?.color,
                      }}
                    >
                      <small>
                        {l.start.slice(11)}–{l.end.slice(11)}
                      </small>
                      <strong>
                        {w.subjects.find((s) => s.id === l.subjectId)?.name}
                      </strong>
                      <small>Raum {l.room}</small>
                    </div>
                  </Fragment>
                );
              })}
              {w.tasks
                .filter((t) => t.due === key)
                .map((t) => (
                  <div className="calendar-event task-event" key={t.id}>
                    <small>AUFGABE {t.status === "done" ? "· ✓" : ""}</small>
                    <strong>{t.title}</strong>
                  </div>
                ))}
              {w.exams
                .filter((e) => e.date === key)
                .map((e) => (
                  <div className="calendar-event exam-event" key={e.id}>
                    <small>PRÜFUNG</small>
                    <strong>{e.title}</strong>
                    <p>{e.topics}</p>
                    <SubjectSelect kind="exams" id={e.id} />
                    <button
                      className="text-button"
                      onClick={() => {
                        if (confirm("Prüfung löschen?")) {
                      w.patch({
                        exams: w.exams.filter((x) => x.id !== e.id),
                      });
                      trackDelete(e.id);
                    }
                      }}
                    >
                      Entfernen
                    </button>
                  </div>
                ))}
            </div>
          );
        })}
      </div>
    </>
  );
}
export { Learn } from "./learn";
