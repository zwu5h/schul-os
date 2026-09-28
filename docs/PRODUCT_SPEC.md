# Projekt: Ultimate School OS

Baue eine moderne, extrem schnelle und visuell hochwertige Web-/Desktop-App für Schüler. Die App soll Notizen, Whiteboard/Canvas, Schulorganisation, WebUntis, Dateien, Aufgaben, Kalender und eine integrierte KI in einer einzigen Oberfläche kombinieren.

Das Ziel ist keine normale Notiz-App, sondern ein persönliches **School Operating System**.

Die App soll sich ungefähr wie eine Mischung aus:

- Notion
- Apple Freeform
- Obsidian
- GoodNotes
- WebUntis
- ChatGPT
- Linear

anfühlen, aber speziell für Schule optimiert sein.

---

# 1. TECH STACK

Verwende einen modernen, wartbaren Stack.

Bevorzugt:

Frontend:
- Next.js mit App Router
- TypeScript
- React
- Tailwind CSS
- shadcn/ui
- Lucide Icons

State Management:
- Zustand

Backend:
- Next.js Server Actions / API Routes
- Supabase oder PostgreSQL

Authentication:
- Supabase Auth

Storage:
- Supabase Storage oder kompatibler Object Storage

Canvas:
- bevorzugt tldraw
- alternativ Excalidraw, falls bestimmte benötigte Features damit leichter umsetzbar sind

Rich Text:
- Tiptap

AI:
- eigene Provider-Abstraction
- OpenRouter
- Groq
- optional lokale/OpenAI-kompatible APIs

Die AI-Architektur darf NICHT fest an einen Anbieter gekoppelt sein.

Erstelle ein Interface wie:

LLMProvider
- chat()
- stream()
- vision()
- embeddings()
- models()

Dadurch sollen später beliebige Anbieter hinzugefügt werden können.

---

# 2. DESIGN

Die App soll extrem clean aussehen.

Designrichtung:

- minimalistisch
- modern
- schwarz/weiß/grau als Grunddesign
- Dark Mode und Light Mode
- sehr wenig visuelles Clutter
- weiche Animationen
- große Arbeitsfläche
- responsive
- Desktop-first, aber auch auf Tablet sehr gut bedienbar

Orientierung:

Linear + Notion + ChatGPT + Apple Freeform.

Keine unnötigen bunten Elemente.

Fächer dürfen jedoch individuelle Accent Colors bekommen.

---

# 3. HAUPTLAYOUT

Die App besteht aus drei Hauptbereichen.

## Sidebar

Links eine einklappbare Sidebar.

Beispiel:

Home

Heute

Kalender

Aufgaben

AI

Fächer
- Mathematik
- Deutsch
- Englisch
- Geographie
- Geschichte
- Physik
- Chemie
- Informatik
- + Fach hinzufügen

Canvas

Dateien

Suche

WebUntis

Einstellungen

---

# 4. FÄCHER

Der Nutzer kann beliebig viele Fächer erstellen.

Jedes Fach besitzt:

- Name
- Farbe
- Icon
- Lehrer
- Raum
- Notizen
- Canvas Boards
- Dateien
- Aufgaben
- Prüfungen
- Termine
- AI-Kontext

Beispiel:

Mathematik

Übersicht

Notizen

Canvas

Aufgaben

Dateien

Prüfungen

AI

Alle Inhalte innerhalb eines Fachs sollen automatisch miteinander verknüpft sein.

Wenn ich beispielsweise im Mathematik-Fach die AI öffne, soll die AI automatisch Zugriff auf relevante Mathematik-Notizen und Dateien haben.

---

# 5. INFINITE CANVAS

Eines der wichtigsten Features ist ein Infinite Canvas.

Der Nutzer soll darauf frei arbeiten können.

Unterstütze:

- Text
- Rich Text
- Bilder
- Screenshots
- PDFs
- Dateien
- Links
- YouTube Links
- Webseiten
- Tabellen
- Sticky Notes
- Shapes
- Pfeile
- Freihandzeichnen
- Textmarker
- Formeln
- Code Blocks
- Checklisten

Alles soll frei:

- verschiebbar
- skalierbar
- gruppierbar
- verbindbar
- kopierbar
- löschbar

sein.

---

