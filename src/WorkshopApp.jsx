import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import ReactFlow, { Background, applyNodeChanges, ReactFlowProvider, useReactFlow, MarkerType } from 'reactflow'
import 'reactflow/dist/style.css'
import { useAuth } from './AuthContext.jsx'
import useProjectStorage from './useProjectStorage.js'
import useFirestoreSync from './useFirestoreSync.js'
import WorkshopNode from './WorkshopNode.jsx'
import WorkshopEditPanel from './WorkshopEditPanel.jsx'
import BookReader from './BookReader.jsx'
import UserMenu from './UserMenu.jsx'
import { toPublishedNodes } from './storyExport.js'
import { splitBodyAndChoices, joinBodyAndChoices } from './sceneRefs.js'
import { makeShareId } from './utils/shareId.js'
import { shareUrl } from './routing.js'
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from './constants.js'
import './WorkshopApp.css'

const SHAREIDS_KEY = 'cyoa-shareids'
const WORKSHOP_IDS_KEY = 'cyoa-workshop-ids'
const loadJSON = (k, fb) => { try { return JSON.parse(localStorage.getItem(k)) ?? fb } catch { return fb } }
const saveJSON = (k, v) => { try { localStorage.setItem(k, JSON.stringify(v)) } catch { /* ignore */ } }

