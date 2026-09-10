import type { Node } from 'reactflow'
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../constants.js'

/** A scene reference as it may appear in the document: [004], [#004], \[004\]. */
const DOC_REF_G = /\\?\[#?(\d{3})\\?\]/g
/** A scene reference as stored in node text. */
const STORED_REF_G = /\[#(\d{3})\]/g
/** "## [003] Titel", "## \[003\] Titel", "## #003 Titel" or "## Titel" (no id). */
const HEADING = /^##\s+(?:\\?\[#?(\d{3})\\?\]|#(\d{3}))?\s*(.*)$/

export function isIdeaNode(n: Node): boolean {
  return !!(n.data as any)?.isIdea || String(n.id).startsWith('idea-')
}

function isScene(n: Node): boolean {
  return n.type !== 'group' && !isIdeaNode(n)
}

export function nodesToDoc(nodes: Node[]): string {
  return [...nodes]
    .filter(isScene)
    .sort((a, b) => a.id.localeCompare(b.id))
    .map(n => {
      const title = String((n.data as any)?.title || '').trim()
      const text = String((n.data as any)?.text || '').replace(STORED_REF_G, '[$1]')
      const lines = [`## [${n.id}]${title ? ` ${title}` : ''}`]
      if (text.trim()) lines.push('', text)
      return lines.join('\n')
    })
    .join('\n\n')
}

/** Canonical form used only for equality checks between doc and nodes. */
export function normalizeDoc(md: string): string {
  return md
    .replace(/\r\n?/g, '\n')
    .replace(/\\([\[\]])/g, '$1')
    .replace(/\[#(\d{3})\]/g, '[$1]')
    .split('\n')
    .map(l => l.replace(/\s+$/, ''))
    .join('\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
}

export function sceneIdsInDoc(md: string): Set<string> {
  const ids = new Set<string>()
  for (const line of md.replace(/\r\n?/g, '\n').split('\n')) {
    const m = line.match(HEADING)
    const id = m?.[1] || m?.[2]
    if (id) ids.add(id)
  }
  return ids
}

export interface DocToNodesOptions {
  nextId: number
  /** Scene ids the document showed when editing began. Only these may be
   *  removed or emptied by this document change. Defaults to all prev scenes. */
  baselineIds?: Set<string>
  /** Where to place a new scene that has no parent to sit next to. */
  fallbackPosition?: { x: number; y: number }
}

export interface DocToNodesResult {
  nodes: Node[]
  nextId: number
  createdIds: string[]
  changed: boolean
}

function makeNode(id: string, title: string, text: string, position: { x: number; y: number }): Node {
  return {
    id,
    type: 'card',
    position,
    data: { title, text, color: '#1f2937' },
    width: DEFAULT_NODE_WIDTH,
    height: DEFAULT_NODE_HEIGHT,
  } as Node
}

export function docToNodes(markdown: string, prevNodes: Node[], opts: DocToNodesOptions): DocToNodesResult {
  const prevMap = new Map(prevNodes.map(n => [n.id, n]))
  const baseline = opts.baselineIds ?? new Set(prevNodes.filter(isScene).map(n => n.id))
  let nextNum = opts.nextId
  for (const n of prevNodes) {
    const num = Number(n.id)
    if (Number.isFinite(num) && num >= nextNum) nextNum = num + 1
  }

  // 1. Split into scenes.
  type Scene = { id: string; title: string; lines: string[] }
  const scenes: Scene[] = []
  const seen = new Set<string>()
  let current: Scene | null = null
  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const m = line.match(HEADING)
    if (m) {
      let id = m[1] || m[2]
      if (!id) {
        id = String(nextNum).padStart(3, '0')
        nextNum += 1
      }
      if (seen.has(id)) {
        current?.lines.push(line)
        continue
      }
      seen.add(id)
      current = { id, title: (m[3] || '').trim(), lines: [] }
      scenes.push(current)
      continue
    }
    if (current) current.lines.push(line)
  }

  // 2. Build title/text per scene, storing refs as [#NNN].
  const built = new Map<string, { title: string; text: string }>()
  for (const s of scenes) {
    const text = s.lines.join('\n').replace(DOC_REF_G, '[#$1]').replace(/^\n+|\n+$/g, '')
    built.set(s.id, { title: s.title, text })
  }

  // 3. Which ids are referenced, and by whom (first source wins).
  const referenced = new Map<string, string>()
  for (const [id, b] of built) {
    for (const m of b.text.matchAll(STORED_REF_G)) {
      if (!referenced.has(m[1])) referenced.set(m[1], id)
    }
  }

  // 4. Assemble.
  const result: Node[] = []
  const createdIds: string[] = []
  let changed = false
  const positionNextTo = (parentId: string | undefined, index: number) => {
    const p = parentId ? prevMap.get(parentId) || result.find(n => n.id === parentId) : undefined
    if (p) return { x: p.position.x + 300, y: p.position.y + index * 150 }
    return opts.fallbackPosition ?? { x: 0, y: 0 }
  }

  for (const [id, b] of built) {
    const prev = prevMap.get(id)
    if (prev) {
      const d: any = prev.data || {}
      if ((d.title || '') !== b.title || (d.text || '') !== b.text) {
        changed = true
        result.push({ ...prev, data: { ...d, title: b.title, text: b.text } })
      } else {
        result.push(prev)
      }
    } else {
      changed = true
      createdIds.push(id)
      result.push(makeNode(id, b.title, b.text, positionNextTo(referenced.get(id), 0)))
    }
  }

  let k = 0
  for (const [id, src] of referenced) {
    if (built.has(id)) continue
    const prev = prevMap.get(id)
    if (prev) {
      const d: any = prev.data || {}
      if (baseline.has(id) && ((d.title || '') !== '' || (d.text || '') !== '')) {
        changed = true
        result.push({ ...prev, data: { ...d, title: '', text: '' } })
      } else {
        result.push(prev)
      }
    } else {
      changed = true
      createdIds.push(id)
      result.push(makeNode(id, '', '', positionNextTo(src, k)))
      k += 1
    }
  }

  // 5. Prev scenes with no heading and no reference: keep unless they were in
  //    the baseline (then the user removed them on purpose).
  for (const n of prevNodes) {
    if (!isScene(n)) continue
    if (built.has(n.id) || referenced.has(n.id)) continue
    if (baseline.has(n.id)) {
      changed = true
      continue
    }
    result.push(n)
  }

  for (const id of [...built.keys(), ...referenced.keys()]) {
    const num = Number(id)
    if (Number.isFinite(num) && num >= nextNum) nextNum = num + 1
  }

  const passthrough = prevNodes.filter(n => !isScene(n))
  return {
    nodes: changed ? [...result, ...passthrough] : prevNodes,
    nextId: nextNum,
    createdIds,
    changed,
  }
}

/**
 * Which scene ⌘Enter should open next: the first scene referenced from
 * `fromId` that has neither title nor text, otherwise the next free number.
 */
export function chooseNextSceneId(
  nodes: Node[],
  fromId: string | null,
  nextId: number
): { id: string; exists: boolean; referenced: boolean } {
  const from = fromId ? nodes.find(n => n.id === fromId) : undefined
  if (from) {
    const refs = [...String((from.data as any)?.text || '').matchAll(STORED_REF_G)].map(m => m[1]).sort()
    for (const id of refs) {
      const t = nodes.find(n => n.id === id)
      if (!t) return { id, exists: false, referenced: true }
      const d: any = t.data || {}
      if (!String(d.title || '').trim() && !String(d.text || '').trim()) {
        return { id, exists: true, referenced: true }
      }
    }
  }
  return { id: String(nextId).padStart(3, '0'), exists: false, referenced: false }
}
