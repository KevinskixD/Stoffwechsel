import { httpsCallable } from 'firebase/functions'
import { functions } from '../../firebase/config'
import { fileToBase64 } from '../../shared/utils/file'
import type { ParsedDeliveryLine } from '../../types/lieferscheinCheck'

export interface ParsedLieferschein {
  lieferscheinNumber: string
  lieferscheinDate: string
  lines: ParsedDeliveryLine[]
}

interface RawParsedLine {
  pos?: unknown
  articleNumber?: unknown
  description?: unknown
  quantity?: unknown
}

interface RawParsedResponse {
  lieferscheinNumber?: unknown
  lieferscheinDate?: unknown
  lines?: RawParsedLine[]
}

interface ExtractDeliveryNoteRequest {
  pdfBase64: string
}

export async function parseLieferscheinPdf(file: File): Promise<ParsedLieferschein> {
  const extractDeliveryNote = httpsCallable<ExtractDeliveryNoteRequest, RawParsedResponse>(functions, 'extractDeliveryNote')
  const result = await extractDeliveryNote({ pdfBase64: await fileToBase64(file) })
  const parsed = result.data
  return {
    lieferscheinNumber: typeof parsed.lieferscheinNumber === 'string' ? parsed.lieferscheinNumber : '',
    lieferscheinDate: typeof parsed.lieferscheinDate === 'string' ? parsed.lieferscheinDate : '',
    lines: (parsed.lines ?? []).map(
      (l, index): ParsedDeliveryLine => ({
        pos: Number(l.pos) || index + 1,
        articleNumber: typeof l.articleNumber === 'string' ? l.articleNumber : '',
        description: typeof l.description === 'string' ? l.description : '',
        quantity: Number(l.quantity) || 0,
      }),
    ),
  }
}
