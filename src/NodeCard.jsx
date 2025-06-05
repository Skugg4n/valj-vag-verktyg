import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { marked } from 'marked'

function parseText(text = '') {
  const tokens = marked.lexer(text)
  let title = ''
  let foundTitle = false
  const bodyParts = []
  for (const t of tokens) {
    if (!foundTitle && t.type === 'heading') {
      title = t.text
      foundTitle = true
    } else if (t.type === 'paragraph' || t.type === 'text') {
      bodyParts.push(t.text)
    }
  }
  const body = bodyParts.join(' ').trim()
  return { title, snippet: body.slice(0, 50) }
}

const NodeCard = memo(({ id, data }) => {
  const { title, snippet } = parseText(data.text)
  return (
    <div className="node-card">
      <div className="node-id">[{id}]</div>
      {title && <div className="node-title">{title}</div>}
      {snippet && <div className="node-preview">{snippet}</div>}
      <Handle type="source" position={Position.Right} />
      <Handle type="target" position={Position.Left} />
    </div>
  )
})

export default NodeCard
