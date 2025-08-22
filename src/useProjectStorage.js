import { useEffect, useState } from 'react'
import { DEFAULT_NODE_WIDTH } from './constants.js'

function estimateNodeHeight(text = '') {
  const charsPerLine = 32
  const lines = text
    .split(/\r?\n/)
    .reduce((sum, line) => sum + Math.ceil(line.length / charsPerLine), 0)
  return Math.min(300, Math.max(100, 50 + lines * 18))
}

export default function useProjectStorage({
  nodes,
  nextId,
  projectName,
  autoSave,
  setNodes,
  setNextId,
  setProjectName,
}) {
  const [projects, setProjects] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('cyoa-projects')) || {}
    } catch {
      return {}
    }
  })
  const [projectId, setProjectId] = useState(() =>
    localStorage.getItem('cyoa-current') || String(Date.now())
  )
  const [projectStart, setProjectStart] = useState(Date.now())
  const [error, setError] = useState(null)

  useEffect(() => {
    let projs = {}
    try {
      projs = JSON.parse(localStorage.getItem('cyoa-projects')) || {}
    } catch {
      setError('Corrupt project list, starting fresh.')
    }
    setProjects(projs)
    const current = localStorage.getItem('cyoa-current')
    const id = current || Object.keys(projs)[0] || String(Date.now())
    setProjectId(id)
    let data
    if (projs[id]) {
      data = projs[id].data
      setProjectStart(projs[id].start || Date.now())
    } else {
      const saved = localStorage.getItem('cyoa-data')
      if (saved) {
        try {
          data = JSON.parse(saved)
        } catch {
          setError('Corrupt project data, starting fresh.')
        }
      }
      setProjectStart(Date.now())
    }
    if (data) {
      try {
        const loaded = (data.nodes || []).map(n => {
          const w = n.style?.width ?? n.width ?? DEFAULT_NODE_WIDTH
          const h = n.style?.height ?? n.height ?? estimateNodeHeight(n.text || '')
          return {
            id: n.id,
            type: 'card',
            position: n.position || { x: 0, y: 0 },
            data: { text: n.text || '', title: n.title || '', color: n.color || '#1f2937' },
            width: w,
            height: h,
            style: { width: w, height: h },
          }
        })
        setNodes(loaded)
        setNextId(data.nextNodeId || 1)
        setProjectName(data.projectName || '')
      } catch {
        setError('Corrupt project data, starting fresh.')
      }
    }
  }, [setNodes, setNextId, setProjectName])

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
        style: {
          width: n.style?.width ?? n.width,
          height: n.style?.height ?? n.height,
        },
      })),
    }
    try {
      localStorage.setItem('cyoa-data', JSON.stringify(data))
      if (autoSave) {
        setProjects(p => {
          const now = Date.now()
          const prev = p[projectId] || { id: projectId, start: projectStart }
          return {
            ...p,
            [projectId]: { ...prev, updated: now, data },
          }
        })
      }
    } catch {
      setError('Failed to save project.')
    }
  }, [nodes, nextId, projectName, autoSave, projectId, projectStart])

  useEffect(() => {
    localStorage.setItem('cyoa-projects', JSON.stringify(projects))
  }, [projects])

  useEffect(() => {
    localStorage.setItem('cyoa-current', projectId)
  }, [projectId])

  useEffect(() => {
    localStorage.setItem('cyoa-auto-save', JSON.stringify(autoSave))
  }, [autoSave])

  return {
    projects,
    setProjects,
    projectId,
    setProjectId,
    projectStart,
    setProjectStart,
    error,
  }
}

