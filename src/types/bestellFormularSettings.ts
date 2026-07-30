export interface TableMapping {
  headerRow: number
  startRow: number
  endRow: number
  /** Column letter, e.g. 'B'; '' if this table has no Artikel-Nr. column (freetext table). */
  artikelNrColumn: string
  /** Column letter; '' if Bezeichnung is formula-derived (Artikel-Nr. table — never write it). */
  bezeichnungColumn: string
  mengeColumn: string
  nameColumn: string
  bosColumn: string
}

export interface BestellFormularSettings {
  id: string
  /** Uploaded .xlsx template, base64-encoded. */
  templateBase64: string
  templateFileName: string
  sheetName: string
  datumCell: string
  ortsstelleCell: string
  ortsstelle: string
  /** Table for articles with an Artikel-Nr. */
  upperTable: TableMapping
  /** Freetext table for articles without an Artikel-Nr. */
  lowerTable: TableMapping
  /** '' until configured. Orders in this status are eligible for generation. */
  triggerStatusId: string
  /** '' until configured. Included orders move to this status after generating. */
  targetStatusId: string
  updatedAt: Date
}

export const BESTELL_FORMULAR_SETTINGS_DOC_ID = 'default'

export function emptyTableMapping(): TableMapping {
  return {
    headerRow: 0,
    startRow: 0,
    endRow: 0,
    artikelNrColumn: '',
    bezeichnungColumn: '',
    mengeColumn: '',
    nameColumn: '',
    bosColumn: '',
  }
}
