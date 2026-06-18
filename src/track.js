// Thin Firebase wrapper for the analytics event log + aggregate counters.
// Pure context/shape logic lives in eventContext.js (unit-tested there).
// Every function is best-effort and never throws into the UI.
import { collection, addDoc, doc, setDoc, serverTimestamp, increment } from 'firebase/firestore'
import { signInAnonymously } from 'firebase/auth'
import { auth, db } from './firebase.js'
import { buildEvent, getContext, markViewedThisSession } from './eventContext.js'

export { markViewedThisSession }

// Ensure there is a (pseudonymous) identity so events satisfy the rules.
// Firebase persists anonymous users, so returning visitors reuse the same uid.
export async function ensureAnonAuth() {
  if (auth?.currentUser) return auth.currentUser
  try {
    const cred = await signInAnonymously(auth)
    return cred.user
  } catch (err) {
    console.error('Anonymous sign-in failed:', err)
    return null
  }
}

// Fire-and-forget event write. Skips silently if there is no identity yet —
// callers that need guaranteed logging should ensureAnonAuth() first.
export async function track(type, payload = {}, view) {
  try {
    const u = auth?.currentUser
    if (!u) return
    await addDoc(collection(db, 'events'), {
      ...buildEvent(type, payload, getContext(view), u.uid),
      ts: serverTimestamp(),
    })
    bumpDaily(type)
  } catch {
    /* analytics must never interrupt the app */
  }
}

// Per-day aggregate counter — cheap dashboard reads. Best-effort.
export async function bumpDaily(type) {
  try {
    const day = new Date().toISOString().slice(0, 10) // YYYY-MM-DD (UTC)
    await setDoc(
      doc(db, 'stats', day),
      { [type]: increment(1), updatedAt: serverTimestamp() },
      { merge: true }
    )
  } catch {
    /* ignore */
  }
}

// Bump a published story's view counters. `unique` also increments viewsUnique.
// Rules permit non-owners to touch only these counter fields.
export async function bumpView(shareId, unique = false) {
  if (!shareId) return
  try {
    const data = { views: increment(1), lastViewedAt: serverTimestamp() }
    if (unique) data.viewsUnique = increment(1)
    await setDoc(doc(db, 'published', shareId), data, { merge: true })
  } catch {
    /* ignore */
  }
}
