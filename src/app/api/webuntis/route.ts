import { WebUntis } from "webuntis";
import { z } from "zod";
import { normalizeWebUntisLessons } from "@/providers/school";
export const runtime = "nodejs";
const input = z.object({
  server: z
    .string()
    .trim()
    .min(4)
    .max(80)
    .regex(
      /^[a-z0-9.-]+\.[a-z]{2,}$/i,
      "Server ungültig, z. B. mese.webuntis.com.",
    ),
  school: z.string().trim().min(1).max(80),
  username: z.string().trim().min(1).max(80),
  password: z.string().min(1).max(200),
  days: z.number().int().min(1).max(14).default(7),
});
const requests: number[] = [];
export async function POST(request: Request) {
  const host = request.headers.get("host") || "";
  const origin = request.headers.get("origin");
  // Anders als /api/chat nutzt diese Route kein Server-Geheimnis, sondern die
  // Zugangsdaten der anfragenden Person. Trotzdem: kein Cross-Site-Zugriff.
  if (
    (origin && origin !== `http://${host}` && origin !== `https://${host}`) ||
    request.headers.get("sec-fetch-site") === "cross-site"
  )
    return Response.json({ error: "Anfrage abgelehnt." }, { status: 403 });
  if (Number(request.headers.get("content-length") || 0) > 8000)
    return Response.json({ error: "Die Anfrage ist zu groß." }, { status: 413 });
  const body = await request.text();
  if (body.length > 8000)
    return Response.json({ error: "Die Anfrage ist zu groß." }, { status: 413 });
  let parsed;
  try {
    parsed = input.safeParse(JSON.parse(body));
  } catch {
    return Response.json({ error: "Ungültige Anfrage." }, { status: 400 });
  }
  if (!parsed.success)
    return Response.json(
      { error: "Bitte Server, Schule, Benutzer und Passwort prüfen." },
      { status: 400 },
    );
  const now = Date.now();
  while (requests.length && requests[0] < now - 60000) requests.shift();
  if (requests.length >= 10)
    return Response.json(
      { error: "Bitte warte eine Minute vor der nächsten Anfrage." },
      { status: 429 },
    );
  requests.push(now);
  const { server, school, username, password, days } = parsed.data;
  const untis = new WebUntis(school, username, password, server);
  const timeout = (ms: number) =>
    new Promise<never>((_, reject) =>
      setTimeout(() => reject(new Error("Zeitüberschreitung.")), ms),
    );
  try {
    await Promise.race([untis.login(), timeout(20000)]);
    try {
      const start = new Date();
      const end = new Date();
      end.setDate(end.getDate() + days - 1);
      const periods = await Promise.race([
        untis.getOwnTimetableForRange(start, end),
        timeout(20000),
      ]);
      return Response.json({ lessons: normalizeWebUntisLessons(periods) });
    } finally {
      await untis.logout().catch(() => {});
    }
  } catch (error) {
    const message = error instanceof Error ? error.message : "";
    // Zugangsdaten oder Passwort niemals in Fehlermeldungen zurückgeben.
    if (/bad credentials|failed to login|unauthor|forbidden|login/i.test(message))
      return Response.json(
        { error: "Schule, Benutzer oder Passwort wurde nicht akzeptiert." },
        { status: 401 },
      );
    return Response.json(
      { error: "WebUntis ist nicht erreichbar. Server prüfen und erneut versuchen." },
      { status: 502 },
    );
  }
}
