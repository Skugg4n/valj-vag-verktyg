import type { Node } from 'reactflow'
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../constants.js'

export type Direction = 'left' | 'right' | 'up' | 'down'

export function nodeCenter(n: Node): { x: number; y: number } {
  return {
    x: n.position.x + (n.width ?? DEFAULT_NODE_WIDTH) / 2,
    y: n.position.y + (n.height ?? DEFAULT_NODE_HEIGHT) / 2,
  }
}

/**
 * Nearest node in the given direction. Score = distance along the arrow plus
 * twice the distance across it, so "straight ahead" beats "diagonal but closer".
 */
export function pickNodeInDirection(nodes: Node[], fromId: string, dir: Direction): string | null {
  const from = nodes.find(n => n.id === fromId)
  if (!from) return null
  const c = nodeCenter(from)
  let best: string | null = null
  let bestScore = Infinity
  for (const n of nodes) {
    if (n.id === fromId) continue
    const p = nodeCenter(n)
    const dx = p.x - c.x
    const dy = p.y - c.y
    const along = dir === 'right' ? dx : dir === 'left' ? -dx : dir === 'down' ? dy : -dy
    if (along <= 0) continue
    const across = dir === 'left' || dir === 'right' ? Math.abs(dy) : Math.abs(dx)
    const score = along + 2 * across
    if (score < bestScore) {
      bestScore = score
      best = n.id
    }
  }
  return best
}
