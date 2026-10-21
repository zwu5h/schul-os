# School OS auf Oracle Cloud

## Synchronisierung von Notizen und Lernkarten

Die bestehende Better-Auth-Sitzung wird auch für `/api/study-materials` verwendet.
Notizen und Lernkarten liegen in `synced_study_materials` im bestehenden
persistenten SQLite-Volume. Der Benutzer wird ausschließlich aus der Sitzung
bestimmt; jede Abfrage und Änderung ist auf diese Benutzer-ID beschränkt.
Neuere Zeitstempel gewinnen; Löschmarkierungen verhindern das Wiederherstellen
durch alte Gerätekopien. Der Client synchronisiert beim Start, bei Änderungen,
bei Fokus/erneuter Verbindung sowie alle zehn Sekunden im sichtbaren Tab.
Die Einstellung „Jetzt synchronisieren“ wartet auf Fächer und Lernmaterialien;
Fehler lassen die lokale Kopie bestehen. Whiteboards, Dateien, Aufgaben und das
Profil bleiben bei Verwendung dieser Better-Auth-Anbindung weiterhin lokal.

Die API-Prüfungen in `tests/subject-sync.spec.ts` decken Anmeldung, getrennte
Konten, Abruf über eine zweite Sitzung, neuere Änderungen, Lernstatus und
Löschungen trotz alter Uploads sowie Origin- und Eingabeprüfung ab. Ausführen:
`npx playwright test --config playwright.subject-sync.config.ts --grep 'requires authentication|study materials'`.

Ein Server-Update benötigt die neue Route, `study-materials-schema.ts`,
`subject-sync.ts`, `server-backend.ts` und die Sync-Hinweise in `settings.tsx`
sowie einen dazu passenden Linux-Standalone-Build. Bestehende Auth-Secrets und
Daten-Volumes beibehalten. Vorher ein konsistentes SQLite-Backup und das bisherige
Docker-Image sichern. Nach dem Update die angemeldete App neu laden und den
erfolgreichen Abgleich in „Konto & Cloud“ sowie die gespeicherten Datensätze prüfen.

## Vercel und GitHub

Die Vercel-Version verwendet unter `VERCEL=1` den bestehenden Server
`https://os.digmio.app` für dauerhafte Konten, Sitzungen und Fächer.
`SCHOOL_OS_BACKEND_URL` kann diese Backend-Origin explizit überschreiben.
Ohne Vercel und ohne diese Variable bleibt die lokale SQLite-Anbindung aktiv.
Auf Vercel wird keine lokale Kontodatenbank angelegt. Dadurch bleiben bestehende
Konten erhalten und die Anmeldung hängt nicht von einem flüchtigen Dateisystem ab.

Die Auth- und Fächer-Routen leiten ausschließlich an die feste Backend-Origin
weiter. Die App prüft zuvor die Browser-Origin, übernimmt Sitzungscookies und
verhindert das Caching von Kontodaten. Die Sitzungscookies gelten im Browser
jeweils für die aufgerufene Website; zwischen Oracle- und Vercel-Domain ist eine
separate Anmeldung nötig. Rücksetz-Mails verwenden die bereits freigegebene
Oracle-Origin. Ohne eigenen GROQ-Key auf Vercel wird auch die Chat-Route über
den bestehenden Server abgewickelt. Die neue WebUntis-API läuft direkt auf Vercel.

Das Projekt `schul-os` im Vercel-Team `zwu5hs-projects` ist mit
`zwu5h/schul-os` und dem Produktionsbranch `main` verbunden. Nach einem Push
den Deploymentstatus des konkreten Commits und die öffentliche Homepage,
Anmeldung sowie Schulsuche prüfen. Ein erfolgreicher Build allein bestätigt
keine funktionierende Anmeldung. Der zuvor veröffentlichte Vercel-Stand
`2b22103` lieferte bei der Prüfung am 20.10.2026 HTTP 500 auf der Startseite.

Lokale Prüfungen: `npm run typecheck`, `npm run lint`, `npm run build` sowie
`npx playwright test --config playwright.webuntis.config.ts`.

## Fächer-Synchronisierung veröffentlicht am 1. Oktober 2026

