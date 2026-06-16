import { useMemo, useState, useEffect } from 'react'
import { parseScene } from './sceneRefs.js'
import './BookReader.css'

// Clean reading view. nodes = published scene shape [{ id, title, text, color }].
// Used by the public /spela/:id reader and the workshop "Spela upp" preview.
export default function BookReader({ title, nodes, onClose }) {
  const map = useMemo(() => new Map((nodes || []).map(n => [n.id, n])), [nodes])
  // Start at the lowest 3-digit scene id, else the first node.
  const firstId = useMemo(() => {
    const ids = (nodes || []).map(n => n.id)
    return ids.filter(id => /^\d{3}$/.test(id)).sort()[0] || ids[0] || null
  }, [nodes])

  const [curId, setCurId] = useState(firstId)
  const [history, setHistory] = useState([])
  useEffect(() => { setCurId(firstId); setHistory([]) }, [firstId])

  const node = curId ? map.get(curId) : null
  const { body, choices } = useMemo(
    () => parseScene(node?.text || '', id => map.get(id)?.title),
    [node, map]
  )

  const go = id => { setHistory(h => [...h, curId]); setCurId(id) }
  const back = () =>
    setHistory(h => {
      if (!h.length) return h
      setCurId(h[h.length - 1])
      return h.slice(0, -1)
    })
  const restart = () => { setHistory([]); setCurId(firstId) }

  const paras = body.split(/\n{2,}/).filter(Boolean)
  // Drop-cap only for a long opening paragraph (avoids a giant cap on one-liners).
  const dropCap = paras[0] && paras[0].length > 120

  return (
    <div className="book-shell">
      <div className="book-bar">
        <button className="book-btn" onClick={back} disabled={!history.length}>← Tillbaka</button>
        <button className="book-btn" onClick={restart}>↺ Börja om</button>
        <span style={{ flex: 1 }} />
        {title && <span className="book-bar-title">{title}</span>}
        {onClose && <button className="book-btn" onClick={onClose}>Stäng ✕</button>}
      </div>
      <div className="book-wrap">
        <article className="book-page">
          {!node ? (
            <div className="book-empty-page">
              <p>Den här sidan saknas.</p>
              <button className="book-choice" onClick={restart}>
                <span className="book-choice-n">↺</span>Börja om
              </button>
            </div>
          ) : (
            <>
              <h1 className="book-title">{node.title || 'Namnlös'}</h1>
              {paras.map((p, i) => (
                <p key={i} className={i === 0 && dropCap ? 'book-first' : undefined}>{p}</p>
              ))}
              <div className="book-choices">
                {choices.length > 0 ? (
                  <>
                    <div className="book-choices-label">Vad gör du?</div>
                    {choices.map((c, i) => (
                      <button key={c.id} className="book-choice" onClick={() => go(c.id)}>
                        <span className="book-choice-n">{String.fromCharCode(65 + i)}.</span>
                        {c.label}
                      </button>
                    ))}
                  </>
                ) : (
                  <>
                    <div className="book-choices-label">Slut</div>
                    <button className="book-choice" onClick={restart}>
                      <span className="book-choice-n">↺</span>Börja om
                    </button>
                  </>
                )}
              </div>
            </>
          )}
        </article>
      </div>
    </div>
  )
}
