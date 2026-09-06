# Uniformverwaltung

Web-Tool für die Uniform-Bestellungs- und Inventarisierungsverwaltung. Ersetzt die bisherige
Excel-Lösung für einen einzelnen Bekleidungsreferenten. React (Vite) + TypeScript, Firestore als
Datenhaltung, `xlsx` für den clientseitigen Excel-Import. Rein lokaler Betrieb (`npm run dev`),
Zugriff ist auf ein einzelnes autorisiertes Google-Konto beschränkt (Firebase Authentication),
kein Multi-User-Betrieb — siehe Sicherheitshinweis unten.

## Setup

1. Firebase-Projekt anlegen (https://console.firebase.google.com/), darin eine Firestore-Datenbank
   (Native mode) erstellen.
2. In den Projekteinstellungen eine Web-App registrieren und die Config-Werte kopieren.
3. Unter **Authentication → Sign-in method** den Google-Provider aktivieren (nur so kann sich
   das autorisierte Google-Konto anmelden; ohne diesen Schritt schlägt der Login-Popup fehl).
4. `.env.local` anlegen (Vorlage: `.env.local.example`) und die Werte eintragen:
   ```
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=...
   VITE_FIREBASE_PROJECT_ID=...
   VITE_FIREBASE_STORAGE_BUCKET=...
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```
5. Abhängigkeiten installieren: `npm install`
6. Firestore-Regeln deployen (einmalig und nach jeder Änderung an `firestore.rules`):
   ```
   npm install -g firebase-tools   # falls noch nicht vorhanden
   firebase login
   firebase deploy --only firestore:rules --project <dein-projekt-id>
   ```
7. Für den Lieferschein-Check die serverseitige Function einrichten. Der Gemini-Key darf **nicht**
   in `.env.local` stehen, weil alle `VITE_*`-Variablen im Browser veröffentlicht würden. Einen
   neuen oder rotierten Key als Firebase Secret setzen und die Function deployen:
   ```
   firebase functions:secrets:set GEMINI_API_KEY --project <dein-projekt-id>
   firebase deploy --only functions --project <dein-projekt-id>
   ```
   Die Function läuft in `europe-west1`, akzeptiert nur das freigegebene, verifizierte
   Google-Konto und verarbeitet ausschließlich PDFs bis 8 MB. Ein zuvor als
   `VITE_GEMINI_API_KEY` verwendeter Key sollte in Google AI Studio umgehend rotiert werden.
8. App starten: `npm run dev` und mit dem autorisierten Google-Konto anmelden.

Die sieben Standard-Bestellstatus ("Zu Bestellen", "Bestellt", "Geliefert", "Informiert",
"Abgeholt", "Umtausch", "Abgeschlossen") werden beim ersten Start automatisch in Firestore
angelegt, sofern die Collection `orderStatuses` noch leer ist.

## Sicherheitshinweis

Die App nutzt Firebase Authentication (Google Sign-In), beschränkt auf genau ein autorisiertes
Google-Konto (`ALLOWED_EMAIL` in `src/firebase/config.ts`). `firestore.rules` setzt das serverseitig
durch — `isAuthorized()` prüft `request.auth.token.email` gegen dieselbe Adresse — und ist damit
eine echte Zugriffskontrolle, nicht nur eine clientseitige Prüfung. Wichtig: die E-Mail-Adresse
muss in `firestore.rules` und `src/firebase/config.ts` exakt übereinstimmen, sonst driften
Client-Gate und Server-Regel auseinander.

Der Lieferschein-Check sendet das ausgewählte PDF über eine authentifizierte Firebase Function an
Gemini. Der dafür erforderliche Key liegt ausschließlich in Firebase Secret Manager; er ist nicht
Teil des ausgelieferten Browser-Bundles.

## Projektstruktur

- `src/features/employees`, `src/features/articles`, `src/features/orderStatuses`,
  `src/features/orders`, `src/features/reports` — je Fachbereich: Firestore-Zugriff (`api.ts`),
  Hooks, Listen-/Formular-Seiten.
- `src/shared/import` — wiederverwendbarer Excel-Import-Assistent (Upload → Mapping → Vorschau →
  Import), parametrisiert je Entität über `ImportEntityConfig`.
- `src/shared/components`, `src/shared/hooks`, `src/shared/utils` — generische Bausteine
  (Tabelle, Suche, Pagination, Firestore-Query-Hook, Datums-/Suchformatierung).
- `src/firebase` — Firebase-Init (inkl. Auth), Firestore-Converter, Seed-Logik für Bestellstatus.

## Bekannte Einschränkung

Das npm-Paket `xlsx` (SheetJS) hat zwei bekannte, ungepatchte Advisories (Prototype Pollution,
ReDoS) ohne verfügbaren Fix über npm. Da Excel-Dateien ausschließlich vom Bekleidungsreferenten
selbst hochgeladen werden (vertrauenswürdige Eingabe, kein Fremdzugriff), ist das Risiko in diesem
Kontext gering, aber bei zukünftigen Änderungen im Blick zu behalten.
