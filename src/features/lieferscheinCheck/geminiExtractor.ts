import { GoogleGenAI, Type, type Schema } from '@google/genai'
import { fileToBase64 } from '../../shared/utils/file'
import type { ParsedDeliveryLine } from '../../types/lieferscheinCheck'

/**
 * "gemini-2.5-flash" (and other pinned versions) can stop being available to new API keys
 * without notice — the "-latest" alias always resolves to Google's current recommended flash
 * model instead, avoiding hardcoding a version that may later 404.
 */
const DEFAULT_MODEL = 'gemini-flash-latest'

export interface ParsedLieferschein {
  lieferscheinNumber: string
  lieferscheinDate: string
  lines: ParsedDeliveryLine[]
}

const RESPONSE_SCHEMA: Schema = {
  type: Type.OBJECT,
  properties: {
    lieferscheinNumber: {
      type: Type.STRING,
      description: 'Die Lieferschein-Nummer, z.B. "LS06557363". Leerstring falls nicht erkennbar.',
    },
    lieferscheinDate: {
      type: Type.STRING,
      description: 'Das Lieferdatum genau wie im Dokument angegeben, z.B. "21.07.26". Leerstring falls nicht erkennbar.',
    },
    lines: {
      type: Type.ARRAY,
      description: 'Eine Zeile pro gelieferter Position aus der Positionstabelle des Lieferscheins.',
      items: {
        type: Type.OBJECT,
        properties: {
          pos: { type: Type.INTEGER, description: 'Positionsnummer aus der Spalte "Pos."' },
          articleNumber: { type: Type.STRING, description: 'Die Artikelnummer, z.B. "2013113".' },
          description: { type: Type.STRING, description: 'Die Artikelbezeichnung, ohne die Artikelnummer.' },
          quantity: {
            type: Type.NUMBER,
            description: 'Die gelieferte Menge aus der Spalte "Menge", nur die Zahl, ohne Einheit (Stück/Paar).',
          },
        },
        required: ['pos', 'articleNumber', 'description', 'quantity'],
      },
    },
  },
  required: ['lieferscheinNumber', 'lieferscheinDate', 'lines'],
}

const PROMPT = `Dies ist ein Lieferschein eines Uniform-Lieferanten (Rotes Kreuz Einkauf & Service). Extrahiere die Lieferschein-Nummer, das Lieferdatum und alle Zeilen aus der Positionstabelle (Spalten Pos., Artikel [Artikelnummer + Bezeichnung], Menge). Ignoriere handschriftliche Häkchen/Unterschriften sowie die Spalten "bisher geliefert" und "noch zu liefern" — gib bei quantity ausschließlich die gelieferte Menge aus der Spalte "Menge" zurück, als reine Zahl ohne Einheit (Stück/Paar).`

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

export async function parseLieferscheinPdf(file: File): Promise<ParsedLieferschein> {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY
  if (!apiKey) {
    throw new Error('Kein Gemini-API-Key konfiguriert (VITE_GEMINI_API_KEY in .env.local setzen).')
  }
  const model = import.meta.env.VITE_GEMINI_MODEL || DEFAULT_MODEL

  const ai = new GoogleGenAI({ apiKey })
  const data = await fileToBase64(file)
  const response = await ai.models.generateContent({
    model,
    contents: [
      {
        role: 'user',
        parts: [{ inlineData: { mimeType: file.type || 'application/pdf', data } }, { text: PROMPT }],
      },
    ],
    config: {
      responseMimeType: 'application/json',
      responseSchema: RESPONSE_SCHEMA,
    },
  })

  const text = response.text
  if (!text) throw new Error('Gemini hat keine Antwort geliefert.')

  const parsed = JSON.parse(text) as RawParsedResponse
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
