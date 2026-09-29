# School OS auf einer bestehenden Oracle-Instanz

## In Oracle am 29. September 2026 geprüft

Die angemeldete Tenancy `nnixnutz` hat in der einzigen angezeigten Home-Region
Frankfurt im Root-Compartment aktuell **keine Compute-Instanz**. Drei alte
Boot-Volumes sind weiterhin **Available / Always Free**: `hermes-mai` (50 GB,
AD 1, Oracle Linux 9.7 ARM), `instance-20260527-1541` (50 GB, AD 1) und
`hermes` (47 GB, AD 3, Oracle Linux 9.7 x86). `hermes-mai` ist nicht an eine
Instanz angeschlossen. Für dieses Volume ist keine Backup-Policy gesetzt;
Oracle zeigte keinen frischen Backup.

Drei VCNs sind vorhanden. `vcn-20260527-1514` wurde zeitnah zum Boot-Volume
erstellt und enthält ein öffentliches Subnetz `10.0.0.0/24`. Seine Standard-
Security-List öffnet eingehend TCP 22 und ICMP; TCP 80 und 443 sind noch nicht
offen. Eine Zuordnung dieses VCN zum früheren Server ist damit nicht bewiesen.
Im Root-Compartment ist keine reservierte öffentliche IPv4-Adresse vorhanden.

Die Oracle-Oberfläche bietet eine neue A1-Flex-Instanz **aus dem erhaltenen
Boot-Volume** an. Der Entwurf schlug 1 OCPU und 6 GB RAM vor. Bei 12 GB zeigte
Oracle einen kritischen Kontolimit-Hinweis. Im Shape-Dialog zeigte die Detail-
ansicht dazu **0 von 12 GB** RAM und **0 von 2** A1-OCPUs belegt. Die
eigenständige Limits-Seite lieferte einen Fehler.

Ein späterer Startversuch mit 2 OCPUs/12 GB aus `hermes-mai` in AD 1 wurde
von Oracle mit `Out of capacity for shape VM.Standard.A1.Flex` abgelehnt.
Ein zweiter Versuch mit 1 OCPU/6 GB in AD 1 erhielt denselben Fehler.
In AD 2 kann das Volume wegen seiner Bindung an AD 1 nicht verwendet werden;
Oracle würde ein neues Boot-Volume anlegen und zeigte dafür eine Schätzung
von **1,85 €/Monat**. Die Schätzung berücksichtigt laut Oracle keine Tier-
Preise. Wegen der angezeigten möglichen Kosten wurde diese VM nicht gestartet.
Das vorhandene Volume `hermes` in AD 3 führt zu einer E2.1.Micro-Instanz und
ist daher keine Wiederherstellung der A1/12-GB-Konfiguration. Keiner der
Entwürfe wurde gespeichert; es wurde keine neue Instanz angelegt und keine
Ressource gelöscht.

Das erhaltene Boot-Volume **nicht terminieren oder formatieren**. Ein
Neuaufsetzen des Betriebssystems ist ebenfalls nicht Teil dieser Anleitung.
Vor Änderungen an der Cloud mögliche Kosten für ein Boot-Volume-Backup prüfen.
Falls dort Daten liegen, die betroffenen Anwendungsdaten vor einer Installation
sichern.

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

`npm ci`, `npm run migrate`, `npm run build`, `npm run lint` und
`npm run typecheck`. Die Migration verwendet `migrations/0001_auth.sql` und
führt sie über `scripts/migrate.mjs` nur einmal aus. Sie verändert keine
Supabase-Datenbank. `.env.local`, `.env.production` und `data/` sind ignoriert.

Der vorhandene Workspace speichert Inhalte weiterhin im Browser. Beim ersten
Login wird der bisherige lokale Workspace diesem Konto zugeordnet; weitere
Konten erhalten getrennte lokale Speicherbereiche. Für geräteübergreifende
Synchronisierung muss das bisherige Supabase-Setup separat konfiguriert werden.
