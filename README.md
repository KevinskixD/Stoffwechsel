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
7. App starten: `npm run dev` und mit dem autorisierten Google-Konto anmelden.

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

## Projektstruktur

- `src/features/employees`, `src/features/articles`, `src/features/orderStatuses`,
  `src/features/orders`, `src/features/reports` — je Fachbereich: Firestore-Zugriff (`api.ts`),
  Hooks, Listen-/Formular-Seiten.
- `src/shared/import` — wiederverwendbarer Excel-Import-Assistent (Upload → Mapping → Vorschau →
  Import), parametrisiert je Entität über `ImportEntityConfig`.
- `src/shared/components`, `src/shared/hooks`, `src/shared/utils` — generische Bausteine
  (Tabelle, Suche, Pagination, Firestore-Query-Hook, Datums-/Suchformatierung).
- `src/firebase` — Firebase-Init (inkl. Auth), Firestore-Converter, Seed-Logik für Bestellstatus.

## Versionshistorie

Unter „Versionshistorie" direkt über „Einstellungen" zeigt die App die Release-Notizen. Die
aktuelle Version steht immer oben; ältere Versionen lassen sich einzeln auf- und zuklappen.
Die Einträge liegen statisch in `src/features/changelog/changelog.ts` und benötigen weder
Firestore noch eine Netzwerkverbindung.

Bei jedem Commit und Push die Version in `package.json` (und `package-lock.json`) erhöhen, einen
neuen Eintrag am Anfang von `CHANGELOG_ENTRIES` ergänzen und den Commit mit einem passenden
SemVer-Tag (`vX.Y.Z`) versehen. Der Tag zeigt auf den Commit dieser Version und wird mit
`git push origin <branch> --follow-tags` übertragen. Die Notizen sollen die Änderungen aus
Anwendersicht beschreiben; der erste Eintrag der Liste gilt als aktuelle Version.

## Bekannte Einschränkung

Das npm-Paket `xlsx` (SheetJS) hat zwei bekannte, ungepatchte Advisories (Prototype Pollution,
ReDoS) ohne verfügbaren Fix über npm. Da Excel-Dateien ausschließlich vom Bekleidungsreferenten
selbst hochgeladen werden (vertrauenswürdige Eingabe, kein Fremdzugriff), ist das Risiko in diesem
Kontext gering, aber bei zukünftigen Änderungen im Blick zu behalten.
