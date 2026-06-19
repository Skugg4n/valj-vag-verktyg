import { createContext, useContext, useState, useEffect } from 'react'
import { onAuthStateChanged, signInWithPopup, signInWithRedirect, getRedirectResult, signOut } from 'firebase/auth'
import { auth, googleProvider } from './firebase.js'

const AuthContext = createContext(null)

// Popup OAuth is unreliable on mobile (the popup opens then vanishes before the
// flow finishes). Use a full-page redirect there instead.
const isMobileBrowser = () =>
  typeof navigator !== 'undefined' && /Mobi|Android|iPhone|iPad|iPod/i.test(navigator.userAgent || '')

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }
    // Complete a redirect-based sign-in if we are returning from one (mobile).
    getRedirectResult(auth).catch((err) => console.error('Redirect sign-in failed:', err))
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  const loginWithGoogle = () => {
    if (!auth) return Promise.resolve()
    if (isMobileBrowser()) return signInWithRedirect(auth, googleProvider)
    // Desktop: keep the nicer popup, but fall back to redirect if it is blocked
    // or dismissed.
    return signInWithPopup(auth, googleProvider).catch((err) => {
      const code = err?.code
      if (code === 'auth/popup-blocked' || code === 'auth/popup-closed-by-user' || code === 'auth/cancelled-popup-request') {
        return signInWithRedirect(auth, googleProvider)
      }
      throw err
    })
  }
  const logout = () => {
    if (!auth) return Promise.resolve()
    return signOut(auth)
  }

  return (
    <AuthContext.Provider value={{ user, loading, loginWithGoogle, logout }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