# 6. COPY & PASTE

Copy/Paste muss extrem gut funktionieren.

Ich soll beispielsweise:

- Text von Webseiten kopieren
- Bilder einfügen
- Screenshots einfügen
- PDFs hineinziehen
- Links hineinziehen
- Dateien hineinziehen

können.

Die App soll erkennen, was eingefügt wurde.

Beispiel:

YouTube-Link → YouTube Embed

Website → Link Preview

Bild → Bildkarte

PDF → PDF Preview

Text → Textblock

---

# 7. DRAG & DROP

Implementiere globales Drag & Drop.

Ich soll Dateien direkt aus Windows/macOS in:

- ein Fach
- einen Canvas
- eine Notiz
- AI Chat

ziehen können.

Die Datei wird gespeichert und automatisch dem aktuellen Kontext zugeordnet.

---

# 8. AI ASSISTENT

Die App besitzt einen eingebauten AI-Assistenten.

Der Nutzer soll zwischen verschiedenen Modellen wechseln können.

Beispiele:

Groq

OpenRouter

lokale Modelle

OpenAI-kompatible APIs

---

# 9. AI PROVIDER SETTINGS

Unter:

Settings → AI

kann der Nutzer eigene API Keys eingeben.

Beispiel:

Groq API Key

OpenRouter API Key

Custom API URL

Custom API Key

Keys niemals unverschlüsselt im Client speichern.

Verwende sichere serverseitige Speicherung bzw. geeignete Verschlüsselung.

---

# 10. AI KOSTENOPTIMIERUNG

Die App soll möglichst billig betrieben werden können.

Implementiere automatisches Model Routing.

Beispiel:

kleine Aufgaben:
→ kostenloses/sehr günstiges Modell

Zusammenfassungen:
→ günstiges schnelles Modell

komplexes Reasoning:
→ besseres Modell

Bilder:
→ Vision Model

Der Nutzer kann auswählen:

AUTO

FAST

SMART

CHEAP

FREE ONLY

Bei AUTO entscheidet die App anhand der Aufgabe.

Zeige optional:

- verwendetes Modell
- Tokens
- geschätzte Kosten

---

# 11. AI CHAT

AI Chat ähnlich ChatGPT.

Features:

- Streaming
- Markdown
- Code Blocks
- LaTeX
- Bilder
- Dateien
- PDFs
- Tabellen
- Copy Button
- Regenerate
- Edit Message
- Branch Conversation

Zusätzlich:

@Mathematik

@Deutsch

@Canvas

@Notiz

@PDF

@Aufgabe

Der Nutzer soll Kontext explizit referenzieren können.

Beispiel:

"@Mathematik erklär mir die Sachen aus den letzten zwei Wochen."

---

# 12. AI SIDEBAR

Die AI soll außerdem jederzeit über eine rechte Sidebar erreichbar sein.

Beispielsweise:

Canvas links / Mitte

AI rechts.

Ich kann Elemente auf dem Canvas auswählen und fragen:

"Erklär mir das."

"Fasse das zusammen."

"Mach daraus Lernkarten."

"Löse die Aufgabe."

"Erstelle ähnliche Übungen."

---

# 13. CANVAS + AI

Besonders wichtig:

Man kann Canvas-Elemente auswählen und direkt an die AI schicken.

Beispiel:

Ich markiere:

- ein Bild
- drei Textfelder
- einen PDF-Ausschnitt

und drücke:

Ask AI

Die AI erhält genau diese Inhalte als Kontext.

---

# 14. AI ACTION MENU

Wenn Text ausgewählt wird:

kleines Kontextmenü anzeigen:

Ask AI

Explain

Summarize

Rewrite

Create Flashcards

Create Quiz

Find mistakes

Translate

Create Notes

Create Practice Questions

---

# 15. AI OUTPUT → CANVAS

AI-Ergebnisse sollen per Button direkt als Canvas-Element eingefügt werden können.

Beispiel:

AI erstellt:

"Quadratische Funktionen Zusammenfassung"

→ Add to Canvas

Dadurch entsteht automatisch eine formatierte Karte.

---

# 16. SCREENSHOT / BILD ANALYSE

Ich soll einen Screenshot einer Schulaufgabe einfügen können.

AI erkennt:

