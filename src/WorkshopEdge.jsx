import { BaseEdge, EdgeLabelRenderer, getBezierPath } from 'reactflow'

// Connection line you can grab anywhere: a wide invisible hit area selects the
// edge (click anywhere on it), and when selected a "×" appears at its middle to
// remove the link. Endpoint-dragging (reconnect/delete) still works too.
export default function WorkshopEdge({
  id, sourceX, sourceY, targetX, targetY,
  sourcePosition, targetPosition, markerEnd, style, data, selected,
}) {
  const [path, labelX, labelY] = getBezierPath({
    sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition,
  })
  return (
    <>
      <BaseEdge id={id} path={path} markerEnd={markerEnd} style={style} interactionWidth={28} />
      {selected && (
        <EdgeLabelRenderer>
          <button
            className="ws-edge-del nodrag nopan"
            style={{ transform: `translate(-50%, -50%) translate(${labelX}px, ${labelY}px)` }}
            onClick={e => { e.stopPropagation(); data?.onDelete?.() }}
            title="Ta bort kopplingen"
            aria-label="Ta bort kopplingen"
          >
            ×
          </button>
        </EdgeLabelRenderer>
      )}
    </>
  )
}
