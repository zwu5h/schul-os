import type { Note } from "@/types/school";
export function retrieveNotes(
  query: string,
  notes: Note[],
  subjectId: string | null,
  limit = 5,
) {
  const terms = query.toLocaleLowerCase().match(/[\p{L}\p{N}]{3,}/gu) || [];
  return notes
    .filter((n) => !subjectId || n.subjectId === subjectId)
    .flatMap((note) => {
      const text = note.content.replace(/<[^>]*>/g, " ").replace(/\s+/g, " ");
      const chunks = text.match(/.{1,1000}(?:\s|$)/g) || [text];
      return chunks.map((content, index) => ({
        title: note.title,
        content,
        index,
        score: terms.reduce(
          (sum, t) =>
            sum +
            (content.toLocaleLowerCase().includes(t) ? 1 : 0) +
            (note.title.toLocaleLowerCase().includes(t) ? 2 : 0),
          0,
        ),
      }));
    })
    .filter((c) => c.score > 0)
    .sort((a, b) => b.score - a.score)
    .slice(0, limit)
    .map((c) => `Quelle: ${c.title}, Abschnitt ${c.index + 1}\n${c.content}`)
    .join("\n\n");
}
