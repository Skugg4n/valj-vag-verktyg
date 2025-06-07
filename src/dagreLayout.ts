import dagre from 'dagre'
import type { Edge, Node } from 'reactflow'
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from './constants.js'

export default function getLayoutedElements(nodes: Node[], edges: Edge[], direction = 'LR') {
  const dagreGraph = new dagre.graphlib.Graph()
  dagreGraph.setDefaultEdgeLabel(() => ({}))
  dagreGraph.setGraph({ rankdir: direction })

  nodes.forEach(node => {
    const width = node.width ?? DEFAULT_NODE_WIDTH
    const height = node.height ?? DEFAULT_NODE_HEIGHT
    dagreGraph.setNode(node.id, { width, height })
  })

  edges.forEach(edge => dagreGraph.setEdge(edge.source, edge.target))

  dagre.layout(dagreGraph)

  const layouted = nodes.map(node => {
    const { x, y } = dagreGraph.node(node.id)
    return {
      ...node,
      position: {
        x: x - (node.width ?? DEFAULT_NODE_WIDTH) / 2,
        y: y - (node.height ?? DEFAULT_NODE_HEIGHT) / 2,
      },
    }
  })

  return { nodes: layouted, edges }
}
