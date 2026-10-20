import Database from "better-sqlite3";
import { resolve } from "node:path";
import { z } from "zod";
import { auth } from "@/lib/server-auth";
import { backendOrigin, proxyBackendRequest } from "@/lib/server-backend";
import type { Subject } from "@/types/school";

export const runtime = "nodejs";

const subjectSchema = z.object({
  id: z.uuid(),
  name: z.string().min(1).max(500),
  color: z.string().max(100),
  icon: z.string().max(100),
  teacher: z.string().max(500),
  room: z.string().max(500),
  createdAt: z.iso.datetime({ offset: true }),
  updatedAt: z.iso.datetime({ offset: true }),
});
const inputSchema = z.object({
  subjects: z.array(subjectSchema).max(5000),
  deletedIds: z.array(z.uuid()).max(5000),
});

let database: Database.Database | undefined;
function db() {
  if (!database) {
    database = new Database(resolve(/* turbopackIgnore: true */ process.env.AUTH_DATABASE_PATH || "data/auth.sqlite"));
    database.pragma("journal_mode = WAL");
    database.exec(`CREATE TABLE IF NOT EXISTS synced_subjects (
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      id TEXT NOT NULL,
      data TEXT,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, id)
    )`);
  }
  return database;
}

export async function POST(request: Request) {
  if (backendOrigin()) return proxyBackendRequest(request);
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (request.headers.get("sec-fetch-site") === "cross-site" ||
    (origin && origin !== `http://${host}` && origin !== `https://${host}`)) {
    return Response.json({ error: "Anfrage abgelehnt." }, { status: 403 });
  }
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Bitte erneut anmelden." }, { status: 401 });
  if (Number(request.headers.get("content-length")) > 4_000_000) {
    return Response.json({ error: "Zu viele Fächerdaten." }, { status: 413 });
  }
  const body = await request.text();
  if (Buffer.byteLength(body) > 4_000_000) {
    return Response.json({ error: "Zu viele Fächerdaten." }, { status: 413 });
  }
  let parsed;
  try { parsed = inputSchema.safeParse(JSON.parse(body)); }
  catch { return Response.json({ error: "Ungültige Fächerdaten." }, { status: 400 }); }
  if (!parsed.success) return Response.json({ error: "Ungültige Fächerdaten." }, { status: 400 });

  // Each account has its own rows. Deletion markers stop an offline device
  // from bringing deleted subjects back when it next uploads its old copy.
  const userId = session.user.id;
  const database = db();
  const result = database.transaction(() => {
    const remove = database.prepare(`INSERT INTO synced_subjects (user_id,id,data,updated_at)
      VALUES (?,?,NULL,?) ON CONFLICT(user_id,id) DO UPDATE SET data=NULL,updated_at=excluded.updated_at`);
    for (const id of parsed.data.deletedIds) remove.run(userId, id, Date.now());
    const save = database.prepare(`INSERT INTO synced_subjects (user_id,id,data,updated_at)
      VALUES (?,?,?,?) ON CONFLICT(user_id,id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at
      WHERE synced_subjects.data IS NOT NULL AND excluded.updated_at > synced_subjects.updated_at`);
    for (const subject of parsed.data.subjects) {
      save.run(userId, subject.id, JSON.stringify(subject), Date.parse(subject.updatedAt));
    }
    const rows = database.prepare("SELECT id,data FROM synced_subjects WHERE user_id=?").all(userId) as { id: string; data: string | null }[];
    return {
      subjects: rows.filter(row => row.data !== null).map(row => JSON.parse(row.data!) as Subject),
      deletedIds: rows.filter(row => row.data === null).map(row => row.id),
    };
  })();
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
