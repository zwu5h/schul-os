"use client";
import { useWorkspace } from "@/lib/store";

export type MaterialKind =
  "notes" | "boards" | "files" | "tasks" | "exams" | "flashcards";

export function SubjectSelect({
  kind,
  id,
}: {
  kind: MaterialKind;
  id: string;
}) {
  const w = useWorkspace();
  const item = w[kind].find((entry) => entry.id === id);
  if (!item) return null;
  return (
    <label className="material-subject">
      <span>Fach</span>
      <select
        aria-label="In anderes Fach verschieben"
        value={item.subjectId ?? ""}
        onChange={(event) => {
          const latest = useWorkspace.getState();
          latest.patch({
            [kind]: latest[kind].map((entry) =>
              entry.id === id
                ? {
                    ...entry,
                    subjectId: event.target.value || null,
                    updatedAt: new Date().toISOString(),
                  }
                : entry,
            ),
          });
        }}
      >
        <option value="">Inbox · Ohne Fach</option>
        {w.subjects.map((subject) => (
          <option key={subject.id} value={subject.id}>
            {subject.name}
          </option>
        ))}
      </select>
    </label>
  );
}
