import { memo, useState } from 'react'
import { Handle, Position, useReactFlow } from 'reactflow'
import { NodeResizeControl, ResizeControlVariant } from '@reactflow/node-resizer'
import '@reactflow/node-resizer/dist/style.css'
import { parseText } from './parseText.js'

const NodeCard = memo(({ id, data, selected }) => {
  const { snippet } = parseText(data.text)
  const { setNodes } = useReactFlow()
  const [resizing, setResizing] = useState(false)

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
      {snippet && <div className="node-preview">{snippet}</div>}
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
