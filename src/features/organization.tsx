"use client";
import { useState } from "react";
import { ChevronLeft, ChevronRight, Plus, Trash2 } from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { localDate } from "@/types/school";
import { Empty } from "@/components/ui";
import { TaskRow } from "./dashboard";
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
                if (confirm("Aufgabe löschen?"))
                  w.patch({ tasks: w.tasks.filter((x) => x.id !== t.id) });
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
              {w.lessons
                .filter((l) => l.start.startsWith(key))
                .map((l) => (
                  <div
                    className="calendar-event"
                    key={l.id}
                    style={{
                      borderColor: w.subjects.find((s) => s.id === l.subjectId)
                        ?.color,
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
                ))}
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
                    <button
                      className="text-button"
                      onClick={() => {
                        if (confirm("Prüfung löschen?"))
                          w.patch({
                            exams: w.exams.filter((x) => x.id !== e.id),
                          });
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
export function Learn({
  subjectId,
  create,
}: {
  subjectId: string | null;
  create: () => void;
}) {
  const w = useWorkspace();
  const cards = w.flashcards.filter(
    (c) => !subjectId || c.subjectId === subjectId,
  );
  const [index, setIndex] = useState(0);
  const [back, setBack] = useState(false);
  const card = cards[index % Math.max(1, cards.length)];
  return (
    <>
      <div className="view-actions">
        <span>
          {cards.filter((c) => c.known).length} von {cards.length} Karten
          gelernt
        </span>
        <button className="button primary" onClick={create}>
          <Plus size={16} /> Lernkarte
        </button>
      </div>
      {card ? (
        <div className="learning">
          <span className="eyebrow">
            KARTE {(index % cards.length) + 1} / {cards.length}
          </span>
          <button className="flashcard" onClick={() => setBack(!back)}>
            <small>{back ? "ANTWORT" : "FRAGE"}</small>
            <h2>{back ? card.back : card.front}</h2>
            <span>Zum Umdrehen klicken</span>
          </button>
          <div className="learning-actions">
            <button
              className="button"
              onClick={() => {
                w.patch({
                  flashcards: w.flashcards.map((c) =>
                    c.id === card.id ? { ...c, known: false } : c,
                  ),
                });
                setIndex(index + 1);
                setBack(false);
              }}
            >
              Noch üben
            </button>
            <button
              className="button primary"
              onClick={() => {
                w.patch({
                  flashcards: w.flashcards.map((c) =>
                    c.id === card.id ? { ...c, known: true } : c,
                  ),
                });
                setIndex(index + 1);
                setBack(false);
              }}
            >
              Gewusst
            </button>
            <button
              className="icon-button"
              title="Lernkarte löschen"
              onClick={() => {
                if (confirm("Lernkarte löschen?")) {
                  w.patch({
                    flashcards: w.flashcards.filter((c) => c.id !== card.id),
                  });
                  setBack(false);
                }
              }}
            >
              <Trash2 size={16} />
            </button>
          </div>
        </div>
      ) : (
        <Empty
          title="Wissen, das bleibt"
          description="Erstelle deine erste Lernkarte und wiederhole in deinem Tempo."
        />
      )}
    </>
  );
}
