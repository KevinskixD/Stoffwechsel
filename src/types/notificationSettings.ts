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
  updatedAt: Date
}

export const NOTIFICATION_SETTINGS_DOC_ID = 'default'

export const DEFAULT_GREETING_TEMPLATE =
  'Hallo {{NAME}},\n\ndeine Bestellung ist angekommen und abholbereit\n\n{{POSITIONEN}}\n\n' +
  'Bitte bei Zeiten abholen, Danke!\n\nLiebe Grüße\nKevin'

export const DEFAULT_LINE_TEMPLATE = '* {{MENGE}}x {{ARTIKEL}} ({{ABHOLORT}})'
