import { useMemo } from 'react'
import { marked } from 'marked'

function renderHtml(nodes = []) {
  const html = nodes
    .slice()
    .sort((a, b) => Number(a.id) - Number(b.id))
    .map(n => {
      const title = n.data.title ? ` ${n.data.title}` : ''
      const heading = `<h2 id="${n.id}">#${n.id}${title}</h2>`
      let body = marked.parse(n.data.text || '')
      body = body.replace(/\[#(\d{3})]|#(\d{3})/g, (_m, p1, p2) => {
        const id = p1 || p2
        return `<a href="#${id}">#${id}</a>`
      })
      return `${heading}\n${body}`
    })
    .join('\n')
  return html
}

export default function LinearView({ nodes, onClose }) {
  const html = useMemo(() => renderHtml(nodes), [nodes])
  return (
    <div id="modal" role="dialog" aria-modal="true" className="show">
      <button className="btn ghost" id="closeModal" aria-label="Close linear view" onClick={onClose}>
        Close
      </button>
      <div id="modalList" dangerouslySetInnerHTML={{ __html: html }} />
    </div>
  )
}
