import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../constants.js'

// Turns a markdown manuscript (see facts/MANUS-FORMAT.md) into project nodes.
//
//   # [001] Titel     or   ## [001] Titel      -> scene 001
//   [002]  [#002]  [[002]](#002)               -> reference stored as [#002]
//   *[MUSIK: ...]*                             -> kept as text (stage direction)
//
// Referenced scenes without a heading are created empty. Nodes are laid out in
// layers by distance from 001 so the graph is readable before auto-layout.

const HEADING = /^#{1,2}\s+\[?#?(\d{3})\]?\s*(.*)$/
const LINK_REF = /\[\\?\[#?(\d{3})\\?\]\]\(#\d{3}\)/g   // [[002]](#002)
const PLAIN_REF = /(?<!\[)\[#?(\d{3})\](?!\()/g        // [002] or [#002]
const STORED_REF = /\[#(\d{3})\]/g

export interface ManuscriptNode {
  id: string
  type: 'card'
  position: { x: number; y: number }
  data: { title: string; text: string; color: string }
  width: number
  height: number
}

export interface ManuscriptProject {
  nodes: ManuscriptNode[]
  nextNodeId: number
  sceneCount: number
  createdEmpty: string[]
}

export function normaliseRefs(text: string): string {
  return text.replace(LINK_REF, '[#$1]').replace(PLAIN_REF, '[#$1]')
}

const COL_GAP = 340
const ROW_GAP = 180

export function parseManuscript(markdown: string): ManuscriptProject {
  const lines = markdown.replace(/\r\n?/g, '\n').split('\n')
  type Scene = { id: string; title: string; lines: string[] }
  const scenes: Scene[] = []
  const seen = new Set<string>()
  let current: Scene | null = null
  for (const line of lines) {
    const m = line.match(HEADING)
    if (m && !seen.has(m[1])) {
      seen.add(m[1])
      current = { id: m[1], title: m[2].trim(), lines: [] }
      scenes.push(current)
      continue
    }
    if (current) current.lines.push(line)
  }

  const built = new Map<string, { title: string; text: string }>()
  for (const s of scenes) {
    const text = normaliseRefs(s.lines.join('\n')).replace(/^\n+|\n+$/g, '')
    built.set(s.id, { title: s.title, text })
  }

  const refs = new Map<string, string[]>()
  for (const [id, b] of built) {
    refs.set(id, [...b.text.matchAll(STORED_REF)].map(m => m[1]))
  }

  const createdEmpty: string[] = []
  for (const targets of refs.values()) {
    for (const t of targets) {
      if (!built.has(t)) {
        built.set(t, { title: '', text: '' })
        refs.set(t, [])
        createdEmpty.push(t)
      }
    }
  }

  // Layer by shortest path from 001; unreachable scenes go in a last column.
  const depth = new Map<string, number>()
  if (built.has('001')) {
    depth.set('001', 0)
    const queue = ['001']
    while (queue.length) {
      const n = queue.shift()!
      for (const t of refs.get(n) || []) {
        if (!depth.has(t)) {
          depth.set(t, depth.get(n)! + 1)
          queue.push(t)
        }
      }
    }
  }
  const ids = [...built.keys()].sort()
  const maxDepth = Math.max(0, ...depth.values())
  const columns = new Map<number, string[]>()
  for (const id of ids) {
    const d = depth.has(id) ? depth.get(id)! : maxDepth + 1
    if (!columns.has(d)) columns.set(d, [])
    columns.get(d)!.push(id)
  }

  const nodes: ManuscriptNode[] = ids.map(id => {
    const d = depth.has(id) ? depth.get(id)! : maxDepth + 1
    const row = columns.get(d)!.indexOf(id)
    const b = built.get(id)!
    return {
      id,
      type: 'card',
      position: { x: d * COL_GAP, y: row * ROW_GAP },
      data: { title: b.title, text: b.text, color: '#1f2937' },
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    }
  })

  const maxId = ids.reduce((m, id) => Math.max(m, Number(id)), 0)
  return { nodes, nextNodeId: maxId + 1, sceneCount: scenes.length, createdEmpty: createdEmpty.sort() }
}

/** "varldshopparen_manus_v01.md" -> "varldshopparen manus v01" */
export function projectNameFromFile(fileName: string): string {
  return fileName.replace(/\.(md|markdown|txt)$/i, '').replace(/[_-]+/g, ' ').trim()
}
