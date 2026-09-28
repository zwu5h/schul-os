"use client";
import { useState } from "react";
import { useWorkspace } from "@/lib/store";
import { entity, localDate } from "@/types/school";
import { Modal } from "@/components/ui";
export type CaptureKind =
  "note" | "board" | "task" | "exam" | "subject" | "flashcard";
const labels: Record<CaptureKind, string> = {
  note: "Neue Notiz",
  board: "Neuer Canvas",
  task: "Neue Aufgabe",
  exam: "Neue Prüfung",
  subject: "Neues Fach",
  flashcard: "Neue Lernkarte",
};
export function Capture({
  kind,
  subjectId,
  close,
  created,
}: {
  kind: CaptureKind;
  subjectId: string | null;
  close: () => void;
  created: (id: string) => void;
}) {
  const w = useWorkspace();
  const [subject, setSubject] = useState(subjectId || "");
  return (
    <Modal title={labels[kind]} close={close}>
      <form
        className="form"
        onSubmit={(e) => {
          e.preventDefault();
          const data = new FormData(e.currentTarget);
          const title = String(data.get("title") || "").trim();
          if (!title) return;
          const base = entity();
          const sid = subject || null;
          if (kind === "subject")
            w.patch({
              subjects: [
                ...w.subjects,
                {
                  ...base,
                  name: title,
                  color: String(data.get("color")),
                  teacher: String(data.get("teacher")),
                  room: String(data.get("room")),
                  icon: "◎",
                },
              ],
            });
          if (kind === "note")
            w.patch({
              notes: [
                { ...base, title, subjectId: sid, content: "" },
                ...w.notes,
              ],
            });
          if (kind === "board")
            w.patch({
              boards: [{ ...base, title, subjectId: sid }, ...w.boards],
            });
          if (kind === "task")
            w.patch({
              tasks: [
                ...w.tasks,
                {
                  ...base,
                  title,
                  subjectId: sid,
                  due: String(data.get("date")),
                  priority: data.get("priority") === "high" ? "high" : "normal",
                  status: "todo",
                },
              ],
            });
          if (kind === "exam")
            w.patch({
              exams: [
                ...w.exams,
                {
                  ...base,
                  title,
                  subjectId: sid,
                  date: String(data.get("date")),
                  topics: String(data.get("details")),
                },
              ],
            });
          if (kind === "flashcard")
            w.patch({
              flashcards: [
                ...w.flashcards,
                {
                  ...base,
                  front: title,
                  back: String(data.get("details")),
                  subjectId: sid,
                  known: false,
                },
              ],
            });
          created(base.id);
          close();
        }}
      >
        <label>
          {kind === "flashcard" ? "Frage" : "Titel"}
          <input
            name="title"
            required
            maxLength={140}
            placeholder={
              kind === "subject"
                ? "z. B. Physik"
                : "Woran möchtest du arbeiten?"
            }
            autoFocus
          />
        </label>
        {kind !== "subject" && (
          <label>
            Fach
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
            >
              <option value="">Inbox · Ohne Fach</option>
              {w.subjects.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </label>
        )}
        {(kind === "task" || kind === "exam") && (
          <label>
            Fällig am
            <input
              type="date"
              name="date"
              required
              defaultValue={localDate()}
            />
          </label>
        )}
        {kind === "task" && (
          <label>
            Priorität
            <select name="priority">
              <option value="normal">Normal</option>
              <option value="high">Hoch</option>
            </select>
          </label>
        )}
        {(kind === "exam" || kind === "flashcard") && (
          <label>
            {kind === "exam" ? "Themen" : "Antwort"}
            <textarea name="details" required rows={4} />
          </label>
        )}
        {kind === "subject" && (
          <>
            <div className="form-row">
              <label>
                Lehrkraft
                <input name="teacher" placeholder="Optional" />
              </label>
              <label>
                Raum
                <input name="room" placeholder="Optional" />
              </label>
            </div>
            <label>
              Fachfarbe
              <input name="color" type="color" defaultValue="#9184d7" />
            </label>
          </>
        )}
        <button className="button primary" type="submit">
          {labels[kind]} erstellen
        </button>
      </form>
    </Modal>
  );
}