Auf `https://os.digmio.app` ist der Abgleich der Fächer über die bestehende
Better-Auth-Sitzung aktiv. Das Update wurde als Linux-Standalone-Build auf Basis
des zuvor veröffentlichten Serverstands gebaut; übertragen wurden die neue
Route `src/app/api/subjects/route.ts`, `src/lib/subject-sync.ts`, die Einbindung
in `school-app.tsx` und die dazugehörigen Hinweise in `settings.tsx`.
Typprüfung, gezieltes Lint und Produktionsbuild waren erfolgreich.

Auf der öffentlichen Website wurden mit getrennten PC- und Handy-Sitzungen
das Zusammenführen bestehender Fächer, das Anlegen neuer Fächer in beiden
Richtungen und der Erhalt nach Neuladen geprüft. Dabei traten keine
JavaScript-Fehler auf. Das dafür angelegte Testkonto wurde anschließend entfernt.
Zum Übernehmen bislang lokaler Fächer die Website auf beiden Geräten neu laden.

Der vorherige Stand ist unter
`/home/ubuntu/school-os-before-subject-sync-20261001/` gesichert, einschließlich
einer konsistenten SQLite-Sicherung. Das vorherige Image bleibt als
`school-os-app:before-subject-sync-20261001` erhalten. Bestehende Auth-Konfiguration
und Daten-Volumes wurden beibehalten.

## Öffentliche Homepage am 1. Oktober 2026

`https://os.digmio.app/` zeigt ohne Sitzung jetzt die Homepage mit Links zu
Anmeldung und Registrierung. Angemeldete Nutzer erhalten unter derselben
Adresse weiterhin ihren Workspace. Die frühere Weiterleitung von `/` nach
`/login` wurde durch die vorhandene `LandingPage` ersetzt.

Veröffentlicht wurden nur `src/app/page.tsx`, `src/components/landing-page.tsx`
und `src/components/landing-page.module.css` mit einem Linux-Standalone-Build
auf Basis des bisherigen Serverstands. Typprüfung, Lint der betroffenen Dateien
und Produktionsbuild waren erfolgreich. Im lokalen Browser wurden zusätzlich
der Einstieg mit Sitzung und ohne Sitzung geprüft; auf der öffentlichen Website
wurden HTTP 200 für `/`, Login- und Registrierungslinks, die Handyansicht und
das Ausbleiben von JavaScript-Fehlern bestätigt.

Der vorherige Stand liegt auf dem Server unter
`/home/ubuntu/school-os-before-homepage-20261001.tar.gz`; das vorherige Docker-Image
ist als `school-os-app:before-homepage-20261001` erhalten.

## Live-Deployment am 30. September 2026

Die App läuft unter `https://os.digmio.app/login` auf der vorhandenen
Instanz. Der aktuelle Stand verwendet das vorgebaute Standalone-Image mit
`compose.prebuilt.yaml`. Caddy hat ein gültiges Let's-Encrypt-Zertifikat bezogen.
HTTPS, Registrierung, Anmeldung, Abmeldung, Zugriffsschutz und der Erhalt der
Sitzung nach einem App-Container-Neustart wurden über die öffentlichen Endpunkte
geprüft. Die dafür erstellten Testkonten wurden anschließend entfernt.

Die eigene Domain `os.digmio.app` zeigt per DNS-A-Record auf `152.70.24.90`.
`APP_HOST=os.digmio.app` und `APP_URL=https://os.digmio.app` sind auf dem Server
gesetzt. Vor der Umstellung wurde `.env.production` auf dem Server gesichert;
die bestehenden Daten-Volumes und der Auth-Secret wurden beibehalten.
Das Let's-Encrypt-Zertifikat wurde erfolgreich ausgestellt. Öffentlich geprüft:
`/login` liefert HTTP 200, HTTP leitet auf HTTPS um, `/` leitet ohne Sitzung auf
`/login` um, und die Auth-API akzeptiert die neue Origin. Die Anmeldung mit
absichtlich ungültigen Zugangsdaten liefert erwartungsgemäß HTTP 401.

