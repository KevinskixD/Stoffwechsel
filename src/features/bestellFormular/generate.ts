import ExcelJS from 'exceljs'
import { splitEmployeeName } from '../../shared/utils/notificationTemplate'
import { base64ToArrayBuffer, downloadBlob } from '../../shared/utils/file'
import type { Article } from '../../types/article'
import type { BestellFormularSettings, TableMapping } from '../../types/bestellFormularSettings'
import type { Order } from '../../types/order'

function chunk<T>(items: T[], size: number): T[][] {
  if (size <= 0) return items.length ? [items] : []
  const result: T[][] = []
  for (let i = 0; i < items.length; i += size) result.push(items.slice(i, i + size))
  return result
}

function capacity(table: TableMapping): number {
  return table.endRow - table.startRow + 1
}

function bosFor(order: Order, articleById: Map<string, Article>): 'B' | 'S' {
  return articleById.get(order.articleId)?.hasDeductible ? 'S' : 'B'
}

/** Clears every cell this table could have written in a previous batch, so stale sample/leftover rows never leak into a generated file. */
function clearTableRows(ws: ExcelJS.Worksheet, table: TableMapping): void {
  for (let r = table.startRow; r <= table.endRow; r++) {
    if (table.artikelNrColumn) ws.getCell(`${table.artikelNrColumn}${r}`).value = null
    if (!table.artikelNrColumn && table.bezeichnungColumn) ws.getCell(`${table.bezeichnungColumn}${r}`).value = null
    ws.getCell(`${table.mengeColumn}${r}`).value = null
    ws.getCell(`${table.nameColumn}${r}`).value = null
    ws.getCell(`${table.bosColumn}${r}`).value = null
  }
}

function writeTableRows(
  ws: ExcelJS.Worksheet,
  table: TableMapping,
  orders: Order[],
  articleById: Map<string, Article>,
): void {
  orders.forEach((order, i) => {
    const r = table.startRow + i
    const { firstName, lastName } = splitEmployeeName(order.employeeName)
    if (table.artikelNrColumn) {
      const asNumber = Number(order.articleNumber)
      ws.getCell(`${table.artikelNrColumn}${r}`).value = Number.isFinite(asNumber) && order.articleNumber !== '' ? asNumber : order.articleNumber
    } else if (table.bezeichnungColumn) {
      ws.getCell(`${table.bezeichnungColumn}${r}`).value = order.articleName
    }
    ws.getCell(`${table.mengeColumn}${r}`).value = order.quantity
    ws.getCell(`${table.nameColumn}${r}`).value = `${firstName} ${lastName}`.trim()
    ws.getCell(`${table.bosColumn}${r}`).value = bosFor(order, articleById)
  })
}

export interface GenerateResult {
  fileCount: number
  includedOrderIds: string[]
}

/**
 * Generates one Bestelldatei per page of `upperTable`/`lowerTable` capacity (whichever bucket
 * needs more pages), triggering a browser download for each, and returns which orders ended up
 * in a file so the caller can bulk-advance their status.
 */
export async function generateBestelldateien(
  orders: Order[],
  settings: BestellFormularSettings,
  articles: Article[],
): Promise<GenerateResult> {
  const articleById = new Map(articles.map((a) => [a.id, a]))
  const upperOrders = orders.filter((o) => o.articleNumber !== '')
  const lowerOrders = orders.filter((o) => o.articleNumber === '')

  const upperChunks = chunk(upperOrders, capacity(settings.upperTable))
  const lowerChunks = chunk(lowerOrders, capacity(settings.lowerTable))
  const fileCount = Math.max(upperChunks.length, lowerChunks.length)

  const includedOrderIds: string[] = []
  const todayLabel = new Date().toISOString().slice(0, 10)

  for (let i = 0; i < fileCount; i++) {
    const upperChunk = upperChunks[i] ?? []
    const lowerChunk = lowerChunks[i] ?? []

    const workbook = new ExcelJS.Workbook()
    await workbook.xlsx.load(base64ToArrayBuffer(settings.templateBase64))
    const ws = workbook.getWorksheet(settings.sheetName)
    if (!ws) throw new Error(`Blatt "${settings.sheetName}" nicht in der Vorlage gefunden.`)

    clearTableRows(ws, settings.upperTable)
    clearTableRows(ws, settings.lowerTable)
    writeTableRows(ws, settings.upperTable, upperChunk, articleById)
    writeTableRows(ws, settings.lowerTable, lowerChunk, articleById)

    if (settings.datumCell) ws.getCell(settings.datumCell).value = new Date()
    if (settings.ortsstelleCell) ws.getCell(settings.ortsstelleCell).value = settings.ortsstelle

    const buffer = await workbook.xlsx.writeBuffer()
    const blob = new Blob([buffer], { type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet' })
    const suffix = fileCount > 1 ? `-${i + 1}` : ''
    downloadBlob(blob, `Bestellformular-${settings.ortsstelle}-${todayLabel}${suffix}.xlsx`)

    includedOrderIds.push(...upperChunk.map((o) => o.id), ...lowerChunk.map((o) => o.id))

    if (i < fileCount - 1) await new Promise((resolve) => setTimeout(resolve, 300))
  }

  return { fileCount, includedOrderIds }
}
