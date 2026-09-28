export interface Entity {
  id: string;
  createdAt: string;
  updatedAt: string;
}
export interface Subject extends Entity {
  name: string;
  color: string;
  icon: string;
  teacher: string;
  room: string;
}
export interface Note extends Entity {
  title: string;
  subjectId: string | null;
  content: string;
}
export interface Board extends Entity {
  title: string;
  subjectId: string | null;
}
export interface Task extends Entity {
  title: string;
  subjectId: string | null;
  due: string;
  priority: "normal" | "high";
  status: "todo" | "progress" | "done";
}
export interface Exam extends Entity {
  title: string;
  subjectId: string | null;
  date: string;
  topics: string;
}
export interface Lesson {
  id: string;
  subjectId: string;
  start: string;
  end: string;
  room: string;
  teacher: string;
  status: "regular" | "cancelled" | "changed";
  source: "demo" | "manual" | "webuntis";
}
export interface SchoolFile extends Entity {
  name: string;
  subjectId: string | null;
  type: string;
  size: number;
  text?: string;
}
export interface Message extends Entity {
  role: "user" | "assistant";
  content: string;
}
export interface Flashcard extends Entity {
  front: string;
  back: string;
  subjectId: string | null;
  known: boolean;
}
export interface Profile {
  name: string;
  school: string;
  grade: string;
}
export interface Workspace {
  subjects: Subject[];
  notes: Note[];
  boards: Board[];
  tasks: Task[];
  exams: Exam[];
  lessons: Lesson[];
  files: SchoolFile[];
  messages: Message[];
  flashcards: Flashcard[];
  profile: Profile;
  demo: boolean;
  theme: "light" | "dark";
  onboarded: boolean;
  /** IDs gelöschter Objekte für den Cloud-Abgleich (Tombstones). */
  deletedIds: string[];
}
export type View =
  | "today"
  | "tasks"
  | "calendar"
  | "notes"
  | "canvas"
  | "files"
  | "ai"
  | "subjects"
  | "settings"
  | "webuntis"
  | "learn";
export const entity = (): Entity => ({
  id: crypto.randomUUID(),
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
});
export function localDate(date = new Date()) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}
