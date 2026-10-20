import { z } from "zod";
import {
  WEBUNTIS_TIMEOUT_MS,
  WebUntisApiError,
  isWebUntisServer,
} from "./webuntis";
import { normalizeWebUntisLessons } from "../providers/school";

const sessionSchema = z.object({
  sessionId: z.string().min(1).max(512).regex(/^[A-Za-z0-9._!-]+$/),
});
const personSchema = z.object({
  personId: z.number().int().positive(),
  personType: z.number().int().min(1).max(5),
});
const envelopeSchema = z.object({
  jsonrpc: z.literal("2.0"),
  id: z.union([z.string(), z.number()]),
  result: z.unknown().optional(),
  error: z.object({ code: z.number(), message: z.string() }).nullish(),
});

/** School-local dates are independent of the timezone of the deployment. */
export function webUntisDateRange(days: number, now = new Date()) {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Vienna", year: "numeric", month: "2-digit", day: "2-digit",
  }).formatToParts(now);
  const part = (name: string) => Number(parts.find((p) => p.type === name)!.value);
  const start = new Date(Date.UTC(part("year"), part("month") - 1, part("day")));
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + days - 1);
  const format = (date: Date) => date.toISOString().slice(0, 10).replaceAll("-", "");
  return { startDate: Number(format(start)), endDate: Number(format(end)) };
}

/** One isolated session per import; no credentials or session tokens are persisted. */
export async function fetchWebUntisTimetable(
  input: { server: string; school: string; username: string; password: string; days: number },
  options: { fetch?: typeof fetch; signal?: AbortSignal; now?: Date } = {},
) {
  if (!isWebUntisServer(input.server))
    throw new WebUntisApiError(400, "Bitte eine gültige WebUntis-Serveradresse aus der Schulsuche verwenden.");
  const transport = options.fetch ?? fetch;
  const endpoint = new URL(`https://${input.server}/WebUntis/jsonrpc.do`);
  endpoint.searchParams.set("school", input.school);
  const signal = options.signal
    ? AbortSignal.any([options.signal, AbortSignal.timeout(WEBUNTIS_TIMEOUT_MS)])
    : AbortSignal.timeout(WEBUNTIS_TIMEOUT_MS);
  let sessionId: string | undefined;
  let sequence = 0;

  async function rpc(method: string, params: Record<string, unknown>, requestSignal = signal) {
    const id = `school-os-${++sequence}`;
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
      Accept: "application/json",
      "X-Requested-With": "XMLHttpRequest",
    };
    if (sessionId) {
      headers.Cookie = `JSESSIONID=${sessionId}; schoolname=${encodeURIComponent("_" + Buffer.from(input.school, "utf8").toString("base64"))}`;
    }
    const response = await transport(endpoint, {
      method: "POST", headers, cache: "no-store", redirect: "error",
      signal: requestSignal,
      body: JSON.stringify({ id, method, params, jsonrpc: "2.0" }),
    });
    if (response.status === 401 || response.status === 403)
      throw new WebUntisApiError(response.status, "WebUntis hat die Anmeldung oder den API-Zugriff abgelehnt. Bitte Zugang und Freigabe der Schule prüfen.");
    if (response.status === 429)
      throw new WebUntisApiError(429, "WebUntis erhält zu viele Anfragen. Bitte später erneut versuchen.");
    if (!response.ok)
      throw new WebUntisApiError(502, "Der WebUntis-Server konnte die Anfrage nicht verarbeiten. Bitte später erneut versuchen.");
    const parsed = envelopeSchema.safeParse(await response.json().catch((error: unknown) => {
      if (requestSignal.aborted) throw error;
      return null;
    }));
    if (!parsed.success || parsed.data.id !== id)
      throw new WebUntisApiError(502, "WebUntis hat eine ungültige API-Antwort geliefert.");
    const { result, error } = parsed.data;
    if (error) {
      // Never forward upstream messages: they may contain credentials or session data.
      if (/bad credentials|invalid credentials|authentication failed|invalid user|invalid password/i.test(error.message) ||
          (method === "authenticate" && error.code === -8504))
        throw new WebUntisApiError(401, "Schule, Benutzer oder Passwort wurde nicht akzeptiert. Bei Microsoft-/SSO-Anmeldung benötigst du einen eigenen WebUntis-Zugang.");
      if (/no right|not allowed|not authorized|permission|access denied|not enabled|not activated|not licensed/i.test(error.message))
        throw new WebUntisApiError(403, "Für diesen Zugang ist der WebUntis-API-Zugriff nicht freigeschaltet. Bitte die Schuladministration kontaktieren.");
      if (/invalid session|session expired|not authenticated/i.test(error.message))
        throw new WebUntisApiError(401, "Die WebUntis-Sitzung ist abgelaufen. Bitte erneut abrufen.");
      throw new WebUntisApiError(502, "WebUntis hat die API-Anfrage abgelehnt. Bitte Schule und Zugriffsrechte prüfen.");
    }
    if (!("result" in parsed.data))
      throw new WebUntisApiError(502, "WebUntis hat kein API-Ergebnis geliefert.");
    return result;
  }

  try {
    const rawSession = await rpc("authenticate", {
      user: input.username, password: input.password, client: "School OS",
    });
    const session = sessionSchema.safeParse(rawSession);
    if (!session.success)
      throw new WebUntisApiError(502, "WebUntis hat keine gültige Sitzung geliefert.");
    sessionId = session.data.sessionId;
    const person = personSchema.safeParse(rawSession);
    if (!person.success)
      throw new WebUntisApiError(403, "Diesem WebUntis-Zugang ist kein persönlicher Stundenplan zugeordnet. Bitte deinen Schüler- oder Lehrerzugang verwenden.");
    const { personId, personType } = person.data;
    const range = webUntisDateRange(input.days, options.now);
    const periods = await rpc("getTimetable", {
      options: {
        id: Date.now(),
        element: { id: personId, type: personType }, ...range,
        showSubstText: true, showLsText: true, showInfo: true,
        subjectFields: ["id", "name", "longname"],
        teacherFields: ["id", "name", "longname"],
        roomFields: ["id", "name", "longname"],
      },
    });
    if (!Array.isArray(periods))
      throw new WebUntisApiError(502, "WebUntis hat keinen gültigen Stundenplan geliefert.");
    const lessons = normalizeWebUntisLessons(periods);
    if (periods.length && !lessons.length)
      throw new WebUntisApiError(502, "Die WebUntis-Stunden konnten nicht gelesen werden. Bitte erneut versuchen oder die Schuladministration kontaktieren.");
    return { lessons, range, fetchedAt: new Date().toISOString() };
  } finally {
    if (sessionId) {
      // Logout must still run if the import timed out or the browser disconnected.
      await rpc("logout", {}, AbortSignal.timeout(3000)).catch(() => {});
      sessionId = undefined;
    }
  }
}
