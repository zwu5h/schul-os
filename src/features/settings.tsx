"use client";
import { useState } from "react";
import { Download, Moon, Sun, ExternalLink } from "lucide-react";
import { entries, clear } from "idb-keyval";
import { useWorkspace } from "@/lib/store";
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
  return (
    <div className="integration-card panel">
      <div className="integration-logo">W</div>
      <span className="eyebrow">SCHULINTEGRATION</span>
      <h1>
        Dein Stundenplan.
        <br />
        Am richtigen Ort.
      </h1>
      <p>
        WebUntis ist noch nicht verbunden. Dieses MVP enthält die unabhängige
        Provider-Schnittstelle; ein Live-Adapter folgt nach Prüfung der von
        deiner Schule freigegebenen API.
      </p>
      <span className="pill">Nicht verbunden · Kein Live-Sync</span>
      <p>
        Stundenplan-Beispiele werden ausschließlich im Demo-Modus angezeigt. Es
        werden keine Zugangsdaten abgefragt oder vermeintliche
        Synchronisierungen ausgeführt.
      </p>
      <a
        className="button"
        href="https://help.untis.at/"
        target="_blank"
        rel="noreferrer"
      >
        Untis-Dokumentation <ExternalLink size={15} />
      </a>
    </div>
  );
}
