import { useEffect, useMemo, useRef, useState } from 'react'
import { X, ArrowLeft, RotateCcw } from 'lucide-react'
import { splitChoices, renderInline } from './ReadPane.jsx'
import { extractCues } from './stageCues.js'
import { loadLS, saveLS } from './utils/persistence.js'

// Stage mode: reader and musician share one screen. Big text, one scene at a
// time, {cues} lifted out as numbered bubbles in a side column, choices as big
// green/red buttons (the thumbs convention).
//   1 / G = first choice, 2 / R = second, 3 = third, Backspace = back,
//   ↓ ↑ or scroll wheel = move the "here I am" marker paragraph by paragraph,
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
  const [theme, setTheme] = useState(() => (loadLS('stage-theme', 'dark') === 'paper' ? 'paper' : 'dark'))
  const [active, setActive] = useState(-1)   // index of the paragraph the reader is at
  useEffect(() => { saveLS('stage-font', scale) }, [scale])
  useEffect(() => { saveLS('stage-theme', theme) }, [theme])

  const node = currentId ? nodeMap.get(currentId) : null
  const { body, choices } = useMemo(() => splitChoices(node?.data?.text || '', nodeMap), [node, nodeMap])
  const { text, cues } = useMemo(() => extractCues(body), [body])
  const paragraphs = useMemo(() => text.split(/\n{2,}/).filter(p => p.trim()), [text])
  // Which cue numbers sit in which paragraph (for the bubble emphasis).
  const cuesOf = useMemo(
    () => paragraphs.map(p => [...p.matchAll(/(\d+)/g)].map(m => Number(m[1]))),
    [paragraphs]
  )
  const activeCues = new Set(active >= 0 ? cuesOf[active] || [] : [])

  const goTo = id => { if (!nodeMap.has(id)) return; setHistory(h => [...h, currentId]); setCurrentId(id); setActive(-1) }
  const goBack = () => { if (!history.length) return; setCurrentId(history[history.length - 1]); setHistory(h => h.slice(0, -1)); setActive(-1) }
  const restart = () => { setHistory([]); setCurrentId(firstId); setActive(-1) }
  const step = d => setActive(a => Math.max(-1, Math.min(paragraphs.length - 1, (a < 0 && d > 0 ? -1 : a) + d)))

  useEffect(() => {
    const onKey = e => {
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const k = e.key.toLowerCase()
      if (k === 'escape') { e.preventDefault(); onExit?.() }
      else if (k === 'backspace' || k === 'arrowleft') { e.preventDefault(); goBack() }
      else if (k === 'arrowdown' || k === 'j') { e.preventDefault(); step(1) }
      else if (k === 'arrowup' || k === 'k') { e.preventDefault(); step(-1) }
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

  // Scroll wheel steps the marker one paragraph at a time (a notch or two per
  // step), instead of free-scrolling the page.
  const wheelAcc = useRef(0)
  const onWheel = e => {
    e.preventDefault()
    wheelAcc.current += e.deltaY
    if (Math.abs(wheelAcc.current) >= 60) {
      step(wheelAcc.current > 0 ? 1 : -1)
      wheelAcc.current = 0
    }
  }

  // Keep the marked paragraph in view.
  const bodyRef = useRef(null)
  useEffect(() => {
    const el = bodyRef.current?.querySelector('.stage-p.active')
    el?.scrollIntoView?.({ block: 'center', behavior: 'smooth' })
  }, [active, currentId])

  // Fullscreen is a bonus, never a requirement.
  useEffect(() => {
    const el = document.documentElement
    el.requestFullscreen?.().catch?.(() => {})
    return () => { if (document.fullscreenElement) document.exitFullscreen?.().catch?.(() => {}) }
  }, [])

  const tone = i => (i === 0 ? 'green' : i === 1 ? 'red' : 'neutral')
  const bump = d => setScale(s => Math.max(0.8, Math.min(3, +(s + d).toFixed(2))))

  return (
    <div className="stage" data-stage-theme={theme} style={{ '--stage-scale': scale }} role="dialog" aria-label="Scenläge">
      <div className="stage-bar">
        <button className="stage-btn" onClick={goBack} disabled={!history.length} title="Tillbaka (Backsteg)"><ArrowLeft size={18} /> Tillbaka</button>
        <button className="stage-btn" onClick={restart} title="Börja om"><RotateCcw size={18} /> Börja om</button>
        <span className="stage-chapter">Kapitel {String(history.length + 1).padStart(2, '0')} · #{currentId}</span>
        <span style={{ flex: 1 }} />
        <span className="stage-toggle" role="group" aria-label="Tema">
          <button className={theme === 'paper' ? 'on' : ''} onClick={() => setTheme('paper')} aria-pressed={theme === 'paper'}>Ljus</button>
          <button className={theme === 'dark' ? 'on' : ''} onClick={() => setTheme('dark')} aria-pressed={theme === 'dark'}>Mörk</button>
        </span>
        <button className="stage-btn" onClick={() => bump(-0.1)} title="Mindre text (−)">A−</button>
        <button className="stage-btn" onClick={() => bump(0.1)} title="Större text (+)">A+</button>
        <button className="stage-btn" onClick={onExit} title="Avsluta (Esc)"><X size={18} /> Avsluta</button>
      </div>

      {!node ? (
        <div className="stage-body"><p className="stage-empty">Inget att läsa ännu.</p></div>
      ) : (
        <div className={`stage-body${cues.length ? ' has-cues' : ''}`} ref={bodyRef} onWheel={onWheel}>
          <article className="stage-text">
            {node.data.title && <h1>{node.data.title}</h1>}
            {paragraphs.map((p, i) => (
              <p
                key={i}
                className={`stage-p${i === active ? ' active' : ''}${active >= 0 && i !== active ? ' passive' : ''}`}
                onClick={() => setActive(i)}
              >
                {renderInline(p)}
              </p>
            ))}
            <p className="stage-hint">Pil ned/upp eller scrollhjulet flyttar markeringen. Klicka på ett stycke för att hoppa dit.</p>
          </article>
          {cues.length > 0 && (
            <aside className="stage-cues" aria-label="Ljud och regi">
              {cues.map((c, i) => (
                <div key={i} className={`stage-cue${activeCues.has(i + 1) ? ' active' : ''}${active >= 0 && !activeCues.has(i + 1) ? ' dim' : ''}`}>
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
              <span className="stage-choice-key">{i === 0 ? 'Grön tumme · tangent G' : i === 1 ? 'Röd tumme · tangent R' : `Tangent ${i + 1}`}</span>
              <span className="stage-choice-label">{c.label}</span>
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
