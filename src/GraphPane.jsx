import ReactFlow, { MiniMap, ReactFlowProvider, useReactFlow } from 'reactflow'
import { Plus, LayoutGrid, Layers, Lightbulb } from 'lucide-react'
import NodeEditorContext from './NodeEditorContext.ts'

export default function GraphPane({
  nodes,
  edges,
  nodeTypes,
  defaultEdgeOptions,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onReconnect,
  onReconnectStart,
  onReconnectEnd,
  onPaneClick,
  onNodeDragStop,
  updateNodeText,
  resizingRef,
  selectNode,
  activeNodeId,
  onAddNode,
  onAutoLayout,
  onAddSection,
  onAddIdea,
}) {
  return (
    <ReactFlowProvider>
    <div className="graph-pane" id="graph">
      <NodeEditorContext.Provider value={{ updateNodeText, resizingRef, selectNode, activeNodeId }}>
        <ReactFlow
          style={{ width: '100%', height: '100%' }}
          nodes={nodes}
          edges={edges}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onReconnect={onReconnect}
          onReconnectStart={onReconnectStart}
          onReconnectEnd={onReconnectEnd}
          edgesUpdatable
          onNodeDragStop={onNodeDragStop}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          snapToGrid
          snapGrid={[16, 16]}
          fitView
          minZoom={0.1}
          maxZoom={4}
        >
          <MiniMap zoomable pannable />
        </ReactFlow>

        <GraphToolbar
          onAddNode={onAddNode}
          onAutoLayout={onAutoLayout}
          onAddSection={onAddSection}
          onAddIdea={onAddIdea}
        />
        <ZoomControls />
      </NodeEditorContext.Provider>
    </div>
    </ReactFlowProvider>
  )
}

function GraphToolbar({ onAddNode, onAutoLayout, onAddSection, onAddIdea }) {
  return (
    <div className="graph-toolbar">
      <button className="btn ghost icon" onClick={onAddNode} title="Ny nod" aria-label="Ny nod">
        <Plus />
      </button>
      <button className="btn ghost icon" onClick={onAutoLayout} title="Auto-layout" aria-label="Auto-layout">
        <LayoutGrid />
      </button>
      <button className="btn ghost icon" onClick={onAddSection} title="Sektion" aria-label="Sektion">
        <Layers />
      </button>
      <button className="btn ghost icon" onClick={onAddIdea} title="Idé" aria-label="Idé">
        <Lightbulb />
      </button>
    </div>
  )
}

function ZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  return (
    <div className="graph-zoom">
      <button onClick={() => zoomIn()} title="Zooma in" aria-label="Zooma in">+</button>
      <button onClick={() => zoomOut()} title="Zooma ut" aria-label="Zooma ut">−</button>
      <button onClick={() => fitView()} title="Återställ zoom" aria-label="Återställ zoom">⌖</button>
    </div>
  )
}