Der Auth-Secret wurde direkt auf dem Server neu erzeugt. `.env.production` ist
nur für `ubuntu` lesbar. GROQ ist mit dem validierten Key aus der lokalen
`.env.local` konfiguriert; eine echte KI-Antwort wurde öffentlich im Browser
geprüft. Supabase ist inzwischen mit dem Projekt `schul-os` verbunden; der
Produktionsbuild enthält dessen öffentliche URL und Publishable-Key. Alle elf
Tabellen mit RLS und der private Storage-Bucket sind eingerichtet. Die
Cloud-Anmeldung erfolgt zusätzlich unter Einstellungen über ein Supabase-Konto;
ohne diese Anmeldung bleiben Workspace-Inhalte lokal. Details und verbleibende
Sync-Prüfung: [Supabase](docs/SUPABASE.md). Die öffentliche IP ist weiterhin nicht
reserviert.

Der aktualisierte Build zeigt in den Kontoeinstellungen die Server-Sitzung
und den tatsächlichen lokalen Speicherstatus. Der KI-Assistent besitzt eine
Ladeanzeige und eine Fehleransicht mit Neuladen. Eine echte KI-Antwort sowie
ein absichtlich blockiertes JavaScript-Chunk und die anschließende Wiederherstellung
wurden auf `os.digmio.app` im Browser geprüft. Typecheck, Lint und Linux-Production-
Build waren erfolgreich.

## In Oracle am 29. September 2026 geprüft

Die angemeldete Tenancy `nnixnutz` hat in der Home-Region Frankfurt im
Root-Compartment jetzt die Instanz `school-os-frankfurt` (AD 3,
`VM.Standard.E2.1.Micro`, Ubuntu 24.04, Always Free-eligible). Ihre öffentliche
IPv4-Adresse ist `152.70.24.90`; SSH funktioniert mit dem vorhandenen
öffentlichen ED25519-Schlüssel und dem Benutzer `ubuntu`. Die früher vorhandenen Boot-Volumes
`hermes-mai`, `instance-20260527-1541` und `hermes` wurden bei der letzten
Prüfung in der Oracle-Oberfläche als **Terminated** angezeigt. Auch die
zwischenzeitlich erstellte AD-2-Kopie und ihr Backup waren **Terminated**.
Die alte Installation kann daher nicht mehr von einem dieser Volumes gestartet
werden. Wer oder was die Volumes terminiert hat, ist nicht bekannt.

Drei VCNs sind vorhanden. `vcn-20260527-1514` wurde zeitnah zum Boot-Volume
erstellt und enthält ein öffentliches Subnetz `10.0.0.0/24`. Seine Standard-
Security-List öffnet eingehend TCP 22, 80 und 443 sowie ICMP. Die Server-Firewall
erlaubt ebenfalls nur diese TCP-Ports; die Regeln sind in
`/etc/iptables/rules.v4` für Neustarts gespeichert. Die neue Instanz verwendet
dieses VCN und Subnetz. Die öffentliche IPv4-Adresse ist automatisch zugeteilt
und damit nicht reserviert.

Die Oracle-Oberfläche zeigte **0 von 12 GB** A1-RAM und **0 von 2** A1-OCPUs
belegt. Die eigenständige Limits-Seite lieferte einen Fehler.

Ein späterer Startversuch mit 2 OCPUs/12 GB aus `hermes-mai` in AD 1 wurde
von Oracle mit `Out of capacity for shape VM.Standard.A1.Flex` abgelehnt.
Ein zweiter Versuch mit 1 OCPU/6 GB in AD 1 erhielt denselben Fehler.
Auch die Versuche mit 2 OCPUs/12 GB in AD 2 und AD 3 sowie mit 1 OCPU/6 GB
in AD 2 und AD 3 wurden wegen fehlender A1-Kapazität abgelehnt. Daher wurde
vorläufig eine Always-Free-E2.1.Micro-Instanz mit 1 GB RAM und einem neuen
46,6-GB-Boot-Volume in AD 3 erstellt. Oracle zeigte dafür eine Schätzung von
**1,85 €/Monat**, die laut Hinweis Tier-Preise nicht berücksichtigt; die
Always-Free-Dokumentation nennt 200 GB kombinierten Boot-/Block-Speicher als
Freikontingent. Auf dem Server sind Docker aus der offiziellen Paketquelle
und 4 GB Swap eingerichtet.

## Voraussetzungen

