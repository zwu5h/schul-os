"use client";
import { useState } from "react";
import { Download, Moon, Sun, ExternalLink, Upload } from "lucide-react";
import { entries, clear, workspaceKey, userStorageKey } from "@/lib/local-data";
import { useWorkspace } from "@/lib/store";
import { entity, type Lesson } from "@/types/school";
import { parseTimetableJson, type TimetableEntry } from "@/providers/school";
import { DEFAULT_SCHOOL_SUGGESTION, type SchoolSuggestion } from "@/lib/webuntis";
import { isCloudEnabled, useAuth } from "@/lib/auth";
import { useSync } from "@/lib/sync";
import { emptyWorkspace, demoWorkspace } from "@/lib/demo";
import { download } from "@/components/ui";
function Account() {
  const auth = useAuth();
  const sync = useSync();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  if (!isCloudEnabled()) {
    return (
      <p className="muted">
        Cloud-Backend ist nicht konfiguriert. Für Login und Sync ein
        Supabase-Projekt anlegen, die Migration aus{" "}
        <code>supabase/migrations/0001_foundation.sql</code> anwenden und{" "}
        <code>NEXT_PUBLIC_SUPABASE_URL</code> sowie{" "}
        <code>NEXT_PUBLIC_SUPABASE_ANON_KEY</code> setzen – Anleitung in{" "}
        <code>docs/CLOUD_SETUP.md</code>.
      </p>
    );
  }
  if (!auth.ready) return <p className="muted">Konto wird geladen …</p>;
  if (!auth.user) {
    return (
      <div className="form">
        <div className="field">
          <label htmlFor="account-email">E-Mail</label>
          <input
            id="account-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="du@beispiel.at"
          />
        </div>
        <div className="field">
          <label htmlFor="account-password">Passwort</label>
          <input
            id="account-password"
            type="password"
            autoComplete="current-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            placeholder="Mindestens 6 Zeichen"
          />
        </div>
        <div className="form-row">
          <button
            className="button primary"
            disabled={auth.busy}
            onClick={() => void auth.signIn(email.trim(), password)}
          >
            Anmelden
          </button>
          <button
            className="button"
            disabled={auth.busy}
            onClick={() => void auth.signUp(email.trim(), password)}
          >
            Konto erstellen
          </button>
        </div>
        {auth.error && (
          <p className="muted" role="alert">
            {auth.error}
          </p>
        )}
        {auth.notice && (
          <p className="muted" role="status">
            {auth.notice}
          </p>
        )}
      </div>
    );
  }
  return (
    <div className="form">
      <p>
        Angemeldet als <strong>{auth.user.email}</strong>
      </p>
      <p className="muted">
        {sync.lastSync
          ? `Zuletzt synchronisiert: ${new Date(sync.lastSync).toLocaleString("de-AT")}`
          : "Noch nicht synchronisiert."}{" "}
        Änderungen werden automatisch hochgeladen.
      </p>
      <div className="form-row">
        <button
          className="button"
          disabled={sync.running}
          onClick={() => void sync.syncNow()}
        >
          {sync.running ? "Synchronisiert …" : "Jetzt synchronisieren"}
        </button>
        <button className="button" onClick={() => void auth.signOut()}>
          Abmelden
        </button>
      </div>
      {sync.error && (
        <p className="muted" role="alert">
          {sync.error}
        </p>
      )}
    </div>
  );
}
export function Settings() {
  const w = useWorkspace();
  const authUser = useAuth((s) => s.user);
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
        <h2>Konto & Cloud</h2>
        <Account />
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
          liegen in IndexedDB.{" "}
          {authUser
            ? "Angemeldet: Änderungen syncen automatisch in die Cloud."
            : "Ohne Anmeldung bleibt alles nur lokal in diesem Browser."}
        </p>
        <button
          className="button"
          onClick={async () => {
            try {
              const raw = localStorage.getItem(workspaceKey());
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
  const [liveErrors, setLiveErrors] = useState<string[]>([]);
  const [preview, setPreview] = useState<TimetableEntry[] | null>(null);
  const [replace, setReplace] = useState(true);
  const [done, setDone] = useState("");
  const [savedConnection] = useState(() => {
    if (typeof localStorage === "undefined")
      return { server: "", school: "", username: "" };
    try {
      const data = JSON.parse(
        localStorage.getItem(userStorageKey("webuntis-connection")) || "{}",
      );
      return {
        server: typeof data.server === "string" ? data.server : "",
        school: typeof data.school === "string" ? data.school : "",
        username: typeof data.username === "string" ? data.username : "",
      };
    } catch {
      return { server: "", school: "", username: "" };
    }
  });
  const [server, setServer] = useState(
    savedConnection.server || DEFAULT_SCHOOL_SUGGESTION.server,
  );
  const [schoolName, setSchoolName] = useState(
    savedConnection.school || DEFAULT_SCHOOL_SUGGESTION.loginName,
  );
  const [username, setUsername] = useState(savedConnection.username);
  const [password, setPassword] = useState("");
  const [days, setDays] = useState(7);
  const [fetching, setFetching] = useState(false);
  const [search, setSearch] = useState(
    savedConnection.server ? "" : DEFAULT_SCHOOL_SUGGESTION.displayName,
  );
  const [schools, setSchools] = useState<SchoolSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
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
  async function searchSchool() {
    const query = search.trim();
    if (query.length < 2) {
      setLiveErrors([
        "Bitte mindestens 2 Zeichen für die Schulsuche eingeben.",
      ]);
      return;
    }
    setSearching(true);
    setLiveErrors([]);
    setDone("");
    try {
      const res = await fetch(
        `/api/webuntis?q=${encodeURIComponent(query)}`,
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLiveErrors([
          typeof data.error === "string"
            ? data.error
            : "Schulsuche fehlgeschlagen.",
        ]);
        setSchools([]);
        return;
      }
      const list = Array.isArray(data.schools) ? data.schools : [];
      setSchools(list as SchoolSuggestion[]);
      if (!list.length)
        setLiveErrors(["Keine Schule gefunden. Bitte Schreibweise prüfen."]);
    } catch {
      setLiveErrors(["Die Schulsuche ist nicht erreichbar."]);
      setSchools([]);
    } finally {
      setSearching(false);
    }
  }
  function selectSchool(school: SchoolSuggestion) {
    setServer(school.server);
    setSchoolName(school.loginName);
    setSearch(school.displayName);
    setSchools([]);
    setLiveErrors([]);
  }
  async function fetchLive() {
    if (
      !server.trim() ||
      !schoolName.trim() ||
      !username.trim() ||
      !password
    ) {
      setLiveErrors([
        "Bitte Server, Schule, Benutzer und Passwort ausfüllen.",
      ]);
      setPreview(null);
      return;
    }
    setFetching(true);
    setLiveErrors([]);
    setDone("");
    try {
      const res = await fetch("/api/webuntis", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          server: server.trim(),
          school: schoolName.trim(),
          username: username.trim(),
          password,
          days,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setLiveErrors([
          typeof data.error === "string"
            ? data.error
            : "Abruf fehlgeschlagen.",
        ]);
        setPreview(null);
        return;
      }
      const entries = Array.isArray(data.lessons) ? data.lessons : [];
      if (!entries.length) {
        setLiveErrors([
          "Keine Stunden im Zeitraum gefunden. An Wochenenden oder in den Ferien ist das normal – ggf. einen längeren Zeitraum wählen.",
        ]);
        setPreview(null);
        return;
      }
      // Nur Server, Kürzel und Benutzer merken – nie das Passwort.
      try {
        localStorage.setItem(
          userStorageKey("webuntis-connection"),
          JSON.stringify({
            server: server.trim(),
            school: schoolName.trim(),
            username: username.trim(),
          }),
        );
      } catch {
        /* Browserspeicher voll oder blockiert: Abruf gilt trotzdem. */
      }
      setPreview(entries as TimetableEntry[]);
    } catch {
      setLiveErrors(["WebUntis ist nicht erreichbar."]);
      setPreview(null);
    } finally {
      setFetching(false);
    }
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
    setPassword("");
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
        <p className="muted">
          {w.profile.school || "Keine Schule eingetragen"} ·{" "}
          {w.profile.grade || "Keine Klasse eingetragen"}
        </p>
        <p>
          Verbinde deinen echten Stundenplan: Entweder live aus WebUntis
          abrufen oder einmalig als JSON importieren. Das WebUntis-Passwort
          bleibt nur im Arbeitsspeicher dieser Sitzung und wird nie
          gespeichert. Übernommene Stunden lassen sich jederzeit wieder
          löschen.
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
        <h2>Schule & Klasse</h2>
        <p>
          Einmal eintragen, überall dabei: erscheint hier und in den
          Einstellungen.
        </p>
        <div className="form">
          <div className="field">
            <label htmlFor="untis-school">Schule</label>
            <input
              id="untis-school"
              value={w.profile.school}
              maxLength={120}
              placeholder="z. B. BG/BRG Neusiedl/See"
              onChange={(e) =>
                w.patch({
                  profile: { ...w.profile, school: e.target.value },
                })
              }
            />
          </div>
          <div className="field">
            <label htmlFor="untis-class">Klasse</label>
            <input
              id="untis-class"
              value={w.profile.grade}
              maxLength={40}
              placeholder="z. B. 3B"
              onChange={(e) =>
                w.patch({
                  profile: { ...w.profile, grade: e.target.value },
                })
              }
            />
          </div>
        </div>
      </div>
      <div className="panel settings-panel">
        <h2>Live aus WebUntis abrufen</h2>
        <p>
          Schritt 1: Schule suchen und übernehmen – so stimmen Server und
          Schulkürzel garantiert. Schritt 2: mit deinen
          WebUntis-Zugangsdaten abrufen. Das Passwort bleibt nur in dieser
          Sitzung im Arbeitsspeicher und wird nie gespeichert.
        </p>
        <div className="form">
          <div className="field">
            <label htmlFor="live-search">Schule suchen</label>
            <input
              id="live-search"
              value={search}
              maxLength={80}
              placeholder="z. B. BG/BRG Neusiedl/See"
              autoComplete="off"
              onChange={(e) => setSearch(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  e.preventDefault();
                  void searchSchool();
                }
              }}
            />
          </div>
          <button
            className="button"
            disabled={searching}
            onClick={() => void searchSchool()}
          >
            {searching ? "Sucht …" : "Schule suchen"}
          </button>
          {schools.length > 0 && (
            <ul className="school-results">
              {schools.map((s) => (
                <li key={`${s.server}/${s.loginName}`}>
                  <button
                    className="button"
                    onClick={() => selectSchool(s)}
                  >
                    {s.displayName}
                    <small className="muted">
                      {s.address ? `${s.address} · ` : ""}
                      {s.server} · {s.loginName}
                    </small>
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="field">
            <label htmlFor="live-server">Server</label>
            <input
              id="live-server"
              value={server}
              maxLength={80}
              placeholder="z. B. gymnasium-neusiedl.webuntis.com"
              autoComplete="off"
              onChange={(e) => setServer(e.target.value)}
            />
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="live-school">Schulkürzel</label>
              <input
                id="live-school"
                value={schoolName}
                maxLength={80}
                placeholder="Wird per Schulsuche ausgefüllt"
                autoComplete="off"
                onChange={(e) => setSchoolName(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="live-days">Zeitraum</label>
              <select
                id="live-days"
                value={days}
                onChange={(e) => setDays(Number(e.target.value))}
              >
                <option value={7}>7 Tage</option>
                <option value={14}>14 Tage</option>
              </select>
            </div>
          </div>
          <div className="form-row">
            <div className="field">
              <label htmlFor="live-user">Benutzer</label>
              <input
                id="live-user"
                value={username}
                maxLength={80}
                autoComplete="username"
                onChange={(e) => setUsername(e.target.value)}
              />
            </div>
            <div className="field">
              <label htmlFor="live-password">Passwort</label>
              <input
                id="live-password"
                type="password"
                value={password}
                autoComplete="current-password"
                onChange={(e) => setPassword(e.target.value)}
              />
            </div>
          </div>
          <button
            className="button primary"
            disabled={fetching}
            onClick={() => void fetchLive()}
          >
            {fetching ? "Rufe ab …" : "Abrufen und prüfen"}
          </button>
          {liveErrors.length > 0 && (
            <ul className="muted" role="alert">
              {liveErrors.map((err) => (
                <li key={err}>{err}</li>
              ))}
            </ul>
          )}
        </div>
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
