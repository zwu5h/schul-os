import type { Lesson } from "@/types/school";
export interface SchoolIntegration {
  id: string;
  capabilities: ReadonlyArray<"timetable" | "homework" | "exams" | "absences">;
  authenticate(credentials: Record<string, string>): Promise<void>;
  getTimetable(start: Date, end: Date): Promise<Lesson[]>;
  disconnect(): Promise<void>;
}
// Live adapters must declare capabilities. No synthetic fallback for a failed sync.
