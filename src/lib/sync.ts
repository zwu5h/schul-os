"use client";
import { create } from "zustand";
import { get as idbGet, set as idbSet } from "idb-keyval";
import { getSupabase, isCloudEnabled } from "./supabase";
import { useWorkspace } from "./store";
import { useAuth } from "./auth";
import type {
  Board,
  Exam,
  Flashcard,
  Lesson,
  Message,
  Note,
  SchoolFile,
  Subject,
  Task,
  Workspace,
} from "@/types/school";

interface SyncState {
  running: boolean;
  lastSync: string | null;
  error: string | null;
  syncNow: () => Promise<void>;
}

const nowIso = () => new Date().toISOString();
const stamp = (updatedAt: string) => Date.parse(updatedAt) || 0;
/** Lokale Wandzeit (JJJJ-MM-TTTHH:mm) für timestamptz verpacken. */
const toDbTime = (local: string) => `${local}:00`;
const fromDbTime = (db: string) => db.slice(0, 16);

function knownSubjects(state: Workspace): Set<string> {
  return new Set(state.subjects.map((s) => s.id));
}

function subjectOrNull(
  known: Set<string>,
  subjectId: string | null,
): string | null {
  return subjectId && known.has(subjectId) ? subjectId : null;
}

async function pushAll(userId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Backend ist nicht konfiguriert.");
  const state = useWorkspace.getState();
  const tombstones = state.deletedIds ?? [];

  if (tombstones.length) {
    const tables = [
      "subjects",
      "notes",
      "canvases",
      "files",
      "tasks",
      "exams",
      "lessons",
      "flashcards",
      "ai_messages",
    ] as const;
    for (const table of tables) {
      const { error } = await sb
        .from(table)
        .delete()
        .eq("user_id", userId)
        .in("id", tombstones);
      if (error) throw new Error(`Löschen fehlgeschlagen (${table}).`);
    }
    useWorkspace.setState({ deletedIds: [] });
  }

  const updated = nowIso();
  const known = knownSubjects(state);

  if (state.subjects.length) {
    const { error } = await sb.from("subjects").upsert(
      state.subjects.map((s: Subject) => ({
        id: s.id,
        user_id: userId,
        name: s.name,
        color: s.color,
        icon: s.icon,
        teacher: s.teacher,
        room: s.room,
        created_at: s.createdAt,
        updated_at: updated,
      })),
    );
    if (error) throw new Error("Fächer konnten nicht gespeichert werden.");
  }

  if (state.notes.length) {
    const { error } = await sb.from("notes").upsert(
      state.notes.map((n: Note) => ({
        id: n.id,
        user_id: userId,
        subject_id: subjectOrNull(known, n.subjectId),
        title: n.title,
        content: JSON.stringify(n.content),
        created_at: n.createdAt,
        updated_at: updated,
      })),
    );
    if (error) throw new Error("Notizen konnten nicht gespeichert werden.");
  }

  if (state.boards.length) {
    for (const b of state.boards) {
      const scene = await idbGet(`board:${b.id}`).catch(() => undefined);
      let snapshot: string | null = null;
      if (scene) {
        snapshot = `${userId}/canvases/${b.id}.excalidraw.json`;
        const { error } = await sb.storage
          .from("school-files")
          .upload(snapshot, JSON.stringify(scene), {
            contentType: "application/json",
            upsert: true,
          });
        if (error) throw new Error("Whiteboard-Szenen Upload fehlgeschlagen.");
      }
      const { error } = await sb.from("canvases").upsert({
        id: b.id,
        user_id: userId,
        subject_id: subjectOrNull(known, b.subjectId),
        title: b.title,
        snapshot_path: snapshot,
        revision: stamp(b.updatedAt),
        created_at: b.createdAt,
        updated_at: updated,
      });
      if (error)
        throw new Error("Whiteboards konnten nicht gespeichert werden.");
    }
  }

  if (state.files.length) {
    for (const f of state.files) {
      const safeName = f.name.replace(/[^\w.\-]+/g, "_").slice(0, 80);
      let storagePath = "";
      const blob = (await idbGet(`file:${f.id}`).catch(
        () => undefined,
      )) as Blob | undefined;
      if (blob) {
        storagePath = `${userId}/files/${f.id}-${safeName || "datei"}`;
        const { error } = await sb.storage
          .from("school-files")
          .upload(storagePath, blob, {
            contentType: f.type || "application/octet-stream",
            upsert: true,
          });
        if (error) throw new Error("Datei-Upload fehlgeschlagen.");
      }
      const { error } = await sb.from("files").upsert({
        id: f.id,
        user_id: userId,
        subject_id: subjectOrNull(known, f.subjectId),
        name: f.name,
        mime_type: f.type,
        storage_path: storagePath,
        size_bytes: f.size,
        extracted_text: f.text ?? null,
        created_at: f.createdAt,
        updated_at: updated,
      });
      if (error) throw new Error("Dateien konnten nicht gespeichert werden.");
    }
  }

  if (state.tasks.length) {
    const { error } = await sb.from("tasks").upsert(
      state.tasks.map((t: Task) => ({
        id: t.id,
        user_id: userId,
        subject_id: subjectOrNull(known, t.subjectId),
        title: t.title,
        description: "",
        due_date: t.due || null,
        priority: t.priority,
        status: t.status,
        created_at: t.createdAt,
        updated_at: updated,
      })),
    );
    if (error) throw new Error("Aufgaben konnten nicht gespeichert werden.");
  }

  if (state.exams.length) {
    const { error } = await sb.from("exams").upsert(
      state.exams.map((e: Exam) => ({
        id: e.id,
        user_id: userId,
        subject_id: subjectOrNull(known, e.subjectId),
        title: e.title,
        exam_date: e.date,
        topics: e.topics,
        created_at: e.createdAt,
        updated_at: updated,
      })),
    );
    if (error) throw new Error("Prüfungen konnten nicht gespeichert werden.");
  }

  if (state.lessons.length) {
    const { error } = await sb.from("lessons").upsert(
      state.lessons.map((l: Lesson) => ({
        id: l.id,
        user_id: userId,
        subject_id: subjectOrNull(known, l.subjectId),
        starts_at: toDbTime(l.start),
        ends_at: toDbTime(l.end),
        room: l.room,
        teacher: l.teacher,
        status: l.status,
        source: l.source === "demo" ? "manual" : l.source,
        created_at: nowIso(),
        updated_at: updated,
      })),
    );
    if (error) throw new Error("Stunden konnten nicht gespeichert werden.");
  }

  if (state.flashcards.length) {
    const { error } = await sb.from("flashcards").upsert(
      state.flashcards.map((c: Flashcard) => ({
        id: c.id,
        user_id: userId,
        subject_id: subjectOrNull(known, c.subjectId),
        front: c.front,
        back: c.back,
        known: c.known,
        created_at: c.createdAt,
        updated_at: updated,
      })),
    );
    if (error)
      throw new Error("Lernkarten konnten nicht gespeichert werden.");
  }

  const { error: profileError } = await sb.from("profiles").upsert({
    id: userId,
    display_name: state.profile.name,
    school: state.profile.school,
    grade: state.profile.grade,
  });
  if (profileError) throw new Error("Profil konnte nicht gespeichert werden.");

  let chatId: string | null = null;
  if (state.messages.length) {
    const { data: chats, error: chatError } = await sb
      .from("ai_chats")
      .select("id")
      .eq("user_id", userId)
      .eq("title", "Workspace-Chat")
      .limit(1);
    if (chatError) throw new Error("Chat konnte nicht gespeichert werden.");
    if (chats?.length) {
      chatId = chats[0].id as string;
    } else {
      const { data: created, error: createError } = await sb
        .from("ai_chats")
        .insert({ user_id: userId, title: "Workspace-Chat" })
        .select("id")
        .single();
      if (createError || !created)
        throw new Error("Chat konnte nicht gespeichert werden.");
      chatId = created.id as string;
    }
    const { error: msgError } = await sb.from("ai_messages").upsert(
      state.messages.map((m: Message) => ({
        id: m.id,
        user_id: userId,
        chat_id: chatId,
        role: m.role,
        content: m.content,
        created_at: m.createdAt,
        updated_at: updated,
      })),
    );
    if (msgError)
      throw new Error("Chatverlauf konnte nicht gespeichert werden.");
  }
}

