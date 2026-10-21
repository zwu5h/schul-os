"use client";
import { useState } from "react";
import { Modal } from "@/components/ui";
import { trackDelete, useWorkspace } from "@/lib/store";
import type { Subject } from "@/types/school";

export function SubjectManager({
  subject,
  deleted,
}: {
  subject: Subject;
  deleted: () => void;
}) {
  const w = useWorkspace();
  const [mode, setMode] = useState<"edit" | "delete" | null>(null);
  return (
    <>
      <div className="subject-management">
        <button className="button" onClick={() => setMode("edit")}>
          Fach bearbeiten
        </button>
        <button className="text-button" onClick={() => setMode("delete")}>
          Fach löschen
        </button>
      </div>
      {mode && (
        <Modal
          title={mode === "edit" ? "Fach bearbeiten" : "Fach löschen"}
          close={() => setMode(null)}
        >
          <form
            className="form"
            onSubmit={(event) => {
              event.preventDefault();
              const data = new FormData(event.currentTarget);
              const latest = useWorkspace.getState();
              const updatedAt = new Date().toISOString();
              if (mode === "edit") {
                const name = String(data.get("name") || "").trim();
                if (!name) return;
                latest.patch({
                  subjects: latest.subjects.map((s) =>
                    s.id === subject.id
                      ? {
                          ...s,
                          name,
                          teacher: String(data.get("teacher") || "").trim(),
                          room: String(data.get("room") || "").trim(),
                          color: String(data.get("color")),
                          updatedAt,
                        }
                      : s,
                  ),
                });
              } else {
                const target = String(data.get("target") || "") || null;
                if (
                  target &&
                  !latest.subjects.some(
                    (s) => s.id === target && s.id !== subject.id,
                  )
                )
                  return;
                const move = <
                  T extends { subjectId: string | null; updatedAt: string },
                >(
                  items: T[],
                ) =>
                  items.map((item) =>
                    item.subjectId === subject.id
                      ? { ...item, subjectId: target, updatedAt }
                      : item,
                  );
                latest.patch({
                  subjects: latest.subjects.filter((s) => s.id !== subject.id),
                  notes: move(latest.notes),
                  boards: move(latest.boards),
                  files: move(latest.files),
                  tasks: move(latest.tasks),
                  exams: move(latest.exams),
                  flashcards: move(latest.flashcards),
                  lessons: latest.lessons.flatMap((lesson) =>
                    lesson.subjectId !== subject.id
                      ? [lesson]
                      : target
                        ? [{ ...lesson, subjectId: target }]
                        : [],
                  ),
                  deletedIds: [
                    ...new Set([
                      ...latest.deletedIds,
                      subject.id,
                      ...(!target
                        ? latest.lessons
                            .filter((lesson) => lesson.subjectId === subject.id)
                            .map((lesson) => lesson.id)
                        : []),
                    ]),
                  ],
                });
                trackDelete(subject.id);
                deleted();
              }
              setMode(null);
            }}
          >
            {mode === "edit" ? (
              <>
                <label>
                  Name
                  <input
                    name="name"
                    required
                    maxLength={140}
                    defaultValue={subject.name}
                    autoFocus
                  />
                </label>
                <label>
                  Lehrkraft
                  <input name="teacher" defaultValue={subject.teacher} />
                </label>
                <label>
                  Raum
                  <input name="room" defaultValue={subject.room} />
                </label>
                <label>
                  Fachfarbe
                  <input
                    name="color"
                    type="color"
                    defaultValue={subject.color}
                  />
                </label>
              </>
            ) : (
              <>
                <p>
                  „{subject.name}“ löschen? Notizen, Whiteboards, Dateien,
                  Aufgaben, Prüfungen und Lernkarten bleiben erhalten.
                </p>
                <label>
                  Inhalte verschieben nach
                  <select name="target" defaultValue="">
                    <option value="">Inbox · Ohne Fach</option>
                    {w.subjects
                      .filter((s) => s.id !== subject.id)
                      .map((s) => (
                        <option key={s.id} value={s.id}>
                          {s.name}
                        </option>
                      ))}
                  </select>
                </label>
                <p className="muted">
                  Stundenplaneinträge werden dem gewählten Fach zugeordnet. Bei
                  „Ohne Fach“ werden sie entfernt.
                </p>
              </>
            )}
            <button className="button primary" type="submit">
              {mode === "edit"
                ? "Änderungen speichern"
                : "Fach löschen und Inhalte behalten"}
            </button>
          </form>
        </Modal>
      )}
    </>
  );
}
