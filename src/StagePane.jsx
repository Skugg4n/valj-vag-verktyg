import { useEffect, useMemo, useState } from 'react'
import { X, ArrowLeft, RotateCcw } from 'lucide-react'
import { splitChoices, renderInline } from './ReadPane.jsx'
import { extractCues, splitMarkers } from './stageCues.js'
import { loadLS, saveLS } from './utils/persistence.js'

// Stage mode: reader and musician share one screen. Big text, one scene at a
// time, {cues} lifted out as numbered bubbles in a side column, choices as big
// green/red buttons (the thumbs convention).
//   1 / G = first choice, 2 / R = second, 3 = third, Backspace = back,
//   + / - = text size, Esc = exit.
export default function StagePane({ nodes, startId, onExit }) {
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])
  const firstId = useMemo(() => {
    if (startId && nodeMap.has(startId)) return startId
    return Array.from(nodeMap.keys()).sort()[0] || null
  }, [nodeMap, startId])

  const [history, setHistory] = useState([])
  const [currentId, setCurrentId] = useState(firstId)
  const [scale, setScale] = useState(() => {
    const s = Number(loadLS('stage-font', 1.6))
    return Number.isFinite(s) ? s : 1.6
  })
  useEffect(() => { saveLS('stage-font', scale) }, [scale])

  const node = currentId ? nodeMap.get(currentId) : null
  const { body, choices } = useMemo(() => splitChoices(node?.data?.text || '', nodeMap), [node, nodeMap])
  const { text, cues } = useMemo(() => extractCues(body), [body])
  const paragraphs = text.split(/\n{2,}/).filter(p => p.trim())

  const goTo = id => { if (!nodeMap.has(id)) return; setHistory(h => [...h, currentId]); setCurrentId(id) }
  const goBack = () => { if (!history.length) return; setCurrentId(history[history.length - 1]); setHistory(h => h.slice(0, -1)) }
  const restart = () => { setHistory([]); setCurrentId(firstId) }

  useEffect(() => {
    const onKey = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'escape') { e.preventDefault(); onExit?.() }
      else if (k === 'backspace' || k === 'arrowleft') { e.preventDefault(); goBack() }
      else if (k === '1' || k === 'g') { if (choices[0]) { e.preventDefault(); goTo(choices[0].id) } }
      else if (k === '2' || k === 'r') { if (choices[1]) { e.preventDefault(); goTo(choices[1].id) } }
      else if (k === '3') { if (choices[2]) { e.preventDefault(); goTo(choices[2].id) } }
      else if (k === 'enter' || k === ' ' || k === 'arrowright') { if (choices.length === 1) { e.preventDefault(); goTo(choices[0].id) } }
      else if (k === '+' || k === '=') { e.preventDefault(); setScale(s => Math.min(3, +(s + 0.1).toFixed(2))) }
      else if (k === '-') { e.preventDefault(); setScale(s => Math.max(0.8, +(s - 0.1).toFixed(2))) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  // Fullscreen is a bonus, never a requirement.
  useEffect(() => {
    const el = document.documentElement
    el.requestFullscreen?.().catch?.(() => {})
    return () => { if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {}) }
  }, [])

  const renderParagraph = p =>
    splitMarkers(p).map((part, i) =>
      part.cue != null
        ? <sup key={i} className="stage-mark" title={cues[part.cue - 1]}>{part.cue}</sup>
        : <span key={i}>{renderInline(part.text)}</span>
    )

  const tone = i => (i === 0 ? 'green' : i === 1 ? 'red' : 'neutral')

  return (
    <div className="stage" style={{ '--stage-scale': scale }} role="dialog" aria-label="Scenläge">
      <div className="stage-bar">
        <button className="stage-btn" onClick={goBack} disabled={!history.length} title="Tillbaka (Backsteg)"><ArrowLeft size={18} /> Tillbaka</button>
        <button className="stage-btn" onClick={restart} title="Börja om"><RotateCcw size={18} /> Börja om</button>
        <span className="stage-chapter">Kapitel {String(history.length + 1).padStart(2, '0')} · #{currentId}</span>
        <span style={{ flex: 1 }} />
        <button className="stage-btn" onClick={() => setScale(s => Math.max(0.8, +(s - 0.1).toFixed(2)))} title="Mindre text (-)">A−</button>
        <button className="stage-btn" onClick={() => setScale(s => Math.min(3, +(s + 0.1).toFixed(2)))} title="Större text (+)">A+</button>
        <button className="stage-btn" onClick={onExit} title="Avsluta (Esc)"><X size={18} /> Avsluta</button>
      </div>

      {!node ? (
        <div className="stage-body"><p className="stage-empty">Inget att läsa ännu.</p></div>
      ) : (
        <div className={`stage-body${cues.length ? ' has-cues' : ''}`}>
          <article className="stage-text">
            {node.data.title && <h1>{node.data.title}</h1>}
            {paragraphs.map((p, i) => <p key={i}>{renderParagraph(p)}</p>)}
          </article>
          {cues.length > 0 && (
            <aside className="stage-cues" aria-label="Ljud och regi">
              {cues.map((c, i) => (
                <div key={i} className="stage-cue">
                  <span className="stage-cue-n">{i + 1}</span>
                  <span className="stage-cue-text">{c}</span>
                </div>
              ))}
            </aside>
          )}
        </div>
      )}

      {node && (
        <div className="stage-choices">
          {choices.length === 0 ? (
            <button className="stage-choice neutral" onClick={restart}>Slut · Börja om</button>
          ) : choices.map((c, i) => (
            <button key={c.id} className={`stage-choice ${tone(i)}`} onClick={() => goTo(c.id)}>
              <span className="stage-choice-key">{i === 0 ? 'Grön · 1' : i === 1 ? 'Röd · 2' : String(i + 1)}</span>
              <span className="stage-choice-label">{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
