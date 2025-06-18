import { memo, useState, useContext, useEffect, useRef } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
import { NodeResizeControl, ResizeControlVariant } from '@reactflow/node-resizer'
import '@reactflow/node-resizer/dist/style.css'
import NodeEditorContext from './NodeEditorContext.js'
import { DEFAULT_NODE_HEIGHT } from './constants.js'

function isLightColor(hex) {
  if (!hex || typeof hex !== 'string' || hex[0] !== '#') return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  const luminance = 0.299 * r + 0.587 * g + 0.114 * b
  return luminance > 186
}

const NodeCard = memo(({ id, data, selected }) => {
  const { setNodes, getNodes } = useReactFlow()
  const { updateNodeText } = useContext(NodeEditorContext)
  const [resizing, setResizing] = useState(false)
  const [overflow, setOverflow] = useState(false)
  const [invalidRef, setInvalidRef] = useState(false)
  const textRef = useRef(null)
  const previewRef = useRef(null)
  const prevSelectedRef = useRef(selected)
  const previewHeight = useRef(DEFAULT_NODE_HEIGHT)

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
  }, [data.text, selected])

  useEffect(() => {
    if (!selected && previewRef.current) {
      previewHeight.current = Math.min(
        300,
        Math.max(100, previewRef.current.scrollHeight + 16)
      )
      setNodes(ns =>
        ns.map(n =>
          n.id === id && n.height !== previewHeight.current
            ? { ...n, height: previewHeight.current }
            : n
        )
      )
    }
  }, [data.text, selected])

  useEffect(() => {
    if (selected) {
      setNodes(ns =>
        ns.map(n =>
          n.id === id && n.height !== previewHeight.current
            ? { ...n, height: previewHeight.current }
            : n
        )
      )
    }
  }, [selected])

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

  const handleResizeEnd = (_e, { width, height }) => {
    setResizing(false)
    setNodes(ns =>
      ns.map(n => (n.id === id ? { ...n, width, height } : n))
    )
  }

  const autoResize = () => {
    const el = textRef.current || previewRef.current
    if (!el) return
    const height = Math.min(300, Math.max(100, el.scrollHeight + 16))
    setNodes(ns => ns.map(n => (n.id === id ? { ...n, height } : n)))
  }

  const bg = data.color || '#1f2937'
  const textColor = isLightColor(bg) ? '#000' : 'var(--text)'

  return (
    <div
      className={`node-card${selected ? ' selected' : ''}${resizing ? ' resizing' : ''}`}
      style={{ background: bg, color: textColor, '--card-bg': bg }}
    >
      {invalidRef && <div className="invalid-dot" />}
      <div className="node-header">
        <span className="node-id">#{id}</span>
        {data.title && <span className="node-title">{data.title}</span>}
      </div>
      {selected ? (
        <textarea
          ref={textRef}
          className="node-textarea"
          value={data.text}
          onChange={e => {
            let value = e.target.value
            value = value.replace(/(^|[^[])#(\d{3})(?!\])/g, (_, p1, p2) => `${p1}[#${p2}]`)
            if (updateNodeText) {
              updateNodeText(id, value)
            }
          }}
        />
      ) : (
        data.text && (
          <div ref={previewRef} className="node-preview">
            {data.text}
            {overflow && <div className="preview-more">...</div>}
          </div>
        )
      )}
      <NodeResizeControl
        variant={ResizeControlVariant.Handle}
        position="bottom-right"
        minWidth={180}
        minHeight={100}
        maxWidth={400}
        maxHeight={300}
        className="resize-handle"
        onResizeStart={() => setResizing(true)}
        onResizeEnd={handleResizeEnd}
        onDoubleClick={autoResize}
      />
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  )
})

export default NodeCard
