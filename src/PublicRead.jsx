import { useEffect, useMemo, useState } from 'react'
import ReactFlow, { Background, Controls, MarkerType, Handle, Position } from 'reactflow'
import 'reactflow/dist/style.css'
import { getPublished } from './useFirestoreSync.js'
import ReadPane from './ReadPane.jsx'
import StagePane from './StagePane.jsx'
import { useTheme } from './theme.js'

// Working link for collaborators (/las/:shareId): the Advanced read view with
// highlights and {cue} chips, the stage mode, and a read-only map of the
// scenes. No login. Uses the "rich" copy of the published story; falls back
// to the plain public copy if an older publish has none.

const REF_RE = /\[#(\d{3})\]|#(\d{3})/g

export function richToNodes(story) {
  const src = story?.rich?.nodes?.length ? story.rich.nodes : (story?.nodes || [])
  return src.map((n, i) => ({
    id: n.id,
    type: 'card',
    position: n.position || { x: (i % 6) * 260, y: Math.floor(i / 6) * 160 },
    width: n.width || 220,
    height: n.height || 100,
    data: { title: n.title || '', text: n.text || '', color: n.color || '#1f2937' },
  }))
}

export function edgesFrom(nodes) {
  const ids = new Set(nodes.map(n => n.id))
  const out = []
  const seen = new Set()
  for (const n of nodes) {
    for (const m of (n.data.text || '').matchAll(REF_RE)) {
      const t = m[1] || m[2]
      const id = `${n.id}->${t}`
      if (ids.has(t) && !seen.has(id)) { seen.add(id); out.push({ id, source: n.id, target: t, markerEnd: { type: MarkerType.ArrowClosed } }) }
    }
  }
  return out
}

function MapNode({ data }) {
  // Edges attach to handles; without them ReactFlow draws nothing.
  return (
    <div className="pr-node" style={{ background: data.color }}>
      <Handle type="target" position={Position.Left} isConnectable={false} />
      <span className="pr-node-id">#{data.id}</span>
      <span className="pr-node-title">{data.title || '(utan titel)'}</span>
      <Handle type="source" position={Position.Right} isConnectable={false} />
    </div>
  )
}
const nodeTypes = { card: MapNode }

export default function PublicRead({ shareId }) {
  const [state, setState] = useState({ loading: true, story: null })
  const [tab, setTab] = useState('read')
  const [activeId, setActiveId] = useState(null)
  useTheme()   // follows the system light/dark like the editor does

  useEffect(() => {
    let alive = true
    const timer = setTimeout(() => { if (alive) setState({ loading: false, story: null }) }, 12000)
    getPublished(shareId).then(story => {
      if (!alive) return
      clearTimeout(timer)
      setState({ loading: false, story })
      if (story?.title) document.title = `${story.title} · arbetslänk`
    })
    return () => { alive = false; clearTimeout(timer) }
  }, [shareId])

  const nodes = useMemo(() => richToNodes(state.story), [state.story])
  const edges = useMemo(() => edgesFrom(nodes), [nodes])
  const mapNodes = useMemo(() => nodes.map(n => ({
    ...n,
    data: { ...n.data, id: n.id, color: n.data.color === '#1f2937' ? 'var(--card)' : n.data.color },
    style: { width: n.width, height: n.height },
  })), [nodes])

  if (state.loading) return <div className="pr-shell"><p className="pr-msg">Laddar berättelsen…</p></div>
  if (!state.story) {
    return (
      <div className="pr-shell">
        <p className="pr-msg">Berättelsen hittades inte. Be den som gjorde berättelsen om en ny länk.</p>
      </div>
    )
  }

  return (
    <div className="pr-shell">
      <header className="pr-bar">
        <span className="pr-title">{state.story.title || 'Berättelse'}</span>
        <span className="pr-sub">arbetslänk</span>
        <span style={{ flex: 1 }} />
        <nav className="pr-tabs" role="tablist" aria-label="Vy">
          <button role="tab" aria-selected={tab === 'read'} className={tab === 'read' ? 'on' : ''} onClick={() => setTab('read')}>Läs</button>
          <button role="tab" aria-selected={tab === 'stage'} className={tab === 'stage' ? 'on' : ''} onClick={() => setTab('stage')}>Scen</button>
          <button role="tab" aria-selected={tab === 'map'} className={tab === 'map' ? 'on' : ''} onClick={() => setTab('map')}>Karta</button>
        </nav>
      </header>

      {tab === 'read' && (
        <div className="pr-body">
          <ReadPane nodes={nodes} startId={activeId || undefined} activeNodeId={activeId} onSelectNode={setActiveId} />
        </div>
      )}
      {tab === 'stage' && (
        <StagePane nodes={nodes} startId={activeId || undefined} onExit={() => setTab('read')} />
      )}
      {tab === 'map' && (
        <div className="pr-body pr-map">
          <ReactFlow
            nodes={mapNodes}
            edges={edges}
            nodeTypes={nodeTypes}
            fitView
            nodesDraggable={false}
            nodesConnectable={false}
            elementsSelectable
            onNodeClick={(_e, n) => { setActiveId(n.id); setTab('read') }}
            minZoom={0.1}
            proOptions={{ hideAttribution: true }}
          >
            <Background gap={22} />
            <Controls showInteractive={false} />
          </ReactFlow>
          <p className="pr-hint">Klicka på en scen för att läsa den.</p>
        </div>
      )}
    </div>
  )
}
