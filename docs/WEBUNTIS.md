# WebUntis verbinden

Unter **WebUntis → Mit WebUntis verbinden** die Schule suchen, den Treffer
übernehmen und den persönlichen WebUntis-Benutzernamen sowie das zugehörige
Passwort eintragen. Danach 7 oder 14 Tage abrufen, die Vorschau prüfen und die
Stunden übernehmen. Die Vorschau zeigt die Stunden nach Tagen mit Zeiten,
Räumen, Lehrkräften, Ausfällen und Änderungen. Server und Schulkürzel lassen
sich bei Bedarf unter „Server manuell bearbeiten“ anpassen. Der Dateiimport
bleibt als aufklappbare Alternative verfügbar. Fächer werden bei Bedarf angelegt; Ausfälle und Änderungen
werden aus der API übernommen.

Beim Ersetzen werden nur WebUntis-Stunden im abgefragten Zeitraum aktualisiert.
Eigene Termine und andere Zeiträume bleiben erhalten. Beim Ergänzen ersetzt
eine erneut übernommene Stunde denselben Fach-/Zeitslot, statt Duplikate anzulegen.
Der Status zeigt einen gespeicherten Plan und die letzte Übernahme; der Abruf
läuft manuell. Das Passwort wird direkt nach dem Abruf aus dem Formular geleert.

Die voreingestellte Schule BG/BRG Neusiedl/See verwendet
`gymnasium-neusiedl.webuntis.com` und das Schulkürzel `gymnasium-neusiedl`.
Die öffentliche WebUntis-Schulsuche wurde am 20.10.2026 erfolgreich abgefragt.

## Voraussetzungen

- Persönlicher Schüler- oder Lehrerzugang mit einem eigenen WebUntis-Passwort.
- Die Schule muss den Zugriff auf die JSON-RPC-API erlauben.
- Bei Microsoft-/Schulportal-Anmeldung unter **Dein WebUntis-Zugang →
  Untis Mobile / SSO** die Mobile-Freigabe verwenden. Direkt in WebUntis wie
  gewohnt anmelden und **Profil → Freigaben → Zugriff über Untis Mobile →
  Aktivieren / Anzeigen** öffnen. Den QR-Code als PNG/JPG/WebP-Bild auswählen,
  seinen vollständigen `untis://setschool?...`-Inhalt einfügen oder den dort
  angezeigten WebUntis-Benutzernamen und Mobile-Schlüssel eintragen. Das
  Microsoft-Passwort gehört nicht in diese Felder. Wenn die Schule keine
  Mobile-Freigabe erlaubt, muss die Schuladministration weiterhelfen.
- Ein direkter Microsoft-OAuth-Login und automatische Hintergrundsynchronisation
  sind nicht implementiert. Die Alternative verwendet die vom Nutzer freigegebenen
  Untis-Mobile-Zugangsdaten.

Das Passwort wird nur für den Abruf übertragen und im Arbeitsspeicher gehalten.
Gespeichert werden im Browser lediglich Server, Schulkürzel und Benutzername.
Die Verbindung benötigt keinen zentralen API-Schlüssel und keine zusätzlichen
Umgebungsvariablen. Das Konto wird bei jedem Abruf neu angemeldet.

QR-Bilder werden mit `jsQR` lokal im Browser ausgewertet, nicht hochgeladen
oder gespeichert. Der Mobile-Schlüssel bleibt im Arbeitsspeicher, wird nur
für den Abruf per HTTPS an die App-Route übertragen und anschließend geleert.
Der Server berechnet einen sechsstelligen TOTP-Code (SHA-1, 30 Sekunden) und
sendet ausschließlich diesen Code an WebUntis. Schlüssel, QR-Inhalt und
Sitzungstoken werden weder protokolliert noch an den Browser zurückgegeben.
Gespeichert wird zusätzlich nur die gewählte Anmeldemethode.

## Technische Anbindung

Die serverseitige Route `POST /api/webuntis` spricht direkt per HTTPS mit
`https://<server>.webuntis.com/WebUntis/jsonrpc.do?school=<schulkürzel>`:

1. `authenticate` liefert die Sitzung und die persönliche Stundenplan-ID.
   Bei Untis Mobile ersetzt `getUserData2017` am Endpoint
   `/WebUntis/jsonrpc_intern.do` diesen Schritt; anschließend liefert
   `/WebUntis/api/app/config` die persönliche ID und den Elementtyp.
2. `getTimetable` fordert den persönlichen Plan einschließlich Fach-, Lehrer-
   und Raumnamen an. Der Zeitraum richtet sich nach dem Datum in Österreich.
3. `logout` beendet die Sitzung mit denselben Sitzungscookies auch dann, wenn
   der Abruf fehlschlägt. Dafür gilt ein separates Zeitlimit von drei Sekunden.

Ein Abruf hat insgesamt maximal 20 Sekunden Zeit zuzüglich des Logout-Versuchs.
Zugangsdaten werden ausschließlich an Subdomains von `webuntis.com` gesendet;
Weiterleitungen werden nicht verfolgt. Die App-Anmeldung und Same-Origin-Prüfung
schützen die Route. Anfragelimits gelten je App-Konto und Serverprozess.
Sitzungstoken und ursprüngliche API-Fehlermeldungen werden nicht an den Browser
weitergegeben. Die Schulsuche läuft über `GET /api/webuntis?q=...`.

## Prüfung

`npx playwright test --config playwright.webuntis.config.ts`
prüft den Protokollablauf mit simulierten WebUntis-Antworten und den Schutz der
App-Route. Ein Browsertest prüft Vorschau, Übernahme und Speicherung der Fächer
und Stunden mit einer simulierten API-Antwort sowie das Verwerfen des Passworts.
Die Konfiguration verwendet eine eigene Testdatenbank, damit wiederholte
Testläufe nicht mit den Anmeldelimits des normalen App-Kontos kollidieren.
Ohne gültige persönliche Zugangsdaten wurde kein echter persönlicher
Stundenplan abgerufen. Eine erfolgreiche Schulsuche allein bestätigt keine
API-Freigabe für einen bestimmten Benutzer.
