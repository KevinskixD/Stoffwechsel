import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CommitStep } from './CommitStep'
import { MappingStep } from './MappingStep'
import type { ParsedWorkbook } from './parseWorkbook'
import { PreviewStep } from './PreviewStep'
import type { ImportEntityConfig, ImportRowState } from './types'
import { UploadStep } from './UploadStep'
import { validateAndResolveRows } from './validate'

interface ImportWizardProps<T, P> {
  config: ImportEntityConfig<T, P>
}

type Step = 'upload' | 'mapping' | 'preview' | 'commit'

export function ImportWizard<T, P>({ config }: ImportWizardProps<T, P>) {
  const navigate = useNavigate()
  const [step, setStep] = useState<Step>('upload')
  const [parsed, setParsed] = useState<ParsedWorkbook | null>(null)
  const [rows, setRows] = useState<ImportRowState[]>([])
  const [validating, setValidating] = useState(false)

  async function handleMappingContinue(mapping: Record<string, string>) {
    if (!parsed) return
    setValidating(true)
    const validated = await validateAndResolveRows(parsed.rows, mapping, config)
    setRows(validated)
    setValidating(false)
    setStep('preview')
  }

  return (
    <div className="px-11 pt-9 pb-15">
      <div className="mx-auto max-w-3xl rounded-2xl border border-black/[0.08] bg-surface p-7">
        <h1 className="mb-4 text-[17px] font-extrabold text-gray-900">{config.entityLabel} importieren</h1>

        {step === 'upload' && (
          <UploadStep
            onParsed={(p) => {
              setParsed(p)
              setStep('mapping')
            }}
          />
        )}

        {step === 'mapping' &&
          parsed &&
          (validating ? (
            <p className="text-gray-400">Prüfe Daten…</p>
          ) : (
            <MappingStep
              config={config}
              headers={parsed.headers}
              onBack={() => setStep('upload')}
              onContinue={handleMappingContinue}
            />
          ))}

        {step === 'preview' && (
          <PreviewStep
            config={config}
            rows={rows}
            onBack={() => setStep('mapping')}
            onConfirm={() => setStep('commit')}
          />
        )}

        {step === 'commit' && <CommitStep config={config} rows={rows} onDone={() => navigate(config.listPath)} />}
      </div>
    </div>
  )
}
