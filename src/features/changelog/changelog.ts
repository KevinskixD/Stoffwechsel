export type ChangeType = 'neu' | 'verbessert' | 'fix' | 'hinweis'

export interface ChangelogChange {
  type: ChangeType
  text: string
}

export interface ChangelogEntry {
  version: string
  date: string // YYYY-MM-DD
  changes: ChangelogChange[]
}

/**
 * Versionshistorie, neueste zuerst. Der erste Eintrag ist die aktuelle Version.
 *
 * Bei jedem Release wird die Version in package.json erhöht und hier ein neuer
 * Eintrag mit den für Anwender relevanten Änderungen vorangestellt.
 */
export const CHANGELOG_ENTRIES: ChangelogEntry[] = [
  {
    version: '0.1.0',
    date: '2026-09-08',
    changes: [
      { type: 'neu', text: 'Versionshistorie zeigt neue Funktionen, Verbesserungen und Hinweise direkt in der Anwendung.' },
      { type: 'verbessert', text: 'Gespeicherte Bestellformular-Vorlagen können wieder heruntergeladen werden.' },
      { type: 'hinweis', text: 'Die Lieferschein-Prüfung steht nicht mehr zur Verfügung.' },
    ],
  },
  {
    version: '0.0.0',
    date: '2026-09-08',
    changes: [
      { type: 'neu', text: 'Neue Versionshistorie mit allen zukünftigen Neuerungen, Verbesserungen und Fehlerbehebungen.' },
      { type: 'hinweis', text: 'Diese erste Entwicklungsversion fasst den bestehenden Funktionsumfang der Uniformverwaltung zusammen.' },
    ],
  },
]
