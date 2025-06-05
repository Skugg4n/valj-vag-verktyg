import { useEffect } from 'react'

export default function useLinearParser(raw = '', setNodes) {
  useEffect(() => {
    if (typeof setNodes !== 'function') return
    const blocks = raw.split(/\n(?=#\d{3}\s)/)
    const parsed = blocks
      .map(block => {
        const [first, ...rest] = block.split('\n')
        const match = first.match(/^#(\d{3})\s+(.*)$/)
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
          position: { x: 0, y: i * 100 },
          data: { text: p.text, title: p.title },
          width: 220,
          height: 100,
        }
      })
      return updated
    })
  }, [raw, setNodes])
}
