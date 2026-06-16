import { useState, useCallback, useMemo, useEffect, useRef } from 'react'
import ReactFlow, { Background, applyNodeChanges, applyEdgeChanges, ReactFlowProvider, useReactFlow, MarkerType } from 'reactflow'
import 'reactflow/dist/style.css'
import { useAuth } from './AuthContext.jsx'
import useProjectStorage from './useProjectStorage.js'
import useFirestoreSync from './useFirestoreSync.js'
import WorkshopNode from './WorkshopNode.jsx'
import WorkshopEdge from './WorkshopEdge.jsx'
import WorkshopEditPanel from './WorkshopEditPanel.jsx'
import BookReader from './BookReader.jsx'
import UserMenu from './UserMenu.jsx'
import { toPublishedNodes } from './storyExport.js'
import { splitBodyAndChoices, joinBodyAndChoices } from './sceneRefs.js'
import { makeShareId } from './utils/shareId.js'
import { shareUrl } from './routing.js'
import './WorkshopApp.css'

const SCALE_KEY = 'cyoa-ws-scale'
const SCALE_MIN = 0.8
const SCALE_MAX = 1.8

/* global __APP_VERSION__ */
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : '?'
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
        if (!unique.has(id)) { unique.add(id); edges.push({ id, source: n.id, target, reconnectable: true }) }
      }
    }
  }
  return edges
}

