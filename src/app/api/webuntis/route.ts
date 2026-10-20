import { fetchWebUntisTimetable } from "@/lib/webuntis-client";
import { auth } from "@/lib/server-auth";
import { z } from "zod";
import {
  MAX_BODY_BYTES,
  SCHOOL_SEARCH_TIMEOUT_MS,
  classifyTimetableError,
  normalizeSchool,
  normalizeServer,
  isWebUntisServer,
  normalizeUsername,
  searchSchools,
} from "@/lib/webuntis";

export const runtime = "nodejs";

const timetableInput = z.object({
  server: z.string().min(1).max(200),
  school: z.string().min(1).max(200),
  username: z.string().min(1).max(80),
  password: z.string().min(1).max(200),
  days: z.number().int().min(1).max(14).default(7),
});

const timetableRequests = new Map<string, number[]>();
const searchRequests = new Map<string, number[]>();

function limited(buckets: Map<string, number[]>, userId: string, max: number): boolean {
  const now = Date.now();
  for (const [key, entries] of buckets) {
    if (!entries.length || entries[entries.length - 1] < now - 60000) buckets.delete(key);
  }
  const bucket = buckets.get(userId) ?? [];
  buckets.set(userId, bucket);
  while (bucket.length && bucket[0] < now - 60000) bucket.shift();
  if (bucket.length >= max) return true;
  bucket.push(now);
  return false;
}

/** Gleicher Same-Origin-Schutz wie /api/chat, aber ohne dessen
 * Localhost-Bindung: Hier reisen fremde Zugangsdaten, kein Server-Geheimnis.
 */
function sameOrigin(request: Request): boolean {
  const host = request.headers.get("host") || "";
  const origin = request.headers.get("origin");
  if (request.headers.get("sec-fetch-site") === "cross-site") return false;
  if (!origin) return true;
  return origin === `http://${host}` || origin === `https://${host}`;
}

function tooLarge(request: Request, body: string): boolean {
  return Number(request.headers.get("content-length") || 0) > MAX_BODY_BYTES ||
    Buffer.byteLength(body, "utf8") > MAX_BODY_BYTES;
}

/** Öffentliche Schulsuche ohne Login: liefert Server + Schulkürzel. */
export async function GET(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json({ error: "Anmeldung erforderlich." }, { status: 401 });
  if (!sameOrigin(request))
    return Response.json({ error: "Anfrage abgelehnt." }, { status: 403 });
  const query =
    new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 80)
    return Response.json(
      { error: "Bitte mindestens 2 Zeichen für die Schulsuche eingeben." },
      { status: 400 },
    );
  if (limited(searchRequests, session.user.id, 15))
    return Response.json(
      { error: "Bitte warte eine Minute vor der nächsten Anfrage." },
      { status: 429 },
    );
  const abort = new AbortController();
  const timer = setTimeout(() => abort.abort(), SCHOOL_SEARCH_TIMEOUT_MS);
  try {
    const { schools, tooMany } = await searchSchools(query, abort.signal);
    if (tooMany)
      return Response.json(
        { error: "Zu viele Schulen gefunden. Bitte Suche eingrenzen." },
        { status: 400 },
      );
    return Response.json({ schools }, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    if (error instanceof Error && /abort/i.test(error.name))
      return Response.json(
        { error: "Die Schulsuche antwortet nicht. Bitte erneut versuchen." },
        { status: 504 },
      );
    return Response.json(
      { error: "Die Schulsuche ist nicht erreichbar. Bitte erneut versuchen." },
      { status: 502 },
    );
  } finally {
    clearTimeout(timer);
  }
}

/** Stundenplan mit den Zugangsdaten der anfragenden Person abrufen.
 * Das Passwort lebt nur in dieser Anfrage und wird nie gespeichert.
 */
export async function POST(request: Request) {
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session)
    return Response.json({ error: "Anmeldung erforderlich." }, { status: 401 });
  if (!sameOrigin(request))
    return Response.json({ error: "Anfrage abgelehnt." }, { status: 403 });
  const body = await request.text();
  if (tooLarge(request, body))
    return Response.json(
      { error: "Die Anfrage ist zu groß." },
      { status: 413 },
    );
  let parsed;
  try {
    parsed = timetableInput.safeParse(JSON.parse(body));
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (!parsed.success)
    return Response.json(
      { error: "Bitte Server, Schule, Benutzer und Passwort prüfen." },
      { status: 400 },
    );
  // Eingefügte URLs ("https://…/WebUntis/?school=…") auf Host + Kürzel
  // zurückführen, bevor irgendetwas validiert oder verbunden wird.
  const server = normalizeServer(parsed.data.server);
  const school = normalizeSchool(parsed.data.school);
  const username = normalizeUsername(parsed.data.username);
  if (!server || !isWebUntisServer(server) || !school || !username)
    return Response.json(
      { error: "Bitte Server, Schule, Benutzer und Passwort prüfen." },
      { status: 400 },
    );
  if (limited(timetableRequests, session.user.id, 10))
    return Response.json(
      { error: "Bitte warte eine Minute vor der nächsten Anfrage." },
      { status: 429 },
    );
  try {
    const result = await fetchWebUntisTimetable(
      { ...parsed.data, server, school, username },
      { signal: request.signal },
    );
    return Response.json(result, { headers: { "Cache-Control": "no-store" } });
  } catch (error) {
    const failure = classifyTimetableError(error);
    return Response.json({ error: failure.error }, { status: failure.status });
  }
}
