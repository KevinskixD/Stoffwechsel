interface PaginationProps {
  hasPrevious: boolean
  hasNext: boolean
  onPrevious: () => void
  onNext: () => void
  pageLabel?: string
}

export function Pagination({ hasPrevious, hasNext, onPrevious, onNext, pageLabel }: PaginationProps) {
  return (
    <div className="flex items-center justify-between gap-4 py-3">
      <button
        type="button"
        onClick={onPrevious}
        disabled={!hasPrevious}
        className="rounded-lg border border-black/[0.12] px-3.5 py-1.5 text-sm font-semibold text-gray-900 disabled:opacity-40"
      >
        Zurück
      </button>
      {pageLabel ? <span className="text-xs font-semibold text-black/45">{pageLabel}</span> : null}
      <button
        type="button"
        onClick={onNext}
        disabled={!hasNext}
        className="rounded-lg border border-black/[0.12] px-3.5 py-1.5 text-sm font-semibold text-gray-900 disabled:opacity-40"
      >
        Weiter
      </button>
    </div>
  )
}
