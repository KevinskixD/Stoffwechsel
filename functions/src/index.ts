import { GoogleGenAI, Type, type Schema } from '@google/genai'
import { defineSecret } from 'firebase-functions/params'
import { setGlobalOptions } from 'firebase-functions/v2'
import { HttpsError, onCall } from 'firebase-functions/v2/https'

const ALLOWED_EMAIL = 'kevin.kundigraber@gmail.com'
const MAX_PDF_BYTES = 8 * 1024 * 1024
const geminiApiKey = defineSecret('GEMINI_API_KEY')

setGlobalOptions({ region: 'europe-west1', maxInstances: 2 })

interface ExtractDeliveryNoteRequest {
  pdfBase64: string
}

interface ParsedDeliveryLine {
  pos: number
  articleNumber: string
  description: string
  quantity: number
}

interface ParsedLieferschein {
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

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    lieferscheinNumber: { type: Type.STRING },
    lieferscheinDate: { type: Type.STRING },
    lines: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          pos: { type: Type.INTEGER },
          articleNumber: { type: Type.STRING },
          description: { type: Type.STRING },
          quantity: { type: Type.NUMBER },
        },
        required: ['pos', 'articleNumber', 'description', 'quantity'],
      },
    },
  },
  required: ['lieferscheinNumber', 'lieferscheinDate', 'lines'],
}

const PROMPT = `Dies ist ein Lieferschein eines Uniform-Lieferanten (Rotes Kreuz Einkauf & Service). Extrahiere die Lieferschein-Nummer, das Lieferdatum und alle Zeilen aus der Positionstabelle (Spalten Pos., Artikel [Artikelnummer + Bezeichnung], Menge). Ignoriere handschriftliche Häkchen/Unterschriften sowie die Spalten "bisher geliefert" und "noch zu liefern" — gib bei quantity ausschließlich die gelieferte Menge aus der Spalte "Menge" zurück, als reine Zahl ohne Einheit (Stück/Paar).`

function readPdf(base64: unknown): Buffer {
  if (typeof base64 !== 'string' || !/^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(base64)) {
    throw new HttpsError('invalid-argument', 'Die hochgeladene Datei ist kein gültiges PDF.')
  }

  const pdf = Buffer.from(base64, 'base64')
  if (pdf.length === 0 || !pdf.subarray(0, 5).equals(Buffer.from('%PDF-'))) {
    throw new HttpsError('invalid-argument', 'Die hochgeladene Datei ist kein gültiges PDF.')
  }
  if (pdf.length > MAX_PDF_BYTES) {
    throw new HttpsError('resource-exhausted', 'Das PDF darf höchstens 8 MB groß sein.')
  }
  return pdf
}

function normalizeResponse(raw: RawParsedResponse): ParsedLieferschein {
  return {
    lieferscheinNumber: typeof raw.lieferscheinNumber === 'string' ? raw.lieferscheinNumber : '',
    lieferscheinDate: typeof raw.lieferscheinDate === 'string' ? raw.lieferscheinDate : '',
    lines: (raw.lines ?? []).map((line, index) => ({
      pos: Number(line.pos) || index + 1,
      articleNumber: typeof line.articleNumber === 'string' ? line.articleNumber : '',
      description: typeof line.description === 'string' ? line.description : '',
      quantity: Number(line.quantity) || 0,
    })),
  }
}

/** Extracts delivery-note line items without exposing the Gemini credential to the browser. */
export const extractDeliveryNote = onCall<ExtractDeliveryNoteRequest>(
  { secrets: [geminiApiKey] },
  async (request): Promise<ParsedLieferschein> => {
    const email = request.auth?.token.email
    if (!request.auth || request.auth.token.email_verified !== true) {
      throw new HttpsError('unauthenticated', 'Anmeldung mit einem verifizierten Google-Konto erforderlich.')
    }
    if (email !== ALLOWED_EMAIL) {
      throw new HttpsError('permission-denied', 'Dieser Google-Account ist nicht autorisiert.')
    }

    const pdf = readPdf(request.data.pdfBase64)
    const ai = new GoogleGenAI({ apiKey: geminiApiKey.value() })
    const response = await ai.models.generateContent({
      model: 'gemini-flash-latest',
      contents: [
        {
          role: 'user',
          parts: [
            { inlineData: { mimeType: 'application/pdf', data: pdf.toString('base64') } },
            { text: PROMPT },
          ],
        },
      ],
      config: { responseMimeType: 'application/json', responseSchema: RESPONSE_SCHEMA },
    })

    if (!response.text) throw new HttpsError('internal', 'Gemini hat keine Antwort geliefert.')
    try {
      return normalizeResponse(JSON.parse(response.text) as RawParsedResponse)
    } catch {
      throw new HttpsError('internal', 'Gemini hat eine ungültige Antwort geliefert.')
    }
  },
)
