"use client";

import { create } from "zustand";
import { useWorkspace } from "./store";
import type { Subject } from "@/types/school";

export const useSubjectSync = create<{
  running: boolean;
  lastSync: string | null;
  error: string | null;
  syncNow: () => Promise<void>;
}>(() => ({ running: false, lastSync: null, error: null, syncNow: async () => {} }));

/** Uses the existing School OS session, including when Supabase is absent. */
export function initSubjectSync(): () => void {
  let active = true;
  let running = false;
  let applying = false;
  let pending = false;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const abort = new AbortController();

  const schedule = () => {
    if (timer) clearTimeout(timer);
    timer = setTimeout(() => void sync(), 800);
  };
  const sync = async () => {
    if (!active || !useWorkspace.getState().ready || !navigator.onLine) return;
    if (running) { pending = true; return; }
    running = true;
    pending = false;
    useSubjectSync.setState({ running: true, error: null });
    const snapshot = useWorkspace.getState();
    try {
      const response = await fetch("/api/subjects", {
        method: "POST",
        credentials: "same-origin",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subjects: snapshot.subjects, deletedIds: snapshot.deletedIds }),
        signal: abort.signal,
      });
      if (!response.ok) throw new Error(response.status === 401
        ? "Bitte erneut anmelden, um deine Fächer zu synchronisieren."
        : "Fächer konnten nicht synchronisiert werden. Deine Änderungen bleiben lokal gespeichert.");
      const remote = await response.json() as { subjects: Subject[]; deletedIds: string[] };
      if (!active) return;
      const latest = useWorkspace.getState();
      const deleted = new Set([...latest.deletedIds, ...remote.deletedIds]);
      const subjects = new Map(remote.subjects.map(subject => [subject.id, subject]));
      for (const local of latest.subjects) {
        const other = subjects.get(local.id);
        if (!other || Date.parse(local.updatedAt) > Date.parse(other.updatedAt)) subjects.set(local.id, local);
      }
      for (const id of deleted) subjects.delete(id);
      const merged = [...subjects.values()];
      applying = true;
      if (JSON.stringify(merged) !== JSON.stringify(latest.subjects) || deleted.size !== latest.deletedIds.length) {
        latest.patch({ subjects: merged, deletedIds: [...deleted] });
      }
      applying = false;
      useSubjectSync.setState({ lastSync: new Date().toISOString(), error: null });
    } catch (error) {
      if (active) useSubjectSync.setState({ error: error instanceof Error ? error.message : "Synchronisierung fehlgeschlagen." });
    } finally {
      running = false;
      if (active) {
        useSubjectSync.setState({ running: false });
        if (pending) schedule();
      }
    }
  };
  useSubjectSync.setState({ running: false, lastSync: null, error: null, syncNow: sync });
  const unsubscribe = useWorkspace.subscribe((state, previous) => {
    if (!applying && (state.subjects !== previous.subjects || state.deletedIds !== previous.deletedIds || state.ready !== previous.ready)) schedule();
  });
  const refresh = () => { if (document.visibilityState === "visible") void sync(); };
  window.addEventListener("online", refresh);
  window.addEventListener("focus", refresh);
  document.addEventListener("visibilitychange", refresh);
  const interval = setInterval(refresh, 10_000);
  void sync();
  return () => {
    active = false;
    abort.abort();
    unsubscribe();
    if (timer) clearTimeout(timer);
    clearInterval(interval);
    window.removeEventListener("online", refresh);
    window.removeEventListener("focus", refresh);
    document.removeEventListener("visibilitychange", refresh);
  };
}
