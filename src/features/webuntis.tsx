"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import {
  AlertCircle, ArrowDownToLine, ArrowRight, BookOpen, CalendarDays, Check,
  CheckCircle2, ChevronDown, Clock3, ExternalLink, Eye, EyeOff, FileJson,
  GraduationCap, LoaderCircle, LockKeyhole, MapPin, RefreshCw, Search, ShieldCheck,
} from "lucide-react";
import { useWorkspace } from "@/lib/store";
import { userStorageKey } from "@/lib/local-data";
import { DEFAULT_SCHOOL_SUGGESTION, type SchoolSuggestion } from "@/lib/webuntis";
import { parseTimetableJson, sortTimetableEntries, type TimetableEntry } from "@/providers/school";
import { entity, type Lesson } from "@/types/school";
import styles from "./webuntis.module.css";

type Connection = { server: string; school: string; username: string; displayName: string; lastImportedAt?: string };
type Preview = { entries: TimetableEntry[]; source: "live" | "file"; start: string; end: string };

function savedConnection(): Connection {
  const fallback = { server: DEFAULT_SCHOOL_SUGGESTION.server, school: DEFAULT_SCHOOL_SUGGESTION.loginName,
    username: "", displayName: DEFAULT_SCHOOL_SUGGESTION.displayName };
  if (typeof localStorage === "undefined") return fallback;
  try {
    const data = JSON.parse(localStorage.getItem(userStorageKey("webuntis-connection")) || "{}");
    return {
      server: typeof data.server === "string" ? data.server : fallback.server,
      school: typeof data.school === "string" ? data.school : fallback.school,
      username: typeof data.username === "string" ? data.username : "",
      displayName: typeof data.displayName === "string" ? data.displayName
        : data.school && data.school !== fallback.school ? data.school : fallback.displayName,
      lastImportedAt: typeof data.lastImportedAt === "string" && Number.isFinite(Date.parse(data.lastImportedAt)) ? data.lastImportedAt : undefined,
    };
  } catch { return fallback; }
}

function dateLabel(value: string, full = false) {
  const date = new Date(`${value}T12:00:00Z`);
  if (!Number.isFinite(date.getTime()) || date.toISOString().slice(0, 10) !== value) return value;
  return new Intl.DateTimeFormat("de-AT", {
    day: "2-digit", month: "2-digit", ...(full ? { weekday: "long" as const } : {}), timeZone: "UTC",
  }).format(date);
}

function makePreview(entries: TimetableEntry[], source: Preview["source"], range?: { startDate: number; endDate: number }): Preview {
  const sorted = sortTimetableEntries(entries);
  const iso = (n: number) => String(n).replace(/^(\d{4})(\d{2})(\d{2})$/, "$1-$2-$3");
  return { entries: sorted, source,
    start: range ? iso(range.startDate) : sorted[0].start.slice(0, 10),
    end: range ? iso(range.endDate) : sorted[sorted.length - 1].end.slice(0, 10) };
}

function Step({ number, title, children }: { number: string; title: string; children?: React.ReactNode }) {
  return <div className={styles.stepHeading}><span>{number}</span><h3>{title}</h3>{children}</div>;
}

