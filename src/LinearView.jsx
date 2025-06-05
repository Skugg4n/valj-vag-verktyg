import { useMemo } from 'react'
import { marked } from 'marked'

function parseHtml(text = '') {
  let html = marked.parse(text)
  html = html.replace(/\[#(\d{3})]|#(\d{3})/g, (_m, p1, p2) => {
    const id = p1 || p2
    return `<a href="#${id}">#${id}</a>`
  })
  return html
}

export default function LinearView({ nodes = [], updateNodeText, onClose }) {
  const sorted = useMemo(
    () => nodes.slice().sort((a, b) => Number(a.id) - Number(b.id)),
    [nodes]
  )

  const onChange = (id, e) => {
    let value = e.target.value
    value = value.replace(/(^|[^[])#(\d{3})(?!\])/g, (_, p1, p2) => `${p1}[#${p2}]`)
    updateNodeText(id, value)
  }

  return (
    <div id="modal" role="dialog" aria-modal="true" className="show">
      <button
        className="btn ghost"
        id="closeModal"
        aria-label="Close linear view"
        onClick={onClose}
      >
        Close
      </button>
      <div id="modalList">
        {sorted.map(n => (
          <article key={n.id} className="linear-node">
            <h2 id={n.id} className="linear-heading">
              <span className="node-id">#{n.id}</span>
              {n.data.title && <span className="node-title">{n.data.title}</span>}
            </h2>
            <textarea
              className="linear-edit"
              value={n.data.text}
              onChange={e => onChange(n.id, e)}
            />
            <div
              className="linear-preview"
              dangerouslySetInnerHTML={{ __html: parseHtml(n.data.text) }}
            />
          </article>
        ))}
      </div>
    </div>
  )
}
