import { useState, useMemo } from 'react'
import { marked } from 'marked'
import DOMPurify from 'dompurify'

function renderHtml(text = '', nodeMap) {
  let html = marked.parse(text)
  // Replace [#NNN] and #NNN with styled choice buttons showing node titles
  html = html.replace(/\[#(\d{3})]|#(\d{3})/g, (_m, p1, p2) => {
    const id = p1 || p2
    const target = nodeMap.get(id)
    const label = target?.data?.title || `Gå till #${id}`
    return `<button type="button" class="choice" data-id="${id}">${label}</button>`
  })
  return DOMPurify.sanitize(html)
}

export default function Playthrough({ nodes, startId, onClose }) {
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])
  const firstId = useMemo(() => {
    if (startId) return startId
    const ids = Array.from(nodeMap.keys()).sort()
    return ids[0] || null
  }, [nodeMap, startId])
  const [history, setHistory] = useState([])
  const [currentId, setCurrentId] = useState(firstId)

  const node = nodeMap.get(currentId)
  const html = useMemo(() => renderHtml(node?.data.text || '', nodeMap), [node, nodeMap])
  if (!currentId || !node) return null

  const goTo = id => {
    setHistory(h => [...h, currentId])
    setCurrentId(id)
  }

  const goBack = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setCurrentId(prev)
  }

  const restart = () => {
    setHistory([])
    setCurrentId(firstId)
  }

  const onClick = e => {
    const btn = e.target.closest('button.choice')
    if (btn?.dataset.id) {
      goTo(btn.dataset.id)
    }
  }

  return (
    <div id="playthrough" role="dialog" aria-modal="true" className="show">
      <div className="play-header">
        <div className="play-nav">
          {history.length > 0 && (
            <button className="btn ghost" onClick={goBack}>← Tillbaka</button>
          )}
          <button className="btn ghost" onClick={restart}>↺ Börja om</button>
        </div>
        <button className="btn ghost" onClick={onClose}>✕ Stäng</button>
      </div>
      <div className="play-body">
        <div className="play-chapter">
          {node.data.title && <h1 className="play-title">{node.data.title}</h1>}
          <div
            className="play-text"
            onClick={onClick}
            dangerouslySetInnerHTML={{ __html: html }}
          />
        </div>
        <div className="play-breadcrumb">
          {history.map((hId, i) => {
            const hNode = nodeMap.get(hId)
            return (
              <span key={i} className="breadcrumb-item">
                {hNode?.data?.title || `#${hId}`}
                <span className="breadcrumb-sep"> → </span>
              </span>
            )
          })}
          <span className="breadcrumb-current">{node.data.title || `#${currentId}`}</span>
        </div>
      </div>
    </div>
  )
}
