import { memo, useState, useContext, useEffect, useRef } from 'react'
import { Handle, Position, useReactFlow, useViewport } from 'reactflow'
import { NodeResizer } from '@reactflow/node-resizer'
import '@reactflow/node-resizer/dist/style.css'
import NodeEditorContext from './NodeEditorContext.ts'
import { DEFAULT_NODE_HEIGHT, DEFAULT_NODE_WIDTH } from './constants.js'

function isLightColor(hex) {
  if (!hex || typeof hex !== 'string' || hex[0] !== '#') return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance > 186
}

const OVERVIEW_ZOOM_THRESHOLD = 0.45
const COLOR_OPTIONS = [
  '#1f2937', '#ef4444', '#f97316', '#facc15',
  '#22c55e', '#3b82f6', '#e879f9', '#d1d5db',
]

const NodeCard = memo(({ id, data, selected, width = DEFAULT_NODE_WIDTH, height = DEFAULT_NODE_HEIGHT }) => {
  const { setNodes, getNodes, updateNodeInternals } = useReactFlow()
  const { updateNodeText, resizingRef, selectNode } = useContext(NodeEditorContext)
  const { zoom } = useViewport()
  const isOverview = zoom < OVERVIEW_ZOOM_THRESHOLD
  const [resizing, setResizing] = useState(false)
  const [overflow, setOverflow] = useState(false)
  const [invalidRef, setInvalidRef] = useState(false)
  const [showColors, setShowColors] = useState(false)
  const [showNotes, setShowNotes] = useState(false)
  const colorBtnRef = useRef(null)
  const textRef = useRef(null)
  const previewRef = useRef(null)
  const prevSelectedRef = useRef(selected)

  useEffect(() => {
    if (selected && !prevSelectedRef.current) {
      textRef.current?.focus()
    }
    prevSelectedRef.current = selected
  }, [selected])

  useEffect(() => {
    const el = previewRef.current
    if (el) {
      setOverflow(el.scrollHeight > el.clientHeight + 1)
    }
  }, [data.text, width, height])

  useEffect(() => {
    const nodes = new Set(getNodes().map(n => n.id))
    const pattern = /#(\d{3})/g
    let m
    let invalid = /#XXX/.test(data.text || '')
    while (!invalid && (m = pattern.exec(data.text || ''))) {
      if (!nodes.has(m[1])) invalid = true
    }
    setInvalidRef(invalid)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data.text])

  const handleResizeEnd = (_e, { width: w, height: h }) => {
    setResizing(false)
    setNodes(ns =>
      ns.map(n =>
        n.id === id
          ? {
              ...n,
              width: w,
              height: h,
              style: { ...(n.style || {}), width: w, height: h },
            }
          : n
      )
    )
    requestAnimationFrame(() => updateNodeInternals(id))
    setTimeout(() => {
      if (resizingRef) resizingRef.current = false
    }, 0)
  }

  const autoResize = () => {
    const el = textRef.current || previewRef.current
    if (!el) return
    const h = Math.min(300, Math.max(100, el.scrollHeight + 16))
    setNodes(ns =>
      ns.map(n =>
        n.id === id
          ? {
              ...n,
              height: h,
              style: { ...(n.style || {}), width: n.width, height: h },
            }
          : n
      )
    )
    requestAnimationFrame(() => updateNodeInternals(id))
  }

  const bg = data.color || '#1f2937'
  const lightBg = isLightColor(bg)
  const textColor = lightBg ? '#111827' : '#f3f4f6'
  const dimColor = lightBg ? '#6b7280' : '#9ca3af'

  return (
    <div
      className={`node-card${selected ? ' selected' : ''}${resizing ? ' resizing' : ''}${data.isIdea ? ' idea-node' : ''}`}
      onClick={() => selectNode(id, data)}
      style={{
        background: bg,
        color: textColor,
        '--card-bg': bg,
        '--text-dim': dimColor,
        boxSizing: 'border-box',
        width: '100%',
        height: '100%',
      }}
    >
      {invalidRef && <div className="invalid-dot" />}
      {isOverview ? (
        <div className="node-overview-title" style={{ fontSize: `${Math.max(20, 40 * (1 - zoom))}px` }}>
          {data.title || `#${id}`}
        </div>
      ) : (
        <>
          <div className="node-header">
            <span className="node-id">#{id}</span>
            {selected ? (
              <input
                className="node-title-input"
                value={data.title || ''}
                placeholder="Title..."
                onChange={e => {
                  setNodes(ns => ns.map(n =>
                    n.id === id ? { ...n, data: { ...n.data, title: e.target.value } } : n
                  ))
                }}
                onPointerDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
                onKeyDown={e => { if (e.key === 'Enter') e.target.blur() }}
              />
            ) : (
              data.title && <span className="node-title">{String(data.title)}</span>
            )}
            {selected && (
              <span className="node-toolbar" onPointerDown={e => e.stopPropagation()} onClick={e => e.stopPropagation()}>
                <button
                  ref={colorBtnRef}
                  className="node-color-btn"
                  style={{ background: bg }}
                  onClick={() => setShowColors(c => !c)}
                  title="Node color"
                />
                <button
                  className="node-notes-btn"
                  onClick={() => setShowNotes(s => !s)}
                  title="Anteckningar"
                >
                  📝
                </button>
                {data.isIdea && (
                  <button
                    className="node-notes-btn"
                    onClick={() => window.dispatchEvent(new CustomEvent('promote-idea', { detail: { ideaId: id } }))}
                    title="Omvandla till nod"
                  >
                    → Nod
                  </button>
                )}
              </span>
            )}
            {showColors && (
              <div
                className="node-color-picker"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
              >
                {COLOR_OPTIONS.map(col => (
                  <div
                    key={col}
                    className="node-color-swatch"
                    style={{ background: col }}
                    onClick={() => {
                      setNodes(ns => ns.map(n =>
                        n.id === id ? { ...n, data: { ...n.data, color: col } } : n
                      ))
                      setShowColors(false)
                    }}
                  />
                ))}
              </div>
            )}
          </div>
          <div className="node-content">
            <div
              ref={previewRef}
              className="node-preview"
              aria-hidden={selected}
              onWheelCapture={e => e.stopPropagation()}
            >
              {String(data.text || '').split(/(\[#\d{3}\])/).map((part, i) => {
                const m = part.match(/^\[#(\d{3})\]$/)
                if (m) {
                  const target = getNodes().find(n => n.id === m[1])
                  return (
                    <span key={i} className="node-link-pill">
                      → {target?.data?.title || `#${m[1]}`}
                    </span>
                  )
                }
                return part
              })}
              {overflow && <div className="preview-more">...</div>}
              {!selected && (data.text || '').trim().length > 0 && (
                <span className="node-word-count">
                  {(data.text || '').split(/\s+/).filter(Boolean).length} ord
                </span>
              )}
            </div>
            <div className="node-editor" aria-hidden={!selected}>
              <textarea
                ref={textRef}
                className="node-textarea"
                onPointerDown={e => e.stopPropagation()}
                onClick={e => e.stopPropagation()}
                onWheelCapture={e => e.stopPropagation()}
                value={data.text}
                onChange={e => {
                  let value = e.target.value
                  value = value.replace(/(^|[^[])#(\d{3})(?!\])/g, (_, p1, p2) => `${p1}[#${p2}]`)
                  if (updateNodeText) {
                    updateNodeText(id, value)
                  }
                }}
              />
            </div>
          </div>
          {showNotes && selected && (
            <div
              className="node-notes"
              onPointerDown={e => e.stopPropagation()}
              onClick={e => e.stopPropagation()}
              onWheelCapture={e => e.stopPropagation()}
            >
              <textarea
                className="node-notes-textarea"
                placeholder="Anteckningar om denna nod..."
                value={data.notes || ''}
                onChange={e => {
                  setNodes(ns => ns.map(n =>
                    n.id === id ? { ...n, data: { ...n.data, notes: e.target.value } } : n
                  ))
                }}
              />
            </div>
          )}
        </>
      )}
      <NodeResizer
        isVisible={selected}
        minWidth={180}
        minHeight={100}
        maxWidth={400}
        maxHeight={300}
        color="var(--accent)"
        onResizeStart={() => {
          setResizing(true)
          if (resizingRef) resizingRef.current = true
        }}
        onResizeEnd={handleResizeEnd}
        onDoubleClick={autoResize}
      />
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  )
})

export default NodeCard
