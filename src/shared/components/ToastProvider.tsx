import { createContext, useCallback, useContext, useRef, useState, type ReactNode } from 'react'

export type ToastVariant = 'success' | 'error' | 'info'

interface Toast {
  id: number
  message: string
  variant: ToastVariant
}

interface ToastContextValue {
  showToast: (message: string, variant?: ToastVariant) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

const DURATION_MS: Record<ToastVariant, number> = {
  success: 4000,
  info: 4000,
  error: 6000,
}

const VARIANT_DOT_COLOR: Record<ToastVariant, string> = {
  success: 'var(--color-badge-green-fg)',
  error: 'var(--color-badge-red-fg)',
  info: 'var(--color-badge-amber-fg)',
}

export function useToast(): ToastContextValue {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast must be used within a ToastProvider')
  return context
}

export function ToastProvider({ children }: { children: ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([])
  const nextId = useRef(0)

  const dismiss = useCallback((id: number) => {
    setToasts((prev) => prev.filter((t) => t.id !== id))
  }, [])

  const showToast = useCallback(
    (message: string, variant: ToastVariant = 'info') => {
      const id = nextId.current++
      setToasts((prev) => [...prev, { id, message, variant }])
      setTimeout(() => dismiss(id), DURATION_MS[variant])
    },
    [dismiss],
  )

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      <div className="fixed right-6 bottom-6 z-50 flex w-full max-w-sm flex-col gap-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="flex items-start gap-2.5 rounded-lg border border-black/[0.08] bg-surface px-4 py-3 text-[13.5px] text-gray-900 shadow-[0_8px_24px_rgba(0,0,0,0.12)]"
          >
            <span
              className="mt-1.5 h-2 w-2 shrink-0 rounded-full"
              style={{ backgroundColor: VARIANT_DOT_COLOR[toast.variant] }}
            />
            <span className="flex-1">{toast.message}</span>
            <button
              type="button"
              onClick={() => dismiss(toast.id)}
              className="text-black/45 hover:text-black/70"
              aria-label="Schließen"
            >
              ×
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}
