import { useState, useCallback } from 'react'
import ReactFlow, {
  applyNodeChanges,
  applyEdgeChanges,
} from 'reactflow'
import 'reactflow/dist/style.css'
import './App.css'

function scanEdges(nodes) {
  const pattern = /\[#(\d{3})]/g
  const unique = new Set()
  const edges = []
  for (const n of nodes) {
    const text = n.data.text || ''
    let match
    while ((match = pattern.exec(text))) {
      const target = match[1]
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
  const [nodes, setNodes] = useState([])
  const [edges, setEdges] = useState([])
  const [nextId, setNextId] = useState(1)
  const [currentId, setCurrentId] = useState(null)
  const [text, setText] = useState('')
  const [showModal, setShowModal] = useState(false)

  const onNodesChange = useCallback(
    changes => setNodes(ns => applyNodeChanges(changes, ns)),
    []
  )
  const onEdgesChange = useCallback(
    changes => setEdges(es => applyEdgeChanges(changes, es)),
    []
  )

  const addNode = () => {
    const id = String(nextId).padStart(3, '0')
    setNodes(ns => {
      const updated = [
        ...ns,
        { id, position: { x: 0, y: 0 }, data: { label: `#${id}`, text: '' } },
      ]
      setEdges(scanEdges(updated))
      return updated
    })
    setNextId(n => n + 1)
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
  }

  const onNodeClick = (_e, node) => {
    setCurrentId(node.id)
    setText(node.data.text || '')
  }

  const onTextChange = e => {
    const value = e.target.value
    setText(value)
    setNodes(ns => {
      const updated = ns.map(n =>
        n.id === currentId ? { ...n, data: { ...n.data, text: value } } : n
      )
      setEdges(scanEdges(updated))
      return updated
    })
  }

  const save = () => {
    const data = {
      nextNodeId: nextId,
      nodes: nodes.map(n => ({ id: n.id, text: n.data.text || '', position: n.position })),
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
        position: n.position || { x: 0, y: 0 },
        data: { label: `#${n.id}`, text: n.text || '' },
      }))
      setNodes(loaded)
      setEdges(scanEdges(loaded))
      setNextId(data.nextNodeId || 1)
      setCurrentId(null)
      setText('')
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
      .map(n => `--- Node #${n.id} ---\n${n.data.text || ''}`)
      .join('\n\n')

  return (
    <>
      <header>
        <button onClick={addNode}>New Node</button>
        <button onClick={deleteNode}>Delete Node</button>
        <button onClick={save}>Save</button>
        <input type="file" onChange={load} />
        <button onClick={() => setShowModal(s => !s)}>Linear View</button>
      </header>
      <main>
        <div id="graph">
          <ReactFlow
            style={{ width: '100%', height: '100%' }}
            nodes={nodes}
            edges={edges}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onNodeClick={onNodeClick}
            fitView
          />
        </div>
        <section id="editor">
          <h2 id="nodeId">#{currentId || '000'}</h2>
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