- Text
- Aufgaben
- Diagramme
- Formeln

Danach kann ich fragen:

"Erklär Aufgabe 4."

oder:

"Löse Aufgabe 4 Schritt für Schritt."

---

# 17. PDF SUPPORT

PDFs sind ein zentrales Feature.

Unterstütze:

- PDF Upload
- PDF Viewer
- Seiten-Navigation
- Suche
- Text Extraction
- AI Chat mit PDF
- Seiten als Canvas-Element
- Markierungen
- Kommentare

Ich soll beispielsweise schreiben können:

"Fasse Seite 20–35 zusammen."

---

# 18. RAG / SCHOOL KNOWLEDGE BASE

Erstelle ein einfaches Retrieval-System.

Dateien und Notizen werden:

- geparst
- in sinnvolle Chunks zerlegt
- mit Metadata gespeichert
- optional embedded

Metadata:

user_id

subject_id

document_id

type

date

page

source

Die AI soll nur relevante Inhalte laden.

NICHT jedes Dokument bei jeder Anfrage vollständig in den Prompt schicken.

---

# 19. GLOBAL SEARCH

Implementiere Command Search mit:

CTRL/CMD + K

Suche über:

- Fächer
- Notizen
- Canvas Boards
- Dateien
- Aufgaben
- Lehrer
- AI Chats
- Termine

Optional semantische Suche.

Beispiel:

"Quadratische Gleichungen"

liefert:

Mathematik Notiz

PDF Seite

Canvas Element

AI Chat

Aufgabe

---

# 20. WEBUNTIS

Implementiere ein WebUntis Integration Layer.

WICHTIG:

Recherchiere zuerst die aktuell verfügbaren Möglichkeiten zur WebUntis-Integration und verwende möglichst offizielle bzw. dokumentierte Schnittstellen.

Kopple die restliche App nicht direkt an eine konkrete WebUntis-API.

Erstelle stattdessen:

WebUntisProvider

mit beispielsweise:

authenticate()

getTimetable()

getLessons()

getTeachers()

getRooms()

getHomework()

getExams()

getAbsences()

getSchoolYear()

getChanges()

Je nach tatsächlich verfügbarer API müssen nur unterstützte Funktionen implementiert werden.

Keine Funktionen vortäuschen, die die verwendete Schnittstelle nicht unterstützt.

---

# 21. WEBUNTIS LOGIN

Unter:

Settings → Integrations → WebUntis

soll der Nutzer die notwendigen Daten hinterlegen können.

Beispielsweise:

Schule

Benutzername

Passwort / Token / Session

abhängig von der tatsächlich unterstützten Authentifizierungsmethode.

Credentials sicher speichern.

Niemals Credentials im Frontend loggen.

---

# 22. WEBUNTIS SYNC

Synchronisiere relevante Daten regelmäßig:

- Stundenplan
- Raumänderungen
- Lehreränderungen
- Entfall
- Vertretung
- Prüfungen
- Hausaufgaben
- relevante Termine

Zeige den letzten Sync-Zeitpunkt.

Button:

Sync now

---

# 23. HEUTE DASHBOARD

Home soll primär als "Today Dashboard" funktionieren.

Zeige:

Guten Morgen

Montag, 28. September

Nächste Stunde

Mathematik
08:00–08:50
Raum 204

Danach:

HEUTE

08:00 Mathematik

08:55 Englisch

09:50 Deutsch

...

Außerdem:

Aufgaben heute

Prüfungen

Offene To-Dos

AI Vorschläge

---

# 24. SMART DASHBOARD

Das Dashboard soll automatisch priorisieren.

Beispiel:

Morgen Mathematik-Test

Deutsch-Hausübung heute fällig

Geographie-Präsentation in 3 Tagen

Englisch-Vokabeltest nächste Woche

AI darf daraus Vorschläge generieren:

"Du hast morgen einen Mathematik-Test. Möchtest du einen 20-Minuten-Lernplan?"

---

# 25. KALENDER

Eigener Kalender.

Views:

Day

Week

Month

School Week

Datenquellen:

WebUntis

eigene Aufgaben

Prüfungen

persönliche Termine

Später optional:

Google Calendar

Apple Calendar / CalDAV

Microsoft Calendar

Farblich nach Quelle unterscheiden.

