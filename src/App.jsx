import { useState, useCallback, useMemo, useRef, useEffect } from 'react'
import AppShell from './AppShell.jsx'
import GraphPane from './GraphPane.jsx'
import {
  applyNodeChanges,
  applyEdgeChanges,
  MarkerType,
} from 'reactflow'
import getLayoutedElements from './dagreLayout'
import 'reactflow/dist/style.css'
import './App.css'
import NodeCard from './NodeCard.jsx'
import ReadPane from './ReadPane.jsx'
import DocPane from './DocPane.jsx'
import { docToNodes, chooseNextSceneId } from './utils/docSync.ts'
import { pickNodeInDirection, nodeCenter } from './utils/graphNav.ts'
import AiSettingsModal from './AiSettingsModal.jsx'
// import AiSuggestionsPanel from './AiSuggestionsPanel.jsx'
// import { getSuggestions, proofreadText } from './useAi.js'
import { useAiSettings } from './useAi.js'
// import AiProofreadPanel from './AiProofreadPanel.jsx'
import NewProjectModal from './NewProjectModal.jsx'
import CommandPalette from './CommandPalette.jsx'
import SettingsModal from './SettingsModal.jsx'
import InsightsModal from './InsightsModal.jsx'
import HistoryModal from './HistoryModal.jsx'
import ExportModal from './ExportModal.jsx'
import ProjectMenu from './ProjectMenu.jsx'
import { buildReaderHTML, downloadFile } from './utils/buildReaderHTML.js'
import UserMenu from './UserMenu.jsx'
import { FolderOpen } from 'lucide-react'
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from './constants.js'
import useProjectStorage from './useProjectStorage.js'
import useFirestoreSync from './useFirestoreSync.js'
import { useAuth } from './AuthContext.jsx'
import { setDebug as setDebugFlag, debugLog, isDebug } from './utils/debug.js'

function estimateNodeHeight(text) {
  const charsPerLine = 32
  const lines = text
    .split(/\r?\n/)
    .reduce((sum, line) => sum + Math.ceil(line.length / charsPerLine), 0)
  return Math.min(300, Math.max(100, 50 + lines * 18))
}

