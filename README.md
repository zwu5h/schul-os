# School OS

Ein ruhiger Workspace für den Schulalltag. Lokales MVP mit Next.js 16, React 19, TypeScript, Zustand, Tiptap und Excalidraw.

## Starten

```powershell
npm ci
Copy-Item .env.example .env.local
# GROQ_API_KEY in .env.local eintragen, niemals in Git
npm run dev
```

Öffnen: http://127.0.0.1:3000. Node.js 24 empfohlen. Der Server bindet standardmäßig nur an die lokale Loopback-Adresse. Für den lokalen Rechner ist der bereitgestellte Groq-Key bereits in der ignorierten `.env.local` hinterlegt; ein neuer Clone enthält ihn nicht.

## Funktionierendes MVP

- Onboarding mit optionalen, ausdrücklich markierten Demo-Daten
- Dashboard, Fächer, Inbox-Zuordnung, Aufgabenstatus und Fälligkeiten
- Tiptap-Notizen mit Formatierung, Autosave, Löschung und Text-Export
- Excalidraw-Canvas mit Zeichnen, Text, Shapes, Bildern und IndexedDB-Speicherung
- Canvas-Textauswahl und Notiztext an die KI übergeben
- Lokale Datei-Uploads, Drag-and-drop, Bild-/PDF-Vorschau, TXT-/Markdown-Kontext
- Wochenkalender mit Aufgaben, Demo-Stunden und eigenen Prüfungen
- Lernkarten mit Umdrehen und Gelernt-Status
- Groq-Streaming-Chat, Markdown/LaTeX, Abbruch, KI-Ausgabe als Notiz oder Canvas
- Optionale Stichwortsuche in Notiz-Chunks für KI-Kontext
- Suche/Navigation mit Ctrl/Cmd+K, Quick Capture, Light/Dark Mode
- Vollständiger JSON-Backup-Export inklusive Canvas und Dateiinhalten
- Responsive Oberfläche und lokale Speicherung nach Neuladen
- Fächer-Synchronisierung zwischen Geräten über den bestehenden School-OS-Account, inklusive Übernahme vorhandener lokaler Fächer

## Groq

Standardmodell: `openai/gpt-oss-20b`. Es ist am 28.09.2026 in der [offiziellen Free-Plan-Tabelle](https://console.groq.com/docs/rate-limits) aufgeführt. Der Tarif des Groq-Kontos bestimmt, ob Anfragen kostenlos sind. Es gibt keine automatische Umstellung auf kostenpflichtige Modelle. Free-Plan-Limits werden als verständliche Fehler angezeigt. Der Modellname ist über `GROQ_MODEL` konfigurierbar.

Der Key bleibt serverseitig. Die API validiert Herkunft und Eingaben und begrenzt Anfragen. Nachrichten und expliziter Kontext gehen an Groq. Bildanalyse wird mit diesem Textmodell nicht angeboten.

## Grenzen und nächste Phasen

Dies ist das erste MVP, nicht die komplette 70-Punkte-Roadmap. Supabase Auth und Cloud-Sync sind angebunden; ein vollständiger Sync-Test mit zwei Konten steht noch aus. Verschlüsselte Keys pro Benutzer, weitere KI-Provider, PDF-Textextraktion/OCR, Quiz, Versionsverlauf, Backup-Import und PWA-Offline-Kaltstart sind noch nicht implementiert. Nicht verbundene Integrationen werden als solche angezeigt. Lokale Daten sind an Browser und Origin gebunden: `localhost` und `127.0.0.1` haben getrennte Speicher.

Die Supabase-Instanz `schul-os` ist verbunden; die Datenbankmigration mit RLS und privatem Storage wurde angewendet. Der Verbindungstest `npm run supabase:check` ist erfolgreich. Einrichtung und Funktionsprüfung: [Supabase](docs/SUPABASE.md). Die Server-Anmeldung und das Supabase-Konto für Cloud-Sync sind derzeit getrennt.

[Architektur und Phasen](docs/ARCHITECTURE.md) · [Originalanforderungen](docs/PRODUCT_SPEC.md)

## Prüfen

```powershell
npm run typecheck
npm run lint
npm run build
npx playwright install chromium
npm run test:e2e
```

Optional kann `PLAYWRIGHT_CHROMIUM_EXECUTABLE` auf einen bereits installierten Chromium-Browser zeigen. Die E2E-Tests prüfen Speicherung, Canvas, Upload, Chat-Streaming, mobile Navigation und API-Eingaben. Chat-Ausgaben werden in CI simuliert, damit keine echten API-Keys oder Kosten nötig sind. Ein echter Groq-Aufruf wurde zusätzlich lokal erfolgreich geprüft.

## GitHub-Sicherung

Fertige, geprüfte Zwischenstände zeitnah committen und pushen, nicht bis zum Nutzungslimit warten. `.env.local`, Node-Abhängigkeiten, Build-Ausgaben und Testartefakte bleiben ausgeschlossen. Die CI-Vorlage liegt in docs/github-actions-checks.yml. Der vorhandene GitHub-Zugang besitzt keinen Workflow-Scope; die Vorlage kann später mit passender Berechtigung nach .github/workflows/checks.yml verschoben werden.

