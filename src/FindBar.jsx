import { useEffect, useRef, useState } from 'react'
import { ChevronUp, ChevronDown, X } from 'lucide-react'

// Search-and-replace bar for the document. The editor's SearchReplace
// extension owns matching and highlighting; this component is just the
// controls. Enter = next, Shift+Enter = previous, Esc = close.
export default function FindBar({ editor, open, onClose, onQueryChange, onMatchChange }) {
  const [query, setQuery] = useState('')
  const [replacement, setReplacement] = useState('')
  const [tick, setTick] = useState(0)
  const inputRef = useRef(null)

  // Re-render the counter whenever the editor changes (matches follow edits).
  useEffect(() => {
    if (!editor) return
    const bump = () => setTick(t => t + 1)
    editor.on('transaction', bump)
    return () => editor.off('transaction', bump)
  }, [editor])

  useEffect(() => {
    if (!open) return
    requestAnimationFrame(() => { inputRef.current?.focus(); inputRef.current?.select() })
  }, [open])

  useEffect(() => {
    if (!editor) return
    if (open) editor.commands.setSearchTerm(query)
    else editor.commands.clearSearch()
    onQueryChange?.(open ? query : '')
  }, [editor, open, query, onQueryChange])

  if (!open || !editor) return null

  const { matches, index } = editor.storage.searchReplace
  const total = matches.length
  const step = dir => {
    if (dir > 0) editor.commands.nextMatch()
    else editor.commands.prevMatch()
    onMatchChange?.()
  }
  const onKey = e => {
    if (e.key === 'Enter') { e.preventDefault(); step(e.shiftKey ? -1 : 1) }
    else if (e.key === 'Escape') { e.preventDefault(); onClose() }
  }
  const replaceOne = () => {
    if (!total) return
    editor.commands.replaceCurrent(replacement)
    onMatchChange?.()
  }
  const replaceAll = () => {
    if (!total) return
    editor.commands.replaceAll(replacement)
    onMatchChange?.()
  }

  return (
    <div className="find-bar" role="search" aria-label="Sök i dokumentet" data-tick={tick}>
      <div className="find-row">
        <input
          ref={inputRef}
          className="find-input"
          value={query}
          onChange={e => setQuery(e.target.value)}
          onKeyDown={onKey}
          placeholder="Sök i texten…"
          aria-label="Sök"
        />
        <span className="find-count" aria-live="polite">
          {query ? (total ? `${index + 1} av ${total}` : 'Inga träffar') : ''}
        </span>
        <button className="tb-btn" onClick={() => step(-1)} title="Föregående (Shift+Enter)" aria-label="Föregående träff" disabled={!total}><ChevronUp /></button>
        <button className="tb-btn" onClick={() => step(1)} title="Nästa (Enter)" aria-label="Nästa träff" disabled={!total}><ChevronDown /></button>
        <button className="tb-btn" onClick={onClose} title="Stäng (Esc)" aria-label="Stäng sökning"><X /></button>
      </div>
      <div className="find-row">
        <input
          className="find-input"
          value={replacement}
          onChange={e => setReplacement(e.target.value)}
          onKeyDown={e => { if (e.key === 'Escape') { e.preventDefault(); onClose() } if (e.key === 'Enter') { e.preventDefault(); replaceOne() } }}
          placeholder="Ersätt med…"
          aria-label="Ersätt med"
        />
        <button className="btn ghost sm" onClick={replaceOne} disabled={!total}>Ersätt</button>
        <button className="btn ghost sm" onClick={replaceAll} disabled={!total}>Ersätt alla</button>
      </div>
    </div>
  )
}
