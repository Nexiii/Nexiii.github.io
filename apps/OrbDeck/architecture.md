# Architekturentscheidungen

## Gemeinsame Protokoll- und Domänentypen

`zendeck-core` besitzt die zentrale `WebSocketMessage`-Enum,
Konfigurationsmodelle und das Aktionssystem. Desktop und Server verwenden
dieselben Rust-Typen, damit keine voneinander abweichenden Protokollmodelle
entstehen. Die TypeScript-Clients bilden nur die jeweils benötigte öffentliche
Struktur ab.

## Server-Lebenszyklus

`ServerManager` kapselt Listener, Shutdown-Kanal und Laufzeitstatus. Er ist ohne
Tauri start- und stoppbar und kann deshalb in Integrationstests sowie in einem
eigenständigen Entwicklungsprozess verwendet werden. Tauri verwaltet eine
`Arc<Mutex<ServerManager>>`-Instanz und reicht Status und Ereignisse an React
weiter.

## Mobile Assets

Der Produktions-Build der Mobile-Oberfläche wird in das Server-Binary
eingebettet. Dadurch ist zur Laufzeit kein separater Node-Prozess nötig und die
Oberfläche wird auch ohne Internetverbindung ausgeliefert. Der
Vite-Entwicklungsserver besitzt zusätzlich Proxys für `/api` und `/ws`.

## Lokale Persistenz

Der Tauri-Client lädt die Konfiguration über `ConfigStore` aus seinem
anwendungsspezifischen Konfigurationsordner. Schreibvorgänge werden zunächst in
eine temporäre Datei im selben Verzeichnis geschrieben und mit `sync_all`
gesichert. Unter Windows ersetzt `MoveFileExW` mit
`MOVEFILE_REPLACE_EXISTING | MOVEFILE_WRITE_THROUGH` anschließend die aktive
Datei atomar.

Button-Mutationen und Toggle-Effekte verwenden denselben asynchronen
Mutations-Lock. Dadurch kann ein gleichzeitig ausgelöster Toggle-Zustand nicht
von einem Speichervorgang im Desktop-Editor überschrieben werden. Erst nach
erfolgreichem Speichern wird der gemeinsame In-Memory-Stand ersetzt und eine
neue Revision an die Mobile-Clients gesendet.

Anwendungseinstellungen liegen im selben versionierten Konfigurationsmodell.
Neue Felder wie `locale` besitzen Serde-Defaults, damit vorhandene
Konfigurationsdateien ohne Migration weiter geladen werden. Die öffentliche
Mobile-Konfiguration enthält nur die ausgewählte Locale, nicht die übrigen
Desktop- oder Servereinstellungen. Der Locale-Default ist Englisch; feste Texte
in Desktop, Editoren, Dialogen, Icon Manager, Logs und Mobile-Client werden aus
gemeinsamen typisierten Wörterbüchern bezogen.

Der Desktop sammelt `ServerEvent`-Nachrichten in einem begrenzten In-Memory-Puffer
und stellt sie im Logs-Tab als filterbare Live-Konsole dar. Aktionsparameter
werden dabei nicht ausgegeben; die Konsole zeigt Ereignistyp und Button-Namen.

Port und LAN-Bindung werden beim Serverstart übernommen. Wird beides während
des laufenden Betriebs geändert, meldet der Desktop einen erforderlichen
Server-Neustart. Bei deaktiviertem LAN-Zugriff bindet Axum ausschließlich an
`127.0.0.1`.

## Seitenverwaltung

Page-Mutationen laufen wie Button-Mutationen unter demselben Konfigurations-Lock
und werden atomar gespeichert. Namen, Rastergröße, Hintergrund und Eindeutigkeit
werden serverseitig validiert. Die Standardseite und Seiten mit vorhandenen
Buttons oder Seitenwechsel-Referenzen werden nicht stillschweigend gelöscht.

## Web-Authentifizierung

Die optionale Web-Sperre liegt vollständig vor den öffentlichen
Konfigurationsrouten und dem WebSocket-Upgrade. Der statische Client und
`/api/auth/status` bleiben erreichbar, damit das lokalisierte Login angezeigt
werden kann. Passwörter werden mit Argon2 und zufälligem Salt gehasht.
Authentifizierte Geräte erhalten ein `HttpOnly`-/`SameSite=Strict`-Cookie mit
zwölf Stunden Laufzeit. Aktivierung und Passwortwechsel leeren alle laufenden
Sessions; bestehende WebSockets werden beim nächsten Ereignis oder Befehl
geschlossen.

## Aktionssystem

`ActionRegistry` ordnet den serialisierten Aktionstypen Implementierungen des
asynchronen `DeckAction`-Traits zu. Drei Gruppen bleiben dabei getrennt:

- `LogAction` für die interne Testaktion
- Plattformaktionen hinter dem `PlatformController`-Trait
- Deck-Effekte für Seitenwechsel und Toggle-Zustände

`zendeck-platform-windows` implementiert die Plattformgrenze. Programme werden
mit `std::process::Command` und getrennten Argumenten gestartet. Dateien und URLs
beziehungsweise App-Links laufen über `ShellExecuteW`. Dadurch funktionieren
neben HTTP/HTTPS auch unter Windows registrierte Protokolle wie `steam://`.
Tastenkürzel, Unicode-Text und Medientasten werden
über `SendInput` gesendet. PowerShell und CMD werden ausschließlich von der
expliziten Shell-Aktion verwendet.

Deck-Effekte geben strukturierte `ActionEffect`-Werte an den Server zurück.
Dadurch bleibt `zendeck-core` unabhängig von WebSocket, Persistenz und
Client-Broadcasts.

## Sicherheitsgrenze

Mobile Clients erhalten über `/api/config` ausschließlich
`PublicZenDeckConfig`. `PublicDeckButton` enthält Darstellung, Position und
sichtbaren Aktiv-Zustand, aber weder Aktionstyp noch Aktionsparameter. Über
WebSocket akzeptiert der Server von Clients nur Button-IDs und Seiten-IDs. Die
zugehörige Aktion wird ausschließlich aus der lokalen Serverkonfiguration
geladen.

Konfigurationen werden beim Speichern unter anderem auf Namen, Farben,
Seitengröße, Rasterposition, Überschneidungen, Cooldown und Aktionsparameter
validiert. App-Links benötigen ein syntaktisch gültiges Protokoll; eingebettete
`javascript:`, `data:` und `file:`-Links werden abgelehnt. Eigene Button-Logos
werden im Desktop-Client auf 256 × 256 Pixel optimiert, größenbegrenzt in der
lokalen Konfiguration gespeichert und über die öffentliche Darstellung
ausgeliefert. Nachrichten und Frames sind auf 16 KiB begrenzt. Ein serverseitiger Cooldown verhindert schnelle
Doppelausführungen pro Client und Button. Fehlerantworten enthalten keine
internen Fehlerdetails.

## Noch nicht implementiert

- Desktop-Editor zum Erstellen, Sortieren und Löschen mehrerer Seiten
- PIN-Hashing und Geräte-Pairing
- System-Tray und Autostart
- vollständiger kontrollierter Shutdown beim Beenden der Tauri-App

Diese Punkte sind als Umfang der nächsten MVP-Phasen dokumentiert.
