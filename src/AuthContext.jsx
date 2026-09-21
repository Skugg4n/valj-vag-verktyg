import { createContext, useContext, useState, useEffect } from 'react'
import {
  onAuthStateChanged,
  signInWithPopup,
  signInWithCredential,
  linkWithPopup,
  signOut,
  GoogleAuthProvider,
} from 'firebase/auth'
import { collection, getDocs, doc, setDoc } from 'firebase/firestore'
import { auth, googleProvider, db } from './firebase.js'
import { copyProjects } from './migrateProjects.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!auth) {
      setLoading(false)
      return
    }
    const unsubscribe = onAuthStateChanged(auth, (u) => {
      setUser(u)
      setLoading(false)
    })
    return unsubscribe
  }, [])

  // Logging in must NEVER lose the work made before login. If the current
  // session is anonymous, upgrade it to Google instead of replacing it:
  //  - linkWithPopup keeps the same uid, so all data stays put.
  //  - if that Google account already exists, we carry this browser's anonymous
  //    work over to it before signing in (read while still anon, write after).
  const loginWithGoogle = async () => {
    if (!auth) return
    const current = auth.currentUser
    if (current && current.isAnonymous) {
      try {
        await linkWithPopup(current, googleProvider)
        return
      } catch (err) {
        const code = err?.code
        if (code === 'auth/credential-already-in-use' || code === 'auth/email-already-in-use') {
          const anonUid = current.uid
          const cred = GoogleAuthProvider.credentialFromError(err)
          // Read the anonymous work BEFORE switching identity (rules are per-uid).
          let held = []
          try {
            const snap = await getDocs(collection(db, 'users', anonUid, 'projects'))
            held = snap.docs.map((d) => ({ id: d.id, data: d.data() }))
          } catch {
            // Could not read the work to move it. Stay anonymous (the work is
            // intact on this device) and ask the user to retry, instead of
            // signing in and silently leaving it behind.
            const e = new Error(
              'Kunde inte flytta över dina berättelser just nu. De ligger kvar i den här webbläsaren. Försök logga in igen om en stund.'
            )
            e.code = 'migration-read-failed'
            throw e
          }
          const result = cred
            ? await signInWithCredential(auth, cred)
            : await signInWithPopup(auth, googleProvider)
          // Carry the work into the existing account (merge, never overwrites).
          // Surface any failed copies instead of losing them silently.
          const { failed, total } = await copyProjects(held, (p) =>
            setDoc(doc(db, 'users', result.user.uid, 'projects', p.id), p.data, { merge: true })
          )
          if (failed > 0) {
            const e = new Error(
              `Kunde inte flytta över ${failed} av ${total} berättelser till ditt konto. De ligger kvar i den här webbläsaren.`
            )
            e.code = 'migration-partial'
            throw e
          }
          return
        }
        throw err
      }
    }
    return signInWithPopup(auth, googleProvider)
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
