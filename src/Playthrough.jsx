import { useState, useMemo } from 'react'
import { marked } from 'marked'

function renderHtml(text = '') {
  let html = marked.parse(text)
  html = html.replace(/\[#(\d{3})]|#(\d{3})/g, (_m, p1, p2) => {
    const id = p1 || p2
    return `<button type="button" class="choice" data-id="${id}">#${id}</button>`
  })
  return html
}

export default function Playthrough({ nodes, startId, onClose }) {
  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])
  const firstId = useMemo(() => {
    if (startId) return startId
    const ids = Array.from(nodeMap.keys()).sort()
    return ids[0] || null
  }, [nodeMap, startId])
  const [currentId, setCurrentId] = useState(firstId)

  const node = nodeMap.get(currentId)
  const html = useMemo(() => renderHtml(node?.data.text || ''), [node])
  if (!currentId || !node) return null

  const onClick = e => {
    const btn = e.target.closest('button.choice')
    if (btn?.dataset.id) {
      setCurrentId(btn.dataset.id)
    }
  }

  return (
    <div id="playthrough" role="dialog" aria-modal="true" className="show">
      <button
        id="closePlay"
        className="btn ghost"
        aria-label="Close playthrough"
        onClick={onClose}
      >
        Close
      </button>
      <h2 id="playId">#{node.id} {node.data.title}</h2>
      <div
        className="play-text"
        onClick={onClick}
        dangerouslySetInnerHTML={{ __html: html }}
      />
    </div>
  )
}
