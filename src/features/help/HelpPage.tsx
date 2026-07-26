export function HelpPage() {
  return (
    <div className="mx-auto max-w-2xl p-6">
      <h1 className="mb-4 text-xl font-semibold text-gray-900">Hilfe</h1>
      <div className="space-y-4 rounded-xl border border-black/[0.08] bg-white p-6 text-sm text-gray-700">
        <p>
          <strong>Mitarbeiter</strong> und <strong>Artikel</strong> sind die Stammdaten der App — sie werden im
          Bestellformular per Dropdown ausgewählt, damit keine Tippfehler entstehen. Ein Eintrag kann deaktiviert
          statt gelöscht werden; bestehende Bestellungen bleiben davon unberührt.
        </p>
        <p>
          <strong>Bestellstatus</strong> lässt sich unter „Einstellungen" frei verwalten (umbenennen, sortieren,
          deaktivieren). Neue Bestellungen übernehmen automatisch den aktuellen Status-Namen.
        </p>
        <p>
          <strong>Excel-Import</strong> steht auf jeder Liste zur Verfügung: Datei hochladen, Spalten den Feldern
          zuordnen, Vorschau prüfen, importieren. Fehlerhafte Zeilen werden einzeln ausgewiesen; der Rest wird
          trotzdem übernommen.
        </p>
      </div>
    </div>
  )
}
