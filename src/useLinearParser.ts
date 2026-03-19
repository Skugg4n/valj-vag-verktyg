import { useEffect } from 'react'
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from './constants.js'

export interface ParsedNode {
  id: string
  title: string
  text: string
}

export function parseLinearText(raw: string): ParsedNode[] {
  const normalized = raw.replace(/\r\n?/g, '\n')
  const blocks = normalized.split(/\n(?=(?:##\s+)?#\d{3}\s)/)
  const ids = new Set<string>()
  const parsed: ParsedNode[] = []
  for (const block of blocks) {
    const [first, ...rest] = block.split('\n')
    const match = first.match(/^(?:##\s+)?#(\d{3})\s+(.*)$/)
    if (!match) continue
    const [, id, title] = match
    if (ids.has(id)) {
      console.warn(`Duplicate node id ${id} skipped`)
      continue
    }
    ids.add(id)
    parsed.push({ id, title, text: rest.join('\n').trim() })
  }
  return parsed
}

export default function useLinearParser(raw: string = '', setNodes: any): void {
  useEffect(() => {
    if (typeof setNodes !== 'function') return
    const parsed = parseLinearText(raw)
    setNodes((ns: any[]) => {
      const map = new Map(ns.map(n => [n.id, n]))
      const seenIds = new Set<string>()

      const updated = parsed.map((p, i) => {
        seenIds.add(p.id)
        const existing = map.get(p.id)
        if (existing) {
          return { ...existing, data: { ...existing.data, text: p.text, title: p.title } }
        }
        return {
          id: p.id,
          type: 'card',
          position: { x: 0, y: i * DEFAULT_NODE_HEIGHT },
          data: { text: p.text, title: p.title, color: '#1f2937' },
          width: DEFAULT_NODE_WIDTH,
          height: DEFAULT_NODE_HEIGHT,
        }
      })

      // Preserve nodes not in parsed text (don't destroy on temp malformation)
      for (const n of ns) {
        if (!seenIds.has(n.id)) {
          updated.push(n)
        }
      }

      return updated
    })
  }, [raw, setNodes])
}