---

# 26. AUFGABEN

Task Management speziell für Schule.

Eine Aufgabe besitzt:

title

description

subject

due_date

priority

status

estimated_time

attachments

source

Status:

Todo

In Progress

Done

Optional AI-Unterstützung:

"Plane meine Hausaufgaben für heute."

---

# 27. PRÜFUNGEN

Eigener Exam Bereich.

Prüfung:

subject

date

topics

teacher

notes

materials

preparation_status

Die AI kann aus den vorhandenen Materialien einen Lernplan erstellen.

Beispiel:

Mathe-Schularbeit

in 8 Tagen

Themen:

Quadratische Funktionen

Ableitungen

Kurvendiskussion

Button:

Generate study plan

---

# 28. LERNMODUS

Aus Notizen, PDFs oder Canvas-Inhalten:

Generate:

- Flashcards
- Multiple Choice Quiz
- offene Fragen
- True/False
- Übungsaufgaben
- Prüfungs-Simulation

---

# 29. FLASHCARDS

Flashcards sollen gespeichert werden können.

Features:

Front

Back

Subject

Source

Difficulty

Known / Learning

Optional später:

Spaced Repetition ähnlich Anki.

---

# 30. QUIZ MODE

Interaktiver Quizmodus.

Nach jeder Antwort:

- richtig/falsch
- Erklärung
- relevante Quelle
- Fortschritt

Am Ende:

Score

Schwächen

Empfehlungen

---

# 31. NOTES

Neben dem Canvas soll es klassische Dokument-Notizen geben.

Block-basierter Editor.

Unterstütze:

Text

Headings

Lists

Todo

Callouts

Images

Files

Tables

Math

Code

Quotes

Embeds

---

# 32. QUICK CAPTURE

Globale Tastenkombination:

CTRL/CMD + SHIFT + SPACE

öffnet Quick Capture.

Dort kann ich sofort:

- Notiz schreiben
- Screenshot einfügen
- Aufgabe hinzufügen
- Datei speichern
- AI fragen

Danach auswählen:

Mathematik

Deutsch

Englisch

Inbox

etc.

---

# 33. INBOX

Alles, was noch keinem Fach zugeordnet ist, landet in:

Inbox

AI kann optional Vorschläge machen:

"Dieses Dokument sieht nach Mathematik aus."

[Mathematik zuordnen]

---

# 34. VERKNÜPFUNGEN

Alle Objekte sollen miteinander verknüpft werden können.

Beispielsweise:

Mathematik-Test

enthält:

→ Canvas "Kurvendiskussion"

→ PDF "Kapitel 4"

→ Notiz "Ableitungsregeln"

→ 23 Flashcards

→ 12 Übungsaufgaben

Dadurch entsteht ein persönlicher Knowledge Graph.

---

# 35. COMMAND PALETTE

CTRL/CMD + K

Commands:

New Canvas

New Note

New Task

Ask AI

Upload File

Open Subject

Search

Today's Schedule

Sync WebUntis

Toggle Dark Mode

---

# 36. KEYBOARD-FIRST

Die Desktop-Version soll sehr gut komplett per Tastatur bedienbar sein.

Beispiele:

C → Canvas

N → Note

T → Task

A → AI

/ → Commands

CMD/CTRL + K → Search

---

# 37. OFFLINE SUPPORT

Die wichtigsten Features sollen möglichst offline funktionieren:

- Notizen
- Canvas
- Aufgaben
- gespeicherte Dateien
- letzter Stundenplan

Änderungen lokal speichern und später synchronisieren.

AI und WebUntis benötigen natürlich Internet.

---

# 38. DATENSCHUTZ

Die App ist für Schüler gedacht und muss deshalb datenschutzfreundlich gebaut werden.

Beachte insbesondere DSGVO.

Grundprinzipien:

- möglichst wenig personenbezogene Daten
- keine unnötige Telemetrie
- keine Weitergabe von Daten ohne klare Notwendigkeit
- verschlüsselte Kommunikation
- sichere Credential-Verwaltung
- Möglichkeit zum Account-Export
- Möglichkeit zum Löschen aller Daten

AI Provider dürfen nicht automatisch sämtliche Schuldaten erhalten.

Nur Daten senden, die für die konkrete Anfrage notwendig sind.

