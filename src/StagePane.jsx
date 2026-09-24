import { useEffect, useMemo, useRef, useState } from 'react'
import { X, ArrowLeft, RotateCcw, Maximize2 } from 'lucide-react'
import { splitChoices, renderInline } from './ReadPane.jsx'
import { extractCues } from './stageCues.js'
import { loadLS, saveLS } from './utils/persistence.js'

// Stage mode: reader and musician share one screen. One calm column of big
// text. Each {cue} shows a small number in the text where it happens and a
// yellow bubble directly under that paragraph. Normal scrolling. A trail of
// visited scenes at the top so a wrong click is one tap to undo.
//   G / 1 = first choice, R / 2 = second, 3 = third,
//   Backspace = back one scene, + / - = text size, Esc = exit.
//   Optional reading marker (checkbox): click a paragraph or use ↓ ↑ to
//   underline the one you are reading. Off by default; scrolling stays normal.
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
  const [theme, setTheme] = useState(() => (loadLS('stage-theme', 'dark') === 'paper' ? 'paper' : 'dark'))
  const [marker, setMarker] = useState(() => loadLS('stage-marker', false) === true)
  const [active, setActive] = useState(-1)
  useEffect(() => { saveLS('stage-font', scale) }, [scale])
  useEffect(() => { saveLS('stage-theme', theme) }, [theme])
  useEffect(() => { saveLS('stage-marker', marker) }, [marker])

  const node = currentId ? nodeMap.get(currentId) : null
  const { body, choices } = useMemo(() => splitChoices(node?.data?.text || '', nodeMap), [node, nodeMap])
  const { text, cues } = useMemo(() => extractCues(body), [body])
  const paragraphs = useMemo(() => text.split(/\n{2,}/).filter(p => p.trim()), [text])
  const cuesOf = p => [...p.matchAll(/(\d+)/g)].map(m => Number(m[1]))

  const bodyRef = useRef(null)
  const goTo = id => { if (!nodeMap.has(id)) return; setHistory(h => [...h, currentId]); setCurrentId(id) }
  const goBack = () => { if (!history.length) return; setCurrentId(history[history.length - 1]); setHistory(h => h.slice(0, -1)) }
  const jumpTo = i => { setCurrentId(history[i]); setHistory(h => h.slice(0, i)) }
  const restart = () => { setHistory([]); setCurrentId(firstId) }
  useEffect(() => { bodyRef.current?.scrollTo?.(0, 0); setActive(-1) }, [currentId])
  const stepMarker = d => setActive(a => Math.max(0, Math.min(paragraphs.length - 1, a + d)))
  useEffect(() => {
    if (!marker || active < 0) return
    bodyRef.current?.querySelector('.stage-p.active')?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [active, marker])

  useEffect(() => {
    const onKey = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'escape') { e.preventDefault(); onExit?.() }
      else if (k === 'backspace') { e.preventDefault(); goBack() }
      else if (marker && k === 'arrowdown') { e.preventDefault(); stepMarker(1) }
      else if (marker && k === 'arrowup') { e.preventDefault(); stepMarker(-1) }
      else if (k === '1' || k === 'g') { if (choices[0]) { e.preventDefault(); goTo(choices[0].id) } }
      else if (k === '2' || k === 'r') { if (choices[1]) { e.preventDefault(); goTo(choices[1].id) } }
      else if (k === '3') { if (choices[2]) { e.preventDefault(); goTo(choices[2].id) } }
      else if (k === '+' || k === '=') { e.preventDefault(); setScale(s => Math.min(3, +(s + 0.1).toFixed(2))) }
      else if (k === '-') { e.preventDefault(); setScale(s => Math.max(0.8, +(s - 0.1).toFixed(2))) }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  })

  const toggleFullscreen = () => {
    if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {})
    else document.documentElement.requestFullscreen?.().catch?.(() => {})
  }
  useEffect(() => () => { if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {}) }, [])

  const tone = i => (i === 0 ? 'green' : i === 1 ? 'red' : 'neutral')
  const bump = d => setScale(s => Math.max(0.8, Math.min(3, +(s + d).toFixed(2))))
  const titleOf = id => nodeMap.get(id)?.data?.title || `#${id}`

  return (
    <div className="stage" data-stage-theme={theme} style={{ '--stage-scale': scale }} role="dialog" aria-label="Scenläge">
      <div className="stage-bar">
        <button className="stage-btn" onClick={goBack} disabled={!history.length} title="Tillbaka en scen (Backsteg)"><ArrowLeft size={18} /> Tillbaka</button>
        <button className="stage-btn" onClick={restart} title="Börja om från första scenen"><RotateCcw size={18} /> Börja om</button>
        <span style={{ flex: 1 }} />
        <label className="stage-check" title="Understryk stycket du läser (klicka på det, eller pil ned/upp)">
          <input type="checkbox" checked={marker} onChange={e => { setMarker(e.target.checked); if (!e.target.checked) setActive(-1) }} />
          Läsmarkör
        </label>
        <span className="stage-toggle" role="group" aria-label="Tema">
          <button className={theme === 'paper' ? 'on' : ''} onClick={() => setTheme('paper')} aria-pressed={theme === 'paper'}>Ljus</button>
          <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')} aria-pressed={theme === 'dark'}>Mörk</button>
        </span>
        <button className="stage-btn" onClick={() => bump(-0.1)} title="Mindre text (−)">A−</button>
        <button className="stage-btn" onClick={() => bump(0.1)} title="Större text (+)">A+</button>
        <button className="stage-btn" onClick={toggleFullscreen} title="Helskärm av/på"><Maximize2 size={18} /></button>
        <button className="stage-btn" onClick={onExit} title="Avsluta (Esc)"><X size={18} /> Avsluta</button>
      </div>

      {node && (
        <nav className="stage-trail" aria-label="Vägen hit">
          {history.map((id, i) => (
            <span key={`${id}-${i}`}>
              <button className="stage-crumb" onClick={() => jumpTo(i)} title="Gå tillbaka hit">{titleOf(id)}</button>
              <span className="stage-crumb-sep">›</span>
            </span>
          ))}
          <span className="stage-crumb current">{titleOf(currentId)}</span>
        </nav>
      )}

      {!node ? (
        <div className="stage-body"><p className="stage-empty">Inget att läsa ännu.</p></div>
      ) : (
        <div className="stage-body" ref={bodyRef}>
          <article className="stage-text">
            {node.data.title && <h1>{node.data.title}</h1>}
            {paragraphs.map((p, i) => {
              const nums = cuesOf(p)
              return (
                <div key={i} className="stage-block">
                  <p
                    className={`stage-p${marker && i === active ? ' active' : ''}${marker ? ' markable' : ''}`}
                    onClick={marker ? () => setActive(i) : undefined}
                  >{renderInline(p)}</p>
                  {nums.length > 0 && (
                    <div className="stage-cues" aria-label="Ljud och regi">
                      {nums.map(n => (
                        <div key={n} className="stage-cue">
                          <span className="stage-cue-n">{n}</span>
                          <span className="stage-cue-text">{cues[n - 1]}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )
            })}
          </article>
        </div>
      )}

      {node && (
        <div className="stage-choices">
          {choices.length === 0 ? (
            <button className="stage-choice neutral" onClick={restart}>Slut · Börja om</button>
          ) : choices.map((c, i) => (
            <button key={c.id} className={`stage-choice ${tone(i)}`} onClick={() => goTo(c.id)}>
              <span className="stage-choice-key">{i === 0 ? 'Grön tumme · G' : i === 1 ? 'Röd tumme · R' : `Tangent ${i + 1}`}</span>
              <span className="stage-choice-label">{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