function scanEdges(nodes) {
  const pattern = /\[#(\d{3})]|#(\d{3})/g
  const unique = new Set()
  const edges = []
  for (const n of nodes) {
    const text = n.data?.text || ''
    pattern.lastIndex = 0
    let m
    while ((m = pattern.exec(text))) {
      const target = m[1] || m[2]
      if (nodes.find(nn => nn.id === target)) {
        const id = `${n.id}->${target}`
        if (!unique.has(id)) { unique.add(id); edges.push({ id, source: n.id, target }) }
      }
    }
  }
  return edges
}

const newCard = (id, position, color = '#2f6df6', title = 'Ny scen') => ({
  id, type: 'card', position,
  data: { title, text: '', color },
  width: DEFAULT_NODE_WIDTH, height: DEFAULT_NODE_HEIGHT,
})
const addRef = (text, targetId) => {
  const { body, choiceIds } = splitBodyAndChoices(text || '')
  return choiceIds.includes(targetId) ? text : joinBodyAndChoices(body, [...choiceIds, targetId])
}

function WorkshopCanvas(props) {
  const { fitView } = useReactFlow()
  // re-fit when the project changes
  useEffect(() => { const t = setTimeout(() => fitView({ padding: 0.2, duration: 300 }), 60); return () => clearTimeout(t) }, [props.projectId, fitView])
  return (
    <ReactFlow
      nodes={props.nodes}
      edges={props.edges}
      nodeTypes={props.nodeTypes}
      defaultEdgeOptions={props.defaultEdgeOptions}
      onNodesChange={props.onNodesChange}
      onConnect={props.onConnect}
      onNodeClick={props.onNodeClick}
      onPaneClick={props.onPaneClick}
      onNodeDragStop={props.onNodeDragStop}
      deleteKeyCode={null}
      nodesConnectable
      fitView
      minZoom={0.2}
      maxZoom={1.6}
      proOptions={{ hideAttribution: true }}
    >
      <Background color="#d8d2c4" gap={22} size={1} />
    </ReactFlow>
  )
}

export default function WorkshopApp() {
  useEffect(() => {
    document.documentElement.setAttribute('data-app', 'workshop')
    return () => document.documentElement.removeAttribute('data-app')
  }, [])

  const nodeTypes = useMemo(() => ({ card: WorkshopNode }), [])
  const defaultEdgeOptions = useMemo(
    () => ({ markerEnd: { type: MarkerType.ArrowClosed }, style: { strokeWidth: 1.5 } }),
    []
  )

  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [nextId, setNextId] = useState(1)
  const [projectName, setProjectName] = useState('')
  const [selectedId, setSelectedId] = useState(null)
  const [playing, setPlaying] = useState(false)
  const [shareInfo, setShareInfo] = useState(null) // { id, url }
  const [busy, setBusy] = useState(false)
  const [storyMenu, setStoryMenu] = useState(false)
  const [autoSave] = useState(true)

  const { user } = useAuth()
  const { projects, setProjects, projectId, setProjectId, setProjectStart } = useProjectStorage({
    nodes, nextId, projectName, autoSave, setNodes, setNextId, setProjectName,
  })
  const { saveToFirestore, deleteFromFirestore, publishStory, unpublishStory } = useFirestoreSync({
    user, projects, setProjects, projectId,
  })

  // Scan edges once when a project's nodes first arrive (storage sets nodes only).
  const edgesInit = useRef(false)
  useEffect(() => {
    if (edgesInit.current || nodes.length === 0) return
    edgesInit.current = true
    setEdges(scanEdges(nodes))
  }, [nodes])

  // Firestore autosave when logged in (same shape as the advanced app).
  useEffect(() => {
    if (!user || !projectId || nodes.length === 0) return
    const data = {
      projectName, nextNodeId: nextId,
      nodes: nodes.map(n => ({
        id: n.id, text: n.data.text || '', title: n.data.title || '',
        color: n.data.color || '#2f6df6', position: n.position,
        type: n.type || 'card', width: n.width, height: n.height,
      })),
    }
    const t = setTimeout(() => saveToFirestore(projectId, data), 2000)
    return () => clearTimeout(t)
  }, [user, nodes, nextId, projectName, projectId, saveToFirestore])

  // Mark current project as a workshop story; load its share link.
  useEffect(() => {
    if (!projectId) return
    const ids = loadJSON(WORKSHOP_IDS_KEY, [])
    if (!ids.includes(projectId)) saveJSON(WORKSHOP_IDS_KEY, [...ids, projectId])
    const sid = loadJSON(SHAREIDS_KEY, {})[projectId]
    setShareInfo(sid ? { id: sid, url: shareUrl(sid) } : null)
  }, [projectId])

  // Close the story menu when clicking anywhere outside it.
  useEffect(() => {
    if (!storyMenu) return
    const onDown = e => { if (!e.target.closest?.('.ws-story')) setStoryMenu(false) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [storyMenu])

  const selected = nodes.find(n => n.id === selectedId) || null
  const scenes = useMemo(() => nodes.map(n => ({ id: n.id, title: n.data?.title || '' })), [nodes])
  const workshopProjects = useMemo(() => {
    const ids = loadJSON(WORKSHOP_IDS_KEY, [])
    return Object.entries(projects)
      .filter(([id]) => ids.includes(id))
      .map(([id, p]) => ({ id, name: p.data?.projectName || '', updated: p.updated || 0 }))
      .sort((a, b) => (b.updated || 0) - (a.updated || 0))
  }, [projects])

  const onNodesChange = useCallback(changes => setNodes(ns => applyNodeChanges(changes, ns)), [])

  const commit = updater =>
    setNodes(ns => { const updated = updater(ns); setEdges(scanEdges(updated)); return updated })

  const updateScene = (id, patch) =>
    commit(ns => ns.map(n => (n.id === id ? { ...n, data: { ...n.data, ...patch } } : n)))

  const addScene = () => {
    const id = String(nextId).padStart(3, '0')
    const base = nodes.length ? nodes[nodes.length - 1].position : { x: 80, y: 120 }
    commit(ns => [...ns, newCard(id, { x: base.x + 40, y: base.y + 160 })])
    setNextId(n => n + 1)
    setSelectedId(id)
  }

  const onAddChoice = targetId => {
    if (!selectedId) return
    if (targetId) {
      commit(ns => ns.map(n => (n.id === selectedId ? { ...n, data: { ...n.data, text: addRef(n.data.text, targetId) } } : n)))
      return
    }
    // create a new scene to the right and link it
    const newId = String(nextId).padStart(3, '0')
    const from = nodes.find(n => n.id === selectedId)
    const pos = from ? { x: from.position.x + 300, y: from.position.y } : { x: 120, y: 120 }
    commit(ns => {
      let updated = [...ns, newCard(newId, pos)]
      updated = updated.map(n => (n.id === selectedId ? { ...n, data: { ...n.data, text: addRef(n.data.text, newId) } } : n))
      return updated
    })
    setNextId(n => n + 1)
  }

  const onConnect = useCallback(({ source, target }) => {
    if (!source || !target || source === target) return
    setNodes(ns => {
      const updated = ns.map(n => (n.id === source ? { ...n, data: { ...n.data, text: addRef(n.data.text, target) } } : n))
      setEdges(scanEdges(updated))
      return updated
    })
  }, [])

  const deleteScene = id => {
    if (!confirm('Ta bort den här scenen?')) return
    commit(ns =>
      ns.filter(n => n.id !== id).map(n => {
        const { body, choiceIds } = splitBodyAndChoices(n.data?.text || '')
        return choiceIds.includes(id)
          ? { ...n, data: { ...n.data, text: joinBodyAndChoices(body, choiceIds.filter(x => x !== id)) } }
          : n
      })
    )
    setSelectedId(null)
  }

  // --- Story management ---
  const loadProject = (id, data) => {
    edgesInit.current = false
    const loaded = (data.nodes || []).map(n => ({
      id: n.id, type: 'card', position: n.position || { x: 0, y: 0 },
      data: { text: n.text || '', title: n.title || '', color: n.color || '#2f6df6' },
      width: n.width ?? DEFAULT_NODE_WIDTH, height: n.height ?? DEFAULT_NODE_HEIGHT,
    }))
    setNodes(loaded); setEdges(scanEdges(loaded)); setNextId(data.nextNodeId || 1)
    setProjectName(data.projectName || ''); setSelectedId(null)
  }
  const switchStory = id => {
    const p = projects[id]; if (!p) return
    setStoryMenu(false)
    loadProject(id, p.data); setProjectId(id); setProjectStart(p.start || Date.now())
  }
  const newStory = () => {
    setStoryMenu(false)
    edgesInit.current = false
    const id = String(Date.now())
    setNodes([]); setEdges([]); setNextId(1); setProjectName(''); setSelectedId(null)
    setProjectId(id); setProjectStart(Date.now())
    saveJSON(WORKSHOP_IDS_KEY, [...loadJSON(WORKSHOP_IDS_KEY, []), id])
    setShareInfo(null)
    // seed a first scene so the canvas isn't empty
    const sid = '001'
    commit(() => [newCard(sid, { x: 120, y: 140 }, '#2f6df6', 'Start')])
    setNextId(2); setSelectedId(sid)
  }
  const deleteStory = id => {
    if (!confirm('Radera hela berättelsen? Detta går inte att ångra.')) return
    setStoryMenu(false)
    deleteFromFirestore(id)
    setProjects(p => { const n = { ...p }; delete n[id]; return n })
    saveJSON(WORKSHOP_IDS_KEY, loadJSON(WORKSHOP_IDS_KEY, []).filter(x => x !== id))
    const rest = workshopProjects.filter(p => p.id !== id)
    if (id === projectId) { rest.length ? switchStory(rest[0].id) : newStory() }
  }

  // --- Publish ---
  const publish = async () => {
    if (nodes.length === 0) return
    if (!user) { alert('Logga in (uppe till höger) för att dela berättelsen.'); return }
    setBusy(true)
    try {
      const map = loadJSON(SHAREIDS_KEY, {})
      let sid = map[projectId]
      if (!sid) { sid = makeShareId(); map[projectId] = sid; saveJSON(SHAREIDS_KEY, map) }
      const ok = await publishStory(sid, {
        title: projectName || 'Berättelse', nodes: toPublishedNodes(nodes), sourceProjectId: projectId,
      })
      if (ok) setShareInfo({ id: sid, url: shareUrl(sid) })
      else alert('Kunde inte publicera. Försök igen.')
    } finally { setBusy(false) }
  }
  const stopSharing = async () => {
    if (!shareInfo || !confirm('Sluta dela den publika länken?')) return
    setBusy(true)
    try {
      await unpublishStory(shareInfo.id)
      const map = loadJSON(SHAREIDS_KEY, {}); delete map[projectId]; saveJSON(SHAREIDS_KEY, map)
      setShareInfo(null)
    } finally { setBusy(false) }
  }
  const copyLink = () => { if (shareInfo) navigator.clipboard?.writeText(shareInfo.url) }

  return (
    <div className="ws-app">
      <header className="ws-topbar">
        <div className="ws-brand">Berättelseverkstad</div>
        <div className="ws-story">
          <input
            className="ws-name"
            value={projectName}
            onChange={e => setProjectName(e.target.value)}
            placeholder="Namnlös berättelse"
          />
          <button className="ws-tb-btn" onClick={() => setStoryMenu(o => !o)} title="Mina berättelser">▾</button>
          {storyMenu && (
            <div className="ws-story-menu">
              <button className="ws-story-item" onClick={newStory}>+ Ny berättelse</button>
              <button className="ws-story-item danger" onClick={() => deleteStory(projectId)}>Radera berättelsen</button>
              {workshopProjects.length > 0 && <div className="ws-story-sep">Byt berättelse</div>}
              {workshopProjects.map(p => (
                <button key={p.id} className={`ws-story-item${p.id === projectId ? ' active' : ''}`} onClick={() => switchStory(p.id)}>
                  {p.name?.trim() || 'Namnlös'}
                </button>
              ))}
            </div>
          )}
        </div>
        <span className="ws-flex" />
        <button className="ws-tb-btn primary" onClick={addScene}>+ Ny scen</button>
        <button className="ws-tb-btn" onClick={() => setPlaying(true)} disabled={!nodes.length}>▶ Spela upp</button>
        {shareInfo ? (
          <div className="ws-share">
            <button className="ws-tb-btn shared" onClick={copyLink} title={shareInfo.url}>✓ Delad, kopiera länk</button>
            <button className="ws-tb-btn" onClick={publish} disabled={busy} title="Uppdatera delad version">↻</button>
            <button className="ws-tb-btn ghost" onClick={stopSharing} disabled={busy}>Sluta dela</button>
          </div>
        ) : (
          <button className="ws-tb-btn accent" onClick={publish} disabled={busy || !nodes.length} title={!nodes.length ? 'Skapa minst en scen först' : 'Dela en publik länk'}>Dela</button>
        )}
        <UserMenu />
      </header>

      <div className="ws-body">
        <div className="ws-canvas">
          {nodes.length === 0 ? (
            <div className="ws-empty">
              <p>Inga scener ännu.</p>
              <button className="ws-tb-btn primary" onClick={addScene}>+ Skapa din första scen</button>
            </div>
          ) : (
            <ReactFlowProvider>
              <WorkshopCanvas
                nodes={nodes} edges={edges} nodeTypes={nodeTypes} defaultEdgeOptions={defaultEdgeOptions}
                projectId={projectId}
                onNodesChange={onNodesChange} onConnect={onConnect}
                onNodeClick={(_e, n) => setSelectedId(n.id)}
                onPaneClick={() => setSelectedId(null)}
                onNodeDragStop={() => { /* positions already in state; autosave persists */ }}
              />
            </ReactFlowProvider>
          )}
        </div>
        <WorkshopEditPanel
          node={selected}
          scenes={scenes}
          onPatch={patch => selectedId && updateScene(selectedId, patch)}
          onAddChoice={onAddChoice}
          onDelete={() => selectedId && deleteScene(selectedId)}
        />
      </div>

      {playing && (
        <BookReader title={projectName} nodes={toPublishedNodes(nodes)} onClose={() => setPlaying(false)} />
      )}
    </div>
  )
}
