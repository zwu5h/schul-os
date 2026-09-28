"use client";
import { useState } from "react";
import { Download, Moon, Sun, ExternalLink, Upload } from "lucide-react";
import { entries, clear } from "idb-keyval";
import { useWorkspace } from "@/lib/store";
import { entity, type Lesson } from "@/types/school";
import { parseTimetableJson, type TimetableEntry } from "@/providers/school";
import { emptyWorkspace, demoWorkspace } from "@/lib/demo";
import { download } from "@/components/ui";
export function Settings() {
  const w = useWorkspace();
  const [status, setStatus] = useState("");
  return (
    <div className="settings-grid">
      <section className="panel settings-panel">
        <h2>Dein Profil</h2>
        <p>Nur in diesem Browser gespeichert.</p>
        <div className="form">
          {[
            ["name", "Dein Name"],
            ["school", "Schule"],
            ["grade", "Klassenstufe"],
          ].map(([key, label]) => (
            <label key={key}>
              {label}
              <input
                value={w.profile[key as keyof typeof w.profile]}
                onChange={(e) =>
                  w.patch({ profile: { ...w.profile, [key]: e.target.value } })
                }
              />
            </label>
          ))}
        </div>
      </section>
      <section className="panel settings-panel">
        <h2>Dein Workspace</h2>
        <p>Ein ruhiger Ort. So, wie du ihn brauchst.</p>
        <button
          className="button"
          onClick={() =>
            w.patch({ theme: w.theme === "light" ? "dark" : "light" })
          }
        >
          {w.theme === "light" ? <Moon size={16} /> : <Sun size={16} />}{" "}
          {w.theme === "light" ? "Dunkles Design" : "Helles Design"}
        </button>
        <hr />
        <h3>Daten & Sicherung</h3>
        <p>
          Notizen und Aufgaben liegen im Browserspeicher. Canvas und Dateien
          liegen in IndexedDB. Noch kein Cloud-Sync.
        </p>
        <button
          className="button"
          onClick={async () => {
            try {
              const raw = localStorage.getItem("school-os-v1");
              const stored = await entries();
              const blobs = await Promise.all(
                stored.map(async ([key, value]) => ({
                  key,
                  value:
                    value instanceof Blob
                      ? {
                          name: (value as File).name,
                          type: value.type,
                          base64: await new Promise<string>(
                            (resolve, reject) => {
                              const reader = new FileReader();
                              reader.onload = () =>
                                resolve(String(reader.result));
                              reader.onerror = reject;
                              reader.readAsDataURL(value);
                            },
                          ),
                        }
                      : value,
                })),
              );
              download(
                "school-os-backup.json",
                JSON.stringify(
                  {
                    version: 1,
                    workspace: raw ? JSON.parse(raw).state : null,
                    indexedDB: blobs,
                  },
                  null,
                  2,
                ),
              );
              setStatus("Vollständiger Export erstellt.");
            } catch {
              setStatus(
                "Export fehlgeschlagen. Bitte prüfe den verfügbaren Speicher.",
              );
            }
          }}
        >
          <Download size={16} /> Vollständiges Backup exportieren
        </button>
        <p className="muted">
          Backup enthält persönliche Lernmaterialien. Sicher aufbewahren. Import
          folgt in einer späteren Phase.
        </p>
      </section>
      <section className="panel settings-panel">
        <h2>KI · Groq</h2>
        <span className="pill">Free Tier · openai/gpt-oss-20b</span>
        <p>
          Der Schlüssel liegt ausschließlich auf dem Server in{" "}
          <code>.env.local</code>. Keine Schlüssel im Browser oder in Git.
        </p>
        <p>
          Das MVP erlaubt KI-Aufrufe nur lokal. Ein öffentlicher
          Mehrbenutzerbetrieb benötigt zuerst Authentifizierung und
          serverseitige Nutzerlimits.
        </p>
        <a
          className="text-button"
          href="https://console.groq.com/settings/limits"
          target="_blank"
          rel="noreferrer"
        >
          Kontingent bei Groq prüfen <ExternalLink size={14} />
        </a>
      </section>
      <section className="panel settings-panel">
        <h2>Demo & Neustart</h2>
        <p>
          {w.demo
            ? "Du arbeitest mit ausdrücklich markierten Demo-Daten."
            : "Du arbeitest in deinem eigenen Workspace."}
        </p>
        <div className="form">
          <button
            className="button"
            onClick={async () => {
              if (
                confirm(
                  "Alle lokalen Inhalte löschen und Demo laden? Exportiere vorher ein Backup.",
                )
              ) {
                await clear();
                w.reset({ ...demoWorkspace(), onboarded: true });
              }
            }}
          >
            Demo neu laden
          </button>
          <button
            className="button danger"
            onClick={async () => {
              if (
                confirm(
                  "Alle lokalen Inhalte einschließlich Dateien und Canvas unwiderruflich löschen?",
                )
              ) {
                await clear();
                w.reset({ ...emptyWorkspace(), onboarded: true });
              }
            }}
          >
            Leeren Workspace starten
          </button>
        </div>
      </section>
      {status && <p role="status">{status}</p>}
    </div>
  );
}
export function WebUntis() {
  const w = useWorkspace();
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [errors, setErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<TimetableEntry[] | null>(null);
  const [replace, setReplace] = useState(true);
  const [done, setDone] = useState("");
  const imported = w.lessons.filter((l) => l.source === "webuntis");
  const unknown = preview
    ? [
        ...new Set(
          preview
            .map((e) => e.subject.trim())
            .filter(
              (name) =>
                !w.subjects.some(
                  (s) => s.name.trim().toLowerCase() === name.toLowerCase(),
                ),
            ),
        ),
      ]
    : [];
  function check() {
    const result = parseTimetableJson(text);
    if (!result.ok) {
      setErrors(result.errors);
      setPreview(null);
      return;
    }
    setErrors([]);
    setPreview(result.entries);
    setDone("");
  }
  function apply() {
    if (!preview) return;
    const latest = useWorkspace.getState();
    const subjects = [...latest.subjects];
    const lessons: Lesson[] = preview.map((e) => {
      const name = e.subject.trim();
      let s = subjects.find(
        (x) => x.name.trim().toLowerCase() === name.toLowerCase(),
      );
      if (!s) {
        s = {
          ...entity(),
          name,
          color: "#9184d7",
          icon: "◎",
          teacher: e.teacher,
          room: "",
        };
        subjects.push(s);
      }
      return {
        id: crypto.randomUUID(),
        subjectId: s.id,
        start: e.start,
        end: e.end,
        room: e.room,
        teacher: e.teacher,
        status: e.status,
        source: "webuntis" as const,
      };
    });
    latest.patch({
      subjects,
      lessons: replace
        ? [...latest.lessons.filter((l) => l.source !== "webuntis"), ...lessons]
        : [...latest.lessons, ...lessons],
    });
    setPreview(null);
    setText("");
    setFileName("");
    setDone(
      `${lessons.length} ${lessons.length === 1 ? "Stunde" : "Stunden"} übernommen.`,
    );
  }
  return (
    <>
      <div className="integration-card panel">
        <div className="integration-logo">W</div>
        <span className="eyebrow">SCHULINTEGRATION</span>
        <h1>
          Dein Stundenplan.
          <br />
          Am richtigen Ort.
        </h1>
        <p>
          Kein Live-Zugang: Diese App fragt keine WebUntis-Passwörter ab und
          speichert keine. Stattdessen importierst du deinen Stundenplan als
          JSON-Datei – einmalig, lokal, jederzeit widerrufbar durch Löschen
          der Stunden. Ein Live-Adapter folgt erst nach Prüfung der von
          deiner Schule freigegebenen API.
        </p>
        <span className="pill">
          {imported.length
            ? `${imported.length} ${imported.length === 1 ? "Stunde" : "Stunden"} per JSON importiert`
            : "Nicht verbunden · Kein Live-Sync"}
        </span>
        <a
          className="button"
          href="https://help.untis.at/"
          target="_blank"
          rel="noreferrer"
        >
          Untis-Dokumentation <ExternalLink size={15} />
        </a>
      </div>
      <div className="panel settings-panel">
        <h2>Stundenplan als JSON importieren</h2>
        <p>
          Format: Objekt mit &quot;lessons&quot;-Liste aus Einträgen mit
          subject, start, end, room, teacher und status. Zeit als
          JJJJ-MM-TTTHH:mm, Status regular, cancelled oder changed.
        </p>
        <div className="form">
          <label>
            JSON-Datei
            <input
              type="file"
              accept=".json,application/json"
              onChange={async (e) => {
                const file = e.target.files?.[0];
                if (!file) return;
                if (file.size > 1024 * 1024) {
                  setErrors(["Die Datei ist größer als 1 MB."]);
                  return;
                }
                setFileName(file.name);
                setText(await file.text());
                setPreview(null);
                setDone("");
              }}
            />
          </label>
          {fileName && <small className="muted">{fileName}</small>}
          <div className="field">
            <label htmlFor="timetable-json">Stundenplan-JSON</label>
            <textarea
              id="timetable-json"
              rows={8}
              value={text}
              onChange={(e) => {
                setText(e.target.value);
                setPreview(null);
              }}
              placeholder='{"lessons": [{"subject": "Mathematik", "start": "2026-09-29T08:00", "end": "2026-09-29T08:50", "room": "A101"}]}'
            />
          </div>
          <button className="button" onClick={check}>
            <Upload size={15} /> Prüfen
          </button>
          {errors.length > 0 && (
            <ul className="muted" role="alert">
              {errors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
          {preview && (
            <>
              <p className="muted">
                {preview.length}{" "}
                {preview.length === 1 ? "Stunde" : "Stunden"} bereit ·{" "}
                {preview[0].start.slice(0, 10)} bis{" "}
                {preview[preview.length - 1].end.slice(0, 10)}
                {unknown.length > 0 &&
                  ` · Neue Fächer: ${unknown.join(", ")}`}
              </p>
              <label className="checkbox-label">
                <input
                  type="checkbox"
                  checked={replace}
                  onChange={(e) => setReplace(e.target.checked)}
                />
                Bestehende WebUntis-Stunden ersetzen
              </label>
              <button className="button primary" onClick={apply}>
                Übernehmen
              </button>
            </>
          )}
          {done && (
            <p className="muted" role="status">
              {done}
            </p>
          )}
        </div>
      </div>
    </>
  );
}
