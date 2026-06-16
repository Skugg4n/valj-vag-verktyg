import { useState, useEffect, useRef } from 'react'
import { splitBodyAndChoices, joinBodyAndChoices } from './sceneRefs.js'

const COLORS = ['#2f6df6', '#e8554e', '#e8954e', '#e6c34e', '#3fae6b', '#8e6bd6', '#d96bb0', '#7d8696']

// Permanent right pane: edit the selected scene's name, body, colour, choices.
// Choices are stored as trailing [#NNN] refs in the scene text (single source).
export default function WorkshopEditPanel({ node, scenes, onPatch, onAddChoice, onDelete }) {
  const [adding, setAdding] = useState(false)
  const [newName, setNewName] = useState('')
  const { body, choiceIds } = splitBodyAndChoices(node?.data?.text || '')
  // The textarea is driven by a local draft so the stored value's trimming
  // (joinBodyAndChoices) can't strip spaces mid-typing. Resync when the
  // selected scene changes.
  const [draft, setDraft] = useState(body)
  useEffect(() => {
    setDraft(splitBodyAndChoices(node?.data?.text || '').body)
    setAdding(false) // never show the add-a-choice field on a freshly selected scene
    setNewName('')
  }, [node?.id]) // eslint-disable-line react-hooks/exhaustive-deps

  // Auto-grow the body textarea to fit its content (no manual resize needed).
  const taRef = useRef(null)
  useEffect(() => {
    const el = taRef.current
    if (!el) return
    el.style.height = 'auto'
    el.style.height = `${el.scrollHeight}px`
  }, [draft, node?.id])

  // Selecting a scene drops the cursor straight into "Vad händer här?" so you
  // can start writing immediately (cursor at the end of any existing text).
  useEffect(() => {
    if (!node?.id) return
    const raf = requestAnimationFrame(() => {
      const el = taRef.current
      if (!el) return
      el.focus()
      const len = el.value.length
      el.setSelectionRange(len, len)
    })
    return () => cancelAnimationFrame(raf)
  }, [node?.id])

  if (!node) {
    return (
      <aside className="ws-panel ws-panel-empty">
        <p>Klicka på en scen för att redigera den. Eller skapa din första scen med <b>+ Ny scen</b>.</p>
      </aside>
    )
  }

  const titleOf = id => scenes.find(s => s.id === id)?.title?.trim() || 'Namnlös scen'
  const setBody = v => { setDraft(v); onPatch({ text: joinBodyAndChoices(v, choiceIds) }) }
  const removeChoice = id => onPatch({ text: joinBodyAndChoices(draft, choiceIds.filter(x => x !== id)) })
  const linkable = scenes.filter(s => s.id !== node.id && !choiceIds.includes(s.id))

  // Create + link a new scene named after the choice, in one step. Stays open
  // and clears so several choices can be added in a row.
  const createNew = () => { onAddChoice(null, newName); setNewName('') }
  const openAdd = () => { setNewName(''); setAdding(true) }

  return (
    <aside className="ws-panel">
      <label className="ws-field-label">Scenens namn</label>
      <input
        className="ws-input"
        value={node.data?.title || ''}
        placeholder="t.ex. Vid grottan"
        onChange={e => onPatch({ title: e.target.value })}
      />

      <label className="ws-field-label">Vad händer här?</label>
      <textarea
        ref={taRef}
        className="ws-textarea"
        value={draft}
        placeholder="Skriv scenens text…"
        onChange={e => setBody(e.target.value)}
      />

      <label className="ws-field-label">Färg</label>
      <div className="ws-colors">
        {COLORS.map(c => (
          <button
            key={c}
            className={`ws-swatch${(node.data?.color || COLORS[0]) === c ? ' active' : ''}`}
            style={{ background: c }}
            onClick={() => onPatch({ color: c })}
            aria-label={`Färg ${c}`}
          />
        ))}
      </div>

      <label className="ws-field-label">Val härifrån</label>
      <div className="ws-choices">
        {choiceIds.length === 0 && !adding && (
          <div className="ws-choices-empty">Inga val än. Det här blir ett slut på berättelsen.</div>
        )}
        {choiceIds.map(id => (
          <div key={id} className="ws-choice-row">
            <span className="ws-choice-label">→ {titleOf(id)}</span>
            <button className="ws-choice-x" onClick={() => removeChoice(id)} aria-label="Ta bort val">✕</button>
          </div>
        ))}

        {!adding ? (
          <button className="ws-add-choice" onClick={openAdd}>+ Lägg till val</button>
        ) : (
          <div className="ws-add-menu">
            <span className="ws-add-hint">Vad ska valet heta?</span>
            <div className="ws-add-row">
              <input
                className="ws-input ws-add-input"
                autoFocus
                value={newName}
                placeholder="t.ex. Kasta sten"
                onChange={e => setNewName(e.target.value)}
                onKeyDown={e => {
                  if (e.key === 'Enter') { e.preventDefault(); createNew() }
                  if (e.key === 'Escape') setAdding(false)
                }}
              />
              <button className="ws-add-create" onClick={createNew}>Skapa</button>
            </div>
            {linkable.length > 0 && <span className="ws-add-sep">eller länka en scen du redan har</span>}
            {linkable.map(s => (
              <button
                key={s.id}
                className="ws-add-item"
                onClick={() => { onAddChoice(s.id); setAdding(false) }}
              >
                → {s.title?.trim() || 'Namnlös scen'}
              </button>
            ))}
            <button className="ws-add-item ws-add-cancel" onClick={() => setAdding(false)}>Klar</button>
          </div>
        )}
      </div>

      <button className="ws-delete" onClick={onDelete}>Ta bort scen</button>
    </aside>
  )
}
