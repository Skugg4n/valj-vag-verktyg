import { useState, useCallback, useMemo, useRef } from 'react'
import ReactFlow, {
  applyNodeChanges,
  applyEdgeChanges,
  Background,
  MarkerType,
  MiniMap,
  Controls,
} from 'reactflow'
import 'reactflow/dist/style.css'
import './App.css'
import NodeCard from './NodeCard.jsx'
import Playthrough from './Playthrough.jsx'
import pkg from '../package.json'

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
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [showPlay, setShowPlay] = useState(false)
  const textRef = useRef(null)
  const reconnectInfo = useRef({ handleType: null, didReconnect: false })

  const onNodesChange = useCallback(
    changes => setNodes(ns => applyNodeChanges(changes, ns)),
    []
  )
  const onEdgesChange = useCallback(
    changes => setEdges(es => applyEdgeChanges(changes, es)),
    []
  )

  const wrapSelected = (before, after = before) => {
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

  const onConnect = useCallback(({ source, target }) => {
    if (!source || !target) return
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
  }, [currentId])

  const onReconnectStart = useCallback((_e, _edge, handleType) => {
    reconnectInfo.current = { handleType, didReconnect: false }
  }, [])

  const onReconnect = useCallback(
    (oldEdge, connection) => {
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
    [currentId]
  )

  const onReconnectEnd = useCallback(
    (_e, edge) => {
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
    [currentId]
  )

  const addNode = () => {
    const id = String(nextId).padStart(3, '0')
    setNodes(ns => {
      let position = { x: 0, y: 0 }
      let updatedNodes = ns
      if (currentId) {
        const cur = ns.find(n => n.id === currentId)
        if (cur) {
          position = { x: cur.position.x + 300, y: cur.position.y }
          const text = cur.data.text || ''
          const sep = text.trim() ? ' ' : ''
          const link = `[#${id}]`
          updatedNodes = ns.map(n =>
            n.id === currentId ? { ...n, data: { ...n.data, text: `${text}${sep}${link}` } } : n
          )
        }
      }
      const updated = [
        ...updatedNodes,
        { id, position, type: 'card', data: { text: '', title: '' } },
      ]
      setEdges(scanEdges(updated))
      return updated
    })
    setNextId(n => n + 1)
    if (currentId) {
      setText(t => {
        const sep = t.trim() ? ' ' : ''
        return `${t}${sep}[#${id}]`
      })
    }
  }

  const deleteNode = () => {
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

  const onPaneClick = () => {
    setCurrentId(null)
    setText('')
    setTitle('')
  }

  const onTextChange = e => {
    let value = e.target.value
    value = value.replace(/(^|[^[])#(\d{3})(?!\])/g, (_, p1, p2) => `${p1}[#${p2}]`)
    setText(value)
    setNodes(ns => {
      const updated = ns.map(n =>
        n.id === currentId ? { ...n, data: { ...n.data, text: value } } : n
      )
      setEdges(scanEdges(updated))
      return updated
    })
  }

  const onTitleChange = e => {
    const value = e.target.value
    setTitle(value)
    setNodes(ns =>
      ns.map(n =>
        n.id === currentId ? { ...n, data: { ...n.data, title: value } } : n
      )
    )
  }

  const save = () => {
    const data = {
      nextNodeId: nextId,
      nodes: nodes.map(n => ({
        id: n.id,
        text: n.data.text || '',
        title: n.data.title || '',
        position: n.position,
        type: n.type || 'card',
      })),
    }
    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: 'application/json',
    })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `${Date.now()}-project.json`
    a.style.display = 'none'
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(a.href)
  }

  const load = async e => {
    const file = e.target.files[0]
    if (!file) return
    try {
      const json = await file.text()
      const data = JSON.parse(json)
      const loaded = (data.nodes || []).map(n => ({
        id: n.id,
        type: 'card',
        position: n.position || { x: 0, y: 0 },
        data: { text: n.text || '', title: n.title || '' },
      }))
      setNodes(loaded)
      setEdges(scanEdges(loaded))
      setNextId(data.nextNodeId || 1)
      setCurrentId(null)
      setText('')
      setTitle('')
    } catch {
      alert('Failed to load project')
    } finally {
      e.target.value = ''
    }
  }

  const linearList = () =>
    nodes
      .slice()
      .sort((a, b) => Number(a.id) - Number(b.id))
      .map(n => `--- Node #${n.id} ${n.data.title || ''} ---\n${n.data.text || ''}`)
      .join('\n\n')

  return (
    <>
      <header>
        <button onClick={addNode}>New Node</button>
        <button onClick={deleteNode}>Delete Node</button>
        <button onClick={save}>Save</button>
        <input type="file" onChange={load} />
        <button onClick={() => setShowModal(s => !s)}>Linear View</button>
        <button onClick={() => setShowPlay(true)}>Playthrough</button>
        <div id="version">v{pkg.version}</div>
      </header>
      <main>
        <div id="graph">
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
            fitView
          >
          <Background color="#374151" variant="dots" gap={16} size={1} />
          <MiniMap zoomable pannable />
          <Controls />
        </ReactFlow>
      </div>
        <section id="editor">
          <h2 id="nodeId">#{currentId || '000'} {title}</h2>
          <input id="title" value={title} onChange={onTitleChange} placeholder="Title" />
          <div id="formatting-toolbar">
            <button type="button" onClick={() => wrapSelected('**')}>B</button>
            <button type="button" onClick={() => wrapSelected('*')}>I</button>
            <button type="button" onClick={() => wrapSelected('__')}>U</button>
            <button type="button" onClick={() => applyHeading(1)}>H1</button>
            <button type="button" onClick={() => applyHeading(2)}>H2</button>
          </div>
          <textarea id="text" ref={textRef} value={text} onChange={onTextChange} />
        </section>
      </main>
      {showModal && (
        <div id="modal" role="dialog" aria-modal="true" className="show">
          <button id="closeModal" aria-label="Close linear view" onClick={() => setShowModal(false)}>
            Close
          </button>
          <pre id="modalList">{linearList()}</pre>
        </div>
      )}
      {showPlay && (
        <Playthrough
          nodes={nodes}
          startId={currentId || undefined}
          onClose={() => setShowPlay(false)}
        />
      )}
    </>
  )
}
