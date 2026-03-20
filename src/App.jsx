import { useState, useCallback, useMemo, useRef, useEffect, Fragment } from 'react'
import {
  Plus,
  Trash2,
  RotateCcw,
  RotateCw,
  Download,
  Upload,
  FilePlus,
  FileText,
  ChevronDown,
  Sun,
  Moon
} from 'lucide-react'
import { Popover, Transition } from '@headlessui/react'
import ReactFlow, {
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  MarkerType,
  MiniMap,
  Controls,
} from 'reactflow'
import getLayoutedElements from './dagreLayout'
import 'reactflow/dist/style.css'
import './App.css'
import NodeCard from './NodeCard.jsx'
import NodeEditorContext from './NodeEditorContext.ts'
import Playthrough from './Playthrough.jsx'
import LinearView from './LinearView.jsx'
import { convertNodesToLinearText } from './utils/linearConversion.ts'
import AiSettingsModal from './AiSettingsModal.jsx'
// import AiSuggestionsPanel from './AiSuggestionsPanel.jsx'
// import { getSuggestions, proofreadText } from './useAi.js'
import { useAiSettings } from './useAi.js'
// import AiProofreadPanel from './AiProofreadPanel.jsx'
import Button from './Button.jsx'
import FloatingMenu from './FloatingMenu.jsx'
import pkg from '../package.json'
import NewProjectModal from './NewProjectModal.jsx'
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from './constants.js'
import useProjectStorage from './useProjectStorage.js'
import useFirestoreSync from './useFirestoreSync.js'
import { useAuth } from './AuthContext.jsx'
import UserMenu from './UserMenu.jsx'
import { setDebug as setDebugFlag, debugLog, isDebug } from './utils/debug.js'

