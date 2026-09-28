"use client";
import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";
import { emptyWorkspace } from "./demo";
import type { Workspace } from "@/types/school";
type Store = Workspace & {
  ready: boolean;
  storageError: string | null;
  patch: (value: Partial<Workspace>) => void;
  reset: (value: Workspace) => void;
  hydrate: () => void;
};
/** Merkt gelöschte IDs für den Cloud-Abgleich (Tombstones, max. 2000). */
export function trackDelete(...ids: string[]) {
  if (!ids.length) return;
  const current = useWorkspace.getState();
  const known = new Set(current.deletedIds ?? []);
  ids.forEach((id) => known.add(id));
  useWorkspace.setState({ deletedIds: [...known].slice(-2000) });
}
export const useWorkspace = create<Store>()(
  persist(
    (set) => ({
      ...emptyWorkspace(),
      ready: false,
      storageError: null,
      patch: (value) => set(value),
      reset: (value) => set(value),
      hydrate: () => set({ ready: true }),
    }),
    {
      name: "school-os-v1",
      storage: createJSONStorage(() => ({
        getItem: (key) => localStorage.getItem(key),
        setItem: (key, value) => {
          try {
            localStorage.setItem(key, value);
          } catch {
            queueMicrotask(() => {
              if (useWorkspace.getState().storageError) return;
              useWorkspace.setState({
                storageError:
                  "Der Browserspeicher ist voll. Bitte exportiere deine Daten.",
              });
            });
          }
        },
        removeItem: (key) => localStorage.removeItem(key),
      })),
      skipHydration: true,
      partialize: ({ ready, storageError, patch, reset, hydrate, ...data }) => {
        void ready;
        void storageError;
        void patch;
        void reset;
        void hydrate;
        return data;
      },
    },
  ),
);
