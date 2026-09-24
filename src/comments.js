import { useEffect, useState } from 'react'
import {
  addDoc, collection, deleteDoc, doc, onSnapshot, orderBy, query, serverTimestamp, updateDoc,
} from 'firebase/firestore'
import { db } from './firebase.js'
import { ensureAnonAuth } from './track.js'

// Comments on a shared story, PDF-style: a note attached to a scene, with an
// optional quoted passage. Stored under published/{shareId}/comments so they
// live with the shared copy and survive re-publishing. No login needed to
// comment (anonymous auth); the story owner can resolve and delete.

export function commentsCol(shareId) {
  return collection(db, 'published', shareId, 'comments')
}

/** Live list of comments for a shared story, oldest first. */
export function useComments(shareId) {
  const [comments, setComments] = useState([])
  useEffect(() => {
    if (!shareId) { setComments([]); return }
    const q = query(commentsCol(shareId), orderBy('createdAt', 'asc'))
    const unsub = onSnapshot(q, snap => {
      setComments(snap.docs.map(d => ({ id: d.id, ...d.data() })))
    }, err => console.error('Comments failed:', err))
    return unsub
  }, [shareId])
  return comments
}

export async function addComment(shareId, { sceneId, quote, text, author }) {
  const u = await ensureAnonAuth()
  if (!u) throw new Error('Kunde inte logga in anonymt')
  return addDoc(commentsCol(shareId), {
    sceneId: String(sceneId),
    quote: String(quote || '').slice(0, 300),
    text: String(text || '').trim().slice(0, 2000),
    author: String(author || '').trim().slice(0, 60) || 'Anonym',
    authorUid: u.uid,
    resolved: false,
    createdAt: serverTimestamp(),
  })
}

export function setResolved(shareId, commentId, resolved) {
  return updateDoc(doc(db, 'published', shareId, 'comments', commentId), { resolved: !!resolved })
}

export function deleteComment(shareId, commentId) {
  return deleteDoc(doc(db, 'published', shareId, 'comments', commentId))
}

/** { sceneId -> number of unresolved comments } */
export function countBySceneId(comments) {
  const out = {}
  for (const c of comments || []) {
    if (c.resolved) continue
    out[c.sceneId] = (out[c.sceneId] || 0) + 1
  }
  return out
}

export function loadAuthor() {
  try { return localStorage.getItem('vv-comment-author') || '' } catch { return '' }
}
export function saveAuthor(name) {
  try { localStorage.setItem('vv-comment-author', name) } catch { /* ignore */ }
}
