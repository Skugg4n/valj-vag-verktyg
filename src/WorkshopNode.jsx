import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { splitBodyAndChoices } from './sceneRefs.js'

function isLight(hex) {
  if (!hex || hex[0] !== '#') return false
  const r = parseInt(hex.slice(1, 3), 16)
  const g = parseInt(hex.slice(3, 5), 16)
  const b = parseInt(hex.slice(5, 7), 16)
  return 0.299 * r + 0.587 * g + 0.114 * b > 150
}

// Clean light scene card for the workshop graph. Tone-plate header in the
// scene's colour, soft shadow, no hard border. type stays 'card' so the
// advanced app can render the same story.
const WorkshopNode = memo(({ data, selected }) => {
  const color = data?.color || '#2f6df6'
  const { body } = splitBodyAndChoices(data?.text || '')
  return (
    <div className={`ws-node${selected ? ' selected' : ''}`}>
      <div
        className="ws-node-head"
        style={{ background: color, color: isLight(color) ? '#15191f' : '#fff' }}
      >
        {data?.title?.trim() || 'Namnlös scen'}
      </div>
      <div className="ws-node-body">
        {body ? body.slice(0, 90) : <span className="ws-node-empty">Tom scen…</span>}
      </div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
})

export default WorkshopNode
