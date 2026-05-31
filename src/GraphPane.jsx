import { useMemo, useState } from 'react'
import ReactFlow, { MiniMap, ReactFlowProvider, useReactFlow } from 'reactflow'
import { Plus, LayoutGrid, Layers, Lightbulb, Search, X } from 'lucide-react'
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
  const [search, setSearch] = useState('')

  const matchSet = useMemo(() => {
    const q = search.trim().toLowerCase()
    if (!q) return null
    return new Set(
      nodes
        .filter(n =>
          (n.data?.title || '').toLowerCase().includes(q) ||
          (n.data?.text || '').toLowerCase().includes(q) ||
          n.id.toLowerCase().includes(q)
        )
        .map(n => n.id)
    )
  }, [search, nodes])

  return (
    <ReactFlowProvider>
    <div className="graph-pane" id="graph">
      <NodeEditorContext.Provider value={{ updateNodeText, resizingRef, selectNode, activeNodeId, matchSet }}>
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
          deleteKeyCode={null}
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

        <div className="graph-search">
          <Search size={14} />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Sök scen…"
            aria-label="Sök scen"
          />
          {search && (
            <>
              <span className="graph-search-count">{matchSet ? matchSet.size : 0}</span>
              <button className="graph-search-clear" onClick={() => setSearch('')} aria-label="Rensa sökning">
                <X size={13} />
              </button>
            </>
          )}
        </div>

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
      <button
        className="btn ghost icon"
        onClick={onAddSection}
        disabled
        title="Sektioner – kommer snart"
        aria-label="Sektioner (kommer snart)"
      >
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
