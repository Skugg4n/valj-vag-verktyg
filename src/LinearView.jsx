import { useMemo, useRef } from 'react'
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

  const activeId = useRef(null)
  const editors = useRef({})

  const onChange = (id, e) => {
    let value = e.target.value
    value = value.replace(/(^|[^[])#(\d{3})(?!\])/g, (_, p1, p2) => `${p1}[#${p2}]`)
    updateNodeText(id, value)
  }

  const wrapSelected = (before, after = before) => {
    const id = activeId.current
    if (!id) return
    const area = editors.current[id]
    if (!area) return
    const start = area.selectionStart
    const end = area.selectionEnd
    const text = area.value
    const selected = text.slice(start, end)
    const updated = text.slice(0, start) + before + selected + after + text.slice(end)
    updateNodeText(id, updated)
    requestAnimationFrame(() => {
      area.focus()
      area.selectionStart = start + before.length
      area.selectionEnd = end + before.length
    })
  }

  const applyHeading = level => {
    const id = activeId.current
    if (!id) return
    const area = editors.current[id]
    if (!area) return
    const start = area.selectionStart
    const end = area.selectionEnd
    const text = area.value
    const selected = text.slice(start, end)
    const prefix = '#'.repeat(level) + ' '
    const lines = selected.split(/\n/).map(l => prefix + l).join('\n')
    const updated = text.slice(0, start) + lines + text.slice(end)
    updateNodeText(id, updated)
    requestAnimationFrame(() => {
      area.focus()
      area.selectionStart = start
      area.selectionEnd = start + lines.length
    })
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
      <div id="linear-toolbar">
        <button className="btn ghost" type="button" onClick={() => wrapSelected('**')}>B</button>
        <button className="btn ghost" type="button" onClick={() => wrapSelected('*')}>I</button>
        <button className="btn ghost" type="button" onClick={() => wrapSelected('__')}>U</button>
        <button className="btn ghost" type="button" onClick={() => applyHeading(1)}>H1</button>
        <button className="btn ghost" type="button" onClick={() => applyHeading(2)}>H2</button>
      </div>
      <div id="modalList">
        {sorted.map(n => (
          <article key={n.id} className="linear-node">
            <h2 id={n.id} className="linear-heading">
              <span className="node-id">#{n.id}</span>
              {n.data.title && <span className="node-title">{n.data.title}</span>}
            </h2>
            <div className="linear-editor">
              <div
                className="linear-render"
                dangerouslySetInnerHTML={{ __html: parseHtml(n.data.text) }}
              />
              <textarea
                className="linear-input"
                ref={el => (editors.current[n.id] = el)}
                onFocus={() => (activeId.current = n.id)}
                value={n.data.text}
                onChange={e => onChange(n.id, e)}
              />
            </div>
          </article>
        ))}
      </div>
    </div>
  )
}
