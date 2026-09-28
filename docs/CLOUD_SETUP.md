# Cloud-Backend einrichten (Supabase)

Ohne diese Schritte läuft die App vollständig lokal; der Bereich
„Konto & Cloud“ in den Einstellungen zeigt dann einen Hinweis statt dem
Login. Es geht nichts kaputt – Login und Sync schalten sich erst mit
gesetzten Keys frei.

## 1. Supabase-Projekt anlegen

1. Auf [supabase.com](https://supabase.com) anmelden und ein neues Projekt
   erzeugen (Region am besten EU).
2. Das Projekt-Passwort sicher notieren (nur für die Datenbank nötig).

## 2. Datenmodell anwenden

1. Im Supabase-Dashboard zu **SQL Editor** wechseln.
2. Den Inhalt von `supabase/migrations/0001_foundation.sql` einfügen und
   **einmalig** ausführen (nicht idempotent – bei bestehendem Schema
   schlägt sie fehl).
3. Die Datei legt alle Tabellen, Row Level Security und den privaten
   `school-files`-Bucket an.

## 3. Keys eintragen

1. Unter **Project Settings → API** die Werte `Project URL` und
   `anon public` kopieren.
2. Lokal in `.env.local` setzen (Datei ist git-ignoriert):

```powershell
NEXT_PUBLIC_SUPABASE_URL=https://xyzcompany.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOi...
```

3. `npm run dev` neu starten (`.env.local` wird nur beim Start gelesen).
4. Auf Vercel dieselben zwei Variablen unter
   **Project → Settings → Environment Variables** hinterlegen und neu
   deployen.

## 4. Anmelden und syncen

- In der App zu **Einstellungen → Konto & Cloud**: Konto erstellen
  (E-Mail + Passwort, mindestens 6 Zeichen), danach anmelden.
- Bei der ersten Anmeldung werden alle lokalen Daten hochgeladen
  (Erstmigration). Danach läuft der Upload automatisch ca. 5 Sekunden
  nach jeder Änderung; „Jetzt synchronisieren“ holt zusätzlich den
  Stand anderer Geräte ab.
- Abmelden löscht nichts lokal – die App arbeitet offline weiter.

## Sync-Regeln (Kurzfassung)

- Eine Zeile pro Objekt-ID, neuester `updated_at`-Stempel gewinnt
  (bei Gleichstand bleibt die lokale Version).
- Gelöschte Objekte werden per Tombstone-Liste in der Cloud
  mitgelöscht und erscheinen nicht wieder.
- Fächer werden zuerst hochgeladen; Verweise auf unbekannte Fächer
  fallen auf „Inbox“ (null) zurück statt die Synchronisierung zu
  brechen.
- Demo-Stunden (`source: demo`) werden als `manual` übernommen.
- Der Chatverlauf entspricht genau einem Thread („Workspace-Chat“);
  das Profil wird aus der Cloud nur auf leere Profile übernommen.
- Whiteboard-Szenen und Dateiblobs liegen im privaten Storage-Bucket
  unter `<user-id>/…` (RLS-geschützt, 25 MB pro Datei wie lokal).

## Grenzen

- Ohne Keys: kein Login, kein Sync – alles bleibt lokal.
- Gleichzeitige Bearbeitung desselben Objekts auf zwei Geräten:
  letzter Upload gewinnt (kein Feld-Merge).
- E-Mail-Bestätigung hängt von den Supabase-Auth-Einstellungen ab;
  ist sie aktiv, nach „Konto erstellen“ erst die Mail bestätigen.