const ROOT_KEY = '__root__'

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
  const [currentId, setCurrentId] = useState(null)
  const [spawnCounts, setSpawnCounts] = useState({})
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [linearText, setLinearText] = useState('')
  const [isPanelExpanded, setIsPanelExpanded] = useState(false)
  const [projectName, setProjectName] = useState('')
  const [showPlay, setShowPlay] = useState(false)
  const [autoSave, setAutoSave] = useState(() => {
    const saved = localStorage.getItem('cyoa-auto-save')
    return saved ? JSON.parse(saved) : false
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
  const [theme, setTheme] = useState(() => localStorage.getItem('vv-theme') || 'dark')
  const [activeNodeId, setActiveNodeId] = useState(null)
  const [showSearch, setShowSearch] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [debugMode, setDebugMode] = useState(isDebug())
  const importRef = useRef(null)
  const reconnectInfo = useRef({ handleType: null, didReconnect: false })
  const undoStack = useRef([])
  const redoStack = useRef([])
  const resizingRef = useRef(false)
  const toggleDebug = () => {
    const next = !debugMode
    setDebugMode(next)
    setDebugFlag(next)
  }

  useEffect(() => {
    debugLog('activeNodeId', activeNodeId)
  }, [activeNodeId])

  useEffect(() => {
    document.documentElement.style.setProperty('--font-size', `${fontSize}px`)
    localStorage.setItem('cyoa-font-size', String(fontSize))
  }, [fontSize])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('vv-theme', theme)
  }, [theme])

  // Only generate linear text on demand (not on every node change — that causes the feedback loop)
  const generateLinearText = useCallback(() => {
    setLinearText(convertNodesToLinearText(nodes))
  }, [nodes])

  // Generate linear text on initial load and when expanding/collapsing
  useEffect(() => {
    generateLinearText()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // Listen for parser-driven node updates and scan edges
  useEffect(() => {
    const handler = () => setEdges(scanEdges(nodes))
    window.addEventListener('nodes-updated-from-parser', handler)
    return () => window.removeEventListener('nodes-updated-from-parser', handler)
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

  const { saveToFirestore, getHistory } = useFirestoreSync({
    user,
    projects,
    setProjects,
    projectId,
  })

  // Always save to Firestore when logged in (no autoSave requirement)
  useEffect(() => {
    if (!user || !projectId || nodes.length === 0) return
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
    const timer = setTimeout(() => saveToFirestore(projectId, data), 2000)
    return () => clearTimeout(timer)
  }, [user, nodes, nextId, projectName, projectId, saveToFirestore])

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
      // Only push undo for non-drag changes (select, remove, etc.)
      const dominated = changes.every(c => c.type === 'position' || c.type === 'dimensions')
      if (!dominated) pushUndoState()
      setNodes(ns => applyNodeChanges(changes, ns))
    },
    [pushUndoState]
  )
  const onEdgesChange = useCallback(
    changes => {
      pushUndoState()
      setEdges(es => applyEdgeChanges(changes, es))
    },
    [pushUndoState]
  )

  useEffect(() => {
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
      edges,
    }
    try {
      localStorage.setItem('cyoa-data', JSON.stringify(data))
    } catch (e) {
      console.error('Failed to save nodes', e)
    }
  }, [nodes, edges, projectName, nextId])

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
        // Place new node in the visible center of the graph area
        const graphEl = document.getElementById('graph')
        if (graphEl) {
          const rect = graphEl.getBoundingClientRect()
          position = { x: rect.width / 2 - DEFAULT_NODE_WIDTH / 2, y: rect.height / 2 - DEFAULT_NODE_HEIGHT / 2 }
        } else {
          const count = spawnCounts[ROOT_KEY] || 0
          position = { x: count * 300, y: 0 }
        }
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
    } else {
      setSpawnCounts(c => ({ ...c, [ROOT_KEY]: (c[ROOT_KEY] || 0) + 1 }))
    }
  }

  const deleteNode = () => {
    pushUndoState()
    if (!currentId) return
    if (!confirm(`Delete node #${currentId} ?`)) return
    setNodes(ns => {
      const updated = ns.filter(n => n.id !== currentId)
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
    // Group nodes: edit label via prompt
    if (node.type === 'group') {
      const label = prompt('Section name:', node.data.label || '')
      if (label !== null) {
        pushUndoState()
        setNodes(ns => ns.map(n =>
          n.id === node.id ? { ...n, data: { ...n.data, label } } : n
        ))
      }
      return
    }
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
      pushUndoState()
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
    [currentId, pushUndoState]
  )

  const handleProjectSwitch = id => {
    const p = projects[id]
    if (!p) return
    const loaded = (p.data.nodes || []).map(n => ({
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

  const importProject = async e => {
    const file = e.target.files[0]
    if (!file) return
    pushUndoState()
    try {
      const json = await file.text()
      const data = JSON.parse(json)
      const loaded = (data.nodes || []).map(n => ({
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

  const addSection = () => {
    pushUndoState()
    const id = `section-${Date.now()}`
    setNodes(ns => [
      {
        id,
        type: 'group',
        position: { x: 0, y: 0 },
        data: { label: 'New Section' },
        style: {
          width: 600,
          height: 400,
          background: 'rgba(59, 130, 246, 0.05)',
          border: '2px dashed rgba(59, 130, 246, 0.3)',
          borderRadius: '12px',
          fontSize: '18px',
          fontWeight: 'bold',
          color: 'rgba(59, 130, 246, 0.5)',
          padding: '12px',
        },
      },
      ...ns,
    ])
  }

  const showHistory = async () => {
    if (!user) {
      alert('Logga in för att se historik')
      return
    }
    const history = await getHistory(projectId)
    if (history.length === 0) {
      alert('Ingen historik ännu. Versioner sparas automatiskt var 5:e minut när du är inloggad.')
      return
    }
    const list = history.map((h, i) => `${i + 1}. ${h.savedAt} — ${h.projectName || 'Utan namn'} (${(h.nodes || []).length} noder)`).join('\n')
    const choice = prompt(`Välj version att återställa (1-${history.length}):\n\n${list}`)
    if (!choice) return
    const idx = parseInt(choice, 10) - 1
    if (idx < 0 || idx >= history.length) return
    const version = history[idx]
    if (!confirm(`Återställ till version från ${version.savedAt}? Nuvarande version sparas först.`)) return
    // Save current as history before restoring
    const currentData = {
      projectName,
      nextNodeId: nextId,
      nodes: nodes.map(n => ({
        id: n.id, text: n.data.text || '', title: n.data.title || '',
        color: n.data.color || '#1f2937', position: n.position,
        type: n.type || 'card', width: n.width, height: n.height,
      })),
    }
    await saveToFirestore(projectId, currentData)
    // Restore selected version
    const loaded = (version.nodes || []).map(n => ({
      id: n.id, type: 'card',
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
  }

  const openSettings = () => {
    const nodeCount = nodes.filter(n => n.type !== 'group').length
    const wordCount = nodes.reduce((sum, n) => sum + (n.data.text || '').split(/\s+/).filter(Boolean).length, 0)
    const linkCount = edges.length
    const orphans = nodes.filter(n => {
      if (n.type === 'group') return false
      const hasIncoming = edges.some(e => e.target === n.id)
      const isFirst = n.id === nodes.filter(nn => nn.type !== 'group').sort((a,b) => a.id.localeCompare(b.id))[0]?.id
      return !hasIncoming && !isFirst
    })
    const deadEnds = nodes.filter(n => {
      if (n.type === 'group') return false
      return !edges.some(e => e.source === n.id) && (n.data.text || '').trim().length > 0
    })

    let msg = `📊 Projektstatistik\n\n`
    msg += `Noder: ${nodeCount}\n`
    msg += `Ord: ${wordCount}\n`
    msg += `Kopplingar: ${linkCount}\n\n`

    if (orphans.length > 0) {
      msg += `⚠️ Noder utan ingång (föräldralösa):\n`
      msg += orphans.map(n => `  #${n.id} ${n.data.title || '(utan titel)'}`).join('\n')
      msg += '\n\n'
    }

    if (deadEnds.length > 0) {
      msg += `🔚 Slutnoder (inga utgångar):\n`
      msg += deadEnds.map(n => `  #${n.id} ${n.data.title || '(utan titel)'}`).join('\n')
    }

    alert(msg)
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

  const startPlaythrough = () => {
    setShowPlay(true)
  }

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
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'n') {
          e.preventDefault()
          addNode()
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'd') {
          e.preventDefault()
          duplicateNode()
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
          e.preventDefault()
          setShowSearch(s => !s)
          if (showSearch) setSearchQuery('')
        } else if (e.key === 'Delete' && !e.target.closest('input, textarea, [contenteditable]')) {
          e.preventDefault()
          deleteNode()
        }
      }
      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }, [undo, redo, addNode, duplicateNode, deleteNode])

  useEffect(() => {
    const handler = (e) => {
      const { ideaId } = e.detail
      const idea = nodes.find(n => n.id === ideaId)
      if (!idea) return
      pushUndoState()
      const id = String(nextId).padStart(3, '0')
      setNodes(ns => ns.map(n => {
        if (n.id !== ideaId) return n
        return {
          ...n,
          id,
          data: { ...n.data, isIdea: false, title: n.data.title?.replace('💡 ', '') || '' },
        }
      }))
      setNextId(prev => prev + 1)
      setEdges(scanEdges(nodes))
    }
    window.addEventListener('promote-idea', handler)
    return () => window.removeEventListener('promote-idea', handler)
  }, [nodes, nextId, pushUndoState])

  useEffect(() => {
    if (!searchQuery) return
    const q = searchQuery.toLowerCase()
    const match = nodes.find(n =>
      (n.data.title || '').toLowerCase().includes(q) ||
      (n.data.text || '').toLowerCase().includes(q)
    )
    if (match) {
      selectNode(match.id, match.data)
      setActiveNodeId(match.id)
    }
  }, [searchQuery])

  // Persist data after every change

  return (
    <>
      <header>
        <Button
          variant="primary"
          icon={Plus}
          onClick={addNode}
          title="New Node (Ctrl+N)"
        >
          New Node
        </Button>
        <Button
          variant="danger"
          icon={Trash2}
          onClick={deleteNode}
          title="Delete Node"
        >
          Delete Node
        </Button>
        <Button
          variant="ghost"
          icon={RotateCcw}
          onClick={undo}
          title="Undo (Ctrl+Z)"
        >
          Undo
        </Button>
        <Button
          variant="ghost"
          icon={RotateCw}
          onClick={redo}
          title="Redo (Ctrl+Shift+Z)"
        >
          Redo
        </Button>
        <input
          id="projectName"
          value={projectName}
          onChange={e => setProjectName(e.target.value)}
          placeholder="Projektnamn"
        />
        <label id="autoSaveLabel" style={{ display: 'flex', alignItems: 'center' }}>
          <input
            id="autoSave"
            type="checkbox"
            checked={autoSave}
            onChange={e => setAutoSave(e.target.checked)}
          />
          Auto-save
        </label>
        <Popover className="relative">
          {({ open }) => (
            <>
              <Popover.Button className="btn ghost flex items-center gap-1" title="Project actions">
                Project <ChevronDown className="h-4 w-4" />
              </Popover.Button>
              <Transition
                as={Fragment}
                show={open}
                enter="transition ease-out duration-200"
                enterFrom="opacity-0 translate-y-1"
                enterTo="opacity-100 translate-y-0"
                leave="transition ease-in duration-150"
                leaveFrom="opacity-100 translate-y-0"
                leaveTo="opacity-0 translate-y-1"
              >
                <Popover.Panel className="absolute z-10 mt-2 w-40 rounded bg-[var(--panel)] p-2 text-sm text-[var(--text)] shadow-lg">
                  <div className="flex flex-col gap-1">
                    <button
                      className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                      onClick={confirmNewProject}
                      title="New project"
                    >
                      <span className="flex items-center gap-2">
                        <FilePlus className="h-4 w-4" />
                        New project
                      </span>
                    </button>
                    <button
                      className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                      onClick={() => importRef.current?.click()}
                      title="Import"
                    >
                      <span className="flex items-center gap-2">
                        <Upload className="h-4 w-4" />
                        Import
                      </span>
                    </button>
                    <button
                      className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                      onClick={exportProject}
                      title="Export"
                    >
                      <span className="flex items-center gap-2">
                        <Download className="h-4 w-4" />
                        Export
                      </span>
                    </button>
                    <button
                      className="rounded px-3 py-1 text-left hover:bg-[var(--card)]"
                      onClick={exportMarkdown}
                      title="Export MD"
                    >
                      <span className="flex items-center gap-2">
                        <FileText className="h-4 w-4" />
                        Export MD
                      </span>
                    </button>
                  </div>
                </Popover.Panel>
              </Transition>
            </>
          )}
        </Popover>
        <select
          id="projectList"
          value={projectId}
          onChange={e => handleProjectSwitch(e.target.value)}
        >
          {Object.values(projects)
            .sort((a, b) => (b.updated || 0) - (a.updated || 0))
            .map(p => (
              <option key={p.id} value={p.id}>
                {p.data.projectName?.trim() || new Date(p.start).toLocaleString()}
              </option>
            ))}
        </select>
        <input
          ref={importRef}
          type="file"
          onChange={importProject}
          style={{ display: 'none' }}
        />
        <Button
          variant="ghost"
          onClick={() => setFontSize(f => Math.max(10, f - 1))}
          title="Decrease font size"
        >
          A-
        </Button>
        <Button
          variant="ghost"
          onClick={() => setFontSize(f => f + 1)}
          title="Increase font size"
        >
          A+
        </Button>
        {(debugMode || window.location.search.includes('debug')) && (
        <Button
          variant="ghost"
          onClick={toggleDebug}
          title="Toggle debug mode"
        >
          {debugMode ? 'Debug On' : 'Debug Off'}
        </Button>
        )}
        <Button
          variant="ghost"
          icon={theme === 'dark' ? Sun : Moon}
          onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
          title="Toggle light/dark mode"
        >
          {theme === 'dark' ? 'Light' : 'Dark'} Mode
        </Button>
        <UserMenu />
        {showSearch && (
          <input
            autoFocus
            className="search-input"
            placeholder="Sök nod..."
            value={searchQuery}
            onChange={e => setSearchQuery(e.target.value)}
            onKeyDown={e => {
              if (e.key === 'Escape') { setShowSearch(false); setSearchQuery('') }
            }}
          />
        )}
        <span style={{ fontSize: '11px', opacity: 0.5, marginLeft: 'auto' }}>
          {nodes.reduce((sum, n) => sum + (n.data.text || '').split(/\s+/).filter(Boolean).length, 0)} ord
        </span>
      </header>
      <main className={`workspace ${isPanelExpanded ? 'expanded' : ''}`}>
        <div id="graph-container">
          <div id="graph">
            <NodeEditorContext.Provider value={{ updateNodeText, resizingRef, selectNode }}>
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
                onNodeDragStop={() => pushUndoState()}
                onPaneClick={onPaneClick}
                nodeTypes={nodeTypes}
                snapToGrid
                snapGrid={[16, 16]}
                fitView
                minZoom={0.1}
                maxZoom={4}
              >
                <Background color="#374151" variant="dots" gap={16} size={1} />
                <MiniMap zoomable pannable />
                <Controls />
              </ReactFlow>
            </NodeEditorContext.Provider>
          </div>
        </div>
        <LinearView
          text={linearText}
          setText={setLinearText}
          setNodes={setNodes}
          nextId={nextId}
          expanded={isPanelExpanded}
          onToggleExpand={() => setIsPanelExpanded(e => !e)}
          activeNodeId={activeNodeId}
          onSelectNode={handleLinearSelect}
        />
      </main>
      {showPlay && (
        <Playthrough
          nodes={nodes}
          startId={currentId || undefined}
          onClose={() => setShowPlay(false)}
        />
      )}
      {showAiSettings && (
        <AiSettingsModal
          settings={aiSettings}
          onChange={setAiSettings}
          onClose={() => setShowAiSettings(false)}
        />
      )}
      {/*
      {showSuggestions && (
        <AiSuggestionsPanel
          suggestions={suggestions}
          onPick={applySuggestion}
          onClose={() => setShowSuggestions(false)}
        />
      )}
      {showProofread && proofreadResult && (
        <AiProofreadPanel
          original={proofreadResult.original}
          improved={proofreadResult.improved}
          onApply={applyProofread}
          onClose={() => setShowProofread(false)}
        />
      )}
      */}
      {showNewProject && (
        <NewProjectModal
          onConfirm={startNewProject}
          onClose={() => setShowNewProject(false)}
        />
      )}
      <FloatingMenu
        onShowSettings={openSettings}
        onPlaythrough={startPlaythrough}
        onAutoLayout={!showPlay ? handleAutoLayout : undefined}
        onAddSection={addSection}
        onAddIdea={addIdea}
        onShowHistory={showHistory}
        onHelp={openHelp}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 4,
          right: 16,
          fontSize: '12px',
          opacity: 0.6,
        }}
      >
        v{__APP_VERSION__} ({__GIT_HASH__})
      </div>
    </>
  )
}
