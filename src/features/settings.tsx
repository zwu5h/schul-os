"use client";
import { useState } from "react";
import { Download, Moon, Sun, ExternalLink } from "lucide-react";
import { entries, clear, workspaceKey } from "@/lib/local-data";
import { useWorkspace } from "@/lib/store";
import { isCloudEnabled, useAuth } from "@/lib/auth";
import { authClient } from "@/lib/auth-client";
import { useSync } from "@/lib/sync";
import { useSubjectSync } from "@/lib/subject-sync";
import { emptyWorkspace, demoWorkspace } from "@/lib/demo";
import { download } from "@/components/ui";
function Account() {
  const { data: session, isPending } = authClient.useSession();
  const auth = useAuth();
  const sync = useSync();
  const subjectSync = useSubjectSync();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  if (!isCloudEnabled()) {
    return (
      <div className="form">
        <p>
          {isPending ? "Konto wird geladen …" : session?.user
            ? <>Angemeldet als <strong>{session.user.email}</strong></>
            : "Deine Sitzung ist abgelaufen. Bitte melde dich erneut an."}
        </p>
        <p className="muted">
          Deine Fächer werden über deinen Account automatisch zwischen Geräten
          synchronisiert. Notizen, Whiteboards und Dateien werden in diesem
          Browser gespeichert. Nutze „Daten & Sicherung“, um sie zu exportieren.
        </p>
        <p className="muted" role="status">
          {subjectSync.lastSync
            ? `Fächer zuletzt synchronisiert: ${new Date(subjectSync.lastSync).toLocaleString("de-AT")}`
            : "Fächer werden synchronisiert …"}
        </p>
        <button className="button" disabled={subjectSync.running} onClick={() => void subjectSync.syncNow()}>
          {subjectSync.running ? "Synchronisiert …" : "Jetzt synchronisieren"}
        </button>
        {subjectSync.error && <p className="muted" role="alert">{subjectSync.error}</p>}
      </div>
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
            ? "Cloud verbunden: Änderungen werden automatisch synchronisiert."
            : "Fächer werden über deinen Account synchronisiert. Die übrigen Inhalte bleiben lokal in diesem Browser."}
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
export { WebUntis } from "./webuntis";
