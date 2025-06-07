import { useEffect } from 'react'
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from './constants.js'

export default function useLinearParser(raw = '', setNodes) {
  useEffect(() => {
    if (typeof setNodes !== 'function') return
    const blocks = raw.split(/\n(?=(?:##\s+)?#\d{3}\s)/)
    const parsed = blocks
      .map(block => {
        const [first, ...rest] = block.split('\n')
        const match = first.match(/^(?:##\s+)?#(\d{3})\s+(.*)$/)
        if (!match) return null
        const [, id, title] = match
        return { id, title, text: rest.join('\n').trim() }
      })
      .filter(Boolean)
    setNodes(ns => {
      const map = new Map(ns.map(n => [n.id, n]))
      const updated = parsed.map((p, i) => {
        const existing = map.get(p.id)
        if (existing) {
          return { ...existing, data: { ...existing.data, text: p.text, title: p.title } }
        }
        return {
          id: p.id,
          type: 'card',
          position: { x: 0, y: i * DEFAULT_NODE_HEIGHT },
          data: { text: p.text, title: p.title },
          width: DEFAULT_NODE_WIDTH,
          height: DEFAULT_NODE_HEIGHT,
        }
      })
      return updated
    })
  }, [raw, setNodes])
}
