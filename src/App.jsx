import { useState, useCallback, useMemo } from 'react'
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
    () => ({ markerEnd: { type: MarkerType.ArrowClosed } }),
    []
  )
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [nextId, setNextId] = useState(1)
  const [currentId, setCurrentId] = useState(null)
  const [text, setText] = useState('')
  const [title, setTitle] = useState('')
  const [showModal, setShowModal] = useState(false)

  const onNodesChange = useCallback(
    changes => setNodes(ns => applyNodeChanges(changes, ns)),
    []
  )
  const onEdgesChange = useCallback(
    changes => setEdges(es => applyEdgeChanges(changes, es)),
    []
  )

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
          <textarea id="text" value={text} onChange={onTextChange} />
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
    </>
  )
}
