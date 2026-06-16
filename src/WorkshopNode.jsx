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
  const { body, choiceIds } = splitBodyAndChoices(data?.text || '')
  const isStart = !!data?._isStart
  const isEnd = choiceIds.length === 0
  const isEmpty = !body.trim()
  // Deterministic truncation with an ellipsis (don't rely on -webkit-line-clamp,
  // which silently breaks here). The card also clips as a backstop.
  const preview = body.length > 90 ? body.slice(0, 90).replace(/\s+\S*$/, '') + '…' : body
  return (
    <div className={`ws-node${selected ? ' selected' : ''}`}>
      {/* Inner wrapper does the clipping (rounded corners + text overflow).
          The handles live OUTSIDE it so they're never clipped by overflow. */}
      <div className="ws-node-inner">
        <div
          className="ws-node-head"
          style={{ background: color, color: isLight(color) ? '#15191f' : '#fff' }}
        >
          {data?.title?.trim() || 'Namnlös scen'}
        </div>
        {(isStart || isEnd || isEmpty) && (
          <div className="ws-node-badges">
            {isStart && <span className="ws-badge start">★ Start</span>}
            {isEnd && <span className="ws-badge end">Slut</span>}
            {isEmpty && <span className="ws-badge warn">Tom</span>}
          </div>
        )}
        <div className="ws-node-body">
          {body ? preview : <span className="ws-node-empty">Skriv vad som händer…</span>}
        </div>
      </div>
      {/* Target on the left, source on the right. Links can still go both ways:
          drag from one scene's right dot to another scene's left dot, in any
          direction (e.g. die → back to the previous scene). */}
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
})

export default WorkshopNode
