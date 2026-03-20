import { useEffect, useRef } from 'react'
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from './constants.js'

export interface ParsedNode {
  id: string
  title: string
  text: string
}

export function parseLinearText(raw: string): ParsedNode[] {
  const normalized = raw.replace(/\r\n?/g, '\n')
  const blocks = normalized.split(/\n(?=##\s+#\d{3})/)
  const ids = new Set<string>()
  const parsed: ParsedNode[] = []
  for (const block of blocks) {
    const [first, ...rest] = block.split('\n')
    // Match "## #NNN Title" or "## #NNN" (no title)
    const match = first.match(/^##\s+#(\d{3})\s*(.*)$/)
    if (!match) continue
    const [, id, title] = match
    if (ids.has(id)) {
      console.warn(`Duplicate node id ${id} skipped`)
      continue
    }
    ids.add(id)
    parsed.push({ id, title: title.trim(), text: rest.join('\n').trim() })
  }
  return parsed
}

export default function useLinearParser(raw: string = '', setNodes: any): void {
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (typeof setNodes !== 'function') return

    // Debounce: wait 500ms after last keystroke before parsing
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      const parsed = parseLinearText(raw)
      if (parsed.length === 0) return  // Don't clear all nodes on empty/malformed input

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

        for (const n of ns) {
          if (!seenIds.has(n.id)) {
            updated.push(n)
          }
        }

        return updated
      })

      window.dispatchEvent(new Event('nodes-updated-from-parser'))
    }, 500)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [raw, setNodes])
}
