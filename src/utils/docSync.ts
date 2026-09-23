import type { Node } from 'reactflow'
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../constants.js'
import { freePosition } from './graphNav.ts'

/** A scene reference as it may appear in the document: [004], [#004], \[004\]. */
const DOC_REF_G = /\\?\[#?(\d{3})\\?\]/g
/** A scene reference as stored in node text. */
const STORED_REF_G = /\[#(\d{3})\]/g
/** Scene headings. With an id, level 1 or 2 both count: "# [003] Titel",
 *  "## \[003\] Titel", "## #003 Titel". Without an id only level 2 starts a
 *  scene ("## Titel" gets the next free number); a plain "# Titel" is text. */
const HEADING_WITH_ID = /^#{1,2}\s+(?:\\?\[#?(\d{3})\\?\]|#(\d{3}))\s*(.*)$/
const HEADING_NO_ID = /^##\s+(?!\\?\[#?\d{3}\\?\]|#\d{3})(.*)$/
function matchHeading(line: string): { id?: string; title: string } | null {
  const m = line.match(HEADING_WITH_ID)
  if (m) return { id: m[1] || m[2], title: (m[3] || '').trim() }
  const n = line.match(HEADING_NO_ID)
  if (n) return { title: (n[1] || '').trim() }
  return null
}

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
    .replace(/\\\n/g, '\n')          // "\" + newline (hard break) == two-space break
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
    const h = matchHeading(line)
    if (h?.id) ids.add(h.id)
  }
  return ids
}

export interface DocToNodesOptions {
  nextId: number
  /** Scene ids the document showed when editing began. Only these may be
   *  removed or emptied by this document change. Defaults to all prev scenes.
   *  Derived from `baselineMarkdown` when only that is given. */
  baselineIds?: Set<string>
  /** The markdown the document held when editing began. Enables a per-scene
   *  three-way merge: a scene whose title and text are unchanged since the
   *  baseline keeps whatever the graph wrote in the meantime. */
  baselineMarkdown?: string
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

/**
 * Split markdown into scenes keyed by id, with refs stored as [#NNN].
 * `allocId` supplies an id for a heading that has none; when it is null such
 * headings (and their bodies) are skipped, which is what a baseline parse wants.
 */
function splitScenes(
  markdown: string,
  allocId: (() => string) | null
): Map<string, { title: string; text: string }> {
  type Scene = { id: string; title: string; lines: string[] }
  const scenes: Scene[] = []
  const seen = new Set<string>()
  let current: Scene | null = null
  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const h = matchHeading(line)
    if (h) {
      let id = h.id
      if (!id) {
        if (!allocId) { current = null; continue }
        id = allocId()
      }
      if (seen.has(id)) {
        current?.lines.push(line)
        continue
      }
      seen.add(id)
      current = { id, title: h.title, lines: [] }
      scenes.push(current)
      continue
    }
    if (current) current.lines.push(line)
  }
  const out = new Map<string, { title: string; text: string }>()
  for (const s of scenes) {
    out.set(s.id, { title: s.title, text: cleanStoredText(s.lines.join('\n')) })
  }
  return out
}

/** Body text as stored on the node: refs as [#NNN], no markdown escapes for
 *  brackets, hard line breaks as two trailing spaces instead of "\\" + newline. */
export function cleanStoredText(raw: string): string {
  return raw
    .replace(/\[\\?\[#?(\d{3})\\?\]\]\(#\d{3}\)/g, '[#$1]')   // [[002]](#002) link form
    .replace(DOC_REF_G, '[#$1]')
    .replace(/\\\n/g, '  \n')
    .replace(/\\([\[\]])/g, '$1')
    .replace(/[\u201c\u201d\u201e\u00ab\u00bb]/g, '"')   // straight quotes, Swedish style
    .replace(/[\u2018\u2019\u201a]/g, "'")
    .replace(/^\n+|\n+$/g, '')
}

export function docToNodes(markdown: string, prevNodes: Node[], opts: DocToNodesOptions): DocToNodesResult {
  const prevMap = new Map(prevNodes.map(n => [n.id, n]))
  const baseline =
    opts.baselineIds ??
    (opts.baselineMarkdown != null
      ? sceneIdsInDoc(opts.baselineMarkdown)
      : new Set(prevNodes.filter(isScene).map(n => n.id)))
  let nextNum = opts.nextId
  const raiseAbove = (id: string) => {
    const num = Number(id)
    if (Number.isFinite(num) && num >= nextNum) nextNum = num + 1
  }
  for (const n of prevNodes) raiseAbove(n.id)
  // Pre-scan: a heading without a number must start above every id the
  // document already uses, further down as well as in the graph, or two
  // scenes end up fighting over the same number.
  for (const line of markdown.replace(/\r\n?/g, '\n').split('\n')) {
    const h = matchHeading(line)
    if (h?.id) raiseAbove(h.id)
  }
  for (const m of markdown.matchAll(DOC_REF_G)) raiseAbove(m[1])

  // 1-2. Split into scenes and build title/text per scene, refs as [#NNN].
  const built = splitScenes(markdown, () => {
    const id = String(nextNum).padStart(3, '0')
    nextNum += 1
    return id
  })
  // The baseline the user started from, parsed the same way. A scene that
  // still equals its baseline was not touched by the user, so a graph change
  // that landed in the meantime must not be written over.
  const baseParsed = opts.baselineMarkdown != null ? splitScenes(opts.baselineMarkdown, null) : null

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
    const candidate = p
      ? { x: p.position.x + 300, y: p.position.y + index * 150 }
      : opts.fallbackPosition ?? { x: 0, y: 0 }
    // Never drop a new scene on top of one that is already there.
    return freePosition(candidate, [...prevNodes, ...result])
  }

  for (const [id, b] of built) {
    const prev = prevMap.get(id)
    if (prev) {
      const d: any = prev.data || {}
      const untouched = baseParsed
        ? (() => {
            const bb = baseParsed.get(id)
            return !!bb && bb.title === b.title && bb.text === b.text
          })()
        : false
      if (untouched) {
        result.push(prev)
      } else if ((d.title || '') !== b.title || (d.text || '') !== b.text) {
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
