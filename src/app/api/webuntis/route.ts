import { WebUntis } from "webuntis";
import { z } from "zod";
import { normalizeWebUntisLessons } from "@/providers/school";
import {
  MAX_BODY_BYTES,
  SCHOOL_SEARCH_TIMEOUT_MS,
  WEBUNTIS_TIMEOUT_MS,
  classifyTimetableError,
  normalizeSchool,
  normalizeServer,
  normalizeUsername,
  searchSchools,
  withTimeout,
} from "@/lib/webuntis";

export const runtime = "nodejs";

const timetableInput = z.object({
  server: z.string().min(1).max(200),
  school: z.string().min(1).max(200),
  username: z.string().min(1).max(80),
  password: z.string().min(1).max(200),
  days: z.number().int().min(1).max(14).default(7),
});

const timetableRequests: number[] = [];
const searchRequests: number[] = [];

function limited(bucket: number[], max: number): boolean {
  const now = Date.now();
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
    body.length > MAX_BODY_BYTES;
}

/** Öffentliche Schulsuche ohne Login: liefert Server + Schulkürzel. */
export async function GET(request: Request) {
  if (!sameOrigin(request))
    return Response.json({ error: "Anfrage abgelehnt." }, { status: 403 });
  const query =
    new URL(request.url).searchParams.get("q")?.trim() ?? "";
  if (query.length < 2 || query.length > 80)
    return Response.json(
      { error: "Bitte mindestens 2 Zeichen für die Schulsuche eingeben." },
      { status: 400 },
    );
  if (limited(searchRequests, 15))
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
    return Response.json({ schools });
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
  if (!server || !school || !username)
    return Response.json(
      { error: "Bitte Server, Schule, Benutzer und Passwort prüfen." },
      { status: 400 },
    );
  if (limited(timetableRequests, 10))
    return Response.json(
      { error: "Bitte warte eine Minute vor der nächsten Anfrage." },
      { status: 429 },
    );
  const { password, days } = parsed.data;
  const untis = new WebUntis(school, username, password, server);
  try {
    await withTimeout(untis.login(), WEBUNTIS_TIMEOUT_MS);
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + days - 1);
      const periods = await withTimeout(
        untis.getOwnTimetableForRange(start, end),
        WEBUNTIS_TIMEOUT_MS,
      );
      return Response.json({ lessons: normalizeWebUntisLessons(periods) });
    } finally {
      await withTimeout(untis.logout(), 8000).catch(() => {});
    }
  } catch (error) {
    const failure = classifyTimetableError(error);
    return Response.json({ error: failure.error }, { status: failure.status });
  }
}
