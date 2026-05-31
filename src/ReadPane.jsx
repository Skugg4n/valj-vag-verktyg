import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, RotateCcw, Share2 } from 'lucide-react'
import { loadLS, saveLS } from './utils/persistence.js'

const CHOICE_RE = /\[#(\d{3})]|#(\d{3})/g

export function splitChoices(text, nodeMap) {
  // Returns { body, choices } — strips ref tokens from body, lists them as choices.
  const choices = []
  const seen = new Set()
  for (const m of (text || '').matchAll(CHOICE_RE)) {
    const id = m[1] || m[2]
    if (seen.has(id)) continue
    seen.add(id)
    const target = nodeMap.get(id)
    choices.push({ id, label: target?.data?.title || `Gå till #${id}` })
  }
  const body = (text || '')
    .replace(CHOICE_RE, '')
    .replace(/[ \t]+([.,!?;:…»)\]])/g, '$1') // drop space left before punctuation by a stripped ref
    .replace(/ {2,}/g, ' ')      // collapse mid-line double-spaces left behind
    .replace(/[ \t]+\n/g, '\n')  // trim trailing whitespace before newlines
    .trim()
  return { body, choices }
}

export default function ReadPane({ nodes, startId, activeNodeId, onSelectNode, onShare }) {
  const [theme, setTheme] = useState(() => loadLS('read-theme', 'paper'))
  const [editorMode, setEditorMode] = useState(false)

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])
  const firstId = useMemo(() => {
    if (startId && nodeMap.has(startId)) return startId
    if (activeNodeId && nodeMap.has(activeNodeId)) return activeNodeId
    const ids = Array.from(nodeMap.keys()).sort()
    return ids[0] || null
  }, [nodeMap, startId, activeNodeId])

  const [history, setHistory] = useState([])
  const [currentId, setCurrentId] = useState(firstId)

  // If startId / activeNodeId changes mid-session (e.g., palette navigates),
  // re-seed the reader.
  useEffect(() => {
    if (firstId && history.length === 0 && currentId !== firstId) setCurrentId(firstId)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [firstId])

  useEffect(() => { saveLS('read-theme', theme) }, [theme])

  const node = currentId ? nodeMap.get(currentId) : null
  const { body, choices } = useMemo(
    () => splitChoices(node?.data?.text || '', nodeMap),
    [node, nodeMap]
  )

  const goTo = (id) => {
    setHistory(h => [...h, currentId])
    setCurrentId(id)
    onSelectNode?.(id)
  }
  const goBack = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setCurrentId(prev)
    onSelectNode?.(prev)
  }
  const restart = () => {
    setHistory([])
    setCurrentId(firstId)
    if (firstId) onSelectNode?.(firstId)
  }

  if (!node || !currentId) {
    return (
      <div className="read-shell" data-reading={theme}>
        <div className="read-bar">
          <span style={{ flex: 1 }} />
          <span style={{ color: 'var(--ink-dim)', fontSize: 13 }}>Inget att läsa ännu.</span>
        </div>
      </div>
    )
  }

  // Build chapter number from numeric node ids only
  const orderedIds = Array.from(nodeMap.keys())
    .filter(id => /^\d{3}$/.test(id))
    .sort()
  const chapterIdx = orderedIds.indexOf(currentId)
  const chapterLabel = chapterIdx >= 0
    ? `KAPITEL ${String(chapterIdx + 1).padStart(2, '0')}${editorMode ? ` · #${currentId}` : ''}`
    : (editorMode ? `· #${currentId}` : '')

  // Body paragraphs (split on double newlines)
  const paragraphs = body.split(/\n{2,}/).filter(Boolean)

  return (
    <div className="read-shell" data-reading={theme}>
      <div className="read-bar">
        <button
          className="btn ghost sm"
          onClick={goBack}
          disabled={history.length === 0}
        >
          <ArrowLeft />
          Tillbaka
        </button>
        <button className="btn ghost sm" onClick={restart}>
          <RotateCcw />
          Börja om
        </button>
        <span style={{ flex: 1 }} />
        <span className="toggle" role="group" aria-label="Visningsläge">
          <button
            className={!editorMode ? 'active' : ''}
            onClick={() => setEditorMode(false)}
            aria-pressed={!editorMode}
          >Läsare</button>
          <button
            className={editorMode ? 'active' : ''}
            onClick={() => setEditorMode(true)}
            aria-pressed={editorMode}
          >Redaktör</button>
        </span>
        <span className="toggle" role="group" aria-label="Tema">
          <button
            className={theme === 'paper' ? 'active' : ''}
            onClick={() => setTheme('paper')}
            aria-pressed={theme === 'paper'}
          >Papper</button>
          <button
            className={theme === 'dark' ? 'active' : ''}
            onClick={() => setTheme('dark')}
            aria-pressed={theme === 'dark'}
          >Mörk</button>
        </span>
        <button className="btn ghost sm" title="Dela" onClick={onShare}>
          <Share2 />
          Dela
        </button>
      </div>

      <div className={`read-stage${editorMode ? ' editor-mode' : ''}`}>
        <article className="read-page">
          {chapterLabel && <span className="chapter-num">{chapterLabel}</span>}
          {node.data.title && <h1>{node.data.title}</h1>}
          {paragraphs.map((p, i) => (
            <p key={i} className={i === 0 ? 'first-letter' : undefined}>{p}</p>
          ))}

          {choices.length > 0 && (
            <div className="read-choices">
              <span className="label">Vad gör du?</span>
              {choices.map((c, i) => (
                <button
                  key={c.id}
                  className="read-choice"
                  data-target={`#${c.id}`}
                  onClick={() => goTo(c.id)}
                >
                  <span className="num">{String.fromCharCode(65 + i)}.</span>
                  {c.label}
                </button>
              ))}
            </div>
          )}

          <nav className="read-breadcrumb" aria-label="Brödsmulor">
            {history.map((hId, i) => {
              const hNode = nodeMap.get(hId)
              return (
                <span key={`${hId}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <button
                    className="crumb"
                    onClick={() => {
                      setHistory(h => h.slice(0, i))
                      setCurrentId(hId)
                      onSelectNode?.(hId)
                    }}
                  >
                    {hNode?.data?.title || `#${hId}`}
                  </button>
                  <span className="sep">›</span>
                </span>
              )
            })}
            <span className="crumb current">{node.data.title || `#${currentId}`}</span>
          </nav>
        </article>
      </div>
    </div>
  )
}