async function pullAll(userId: string): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Backend ist nicht konfiguriert.");
  const db = sb;
  const state = useWorkspace.getState();

  async function table<T>(name: string): Promise<T[]> {
    const { data, error } = await db
      .from(name)
      .select("*")
      .eq("user_id", userId);
    if (error) throw new Error(`Abruf fehlgeschlagen (${name}).`);
    return (data ?? []) as T[];
  }

  interface Row {
    id: string;
    created_at: string;
    updated_at: string;
    [key: string]: unknown;
  }
  const merge = <L extends { id: string; updatedAt: string }>(
    local: L[],
    remote: Row[],
    map: (r: Row) => L,
  ): L[] => {
    const byId = new Map(local.map((l) => [l.id, l]));
    for (const r of remote) {
      const current = byId.get(r.id);
      if (!current || stamp(String(r.updated_at)) > stamp(current.updatedAt)) {
        byId.set(r.id, map(r));
      }
    }
    return [...byId.values()];
  };

  const [subjects, notes, canvases, files, tasks, exams, lessons, flashcards] =
    await Promise.all([
      table<Row>("subjects"),
      table<Row>("notes"),
      table<Row>("canvases"),
      table<Row>("files"),
      table<Row>("tasks"),
      table<Row>("exams"),
      table<Row>("lessons"),
      table<Row>("flashcards"),
    ]);

  const str = (v: unknown, fallback = "") =>
    typeof v === "string" ? v : fallback;
  const mergedSubjects = merge(state.subjects, subjects, (r) => ({
    id: r.id,
    name: str(r.name),
    color: str(r.color, "#9184d7"),
    icon: str(r.icon, "◎"),
    teacher: str(r.teacher),
    room: str(r.room),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  }));
  const subjectIds = new Set(mergedSubjects.map((s) => s.id));
  const safeSubject = (v: unknown) =>
    typeof v === "string" && subjectIds.has(v) ? v : null;

  const mergedNotes = merge(state.notes, notes, (r) => {
    const raw = r.content;
    const content =
      typeof raw === "string"
        ? raw
        : raw && typeof raw === "object" && "html" in raw
          ? String((raw as { html: unknown }).html)
          : JSON.stringify(raw ?? "");
    return {
      id: r.id,
      title: str(r.title),
      subjectId: safeSubject(r.subject_id),
      content,
      createdAt: str(r.created_at),
      updatedAt: str(r.updated_at),
    };
  });

  const mergedBoards: Board[] = merge(state.boards, canvases, (r) => ({
    id: r.id,
    title: str(r.title),
    subjectId: safeSubject(r.subject_id),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  }));
  for (const r of canvases) {
    if (typeof r.snapshot_path === "string" && r.snapshot_path) {
      const { data, error } = await sb.storage
        .from("school-files")
        .download(r.snapshot_path);
      if (!error && data) {
        try {
          await idbSet(`board:${r.id}`, JSON.parse(await data.text()));
        } catch {
          /* Szene bleibt lokal unverändert */
        }
      }
    }
  }

  const mergedFiles: SchoolFile[] = merge(state.files, files, (r) => ({
    id: r.id,
    name: str(r.name),
    type: str(r.mime_type),
    size: typeof r.size_bytes === "number" ? r.size_bytes : 0,
    subjectId: safeSubject(r.subject_id),
    text:
      typeof r.extracted_text === "string"
        ? r.extracted_text
        : undefined,
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  }));
  for (const r of files) {
    if (typeof r.storage_path === "string" && r.storage_path) {
      const { data, error } = await sb.storage
        .from("school-files")
        .download(r.storage_path);
      if (!error && data) await idbSet(`file:${r.id}`, data).catch(() => {});
    }
  }

  const mergedTasks: Task[] = merge(state.tasks, tasks, (r) => ({
    id: r.id,
    title: str(r.title),
    subjectId: safeSubject(r.subject_id),
    due: str(r.due_date),
    priority: r.priority === "high" ? "high" : "normal",
    status:
      r.status === "progress" || r.status === "done" ? r.status : "todo",
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  }));

  const mergedExams: Exam[] = merge(state.exams, exams, (r) => ({
    id: r.id,
    title: str(r.title),
    subjectId: safeSubject(r.subject_id),
    date: str(r.exam_date),
    topics: str(r.topics),
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  }));

  // Lessons tragen keine Zeitstempel: Bekannte IDs bleiben lokal maßgeblich,
  // unbekannte IDs (anderes Gerät) werden übernommen.
  const lessonIds = new Set(state.lessons.map((l) => l.id));
  const mergedLessons: Lesson[] = [
    ...state.lessons,
    ...lessons
      .filter((r) => !lessonIds.has(r.id))
      .map((r) => ({
        id: r.id,
        subjectId: safeSubject(r.subject_id) ?? "",
        start: fromDbTime(str(r.starts_at)),
        end: fromDbTime(str(r.ends_at)),
        room: str(r.room),
        teacher: str(r.teacher),
        status: (
          r.status === "cancelled" || r.status === "changed"
            ? r.status
            : "regular"
        ) as Lesson["status"],
        source: (r.source === "webuntis" ? "webuntis" : "manual") as Lesson["source"],
      })),
  ];

  const mergedCards: Flashcard[] = merge(state.flashcards, flashcards, (r) => ({
    id: r.id,
    front: str(r.front),
    back: str(r.back),
    subjectId: safeSubject(r.subject_id),
    known: r.known === true,
    createdAt: str(r.created_at),
    updatedAt: str(r.updated_at),
  }));

  const remoteMessages = await table<Row>("ai_messages");
  const mergedMessages: Message[] = merge(
    state.messages,
    remoteMessages,
    (r): Message => ({
      id: r.id,
      role: r.role === "assistant" ? "assistant" : "user",
      content: str(r.content),
      createdAt: str(r.created_at),
      updatedAt: str(r.updated_at),
    }),
  ).sort((a, b) => (a.createdAt < b.createdAt ? -1 : 1));

  const localProfileEmpty =
    !state.profile.name && !state.profile.school && !state.profile.grade;
  let profile = state.profile;
  if (localProfileEmpty) {
    const { data } = await sb
      .from("profiles")
      .select("display_name,school,grade")
      .eq("id", userId)
      .maybeSingle();
    if (data) {
      profile = {
        name: str(data.display_name),
        school: str(data.school),
        grade: str(data.grade),
      };
    }
  }

  useWorkspace.getState().patch({
    subjects: mergedSubjects,
    notes: mergedNotes,
    boards: mergedBoards,
    files: mergedFiles,
    tasks: mergedTasks,
    exams: mergedExams,
    lessons: mergedLessons,
    flashcards: mergedCards,
    messages: mergedMessages,
    profile,
  });
}

