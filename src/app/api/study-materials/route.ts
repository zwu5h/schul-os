import Database from "better-sqlite3";
import { resolve } from "node:path";
import { auth } from "@/lib/server-auth";
import { backendOrigin, proxyBackendRequest } from "@/lib/server-backend";
import { studyMaterialsSchema } from "@/lib/study-materials-schema";

export const runtime = "nodejs";

let database: Database.Database | undefined;
function db() {
  if (!database) {
    database = new Database(resolve(/* turbopackIgnore: true */ process.env.AUTH_DATABASE_PATH || "data/auth.sqlite"));
    database.pragma("journal_mode = WAL");
    database.exec(`CREATE TABLE IF NOT EXISTS synced_study_materials (
      user_id TEXT NOT NULL REFERENCES user(id) ON DELETE CASCADE,
      kind TEXT NOT NULL CHECK (kind IN ('notes', 'flashcards')),
      id TEXT NOT NULL,
      data TEXT,
      updated_at INTEGER NOT NULL,
      PRIMARY KEY (user_id, kind, id)
    )`);
  }
  return database;
}

export async function POST(request: Request) {
  if (backendOrigin()) return proxyBackendRequest(request);
  // Match the public host, including behind the existing HTTPS reverse proxy.
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (request.headers.get("sec-fetch-site") === "cross-site" ||
      (origin && origin !== `http://${host}` && origin !== `https://${host}`))
    return Response.json({ error: "Anfrage abgelehnt." }, { status: 403 });
  const session = await auth.api.getSession({ headers: request.headers });
  if (!session) return Response.json({ error: "Bitte erneut anmelden." }, { status: 401 });
  if (Number(request.headers.get("content-length")) > 4_000_000)
    return Response.json({ error: "Zu viele Lernmaterialien für einen Abgleich." }, { status: 413 });
  const body = await request.text();
  if (Buffer.byteLength(body) > 4_000_000)
    return Response.json({ error: "Zu viele Lernmaterialien für einen Abgleich." }, { status: 413 });
  let parsed;
  try { parsed = studyMaterialsSchema.safeParse(JSON.parse(body)); }
  catch { return Response.json({ error: "Ungültige Lernmaterialien." }, { status: 400 }); }
  if (!parsed.success) return Response.json({ error: "Ungültige Lernmaterialien." }, { status: 400 });

  // The account comes exclusively from the verified session, never from input.
  const userId = session.user.id;
  const database = db();
  const result = database.transaction(() => {
    const remove = database.prepare(`INSERT INTO synced_study_materials (user_id,kind,id,data,updated_at)
      VALUES (?,?,?,NULL,?) ON CONFLICT(user_id,kind,id)
      DO UPDATE SET data=NULL,updated_at=excluded.updated_at`);
    const save = database.prepare(`INSERT INTO synced_study_materials (user_id,kind,id,data,updated_at)
      VALUES (?,?,?,?,?) ON CONFLICT(user_id,kind,id)
      DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at
      WHERE synced_study_materials.data IS NOT NULL AND excluded.updated_at > synced_study_materials.updated_at`);
    for (const kind of ["notes", "flashcards"] as const) {
      for (const id of parsed.data.deletedIds) remove.run(userId, kind, id, Date.now());
      for (const item of parsed.data[kind])
        save.run(userId, kind, item.id, JSON.stringify(item), Date.parse(item.updatedAt));
    }
    const rows = database.prepare("SELECT kind,id,data FROM synced_study_materials WHERE user_id=?")
      .all(userId) as { kind: "notes" | "flashcards"; id: string; data: string | null }[];
    return {
      notes: rows.filter(r => r.kind === "notes" && r.data !== null).map(r => JSON.parse(r.data!)),
      flashcards: rows.filter(r => r.kind === "flashcards" && r.data !== null).map(r => JSON.parse(r.data!)),
      deletedIds: [...new Set(rows.filter(r => r.data === null).map(r => r.id))],
    };
  })();
  return Response.json(result, { headers: { "Cache-Control": "no-store" } });
}