---

# 39. AI PRIVACY MODE

Implementiere:

AI Privacy Mode

Optionen:

Standard

Strict

Strict bedeutet:

- keine automatischen Kontextdaten
- Nutzer muss Dokumente explizit auswählen
- sensible Felder entfernen
- nur ausgewählte Inhalte an AI Provider schicken

---

# 40. MODEL MANAGER

Settings → AI → Models

Zeige:

Provider

Model

Context Window

Vision Support

ungefähre Kosten

Aktiv

Favorit

Der Nutzer kann mehrere Modelle definieren.

---

# 41. MODEL ROUTING

Implementiere eine Router-Funktion:

selectModel(task)

Beispiele:

classification
→ sehr günstiges Modell

simple_summary
→ günstiges Modell

OCR_analysis
→ Vision Model

complex_reasoning
→ leistungsfähigeres Modell

chat
→ Standardmodell

User Settings müssen das überschreiben können.

---

# 42. FREE MODEL SUPPORT

Da die App für Schüler gedacht ist, soll sie besonders gut mit kostenlosen oder extrem günstigen Modellen funktionieren.

Unterstütze deshalb dynamische Model-Konfiguration.

Keine Modellnamen hart in Business Logic einbauen.

Der Nutzer kann beispielsweise über OpenRouter neue Modelle hinzufügen, ohne die App ändern zu müssen.

---

# 43. IMPORT

Unterstütze Import von:

PDF

DOCX

TXT

Markdown

Bildern

PowerPoint

optional:

Notion Export

Obsidian Vault

GoodNotes PDFs

---

# 44. EXPORT

Exportiere:

Notizen → Markdown/PDF

Canvas → PNG/PDF

Flashcards → CSV

Tasks → CSV/JSON

komplettes Nutzerkonto → ZIP/JSON

---

# 45. SCHOOL WEEK VIEW

Erstelle einen speziellen Stundenplan-Modus.

Spalten:

Montag

Dienstag

Mittwoch

Donnerstag

Freitag

Karten zeigen:

Fach

Lehrer

Raum

Zeit

Status

Änderungen von WebUntis sollen deutlich angezeigt werden.

---

# 46. SUBJECT HOME

Jedes Fach bekommt ein eigenes Dashboard.

Beispiel Mathematik:

Mathematik

Nächste Stunde:
Dienstag 08:00

Nächste Prüfung:
7. Oktober

Offene Aufgaben:
3

Recent:

Kurvendiskussion

Ableitungen

Hausübung 27.09.

Quick Actions:

New Note

New Canvas

Ask AI

Add Task

Upload

---

# 47. CONTEXT-AWARE AI

Die AI soll den aktuellen Kontext kennen.

Wenn ich mich gerade befinde in:

Mathematik → Canvas → Kurvendiskussion

soll der AI Sidebar automatisch wissen:

Subject = Mathematik

Current Canvas = Kurvendiskussion

Selection = aktuell ausgewählte Elemente

aber nur Kontext senden, der tatsächlich benötigt wird.

---

# 48. SMART FILE NAMES

Uploads automatisch analysieren.

Beispiel:

IMG_3829.PNG

AI erkennt:

Mathematik Arbeitsblatt – Quadratische Gleichungen

und schlägt vor:

Rename →

"Quadratische Gleichungen – Arbeitsblatt"

Subject →

Mathematik

---

# 49. AUTOMATIC ORGANIZATION

AI darf organisatorische Vorschläge machen, aber niemals ungefragt Daten verändern.

Beispiel:

"Dieses Dokument scheint zu deiner Mathematik-Schularbeit zu gehören."

Buttons:

Link

Ignore

---

# 50. VERSION HISTORY

Für:

Notes

Canvas

wichtige Dokumente

Version History implementieren.

Der Nutzer soll frühere Versionen wiederherstellen können.

---

# 51. AUTOSAVE

Alles automatisch speichern.

Canvas Änderungen möglichst sofort lokal persistieren.

Kein manueller Save Button notwendig.

Status:

Saved

Saving...

Offline

---

# 52. MULTI DEVICE

Architektur so bauen, dass später möglich sind:

Web App

Windows App

macOS App

iPad App

iPhone App

Android App