- Bestehende Linux-Instanz mit funktionierendem SSH-Zugang und öffentlicher IPv4
- Docker Engine mit Compose-Plugin aus der offiziellen Paketquelle
- DNS-A-Record für `APP_HOST` auf diese IPv4; Ports 80 und 443 erreichbar
- In Oracle Security List/NSG und Host-Firewall nur 22 (nach Möglichkeit auf
  die eigene IP begrenzt), 80 und 443 eingehend öffnen. Datenbank und Port 3000
  bleiben geschlossen.

Bestehendes SSH-Verfahren erst ändern, wenn ein alternativer Zugang bestätigt
funktioniert. Andere laufende Dienste vor Installation von Caddy auf Port 80/443
prüfen; keine fremde Konfiguration überschreiben.

## Deployment

1. Repository in ein eigenes Verzeichnis auf der vorhandenen Instanz kopieren.
2. `.env.example` als `.env.production` kopieren, `APP_HOST` auf den DNS-Namen und
   `APP_URL` auf `https://<APP_HOST>` setzen. `AUTH_SECRET` mit 32 zufälligen Bytes
   aus einer kryptografischen Quelle generieren. Datei nur für den betreibenden
   Benutzer lesbar machen (`chmod 600 .env.production`).
3. Optional `GROQ_API_KEY` setzen. Supabase ist nur für die bisherige zusätzliche
   Synchronisierung nötig; die App-Anmeldung läuft über Better Auth und SQLite.
4. `docker compose --env-file .env.production up -d --build` ausführen.
5. `docker compose --env-file .env.production ps` und die Logs von `app` und
   `caddy` prüfen. `https://<APP_HOST>/login` aufrufen, registrieren, anmelden,
   abmelden und nach einem Neustart der Instanz erneut prüfen.

Compose migriert die Auth-Datenbank beim Start einmalig und hält sie im Volume
`auth_data`. Caddy bezieht und erneuert TLS-Zertifikate automatisch. Die App ist
nur im internen Compose-Netz auf Port 3000 erreichbar. Beide Dienste starten
nach Neustarts automatisch neu.

**Backups:** Das Volume `auth_data` regelmäßig sichern, ebenso `caddy_data`.
Vor App-Updates Sicherung erstellen. `docker compose down -v` würde die Daten
löschen und darf für normale Updates nicht verwendet werden.

**Ohne Domain:** Zuerst den DNS-A-Record einrichten. Ein bloßer Aufruf über die
IP wäre für Anmeldedaten ohne öffentlich vertrauenswürdiges TLS ungeeignet.

## Lokale Prüfung

### Passwort zurücksetzen über SMTP

Die App-Anmeldung bietet unter `/login` den Link „Passwort vergessen?“. Der
Versand wird aktiviert, sobald `SMTP_HOST` und `SMTP_FROM` in der Server-Datei
`.env.production` gesetzt sind. Zusätzlich `SMTP_USER` und `SMTP_PASSWORD`
mit den Zugangsdaten des vorhandenen Postfachs befüllen. Diese Werte gehören
nicht in Git und dürfen keinen `NEXT_PUBLIC_`-Präfix haben.

```dotenv
SMTP_HOST=smtp.example.at
SMTP_PORT=587
SMTP_SECURE=false
SMTP_REQUIRE_TLS=true
SMTP_USER=school@example.at
SMTP_PASSWORD=<Postfach- oder App-Passwort>
SMTP_FROM=School OS <school@example.at>
```

Port 587 verwendet STARTTLS. Für Port 465 `SMTP_SECURE=true` setzen. Die
Zertifikatsprüfung bleibt aktiv. `SMTP_REQUIRE_TLS=false` ist ausschließlich
für lokale SMTP-Testserver vorgesehen. `APP_URL` muss weiterhin die öffentliche
HTTPS-Origin enthalten, damit Links auf die richtige Domain verweisen.

Nach der Konfiguration den App-Container neu erstellen:
`docker compose --env-file .env.production -f compose.prebuilt.yaml up -d --force-recreate app`
(beim normalen Build `-f compose.prebuilt.yaml` weglassen). Codeänderungen
benötigen zuvor ein aktualisiertes Image.

