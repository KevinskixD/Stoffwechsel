import { doc, serverTimestamp, updateDoc } from 'firebase/firestore'
import ExcelJS from 'exceljs'
import { db } from '../../firebase/config'
import { arrayBufferToBase64, base64ToArrayBuffer } from '../../shared/utils/file'
import type { Article } from '../../types/article'
import { BESTELL_FORMULAR_SETTINGS_DOC_ID, type BestellFormularSettings } from '../../types/bestellFormularSettings'
import type { Order } from '../../types/order'
import { getBestellFormularSettings } from './api'

export type MatrixSyncResult =
  | 'synced'
  | 'already_present'
  | 'skipped_no_number'
  | 'no_template'
  | 'no_matrix_sheet'
  | 'matrix_full'

interface LoadedMatrix {
  workbook: ExcelJS.Workbook
  ws: ExcelJS.Worksheet
  settings: BestellFormularSettings
}

/** Loads the stored template and its Matrix sheet, or null if either isn't configured/found. */
async function loadMatrix(settings: BestellFormularSettings): Promise<LoadedMatrix | null> {
  if (!settings.templateBase64 || !settings.matrixSheetName) return null
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(base64ToArrayBuffer(settings.templateBase64))
  const ws = workbook.getWorksheet(settings.matrixSheetName)
  if (!ws) return null
  return { workbook, ws, settings }
}

function cellText(ws: ExcelJS.Worksheet, column: string, row: number): string {
  const value = ws.getCell(`${column}${row}`).value
  return value == null ? '' : String(value).trim()
}

async function saveWorkbook(workbook: ExcelJS.Workbook): Promise<void> {
  const buffer = await workbook.xlsx.writeBuffer()
  await updateDoc(doc(db, 'bestellFormularSettings', BESTELL_FORMULAR_SETTINGS_DOC_ID), {
    templateBase64: arrayBufferToBase64(buffer as ArrayBuffer),
    updatedAt: serverTimestamp(),
  })
}

type InMemorySyncResult = 'synced' | 'already_present' | 'skipped_no_number' | 'matrix_full'

/**
 * Pure in-memory application of one article onto an already-loaded Matrix worksheet — no I/O, so
 * callers can apply many articles to the same loaded workbook and save once. Mutates `ws`.
 */
function applyArticleToMatrix(
  ws: ExcelJS.Worksheet,
  s: BestellFormularSettings,
  articleNumber: string,
  articleName: string,
): InMemorySyncResult {
  const trimmedNumber = articleNumber.trim()
  const trimmedName = articleName.trim()
  if (!trimmedNumber) return 'skipped_no_number'

  let targetRow: number | null = null
  for (let r = s.matrixStartRow; r <= ws.rowCount; r++) {
    const numberText = cellText(ws, s.matrixArtikelNrColumn, r)
    if (numberText === trimmedNumber) {
      const nameCell = ws.getCell(`${s.matrixBezeichnungColumn}${r}`)
      if (String(nameCell.value ?? '').trim() === trimmedName) return 'already_present'
      nameCell.value = trimmedName
      return 'synced'
    }
    if (targetRow === null && numberText === '' && cellText(ws, s.matrixBezeichnungColumn, r) === '') {
      targetRow = r
    }
  }

  if (targetRow === null) return 'matrix_full'

  const asNumber = Number(trimmedNumber)
  ws.getCell(`${s.matrixArtikelNrColumn}${targetRow}`).value = Number.isFinite(asNumber) ? asNumber : trimmedNumber
  ws.getCell(`${s.matrixBezeichnungColumn}${targetRow}`).value = trimmedName
  return 'synced'
}

/**
 * Best-effort sync of a single article into the Formular template's Matrix lookup sheet — never
 * throws, so a template-sync problem never blocks saving an article. The scan/write bound is
 * ws.rowCount (dynamic, re-read after every load), never a hardcoded row number, so it always
 * covers the template's actual current extent.
 */
export async function syncArticleToMatrix(articleNumber: string, articleName: string): Promise<MatrixSyncResult> {
  if (!articleNumber.trim()) return 'skipped_no_number'

  try {
    const settings = await getBestellFormularSettings()
    if (!settings.templateBase64) return 'no_template'

    const loaded = await loadMatrix(settings)
    if (!loaded) return 'no_matrix_sheet'
    const { workbook, ws, settings: s } = loaded

    const result = applyArticleToMatrix(ws, s, articleNumber, articleName)
    if (result === 'synced') await saveWorkbook(workbook)
    return result
  } catch {
    return 'no_matrix_sheet'
  }
}

