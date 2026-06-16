import { useState, useEffect } from 'react'
import { splitBodyAndChoices, joinBodyAndChoices } from './sceneRefs.js'

const COLORS = ['#2f6df6', '#e8554e', '#e8954e', '#e6c34e', '#3fae6b', '#8e6bd6', '#d96bb0', '#7d8696']

// Permanent right pane: edit the selected scene's name, body, colour, choices.
// Choices are stored as trailing [#NNN] refs in the scene text (single source).
export default function WorkshopEditPanel({ node, scenes, onPatch, onAddChoice, onDelete }) {
  const [adding, setAdding] = useState(false)
  const { body, choiceIds } = splitBodyAndChoices(node?.data?.text || '')
  // The textarea is driven by a local draft so the stored value's trimming
  // (joinBodyAndChoices) can't strip spaces mid-typing. Resync when the
  // selected scene changes.
  const [draft, setDraft] = useState(body)
  useEffect(() => {
    setDraft(splitBodyAndChoices(node?.data?.text || '').body)
  }, [node?.id]) // eslint-disable-line react-hooks/exhaustive-deps

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
        {choiceIds.length === 0 && <div className="ws-choices-empty">Inga val än. Det här blir ett slut på berättelsen.</div>}
        {choiceIds.map(id => (
          <div key={id} className="ws-choice-row">
            <span className="ws-choice-label">→ {titleOf(id)}</span>
            <button className="ws-choice-x" onClick={() => removeChoice(id)} aria-label="Ta bort val">✕</button>
          </div>
        ))}

        {!adding ? (
          <button className="ws-add-choice" onClick={() => setAdding(true)}>+ Lägg till val</button>
        ) : (
          <div className="ws-add-menu">
            <button
              className="ws-add-item ws-add-new"
              onClick={() => { onAddChoice(null); setAdding(false) }}
            >
              ➕ Skapa ny scen
            </button>
            {linkable.map(s => (
              <button
                key={s.id}
                className="ws-add-item"
                onClick={() => { onAddChoice(s.id); setAdding(false) }}
              >
                → {s.title?.trim() || 'Namnlös scen'}
              </button>
            ))}
            <button className="ws-add-item ws-add-cancel" onClick={() => setAdding(false)}>Avbryt</button>
          </div>
        )}
      </div>

      <button className="ws-delete" onClick={onDelete}>Ta bort scen</button>
    </aside>
  )
}
