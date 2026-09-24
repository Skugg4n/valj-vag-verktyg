import { useEffect, useState } from 'react'
import { MessageSquare, Check, RotateCcw, Trash2 } from 'lucide-react'
import { loadAuthor, saveAuthor } from './comments.js'

// Margin notes for one scene. `quoteDraft` is text the reader selected in the
// scene; it is attached to the next comment. `canModerate` (story owner) shows
// resolve / delete controls.
export default function CommentsPanel({
  sceneId, sceneTitle, comments = [], quoteDraft = '', onClearQuote,
  onAdd, onResolve, onDelete, canModerate = false, showResolved = false,
}) {
  const [author, setAuthor] = useState(loadAuthor)
  const [text, setText] = useState('')
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState('')
  useEffect(() => { setText(''); setError('') }, [sceneId])

  const list = comments.filter(c => c.sceneId === sceneId && (showResolved || !c.resolved))
  const resolvedCount = comments.filter(c => c.sceneId === sceneId && c.resolved).length

  const submit = async e => {
    e?.preventDefault?.()
    if (!text.trim() || busy) return
    setBusy(true); setError('')
    try {
      saveAuthor(author.trim())
      await onAdd({ sceneId, quote: quoteDraft, text: text.trim(), author: author.trim() })
      setText('')
      onClearQuote?.()
    } catch (err) {
      console.error(err)
      setError('Kunde inte spara kommentaren. Försök igen.')
    } finally {
      setBusy(false)
    }
  }

  return (
    <aside className="cmt-panel" aria-label={`Kommentarer till ${sceneTitle || sceneId}`}>
      <div className="cmt-head">
        <MessageSquare size={14} />
        <span>Kommentarer</span>
        <span className="cmt-count">{list.length}</span>
        {resolvedCount > 0 && !showResolved && <span className="cmt-resolved-note">{resolvedCount} klara</span>}
      </div>

      {list.length === 0 && <p className="cmt-empty">Inga kommentarer på den här scenen.</p>}

      <ul className="cmt-list">
        {list.map(c => (
          <li key={c.id} className={`cmt${c.resolved ? ' resolved' : ''}`}>
            {c.quote && <blockquote className="cmt-quote">”{c.quote}”</blockquote>}
            <p className="cmt-text">{c.text}</p>
            <div className="cmt-meta">
              <span className="cmt-author">{c.author || 'Anonym'}</span>
              {c.createdAt?.toDate && <span className="cmt-time">{c.createdAt.toDate().toLocaleString('sv-SE', { dateStyle: 'short', timeStyle: 'short' })}</span>}
              {canModerate && (
                <span className="cmt-actions">
                  <button className="cmt-btn" onClick={() => onResolve?.(c.id, !c.resolved)} title={c.resolved ? 'Öppna igen' : 'Markera som klar'}>
                    {c.resolved ? <RotateCcw size={13} /> : <Check size={13} />}
                  </button>
                  <button className="cmt-btn" onClick={() => { if (confirm('Ta bort kommentaren?')) onDelete?.(c.id) }} title="Ta bort"><Trash2 size={13} /></button>
                </span>
              )}
            </div>
          </li>
        ))}
      </ul>

      {onAdd && (
        <form className="cmt-form" onSubmit={submit}>
          {quoteDraft && (
            <div className="cmt-draft-quote">
              <span>Om: ”{quoteDraft.length > 90 ? quoteDraft.slice(0, 90) + '…' : quoteDraft}”</span>
              <button type="button" className="cmt-btn" onClick={onClearQuote} title="Kommentera scenen i stället">×</button>
            </div>
          )}
          <textarea
            className="cmt-input"
            value={text}
            onChange={e => setText(e.target.value)}
            placeholder={quoteDraft ? 'Skriv om det markerade…' : 'Skriv en kommentar till scenen… (markera text i scenen för att kommentera just den)'}
            rows={3}
            onKeyDown={e => { if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) submit(e) }}
          />
          <div className="cmt-form-row">
            <input
              className="cmt-name"
              value={author}
              onChange={e => setAuthor(e.target.value)}
              placeholder="Ditt namn"
              aria-label="Ditt namn"
            />
            <button type="submit" className="btn primary sm" disabled={busy || !text.trim()}>Skicka</button>
          </div>
          {error && <p className="cmt-error">{error}</p>}
        </form>
      )}
    </aside>
  )
}
