import { useEffect, useState } from 'react'
import { getPublished } from './useFirestoreSync.js'
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
    getPublished(shareId).then(story => {
      if (alive) { clearTimeout(timer); setState({ loading: false, story }) }
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
  return <BookReader title={state.story.title} nodes={state.story.nodes || []} />
}