Mit einem eigenen Konto unter `/forgot-password` eine Mail anfordern, auch den
Spam-Ordner prüfen, den Link öffnen und ein neues Passwort mit mindestens 12
Zeichen setzen. Der Link gilt 30 Minuten und kann nur einmal verwendet werden.
Bestehende Sitzungen werden danach widerrufen. Die Antwort bei der Anforderung
verrät nicht, ob ein Konto existiert. Ohne SMTP-Konfiguration zeigt die Seite
einen Hinweis auf den noch fehlenden Versand. Bei Versandfehlern erscheint eine
Meldung in den App-Logs; Rücksetz-Links und Zugangsdaten werden nicht protokolliert.

`npm run test:password-reset` prüft den gesamten Ablauf mit einer separaten
SQLite-Testdatenbank und einem lokalen SMTP-Empfänger. Dafür müssen Port 3002
und 2526 frei sein und Chromium für Playwright installiert sein. Alternativ
`PLAYWRIGHT_CHROMIUM_EXECUTABLE` auf eine vorhandene Chromium-Binärdatei setzen.

`npm ci`, `npm run migrate`, `npm run build`, `npm run lint` und
`npm run typecheck`. Die Migration verwendet `migrations/0001_auth.sql` und
führt sie über `scripts/migrate.mjs` nur einmal aus. Sie verändert keine
Supabase-Datenbank. `.env.local`, `.env.production` und `data/` sind ignoriert.

Beim ersten Login wird der bisherige lokale Workspace diesem Konto zugeordnet;
weitere Konten erhalten getrennte lokale Speicherbereiche. Fächer werden über
die bestehende Better-Auth-Sitzung geräteübergreifend synchronisiert, ohne einen
zusätzlichen Supabase-Login. Die Tabelle `synced_subjects` wird beim ersten
Abgleich automatisch in `AUTH_DATABASE_PATH` angelegt und liegt damit im
vorhandenen persistenten SQLite-Volume. Vorhandene Fächer auf jedem Gerät werden
zusammengeführt; neuere Änderungen und Löschungen bleiben beim Abgleich erhalten.
Nach dem Deployment die App auf beiden Geräten öffnen, damit die bisher lokal
gespeicherten Fächer hochgeladen werden. Sichtbare Tabs gleichen alle zehn
Sekunden sowie bei Änderungen, Fokus und erneuter Verbindung ab.

Die übrigen Workspace-Inhalte bleiben ohne das separat konfigurierte
Supabase-Setup lokal. Der Fächer-Abgleich wird mit zwei getrennten
Browser-Sitzungen und Account-Isolation geprüft:
`npx playwright test --config playwright.subject-sync.config.ts`.

## Fertigen Linux-Build auf die kleine Instanz übertragen

Auf der E2.1.Micro-Instanz mit 1 GB RAM dauert die Kompilierung wegen Swap sehr
lange. Alternativ den aktuellen Projektstand auf einem Linux-Rechner oder in
WSL mit Node 22 auf Linux x64 bauen und nur das Laufzeit-Image auf dem Server
erstellen. Der fertige Standalone-Build enthält die benötigten Abhängigkeiten:

```bash
npm ci --no-audit --no-fund
npm run migrate
AUTH_SECRET="$(openssl rand -hex 32)" npm run build
tar -czf school-os-next-runtime.tar.gz .next/standalone .next/static
```

Der Build muss zum übertragenen Quellcode und `package-lock.json` passen.
Öffentliche Supabase-Variablen bei Bedarf bereits vor dem Build setzen. Der
zufällige Build-Secret ersetzt nicht den eigenen Secret in `.env.production`.
Das vorgebaute Image verwendet wie der geprüfte lokale Build Node 22 und enthält
die native Linux-x64-Bibliothek für SQLite. Der normale Dockerfile baut und
betreibt die App durchgehend mit Node 24.

Das Archiv sowie `Dockerfile.prebuilt`, `Dockerfile.prebuilt.dockerignore` und
`compose.prebuilt.yaml` in das Projektverzeichnis auf dem Server übertragen.
Dort ausführen:

```bash
tar -xzf school-os-next-runtime.tar.gz
docker compose -f compose.yaml -f compose.prebuilt.yaml --env-file .env.production up -d --build
docker compose -f compose.yaml -f compose.prebuilt.yaml --env-file .env.production ps
```

Bei späteren Updates diesen Compose-Aufruf verwenden, solange der Build separat
übertragen wird. `.env.production` und die bestehenden Daten-Volumes behalten.