function scanEdges(nodes) {
  const pattern = /\[#(\d{3})]|#(\d{3})/g
  const unique = new Set()
  const edges = []
  for (const n of nodes) {
    const text = n.data.text || ''
    pattern.lastIndex = 0
    let match
    while ((match = pattern.exec(text))) {
      const target = match[1] || match[2]
      if (nodes.find(nn => nn.id === target)) {
        const id = `${n.id}->${target}`
        if (!unique.has(id)) {
          unique.add(id)
          edges.push({ id, source: n.id, target })
        }
      }
    }
  }
  return edges
}

export default function App() {
  const nodeTypes = useMemo(() => ({ card: NodeCard }), [])
  const defaultEdgeOptions = useMemo(
    () => ({ markerEnd: { type: MarkerType.ArrowClosed }, reconnectable: true }),
    []
  )
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [nextId, setNextId] = useState(1)
  const nextIdRef = useRef(1)
  useEffect(() => { nextIdRef.current = nextId }, [nextId])
  // Freshest node list, also written synchronously by updaters that create
  // scenes, so a keystroke that races a pending state flush still decides
  // from what the flush produced.
  const nodesRef = useRef(nodes)
  useEffect(() => { nodesRef.current = nodes }, [nodes])
  const viewportRef = useRef(null)   // ReactFlow instance, set by GraphPane's ViewportBridge
  const [focusTitleId, setFocusTitleId] = useState(null)
  const [currentId, setCurrentId] = useState(null)
  const [spawnCounts, setSpawnCounts] = useState({})
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [projectName, setProjectName] = useState('')
  const [autoSave, setAutoSave] = useState(() => {
    try {
      const saved = localStorage.getItem('cyoa-auto-save')
      return saved ? JSON.parse(saved) : false
    } catch { return false }
  })
  const [aiSettings, setAiSettings] = useAiSettings()
  // const [suggestions, setSuggestions] = useState([])
  const [showAiSettings, setShowAiSettings] = useState(false)
  // const [showSuggestions, setShowSuggestions] = useState(false)
  // const [proofreadResult, setProofreadResult] = useState(null)
  // const [showProofread, setShowProofread] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  // const [loadingAi, setLoadingAi] = useState(false)
  const [fontSize, setFontSize] = useState(() => {
    const stored = localStorage.getItem('cyoa-font-size')
    return stored ? Number(stored) : 14
  })
  const [activeNodeId, setActiveNodeId] = useState(null)
  const [debugMode, setDebugMode] = useState(isDebug())
  const [cmdOpen, setCmdOpen] = useState(false)
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [insightsOpen, setInsightsOpen] = useState(false)
  const [historyOpen, setHistoryOpen] = useState(false)
  const [historyItems, setHistoryItems] = useState([])
  const [historyBusy, setHistoryBusy] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)
  const [isSaving, setIsSaving] = useState(false)
  const [lastSavedAt, setLastSavedAt] = useState(null)
  const importRef = useRef(null)
  const reconnectInfo = useRef({ handleType: null, didReconnect: false })
  const undoStack = useRef([])
  const redoStack = useRef([])
  const resizingRef = useRef(false)
  // Coalesce undo snapshots for continuous typing: only snapshot at the start
  // of an edit burst (new node, or after a pause), so one Ctrl+Z reverts a
  // whole typed passage rather than a single character.
  const textEditRef = useRef({ id: null, t: 0 })
  // True once the current project has held content this session — lets us save
  // a deliberately-emptied project to Firestore without clobbering a real
  // project with the transient empty state during initial load.
  const hadContentRef = useRef(false)
  useEffect(() => {
    debugLog('activeNodeId', activeNodeId)
  }, [activeNodeId])

  useEffect(() => {
    document.documentElement.style.setProperty('--font-size', `${fontSize}px`)
    localStorage.setItem('cyoa-font-size', String(fontSize))
  }, [fontSize])

  useEffect(() => {
    document.documentElement.removeAttribute('data-theme')
  }, [])

  // Scan edges once when nodes first arrive from storage. The storage hook
  // loads nodes via setNodes directly without computing edges, so a freshly
  // loaded project would otherwise show nodes with no connections until the
  // first edit. Mutation paths (addNode/onConnect/import/switch) set edges
  // themselves, so this only covers the initial mount load.
  const edgesInitialized = useRef(false)
  useEffect(() => {
    if (edgesInitialized.current) return
    if (nodes.length === 0) return
    edgesInitialized.current = true
    setEdges(scanEdges(nodes))
  }, [nodes])

  const { user } = useAuth()

  const {
    projects,
    setProjects,
    projectId,
    setProjectId,
    setProjectStart,
    error: storageError,
  } = useProjectStorage({
    nodes,
    nextId,
    projectName,
    autoSave,
    setNodes,
    setNextId,
    setProjectName,
  })

  const { saveToFirestore, saveHistorySnapshot, deleteFromFirestore, getHistory } = useFirestoreSync({
    user,
    projects,
    setProjects,
    projectId,
  })

  // Track whether the active project has had content (reset when switching).
  useEffect(() => { hadContentRef.current = false }, [projectId])
  useEffect(() => { if (nodes.length > 0) hadContentRef.current = true }, [nodes])

  // Always save to Firestore when logged in (no autoSave requirement).
  useEffect(() => {
    if (!user || !projectId) return
    // Skip the transient empty state during initial load, but DO persist a
    // project the user deliberately emptied (so deletions stick).
    if (nodes.length === 0 && !hadContentRef.current) return
    setIsSaving(true)
    const data = {
      projectName,
      nextNodeId: nextId,
      nodes: nodes.map(n => ({
        id: n.id,
        text: n.data.text || '',
        title: n.data.title || '',
        color: n.data.color || '#1f2937',
        position: n.position,
        type: n.type || 'card',
        width: n.width,
        height: n.height,
      })),
    }
    let cancelled = false
    const timer = setTimeout(async () => {
      try {
        await saveToFirestore(projectId, data)
        if (!cancelled) setLastSavedAt(Date.now())
      } finally {
        if (!cancelled) setIsSaving(false)
      }
    }, 2000)
    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [user, nodes, nextId, projectName, projectId, saveToFirestore])

  // Logged-out users are saved synchronously to localStorage by useProjectStorage.
  useEffect(() => {
    if (user) return
    if (nodes.length === 0 && !hadContentRef.current) return
    setLastSavedAt(Date.now())
  }, [user, nodes])

  useEffect(() => {
    if (storageError) alert(storageError)
  }, [storageError])

  const pushUndoState = useCallback(() => {
    undoStack.current.push({
      nodes: structuredClone(nodes),
      edges: structuredClone(edges),
      nextId,
      currentId,
      text,
      title,
    })
    redoStack.current = []
  }, [nodes, edges, nextId, currentId, text, title])

  // Coalesced undo checkpoint: snapshots once per edit burst (keyed by
  // field+node), so continuous typing / rapid tweaks become one undo step.
  const beginEdit = useCallback(
    key => {
      const now = Date.now()
      const last = textEditRef.current
      if (last.id !== key || now - last.t > 700) pushUndoState()
      textEditRef.current = { id: key, t: now }
    },
    [pushUndoState]
  )

  const applyState = state => {
    setNodes(state.nodes)
    setEdges(state.edges)
    setNextId(state.nextId)
    setCurrentId(state.currentId)
    setText(state.text)
    setTitle(state.title)
  }

  const undo = useCallback(() => {
    const state = undoStack.current.pop()
    if (state) {
      redoStack.current.push({
        nodes: nodes,
        edges: edges,
        nextId,
        currentId,
        text,
        title,
      })
      applyState(state)
    }
  }, [nodes, edges, nextId, currentId, text, title])

  const redo = useCallback(() => {
    const state = redoStack.current.pop()
    if (state) {
      undoStack.current.push({
        nodes: nodes,
        edges: edges,
        nextId,
        currentId,
        text,
        title,
      })
      applyState(state)
    }
  }, [nodes, edges, nextId, currentId, text, title])

  const onNodesChange = useCallback(
    changes => {
      // Only snapshot undo for structural removals; selection / drag / resize
      // shouldn't fill the undo stack with no-op entries.
      if (changes.some(c => c.type === 'remove')) pushUndoState()
      setNodes(ns => applyNodeChanges(changes, ns))
    },
    [pushUndoState]
  )
  const onEdgesChange = useCallback(
    changes => {
      if (changes.some(c => c.type === 'remove')) pushUndoState()
      setEdges(es => applyEdgeChanges(changes, es))
    },
    [pushUndoState]
  )

  /*
  const fetchAiSuggestions = async () => {
    setLoadingAi(true)
    const result = await getSuggestions(nodes, currentId, aiSettings)
    setLoadingAi(false)
    setSuggestions(result)
    setShowSuggestions(true)
  }

  const fetchProofread = async () => {
    setLoadingAi(true)
    const result = await proofreadText(nodes, currentId, aiSettings)
    setLoadingAi(false)
    if (result) {
      setProofreadResult({ original: text, improved: result })
      setShowProofread(true)
    }
  }

  const applyProofread = improved => {
    updateNodeText(currentId, improved)
    setShowProofread(false)
  }

  const applySuggestion = suggestion => {
    const area = textRef.current
    if (!area) return
    const start = area.selectionStart
    const end = area.selectionEnd
    const updatedText =
      text.slice(0, start) + suggestion + text.slice(end)
    updateNodeText(currentId, updatedText)
    requestAnimationFrame(() => {
      area.focus()
      area.selectionStart = area.selectionEnd = start + suggestion.length
    })
    setShowSuggestions(false)
  }
  */

  const onConnect = useCallback(({ source, target }) => {
    if (!source || !target) return
    pushUndoState()
    setNodes(ns => {
      const updated = ns.map(n => {
        if (n.id !== source) return n
        const text = n.data.text || ''
        const sep = text.trim() ? ' ' : ''
        return { ...n, data: { ...n.data, text: `${text}${sep}[#${target}]` } }
      })
      setEdges(scanEdges(updated))
      return updated
    })
    if (currentId === source) {
      setText(t => {
        const sep = t.trim() ? ' ' : ''
        return `${t}${sep}[#${target}]`
      })
    }
  }, [currentId, pushUndoState])

  const onReconnectStart = useCallback((_e, _edge, handleType) => {
    reconnectInfo.current = { handleType, didReconnect: false }
  }, [])

  const onReconnect = useCallback(
    (oldEdge, connection) => {
      pushUndoState()
      reconnectInfo.current.didReconnect = true
      const newSource = connection.source || oldEdge.source
      const newTarget = connection.target || oldEdge.target
      setNodes(ns => {
        let updated = ns
        if (oldEdge.source !== newSource) {
          updated = updated.map(n =>
            n.id === oldEdge.source
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    text: (n.data.text || '').replace(
                      new RegExp(`\\s*\\[#${oldEdge.target}\\]`, 'g'),
                      ''
                    ),
                  },
                }
              : n
          )
          updated = updated.map(n =>
            n.id === newSource
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    text: (() => {
                      const t = n.data.text || ''
                      const sep = t.trim() ? ' ' : ''
                      return `${t}${sep}[#${newTarget}]`
                    })(),
                  },
                }
              : n
          )
        } else if (oldEdge.target !== newTarget) {
          updated = updated.map(n =>
            n.id === oldEdge.source
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    text: (n.data.text || '').replace(
                      new RegExp(`\\[#${oldEdge.target}\\]`, 'g'),
                      `[#${newTarget}]`
                    ),
                  },
                }
              : n
          )
        }
        setEdges(scanEdges(updated))
        return updated
      })
      if (currentId === oldEdge.source) {
        setText(t =>
          oldEdge.source !== newSource
            ? t.replace(new RegExp(`\\s*\\[#${oldEdge.target}\\]`, 'g'), '')
            : t.replace(
                new RegExp(`\\[#${oldEdge.target}\\]`, 'g'),
                `[#${newTarget}]`
              )
        )
      }
      if (oldEdge.source !== newSource && currentId === newSource) {
        setText(t => {
          const sep = t.trim() ? ' ' : ''
          return `${t}${sep}[#${newTarget}]`
        })
      }
    },
    [currentId, pushUndoState]
  )

  const onReconnectEnd = useCallback(
    (_e, edge) => {
      pushUndoState()
      if (!reconnectInfo.current.didReconnect) {
        setNodes(ns => {
          const updated = ns.map(n =>
            n.id === edge.source
              ? {
                  ...n,
                  data: {
                    ...n.data,
                    text: (n.data.text || '').replace(
                      new RegExp(`\\s*\\[#${edge.target}\\]`, 'g'),
                      ''
                    ),
                  },
                }
              : n
          )
          setEdges(scanEdges(updated))
          return updated
        })
        if (currentId === edge.source) {
          setText(t =>
            t.replace(new RegExp(`\\s*\\[#${edge.target}\\]`, 'g'), '')
          )
        }
      }
      reconnectInfo.current = { handleType: null, didReconnect: false }
    },
    [currentId, pushUndoState]
  )

  // Centre of the visible graph, in flow coordinates, offset so a default-size
  // node lands centred. Falls back to origin if the graph isn't mounted.
  const viewportCenterPosition = useCallback(() => {
    const el = document.getElementById('graph')
    const rf = viewportRef.current
    if (!el || !rf) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    const p = rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    return { x: p.x - DEFAULT_NODE_WIDTH / 2, y: p.y - DEFAULT_NODE_HEIGHT / 2 }
  }, [])

  // Doc -> nodes. Functional update so a graph change that raced the debounce
  // is merged, not overwritten; baselineIds limits removals to scenes the doc
  // actually showed.
  const handleDocChange = useCallback((md, baselineIds) => {
    beginEdit('doc')
    const fallbackPosition = viewportCenterPosition()
    const startNextId = nextIdRef.current
    setNodes(ns => {
      const r = docToNodes(md, ns, { nextId: startNextId, baselineIds, fallbackPosition })
      if (!r.changed) return ns
      setEdges(scanEdges(r.nodes))
      if (r.nextId !== startNextId) { nextIdRef.current = r.nextId; setNextId(r.nextId) }
      nodesRef.current = r.nodes
      return r.nodes
    })
  }, [beginEdit, viewportCenterPosition])

  const addNode = () => {
    pushUndoState()
    const id = String(nextId).padStart(3, '0')
    setNodes(ns => {
      let position = { x: 0, y: 0 }
      let updatedNodes = ns
      if (currentId) {
        const cur = ns.find(n => n.id === currentId)
        if (cur) {
          const count = spawnCounts[currentId] || 0
          const baseY = cur.position.y
          const offset =
            count === 0 ? 0 : Math.ceil(count / 2) * 150 * (count % 2 === 0 ? 1 : -1)
          position = { x: cur.position.x + 300, y: baseY + offset }
          const text = cur.data.text || ''
          const sep = text.trim() ? ' ' : ''
          const link = `[#${id}]`
          updatedNodes = ns.map(n =>
            n.id === currentId ? { ...n, data: { ...n.data, text: `${text}${sep}${link}` } } : n
          )
        }
      } else {
        position = viewportCenterPosition()
      }
      const updated = [
        ...updatedNodes,
        {
          id,
          position,
          type: 'card',
          data: { text: '', title: '', color: '#1f2937' },
          width: DEFAULT_NODE_WIDTH,
          height: DEFAULT_NODE_HEIGHT,
        },
      ]
      setEdges(scanEdges(updated))
      return updated
    })
    setNextId(n => n + 1)
    if (currentId) {
      setSpawnCounts(c => ({ ...c, [currentId]: (c[currentId] || 0) + 1 }))
      setText(t => {
        const sep = t.trim() ? ' ' : ''
        return `${t}${sep}[#${id}]`
      })
    }
  }

  const deleteNode = () => {
    if (!currentId) return
    if (!confirm(`Ta bort scen #${currentId}?`)) return
    pushUndoState()
    const delId = currentId
    setNodes(ns => {
      const updated = ns
        .filter(n => n.id !== delId)
        .map(n =>
          n.data?.text && n.data.text.includes(`[#${delId}]`)
            ? { ...n, data: { ...n.data, text: n.data.text.replace(new RegExp(`\\s*\\[#${delId}\\]`, 'g'), '') } }
            : n
        )
      setEdges(scanEdges(updated))
      return updated
    })
    setCurrentId(null)
    setText('')
    setTitle('')
  }

  const duplicateNode = () => {
    if (!currentId) return
    pushUndoState()
    const src = nodes.find(n => n.id === currentId)
    if (!src) return
    const id = String(nextId).padStart(3, '0')
    setNodes(ns => [
      ...ns,
      {
        id,
        type: 'card',
        position: { x: src.position.x + 50, y: src.position.y + 50 },
        data: { text: src.data.text, title: `${src.data.title || ''} (kopia)`, color: src.data.color || '#1f2937' },
        width: src.width || DEFAULT_NODE_WIDTH,
        height: src.height || DEFAULT_NODE_HEIGHT,
      },
    ])
    setNextId(n => n + 1)
  }

  const selectNode = useCallback((id, data) => {
    debugLog('selectNode', id)
    setCurrentId(id)
    setText(data.text || '')
    setTitle(data.title || '')
    setActiveNodeId(id)
  }, [])

  const onNodeClick = (_e, node) => {
    debugLog('onNodeClick', node.id)
    selectNode(node.id, node.data)
  }

  const handleLinearSelect = useCallback(
    id => {
      debugLog('handleLinearSelect', id)
      const node = nodes.find(n => n.id === id)
      if (node) {
        selectNode(node.id, node.data)
      }
    },
    [nodes, selectNode]
  )

  // Select a scene in graph + doc, mark it selected in ReactFlow and pan to it
  // if it is off-screen.
  const focusScene = useCallback((id, { focusTitle = false } = {}) => {
    setNodes(ns => ns.map(n => ({ ...n, selected: n.id === id })))
    const node = nodes.find(n => n.id === id)
    if (node) selectNode(id, node.data)
    if (focusTitle) setFocusTitleId(id)
    const rf = viewportRef.current
    const el = document.getElementById('graph')
    if (rf && el && node) {
      const c = nodeCenter(node)
      const s = rf.flowToScreenPosition(c)
      const r = el.getBoundingClientRect()
      const inside = s.x > r.left + 40 && s.x < r.right - 40 && s.y > r.top + 40 && s.y < r.bottom - 40
      if (!inside) {
        const z = rf.getZoom()
        rf.setCenter(c.x, c.y, { zoom: z, duration: 200 })
      }
    }
  }, [nodes, selectNode])

  // cmd+Enter: next scene linked from `fromId` (or a free one), selected, with
  // the title ready for typing. Returns the scene id.
  // focusTitle: move focus to the new card's title input (graph). The document
  // passes false so the cursor stays in the new heading instead.
  const createLinkedScene = useCallback((fromId, { focusTitle = true } = {}) => {
    // Decide from the freshest node list: a doc edit flushed moments earlier
    // (⌘Enter right after typing a link) may already have created the scene,
    // and the render closure would not know about it yet.
    const fresh = nodesRef.current
    const maxNum = fresh.reduce((m, n) => {
      const v = Number(n.id)
      return Number.isFinite(v) && v >= m ? v + 1 : m
    }, nextIdRef.current)
    const pick = chooseNextSceneId(fresh, fromId, maxNum)
    pushUndoState()
    const from = fromId ? fresh.find(n => n.id === fromId) : null
    setNodes(ns => {
      let updated = ns
      const fromNow = fromId ? ns.find(n => n.id === fromId) : null
      if (fromNow && !pick.referenced && !(fromNow.data.text || '').includes(`[#${pick.id}]`)) {
        updated = updated.map(n => {
          if (n.id !== fromId) return n
          const t = n.data.text || ''
          const sep = t.trim() ? ' ' : ''
          return { ...n, data: { ...n.data, text: `${t}${sep}[#${pick.id}]` } }
        })
      }
      if (!pick.exists && !updated.some(n => n.id === pick.id)) {
        const base = fromNow || from
        const count = base ? (spawnCounts[fromId] || 0) : 0
        const offset = count === 0 ? 0 : Math.ceil(count / 2) * 150 * (count % 2 === 0 ? 1 : -1)
        const position = base
          ? { x: base.position.x + 300, y: base.position.y + offset }
          : viewportCenterPosition()
        updated = [...updated, {
          id: pick.id,
          type: 'card',
          position,
          data: { text: '', title: '', color: '#1f2937' },
          width: DEFAULT_NODE_WIDTH,
          height: DEFAULT_NODE_HEIGHT,
        }]
      }
      updated = updated.map(n => ({ ...n, selected: n.id === pick.id }))
      setEdges(scanEdges(updated))
      nodesRef.current = updated
      return updated
    })
    if (!pick.exists) {
      const num = Number(pick.id)
      if (num >= nextIdRef.current) { nextIdRef.current = num + 1; setNextId(num + 1) }
      if (from) setSpawnCounts(c => ({ ...c, [fromId]: (c[fromId] || 0) + 1 }))
    }
    setCurrentId(pick.id)
    setActiveNodeId(pick.id)
    setText('')
    setTitle('')
    if (focusTitle) setFocusTitleId(pick.id)
    return pick.id
  }, [spawnCounts, pushUndoState, viewportCenterPosition])

  const onPaneClick = e => {
    const t = e.target
    if (resizingRef.current) return
    if (t.closest('.react-flow__node')) return
    if (t.closest('.react-flow__handle')) return
    if (t.closest('.react-flow__resize-control')) return
    setCurrentId(null)
    setText('')
    setTitle('')
  }

  const updateNodeText = useCallback(
    (id, value) => {
      beginEdit(`text-${id}`)
      let created = []
      setNodes(ns => {
        let updated = ns.map(n =>
          n.id === id
            ? { ...n, data: { ...n.data, text: value }, height: estimateNodeHeight(value) }
            : n
        )
        const existing = new Set(updated.map(n => n.id))
        const src = updated.find(n => n.id === id)
        const baseX = src?.position.x ?? 0
        const baseY = src?.position.y ?? 0
        const pattern = /\[#(\d{3})]/g
        let m
        let idx = 0
        while ((m = pattern.exec(value))) {
          const refId = m[1]
          if (!existing.has(refId)) {
            existing.add(refId)
            created.push(refId)
            updated = [
              ...updated,
              {
                id: refId,
                type: 'card',
                position: { x: baseX + 300, y: baseY + idx * 100 },
                data: { text: '', title: '', color: '#1f2937' },
                width: DEFAULT_NODE_WIDTH,
                height: DEFAULT_NODE_HEIGHT,
              },
            ]
            idx += 1
          }
        }
        setEdges(scanEdges(updated))
        return updated
      })
      if (created.length > 0) {
        setNextId(n => {
          let max = n
          for (const cid of created) {
            const num = Number(cid)
            if (!Number.isNaN(num) && num >= max) max = num + 1
          }
          return max
        })
      }
      if (currentId === id) {
        setText(value)
      }
    },
    [currentId, beginEdit]
  )

  const handleProjectSwitch = id => {
    const p = projects[id]
    if (!p) return
    const loaded = (p.data.nodes || [])
      .filter(n => n.type !== 'group')
      .map(n => ({
        id: n.id,
        type: 'card',
        position: n.position || { x: 0, y: 0 },
        data: {
          text: n.text || '',
          title: n.title || '',
          color: n.color || '#1f2937',
        },
        width: n.width ?? DEFAULT_NODE_WIDTH,
        height: n.height ?? estimateNodeHeight(n.text || ''),
      }))
    setNodes(loaded)
    setEdges(scanEdges(loaded))
    setNextId(p.data.nextNodeId || 1)
    setProjectName(p.data.projectName || '')
    setCurrentId(null)
    setText('')
    setTitle('')
    setProjectId(id)
    setProjectStart(p.start || Date.now())
  }

  const duplicateProject = id => {
    const src = projects[id]
    if (!src) return
    const newId = String(Date.now())
    const data = {
      projectName: `${src.data?.projectName?.trim() || 'Namnlös'} (kopia)`,
      nextNodeId: src.data?.nextNodeId || 1,
      nodes: (src.data?.nodes || []).map(n => ({ ...n })),
    }
    setProjects(p => ({
      ...p,
      [newId]: { id: newId, start: Date.now(), updated: Date.now(), data },
    }))
    const loaded = (data.nodes || [])
      .filter(n => n.type !== 'group')
      .map(n => ({
        id: n.id,
        type: 'card',
        position: n.position || { x: 0, y: 0 },
        data: { text: n.text || '', title: n.title || '', color: n.color || '#1f2937' },
        width: n.width ?? DEFAULT_NODE_WIDTH,
        height: n.height ?? estimateNodeHeight(n.text || ''),
      }))
    setNodes(loaded)
    setEdges(scanEdges(loaded))
    setNextId(data.nextNodeId || 1)
    setProjectName(data.projectName)
    setCurrentId(null)
    setText('')
    setTitle('')
    setProjectId(newId)
    setProjectStart(Date.now())
  }

  const deleteProject = id => {
    const remaining = Object.keys(projects).filter(k => k !== id)
    deleteFromFirestore(id)
    setProjects(p => {
      const next = { ...p }
      delete next[id]
      return next
    })
    if (id === projectId) {
      if (remaining.length) handleProjectSwitch(remaining[0])
      else startNewProject()
    }
  }

  const renameProject = () => {
    const name = prompt('Nytt namn på berättelsen:', projectName)
    if (name != null) setProjectName(name.trim())
  }

  const exportProject = () => {
    const data = {
      projectName,
      nextNodeId: nextId,
      nodes: nodes.map(n => ({
        id: n.id,
        text: n.data.text || '',
        title: n.data.title || '',
        color: n.data.color || '#1f2937',
        position: n.position,
        type: n.type || 'card',
        width: n.width,
        height: n.height,
      })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const pad = n => String(n).padStart(2, '0')
    const now = new Date()
    const name = projectName.trim()
      ? projectName.trim().toLowerCase().replace(/\s+/g, '-')
      : 'projekt'
    const date = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(
      now.getDate()
    )}`
    const time = `${pad(now.getHours())}${pad(now.getMinutes())}${pad(now.getSeconds())}`
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${name}-${date}_${time}.json`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  }

  const exportMarkdown = () => {
    const md = nodes
      .slice()
      .sort((a, b) => Number(a.id) - Number(b.id))
      .map(n => {
        const heading = `## #${n.id}${n.data.title ? ` ${n.data.title}` : ''}`
        const body = (n.data.text || '').replace(/\[#(\d{3})]|#(\d{3})/g, (_m, p1, p2) => {
          const id = p1 || p2
          return `[Continue → #${id}](#${id})`
        })
        return `${heading}\n${body}`
      })
      .join('\n\n')
    const blob = new Blob([md], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    const pad = n => String(n).padStart(2, '0')
    const now = new Date()
    const name = projectName.trim()
      ? projectName.trim().toLowerCase().replace(/\s+/g, '-')
      : 'story'
    const date = `${String(now.getFullYear()).slice(2)}${pad(now.getMonth() + 1)}${pad(now.getDate())}`
    a.download = `${name}-${date}.md`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  }

  const exportReaderHTML = () => {
    const safe = (projectName.trim() || 'berattelse').toLowerCase().replace(/[^\w-]+/g, '_')
    downloadFile(
      `${safe}-att-lasa.html`,
      buildReaderHTML(nodes, projectName.trim() || 'Berättelse'),
      'text/html'
    )
  }

  const importProject = async e => {
    const file = e.target.files[0]
    if (!file) return
    pushUndoState()
    try {
      const json = await file.text()
      const data = JSON.parse(json)
      const loaded = (data.nodes || [])
        .filter(n => n.type !== 'group')
        .map(n => ({
          id: n.id,
          type: 'card',
          position: n.position || { x: 0, y: 0 },
          data: { text: n.text || '', title: n.title || '', color: n.color || '#1f2937' },
          width: n.width ?? DEFAULT_NODE_WIDTH,
          height: n.height ?? estimateNodeHeight(n.text || ''),
        }))
      setNodes(loaded)
      setEdges(scanEdges(loaded))
      setNextId(data.nextNodeId || 1)
      setProjectName(data.projectName || '')
      setCurrentId(null)
      setText('')
      setTitle('')
    } catch {
      alert('Failed to load project')
    } finally {
      e.target.value = ''
    }
  }

  const addIdea = () => {
    pushUndoState()
    const id = `idea-${Date.now()}`
    const position = { x: Math.random() * 400, y: Math.random() * 400 }
    setNodes(ns => [
      ...ns,
      {
        id,
        type: 'card',
        position,
        data: { text: '', title: '💡 Idé', color: '#1e293b', isIdea: true },
        width: DEFAULT_NODE_WIDTH,
        height: 80,
      },
    ])
  }

  // Snapshot of the current project in the Firestore/export node shape.
  const buildProjectData = () => ({
    projectName,
    nextNodeId: nextId,
    nodes: nodes.map(n => ({
      id: n.id,
      text: n.data.text || '',
      title: n.data.title || '',
      color: n.data.color || '#1f2937',
      position: n.position,
      type: n.type || 'card',
      width: n.width,
      height: n.height,
    })),
  })

  const refreshHistory = async () => {
    if (!user) { setHistoryItems([]); return }
    setHistoryBusy(true)
    try {
      setHistoryItems(await getHistory(projectId))
    } finally {
      setHistoryBusy(false)
    }
  }

  const showHistory = () => {
    setHistoryOpen(true)
    refreshHistory()
  }

  const saveVersion = async () => {
    if (!user) { alert('Logga in för att spara versioner.'); return }
    if (nodes.length === 0) return
    setHistoryBusy(true)
    try {
      await saveHistorySnapshot(projectId, buildProjectData(), 'Manuell sparning')
      await refreshHistory()
    } finally {
      setHistoryBusy(false)
    }
  }

  const restoreVersion = async version => {
    if (!version) return
    if (!confirm(`Återställ till "${version.label || 'Auto-sparad'}" (${version.savedAt})? Nuvarande version sparas först.`)) return
    setHistoryBusy(true)
    try {
      await saveHistorySnapshot(projectId, buildProjectData(), 'Före återställning')
      const loaded = (version.nodes || [])
        .filter(n => n.type !== 'group')
        .map(n => ({
          id: n.id,
          type: 'card',
          position: n.position || { x: 0, y: 0 },
          data: { text: n.text || '', title: n.title || '', color: n.color || '#1f2937' },
          width: n.width || DEFAULT_NODE_WIDTH,
          height: n.height || DEFAULT_NODE_HEIGHT,
        }))
      pushUndoState()
      setNodes(loaded)
      setEdges(scanEdges(loaded))
      setNextId(version.nextNodeId || 1)
      setProjectName(version.projectName || '')
      setCurrentId(null)
      setText('')
      setTitle('')
    } finally {
      setHistoryBusy(false)
      setHistoryOpen(false)
    }
  }

  const openHelp = () => {
    window.open('help.html', '_blank')
  }

  const handleAutoLayout = useCallback(() => {
    pushUndoState()
    const { nodes: layouted, edges: layoutedEdges } = getLayoutedElements(
      nodes,
      edges,
      'LR'
    )
    setNodes(layouted)
    setEdges(layoutedEdges)
  }, [nodes, edges, pushUndoState])

  const startNewProject = () => {
    const id = String(Date.now())
    setNodes([])
    setEdges([])
    setNextId(1)
    setCurrentId(null)
    setText('')
    setTitle('')
    setProjectId(id)
    setProjectName('')
    setProjectStart(Date.now())
    setShowNewProject(false)
  }

  const confirmNewProject = () => {
    setShowNewProject(true)
  }

  useEffect(() => {
      const handler = e => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'z' && !e.shiftKey) {
          e.preventDefault()
          undo()
        } else if (
          (e.metaKey || e.ctrlKey) &&
          (e.key === 'Z' || (e.key === 'z' && e.shiftKey))
        ) {
          e.preventDefault()
          redo()
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          if (e.target.closest?.('.ProseMirror')) return   // DocPane owns it there
          e.preventDefault()
          createLinkedScene(currentId)
        } else if (
          (e.metaKey || e.ctrlKey) &&
          ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
        ) {
          if (e.target.closest?.('.ProseMirror')) return
          if (e.target.closest?.('input, textarea') && !e.target.closest?.('.node-card')) return
          if (!currentId) return
          const dir = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key]
          const id = pickNodeInDirection(nodes, currentId, dir)
          if (!id) return
          e.preventDefault()
          focusScene(id)
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
          e.preventDefault()
          addNode()
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
          e.preventDefault()
          duplicateNode()
        } else if ((e.metaKey || e.ctrlKey) && e.key === 's') {
          e.preventDefault()
          saveVersion()
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
          e.preventDefault()
          // legacy search removed in Task 2; ⌘F currently a no-op until palette wires it in Task 6
        } else if (
          (e.key === 'Delete' || e.key === 'Backspace') &&
          !e.target.closest('input, textarea, [contenteditable]')
        ) {
          // ReactFlow's built-in delete is disabled (deleteKeyCode={null}) so
          // both keys route through deleteNode(), which cleans up refs/edges.
          if (!currentId) return
          e.preventDefault()
          deleteNode()
        }
      }
      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }, [undo, redo, addNode, duplicateNode, deleteNode, saveVersion, createLinkedScene, focusScene, currentId, nodes])

  useEffect(() => {
    const handler = (e) => {
      const { ideaId } = e.detail
      const idea = nodes.find(n => n.id === ideaId)
      if (!idea) return
      pushUndoState()
      const id = String(nextId).padStart(3, '0')
      setNodes(ns => {
        const updated = ns.map(n => {
          if (n.id !== ideaId) return n
          return {
            ...n,
            id,
            data: { ...n.data, isIdea: false, title: (n.data.title || '').replace('💡 ', '').trim() },
          }
        })
        setEdges(scanEdges(updated))
        return updated
      })
      setNextId(prev => prev + 1)
    }
    window.addEventListener('promote-idea', handler)
    return () => window.removeEventListener('promote-idea', handler)
  }, [nodes, nextId, pushUndoState])

  // Jump to a scene from Insikter: select it and reveal it in graph + text.
  const jumpToScene = useCallback((id) => {
    const node = nodes.find(n => n.id === id)
    if (node) selectNode(id, node.data)
    window.dispatchEvent(new CustomEvent('vv-set-mode', { detail: 'split' }))
  }, [nodes, selectNode])

  const projectSwitchItems = useMemo(() => (
    Object.values(projects)
      .sort((a, b) => (b.updated || 0) - (a.updated || 0))
      .map(p => ({
        id: `switch-${p.id}`,
        label: `Byt till: ${p.data?.projectName?.trim() || new Date(p.start).toLocaleString()}`,
        icon: <FolderOpen />,
        run: () => handleProjectSwitch(p.id),
      }))
  ), [projects, handleProjectSwitch])

  const projectList = useMemo(() => {
    const list = Object.entries(projects).map(([id, p]) => ({
      id,
      name: p.data?.projectName || '',
      nodeCount: (p.data?.nodes || []).length,
      updated: p.updated || p.start || 0,
    }))
    // The active project may not be persisted yet (logged out, auto-save off);
    // always surface it so the switcher reflects what's open.
    if (projectId && !list.some(p => p.id === projectId)) {
      list.push({ id: projectId, name: projectName, nodeCount: nodes.length, updated: Date.now() })
    }
    return list.sort((a, b) => (b.updated || 0) - (a.updated || 0))
  }, [projects, projectId, projectName, nodes])

  return (
    <>
      <AppShell
        projectName={projectName}
        setProjectName={setProjectName}
        isSaving={isSaving}
        lastSavedAt={lastSavedAt}
        renderSkiss={() => (
          <GraphPane
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
            defaultEdgeOptions={defaultEdgeOptions}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onNodeClick={onNodeClick}
            onReconnect={onReconnect}
            onReconnectStart={onReconnectStart}
            onReconnectEnd={onReconnectEnd}
            onPaneClick={onPaneClick}
            onNodeDragStop={() => pushUndoState()}
            updateNodeText={updateNodeText}
            beginEdit={beginEdit}
            resizingRef={resizingRef}
            selectNode={selectNode}
            activeNodeId={activeNodeId}
            onAddNode={addNode}
            onAutoLayout={handleAutoLayout}
            onAddIdea={addIdea}
            viewportRef={viewportRef}
            focusTitleId={focusTitleId}
            onTitleFocused={() => setFocusTitleId(null)}
          />
        )}
        renderSplit={({ ratio, setRatio }) => (
          <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
            <div style={{ flex: ratio, minWidth: 0, display: 'flex' }}>
              <GraphPane
                nodes={nodes}
                edges={edges}
                nodeTypes={nodeTypes}
                defaultEdgeOptions={defaultEdgeOptions}
                onNodesChange={onNodesChange}
                onEdgesChange={onEdgesChange}
                onConnect={onConnect}
                onNodeClick={onNodeClick}
                onReconnect={onReconnect}
                onReconnectStart={onReconnectStart}
                onReconnectEnd={onReconnectEnd}
                onPaneClick={onPaneClick}
                onNodeDragStop={() => pushUndoState()}
                updateNodeText={updateNodeText}
                beginEdit={beginEdit}
                resizingRef={resizingRef}
                selectNode={selectNode}
                activeNodeId={activeNodeId}
                onAddNode={addNode}
                onAutoLayout={handleAutoLayout}
                onAddIdea={addIdea}
                viewportRef={viewportRef}
                focusTitleId={focusTitleId}
                onTitleFocused={() => setFocusTitleId(null)}
              />
            </div>
            <div
              className="split-divider"
              onMouseDown={() => {
                const onMove = (e) => {
                  const root = document.querySelector('.workspace')
                  if (!root) return
                  const rect = root.getBoundingClientRect()
                  const r = (e.clientX - rect.left) / rect.width
                  setRatio(Math.max(0.2, Math.min(0.8, r)))
                }
                const onUp = () => {
                  window.removeEventListener('mousemove', onMove)
                  window.removeEventListener('mouseup', onUp)
                }
                window.addEventListener('mousemove', onMove)
                window.addEventListener('mouseup', onUp)
              }}
            />
            <div style={{ flex: 1 - ratio, minWidth: 0, display: 'flex' }}>
              <DocPane
                nodes={nodes}
                onDocChange={handleDocChange}
                onNewScene={(id) => createLinkedScene(id, { focusTitle: false })}
                activeNodeId={activeNodeId}
                onSelectNode={handleLinearSelect}
                full={false}
              />
            </div>
          </div>
        )}
        renderText={({ focusMode, setFocusMode }) => (
          <DocPane
            nodes={nodes}
            onDocChange={handleDocChange}
            onNewScene={(id) => createLinkedScene(id, { focusTitle: false })}
            activeNodeId={activeNodeId}
            onSelectNode={handleLinearSelect}
            full={true}
            focusMode={focusMode}
            setFocusMode={setFocusMode}
            isSaving={isSaving}
          />
        )}
        renderRead={() => (
          <ReadPane
            nodes={nodes.filter(n => !n.data?.isIdea && !String(n.id).startsWith('idea-'))}
            onShare={() => setExportOpen(true)}
            startId={currentId || undefined}
            activeNodeId={activeNodeId}
            onSelectNode={(id) => {
              const node = nodes.find(n => n.id === id)
              if (node) selectNode(id, node.data)
            }}
          />
        )}
        onShowInsights={() => setInsightsOpen(true)}
        onShowHistory={showHistory}
        onOpenPalette={() => setCmdOpen(true)}
        onShowSettings={() => setSettingsOpen(true)}
        onShare={() => setExportOpen(true)}
        userMenuSlot={<UserMenu />}
        projectMenuSlot={
          <ProjectMenu
            projects={projectList}
            currentId={projectId}
            currentName={projectName}
            ops={{ switchProject: handleProjectSwitch, duplicateProject, deleteProject }}
            onNew={confirmNewProject}
            onRename={renameProject}
            onImport={() => importRef.current?.click()}
            onExport={() => setExportOpen(true)}
            onHistory={showHistory}
          />
        }
      />

      {/* Modals/overlays kept at root for now */}
      {showAiSettings && (
        <AiSettingsModal
          settings={aiSettings}
          onChange={setAiSettings}
          onClose={() => setShowAiSettings(false)}
        />
      )}
      {showNewProject && (
        <NewProjectModal
          onConfirm={startNewProject}
          onClose={() => setShowNewProject(false)}
        />
      )}

      <CommandPalette
        open={cmdOpen}
        onClose={() => setCmdOpen(false)}
        actions={{
          setMode: (m) => { window.dispatchEvent(new CustomEvent('vv-set-mode', { detail: m })) },
          addNode,
          newLinkedScene: () => createLinkedScene(currentId),
          newProject: confirmNewProject,
          autoLayout: handleAutoLayout,
          addIdea,
          undo, redo,
          importProject: () => importRef.current?.click(),
          exportProject,
          exportMarkdown,
          showExport: () => setExportOpen(true),
          showInsights: () => setInsightsOpen(true),
          showHistory,
          showSettings: () => setSettingsOpen(true),
          openHelp,
        }}
        extraSection={{ title: 'Projekt', items: projectSwitchItems }}
      />

      <InsightsModal
        open={insightsOpen}
        onClose={() => setInsightsOpen(false)}
        nodes={nodes}
        onJump={jumpToScene}
      />

      <HistoryModal
        open={historyOpen}
        onClose={() => setHistoryOpen(false)}
        items={historyItems}
        isLoggedIn={!!user}
        busy={historyBusy}
        onSaveVersion={saveVersion}
        onRestore={restoreVersion}
      />

      <ExportModal
        open={exportOpen}
        onClose={() => setExportOpen(false)}
        onExportJSON={exportProject}
        onExportMarkdown={exportMarkdown}
        onExportHTML={exportReaderHTML}
      />

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        fontSize={fontSize}
        setFontSize={setFontSize}
        autoSave={autoSave}
        setAutoSave={setAutoSave}
        debugMode={debugMode}
        setDebugMode={(v) => { setDebugMode(v); setDebugFlag(v) }}
        onOpenAiSettings={() => { setSettingsOpen(false); setShowAiSettings(true) }}
      />

      {/* Hidden file input for import flow */}
      <input
        ref={importRef}
        type="file"
        onChange={importProject}
        style={{ display: 'none' }}
      />

      <div
        style={{
          position: 'fixed',
          bottom: 4,
          right: 16,
          fontSize: '12px',
          opacity: 0.6,
          zIndex: 5,
        }}
      >
        v{__APP_VERSION__} ({__GIT_HASH__})
      </div>
    </>
  )
}
