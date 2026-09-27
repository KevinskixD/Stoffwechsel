export interface NotificationSettings {
  id: string
  /** Placeholders: {{NAME}}, {{POSITIONEN}} */
  greetingTemplate: string
  /** Placeholders: {{MENGE}}, {{ARTIKEL}}, {{GROESSE}}, {{ABHOLORT}} */
  lineTemplate: string
  /** '' until configured. */
  triggerStatusId: string
  /** '' until configured. */
  targetStatusId: string
  /** Text for informing employees about outstanding loan articles. */
  loanGreetingTemplate: string
  loanLineTemplate: string
  updatedAt: Date
}

export const NOTIFICATION_SETTINGS_DOC_ID = 'default'

export const DEFAULT_GREETING_TEMPLATE =
  'Hallo {{NAME}},\n\ndeine Bestellung ist angekommen und abholbereit\n\n{{POSITIONEN}}\n\n' +
  'Bitte bei Zeiten abholen, Danke!\n\nLiebe Grüße\nKevin'

export const DEFAULT_LINE_TEMPLATE = '* {{MENGE}}x {{ARTIKEL}} ({{ABHOLORT}})'

export const DEFAULT_LOAN_GREETING_TEMPLATE =
  'Hallo {{VORNAME}},\n\nlaut unserer Übersicht hast du noch folgende Leihgaben:\n\n{{POSITIONEN}}\n\n' +
  'Bitte gib die Artikel bei Gelegenheit zurück oder melde dich bei mir, falls die Angaben nicht mehr aktuell sind.\n\nLiebe Grüße\nKevin'

export const DEFAULT_LOAN_LINE_TEMPLATE = '* {{MENGE}}x {{ARTIKEL}} (ausgegeben am {{AUSGABEDATUM}})'