Für Desktop kann später Tauri verwendet werden.

---

# 53. DATABASE DESIGN

Erstelle ein sauberes relationales Datenmodell.

Mindestens Tabellen/Collections für:

users

subjects

notes

canvases

canvas_elements

files

tasks

exams

lessons

timetable_entries

teachers

rooms

ai_chats

ai_messages

flashcards

quizzes

integrations

webuntis_sync

embeddings

tags

links

activity

Verwende UUIDs.

Alle relevanten Tabellen benötigen:

created_at

updated_at

user_id

---

# 54. SECURITY

Implementiere:

Row Level Security

Input Validation

Rate Limiting

Secure API Key Storage

Server-side provider calls

CSRF/XSS-Schutz, wo relevant

Keine Secrets in Client Bundles.

---

# 55. PERFORMANCE

Die App muss auch bei:

100+ Notizen

50+ Canvas Boards

1000+ Dateien

tausenden Canvas-Elementen

flüssig bleiben.

Lazy Loading verwenden.

Große Boards virtualisieren, soweit technisch sinnvoll.

Nicht bei jedem kleinen Canvas-Move die komplette Datenstruktur an den Server schicken.

Debounce / batched persistence verwenden.

---

# 56. ONBOARDING

Beim ersten Start:

1. Name

2. Schule

3. Klassenstufe

4. Fächer auswählen

5. WebUntis verbinden – optional

6. AI Provider verbinden – optional

Danach Dashboard öffnen.

Die App muss auch ohne WebUntis und ohne AI vollständig nutzbar sein.

---

# 57. DEMO MODE

Erstelle Demo-Daten.

Beispielsweise:

Mathematik

Englisch

Deutsch

Geographie

mit Beispielstundenplan, Aufgaben und Notizen.

Dadurch kann die UI getestet werden, ohne echte Accounts zu verbinden.

---

# 58. UX DETAIL

Benutzerinteraktionen sollen sofort wirken.

Optimistic UI verwenden.

Beispiele:

Task abhaken

Board verschieben

Notiz erstellen

Element löschen

erst UI ändern und danach im Hintergrund persistieren.

Fehler sauber behandeln.

---

# 59. ERROR HANDLING

Keine technischen Stacktraces in der UI.

Verständliche Meldungen.

Beispiele:

"WebUntis konnte gerade nicht synchronisiert werden."

"Die AI-Anfrage ist fehlgeschlagen."

"Diese Datei wird noch verarbeitet."

Mit Retry-Button.

---

# 60. DEVELOPMENT APPROACH

Baue NICHT direkt alle Features gleichzeitig.

Arbeite in Phasen.

## Phase 1 – Foundation

- Next.js Setup
- Auth
- Database
- Sidebar
- Subjects
- Settings
- grundlegendes Dashboard

## Phase 2 – Knowledge Workspace

- Notes
- Canvas
- File Upload
- Drag & Drop
- Search

## Phase 3 – AI

- AI Provider Architecture
- OpenRouter
- Groq
- AI Chat
- AI Sidebar
- Canvas Selection → AI
- File/PDF Context

## Phase 4 – School Organization

- Tasks
- Exams
- Calendar
- Today Dashboard
- Subject Dashboards

## Phase 5 – WebUntis

- Integration Layer
- Authentication
- Timetable Sync
- Changes
- Exams/Homework, falls API verfügbar

## Phase 6 – Learning

- Flashcards
- Quiz
- Practice Questions
- Study Plans

## Phase 7 – Polish

- Offline
- Keyboard Shortcuts
- Import/Export
- Animations
- Performance
- Mobile/Tablet Optimierung

---

# 61. CODE QUALITY

Wichtig:

Keine riesigen Komponenten.

Keine einzelnen Dateien mit tausenden Zeilen.

Features modular strukturieren.

Beispiel:

/features
  /canvas
  /subjects
  /tasks
  /ai
  /webuntis
  /calendar
  /files
  /search

/components

/lib

/providers

/api

/types

---

# 62. PROVIDER ABSTRACTION

Besonders WebUntis und AI müssen vollständig abstrahiert sein.

Keine WebUntis-spezifischen Datenstrukturen quer durch die App verwenden.

Interne Standardtypen definieren.

Beispiel:

