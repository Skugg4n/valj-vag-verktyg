import { useEffect, useState } from 'react'
import { getPublished } from './useFirestoreSync.js'
import { ensureAnonAuth, track, bumpView, markViewedThisSession } from './track.js'
import BookReader from './BookReader.jsx'
import './BookReader.css'

// Public, no-login reader for /spela/:shareId — loads the published copy.
export default function PublicReader({ shareId }) {
  const [state, setState] = useState({ loading: true, story: null })

  useEffect(() => {
    let alive = true
    // Safety net: if the backend is unreachable the read can hang for ~10s
    // before Firestore gives up. Don't leave the reader stuck on "Laddar…".
    const timer = setTimeout(() => { if (alive) setState({ loading: false, story: null }) }, 12000)
    getPublished(shareId).then(async story => {
      if (!alive) return
      clearTimeout(timer)
      setState({ loading: false, story })
      // Count the read only for stories that actually exist (not dead links).
      if (story) {
        await ensureAnonAuth()
        track('read_open', { storyId: shareId }, 'reader')
        bumpView(shareId, markViewedThisSession(shareId))
      }
    })
    return () => { alive = false; clearTimeout(timer) }
  }, [shareId])

  if (state.loading) {
    return <div className="book-shell"><div className="book-empty">Laddar berättelsen…</div></div>
  }
  if (!state.story) {
    return (
      <div className="book-shell">
        <div className="book-empty">
          Berättelsen hittades inte.<br />
          Be den som gjorde berättelsen om en ny länk.
        </div>
      </div>
    )
  }
  return (
    <BookReader
      title={state.story.title}
      nodes={state.story.nodes || []}
      onChoice={(from, to, toTitle) =>
        track('read_choice', { storyId: shareId, fromScene: from, toScene: to, toTitle }, 'reader')}
      onEnd={sceneId =>
        track('read_complete', { storyId: shareId, endSceneId: sceneId }, 'reader')}
    />
  )
}
