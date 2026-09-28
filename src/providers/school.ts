import { z } from "zod";
import type { Lesson } from "@/types/school";
export interface SchoolIntegration {
  id: string;
  capabilities: ReadonlyArray<"timetable" | "homework" | "exams" | "absences">;
  authenticate(credentials: Record<string, string>): Promise<void>;
  getTimetable(start: Date, end: Date): Promise<Lesson[]>;
  disconnect(): Promise<void>;
}
// Live adapters must declare capabilities. No synthetic fallback for a failed sync.

const timeSlot = z
  .string()
  .regex(
    /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/,
    "Format JJJJ-MM-TTTHH:mm erwartet, z. B. 2026-09-29T08:00",
  );
const timetableEntry = z.object({
  subject: z.string().trim().min(1).max(140),
  start: timeSlot,
  end: timeSlot,
  room: z.string().max(40).default(""),
  teacher: z.string().max(80).default(""),
  status: z.enum(["regular", "cancelled", "changed"]).default("regular"),
});
export type TimetableEntry = z.infer<typeof timetableEntry>;
const timetableFile = z.object({
  lessons: z.array(timetableEntry).min(1).max(500),
});
export type TimetableParse =
  | { ok: true; entries: TimetableEntry[] }
  | { ok: false; errors: string[] };

export function parseTimetableJson(text: string): TimetableParse {
  let data: unknown;
  try {
    data = JSON.parse(text);
  } catch {
    return { ok: false, errors: ["Der Text ist kein gültiges JSON."] };
  }
  const parsed = timetableFile.safeParse(data);
  if (!parsed.success) {
    const errors = parsed.error.issues.slice(0, 5).map((issue) => {
      const at = issue.path.find((p) => typeof p === "number");
      const where =
        typeof at === "number" ? `Stunde ${at + 1}: ` : "Datei: ";
      return `${where}${issue.message}`;
    });
    return { ok: false, errors };
  }
  const orderErrors = parsed.data.lessons
    .map((l, i) => ({ l, i }))
    .filter(({ l }) => l.end <= l.start)
    .slice(0, 5)
    .map(({ i }) => `Stunde ${i + 1}: Ende muss nach Beginn liegen.`);
  if (orderErrors.length) return { ok: false, errors: orderErrors };
  return { ok: true, entries: parsed.data.lessons };
}