export function WebUntis() {
  const w = useWorkspace();
  const [saved] = useState(savedConnection);
  const [server, setServer] = useState(saved.server);
  const [school, setSchool] = useState(saved.school);
  const [displayName, setDisplayName] = useState(saved.displayName);
  const [username, setUsername] = useState(saved.username);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [days, setDays] = useState(7);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [schools, setSchools] = useState<SchoolSuggestion[]>([]);
  const [searching, setSearching] = useState(false);
  const [searchError, setSearchError] = useState("");
  const [fetching, setFetching] = useState(false);
  const [error, setError] = useState("");
  const [empty, setEmpty] = useState(false);
  const [preview, setPreview] = useState<Preview | null>(null);
  const [replace, setReplace] = useState(true);
  const [done, setDone] = useState("");
  const [lastImportedAt, setLastImportedAt] = useState(saved.lastImportedAt);
  const [text, setText] = useState("");
  const [fileName, setFileName] = useState("");
  const [fileErrors, setFileErrors] = useState<string[]>([]);
  const liveRequest = useRef<AbortController | null>(null);
  const searchRequest = useRef<AbortController | null>(null);
  const previewHeading = useRef<HTMLHeadingElement | null>(null);
  useEffect(() => () => { liveRequest.current?.abort(); searchRequest.current?.abort(); }, []);
  useEffect(() => {
    if (preview || done) previewHeading.current?.focus({ preventScroll: window.matchMedia("(min-width: 951px)").matches });
  }, [preview, done]);

  const imported = w.lessons.filter((lesson) => lesson.source === "webuntis");
  const storedEntries = sortTimetableEntries(imported.map((lesson) => ({
    ...lesson, subject: w.subjects.find((subject) => subject.id === lesson.subjectId)?.name || "Unterricht",
  })));
  const entries = preview?.entries ?? storedEntries;
  const grouped = new Map<string, TimetableEntry[]>();
  for (const entry of entries) {
    const day = entry.start.slice(0, 10);
    if (!grouped.has(day)) grouped.set(day, []);
    grouped.get(day)!.push(entry);
  }
  const newSubjects = preview ? [...new Set(preview.entries.map((entry) => entry.subject.trim()))]
    .filter((name) => !w.subjects.some((subject) => subject.name.trim().toLowerCase() === name.toLowerCase())) : [];
  const cancelled = entries.filter((entry) => entry.status === "cancelled").length;
  const changed = entries.filter((entry) => entry.status === "changed").length;

  function clearPreview() { setPreview(null); setEmpty(false); setDone(""); setError(""); }
  function remember(importedAt = lastImportedAt) {
    try {
      localStorage.setItem(userStorageKey("webuntis-connection"), JSON.stringify({
        server: server.trim(), school: school.trim(), username: username.trim(), displayName, lastImportedAt: importedAt,
      }));
    } catch { /* A full browser store must not fail the import. */ }
  }

  async function searchSchool() {
    if (query.trim().length < 2) { setSearchError("Gib mindestens zwei Zeichen ein."); return; }
    searchRequest.current?.abort();
    const controller = new AbortController();
    searchRequest.current = controller;
    setSearching(true); setSearchError(""); setSchools([]);
    try {
      const response = await fetch(`/api/webuntis?q=${encodeURIComponent(query.trim())}`, { signal: AbortSignal.any([controller.signal, AbortSignal.timeout(15_000)]) });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Die Schulsuche ist fehlgeschlagen.");
      const results = Array.isArray(data.schools) ? data.schools as SchoolSuggestion[] : [];
      setSchools(results);
      if (!results.length) setSearchError("Keine Schule gefunden. Versuche den Schulnamen oder den Ort.");
    } catch (cause) {
      if (!controller.signal.aborted) setSearchError(cause instanceof Error && cause.name === "TimeoutError"
        ? "Die Schulsuche antwortet gerade nicht. Bitte erneut versuchen."
        : cause instanceof Error ? cause.message : "Die Schulsuche ist nicht erreichbar.");
    } finally { if (!controller.signal.aborted) setSearching(false); }
  }

  function selectSchool(choice: SchoolSuggestion) {
    setServer(choice.server); setSchool(choice.loginName); setDisplayName(choice.displayName);
    setSchools([]); setSearchOpen(false); setSearchError(""); setPassword(""); setShowPassword(false); clearPreview();
  }

  async function fetchLive(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (fetching) return;
    if (!server.trim() || !school.trim() || !username.trim() || !password) {
      setError("Bitte Schule, Benutzername und Passwort ausfüllen."); return;
    }
    const controller = new AbortController();
    liveRequest.current = controller;
    clearPreview(); setFetching(true);
    try {
      const response = await fetch("/api/webuntis", {
        method: "POST", headers: { "Content-Type": "application/json" }, signal: AbortSignal.any([controller.signal, AbortSignal.timeout(30_000)]),
        body: JSON.stringify({ server: server.trim(), school: school.trim(), username: username.trim(), password, days }),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(typeof data.error === "string" ? data.error : "Der Stundenplan konnte nicht abgerufen werden.");
      if (!Array.isArray(data.lessons)) throw new Error("Der Server hat keinen gültigen Stundenplan geliefert.");
      remember();
      if (!data.lessons.length) { setEmpty(true); return; }
      const parsed = parseTimetableJson(JSON.stringify({ lessons: data.lessons }));
      if (!parsed.ok) throw new Error("Die Stundenplandaten konnten nicht gelesen werden.");
      setPreview(makePreview(parsed.entries, "live", data.range));
    } catch (cause) {
      if (!controller.signal.aborted) setError(cause instanceof Error && cause.name === "TimeoutError"
        ? "WebUntis antwortet gerade nicht. Bitte erneut versuchen."
        : cause instanceof Error ? cause.message : "WebUntis ist nicht erreichbar. Bitte erneut versuchen.");
    } finally { if (!controller.signal.aborted) { setFetching(false); setPassword(""); setShowPassword(false); } }
  }

  function checkFile() {
    const result = parseTimetableJson(text);
    if (!result.ok) { setFileErrors(result.errors); setPreview(null); return; }
    clearPreview(); setFileErrors([]); setPreview(makePreview(result.entries, "file"));
  }

  function apply() {
    if (!preview || fetching) return;
    const latest = useWorkspace.getState();
    const subjects = [...latest.subjects];
    const lessons: Lesson[] = preview.entries.map((entry) => {
      let subject = subjects.find((s) => s.name.trim().toLowerCase() === entry.subject.trim().toLowerCase());
      if (!subject) {
        subject = { ...entity(), name: entry.subject.trim(), color: "#9184d7", icon: "◎", teacher: entry.teacher, room: "" };
        subjects.push(subject);
      }
      return { id: crypto.randomUUID(), subjectId: subject.id, start: entry.start, end: entry.end,
        room: entry.room, teacher: entry.teacher, status: entry.status, source: "webuntis" };
    });
    const key = (lesson: Lesson) => `${lesson.subjectId}/${lesson.start}/${lesson.end}`;
    const incoming = new Set(lessons.map(key));
    const kept = latest.lessons.filter((lesson) => {
      if (lesson.source !== "webuntis") return true;
      const day = lesson.start.slice(0, 10);
      return replace ? day < preview.start || day > preview.end : !incoming.has(key(lesson));
    });
    latest.patch({ subjects, lessons: [...kept, ...lessons] });
    const timestamp = new Date().toISOString();
    setLastImportedAt(timestamp); remember(timestamp);
    setDone(`${lessons.length} ${lessons.length === 1 ? "Stunde" : "Stunden"} übernommen.`);
    setPreview(null); setText(""); setFileName(""); setPassword(""); setShowPassword(false);
  }

  return (
    <div className={styles.page}>
      <header className={styles.header}>
        <div><div className={styles.eyebrow}><span className={styles.brand}>W</span> WEBUNTIS × SCHOOL OS</div>
          <h1>Dein Stundenplan.<br /><span>Schon an seinem Platz.</span></h1>
          <p>Weniger abtippen. Mehr Überblick. Hol deinen Schulalltag direkt in deinen Workspace.</p>
        </div>
        <div className={styles.headerNote}><span className={styles.statusDot} data-active={imported.length > 0} />
          {imported.length ? `${imported.length} ${imported.length === 1 ? "Stunde" : "Stunden"} übernommen` : "Bereit für deinen ersten Abruf"}
          <small>Manueller Abruf · keine automatische Synchronisierung</small>
        </div>
      </header>

      <div className={styles.layout}>
        <div className={styles.setup}>
          <section className={styles.card} aria-labelledby="connection-title">
            <div className={styles.cardHeading}><div className={styles.headingIcon}><RefreshCw size={19} /></div>
              <div><h2 id="connection-title">Mit WebUntis verbinden</h2><p>Deine Schule. Dein Zugang. Dein Stundenplan.</p></div>
            </div>
            <form onSubmit={(event) => void fetchLive(event)}>
              <fieldset disabled={fetching} className={styles.fieldset}>
                <section className={styles.step}>
                  <Step number="01" title="Deine Schule"><button className={styles.textButton} type="button" onClick={() => setSearchOpen(!searchOpen)} aria-expanded={searchOpen} aria-controls="untis-school-search">{searchOpen ? "Schließen" : "Ändern"}</button></Step>
                  <div className={styles.schoolCard}><span className={styles.schoolIcon}><GraduationCap size={23} /></span>
                    <div><strong>{displayName || school || "Schule auswählen"}</strong><span>{server}</span></div><CheckCircle2 size={17} aria-label="Schule ausgewählt" />
                  </div>
                  {searchOpen && <div id="untis-school-search" className={styles.searchPanel}>
                    <label className={styles.field} htmlFor="live-search">Schulname oder Ort
                      <div className={styles.searchInput}><Search size={16} /><input id="live-search" value={query} maxLength={80} placeholder="z. B. Neusiedl am See" autoComplete="off"
                        onChange={(event) => setQuery(event.target.value)} onKeyDown={(event) => { if (event.key === "Enter") { event.preventDefault(); void searchSchool(); } }} /></div>
                    </label>
                    <button className={styles.secondaryButton} type="button" disabled={searching} onClick={() => void searchSchool()}>{searching ? <LoaderCircle size={15} className={styles.spin} /> : <Search size={15} />} Schule suchen</button>
                    {searchError && <p className={styles.error} role="alert">{searchError}</p>}
                    {schools.length > 0 && <ul className={styles.schoolResults} aria-label="Gefundene Schulen">{schools.map((choice) => <li key={`${choice.server}/${choice.loginName}`}>
                      <button type="button" onClick={() => selectSchool(choice)}><div><strong>{choice.displayName}</strong><span>{choice.address || choice.server}</span></div><ArrowRight size={16} /></button>
                    </li>)}</ul>}
                  </div>}
                  <details className={styles.advanced}><summary>Server manuell bearbeiten <ChevronDown size={13} /></summary>
                    <div className={styles.fields}><label className={styles.field} htmlFor="live-server">Server<input id="live-server" value={server} maxLength={200} onChange={(event) => { setServer(event.target.value); clearPreview(); }} /></label>
                      <label className={styles.field} htmlFor="live-school">Schulkürzel<input id="live-school" value={school} maxLength={200} onChange={(event) => { setSchool(event.target.value); setDisplayName(event.target.value); clearPreview(); }} /></label></div>
                  </details>
                </section>

                <section className={styles.step}>
                  <Step number="02" title="Dein WebUntis-Zugang" />
                  <div className={styles.fields}><label className={styles.field} htmlFor="live-user">Benutzername<input id="live-user" value={username} maxLength={80} autoComplete="username" placeholder="Dein WebUntis-Benutzername" onChange={(event) => { setUsername(event.target.value); clearPreview(); }} required /></label>
                    <label className={styles.field} htmlFor="live-password">Passwort<div className={styles.passwordField}><input id="live-password" type={showPassword ? "text" : "password"} value={password} maxLength={200} autoComplete="current-password" placeholder="Dein WebUntis-Passwort" onChange={(event) => setPassword(event.target.value)} required />
                      <button type="button" aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"} aria-pressed={showPassword} onClick={() => setShowPassword(!showPassword)}>{showPassword ? <EyeOff size={17} /> : <Eye size={17} />}</button></div></label>
                  </div>
                  <details className={styles.advanced}><summary>Du meldest dich normalerweise mit Microsoft an? <ChevronDown size={13} /></summary><p>Für den Abruf brauchst du einen eigenen WebUntis-Benutzernamen und ein WebUntis-Passwort. Deine Schuladministration kann dir weiterhelfen und den API-Zugriff freigeben.</p></details>
                </section>

                <section className={styles.step}>
                  <Step number="03" title="Dein Zeitraum" />
                  <div className={styles.period} role="group" aria-label="Zeitraum">{[7, 14].map((amount) => <button type="button" key={amount} aria-pressed={days === amount} onClick={() => { setDays(amount); clearPreview(); }}>
                    <CalendarDays size={17} /><span>{amount === 7 ? "Eine Woche" : "Zwei Wochen"}<small>Die nächsten {amount} Tage</small></span>{days === amount && <Check size={16} />}
                  </button>)}</div>
                  <button className={styles.primaryButton} type="submit" disabled={searching || fetching}>{fetching ? <><LoaderCircle size={17} className={styles.spin} /> Stundenplan wird abgerufen …</> : <><ArrowDownToLine size={17} /> Stundenplan abrufen <ArrowRight size={17} /></>}</button>
                  <p className={styles.privacy}><LockKeyhole size={13} /> Dein Passwort wird nicht gespeichert und nach dem Abruf geleert.</p>
                </section>
              </fieldset>
            </form>
            {error && <div className={styles.errorBox} role="alert"><AlertCircle size={18} /><div><strong>Abruf nicht möglich</strong><p>{error}</p></div></div>}
          </section>

          <details className={`${styles.card} ${styles.fileImport}`}>
            <summary><span className={styles.headingIcon}><FileJson size={19} /></span><div><strong>Du hast bereits eine Datei?</strong><span>Stundenplan als JSON importieren</span></div><ChevronDown size={17} /></summary>
            <fieldset className={styles.fileFields} disabled={fetching}>
              <label className={styles.filePicker}><FileJson size={24} /><strong>{fileName || "JSON-Datei auswählen"}</strong><span>Bis zu 1 MB · alternativ unten einfügen</span><input type="file" aria-label="JSON-Datei" accept=".json,application/json" onChange={async (event) => {
                const file = event.target.files?.[0]; event.target.value = ""; if (!file) return;
                if (file.size > 1024 * 1024) { setFileErrors(["Die Datei ist größer als 1 MB."]); return; }
                try { setText(await file.text()); setFileName(file.name); setFileErrors([]); clearPreview(); }
                catch { setFileErrors(["Die Datei konnte nicht gelesen werden."]); }
              }} /></label>
              <label className={styles.field} htmlFor="timetable-json">Stundenplan-JSON<textarea id="timetable-json" rows={5} value={text} onChange={(event) => { setText(event.target.value); clearPreview(); setFileErrors([]); }} placeholder={'{"lessons": [{"subject": "Mathematik", "start": "2026-10-20T08:00", "end": "2026-10-20T08:50"}]}'} /></label>
              <p className={styles.hint}>Pro Stunde: Fach (subject), Beginn (start), Ende (end). Optional: Raum (room), Lehrkraft (teacher), Status (status).</p>
              <button type="button" className={styles.secondaryButton} onClick={checkFile} disabled={!text.trim()}>Datei prüfen <ArrowRight size={15} /></button>
              {fileErrors.length > 0 && <ul className={styles.error} role="alert">{fileErrors.map((message, index) => <li key={`${index}/${message}`}>{message}</li>)}</ul>}
            </fieldset>
          </details>
          <a className={styles.helpLink} href="https://help.untis.at/" target="_blank" rel="noreferrer">Hilfe zu WebUntis <ExternalLink size={13} /></a>
        </div>

        <section className={`${styles.card} ${styles.preview}`} aria-labelledby="preview-title" aria-busy={fetching}>
          <div className={styles.previewHeading}><div><span className={styles.eyebrow}>{preview ? "VOR DER ÜBERNAHME" : "DEIN ÜBERBLICK"}</span><h2 id="preview-title" ref={previewHeading} tabIndex={-1}>{preview ? "Vorschau prüfen" : imported.length ? "Dein übernommener Plan" : "Hier kommt dein Plan hin."}</h2></div><CalendarDays size={22} /></div>
          {done && <div className={styles.success} role="status"><CheckCircle2 size={18} /><div><strong>{done}</strong><p>Du findest deinen Plan jetzt auch im Kalender und auf deiner Startseite.</p></div></div>}
          {fetching ? <div className={styles.loading} role="status"><LoaderCircle size={28} className={styles.spin} /><h3>Ein Moment für deinen Überblick.</h3><p>Wir melden dich bei WebUntis an und laden deinen persönlichen Stundenplan.</p><div className={styles.skeleton} aria-hidden="true"><i /><i /><i /></div></div>
            : empty ? <div className={styles.empty}><div className={styles.emptyIcon}><CalendarDays size={30} /></div><h3>Abruf erfolgreich. Gerade keine Stunden.</h3><p>Im gewählten Zeitraum liegt kein Unterricht. Das kann an Wochenenden oder in den Ferien vorkommen. Versuche einen längeren Zeitraum.</p>{imported.length > 0 && <p>Dein bisheriger Plan bleibt erhalten.</p>}</div>
            : entries.length > 0 ? <>
              <div className={styles.stats}><span><strong>{entries.length}</strong> {entries.length === 1 ? "Stunde" : "Stunden"}{preview ? " bereit" : " gespeichert"}</span><span><strong>{grouped.size}</strong> {grouped.size === 1 ? "Schultag" : "Schultage"}</span>{changed > 0 && <span className={styles.changed}>{changed} geändert</span>}{cancelled > 0 && <span className={styles.cancelled}>{cancelled} {cancelled === 1 ? "Entfall" : "Entfälle"}</span>}</div>
              <p className={styles.range}>{preview ? `${dateLabel(preview.start)} – ${dateLabel(preview.end)} · ${preview.source === "live" ? "Live aus WebUntis abgerufen" : "Aus deiner JSON-Datei"}` : "Gespeicherter Stand · zum Aktualisieren erneut abrufen"}</p>
              <div className={styles.days}>{[...grouped].map(([day, lessons]) => <section className={styles.day} key={day} aria-label={dateLabel(day, true)}><div className={styles.dayHeading}><h3>{dateLabel(day, true)}</h3><span>{lessons.length} {lessons.length === 1 ? "Stunde" : "Stunden"}</span></div>
                {lessons.map((lesson, index) => <article className={styles.lesson} data-status={lesson.status} key={`${lesson.start}/${lesson.subject}/${index}`}><div className={styles.time}><strong>{lesson.start.slice(11, 16)}</strong><span>{lesson.end.slice(11, 16)}</span></div><div className={styles.lessonContent}><strong>{lesson.subject}</strong><div>{lesson.room && <span><MapPin size={12} />{lesson.room}</span>}{lesson.teacher && <span><GraduationCap size={13} />{lesson.teacher}</span>}</div></div>{lesson.status !== "regular" && <span className={lesson.status === "cancelled" ? styles.cancelled : styles.changed}>{lesson.status === "cancelled" ? "Entfällt" : "Geändert"}</span>}</article>)}
              </section>)}</div>
              {preview && <div className={styles.importActions}>{newSubjects.length > 0 && <div className={styles.newSubjects}><BookOpen size={16} /><p>{newSubjects.length === 1 ? "Neues Fach" : `${newSubjects.length} neue Fächer`}: <strong>{newSubjects.join(", ")}</strong><span>Werden beim Übernehmen für dich angelegt.</span></p></div>}
                <label className={styles.checkbox}><input type="checkbox" checked={replace} onChange={(event) => setReplace(event.target.checked)} /><span>Vorhandene WebUntis-Stunden im Zeitraum ersetzen<small>Andere Zeiträume und eigene Termine bleiben erhalten.</small></span></label>
                <div className={styles.actionRow}><button type="button" className={styles.secondaryButton} onClick={() => setPreview(null)}>Verwerfen</button><button type="button" className={styles.primaryButton} onClick={apply}><Check size={17} /> Übernehmen</button></div>
              </div>}
            </> : <div className={styles.empty}><div className={styles.emptyCalendar} aria-hidden="true"><CalendarDays size={32} /><div><i /><i /><i /><i /><i /><i /><i /><i /><i /></div></div><h3>Dein Schulalltag, auf einen Blick.</h3><p>Wähle deine Schule und rufe deinen Plan ab. Hier siehst du deine Stunden, Räume und Änderungen, bevor du sie übernimmst.</p><span className={styles.emptyCaption}><ShieldCheck size={15} /> Du entscheidest, was in deinen Kalender kommt.</span></div>}
          <footer className={styles.previewFooter}><Clock3 size={14} /><span>{lastImportedAt ? `Zuletzt übernommen: ${new Date(lastImportedAt).toLocaleString("de-AT", { day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" })}` : imported.length ? "Gespeicherter Plan · Zeitpunkt der letzten Übernahme unbekannt" : "Noch kein Stundenplan übernommen"}</span></footer>
        </section>
      </div>
    </div>
  );
}
