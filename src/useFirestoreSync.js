import { useEffect, useRef, useCallback } from 'react'
import {
  collection,
  doc,
  setDoc,
  addDoc,
  getDoc,
  getDocFromServer,
  getDocs,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
  query,
  orderBy,
  limit,
} from 'firebase/firestore'
import { db } from './firebase.js'

// Standalone (no auth) read of a published story for the public /spela/:id
// reader. Rules allow read: if true.
export async function getPublished(shareId) {
  try {
    const snap = await getDoc(doc(db, 'published', shareId))
    return snap.exists() ? snap.data() : null
  } catch (err) {
    console.error('Load published failed:', err)
    return null
  }
}

/**
 * Syncs project data to Firestore when user is logged in.
 * Falls back to localStorage-only when not logged in.
 *
 * Firestore structure:
 *   users/{uid}/projects/{projectId} => { projectName, nextNodeId, nodes[], updatedAt }
 *   users/{uid}/projects/{projectId}/history/{auto} => snapshots every 5 min
 */
const HISTORY_INTERVAL_MS = 5 * 60 * 1000 // 5 minutes

export default function useFirestoreSync({ user, setProjects }) {
  const initialLoadDone = useRef(false)
  const unsubRef = useRef(null)
  const lastHistorySave = useRef(0)

  // Collection ref for the user's projects
  const getProjectsCol = useCallback(() => {
    if (!user) return null
    return collection(db, 'users', user.uid, 'projects')
  }, [user])

  // Load all projects from Firestore on login
  useEffect(() => {
    if (!user) {
      initialLoadDone.current = false
      // Clean up listener
      if (unsubRef.current) {
        unsubRef.current()
        unsubRef.current = null
      }
      return
    }

    const col = getProjectsCol()
    if (!col) return

    // Real-time listener for all projects
    const unsub = onSnapshot(col, (snapshot) => {
      const firestoreProjects = {}
      snapshot.forEach((docSnap) => {
        const data = docSnap.data()
        firestoreProjects[docSnap.id] = {
          id: docSnap.id,
          start: data.createdAt?.toMillis?.() || Date.now(),
          updated: data.updatedAt?.toMillis?.() || Date.now(),
          data: {
            projectName: data.projectName || '',
            nextNodeId: data.nextNodeId || 1,
            nodes: data.nodes || [],
          },
        }
      })

      if (!initialLoadDone.current) {
        // First load: merge Firestore projects with any localStorage projects
        setProjects((localProjects) => {
          const merged = { ...localProjects }
          for (const [id, fp] of Object.entries(firestoreProjects)) {
            const local = merged[id]
            // Firestore wins if newer or local doesn't exist
            if (!local || (fp.updated || 0) >= (local.updated || 0)) {
              merged[id] = fp
            }
          }
          return merged
        })
        initialLoadDone.current = true
      } else {
        // Subsequent updates: just use Firestore as source of truth
        setProjects((prev) => {
          const merged = { ...prev }
          for (const [id, fp] of Object.entries(firestoreProjects)) {
            merged[id] = fp
          }
          return merged
        })
      }
    }, (error) => {
      console.error('Firestore listener error:', error)
    })

    unsubRef.current = unsub
    return () => unsub()
  }, [user, getProjectsCol, setProjects])

  // Save current project to Firestore whenever projects change
  const saveToFirestore = useCallback(
    async (projId, projectData) => {
      if (!user) return
      const col = getProjectsCol()
      if (!col) return

      try {
        const projectDoc = doc(col, projId)
        await setDoc(projectDoc, {
          projectName: projectData.projectName || '',
          nextNodeId: projectData.nextNodeId || 1,
          nodes: projectData.nodes || [],
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        }, { merge: true })

        // Save history snapshot every 5 minutes
        const now = Date.now()
        if (now - lastHistorySave.current > HISTORY_INTERVAL_MS) {
          lastHistorySave.current = now
          const historyCol = collection(projectDoc, 'history')
          await addDoc(historyCol, {
            projectName: projectData.projectName || '',
            nextNodeId: projectData.nextNodeId || 1,
            nodes: projectData.nodes || [],
            savedAt: serverTimestamp(),
          })
        }
      } catch (err) {
        console.error('Firestore save failed:', err)
      }
    },
    [user, getProjectsCol]
  )

  // Save a manual, labelled version snapshot immediately (⌘S / "Spara version").
  const saveHistorySnapshot = useCallback(
    async (projId, projectData, label) => {
      if (!user) return false
      const col = getProjectsCol()
      if (!col) return false
      try {
        const projectDoc = doc(col, projId)
        const historyCol = collection(projectDoc, 'history')
        await addDoc(historyCol, {
          projectName: projectData.projectName || '',
          nextNodeId: projectData.nextNodeId || 1,
          nodes: projectData.nodes || [],
          label: label || 'Sparad version',
          savedAt: serverTimestamp(),
        })
        lastHistorySave.current = Date.now()
        return true
      } catch (err) {
        console.error('Failed to save version:', err)
        return false
      }
    },
    [user, getProjectsCol]
  )

  // Delete a project from Firestore
  const deleteFromFirestore = useCallback(
    async (projId) => {
      if (!user) return
      const col = getProjectsCol()
      if (!col) return

      try {
        await deleteDoc(doc(col, projId))
      } catch (err) {
        console.error('Firestore delete failed:', err)
      }
    },
    [user, getProjectsCol]
  )

  // List recent history snapshots for a project
  const getHistory = useCallback(
    async (projId) => {
      if (!user) return []
      const col = getProjectsCol()
      if (!col) return []

      try {
        const historyCol = collection(doc(col, projId), 'history')
        const q = query(historyCol, orderBy('savedAt', 'desc'), limit(20))
        const snap = await getDocs(q)
        return snap.docs.map(d => ({
          id: d.id,
          ...d.data(),
          savedAt: d.data().savedAt?.toDate?.()?.toLocaleString() || 'unknown',
        }))
      } catch (err) {
        console.error('Failed to load history:', err)
        return []
      }
    },
    [user, getProjectsCol]
  )

  // Publish (or re-publish) a public copy for the share link.
  const publishStory = useCallback(
    async (shareId, story) => {
      if (!user) return false
      try {
        await setDoc(
          doc(db, 'published', shareId),
          {
            title: story.title || '',
            nodes: story.nodes || [],
            ownerUid: user.uid,
            sourceProjectId: story.sourceProjectId || '',
            updatedAt: serverTimestamp(),
            createdAt: serverTimestamp(),
          },
          { merge: true }
        )
        // Firestore applies offline writes to the local cache and resolves
        // immediately, so setDoc succeeding does NOT prove the story reached
        // the server. Confirm with a forced server read — if the database is
        // unreachable (e.g. not provisioned yet) this throws and we report
        // failure instead of handing out a dead share link.
        const check = await getDocFromServer(doc(db, 'published', shareId))
        return check.exists()
      } catch (err) {
        console.error('Publish failed:', err)
        return false
      }
    },
    [user]
  )

  // Remove a published copy ("Sluta dela").
  const unpublishStory = useCallback(async shareId => {
    if (!user || !shareId) return false
    try {
      await deleteDoc(doc(db, 'published', shareId))
      return true
    } catch (err) {
      console.error('Unpublish failed:', err)
      return false
    }
  }, [user])

  return { saveToFirestore, saveHistorySnapshot, deleteFromFirestore, getHistory, publishStory, unpublishStory }
}
