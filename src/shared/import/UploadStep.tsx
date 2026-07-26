import { useRef, useState } from 'react'
import { parseWorkbook, type ParsedWorkbook } from './parseWorkbook'

interface UploadStepProps {
  onParsed: (parsed: ParsedWorkbook) => void
}

export function UploadStep({ onParsed }: UploadStepProps) {
  const [error, setError] = useState<string | null>(null)
  const [dragOver, setDragOver] = useState(false)
  const inputRef = useRef<HTMLInputElement>(null)

  async function handleFile(file: File) {
    setError(null)
    try {
      const parsed = await parseWorkbook(file)
      if (parsed.rows.length === 0) {
        setError('Die Datei enthält keine Datenzeilen.')
        return
      }
      onParsed(parsed)
    } catch {
      setError('Datei konnte nicht gelesen werden. Bitte eine gültige .xlsx-Datei wählen.')
    }
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault()
        setDragOver(true)
      }}
      onDragLeave={() => setDragOver(false)}
      onDrop={(e) => {
        e.preventDefault()
        setDragOver(false)
        const file = e.dataTransfer.files[0]
        if (file) void handleFile(file)
      }}
      onClick={() => inputRef.current?.click()}
      className={`flex cursor-pointer flex-col items-center justify-center rounded-xl border-2 border-dashed p-12 text-center ${
        dragOver ? 'border-brand bg-brand-tint' : 'border-black/15'
      }`}
    >
      <p className="text-[13.5px] text-gray-600">Excel-Datei (.xlsx) hier ablegen oder klicken zum Auswählen</p>
      <input
        ref={inputRef}
        type="file"
        accept=".xlsx"
        className="hidden"
        onChange={(e) => {
          const file = e.target.files?.[0]
          if (file) void handleFile(file)
        }}
      />
      {error ? <p className="mt-3 text-sm text-red-600">{error}</p> : null}
    </div>
  )
}
