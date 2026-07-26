# Uniformverwaltung

Web-Tool für die Uniform-Bestellungs- und Inventarisierungsverwaltung. Ersetzt die bisherige
Excel-Lösung für einen einzelnen Bekleidungsreferenten. React (Vite) + TypeScript, Firestore als
Datenhaltung, `xlsx` für den clientseitigen Excel-Import. Rein lokaler Betrieb (`npm run dev`),
keine Authentifizierung, kein Multi-User-Betrieb — siehe Sicherheitshinweis unten.

## Setup

1. Firebase-Projekt anlegen (https://console.firebase.google.com/), darin eine Firestore-Datenbank
   (Native mode) erstellen.
2. In den Projekteinstellungen eine Web-App registrieren und die Config-Werte kopieren.
3. `.env.local` anlegen (Vorlage: `.env.local.example`) und die Werte eintragen:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
4. Abhängigkeiten installieren: `npm install`
5. Firestore-Regeln deployen (einmalig und nach jeder Änderung an `firestore.rules`):
   ```
   npm install -g firebase-tools   # falls noch nicht vorhanden
   firebase login
   firebase deploy --only firestore:rules --project <dein-projekt-id>
   ```
6. App starten: `npm run dev`

Die sieben Standard-Bestellstatus ("Zu Bestellen", "Bestellt", "Geliefert", "Informiert",
"Abgeholt", "Umtausch", "Abgeschlossen") werden beim ersten Start automatisch in Firestore
angelegt, sofern die Collection `orderStatuses` noch leer ist.

## Sicherheitshinweis

Diese App hat keine Authentifizierung. `firestore.rules` beschränkt Lese-/Schreibzugriff auf die
vier bekannten Collections, ist aber **keine echte Zugriffskontrolle** — jeder mit der
Firebase-Projekt-Config könnte lesen/schreiben. Das ist für den rein lokalen Betrieb (kein
Firebase Hosting) akzeptiert. Falls sich das ändert (Hosting-Deploy, Config gerät öffentlich
z. B. in ein öffentliches Git-Repo), müssen die Regeln überarbeitet werden (z. B. einfache
Firebase-Auth-Anmeldung ergänzen).

## Projektstruktur

- `src/features/employees`, `src/features/articles`, `src/features/orderStatuses`,
  `src/features/orders`, `src/features/reports` — je Fachbereich: Firestore-Zugriff (`api.ts`),
  Hooks, Listen-/Formular-Seiten.
- `src/shared/import` — wiederverwendbarer Excel-Import-Assistent (Upload → Mapping → Vorschau →
  Import), parametrisiert je Entität über `ImportEntityConfig`.
- `src/shared/components`, `src/shared/hooks`, `src/shared/utils` — generische Bausteine
  (Tabelle, Suche, Pagination, Firestore-Query-Hook, Datums-/Suchformatierung).
- `src/firebase` — Firebase-Init, Firestore-Converter, Seed-Logik für Bestellstatus.

## Bekannte Einschränkung

Das npm-Paket `xlsx` (SheetJS) hat zwei bekannte, ungepatchte Advisories (Prototype Pollution,
ReDoS) ohne verfügbaren Fix über npm. Da Excel-Dateien ausschließlich vom Bekleidungsreferenten
selbst hochgeladen werden (vertrauenswürdige Eingabe, kein Fremdzugriff), ist das Risiko in diesem
Kontext gering, aber bei zukünftigen Änderungen im Blick zu behalten.
