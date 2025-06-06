import { memo, useState, useContext, useEffect, useRef } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
import { NodeResizeControl, ResizeControlVariant } from '@reactflow/node-resizer'
import '@reactflow/node-resizer/dist/style.css'
import NodeEditorContext from './NodeEditorContext.js'

const NodeCard = memo(({ id, data, selected }) => {
  const { setNodes } = useReactFlow()
  const { updateNodeText } = useContext(NodeEditorContext)
  const [resizing, setResizing] = useState(false)
  const textRef = useRef(null)

  useEffect(() => {
    if (selected) textRef.current?.focus()
  }, [selected])

  const handleResizeEnd = (_e, { width, height }) => {
    setResizing(false)
    setNodes(ns =>
      ns.map(n => (n.id === id ? { ...n, width, height } : n))
    )
  }

  return (
    <div className={`node-card${selected ? ' selected' : ''}${resizing ? ' resizing' : ''}`}>
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
        data.text && <div className="node-preview">{data.text}</div>
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
      />
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  )
})

export default NodeCard