// Fixed card size so ReactFlow places the connection handles at a stable
// vertical centre (auto-measuring made them jump). The card clips to match.
const WS_NODE_W = 200
const WS_NODE_H = 140
const DEFAULT_COLOR = '#e6c34e' // warm yellow — the default for new scenes
const newCard = (id, position, color = DEFAULT_COLOR, title = 'Ny scen') => ({
  id, type: 'card', position,
  data: { title, text: '', color },
  width: WS_NODE_W, height: WS_NODE_H,
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
      edgeTypes={props.edgeTypes}
      defaultEdgeOptions={props.defaultEdgeOptions}
      onNodesChange={props.onNodesChange}
      onEdgesChange={props.onEdgesChange}
      onConnect={props.onConnect}
      onReconnect={props.onReconnect}
      onReconnectStart={props.onReconnectStart}
      onReconnectEnd={props.onReconnectEnd}
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
    const prevTitle = document.title
    document.title = 'Ola Belins Berättarverkstad'
    return () => {
      document.documentElement.removeAttribute('data-app')
      document.title = prevTitle
    }
  }, [])

  const nodeTypes = useMemo(() => ({ card: WorkshopNode }), [])
  const edgeTypes = useMemo(() => ({ ws: WorkshopEdge }), [])
  const defaultEdgeOptions = useMemo(
    () => ({
      markerEnd: { type: MarkerType.ArrowClosed, color: '#9a937f', width: 18, height: 18 },
      style: { strokeWidth: 2, stroke: '#9a937f' },
    }),
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
  // UI text scale, adjustable on-site for projectors/TVs. Persisted.
  const [uiScale, setUiScale] = useState(() => {
    const v = parseFloat(localStorage.getItem(SCALE_KEY))
    return v >= SCALE_MIN && v <= SCALE_MAX ? v : 1
  })
  useEffect(() => { try { localStorage.setItem(SCALE_KEY, String(uiScale)) } catch { /* ignore */ } }, [uiScale])
  const bumpScale = d => setUiScale(s => Math.min(SCALE_MAX, Math.max(SCALE_MIN, Math.round((s + d) * 100) / 100)))
  // In-app dialogs instead of browser prompt/confirm/alert.
  const [confirmState, setConfirmState] = useState(null) // { message, confirmLabel, onYes }
  const [toast, setToast] = useState(null)
  useEffect(() => { if (!toast) return; const t = setTimeout(() => setToast(null), 3500); return () => clearTimeout(t) }, [toast])
  const askConfirm = (message, onYes, confirmLabel = 'Ja') => setConfirmState({ message, onYes, confirmLabel })
  // First-visit welcome (explains, simply, that the story lives in this browser).
  const [showInfo, setShowInfo] = useState(() => { try { return !localStorage.getItem('cyoa-ws-info-seen') } catch { return false } })
  const dismissInfo = () => { try { localStorage.setItem('cyoa-ws-info-seen', '1') } catch { /* ignore */ } setShowInfo(false) }

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
  // The start scene = lowest 3-digit id (matches BookReader playback).
  const startId = useMemo(() => {
    const ids = nodes.map(n => n.id)
    return ids.filter(id => /^\d{3}$/.test(id)).sort()[0] || ids[0] || null
  }, [nodes])
  // Display copy: scale the card with the text size (so nothing clips) and
  // flag the start scene for its badge. Not persisted — view-only.
  const displayNodes = useMemo(
    () => nodes.map(n => ({
      ...n,
      width: Math.round(WS_NODE_W * uiScale),
      height: Math.round(WS_NODE_H * uiScale),
      data: n.id === startId ? { ...n.data, _isStart: true } : n.data,
    })),
    [nodes, startId, uiScale]
  )
  // Remove a link by stripping the [#target] ref from the source scene.
  const deleteEdgeByIds = useCallback((source, target) => {
    setNodes(ns => {
      const updated = ns.map(n => {
        if (n.id !== source) return n
        const { body, choiceIds } = splitBodyAndChoices(n.data.text || '')
        return { ...n, data: { ...n.data, text: joinBodyAndChoices(body, choiceIds.filter(x => x !== target)) } }
      })
      setEdges(scanEdges(updated))
      return updated
    })
  }, [])
  // Custom edge type + per-edge delete handler (× button when selected).
  const displayEdges = useMemo(
    () => edges.map(e => ({ ...e, type: 'ws', data: { onDelete: () => deleteEdgeByIds(e.source, e.target) } })),
    [edges, deleteEdgeByIds]
  )
  const workshopProjects = useMemo(() => {
    const ids = loadJSON(WORKSHOP_IDS_KEY, [])
    return Object.entries(projects)
      .filter(([id]) => ids.includes(id))
      .map(([id, p]) => ({ id, name: p.data?.projectName || '', updated: p.updated || 0 }))
      .sort((a, b) => (b.updated || 0) - (a.updated || 0))
  }, [projects])

  const onNodesChange = useCallback(changes => setNodes(ns => applyNodeChanges(changes, ns)), [])
  // Only apply edge SELECTION changes (so the × shows). Edge add/remove is
  // driven by the [#ref]s, not by ReactFlow, so we ignore those change types.
  const onEdgesChange = useCallback(changes => {
    const sel = changes.filter(c => c.type === 'select')
    if (sel.length) setEdges(es => applyEdgeChanges(sel, es))
  }, [])

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

  const onAddChoice = (targetId, newTitle) => {
    if (!selectedId) return
    if (targetId) {
      commit(ns => ns.map(n => (n.id === selectedId ? { ...n, data: { ...n.data, text: addRef(n.data.text, targetId) } } : n)))
      return
    }
    // Create a new scene to the right and link it. Stagger it below existing
    // children so several choices from the same scene don't stack exactly.
    const newId = String(nextId).padStart(3, '0')
    const from = nodes.find(n => n.id === selectedId)
    const siblings = from ? splitBodyAndChoices(from.data?.text || '').choiceIds.length : 0
    const pos = from
      ? { x: from.position.x + 320, y: from.position.y + siblings * 150 }
      : { x: 120, y: 120 }
    commit(ns => {
      let updated = [...ns, newCard(newId, pos, undefined, newTitle?.trim() || 'Ny scen')]
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

  // Edge editing: drag an edge end off into empty space to delete it, or onto
  // another scene to relink it. Edges are derived from [#ref]s in the text, so
  // we edit the text and re-scan.
  const reconnectOk = useRef(true)
  const onReconnectStart = useCallback(() => { reconnectOk.current = false }, [])
  const onReconnect = useCallback((oldEdge, conn) => {
    reconnectOk.current = true
    if (!conn?.source || !conn?.target || conn.source === conn.target) return
    setNodes(ns => {
      const updated = ns.map(n => {
        let text = n.data.text || ''
        if (n.id === oldEdge.source) {
          const { body, choiceIds } = splitBodyAndChoices(text)
          text = joinBodyAndChoices(body, choiceIds.filter(x => x !== oldEdge.target))
        }
        if (n.id === conn.source) text = addRef(text, conn.target)
        return text === (n.data.text || '') ? n : { ...n, data: { ...n.data, text } }
      })
      setEdges(scanEdges(updated))
      return updated
    })
  }, [])
  const onReconnectEnd = useCallback((_evt, edge) => {
    if (!reconnectOk.current) {
      setNodes(ns => {
        const updated = ns.map(n => {
          if (n.id !== edge.source) return n
          const { body, choiceIds } = splitBodyAndChoices(n.data.text || '')
          return { ...n, data: { ...n.data, text: joinBodyAndChoices(body, choiceIds.filter(x => x !== edge.target)) } }
        })
        setEdges(scanEdges(updated))
        return updated
      })
    }
    reconnectOk.current = true
  }, [])

  const doDeleteScene = id => {
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
      width: WS_NODE_W, height: WS_NODE_H,
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
    commit(() => [newCard(sid, { x: 120, y: 140 }, DEFAULT_COLOR, 'Start')])
    setNextId(2); setSelectedId(sid)
  }
  const deleteStory = id => {
    setStoryMenu(false)
    askConfirm('Radera hela berättelsen? Det går inte att ångra.', () => doDeleteStory(id), 'Radera')
  }
  const doDeleteStory = id => {
    deleteFromFirestore(id)
    setProjects(p => { const n = { ...p }; delete n[id]; return n })
    saveJSON(WORKSHOP_IDS_KEY, loadJSON(WORKSHOP_IDS_KEY, []).filter(x => x !== id))
    const rest = workshopProjects.filter(p => p.id !== id)
    if (id === projectId) { rest.length ? switchStory(rest[0].id) : newStory() }
  }

  // --- Publish ---
  const publish = async () => {
    if (nodes.length === 0) return
    if (!user) { setToast('Logga in uppe till höger för att dela berättelsen.'); return }
    setBusy(true)
    try {
      const map = loadJSON(SHAREIDS_KEY, {})
      let sid = map[projectId]
      if (!sid) { sid = makeShareId(); map[projectId] = sid; saveJSON(SHAREIDS_KEY, map) }
      const ok = await publishStory(sid, {
        title: projectName || 'Berättelse', nodes: toPublishedNodes(nodes), sourceProjectId: projectId,
      })
      if (ok) { setShareInfo({ id: sid, url: shareUrl(sid) }); setToast('Berättelsen är delad. Länken är kopierad.'); navigator.clipboard?.writeText(shareUrl(sid)) }
      else setToast('Kunde inte publicera just nu. Försök igen.')
    } finally { setBusy(false) }
  }
  const stopSharing = () => {
    if (!shareInfo) return
    askConfirm('Sluta dela den publika länken? Den slutar då fungera.', doStopSharing, 'Sluta dela')
  }
  const doStopSharing = async () => {
    setBusy(true)
    try {
      await unpublishStory(shareInfo.id)
      const map = loadJSON(SHAREIDS_KEY, {}); delete map[projectId]; saveJSON(SHAREIDS_KEY, map)
      setShareInfo(null)
      setToast('Delningen är avslutad.')
    } finally { setBusy(false) }
  }
  const copyLink = () => { if (shareInfo) navigator.clipboard?.writeText(shareInfo.url) }

  return (
    <div className={`ws-app${selected ? ' panel-open' : ''}`} style={{ '--ws-scale': uiScale }}>
      <header className="ws-topbar">
        <div className="ws-brand">
          Ola Belins Berättarverkstad <span className="ws-version">v{APP_VERSION}</span>
          <button className="ws-help" onClick={() => setShowInfo(true)} title="Hur funkar det?" aria-label="Hur funkar det?">?</button>
        </div>
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
        <div className="ws-zoom" title="Textstorlek på skärmen">
          <button className="ws-tb-btn ghost ws-zoom-btn" onClick={() => bumpScale(-0.1)} disabled={uiScale <= SCALE_MIN} aria-label="Mindre text">A−</button>
          <button className="ws-tb-btn ghost ws-zoom-btn" onClick={() => bumpScale(0.1)} disabled={uiScale >= SCALE_MAX} aria-label="Större text">A+</button>
        </div>
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
                nodes={displayNodes} edges={displayEdges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} defaultEdgeOptions={defaultEdgeOptions}
                projectId={projectId}
                onNodesChange={onNodesChange} onEdgesChange={onEdgesChange} onConnect={onConnect}
                onReconnect={onReconnect} onReconnectStart={onReconnectStart} onReconnectEnd={onReconnectEnd}
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
          onDelete={() => selectedId && askConfirm('Ta bort scenen?', () => doDeleteScene(selectedId), 'Ta bort')}
          onClose={() => setSelectedId(null)}
        />
      </div>

      {playing && (
        <BookReader title={projectName} nodes={toPublishedNodes(nodes)} onClose={() => setPlaying(false)} />
      )}

      {confirmState && (
        <div className="ws-modal-backdrop" onClick={() => setConfirmState(null)}>
          <div className="ws-modal" onClick={e => e.stopPropagation()}>
            <p className="ws-modal-msg">{confirmState.message}</p>
            <div className="ws-modal-actions">
              <button className="ws-tb-btn ghost" onClick={() => setConfirmState(null)}>Avbryt</button>
              <button className="ws-tb-btn danger" onClick={() => { confirmState.onYes(); setConfirmState(null) }}>
                {confirmState.confirmLabel}
              </button>
            </div>
          </div>
        </div>
      )}

      {toast && <div className="ws-toast" role="status">{toast}</div>}

      {showInfo && (
        <div className="ws-modal-backdrop" onClick={dismissInfo}>
          <div className="ws-modal ws-welcome" onClick={e => e.stopPropagation()}>
            <h2 className="ws-welcome-title">Ola Belins Berättarverkstad ✨</h2>
            <p>Bygg din egen <b>välj-din-väg-berättelse</b>: varje ruta är en scen, och valen leder vidare till nästa.</p>
            <p className="ws-welcome-dim">Din berättelse sparas i den här webbläsaren. Logga in uppe till höger för att spara den för gott eller dela den.</p>
            <div className="ws-modal-actions">
              <button className="ws-tb-btn accent" onClick={dismissInfo}>Sätt igång!</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
