# Architektur und Ausbauplan

## Laufendes MVP

Next.js 16 App Router mit React 19 und TypeScript. Eine clientseitige Workspace-Oberfläche, Features in separaten Modulen. Tiptap, Excalidraw und KI-Chat werden dynamisch geladen. Tailwind ist verfügbar; das konsistente Designsystem liegt in `src/app/globals.css`.

Zustand hält Metadaten, Fächer, Notizen, Aufgaben, Prüfungen und Chat. Die versionierte LocalStorage-Persistenz ist bewusst eine erste lokale Implementierung. Große Binärdaten und Canvas-Szenen liegen in IndexedDB (`idb-keyval`). Canvas speichert Änderungen nach 400 ms, mit abschließendem Flush beim Ansichtswechsel. Bei hartem Browserabbruch können Änderungen innerhalb dieses Fensters verloren gehen. Der UI-Status unterscheidet Speichern und gespeichert. Offline bearbeiten funktioniert in einer bereits geladenen App; ein Offline-Kaltstart ohne Server/Service Worker ist noch nicht unterstützt.

Das Backend enthält `/api/chat`. Es prüft Herkunft, Größe, Zod-Schema und ein Prozesslimit von 10 Anfragen pro Minute. Der Server ist standardmäßig nur an 127.0.0.1 gebunden. Die Host-/Origin-Prüfung ist ein lokaler CSRF-Schutz, keine Nutzer-Authentifizierung. Vor öffentlichem Betrieb sind echte Authentifizierung, nutzerbezogene Limits und ein geteilter Limiter zwingende technische Voraussetzungen.

## Provider-Grenzen

`LLMProvider` abstrahiert Chat, Streaming, Modellliste und optionale Fähigkeiten Vision/Embeddings. `GroqProvider` ist server-only und verwendet den OpenAI-kompatiblen HTTP-Endpunkt. Nicht unterstützte Fähigkeiten sind optional, statt leere Ergebnisse vorzutäuschen. Das Modell wird über `GROQ_MODEL` konfiguriert. Standard: `openai/gpt-oss-20b`, am 28.09.2026 in Groqs Free-Plan-Tabelle aufgeführt. Kostenfreiheit hängt vom Groq-Kontotarif ab; es gibt keinen bezahlten Fallback und keine Kontotarif-Erkennung.

Chat sendet Verlauf (maximal 20 Nachrichten), explizit ausgewählten Text und auf Wunsch bis zu fünf per Stichwort bewertete Notiz-Chunks. Kein Embedding-RAG und keine PDF-OCR. Fehlgeschlagene Antworten werden nicht als erfolgreiche Nachrichten gespeichert. Kontext wird im UI angegeben. KI kann keine Daten automatisch verändern. Notiz-/Canvas-Übernahme braucht einen ausdrücklichen Klick.

`SchoolIntegration` kapselt Authentifizierung und normalisierte Stundenpläne. Die konkrete API ist nicht quer im UI bekannt. Eine Capability-Liste erlaubt künftig nur tatsächlich unterstützte Funktionen anzubieten. Es gibt derzeit keinen Live-WebUntis-Adapter. Demo-Stunden stammen ausschließlich aus dem expliziten Demo-Onboarding.

## Datenmodell

Alle lokalen Objekte besitzen UUIDs; veränderliche Objekte haben Erstellungs- und Änderungszeit. Subject-IDs verknüpfen Fächer, Notizen, Aufgaben, Canvas, Dateien, Prüfungen und Lernkarten. Eine leere Zuordnung bedeutet Inbox.

`supabase/migrations/0001_foundation.sql` ist ein **vorbereiteter, noch nicht angewendeter** Supabase-Entwurf. Nutzer gehören zu `auth.users`; Fach-Fremdschlüssel beziehen die Nutzer-ID mit ein. Row Level Security ist auf allen Tabellen aktiv. Private Storage-Objekte nutzen einen Nutzer-ID-Prefix. Es existiert noch kein produktiver Supabase-Client und kein Cloud-Abgleich. Die Migration muss vor Einsatz in einer Staging-Instanz getestet werden.

## Nächste Phasen

1. Supabase Auth, serverseitige Sitzungen, private Storage-Uploads, getestete Migrationen, Sync-Konflikte und sichere Migration lokaler Daten.
2. Notiz-/Canvas-Versionen, vollständiger Import, PDF-Extraktion, Annotationen, Text-/Bild-Blöcke, bessere Recherche und Volltextsuche.
3. OpenRouter und weitere Provider, verschlüsselte nutzerbezogene Keys, Routing nach nachweisbaren Fähigkeiten und Tarif, Vision, Chat-Verzweigungen.
4. WebUntis-Adapter erst nach Prüfung der konkreten Schulschnittstelle und ihrer Berechtigungen. Keine Passwörter im Browser speichern.
5. Quiz, Lernpläne, Spaced Repetition, PWA/Offline-Kaltstart, Desktop-Verpackung und geräteübergreifender Sync.

## Quellen

- [Groq Modelle](https://console.groq.com/docs/models)
- [Groq Free-Plan-Limits](https://console.groq.com/docs/rate-limits)
- [Untis Hilfe](https://help.untis.at/)
- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers)

Die ursprünglichen Anforderungen stehen unverändert in `PRODUCT_SPEC.md`. Diese Liste ist eine Roadmap, keine Behauptung, dass alle dort genannten Funktionen bereits implementiert sind.