export async function fullSync(): Promise<void> {
  const sb = getSupabase();
  if (!sb) throw new Error("Cloud-Backend ist nicht konfiguriert.");
  const {
    data: { user },
  } = await sb.auth.getUser();
  if (!user) throw new Error("Nicht angemeldet.");
  await pushAll(user.id);
  await pullAll(user.id);
}

let autoTimer: ReturnType<typeof setTimeout> | null = null;
let autoRunning = false;

export function initAutoSync(): void {
  if (!isCloudEnabled()) return;
  useWorkspace.subscribe(() => {
    if (autoRunning || !useAuth.getState().user) return;
    if (autoTimer) clearTimeout(autoTimer);
    autoTimer = setTimeout(() => {
      const sb = getSupabase();
      const user = useAuth.getState().user;
      if (!sb || !user) return;
      autoRunning = true;
      void sb.auth
        .getUser()
        .then(({ data }) => (data.user ? pushAll(data.user.id) : null))
        .catch(() => {})
        .finally(() => {
          autoRunning = false;
        });
    }, 5000);
  });
}

export const useSync = create<SyncState>()((set) => ({
  running: false,
  lastSync: null,
  error: null,
  syncNow: async () => {
    set({ running: true, error: null });
    try {
      await fullSync();
      set({ running: false, lastSync: new Date().toISOString() });
    } catch (e) {
      set({
        running: false,
        error: e instanceof Error ? e.message : "Synchronisierung fehlgeschlagen.",
      });
    }
  },
}));
