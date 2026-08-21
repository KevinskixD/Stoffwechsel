import { getDocs } from 'firebase/firestore'
import { useEffect, useState } from 'react'
import { ConfirmDialog } from '../../shared/components/ConfirmDialog'
import { FormField, formInputClass } from '../../shared/components/FormField'
import { PageHeader } from '../../shared/components/PageHeader'
import { formatDateDe } from '../../shared/utils/date'
import type { ParsedDeliveryLine } from '../../types/lieferscheinCheck'
import { useOrderStatuses } from '../orderStatuses/hooks'
import { ordersQuery, updateOrdersStatus } from '../orders/api'
import { createLieferscheinCheckRecord, findLieferscheinCheckByNumber } from './api'
import { parseLieferscheinPdf } from './geminiExtractor'
import { matchDeliveryLines, type LineMatchResult } from './matching'

function blankLine(pos: number): ParsedDeliveryLine {
  return { pos, articleNumber: '', description: '', quantity: 1 }
}

export function LieferscheinCheckPage() {
  const { data: statuses } = useOrderStatuses(true)

  const [parsing, setParsing] = useState(false)
  const [parseError, setParseError] = useState('')
  const [lieferscheinNumber, setLieferscheinNumber] = useState('')
  const [lieferscheinDate, setLieferscheinDate] = useState('')
  const [lines, setLines] = useState<ParsedDeliveryLine[] | null>(null)

  const [sourceStatusId, setSourceStatusId] = useState('')
  const [targetStatusId, setTargetStatusId] = useState('')
  const [statusDefaultsSet, setStatusDefaultsSet] = useState(false)

  const [duplicateWarning, setDuplicateWarning] = useState('')
  const [matching, setMatching] = useState(false)
  const [matchResult, setMatchResult] = useState<LineMatchResult[] | null>(null)
  const [confirmOpen, setConfirmOpen] = useState(false)
  const [committing, setCommitting] = useState(false)
  const [resultMessage, setResultMessage] = useState('')
  const [matchError, setMatchError] = useState('')

  // Suggest statuses literally named "Bestellt"/"Abholbereit" as a one-time convenience default,
  // once, the first time statuses have loaded — the dropdowns stay freely user-editable after that.
  useEffect(() => {
    if (statusDefaultsSet || statuses.length === 0) return
    setSourceStatusId(statuses.find((s) => s.name === 'Bestellt')?.id ?? '')
    setTargetStatusId(statuses.find((s) => s.name === 'Abholbereit')?.id ?? '')
    setStatusDefaultsSet(true)
  }, [statusDefaultsSet, statuses])

  const sourceStatus = statuses.find((s) => s.id === sourceStatusId)
  const targetStatus = statuses.find((s) => s.id === targetStatusId)

  function resetAfterUpload() {
    setDuplicateWarning('')
    setMatchResult(null)
    setResultMessage('')
    setMatchError('')
  }

  async function handleFileChange(file: File | null) {
    if (!file) return
    setParseError('')
    resetAfterUpload()
    setLines(null)
    setParsing(true)
    try {
      const parsed = await parseLieferscheinPdf(file)
      setLieferscheinNumber(parsed.lieferscheinNumber)
      setLieferscheinDate(parsed.lieferscheinDate)
      setLines(parsed.lines.length > 0 ? parsed.lines : [blankLine(1)])
    } catch (err) {
      setParseError(err instanceof Error ? err.message : 'PDF konnte nicht gelesen werden.')
    } finally {
      setParsing(false)
    }
  }

  function updateLine(index: number, patch: Partial<ParsedDeliveryLine>) {
    resetAfterUpload()
    setLines((prev) => (prev ? prev.map((l, i) => (i === index ? { ...l, ...patch } : l)) : prev))
  }

  function removeLine(index: number) {
    resetAfterUpload()
    setLines((prev) => (prev ? prev.filter((_, i) => i !== index) : prev))
  }

  function addLine() {
    resetAfterUpload()
    setLines((prev) => [...(prev ?? []), blankLine((prev?.length ?? 0) + 1)])
  }

  async function handleAbgleichenClick(skipDuplicateCheck: boolean) {
    if (!lines || !sourceStatus || !targetStatus) return
    setResultMessage('')
    setMatchError('')

    try {
      if (lieferscheinNumber && !skipDuplicateCheck) {
        const existing = await findLieferscheinCheckByNumber(lieferscheinNumber)
        if (existing) {
          setDuplicateWarning(
            `Lieferschein "${lieferscheinNumber}" wurde bereits am ${formatDateDe(
              existing.createdAt.toISOString().slice(0, 10),
            )} verarbeitet (${existing.orderIds.length} Bestellung(en) betroffen). Trotzdem fortfahren?`,
          )
          return
        }
      }
      setDuplicateWarning('')

      setMatching(true)
      const snapshot = await getDocs(ordersQuery({ status: sourceStatus.name }))
      const pendingOrders = snapshot.docs.map((d) => d.data())
      setMatchResult(matchDeliveryLines(lines, pendingOrders))
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : 'Abgleich fehlgeschlagen.')
    } finally {
      setMatching(false)
    }
  }

  async function handleConfirmCommit() {
    if (!matchResult || !targetStatus) return
    setCommitting(true)
    setMatchError('')
    try {
      const matchedOrderIds = matchResult.flatMap((r) => r.matchedOrders.map((o) => o.id))
      const unmatchedArticleNumbers = matchResult.filter((r) => r.leftoverQuantity > 0).map((r) => r.line.articleNumber)

      await updateOrdersStatus(matchedOrderIds, targetStatus.id, targetStatus.name)
      await createLieferscheinCheckRecord({
        lieferscheinNumber: lieferscheinNumber || `ohne-nummer-${Date.now()}`,
        lieferscheinDate,
        orderIds: matchedOrderIds,
        unmatchedArticleNumbers,
      })

      setConfirmOpen(false)
      setResultMessage(
        `${matchedOrderIds.length} Bestellung(en) auf "${targetStatus.name}" gesetzt` +
          (unmatchedArticleNumbers.length > 0 ? `, ${unmatchedArticleNumbers.length} Zeile(n) nicht vollständig zugeordnet.` : '.'),
      )
    } catch (err) {
      setMatchError(err instanceof Error ? err.message : 'Speichern fehlgeschlagen.')
      setCommitting(false)
      return
    }
    setCommitting(false)
    setLines(null)
    setMatchResult(null)
    setLieferscheinNumber('')
    setLieferscheinDate('')
  }

  const totalMatchedOrders = matchResult?.reduce((sum, r) => sum + r.matchedOrders.length, 0) ?? 0
  const totalIncomplete = matchResult?.filter((r) => r.leftoverQuantity > 0).length ?? 0

  return (
    <div className="px-11 pt-9 pb-15">
      <PageHeader
        title="Lieferschein prüfen"
        subtitle="Lieferschein hochladen und automatisch die passenden Bestellungen auf abholbereit setzen"
      />

      <div className="mb-6 rounded-xl border border-black/[0.08] bg-surface p-5">
        <FormField label="Lieferschein-PDF">
          <input
            type="file"
            accept="application/pdf"
            onChange={(e) => void handleFileChange(e.target.files?.[0] ?? null)}
            className="block text-[13px] text-black/65 file:mr-3.5 file:rounded-lg file:border-0 file:bg-brand/10 file:px-4 file:py-2 file:text-[13px] file:font-bold file:text-brand hover:file:bg-brand/15"
          />
        </FormField>
        {parsing && <p className="mt-3 text-[13px] text-black/55">Wird mit Gemini analysiert…</p>}
        {parseError && <p className="mt-3 text-[13px] font-semibold text-red-600">{parseError}</p>}
      </div>

      {lines && (
        <div className="mb-6 rounded-xl border border-black/[0.08] bg-surface p-5">
          <div className="mb-4 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Lieferschein-Nummer">
              <input
                value={lieferscheinNumber}
                onChange={(e) => {
                  setLieferscheinNumber(e.target.value)
                  resetAfterUpload()
                }}
                className={formInputClass}
              />
            </FormField>
            <FormField label="Datum">
              <input
                value={lieferscheinDate}
                onChange={(e) => {
                  setLieferscheinDate(e.target.value)
                  resetAfterUpload()
                }}
                className={formInputClass}
              />
            </FormField>
          </div>

          <h2 className="mb-2 text-[13px] font-bold text-black/55">Erkannte Positionen (vor Abgleich prüfen/korrigieren)</h2>
          <div className="space-y-2">
            {lines.map((line, index) => (
              <div key={index} className="grid grid-cols-[100px_1fr_100px_auto] items-center gap-2">
                <input
                  value={line.articleNumber}
                  onChange={(e) => updateLine(index, { articleNumber: e.target.value })}
                  placeholder="Artikelnr."
                  className={formInputClass}
                />
                <input
                  value={line.description}
                  onChange={(e) => updateLine(index, { description: e.target.value })}
                  placeholder="Bezeichnung"
                  className={formInputClass}
                />
                <input
                  type="number"
                  min={1}
                  step={1}
                  value={line.quantity}
                  onChange={(e) => updateLine(index, { quantity: Number(e.target.value) })}
                  className={formInputClass}
                />
                <button
                  type="button"
                  onClick={() => removeLine(index)}
                  className="rounded-lg border border-black/[0.12] px-3 py-2.5 text-[13px] font-bold text-black/45"
                >
                  Entfernen
                </button>
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addLine}
            className="mt-3 rounded-lg border border-black/[0.12] px-3.5 py-2 text-[13px] font-bold text-gray-900"
          >
            + Zeile hinzufügen
          </button>

          <div className="mt-5 grid grid-cols-1 gap-4 sm:grid-cols-2">
            <FormField label="Quellstatus (wartende Bestellungen)">
              <select
                value={sourceStatusId}
                onChange={(e) => {
                  setSourceStatusId(e.target.value)
                  resetAfterUpload()
                }}
                className={formInputClass}
              >
                <option value="">–</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FormField>
            <FormField label="Zielstatus (bei Treffer)">
              <select
                value={targetStatusId}
                onChange={(e) => {
                  setTargetStatusId(e.target.value)
                  resetAfterUpload()
                }}
                className={formInputClass}
              >
                <option value="">–</option>
                {statuses.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </FormField>
          </div>

          {duplicateWarning && (
            <p className="mt-4 rounded-lg border border-amber-300 bg-amber-50 p-3 text-[13px] font-semibold text-amber-800">
              {duplicateWarning}
            </p>
          )}
          {matchError && (
            <p className="mt-4 rounded-lg border border-red-300 bg-red-50 p-3 text-[13px] font-semibold text-red-700">
              {matchError}
            </p>
          )}

          <button
            type="button"
            disabled={matching || !sourceStatus || !targetStatus || lines.length === 0}
            onClick={() => void handleAbgleichenClick(duplicateWarning !== '')}
            className="mt-4 rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {duplicateWarning ? 'Trotzdem abgleichen' : 'Bestellungen abgleichen'}
          </button>
        </div>
      )}

      {matchResult && (
        <div className="mb-6 rounded-xl border border-black/[0.08] bg-surface p-5">
          <h2 className="mb-3 text-[15px] font-extrabold text-gray-900">Abgleich-Vorschau</h2>
          <div className="space-y-4">
            {matchResult.map((r, index) => (
              <div key={index} className="rounded-lg border border-black/[0.08] p-3">
                <p className="text-[13.5px] font-bold text-gray-900">
                  {r.line.articleNumber} — {r.line.description} ({r.line.quantity} geliefert)
                </p>
                {r.matchedOrders.length > 0 ? (
                  <ul className="mt-1.5 space-y-0.5 text-[13px] text-black/70">
                    {r.matchedOrders.map((o) => (
                      <li key={o.id}>
                        {o.quantity}x {o.employeeName} (bestellt am {formatDateDe(o.orderDate)})
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="mt-1.5 text-[13px] text-black/45">Keine passende wartende Bestellung gefunden.</p>
                )}
                {r.leftoverQuantity > 0 && (
                  <p className="mt-1.5 text-[13px] font-semibold text-amber-700">
                    Rest von {r.leftoverQuantity} nicht zugeordnet (nächste wartende Bestellung braucht mehr, als noch übrig
                    ist).
                  </p>
                )}
              </div>
            ))}
          </div>

          <button
            type="button"
            disabled={totalMatchedOrders === 0}
            onClick={() => setConfirmOpen(true)}
            className="mt-4 rounded-lg bg-brand px-4.5 py-2.5 text-[13.5px] font-bold text-white hover:bg-brand-dark disabled:opacity-50"
          >
            {totalMatchedOrders} Bestellung(en) auf "{targetStatus?.name}" setzen
          </button>
        </div>
      )}

      {resultMessage && <p className="text-[13px] font-semibold text-black/60">{resultMessage}</p>}

      <ConfirmDialog
        open={confirmOpen}
        title="Bestellungen aktualisieren"
        message={`${totalMatchedOrders} Bestellung(en) werden auf "${targetStatus?.name}" gesetzt.` + (totalIncomplete > 0 ? ` ${totalIncomplete} Lieferschein-Zeile(n) bleiben unvollständig zugeordnet.` : '')}
        confirmLabel="Bestätigen"
        onConfirm={() => void handleConfirmCommit()}
        onCancel={() => setConfirmOpen(false)}
      />
      {committing && <p className="mt-2 text-[13px] text-black/45">Wird gespeichert…</p>}
    </div>
  )
}
