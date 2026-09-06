import type ExcelJS from 'exceljs'
import type { TableMapping } from '../../types/bestellFormularSettings'

export interface DetectedMapping {
  sheetName: string
  datumCell: string
  ortsstelleCell: string
  upperTable: TableMapping
  lowerTable: TableMapping
}

export interface DetectedMatrixSheet {
  matrixSheetName: string
  matrixArtikelNrColumn: string
  matrixBezeichnungColumn: string
  matrixStartRow: number
}

function numberToColumnLetter(n: number): string {
  let letters = ''
  let num = n
  while (num > 0) {
    const remainder = (num - 1) % 26
    letters = String.fromCharCode(65 + remainder) + letters
    num = Math.floor((num - 1) / 26)
  }
  return letters
}

function cellText(value: ExcelJS.CellValue): string {
  if (value == null) return ''
  if (typeof value === 'object') {
    if ('richText' in value) return value.richText.map((t) => t.text).join('')
    if ('result' in value) return String(value.result ?? '')
    if ('text' in value) return String((value as { text: unknown }).text)
  }
  return String(value)
}

interface HeaderRow {
  row: number
  columnsByText: Map<string, number>
}

function findHeaderRows(ws: ExcelJS.Worksheet): HeaderRow[] {
  const found: HeaderRow[] = []
  for (let r = 1; r <= ws.rowCount; r++) {
    const columnsByText = new Map<string, number>()
    ws.getRow(r).eachCell({ includeEmpty: false }, (cell, colNumber) => {
      const text = cellText(cell.value).trim().toLowerCase()
      if (text) columnsByText.set(text, colNumber)
    })
    if (columnsByText.has('menge') && columnsByText.has('name')) found.push({ row: r, columnsByText })
  }
  return found
}

function findLabelValueCell(ws: ExcelJS.Worksheet, label: string): string {
  for (let r = 1; r <= ws.rowCount; r++) {
    let labelCol: number | null = null
    ws.getRow(r).eachCell({ includeEmpty: false }, (cell, colNumber) => {
      if (cellText(cell.value).trim().toLowerCase() === label) labelCol = colNumber
    })
    if (labelCol !== null) return `${numberToColumnLetter(labelCol + 1)}${r}`
  }
  return ''
}

function findColumn(columnsByText: Map<string, number>, predicate: (text: string) => boolean): number | undefined {
  for (const [text, col] of columnsByText) {
    if (predicate(text)) return col
  }
  return undefined
}

function buildTableMapping(
  header: HeaderRow,
  nextHeaderRow: number | undefined,
  ws: ExcelJS.Worksheet,
  isFreetext: boolean,
): TableMapping {
  const mengeCol = header.columnsByText.get('menge')
  const nameCol = header.columnsByText.get('name')
  const bosCol = findColumn(header.columnsByText, (t) => t.replace(/\s/g, '') === 'b/o/s')
  const artikelNrCol = isFreetext ? undefined : findColumn(header.columnsByText, (t) => t.includes('artikel'))
  const bezeichnungCol = findColumn(header.columnsByText, (t) => t.startsWith('bezeichnung'))

  if (!mengeCol || !nameCol) {
    throw new Error('Spalten "Menge"/"Name" nicht in der erkannten Kopfzeile gefunden.')
  }

  const startRow = header.row + 1
  let endRow: number
  if (nextHeaderRow) {
    endRow = nextHeaderRow - 1
  } else {
    const markerCol = bezeichnungCol ?? artikelNrCol ?? mengeCol
    endRow = startRow - 1
    for (let r = startRow; r <= ws.rowCount; r++) {
      if (!cellText(ws.getCell(r, markerCol).value).trim()) break
      endRow = r
    }
  }

  return {
    headerRow: header.row,
    startRow,
    endRow: Math.max(startRow, endRow),
    artikelNrColumn: artikelNrCol ? numberToColumnLetter(artikelNrCol) : '',
    bezeichnungColumn: bezeichnungCol ? numberToColumnLetter(bezeichnungCol) : '',
    mengeColumn: numberToColumnLetter(mengeCol),
    nameColumn: numberToColumnLetter(nameCol),
    bosColumn: bosCol ? numberToColumnLetter(bosCol) : '',
  }
}

/**
 * Auto-detects the two fixed order tables (with/without Artikel-Nr.) and the Datum/Ortsstelle
 * cells from a worksheet's header labels, so re-uploading a changed template doesn't require
 * hand-editing cell references. Always shown for confirmation/override in the settings form —
 * never applied blindly.
 */
export function detectMapping(ws: ExcelJS.Worksheet): DetectedMapping {
  const headerRows = findHeaderRows(ws)
  if (headerRows.length < 2) {
    throw new Error('Konnte die zwei Bestelltabellen (mit/ohne Artikel-Nr.) nicht in der Vorlage finden.')
  }
  const [upperHeader, lowerHeader, thirdHeader] = headerRows
  const upperTable = buildTableMapping(upperHeader, lowerHeader.row, ws, false)
  const lowerTable = buildTableMapping(lowerHeader, thirdHeader?.row, ws, true)

  return {
    sheetName: ws.name,
    datumCell: findLabelValueCell(ws, 'datum:'),
    ortsstelleCell: findLabelValueCell(ws, 'ortsstelle:'),
    upperTable,
    lowerTable,
  }
}

/**
 * Best-effort detection of the second sheet holding the Artikel-Nr./Bezeichnung lookup table
 * that the Formular sheet's VLOOKUP formulas read from. Prefers a sheet literally named "Matrix"
 * (case-insensitive), otherwise falls back to the first sheet that isn't the Formular sheet.
 * Always shown for confirmation/override in the settings form, same as detectMapping().
 */
export function detectMatrixSheet(workbook: ExcelJS.Workbook, formularSheetName: string): DetectedMatrixSheet | null {
  const byName = workbook.worksheets.find((sheet) => sheet.name.trim().toLowerCase() === 'matrix')
  const fallback = workbook.worksheets.find((sheet) => sheet.name !== formularSheetName)
  const matrixWs = byName ?? fallback
  if (!matrixWs) return null

  return {
    matrixSheetName: matrixWs.name,
    matrixArtikelNrColumn: 'A',
    matrixBezeichnungColumn: 'B',
    matrixStartRow: 2,
  }
}
