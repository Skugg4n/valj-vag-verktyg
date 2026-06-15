// Maps the live ReactFlow nodes to the slim, public "published" scene shape.
// Scenes only — idea notes and section/group containers never get published.

export function isScene(n) {
  return n && n.type !== 'group' && !n.data?.isIdea && !String(n.id).startsWith('idea-')
}

export function toPublishedNodes(nodes) {
  return (nodes || []).filter(isScene).map(n => ({
    id: n.id,
    title: n.data?.title || '',
    text: n.data?.text || '',
    color: n.data?.color || '#1f2937',
  }))
}
