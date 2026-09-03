import logo from '../../assets/oerk-logo.png'
import { GoogleLogoIcon } from './icons'

interface LoginScreenProps {
  onSignIn: () => void
  error: string | null
}

export function LoginScreen({ onSignIn, error }: LoginScreenProps) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-page px-4">
      <div className="w-full max-w-sm rounded-xl border border-black/[0.08] bg-surface p-8 text-center shadow-[0_8px_24px_rgba(0,0,0,0.06)]">
        <img src={logo} alt="ÖRK Logo" className="mx-auto mb-4 h-16 w-16 object-contain" />
        <h1 className="mb-1 text-lg font-extrabold text-gray-900">Bekleidungsreferat</h1>
        <p className="mb-6 text-sm text-black/55">Bitte mit dem autorisierten Google-Konto anmelden.</p>

        <button
          type="button"
          onClick={onSignIn}
          className="flex w-full items-center justify-center gap-3 rounded-lg border border-black/[0.08] px-4 py-2.5 text-sm font-semibold text-gray-900 hover:bg-brand-tint"
        >
          <GoogleLogoIcon />
          Mit Google anmelden
        </button>

        {error && <p className="mt-4 text-sm font-medium text-red-600">{error}</p>}
      </div>
    </div>
  )
}