Lesson {
 id
 subject
 teacher
 room
 start
 end
 status
 source
}

Die WebUntis Integration übersetzt ihre Daten auf dieses Format.

Dasselbe Prinzip für Kalender und AI Provider.

---

# 63. FUTURE INTEGRATIONS

Architektur vorbereiten für:

Google Calendar

Google Drive

OneDrive

Moodle

Microsoft Teams

Google Classroom

LMS.at

SchoolFox

Notion

Diese müssen jetzt noch NICHT vollständig implementiert werden.

---

# 64. AI SCHOOL AGENT

Langfristig soll der AI-Assistent wie ein persönlicher Schul-Agent funktionieren.

Beispiele:

"Was muss ich heute machen?"

"Was habe ich morgen?"

"Welche Prüfungen kommen?"

"Fasse alles aus Mathe seit letzter Woche zusammen."

"Erstelle mir einen Lernplan für die Mathe-Schularbeit."

"Welche Aufgaben sind noch offen?"

"Erklär mir dieses Arbeitsblatt."

"Mach mir daraus 20 Flashcards."

"Teste mich für meine Geo-Prüfung."

"Was wurde heute in Englisch gemacht?"

Die Architektur muss diese Funktionen ermöglichen.

---

# 65. MORNING BRIEFING

Optionales Feature:

Beim Öffnen am Morgen:

"Montag, 28. September"

6 Unterrichtsstunden

1 Raumänderung

2 offene Aufgaben

Mathe-Test in 4 Tagen

Danach:

AI Briefing:

"Heute solltest du besonders die Deutsch-Hausübung erledigen. Für die Mathe-Schularbeit hast du noch vier Tage."

---

# 66. UNIVERSAL "+" BUTTON

Globaler Plus Button.

Optionen:

Note

Canvas

Task

Exam

File

Link

Photo

Flashcard

Subject

AI Chat

---

# 67. HOME WIDGETS

Dashboard modular machen.

Widgets:

Today's Schedule

Tasks

Upcoming Exams

Recent Notes

Recent Canvas

Files

AI Briefing

Study Streak

Quick Capture

User kann Widgets verschieben und ein-/ausblenden.

---

# 68. NICHT MACHEN

Keine unnötigen Social Features.

Keine Werbung.

Keine Gamification erzwingen.

Keine komplizierte Enterprise-UI.

Keine Funktionen nur vortäuschen.

Keine Fake-WebUntis-Daten außerhalb des expliziten Demo-Modus.

Keine API Keys hardcoden.

Keine sensiblen Credentials im Local Storage speichern.

---

# 69. ERSTE AUFGABE

Beginne NICHT sofort damit, hunderte Komponenten zu generieren.

Mache zuerst:

1. Projektstruktur analysieren bzw. initialisieren.
2. Architektur festlegen.
3. Datenmodell definieren.
4. interne Types definieren.
5. AI Provider Interface definieren.
6. School Integration Interface definieren.
7. Basislayout bauen.
8. Subjects implementieren.
9. einen funktionierenden Canvas integrieren.
10. danach iterativ weitere Features hinzufügen.

Nach jeder Phase:

- App starten
- TypeScript prüfen
- Linter prüfen
- Fehler beheben
- keine halbfertigen kaputten Features zurücklassen

---

# 70. ENDZIEL

Am Ende soll ein Schüler seinen kompletten Schulalltag in dieser einen Anwendung verwalten können.

Er öffnet morgens die App und sieht:

- seinen Stundenplan
- Änderungen
- Hausaufgaben
- Prüfungen
- relevante Notizen
- seinen Lernfortschritt

Im Unterricht öffnet er Mathematik, erstellt einen Canvas, fügt Screenshots, PDFs, Formeln und Notizen ein und kann jederzeit die AI fragen.

Nach der Schule kann er schreiben:

"Was muss ich heute noch erledigen?"

Die App kennt Stundenplan, Aufgaben, Prüfungen und Lernmaterialien und erstellt daraus eine sinnvolle Übersicht.

Das zentrale Prinzip lautet:

**Everything school-related in one workspace, with AI deeply integrated into the entire system.**

Baue zuerst ein solides MVP, aber strukturiere den Code von Anfang an so, dass daraus diese vollständige Anwendung entstehen kann.