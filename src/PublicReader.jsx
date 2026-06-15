import { useEffect, useState } from 'react'
import { getPublished } from './useFirestoreSync.js'
import BookReader from './BookReader.jsx'
import './BookReader.css'

// Public, no-login reader for /spela/:shareId — loads the published copy.
export default function PublicReader({ shareId }) {
  const [state, setState] = useState({ loading: true, story: null })

  useEffect(() => {
    let alive = true
    getPublished(shareId).then(story => {
      if (alive) setState({ loading: false, story })
    })
    return () => { alive = false }
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
