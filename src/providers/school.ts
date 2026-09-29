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

export interface WebUntisPeriod {
  date: number;
  startTime: number;
  endTime: number;
  su: Array<{ name?: string; longname?: string }>;
  te: Array<{ name?: string; longname?: string }>;
  ro: Array<{ name?: string; longname?: string }>;
  code?: "cancelled" | "irregular" | string;
}

const webUntisName = z.object({
  name: z.string().optional(),
  longname: z.string().optional(),
});
const webUntisPeriod = z.object({
  date: z.number().int().min(10000101).max(99991231),
  startTime: z.number().int().min(0).max(2359),
  endTime: z.number().int().min(0).max(2359),
  su: z.array(webUntisName).default([]),
  te: z.array(webUntisName).default([]),
  ro: z.array(webUntisName).default([]),
  code: z.string().optional(),
});

/** Einträge chronologisch ordnen: WebUntis liefert keine garantierte
 * Reihenfolge, die Anzeige erwartet aber aufsteigende Startzeiten.
 */
export function sortTimetableEntries(
  entries: TimetableEntry[],
): TimetableEntry[] {
  return [...entries].sort(
    (a, b) => a.start.localeCompare(b.start) || a.end.localeCompare(b.end),
  );
}

export type TimetableGapKind = "pause" | "big-break" | "free";

export interface TimetableGap {
  minutes: number;
  kind: TimetableGapKind;
}

/** Lücke zwischen zwei Stunden bestimmen: Minuten zwischen dem Ende der
 * vorherigen und dem Beginn der nächsten Stunde. Gibt `null` zurück, wenn
 * es keine Lücke gibt (direkter Übergang oder Überlappung).
 * Bis 10 Minuten gilt als kurze Pause, bis 25 als große Pause, darüber als
 * Freistunde.
 */
export function gapBetweenLessons(
  prevEnd: string,
  nextStart: string,
): TimetableGap | null {
  const toMs = (value: string) => {
    const normalized = value.length === 16 ? `${value}:00` : value;
    return new Date(normalized).getTime();
  };
  const prev = toMs(prevEnd);
  const next = toMs(nextStart);
  if (Number.isNaN(prev) || Number.isNaN(next)) return null;
  const minutes = Math.round((next - prev) / 60000);
  if (minutes <= 0) return null;
  if (minutes <= 10) return { minutes, kind: "pause" };
  if (minutes <= 25) return { minutes, kind: "big-break" };
  return { minutes, kind: "free" };
}

/** Beschriftung für eine Lücke zwischen zwei Stunden. */
export function gapLabel(gap: TimetableGap): string {
  switch (gap.kind) {
    case "pause":
      return `Pause · ${gap.minutes} Min`;
    case "big-break":
      return `Große Pause · ${gap.minutes} Min`;
    case "free":
      return `Freistunde · ${gap.minutes} Min`;
  }
}

/** WebUntis-Perioden (Datum JJJJMMTT, Zeit HHMM) ins Import-Format bringen.
 * Ungültige Einträge werden übersprungen statt den ganzen Abruf zu
 * verwerfen; kein gültiges Datum, keine gültige Zeit, kein Fach.
 */
export function normalizeWebUntisLessons(periods: unknown): TimetableEntry[] {
  if (!Array.isArray(periods)) return [];
  const pick = (list: Array<{ name?: string; longname?: string }>) =>
    (list[0]?.longname || list[0]?.name || "").trim();
  const pad = (n: number, len: number) => String(n).padStart(len, "0");
  const out: TimetableEntry[] = [];
  for (const raw of periods.slice(0, 1000)) {
    const parsed = webUntisPeriod.safeParse(raw);
    if (!parsed.success) continue;
    const p = parsed.data;
    const day = pad(p.date, 8);
    const from = `${day.slice(0, 4)}-${day.slice(4, 6)}-${day.slice(6, 8)}`;
    const time = (t: number) => {
      const s = pad(t, 4);
      return `${s.slice(0, 2)}:${s.slice(2, 4)}`;
    };
    const subject = pick(p.su);
    const start = `${from}T${time(p.startTime)}`;
    const end = `${from}T${time(p.endTime)}`;
    if (!subject || end <= start) continue;
    out.push({
      subject: subject.slice(0, 140),
      start,
      end,
      room: pick(p.ro).slice(0, 40),
      teacher: pick(p.te).slice(0, 80),
      status:
        p.code === "cancelled"
          ? "cancelled"
          : p.code === "irregular"
            ? "changed"
            : "regular",
    });
  }
  return sortTimetableEntries(out);
}

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
  return { ok: true, entries: sortTimetableEntries(parsed.data.lessons) };
}
