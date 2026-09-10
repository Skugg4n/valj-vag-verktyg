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

/** Vertical step used when a candidate position is already taken. */
const FREE_STEP = 150
/** How close two positions may be before they count as the same slot. */
const OCCUPIED_TOLERANCE = 40

/**
 * Nudge a candidate position downwards until no existing node sits on it.
 * Without this, a scene created from the graph can land exactly on a scene an
 * earlier document reference already placed to the right of the same parent.
 */
export function freePosition(
  candidate: { x: number; y: number },
  nodes: Node[]
): { x: number; y: number } {
  let { x, y } = candidate
  const taken = (px: number, py: number) =>
    nodes.some(
      n =>
        n.position &&
        Math.abs(n.position.x - px) < OCCUPIED_TOLERANCE &&
        Math.abs(n.position.y - py) < OCCUPIED_TOLERANCE
    )
  let guard = 0
  while (taken(x, y) && guard < 200) {
    y += FREE_STEP
    guard += 1
  }
  return { x, y }
}
