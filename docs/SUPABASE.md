# Supabase verbinden

## Verbundene Cloud-Instanz

Am 30.09.2026 wurde das Projekt `schul-os` mit der URL
`https://vqpjynwhthjxijmdvjym.supabase.co` lokal in `.env.local` verbunden.
Die Foundation-Migration wurde über den SQL Editor erfolgreich angewendet.
`npm run supabase:check` bestätigt Auth und die Erreichbarkeit aller elf Tabellen
ohne sichtbare Zeilen für unangemeldete Zugriffe. Die Site URL ist
`https://os.digmio.app`; `http://127.0.0.1:3000` ist als Redirect erlaubt.

Die SQL-Editor-Ausführung schreibt keine CLI-Migrationshistorie. Bevor dieses
Projekt erstmals per CLI migriert wird, nach `supabase link` den vorhandenen
Stand mit `npx supabase migration repair 0001 --status applied` markieren;
die Foundation nicht erneut ausführen. Neue Instanzen folgen den Schritten unten.
Die produktive App auf `https://os.digmio.app` wurde mit den öffentlichen
Supabase-Variablen neu gebaut und auf Oracle veröffentlicht. Die vorherige
Image-Version ist als `school-os-app:before-supabase-20260930` gesichert;
die vorherige Server-Konfiguration liegt als `.env.production.before-supabase-*`
im Server-Projektverzeichnis. Ein vollständiger Login-/Sync-Test mit zwei Konten
steht noch aus.

Supabase übernimmt die optionale Cloud-Synchronisierung und den privaten Dateispeicher.
Die Anmeldung am School-OS-Server bleibt bei Better Auth/SQLite. Danach wird unter
**Einstellungen → Konto** ein eigenes Supabase-Konto verbunden. Beide Konten sind
derzeit unabhängig; vorhandene Server-Konten werden nicht automatisch übertragen.

## Cloud-Projekt

1. Ein Supabase-Projekt anlegen oder ein vorhandenes, leeres Projekt auswählen.
2. Unter **Connect** die Projekt-URL und den öffentlichen Publishable-Key kopieren.
   In der ignorierten `.env.local` ergänzen, bestehende Werte behalten:

   ```dotenv
   NEXT_PUBLIC_SUPABASE_URL=https://<projekt-ref>.supabase.co
   NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY=sb_publishable_...
   ```

   Alternativ unterstützt die App weiterhin `NEXT_PUBLIC_SUPABASE_ANON_KEY`.
   Niemals einen Secret- oder Service-Role-Key als `NEXT_PUBLIC_` hinterlegen.

3. Die CLI ist als Entwicklungsabhängigkeit installiert. Im Projektordner:

   ```powershell
   npx supabase login
   npx supabase link --project-ref <projekt-ref>
   npm run supabase:push -- --dry-run
   npm run supabase:push
   ```

   Die CLI fragt den erforderlichen Zugang interaktiv ab. Zugangstoken und
   Datenbankpasswort nicht in Git speichern. Die Migration erstellt 11 Tabellen,
   nutzerbezogene RLS-Regeln und den privaten Bucket `school-files` (25 MiB pro Datei).
   Bei bestehenden Tabellen zuerst den Dry-Run und die Migrationshistorie prüfen;
   keinen Remote-Reset ausführen.

4. In **Authentication → URL Configuration** die **Site URL** auf die genaue
   App-Adresse setzen, lokal `http://127.0.0.1:3000`. Dieselbe Adresse als erlaubte
   Redirect-URL eintragen. Für das Deployment die tatsächliche HTTPS-Adresse nutzen.
   In **Authentication → Providers** E-Mail/Passwort aktivieren. Bei aktiver
   E-Mail-Bestätigung muss der Benutzer vor dem Anmelden die E-Mail bestätigen.

5. `npm run supabase:check` ausführen und den Entwicklungsserver neu starten.
   Für Produktion die Werte beim Build setzen und das Image neu bauen:

   ```sh
   docker compose --env-file .env.production up -d --build
   ```

   Bei vorgebauten Images müssen die Werte bereits vor `npm run build` vorliegen.
   Next.js bindet öffentliche Umgebungsvariablen beim Build in den Browser-Code ein.

## Funktionsprüfung

Vor dem ersten Sync den Workspace unter **Daten & Sicherung** exportieren.
Unter **Einstellungen → Konto** ein Supabase-Konto erstellen und anmelden.
Eine Notiz, Aufgabe, Datei und ein Whiteboard anlegen, dann **Jetzt synchronisieren**.
Mit demselben Server- und Cloud-Konto in einem zweiten Browser prüfen, ob die Inhalte
einschließlich Dateiinhalten und Whiteboard erscheinen. Mit einem zweiten Cloud-Konto
prüfen, dass die Daten des ersten Kontos über die Supabase-API nicht lesbar sind.

`supabase:check` ist ein schreibfreier Verbindungstest: Auth, öffentliche API und
Tabellen-Erreichbarkeit sowie keine sichtbaren Zeilen ohne Anmeldung. Leere Tabellen
beweisen keine vollständige RLS-Isolation. Storage-Policies und authentifizierte
Schreibzugriffe müssen zusätzlich mit den obigen Schritten geprüft werden.

## Lokale Supabase-Instanz

Mit laufendem Docker Desktop: `npm run supabase:start`. Dann
`npx supabase status` verwenden und die lokale URL sowie den öffentlichen Key in
`.env.local` setzen. Die CLI wendet Migrationen beim ersten Start an. Diese Instanz
ist unabhängig von Supabase Cloud. `npm run supabase:stop` beendet sie.

Referenzen: [Supabase API-Keys](https://supabase.com/docs/guides/getting-started/api-keys),
[Datenbankmigrationen](https://supabase.com/docs/guides/deployment/database-migrations).
