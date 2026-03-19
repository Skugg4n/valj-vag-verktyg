import { useEffect, useRef, useCallback } from 'react'
import {
  collection,
  doc,
  setDoc,
  getDocs,
  deleteDoc,
  onSnapshot,
  serverTimestamp,
} from 'firebase/firestore'
import { db } from './firebase.js'

/**
 * Syncs project data to Firestore when user is logged in.
 * Falls back to localStorage-only when not logged in.
 *
 * Firestore structure:
 *   users/{uid}/projects/{projectId} => { projectName, nextNodeId, nodes[], updatedAt }
 */
export default function useFirestoreSync({ user, projects, setProjects, projectId }) {
  const initialLoadDone = useRef(false)
  const unsubRef = useRef(null)

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
        await setDoc(doc(col, projId), {
          projectName: projectData.projectName || '',
          nextNodeId: projectData.nextNodeId || 1,
          nodes: projectData.nodes || [],
          updatedAt: serverTimestamp(),
          createdAt: serverTimestamp(),
        }, { merge: true })
      } catch (err) {
        console.error('Firestore save failed:', err)
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

  return { saveToFirestore, deleteFromFirestore }
}
