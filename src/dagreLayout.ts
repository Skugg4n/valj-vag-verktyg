import dagre from 'dagre'
import type { Edge, Node } from 'reactflow'

export default function getLayoutedElements(nodes: Node[], edges: Edge[], direction = 'LR') {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: direction })

  nodes.forEach(node => {
    const width = node.width ?? 250
    const height = node.height ?? 100
    dagreGraph.setNode(node.id, { width, height })
  })

  edges.forEach(edge => dagreGraph.setEdge(edge.source, edge.target))

  dagre.layout(dagreGraph)

  const layouted = nodes.map(node => {
    const { x, y } = dagreGraph.node(node.id)
    return {
      ...node,
      position: { x: x - (node.width ?? 250) / 2, y: y - (node.height ?? 100) / 2 },
    }
  })

  return { nodes: layouted, edges }
}
