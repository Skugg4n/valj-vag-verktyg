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
  ChevronLeft,
  ChevronRight,
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

const COLOR_OPTIONS = [
  '#1f2937',
  '#ef4444',
  '#f97316',
  '#facc15',
  '#22c55e',
  '#3b82f6',
  '#e879f9',
  '#d1d5db',
]

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
  const [showModal, setShowModal] = useState(false)
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
  const [showColorPicker, setShowColorPicker] = useState(false)
  const [showNewProject, setShowNewProject] = useState(false)
  const [editorCollapsed, setEditorCollapsed] = useState(() =>
    window.innerWidth < 768
  )
  // const [loadingAi, setLoadingAi] = useState(false)
  const [fontSize, setFontSize] = useState(() => {
    const stored = localStorage.getItem('cyoa-font-size')
    return stored ? Number(stored) : 14
  })
  const [theme, setTheme] = useState(() => localStorage.getItem('vv-theme') || 'dark')
  const textRef = useRef(null)
  const importRef = useRef(null)
  const reconnectInfo = useRef({ handleType: null, didReconnect: false })
  const undoStack = useRef([])
  const redoStack = useRef([])
  const resizingRef = useRef(false)

  useEffect(() => {
    document.documentElement.style.setProperty('--font-size', `${fontSize}px`)
    localStorage.setItem('cyoa-font-size', String(fontSize))
  }, [fontSize])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    localStorage.setItem('vv-theme', theme)
  }, [theme])

  const {
    projects,
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
      pushUndoState()
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

  const wrapSelected = (before, after = before) => {
    pushUndoState()
    const area = textRef.current
    if (!area) return
    const start = area.selectionStart
    const end = area.selectionEnd
    const selected = text.slice(start, end)
    const updatedText =
      text.slice(0, start) + before + selected + after + text.slice(end)
    setText(updatedText)
    setNodes(ns =>
      ns.map(n =>
        n.id === currentId ? { ...n, data: { ...n.data, text: updatedText } } : n
      )
    )
    requestAnimationFrame(() => {
      area.focus()
      area.selectionStart = start + before.length
      area.selectionEnd = end + before.length
    })
  }

  const applyHeading = level => {
    pushUndoState()
    const area = textRef.current
    if (!area) return
    const start = area.selectionStart
    const end = area.selectionEnd
    const selected = text.slice(start, end)
    const prefix = '#'.repeat(level) + ' '
    const lines = selected.split(/\n/).map(l => prefix + l).join('\n')
    const updatedText = text.slice(0, start) + lines + text.slice(end)
    setText(updatedText)
    setNodes(ns =>
      ns.map(n =>
        n.id === currentId ? { ...n, data: { ...n.data, text: updatedText } } : n
      )
    )
    requestAnimationFrame(() => {
      area.focus()
      area.selectionStart = start
      area.selectionEnd = start + lines.length
    })
  }

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

  const changeNodeColor = color => {
    if (!currentId) return
    pushUndoState()
    setNodes(ns =>
      ns.map(n =>
        n.id === currentId ? { ...n, data: { ...n.data, color } } : n
      )
    )
    setShowColorPicker(false)
  }

  const insertNextNodeNumber = () => {
    const area = textRef.current
    if (!area) return
    const start = area.selectionStart
    const end = area.selectionEnd
    const nodeId = `#${String(nextId).padStart(3, '0')}`
    const updatedText = text.slice(0, start) + nodeId + text.slice(end)
    updateNodeText(currentId, updatedText)
    requestAnimationFrame(() => {
      area.focus()
      area.selectionStart = area.selectionEnd = start + nodeId.length
    })
  }

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
        const count = spawnCounts[ROOT_KEY] || 0
        position = { x: count * 300, y: 0 }
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

  const onNodeClick = (_e, node) => {
    setCurrentId(node.id)
    setText(node.data.text || '')
    setTitle(node.data.title || '')
  }

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

  const onTextChange = e => {
    if (!currentId) return
    let value = e.target.value
    value = value.replace(/(^|[^[])#(\d{3})(?!\])/g, (_, p1, p2) => `${p1}[#${p2}]`)
    updateNodeText(currentId, value)
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

  const onTitleChange = e => {
    pushUndoState()
    const value = e.target.value
    setTitle(value)
    setNodes(ns =>
      ns.map(n =>
        n.id === currentId ? { ...n, data: { ...n.data, title: value } } : n
      )
    )
  }

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
    a.download = `${Date.now()}-story.md`
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

  const openSettings = () => {
    alert('Settings dialog is not implemented yet')
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

  const openLinearView = () => {
    const linear = convertNodesToLinearText(
      nodes.slice().sort((a, b) => Number(a.id) - Number(b.id))
    )
    setLinearText(linear)
    setShowModal(true)
  }

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
        }
      }
      window.addEventListener('keydown', handler)
      return () => window.removeEventListener('keydown', handler)
    }, [undo, redo, addNode])

  useEffect(() => {
    setEdges(scanEdges(nodes))
  }, [nodes])

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
          Save
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
        <Button
          variant="ghost"
          icon={theme === 'dark' ? Sun : Moon}
          onClick={() => setTheme(t => (t === 'dark' ? 'light' : 'dark'))}
          title="Toggle light/dark mode"
        >
          {theme === 'dark' ? 'Light' : 'Dark'} Mode
        </Button>

      </header>
      <main style={{ position: 'relative' }}>
        <div id="graph">
          <NodeEditorContext.Provider value={{ updateNodeText, resizingRef }}>
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
            onPaneClick={onPaneClick}
            nodeTypes={nodeTypes}
            snapToGrid
            snapGrid={[16, 16]}
            fitView
          >
          <Background color="#374151" variant="dots" gap={16} size={1} />
          <MiniMap zoomable pannable />
          <Controls />
        </ReactFlow>
        </NodeEditorContext.Provider>
      </div>
        <button
          id="toggleEditor"
          className="btn ghost"
          type="button"
          style={{ position: 'absolute', top: '50%', transform: 'translateY(-50%)', right: editorCollapsed ? 0 : '300px', zIndex: 1 }}
          aria-label={editorCollapsed ? 'Expand editor' : 'Collapse editor'}
          title={editorCollapsed ? 'Expand editor' : 'Collapse editor'}
          onClick={() => setEditorCollapsed(c => !c)}
        >
          {editorCollapsed ? <ChevronLeft /> : <ChevronRight />}
        </button>
        {!editorCollapsed && (
        <section id="editor">
          <h2 id="nodeId">#{currentId || '000'} {title}</h2>
        <div id="formatting-toolbar">
          <button
            className="btn ghost"
            type="button"
            onClick={() => wrapSelected('**')}
            title="Bold (Ctrl+B)"
          >
            B
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => wrapSelected('*')}
            title="Italic (Ctrl+I)"
          >
            I
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => wrapSelected('__')}
            title="Underline (Ctrl+U)"
          >
            U
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => applyHeading(1)}
            title="Heading 1"
          >
            H1
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={() => applyHeading(2)}
            title="Heading 2"
          >
            H2
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={insertNextNodeNumber}
            aria-label="Next node number"
            title="Insert next node number"
          >
            <Plus aria-hidden="true" />
          </button>
          {/*
          <button
            className="btn ghost"
            type="button"
            onClick={fetchAiSuggestions}
            aria-label="AI suggestions"
          >
            <Cloud aria-hidden="true" />
          </button>
          <button
            className="btn ghost"
            type="button"
            onClick={fetchProofread}
            aria-label="AI proofread"
          >
            <SpellCheck aria-hidden="true" />
          </button>
          */}
          <div style={{ position: 'relative' }}>
            <button
              className="color-button"
              type="button"
              onClick={() => setShowColorPicker(c => !c)}
              aria-label="Node color"
              title="Node color"
              style={{
                background:
                  nodes.find(n => n.id === currentId)?.data.color || '#1f2937',
              }}
            />
            {showColorPicker && (
              <div className="color-picker">
                {COLOR_OPTIONS.map(col => (
                  <div
                    key={col}
                    className="color-swatch"
                    style={{ background: col }}
                    onClick={() => changeNodeColor(col)}
                  />
                ))}
              </div>
            )}
          </div>
          {/* AI loading indicator removed */}
          {/* Settings button moved to header */}
        </div>
          <input
            id="title"
            value={title}
            onChange={onTitleChange}
            placeholder="Title"
            disabled={!currentId}
          />
          <textarea
            id="text"
            ref={textRef}
            value={text}
            onChange={onTextChange}
            disabled={!currentId}
          />
        </section>
        )}
      </main>
      {showModal && (
        <LinearView
          text={linearText}
          setText={setLinearText}
          setNodes={setNodes}
          nextId={nextId}
          onClose={() => setShowModal(false)}
        />
      )}
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
        // onShowAiSettings={() => setShowAiSettings(true)}
        onLinearView={openLinearView}
        onPlaythrough={startPlaythrough}
        onAutoLayout={!showModal && !showPlay ? handleAutoLayout : undefined}
        onHelp={openHelp}
      />
      <div
        style={{
          position: 'fixed',
          bottom: 4,
          right: 8,
          fontSize: '12px',
          opacity: 0.6,
        }}
      >
        v{pkg.version}
      </div>
    </>
  )
}