export interface MatrixBulkSyncSummary {
  synced: number
  alreadyPresent: number
  matrixFull: number
  /** True if no template/Matrix sheet is configured at all — nothing could be checked. */
  noTemplate: boolean
}

/**
 * Bulk variant of syncArticleToMatrix for backfilling articles that predate this feature, were
 * bulk-imported (bypasses createArticle), or were inline-renamed (bypasses syncArticleToMatrix —
 * see CLAUDE.md). Loads and saves the template exactly once regardless of article count, instead
 * of once per article, to avoid hammering Firestore with repeated full-template re-uploads.
 */
export async function syncArticlesToMatrix(
  articles: { articleNumber: string; articleName: string }[],
): Promise<MatrixBulkSyncSummary> {
  const empty = { synced: 0, alreadyPresent: 0, matrixFull: 0, noTemplate: true }
  try {
    const settings = await getBestellFormularSettings()
    if (!settings.templateBase64) return empty

    const loaded = await loadMatrix(settings)
    if (!loaded) return empty
    const { workbook, ws, settings: s } = loaded

    let synced = 0
    let alreadyPresent = 0
    let matrixFull = 0
    for (const article of articles) {
      const result = applyArticleToMatrix(ws, s, article.articleNumber, article.articleName)
      if (result === 'synced') synced++
      else if (result === 'already_present') alreadyPresent++
      else if (result === 'matrix_full') matrixFull++
    }
    if (synced > 0) await saveWorkbook(workbook)
    return { synced, alreadyPresent, matrixFull, noTemplate: false }
  } catch {
    return empty
  }
}

export interface MatrixMismatch {
  articleNumber: string
  articleName: string
  reason: 'missing' | 'name_mismatch'
}

/**
 * Checks a set of orders' article numbers against the Matrix sheet, returning the ones that would
 * resolve incorrectly in a generated Bestelldatei — either missing entirely (#N/A) or present with
 * a stale Bezeichnung (e.g. an inline rename on ArticleListPage, which bypasses syncArticleToMatrix
 * — see CLAUDE.md). Shares the same dynamic ws.rowCount scan bound as syncArticleToMatrix, so both
 * see the same data range.
 *
 * The name comparison is against the article's CURRENT name (via `articles`/`order.articleId`),
 * never `order.articleName` — that field is a historical snapshot frozen at order time (see
 * "Orders denormalize employee/article data" in CLAUDE.md) and is expected to drift from the
 * live catalog after a rename, independent of whether the Matrix sheet is actually in sync. Only
 * the article number is read from the order itself, since that's the literal value
 * `generate.ts` writes into the Bestelldatei and looks up via VLOOKUP.
 */
export async function checkMatrixCoverage(
  orders: Order[],
  articles: Article[],
  settings: BestellFormularSettings,
): Promise<MatrixMismatch[]> {
  const loaded = await loadMatrix(settings).catch(() => null)
  if (!loaded) return []
  const { ws, settings: s } = loaded

  const knownNames = new Map<string, string>()
  for (let r = s.matrixStartRow; r <= ws.rowCount; r++) {
    const numberText = cellText(ws, s.matrixArtikelNrColumn, r)
    if (numberText) knownNames.set(numberText, cellText(ws, s.matrixBezeichnungColumn, r))
  }

  const articleById = new Map(articles.map((a) => [a.id, a]))

  const mismatchesByNumber = new Map<string, MatrixMismatch>()
  for (const order of orders) {
    if (!order.articleNumber || mismatchesByNumber.has(order.articleNumber)) continue
    const currentName = (articleById.get(order.articleId)?.articleName ?? order.articleName).trim()
    const storedName = knownNames.get(order.articleNumber)
    if (storedName === undefined) {
      mismatchesByNumber.set(order.articleNumber, {
        articleNumber: order.articleNumber,
        articleName: currentName,
        reason: 'missing',
      })
    } else if (storedName !== currentName) {
      mismatchesByNumber.set(order.articleNumber, {
        articleNumber: order.articleNumber,
        articleName: currentName,
        reason: 'name_mismatch',
      })
    }
  }
  return [...mismatchesByNumber.values()]
}
