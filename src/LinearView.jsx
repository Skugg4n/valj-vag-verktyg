import { useMemo, useRef } from 'react'
import Markdown, { parseHtml } from './Markdown.jsx'

export default function LinearView({ nodes = [], updateNodeText, onClose }) {
  const sorted = useMemo(
    () => nodes.slice().sort((a, b) => Number(a.id) - Number(b.id)),
    [nodes]
  )

  const activeId = useRef(null)
  const editors = useRef({})

  const onBlur = (id, e) => {
    let value = e.target.innerText
    value = value.replace(/(^|[^[])#(\d{3})(?!\])/g, (_, p1, p2) => `${p1}[#${p2}]`)
    updateNodeText(id, value)
  }

  const wrapSelected = (before, after = before) => {
    const id = activeId.current
    if (!id) return
    const el = editors.current[id]
    if (!el) return
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)
    if (!el.contains(range.startContainer)) return
    const text = sel.toString()
    range.deleteContents()
    range.insertNode(document.createTextNode(before + text + after))
    sel.collapseToEnd()
    updateNodeText(id, el.innerText)
  }

  const applyHeading = level => {
    const id = activeId.current
    if (!id) return
    const el = editors.current[id]
    if (!el) return
    const sel = window.getSelection()
    if (!sel?.rangeCount) return
    const range = sel.getRangeAt(0)
    if (!el.contains(range.startContainer)) return
    const text = sel.toString()
    const prefix = '#'.repeat(level) + ' '
    range.deleteContents()
    range.insertNode(document.createTextNode(prefix + text))
    sel.collapseToEnd()
    updateNodeText(id, el.innerText)
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
          <article
            key={n.id}
            data-id={n.id}
            className="linear-node"
          >
            <p className="linear-meta" contentEditable={false}>
              <span className="linear-id">#{n.id}</span>{' '}
              <strong className="linear-title">{n.data.title}</strong>
            </p>
            <div
              className="linear-body"
              contentEditable
              suppressContentEditableWarning
              ref={el => (editors.current[n.id] = el)}
              onFocus={() => (activeId.current = n.id)}
              onBlur={e => onBlur(n.id, e)}
              dangerouslySetInnerHTML={{ __html: parseHtml(n.data.text) }}
            />
          </article>
        ))}
      </div>
    </div>
  )
}
