import { z } from "zod";

/**
 * Geteilte WebUntis-Grundlagen für Route (`/api/webuntis`) und UI.
 * Enthält bewusst nur reine Funktionen: kein I/O, kein Speicherzugriff,
 * damit Route und Client denselben Code nutzen können.
 */

export const WEBUNTIS_TIMEOUT_MS = 20000;
export const SCHOOL_SEARCH_TIMEOUT_MS = 12000;
export const SCHOOL_SEARCH_URL =
  "https://schoolsearch.webuntis.com/schoolquery2";
export const MAX_BODY_BYTES = 8000;

/** Servereingabe robust auf einen Hostnamen zurückführen.
 * Akzeptiert auch eingefügte URLs wie "https://mese.webuntis.com/WebUntis/".
 */
export function normalizeServer(raw: string): string | null {
  let value = raw.trim().toLowerCase();
  if (!value) return null;
  value = value.replace(/^[a-z][a-z0-9+.-]*:\/\//, "");
  const host = value.split("/")[0].split("?")[0].split("#")[0].trim();
  if (!host || host.length > 80) return null;
  if (/^(localhost|127\.0\.0\.1|\[::1\])/.test(host)) return host;
  if (
    !/^[a-z0-9]([a-z0-9.-]*[a-z0-9])?(:\d{1,5})?$/.test(host) ||
    !host.includes(".")
  )
    return null;
  return host;
}

/** Schuleingabe auf das WebUntis-Schulkürzel zurückführen.
 * Akzeptiert auch eine kopierte WebUntis-Adresse mit "?school=Kürzel".
 * Der lesbare Schulname ("BRG Musterstadt") ist KEIN gültiges Kürzel.
 */
export function normalizeSchool(raw: string): string | null {
  const value = raw.trim();
  if (!value) return null;
  const fromUrl = value.match(/[?&]school=([^&#\s]+)/i)?.[1];
  const candidate = (fromUrl ?? value).trim();
  if (!candidate || candidate.length > 80) return null;
  if (/[\s/\\?#]/.test(candidate)) return null;
  return decodeURIComponent(candidate);
}

export function normalizeUsername(raw: string): string | null {
  const value = raw.trim();
  if (!value || value.length > 80) return null;
  return value;
}

const schoolSuggestion = z.object({
  server: z.string().min(1).max(80),
  loginName: z.string().min(1).max(80),
  displayName: z.string().min(1).max(160),
  address: z.string().max(200).default(""),
});

export type SchoolSuggestion = z.infer<typeof schoolSuggestion>;

/** Voreingestellte Schule: BG/BRG Neusiedl/See.
 * Gegen das öffentliche WebUntis-Verzeichnis geprüft (schoolId 7003300):
 * Server + Schulkürzel stehen damit ohne Suche bereit, nur die
 * persönlichen Zugangsdaten müssen noch eingetragen werden.
 */
export const DEFAULT_SCHOOL_SUGGESTION: SchoolSuggestion = {
  server: "gymnasium-neusiedl.webuntis.com",
  loginName: "gymnasium-neusiedl",
  displayName: "BG/BRG Neusiedl/See",
  address: "7100, Neusiedl am See, Bundesschulstraße 3",
};

const schoolSearchResponse = z.object({
  result: z
    .object({ schools: z.array(z.unknown()).default([]) })
    .nullish(),
  error: z.object({ code: z.number(), message: z.string() }).nullish(),
});

/** Antwort der Schulsuche auf maximal 20 gültige Vorschläge abbilden. */
export function mapSchoolSearchResponse(data: unknown): SchoolSuggestion[] {
  const parsed = schoolSearchResponse.safeParse(data);
  if (!parsed.success || !parsed.data.result) return [];
  const out: SchoolSuggestion[] = [];
  for (const entry of parsed.data.result.schools) {
    const school = schoolSuggestion.safeParse(entry);
    if (!school.success) continue;
    const server = normalizeServer(school.data.server);
    if (!server) continue;
    out.push({ ...school.data, server });
    if (out.length >= 20) break;
  }
  return out;
}

/** Schulsuche gegen das öffentliche WebUntis-Verzeichnis (ohne Login). */
export async function searchSchools(
  query: string,
  signal: AbortSignal,
): Promise<{ schools: SchoolSuggestion[]; tooMany: boolean }> {
  const response = await fetch(SCHOOL_SEARCH_URL, {
    method: "POST",
    signal,
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      id: "school-os",
      method: "searchSchool",
      params: [{ search: query }],
      jsonrpc: "2.0",
    }),
  });
  if (!response.ok) throw new Error(`Schulsuche antwortet mit ${response.status}.`);
  const data: unknown = await response.json();
  const parsed = schoolSearchResponse.safeParse(data);
  if (!parsed.success) throw new Error("Schulsuche lieferte ungültige Daten.");
  if (parsed.data.error?.code === -6003) return { schools: [], tooMany: true };
  if (parsed.data.error)
    throw new Error("Die Schulsuche ist fehlgeschlagen.");
  return { schools: mapSchoolSearchResponse(data), tooMany: false };
}

export interface WebUntisFailure {
  status: number;
  error: string;
}

/** Axios-/Netzwerk-/Login-Fehler auf Status + nutzbare Meldung abbilden.
 * Zugangsdaten oder Hosts werden nie in Meldungen zurückgegeben.
 */
export function classifyTimetableError(error: unknown): WebUntisFailure {
  const message = error instanceof Error ? error.message : "";
  if (/bad credentials|failed to login|login returned error|unauthor|forbidden/i.test(message))
    return {
      status: 401,
      error:
        "Schule, Benutzer oder Passwort wurde nicht akzeptiert. Tipp: Schulkürzel über die Suche oben übernehmen und prüfen, ob deine Schule den Zugang freigeschaltet hat.",
    };
  if (/enotfound|eai_again|econnrefused|getaddrinfo|network|fetch failed/i.test(message))
    return {
      status: 502,
      error:
        "Der Server wurde nicht gefunden. Bitte die Serveradresse aus der Schulsuche übernehmen.",
    };
  if (/timeout|zeitüberschreitung|aborted|abort/i.test(message))
    return {
      status: 504,
      error:
        "WebUntis antwortet nicht. Bitte später erneut versuchen.",
    };
  return {
    status: 502,
    error:
      "WebUntis ist nicht erreichbar. Server prüfen und erneut versuchen.",
  };
}

/** Promise mit Zeitlimit; die späte Erfüllung wird still geschluckt,
 * damit keine unbehandelten Rejections zurückbleiben.
 */
export function withTimeout<T>(promise: Promise<T>, ms: number): Promise<T> {
  let timer: ReturnType<typeof setTimeout>;
  const timeout = new Promise<never>((_, reject) => {
    timer = setTimeout(() => reject(new Error("Zeitüberschreitung.")), ms);
  });
  promise.then(
    () => clearTimeout(timer),
    () => clearTimeout(timer),
  );
  return Promise.race([promise, timeout]);
}
