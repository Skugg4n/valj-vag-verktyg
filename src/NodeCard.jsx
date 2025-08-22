import { memo, useState, useContext, useEffect, useRef } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
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

const NodeCard = memo(({ id, data, selected, width = DEFAULT_NODE_WIDTH, height = DEFAULT_NODE_HEIGHT }) => {
  const { setNodes, getNodes, updateNodeInternals } = useReactFlow()
  const { updateNodeText, resizingRef } = useContext(NodeEditorContext)
  const [resizing, setResizing] = useState(false)
  const [overflow, setOverflow] = useState(false)
  const [invalidRef, setInvalidRef] = useState(false)
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
  }, [data.text, getNodes])

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
      className={`node-card${selected ? ' selected' : ''}${resizing ? ' resizing' : ''}`}
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
      <div className="node-header">
        <span className="node-id">#{id}</span>
        {data.title && <span className="node-title">{data.title}</span>}
      </div>
      <div className="node-content">
        <div ref={previewRef} className="node-preview" aria-hidden={selected}>
          {data.text}
          {overflow && <div className="preview-more">...</div>}
        </div>
        <div className="node-editor" aria-hidden={!selected}>
          <textarea
            ref={textRef}
            className="node-textarea"
            onPointerDown={e => e.stopPropagation()}
            onClick={e => e.stopPropagation()}
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
