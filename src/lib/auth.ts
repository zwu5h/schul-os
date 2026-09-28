"use client";
import { create } from "zustand";
import type { User } from "@supabase/supabase-js";
import { getSupabase, isCloudEnabled } from "./supabase";
import { fullSync } from "./sync";

interface AuthState {
  user: User | null;
  ready: boolean;
  busy: boolean;
  error: string | null;
  notice: string | null;
  init: () => void;
  signUp: (email: string, password: string) => Promise<void>;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
}

let started = false;

function friendly(message: string): string {
  if (/invalid login credentials/i.test(message))
    return "E-Mail oder Passwort ist falsch.";
  if (/user already registered|already been registered/i.test(message))
    return "Dieses Konto existiert bereits. Bitte anmelden.";
  if (/password/i.test(message) && /weak|short|length/i.test(message))
    return "Das Passwort ist zu kurz (mindestens 6 Zeichen).";
  if (/email.*confirm/i.test(message))
    return "Bitte zuerst die E-Mail-Adresse bestätigen.";
  return message;
}

export const useAuth = create<AuthState>()((set) => ({
  user: null,
  ready: false,
  busy: false,
  error: null,
  notice: null,
  init: () => {
    if (started) return;
    started = true;
    const sb = getSupabase();
    if (!sb) {
      set({ ready: true });
      return;
    }
    void sb.auth.getSession().then(({ data }) => {
      set({ user: data.session?.user ?? null, ready: true });
      if (data.session?.user) void fullSync();
    });
    sb.auth.onAuthStateChange((event, session) => {
      set({ user: session?.user ?? null, ready: true });
      if (event === "SIGNED_IN" && session?.user) void fullSync();
    });
  },
  signUp: async (email, password) => {
    const sb = getSupabase();
    if (!sb) {
      set({ error: "Cloud-Backend ist nicht konfiguriert." });
      return;
    }
    set({ busy: true, error: null, notice: null });
    const { data, error } = await sb.auth.signUp({ email, password });
    if (error) {
      set({ busy: false, error: friendly(error.message) });
      return;
    }
    if (data.session?.user) {
      set({ user: data.session.user, busy: false });
      void fullSync();
    } else {
      set({
        busy: false,
        notice:
          "Konto angelegt. Falls eine Bestätigungs-Mail kam, bitte bestätigen und dann anmelden.",
      });
    }
  },
  signIn: async (email, password) => {
    const sb = getSupabase();
    if (!sb) {
      set({ error: "Cloud-Backend ist nicht konfiguriert." });
      return;
    }
    set({ busy: true, error: null, notice: null });
    const { data, error } = await sb.auth.signInWithPassword({
      email,
      password,
    });
    if (error) {
      set({ user: null, busy: false, error: friendly(error.message) });
      return;
    }
    set({ user: data.session?.user ?? null, busy: false });
    if (data.session?.user) void fullSync();
  },
  signOut: async () => {
    const sb = getSupabase();
    if (sb) await sb.auth.signOut();
    set({ user: null, error: null, notice: null });
  },
}));

export { isCloudEnabled };
