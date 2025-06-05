import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { parseText } from './parseText.js'

const NodeCard = memo(({ id, data, selected }) => {
  const { snippet } = parseText(data.text)
  return (
    <div className={`node-card${selected ? ' selected' : ''}`}>
      <div className="node-header">
        <span className="node-id">#{id}</span>
        {data.title && <span className="node-title">{data.title}</span>}
      </div>
      {snippet && <div className="node-preview">{snippet}</div>}
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  )
})

export default NodeCard
