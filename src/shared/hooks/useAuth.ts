import { onAuthStateChanged, signInWithPopup, signOut, type User } from 'firebase/auth'
import { useEffect, useState } from 'react'
import { ALLOWED_EMAIL, auth, googleProvider } from '../../firebase/config'

interface AuthState {
  user: User | null
  loading: boolean
  error: string | null
  signIn: () => Promise<void>
  signOutUser: () => Promise<void>
}

/**
 * Wraps Firebase Auth's onAuthStateChanged and restricts sign-in to a single Google account.
 * The client-side check here is a UX convenience (immediate feedback instead of silent
 * permission-denied Firestore errors) — the real enforcement is isAuthorized() in
 * firestore.rules, since the Firebase config is public in the client bundle either way.
 */
export function useAuth(): AuthState {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    return onAuthStateChanged(auth, (firebaseUser) => {
      if (firebaseUser && firebaseUser.email !== ALLOWED_EMAIL) {
        signOut(auth)
        setError('Dieser Google-Account ist nicht autorisiert.')
        setUser(null)
      } else {
        setUser(firebaseUser)
      }
      setLoading(false)
    })
  }, [])

  const signIn = async () => {
    setError(null)
    try {
      await signInWithPopup(auth, googleProvider)
    } catch {
      setError('Anmeldung fehlgeschlagen. Bitte erneut versuchen.')
    }
  }

  const signOutUser = () => signOut(auth)

  return { user, loading, error, signIn, signOutUser }
}
