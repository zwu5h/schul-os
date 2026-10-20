import nextEnv from "@next/env";
import { createClient } from "@supabase/supabase-js";

nextEnv.loadEnvConfig(process.cwd());

async function check() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) {
    throw new Error("Supabase fehlt: NEXT_PUBLIC_SUPABASE_URL und NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY in .env.local eintragen (siehe docs/SUPABASE.md).");
  }
  const parsed = new URL(url);
  if (!["http:", "https:"].includes(parsed.protocol)) {
    throw new Error("Die Supabase-URL muss http:// oder https:// verwenden.");
  }
  if (key.startsWith("sb_secret_")) {
    throw new Error("Secret-Key erkannt. Nur einen öffentlichen Publishable-/Anon-Key verwenden.");
  }
  if (!key.startsWith("sb_publishable_")) {
    let role;
    try {
      role = JSON.parse(Buffer.from(key.split(".")[1], "base64url").toString()).role;
    } catch {
      throw new Error("Ungültiger öffentlicher Supabase-Key.");
    }
    if (role !== "anon") throw new Error("Nur Publishable-/Anon-Keys sind erlaubt.");
  }

  const response = await fetch(new URL("auth/v1/settings", `${url.replace(/\/$/, "")}/`), {
    headers: { apikey: key },
    signal: AbortSignal.timeout(15000),
  });
  if (!response.ok) throw new Error(`Supabase Auth nicht erreichbar (HTTP ${response.status}). Projekt-URL und Key prüfen.`);
  const settings = await response.json();
  if (!settings.external?.email) throw new Error("E-Mail-Anmeldung ist in Supabase deaktiviert.");
  console.log("OK: Supabase erreichbar; E-Mail-Anmeldung aktiviert.");

  const sb = createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
    global: { fetch: (input, init) => fetch(input, { ...init, signal: AbortSignal.timeout(15000) }) },
  });
  const tables = ["profiles", "subjects", "notes", "canvases", "files", "tasks", "exams", "lessons", "ai_chats", "ai_messages", "flashcards"];
  for (const table of tables) {
    const { data, error } = await sb.from(table).select("id").limit(1);
    if (error) throw new Error(`Tabelle ${table} nicht erreichbar (${error.code}). Migration und API-Berechtigungen prüfen.`);
    if (data?.length) throw new Error(`Tabelle ${table} gibt ohne Anmeldung Daten frei. RLS prüfen.`);
  }
  console.log("OK: Alle 11 Tabellen erreichbar; ohne Anmeldung keine Zeilen sichtbar.");
  console.log("Noch separat prüfen: Anmeldung, Zugriffstrennung mit zwei Benutzern und Datei-/Whiteboard-Sync (docs/SUPABASE.md).");
}

check().catch((error) => {
  console.error(error instanceof Error ? error.message : "Supabase-Prüfung fehlgeschlagen.");
  process.exitCode = 1;
});
