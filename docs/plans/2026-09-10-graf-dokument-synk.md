# Graf ↔ dokument-synk: implementationsplan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Gör noderna till enda sanningen i Advanced-editorn så att grafen och dokumentet alltid visar samma berättelse, med ⌘Enter för ny länkad scen och ⌘+pil för att byta scen.

**Architecture:** `nodes` i `App.jsx` är enda tillståndet. Dokumentets markdown räknas fram med den rena funktionen `nodesToDoc(nodes)` vid varje ändring och skrivs in i TipTap utan att utlösa `onUpdate`. Dokumentändringar går genom `docToNodes(markdown, prevNodes, opts)` (ren funktion) tillbaka till `nodes`. `DocPane` äger en riktningsspärr (`lastMarkdownRef` + normaliserad jämförelse) och skickar med vilka scener dokumentet visade när redigeringen började (`baselineIds`), så att grafändringar som hunnit ske under tiden aldrig raderas av en dokumentändring.

**Tech Stack:** React 19, ReactFlow 11, TipTap 2 + tiptap-markdown, Jest 29 (jsdom, babel-jest), TypeScript i `.ts`-hjälpfiler, JSX i komponenter.

**Spec:** `docs/superpowers/specs/2026-09-10-graf-dokument-synk-design.md`

## Global Constraints

- Basic får inte röras: inga ändringar i `WorkshopApp.jsx`, `Workshop*.jsx`, `BookReader.jsx`, `PublicReader.jsx`, `sceneRefs.js`, `storyExport.js`, `useFirestoreSync.js`, `routing.js`, `main.jsx`.
- Nodtext lagras alltid med `[#NNN]`. `[NNN]` finns bara i dokumentvyn.
- Bara tresiffriga nummer är referenser.
- Inga Tailwind-klasser. Knappar använder `.btn`-systemet. Svenska UI-texter, engelsk kod.
- Version vid leverans: `0.15.0` i `package.json`, CHANGELOG-post, `CLAUDE.md` "Current version".
- Arbeta på gren `feature/doc-graph-sync` från `master`. Sätt tag `pre-sync-v0.14.1` på master först.
- Kör `npx jest` efter varje task; allt ska vara grönt före commit.
- Inget pushas till `master` utan Olas godkännande av preview.

---

## Filstruktur

| Fil | Ansvar |
|---|---|
| `src/utils/docSync.ts` (ny) | Rena funktioner: `nodesToDoc`, `docToNodes`, `normalizeDoc`, `sceneIdsInDoc`, `isIdeaNode`, `chooseNextSceneId`. |
| `src/utils/graphNav.ts` (ny) | Rena funktioner: `pickNodeInDirection`, `nodeCenter`. |
| `src/SceneRef.ts` (ny, ersätter `src/ArrowLink.ts`) | TipTap inline-atom som visar `[NNN]` som pill och serialiserar `[NNN]`. |
| `src/BracketAutoClose.ts` (ny) | TipTap-plugin: `[` ger `[]`, `]` hoppar över eller gör klar en `[NNN]`-pill. |
| `src/DocPane.jsx` | Editorn. Tar `markdown`, `nodes`, `onDocChange`, `onNewScene`. Äger spärr, debounce, kursorbevarande, ⌘Enter/⌘↑↓. |
| `src/App.jsx` | `handleDocChange`, `createLinkedScene`, `focusScene`, `viewportRef`, ⌘Enter/⌘+pil, borttagning av gammal synk och sektioner. |
| `src/GraphPane.jsx` | `ViewportBridge` som exponerar ReactFlow-instansen. Sektionsknapp bort. |
| `src/NodeCard.jsx`, `src/NodeEditorContext.ts` | Fokus på titelfält på begäran. |
| `src/Topbar.jsx`, `src/AppShell.jsx` | `lastSavedAt`. |
| Raderas | `src/ArrowLink.ts`, `src/useLinearParser.ts`, `src/utils/linearConversion.ts`, `src/SectionNode.jsx`, `src/__tests__/LinearConversion.test.ts`, `src/__tests__/LinearParser.test.ts`, `src/__tests__/ArrowLink.test.ts`. |

---

### Task 0: Gren och tag

**Files:** inga.

- [ ] **Step 1: Skapa säkerhetstag och gren**

```bash
cd /Users/olabelin/Documents/CLAUDE/valj-vag-verktyg
git checkout master
git tag pre-sync-v0.14.1
git checkout -b feature/doc-graph-sync
```

- [ ] **Step 2: Kontrollera att testerna är gröna innan något ändras**

Run: `npx jest 2>&1 | tail -5`
Expected: `Tests: ... passed`, inga failures.

---

### Task 1: `docSync.ts`: nodesToDoc och docToNodes

**Files:**
- Create: `src/utils/docSync.ts`
- Test: `src/__tests__/docSync.test.ts`

**Interfaces:**
- Produces:
  - `nodesToDoc(nodes: Node[]): string`
  - `docToNodes(markdown: string, prevNodes: Node[], opts: { nextId: number; baselineIds?: Set<string>; fallbackPosition?: {x:number;y:number} }): { nodes: Node[]; nextId: number; createdIds: string[]; changed: boolean }`
  - `normalizeDoc(md: string): string`
  - `sceneIdsInDoc(md: string): Set<string>`
  - `isIdeaNode(n: Node): boolean`
  - `chooseNextSceneId(nodes: Node[], fromId: string | null, nextId: number): { id: string; exists: boolean; referenced: boolean }`

- [ ] **Step 1: Skriv de fallerande testerna**

```ts
// src/__tests__/docSync.test.ts
import {
  nodesToDoc, docToNodes, normalizeDoc, sceneIdsInDoc, chooseNextSceneId,
} from '../utils/docSync.ts'

const node = (id: string, title = '', text = '', extra: any = {}) => ({
  id, type: 'card', position: { x: 0, y: 0 }, width: 220, height: 120,
  data: { title, text, color: '#1f2937' }, ...extra,
} as any)

describe('nodesToDoc', () => {
  test('sorts by id, writes [NNN] headings and rewrites [#NNN] to [NNN]', () => {
    const md = nodesToDoc([
      node('002', 'Två', 'Gå till [#001] eller [#003]'),
      node('001', 'Ett', 'Start'),
      node('003', '', ''),
    ])
    expect(md).toBe(
      '## [001] Ett\n\nStart\n\n## [002] Två\n\nGå till [001] eller [003]\n\n## [003]'
    )
  })

  test('excludes idea nodes and group nodes', () => {
    const md = nodesToDoc([
      node('001', 'Ett', ''),
      node('idea-1', 'Idé', 'x', { data: { title: 'Idé', text: 'x', isIdea: true } }),
      { id: 'section-1', type: 'group', position: { x: 0, y: 0 }, data: { label: 'S' } } as any,
    ])
    expect(md).toBe('## [001] Ett')
  })
})

describe('docToNodes', () => {
  const prev = [node('001', 'Ett', 'Start [#002]', { position: { x: 10, y: 20 } }), node('002', 'Två', 'Slut')]
  const base = new Set(['001', '002'])

  test('parses [NNN], [#NNN], escaped \\[NNN\\] and legacy #NNN headings', () => {
    const md = '## [001] Ett\n\nStart [002]\n\n## \\[002\\] Två\n\nSlut'
    const r = docToNodes(md, prev, { nextId: 3, baselineIds: base })
    expect(r.nodes.map(n => n.id)).toEqual(['001', '002'])
    expect(r.nodes[0].data.text).toBe('Start [#002]')
    expect(r.nodes[1].data.title).toBe('Två')
    const legacy = docToNodes('## #001 Ett\n\nStart \\[#002\\]', prev, { nextId: 3, baselineIds: base })
    expect(legacy.nodes[0].data.text).toBe('Start [#002]')
  })

  test('keeps position, size and colour for known ids', () => {
    const r = docToNodes('## [001] Nytt namn\n\nStart [002]\n\n## [002] Två\n\nSlut', prev, { nextId: 3, baselineIds: base })
    expect(r.nodes[0].position).toEqual({ x: 10, y: 20 })
    expect(r.nodes[0].data.title).toBe('Nytt namn')
    expect(r.changed).toBe(true)
  })

  test('ignores non-three-digit brackets', () => {
    const r = docToNodes('## [001] Ett\n\nSe [12] och [1234]', [node('001')], { nextId: 2, baselineIds: new Set(['001']) })
    expect(r.nodes).toHaveLength(1)
    expect(r.nodes[0].data.text).toBe('Se [12] och [1234]')
  })

  test('a reference to a missing scene creates an empty node placed right of its parent', () => {
    const r = docToNodes('## [001] Ett\n\nGå till [004]', [node('001', '', '', { position: { x: 100, y: 50 } })], { nextId: 2, baselineIds: new Set(['001']) })
    expect(r.nodes.map(n => n.id)).toEqual(['001', '004'])
    expect(r.createdIds).toEqual(['004'])
    expect(r.nodes[1].data).toMatchObject({ title: '', text: '' })
    expect(r.nodes[1].position).toEqual({ x: 400, y: 50 })
    expect(r.nextId).toBe(5)
  })

  test('heading without number gets the next free id', () => {
    const r = docToNodes('## [001] Ett\n\nStart\n\n## Ny scen\n\nText', [node('001')], { nextId: 2, baselineIds: new Set(['001']) })
    expect(r.nodes.map(n => n.id)).toEqual(['001', '002'])
    expect(r.nodes[1].data.title).toBe('Ny scen')
    expect(r.nextId).toBe(3)
  })

  test('deleting a heading merges its text upward; node survives only if referenced', () => {
    const referenced = docToNodes('## [001] Ett\n\nStart [002]\n\nSlut', prev, { nextId: 3, baselineIds: base })
    expect(referenced.nodes.map(n => n.id)).toEqual(['001', '002'])
    expect(referenced.nodes[0].data.text).toBe('Start [#002]\n\nSlut')
    expect(referenced.nodes[1].data).toMatchObject({ title: '', text: '' })

    const unreferenced = docToNodes('## [001] Ett\n\nStart\n\nSlut', prev, { nextId: 3, baselineIds: base })
    expect(unreferenced.nodes.map(n => n.id)).toEqual(['001'])
  })

  test('scenes not in the baseline are never touched (graph change during typing)', () => {
    const withNew = [...prev, node('005', 'Från grafen', 'text')]
    const r = docToNodes('## [001] Ett\n\nStart [002]\n\n## [002] Två\n\nSlut', withNew, { nextId: 6, baselineIds: base })
    expect(r.nodes.map(n => n.id)).toEqual(['001', '002', '005'])
    expect(r.nodes[2].data.title).toBe('Från grafen')
  })

  test('idea nodes pass through untouched', () => {
    const idea = node('idea-1', '💡 Idé', 'x', { data: { title: '💡 Idé', text: 'x', isIdea: true } })
    const r = docToNodes('## [001] Ett', [node('001'), idea], { nextId: 2, baselineIds: new Set(['001']) })
    expect(r.nodes.map(n => n.id)).toEqual(['001', 'idea-1'])
  })

  test('round trip is stable and reports changed=false', () => {
    const md = nodesToDoc(prev)
    const r = docToNodes(md, prev, { nextId: 3, baselineIds: base })
    expect(r.changed).toBe(false)
    expect(r.nodes).toBe(prev)
  })
})

describe('normalizeDoc / sceneIdsInDoc', () => {
  test('normalizeDoc equalises escaping and legacy refs', () => {
    expect(normalizeDoc('## \\[001\\] A\n\nx [#002]  \n\n\n\n## [002]')).toBe(normalizeDoc('## [001] A\n\nx [002]\n\n## [002]'))
  })
  test('sceneIdsInDoc lists heading ids', () => {
    expect([...sceneIdsInDoc('## [001] A\n\n[003]\n\n## \\[002\\]')]).toEqual(['001', '002'])
  })
})

describe('chooseNextSceneId', () => {
  test('prefers the first referenced scene that has no title and no text', () => {
    const nodes = [node('003', 'T', 'x [#004] y [#009]'), node('004', '', ''), node('009', 'Har titel', '')]
    expect(chooseNextSceneId(nodes, '003', 10)).toEqual({ id: '004', exists: true, referenced: true })
  })
  test('falls back to nextId when all referenced scenes are written', () => {
    const nodes = [node('003', 'T', 'x [#004]'), node('004', 'Klar', 'text')]
    expect(chooseNextSceneId(nodes, '003', 5)).toEqual({ id: '005', exists: false, referenced: false })
  })
  test('referenced but missing node is reported as not existing', () => {
    const nodes = [node('003', 'T', 'x [#007]')]
    expect(chooseNextSceneId(nodes, '003', 4)).toEqual({ id: '007', exists: false, referenced: true })
  })
  test('no from node gives nextId', () => {
    expect(chooseNextSceneId([], null, 1)).toEqual({ id: '001', exists: false, referenced: false })
  })
})
```

- [ ] **Step 2: Kör testet och se att det fallerar**

Run: `npx jest --testPathPattern=docSync 2>&1 | tail -8`
Expected: FAIL, `Cannot find module '../utils/docSync.ts'`.

- [ ] **Step 3: Skriv implementationen**

```ts
// src/utils/docSync.ts
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

  const ideas = prevNodes.filter(n => !isScene(n) && n.type !== 'group')
  if (prevNodes.some(n => n.type === 'group')) changed = true
  return {
    nodes: changed ? [...result, ...ideas] : prevNodes,
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
```

- [ ] **Step 4: Kör testet och se att det passerar**

Run: `npx jest --testPathPattern=docSync 2>&1 | tail -8`
Expected: PASS, alla tester i `docSync.test.ts` gröna. Om testet "round trip is stable" fallerar på `toBe(prev)`: kontrollera att ingen `changed = true` sätts när texten är identisk.

- [ ] **Step 5: Commit**

```bash
git add src/utils/docSync.ts src/__tests__/docSync.test.ts
git commit -m "feat(sync): pure nodesToDoc/docToNodes with existence rule and baseline guard"
```

---

### Task 2: `graphNav.ts`: välj nod i pilens riktning

**Files:**
- Create: `src/utils/graphNav.ts`
- Test: `src/__tests__/graphNav.test.ts`

**Interfaces:**
- Produces: `pickNodeInDirection(nodes: Node[], fromId: string, dir: 'left'|'right'|'up'|'down'): string | null`, `nodeCenter(n: Node): {x:number;y:number}`.

- [ ] **Step 1: Skriv det fallerande testet**

```ts
// src/__tests__/graphNav.test.ts
import { pickNodeInDirection, nodeCenter } from '../utils/graphNav.ts'

const n = (id: string, x: number, y: number) => ({
  id, position: { x, y }, width: 200, height: 100, data: {},
} as any)

describe('pickNodeInDirection', () => {
  const nodes = [n('001', 0, 0), n('002', 300, 0), n('003', 300, 400), n('004', -300, 0), n('005', 0, -300)]

  test('right picks the node straight ahead even if a diagonal one is nearer', () => {
    // 006 is diagonally closer in raw distance but far across; straight one wins.
    const set = [n('001', 0, 0), n('002', 600, 0), n('006', 250, 250)]
    expect(pickNodeInDirection(set, '001', 'right')).toBe('002')
  })
  test('left, up, down', () => {
    expect(pickNodeInDirection(nodes, '001', 'left')).toBe('004')
    expect(pickNodeInDirection(nodes, '001', 'up')).toBe('005')
    expect(pickNodeInDirection(nodes, '001', 'down')).toBe('003')
  })
  test('no candidate in that direction gives null', () => {
    expect(pickNodeInDirection([n('001', 0, 0), n('002', 300, 0)], '002', 'right')).toBeNull()
  })
  test('unknown from id gives null', () => {
    expect(pickNodeInDirection(nodes, '999', 'right')).toBeNull()
  })
  test('nodeCenter uses width/height', () => {
    expect(nodeCenter(n('001', 10, 20))).toEqual({ x: 110, y: 70 })
  })
})
```

- [ ] **Step 2: Kör testet och se att det fallerar**

Run: `npx jest --testPathPattern=graphNav 2>&1 | tail -5`
Expected: FAIL, `Cannot find module '../utils/graphNav.ts'`.

- [ ] **Step 3: Skriv implementationen**

```ts
// src/utils/graphNav.ts
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
```

- [ ] **Step 4: Kör testet och se att det passerar**

Run: `npx jest --testPathPattern=graphNav 2>&1 | tail -5`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/utils/graphNav.ts src/__tests__/graphNav.test.ts
git commit -m "feat(graph): pickNodeInDirection for cmd+arrow navigation"
```

---

### Task 3: `SceneRef` och `BracketAutoClose` (TipTap)

**Files:**
- Create: `src/SceneRef.ts`, `src/BracketAutoClose.ts`
- Delete: `src/ArrowLink.ts`, `src/__tests__/ArrowLink.test.ts`
- Test: `src/__tests__/SceneRef.test.ts`

**Interfaces:**
- Produces: default-exporterade TipTap-extensions `SceneRef` (nodnamn `sceneRef`, attribut `id`) och `BracketAutoClose`. Pillen renderas som `<a data-scene-id="NNN" class="node-link" href="#NNN">[NNN]</a>`. `DocPane` klickhanterare läser `href`.

- [ ] **Step 1: Skriv det fallerande testet**

```ts
// src/__tests__/SceneRef.test.ts
import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import SceneRef from '../SceneRef.ts'
import BracketAutoClose from '../BracketAutoClose.ts'

function makeEditor(content: string) {
  return new Editor({ extensions: [StarterKit, Markdown, SceneRef, BracketAutoClose], content })
}

describe('SceneRef', () => {
  test('[004] in a paragraph becomes a pill and serialises back as [004]', () => {
    const editor = makeEditor('Gå till [004] nu')
    expect(editor.getHTML()).toContain('data-scene-id="004"')
    expect(editor.getHTML()).toContain('>[004]<')
    expect(editor.storage.markdown.getMarkdown()).toBe('Gå till [004] nu')
  })

  test('legacy [#004] is accepted and rewritten to [004]', () => {
    const editor = makeEditor('Gå till [#004]')
    expect(editor.getHTML()).toContain('data-scene-id="004"')
    expect(editor.storage.markdown.getMarkdown()).toBe('Gå till [004]')
  })

  test('[003] in a heading stays plain text', () => {
    const editor = makeEditor('## [003] Titel')
    expect(editor.getHTML()).not.toContain('data-scene-id')
    expect(editor.getHTML()).toContain('[003] Titel')
  })

  test('[12] is not a reference', () => {
    const editor = makeEditor('Se [12]')
    expect(editor.getHTML()).not.toContain('data-scene-id')
  })
})

describe('BracketAutoClose', () => {
  test('typing [ inserts [] with the cursor inside', () => {
    const editor = makeEditor('')
    editor.commands.focus('end')
    editor.view.someProp('handleTextInput', f => f(editor.view, 1, 1, '['))
    expect(editor.getText()).toBe('[]')
    expect(editor.state.selection.from).toBe(2)
  })

  test('typing ] after [004 inside [] completes a pill', () => {
    const editor = makeEditor('')
    editor.commands.focus('end')
    editor.view.someProp('handleTextInput', f => f(editor.view, 1, 1, '['))
    // Plain text insert (insertContentAt would run the markdown parser).
    editor.view.dispatch(editor.state.tr.insertText('004', 2))
    const pos = editor.state.selection.from
    editor.view.someProp('handleTextInput', f => f(editor.view, pos, pos, ']'))
    expect(editor.getHTML()).toContain('data-scene-id="004"')
    expect(editor.storage.markdown.getMarkdown()).toBe('[004]')
  })

  test('typing ] when the next char is ] just skips over it', () => {
    const editor = makeEditor('')
    editor.commands.focus('end')
    editor.view.someProp('handleTextInput', f => f(editor.view, 1, 1, '['))
    editor.view.dispatch(editor.state.tr.insertText('ab', 2))
    const pos = editor.state.selection.from
    editor.view.someProp('handleTextInput', f => f(editor.view, pos, pos, ']'))
    expect(editor.getText()).toBe('[ab]')
    expect(editor.state.selection.from).toBe(pos + 1)
  })
})
```

- [ ] **Step 2: Kör testet och se att det fallerar**

Run: `npx jest --testPathPattern=SceneRef 2>&1 | tail -5`
Expected: FAIL, `Cannot find module '../SceneRef.ts'`.

- [ ] **Step 3: Skriv `SceneRef.ts`**

```ts
// src/SceneRef.ts
import { Node, mergeAttributes, InputRule, nodePasteRule } from '@tiptap/core'

// SceneRef is an inline atom rendering a scene reference "[004]" as a pill
// that links to scene 004. Stored node text uses "[#004]"; the document uses
// "[004]". Both spellings are accepted on the way in.
const REF_INPUT = /\[#?(\d{3})\]$/
const REF_ALL = /\[#?(\d{3})\]/g

const SceneRef = Node.create({
  name: 'sceneRef',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-scene-id'),
        renderHTML: attributes => ({
          'data-scene-id': attributes.id,
          href: `#${attributes.id}`,
          class: 'node-link',
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-scene-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const id = HTMLAttributes['data-scene-id'] || HTMLAttributes.id
    return ['a', mergeAttributes(HTMLAttributes), `[${id}]`]
  },

  addInputRules() {
    return [
      new InputRule({
        find: REF_INPUT,
        handler: ({ state, range, match }) => {
          // Headings keep "[003] Titel" as plain text.
          if (state.selection.$from.parent.type.name === 'heading') return null
          state.tr.replaceWith(range.from, range.to, this.type.create({ id: match[1] }))
        },
      }),
    ]
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: REF_ALL,
        type: this.type,
        getAttributes: match => ({ id: match[1] }),
      }),
    ]
  },

  addStorage() {
    return {
      markdown: {
        serialize: (state: any, node: any) => {
          state.write(`[${node.attrs.id}]`)
        },
        parse: {
          updateDOM(element: HTMLElement) {
            // Only inside body text, never inside headings.
            element.querySelectorAll('p, li, blockquote').forEach(el => {
              if (!/\[#?\d{3}\]/.test(el.innerHTML)) return
              el.innerHTML = el.innerHTML.replace(REF_ALL, (_m, id) =>
                `<a data-scene-id="${id}" class="node-link" href="#${id}">[${id}]</a>`
              )
            })
          },
        },
      },
    }
  },
})

export default SceneRef
```

- [ ] **Step 4: Skriv `BracketAutoClose.ts`**

```ts
// src/BracketAutoClose.ts
import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'

// "[" inserts "[]" with the cursor inside. "]" either finishes a scene
// reference ("[004" + "]" -> pill) or skips over an existing "]".
const BracketAutoClose = Extension.create({
  name: 'bracketAutoClose',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('bracketAutoClose'),
        props: {
          handleTextInput(view, from, to, text) {
            const { state } = view
            if (from !== to) return false
            if (text === '[') {
              const tr = state.tr.insertText('[]', from, to)
              tr.setSelection(TextSelection.create(tr.doc, from + 1))
              view.dispatch(tr)
              return true
            }
            if (text === ']') {
              const after = state.doc.textBetween(from, Math.min(from + 1, state.doc.content.size), '\0', '\0')
              if (after !== ']') return false
              const $from = state.doc.resolve(from)
              const before = $from.parent.textBetween(0, $from.parentOffset, '\0', '\0')
              const m = before.match(/\[#?(\d{3})$/)
              const sceneRef = state.schema.nodes.sceneRef
              if (m && sceneRef && $from.parent.type.name !== 'heading') {
                const start = from - m[0].length
                const tr = state.tr.replaceWith(start, from + 1, sceneRef.create({ id: m[1] }))
                view.dispatch(tr)
                return true
              }
              view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, from + 1)))
              return true
            }
            return false
          },
        },
      }),
    ]
  },
})

export default BracketAutoClose
```

- [ ] **Step 5: Ta bort ArrowLink och kör testet**

```bash
git rm -q src/ArrowLink.ts src/__tests__/ArrowLink.test.ts
```

Run: `npx jest --testPathPattern=SceneRef 2>&1 | tail -8`
Expected: PASS. Om "[003] in a heading stays plain text" fallerar för att `updateDOM` inte körs: kontrollera att tiptap-markdown kallar `parse.updateDOM` för noder med `addStorage().markdown.parse` (det gör den för `ArrowLink` idag, se den gamla testfilen i git-historiken).

`DocPane.jsx` importerar fortfarande `ArrowLink` just nu; den byts i Task 4. Kör därför bara `--testPathPattern=SceneRef` i detta steg.

- [ ] **Step 6: Commit**

```bash
git add src/SceneRef.ts src/BracketAutoClose.ts src/__tests__/SceneRef.test.ts
git commit -m "feat(doc): SceneRef pill for [NNN] and bracket auto-close; remove ArrowLink"
```

---

### Task 4: `DocPane` läser från noder och skriver tillbaka via `onDocChange`

**Files:**
- Modify: `src/DocPane.jsx` (hela komponenten skrivs om; toolbar och outline behålls)
- Modify: `src/ActiveNodeHighlight.ts:37-43`
- Test: `src/__tests__/DocPane.test.jsx` (skrivs om)

**Interfaces:**
- Consumes: `nodesToDoc`, `normalizeDoc`, `sceneIdsInDoc`, `isIdeaNode` (Task 1); `SceneRef`, `BracketAutoClose` (Task 3).
- Produces: `DocPane` props:
  - `nodes: Node[]`
  - `onDocChange(markdown: string, baselineIds: Set<string>): void`
  - `onNewScene(fromId: string | null): string | null` (returnerar nya scenens id)
  - `activeNodeId`, `onSelectNode(id)`, `full`, `focusMode`, `setFocusMode`, `isSaving` (som idag)
  - `nextId` tas bort som prop (toolbarens plusknapp anropar `onNewScene`).

- [ ] **Step 1: Skriv om testet**

```jsx
// src/__tests__/DocPane.test.jsx
import { render, screen, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import DocPane from '../DocPane.jsx'

beforeAll(() => {
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const node = (id, title = '', text = '') => ({
  id, type: 'card', position: { x: 0, y: 0 }, width: 220, height: 120,
  data: { title, text, color: '#1f2937' },
})

const baseProps = {
  onDocChange: () => {},
  onNewScene: () => null,
  activeNodeId: null,
  onSelectNode: () => {},
  full: true,
  focusMode: false,
  setFocusMode: () => {},
}

describe('DocPane', () => {
  it('renders outline and headings from nodes', () => {
    render(<DocPane {...baseProps} nodes={[node('001', 'Första', 'Lorem'), node('002', 'Andra', 'Dolor')]} />)
    expect(screen.getAllByText('Första').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Andra').length).toBeGreaterThan(0)
    expect(screen.getAllByText('[001]').length).toBeGreaterThan(0)
  })

  it('shows "(tom)" in the outline for an empty scene', () => {
    render(<DocPane {...baseProps} nodes={[node('001', 'A', 'x [#002]'), node('002')]} />)
    expect(screen.getByText('(tom)')).toBeInTheDocument()
  })

  it('updates the editor when nodes change without calling onDocChange', async () => {
    const onDocChange = jest.fn()
    const { rerender, container } = render(
      <DocPane {...baseProps} onDocChange={onDocChange} nodes={[node('001', 'Första', 'Lorem')]} />
    )
    rerender(<DocPane {...baseProps} onDocChange={onDocChange} nodes={[node('001', 'Första', 'Lorem'), node('002', 'Ny från grafen', '')]} />)
    await waitFor(() => expect(container.querySelector('.ProseMirror').textContent).toContain('Ny från grafen'))
    await act(() => new Promise(r => setTimeout(r, 400)))
    expect(onDocChange).not.toHaveBeenCalled()
  })

  it('calls onDocChange once (debounced) with baseline ids when the user edits', async () => {
    jest.useFakeTimers()
    const onDocChange = jest.fn()
    const { container } = render(
      <DocPane {...baseProps} onDocChange={onDocChange} nodes={[node('001', 'Första', 'Lorem'), node('002', 'Andra', '')]} />
    )
    const pm = container.querySelector('.ProseMirror')
    // Simulate typing through the ProseMirror view exposed for tests.
    const editor = pm.__tiptapEditor
    act(() => { editor.commands.insertContentAt(editor.state.doc.content.size, 'Mer text') })
    act(() => { editor.commands.insertContentAt(editor.state.doc.content.size, ' och mer') })
    act(() => { jest.advanceTimersByTime(350) })
    expect(onDocChange).toHaveBeenCalledTimes(1)
    const [md, baseline] = onDocChange.mock.calls[0]
    expect(md).toContain('Mer text och mer')
    expect([...baseline]).toEqual(['001', '002'])
    jest.useRealTimers()
  })

  it('does NOT render status bar when full=false', () => {
    render(<DocPane {...baseProps} full={false} nodes={[node('001', 'Hej', 'Något')]} />)
    expect(screen.queryByText(/Sparad/)).not.toBeInTheDocument()
  })

  it('calls onSelectNode when a ref pill is clicked', async () => {
    const onSelectNode = jest.fn()
    const { container } = render(
      <DocPane {...baseProps} onSelectNode={onSelectNode} nodes={[node('001', 'Hej', 'Länk till [#002].'), node('002')]} />
    )
    await waitFor(() => expect(container.querySelector('a.node-link[href="#002"]')).toBeTruthy())
    container.querySelector('a.node-link[href="#002"]').click()
    expect(onSelectNode).toHaveBeenCalledWith('002')
  })
})
```

- [ ] **Step 2: Kör testet och se att det fallerar**

Run: `npx jest --testPathPattern=DocPane 2>&1 | tail -8`
Expected: FAIL (props finns inte, `ArrowLink` saknas).

- [ ] **Step 3: Skriv om `DocPane.jsx`**

Byt ut allt från `import`-raderna till och med slutet av `DocPane`-funktionen (behåll `DocToolbar` och `Outline` men ändra dem enligt nedan).

```jsx
// src/DocPane.jsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import { Extension } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Typography from '@tiptap/extension-typography'
import Highlight from '@tiptap/extension-highlight'
import { Markdown } from 'tiptap-markdown'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import {
  PanelLeftClose, PanelLeftOpen, Bold, Italic, Underline as UnderlineIcon,
  List, Link as LinkIcon, Plus, Maximize2,
} from 'lucide-react'
import CustomLink from './CustomLink.ts'
import SceneRef from './SceneRef.ts'
import BracketAutoClose from './BracketAutoClose.ts'
import ActiveNodeHighlight from './ActiveNodeHighlight.ts'
import EditorBubbleMenu from './EditorBubbleMenu.jsx'
import { nodesToDoc, normalizeDoc, sceneIdsInDoc, isIdeaNode } from './utils/docSync.ts'
import 'tippy.js/dist/tippy.css'

const DEBOUNCE_MS = 300
const HEADING_ID = /^\[?#?(\d{3})\]?/

/** Id of the scene heading at or above the cursor, or null. */
function sceneIdAtSelection(state) {
  const { $from } = state.selection
  let found = null
  state.doc.nodesBetween(0, $from.pos, (node, pos) => {
    if (node.type.name === 'heading' && node.attrs.level === 2 && pos <= $from.pos) {
      const m = node.textContent.match(HEADING_ID)
      if (m) found = m[1]
    }
    return true
  })
  return found
}

/** Positions (end of heading text) for every h2, in document order, with ids. */
function headingPositions(doc) {
  const out = []
  doc.descendants((node, pos) => {
    if (node.type.name === 'heading' && node.attrs.level === 2) {
      const m = node.textContent.match(HEADING_ID)
      out.push({ id: m ? m[1] : null, end: pos + node.nodeSize - 1 })
      return false
    }
    return true
  })
  return out
}

export default function DocPane({
  nodes,
  onDocChange,
  onNewScene,
  activeNodeId, onSelectNode,
  full = false,
  focusMode = false,
  setFocusMode,
  isSaving = false,
}) {
  const [outlineHidden, setOutlineHidden] = useState(false)
  const scrollRef = useRef(null)
  const activeNodeIdRef = useRef(activeNodeId)
  const fromScrollRef = useRef(null)
  useEffect(() => { activeNodeIdRef.current = activeNodeId }, [activeNodeId])

  // ---- Sync state -------------------------------------------------------
  // markdown: what the nodes say the document should be.
  const markdown = useMemo(() => nodesToDoc(nodes), [nodes])
  // lastMarkdownRef: the markdown last set into or read out of the editor.
  const lastMarkdownRef = useRef('')
  // baselineRef: the markdown the user started editing from (set on every
  // graph->doc write). Its scene ids travel with each onDocChange.
  const baselineRef = useRef('')
  const debounceRef = useRef(null)
  const pendingRef = useRef(null)          // { md, baselineIds } awaiting debounce
  const pendingCursorRef = useRef(null)    // scene id whose heading should get the cursor
  const callbacksRef = useRef({ onDocChange, onNewScene, onSelectNode })
  useEffect(() => { callbacksRef.current = { onDocChange, onNewScene, onSelectNode } })

  const flushPending = useCallback(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
    const p = pendingRef.current
    pendingRef.current = null
    if (p) callbacksRef.current.onDocChange?.(p.md, p.baselineIds)
  }, [])

  // Keyboard commands that need the editor: cmd+Enter (new scene) and
  // cmd+Up/Down (previous/next scene). Callbacks are read through refs so the
  // extension is created once.
  const DocKeys = useMemo(() => Extension.create({
    name: 'docKeys',
    addKeyboardShortcuts() {
      return {
        'Mod-Enter': ({ editor }) => {
          flushPending()
          const fromId = sceneIdAtSelection(editor.state)
          const id = callbacksRef.current.onNewScene?.(fromId)
          if (id) pendingCursorRef.current = id
          return true
        },
        'Mod-ArrowUp': ({ editor }) => {
          const hs = headingPositions(editor.state.doc)
          const pos = editor.state.selection.from
          const prev = [...hs].reverse().find(h => h.end < pos - 1)
          if (!prev) return true
          editor.chain().focus().setTextSelection(prev.end).run()
          return true
        },
        'Mod-ArrowDown': ({ editor }) => {
          const hs = headingPositions(editor.state.doc)
          const pos = editor.state.selection.from
          const next = hs.find(h => h.end > pos)
          if (!next) return true
          editor.chain().focus().setTextSelection(next.end).run()
          return true
        },
      }
    },
  }), [flushPending])

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      CustomLink.configure({ openOnClick: false }),
      SceneRef,
      BracketAutoClose,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Börja skriva din berättelse...' }),
      CharacterCount,
      Typography,
      Highlight,
      Markdown.configure({ html: false }),
      BubbleMenuExtension,
      ActiveNodeHighlight,
      DocKeys,
    ],
    content: '',
    onUpdate({ editor }) {
      const md = editor.storage.markdown.getMarkdown()
      lastMarkdownRef.current = md
      pendingRef.current = { md, baselineIds: sceneIdsInDoc(baselineRef.current) }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(flushPending, DEBOUNCE_MS)
    },
    editorProps: {
      attributes: { class: 'doc-page' },
    },
  })

  // Expose the editor on the DOM node for tests.
  useEffect(() => {
    if (!editor) return
    const dom = editor.view?.dom
    if (dom) dom.__tiptapEditor = editor
  }, [editor])

  // Graph -> Doc. Runs whenever the nodes' markdown differs from what the
  // editor holds. Uses emitUpdate=false so onUpdate never fires for it.
  useEffect(() => {
    if (!editor) return
    if (normalizeDoc(markdown) === normalizeDoc(lastMarkdownRef.current)) {
      baselineRef.current = markdown
      return
    }
    // A pending doc edit must reach the nodes first; the resulting nodes
    // change re-runs this effect with fresh markdown.
    if (pendingRef.current) { flushPending(); return }

    const { from, to } = editor.state.selection
    const scrollTop = scrollRef.current?.scrollTop ?? 0
    const wasInHeading = editor.state.selection.$from.parent.type.name === 'heading'
    const headingId = wasInHeading ? sceneIdAtSelection(editor.state) : null

    editor.commands.setContent(markdown, false)
    lastMarkdownRef.current = markdown
    baselineRef.current = markdown

    const targetId = pendingCursorRef.current || headingId
    pendingCursorRef.current = null
    const max = editor.state.doc.content.size
    if (targetId) {
      const h = headingPositions(editor.state.doc).find(h => h.id === targetId)
      if (h) editor.chain().focus().setTextSelection(h.end).run()
    } else if (editor.isFocused) {
      editor.commands.setTextSelection({ from: Math.min(from, max), to: Math.min(to, max) })
    }
    if (scrollRef.current) scrollRef.current.scrollTop = scrollTop
  }, [editor, markdown, flushPending])

  useEffect(() => () => { if (debounceRef.current) clearTimeout(debounceRef.current) }, [])

  // Outline straight from nodes.
  const outlineEntries = useMemo(
    () => nodes
      .filter(n => n.type !== 'group' && !isIdeaNode(n))
      .sort((a, b) => a.id.localeCompare(b.id))
      .map(n => ({ id: n.id, title: (n.data?.title || '').trim(), empty: !(n.data?.title || '').trim() && !(n.data?.text || '').trim() })),
    [nodes]
  )

  const tagHeadings = useCallback((wantId) => {
    const container = scrollRef.current
    if (!container) return null
    let match = null
    container.querySelectorAll('h2').forEach(h => {
      const m = (h.textContent || '').match(HEADING_ID)
      if (!m) return
      if (h.getAttribute('data-node-id') !== m[1]) h.setAttribute('data-node-id', m[1])
      if (wantId && m[1] === wantId) match = h
    })
    return match
  }, [])

  // Graph -> Doc scroll on active scene (unchanged behaviour).
  useEffect(() => {
    if (!activeNodeId) return
    const container = scrollRef.current
    if (!container) return
    if (fromScrollRef.current === activeNodeId) {
      fromScrollRef.current = null
      const target = tagHeadings(activeNodeId)
      if (target) {
        container.querySelectorAll('h2.is-active').forEach(el => el.classList.remove('is-active'))
        target.classList.add('is-active')
      }
      return
    }
    requestAnimationFrame(() => {
      const target = tagHeadings(activeNodeId)
      if (!target) return
      const cRect = container.getBoundingClientRect()
      const hRect = target.getBoundingClientRect()
      container.scrollTop += hRect.top - cRect.top - 16
      container.querySelectorAll('h2.is-active').forEach(el => el.classList.remove('is-active'))
      target.classList.add('is-active')
    })
  }, [activeNodeId, tagHeadings])

  // Doc -> Graph: topmost visible heading becomes the active scene (unchanged
  // except for the id regex).
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    let io = null
    let raf = 0
    const attach = () => {
      const h2s = [...container.querySelectorAll('h2')]
      io?.disconnect()
      if (!h2s.length) return
      io = new IntersectionObserver(
        entries => {
          const visible = entries
            .filter(e => e.isIntersecting)
            .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
          if (!visible.length) return
          const m = (visible[0].target.textContent || '').match(HEADING_ID)
          const id = m?.[1]
          if (id && id !== activeNodeIdRef.current) {
            fromScrollRef.current = id
            callbacksRef.current.onSelectNode?.(id)
          }
        },
        { root: container, rootMargin: '-60px 0px -60% 0px', threshold: 0 }
      )
      h2s.forEach(h => io.observe(h))
    }
    const schedule = () => { cancelAnimationFrame(raf); raf = requestAnimationFrame(attach) }
    schedule()
    const mo = new MutationObserver(schedule)
    mo.observe(container, { childList: true, subtree: true })
    return () => { cancelAnimationFrame(raf); mo.disconnect(); io?.disconnect() }
  }, [])

  // Pill click -> select scene.
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const onClick = (e) => {
      const a = e.target.closest('a.node-link')
      if (!a) return
      const m = (a.getAttribute('href') || '').match(/^#(\d{3})$/)
      if (m) {
        e.preventDefault()
        callbacksRef.current.onSelectNode?.(m[1])
      }
    }
    container.addEventListener('click', onClick)
    return () => container.removeEventListener('click', onClick)
  }, [])

  const wordCount = editor?.storage.characterCount?.words?.() ?? 0
  const sectionCount = outlineEntries.length

  const newSceneFromToolbar = () => {
    if (!editor) return
    flushPending()
    const id = onNewScene?.(sceneIdAtSelection(editor.state))
    if (id) pendingCursorRef.current = id
  }

  return (
    <div className="doc-pane">
      <DocToolbar
        editor={editor}
        outlineHidden={outlineHidden}
        setOutlineHidden={setOutlineHidden}
        full={full}
        focusMode={focusMode}
        setFocusMode={setFocusMode}
        onNewScene={newSceneFromToolbar}
      />

      <div className="doc-body">
        <Outline
          entries={outlineEntries}
          activeId={activeNodeId}
          hidden={outlineHidden}
          onPick={onSelectNode}
        />
        <div className="doc-scroll" ref={scrollRef}>
          <EditorContent editor={editor} />
        </div>
      </div>

      {full && !focusMode && (
        <div className="doc-status">
          <span>{sectionCount} scener</span>
          <span className="sep">·</span>
          <span>{wordCount} ord</span>
          <span className="sep">·</span>
          <span className="saved">{isSaving ? '● Sparar…' : '● Sparad'}</span>
          <span style={{ flex: 1 }} />
          <span>v{__APP_VERSION__}</span>
        </div>
      )}

      {editor && <EditorBubbleMenu editor={editor} />}
    </div>
  )
}
```

I `DocToolbar`: byt prop `nextId` mot `onNewScene`, ta bort `insertNewSection` och låt plusknappen anropa `onNewScene`:

```jsx
function DocToolbar({ editor, outlineHidden, setOutlineHidden, full, focusMode, setFocusMode, onNewScene }) {
  if (!editor) return <div className="doc-toolbar" />
  // ... headingLevel / onHeadingChange oförändrade ...
  // Ta bort insertNewSection. Knappen:
  //   <button className="tb-btn" onClick={onNewScene} title="Ny scen (⌘Enter)" aria-label="Ny scen"><Plus /></button>
```

I `Outline`: visa `[NNN]` som id-tag och `(tom)` för tomma scener:

```jsx
            <button
              className={`doc-outline-item${activeId === e.id ? ' active' : ''}`}
              onClick={() => onPick?.(e.id)}
              title={e.title || `[${e.id}]`}
            >
              <span className="id-tag">[{e.id}]</span>
              {e.title || (e.empty ? '(tom)' : '(utan titel)')}
            </button>
```

- [ ] **Step 4: Uppdatera `ActiveNodeHighlight.ts` så den känner igen `[NNN]`-rubriker**

Ersätt raderna som bygger `target` och jämför:

```ts
            const re = new RegExp(`^\\[?#?${activeId}\\]?`)
            doc.descendants((node, pos) => {
              if (node.type.name === 'heading' && re.test(node.textContent)) {
```

(ta bort raden `const target = \`#${activeId}\``).

- [ ] **Step 5: Kör DocPane-testet**

Run: `npx jest --testPathPattern=DocPane 2>&1 | tail -12`
Expected: PASS. Kända fallgropar:
- Om "updates the editor when nodes change" fallerar: kontrollera att `Markdown`-extensionen låter `setContent` ta markdown (den gör det idag i den gamla koden).
- Om debounce-testet ser 0 anrop: `jest.useFakeTimers()` måste anropas före `render`.
- Om `pm.__tiptapEditor` är `undefined`: `useEditor` skapar editorn i en effekt. Vänta med `await waitFor(() => expect(container.querySelector('.ProseMirror').__tiptapEditor).toBeTruthy())` innan fake timers slås på, eller slå på fake timers först och kör `act(() => jest.runOnlyPendingTimers())` efter `render`.

- [ ] **Step 6: Commit**

```bash
git add src/DocPane.jsx src/ActiveNodeHighlight.ts src/__tests__/DocPane.test.jsx
git commit -m "feat(doc): DocPane renders from nodes, writes back via onDocChange with baseline guard"
```

---

### Task 5: `App.jsx`: koppla in synken, ta bort gammal enkelriktad synk

**Files:**
- Modify: `src/App.jsx`
- Delete: `src/useLinearParser.ts`, `src/utils/linearConversion.ts`, `src/__tests__/LinearConversion.test.ts`, `src/__tests__/LinearParser.test.ts`

**Interfaces:**
- Consumes: `docToNodes`, `chooseNextSceneId` (Task 1); `DocPane`-props (Task 4).
- Produces: `handleDocChange(md, baselineIds)`, `createLinkedScene(fromId): string | null`, `nextIdRef`, `viewportRef` (fylls i Task 7), `viewportCenterPosition()`.

- [ ] **Step 1: Byt importer**

Ta bort:
```js
import { convertNodesToLinearText } from './utils/linearConversion.ts'
```
Lägg till:
```js
import { docToNodes, chooseNextSceneId } from './utils/docSync.ts'
import { pickNodeInDirection, nodeCenter } from './utils/graphNav.ts'
```

- [ ] **Step 2: Ta bort gammalt synk-tillstånd**

Ta bort dessa rader/block i `App`:
- `const [linearText, setLinearText] = useState('')`
- `const [docReloadKey, setDocReloadKey] = useState(0)` med kommentaren ovanför
- Hela blocket `const linearInitialized = useRef(false)` + effekten som anropar `setLinearText(convertNodesToLinearText(nodes))`
- Effekten som lyssnar på `'nodes-updated-from-parser'`
- Alla rader `linearInitialized.current = false`, `setLinearText(...)`, `setDocReloadKey(k => k + 1)` i `handleProjectSwitch`, `duplicateProject`, `importProject`, `restoreVersion`, `startNewProject`.

Lägg till strax efter `const [nextId, setNextId] = useState(1)`:
```js
  const nextIdRef = useRef(1)
  useEffect(() => { nextIdRef.current = nextId }, [nextId])
  const viewportRef = useRef(null)   // ReactFlow instance, set by GraphPane's ViewportBridge
  const [focusTitleId, setFocusTitleId] = useState(null)
```

- [ ] **Step 3: Lägg till `viewportCenterPosition` och `handleDocChange`**

Placera dem **före `addNode`** (direkt efter `onReconnectEnd`). Ordningen spelar roll: `useCallback`-beroendelistor utvärderas under render, så en funktion måste vara definierad ovanför den som listar den som beroende.

```js
  // Centre of the visible graph, in flow coordinates, offset so a default-size
  // node lands centred. Falls back to origin if the graph isn't mounted.
  const viewportCenterPosition = useCallback(() => {
    const el = document.getElementById('graph')
    const rf = viewportRef.current
    if (!el || !rf) return { x: 0, y: 0 }
    const r = el.getBoundingClientRect()
    const p = rf.screenToFlowPosition({ x: r.left + r.width / 2, y: r.top + r.height / 2 })
    return { x: p.x - DEFAULT_NODE_WIDTH / 2, y: p.y - DEFAULT_NODE_HEIGHT / 2 }
  }, [])

  // Doc -> nodes. Functional update so a graph change that raced the debounce
  // is merged, not overwritten; baselineIds limits removals to scenes the doc
  // actually showed.
  const handleDocChange = useCallback((md, baselineIds) => {
    beginEdit('doc')
    const fallbackPosition = viewportCenterPosition()
    setNodes(ns => {
      const r = docToNodes(md, ns, { nextId: nextIdRef.current, baselineIds, fallbackPosition })
      if (!r.changed) return ns
      setEdges(scanEdges(r.nodes))
      if (r.nextId !== nextIdRef.current) { nextIdRef.current = r.nextId; setNextId(r.nextId) }
      return r.nodes
    })
  }, [beginEdit, viewportCenterPosition])
```

- [ ] **Step 4: Lägg till `createLinkedScene` och `focusScene`**

Placera dem **efter `handleLinearSelect`** (de beror på `selectNode`, som definieras strax före). Samma regel som i steg 3: beroenden måste stå ovanför.

```js
  // Select a scene in graph + doc, mark it selected in ReactFlow and pan to it
  // if it is off-screen.
  const focusScene = useCallback((id, { focusTitle = false } = {}) => {
    setNodes(ns => ns.map(n => ({ ...n, selected: n.id === id })))
    const node = nodes.find(n => n.id === id)
    if (node) selectNode(id, node.data)
    if (focusTitle) setFocusTitleId(id)
    const rf = viewportRef.current
    const el = document.getElementById('graph')
    if (rf && el && node) {
      const c = nodeCenter(node)
      const s = rf.flowToScreenPosition(c)
      const r = el.getBoundingClientRect()
      const inside = s.x > r.left + 40 && s.x < r.right - 40 && s.y > r.top + 40 && s.y < r.bottom - 40
      if (!inside) {
        const z = rf.getZoom()
        rf.setCenter(c.x, c.y, { zoom: z, duration: 200 })
      }
    }
  }, [nodes, selectNode])

  // cmd+Enter: next scene linked from `fromId` (or a free one), selected, with
  // the title ready for typing. Returns the scene id.
  const createLinkedScene = useCallback((fromId) => {
    const pick = chooseNextSceneId(nodes, fromId, nextId)
    pushUndoState()
    const from = fromId ? nodes.find(n => n.id === fromId) : null
    setNodes(ns => {
      let updated = ns
      if (from && !pick.referenced) {
        updated = updated.map(n => {
          if (n.id !== fromId) return n
          const t = n.data.text || ''
          const sep = t.trim() ? ' ' : ''
          return { ...n, data: { ...n.data, text: `${t}${sep}[#${pick.id}]` } }
        })
      }
      if (!pick.exists) {
        const count = from ? (spawnCounts[fromId] || 0) : 0
        const offset = count === 0 ? 0 : Math.ceil(count / 2) * 150 * (count % 2 === 0 ? 1 : -1)
        const position = from
          ? { x: from.position.x + 300, y: from.position.y + offset }
          : viewportCenterPosition()
        updated = [...updated, {
          id: pick.id,
          type: 'card',
          position,
          data: { text: '', title: '', color: '#1f2937' },
          width: DEFAULT_NODE_WIDTH,
          height: DEFAULT_NODE_HEIGHT,
        }]
      }
      updated = updated.map(n => ({ ...n, selected: n.id === pick.id }))
      setEdges(scanEdges(updated))
      return updated
    })
    if (!pick.exists) {
      const num = Number(pick.id)
      if (num >= nextIdRef.current) { nextIdRef.current = num + 1; setNextId(num + 1) }
      if (from) setSpawnCounts(c => ({ ...c, [fromId]: (c[fromId] || 0) + 1 }))
    }
    setCurrentId(pick.id)
    setActiveNodeId(pick.id)
    setText('')
    setTitle('')
    setFocusTitleId(pick.id)
    return pick.id
  }, [nodes, nextId, spawnCounts, pushUndoState, viewportCenterPosition])
```

Ändra `addNode` så att den placerar rätt när ingen nod är markerad: ersätt blocket under `} else {` (som läser `graphEl.getBoundingClientRect()`) med:
```js
      } else {
        position = viewportCenterPosition()
      }
```
`addNode` är en vanlig funktion och ser `viewportCenterPosition` i scope.

- [ ] **Step 5: Tangentbord: ⌘Enter och ⌘+pil**

I `useEffect`-handlern som börjar `const handler = e => {` lägg till före `else if ((e.metaKey || e.ctrlKey) && e.key === 'n')`:

```js
        } else if ((e.metaKey || e.ctrlKey) && e.key === 'Enter') {
          if (e.target.closest?.('.ProseMirror')) return   // DocPane owns it there
          e.preventDefault()
          createLinkedScene(currentId)
        } else if (
          (e.metaKey || e.ctrlKey) &&
          ['ArrowLeft', 'ArrowRight', 'ArrowUp', 'ArrowDown'].includes(e.key)
        ) {
          if (e.target.closest?.('.ProseMirror')) return
          if (e.target.closest?.('input, textarea') && !e.target.closest?.('.node-card')) return
          if (!currentId) return
          const dir = { ArrowLeft: 'left', ArrowRight: 'right', ArrowUp: 'up', ArrowDown: 'down' }[e.key]
          const id = pickNodeInDirection(nodes, currentId, dir)
          if (!id) return
          e.preventDefault()
          focusScene(id)
```

Uppdatera dependency-listan till:
```js
    }, [undo, redo, addNode, duplicateNode, deleteNode, saveVersion, createLinkedScene, focusScene, currentId, nodes])
```

- [ ] **Step 6: Koppla DocPane och GraphPane**

Båda `<DocPane ...>`-anropen (split och text) blir:

```jsx
              <DocPane
                nodes={nodes}
                onDocChange={handleDocChange}
                onNewScene={createLinkedScene}
                activeNodeId={activeNodeId}
                onSelectNode={handleLinearSelect}
                full={false}
              />
```
respektive med `full={true} focusMode={focusMode} setFocusMode={setFocusMode} isSaving={isSaving}`. Ta bort `key={docReloadKey}`, `text`, `setText`, `setNodes`, `nextId`.

Båda `<GraphPane ...>`-anropen får två nya props:
```jsx
                viewportRef={viewportRef}
                focusTitleId={focusTitleId}
                onTitleFocused={() => setFocusTitleId(null)}
```

- [ ] **Step 7: Kommandopaletten**

I `CommandPalette`-anropets `actions` lägg till `newLinkedScene: () => createLinkedScene(currentId),`. I `src/CommandPalette.jsx` `buildSections`, sektionen "Skapa", lägg till efter `new-node`:
```jsx
        { id: 'new-linked',  label: 'Ny länkad scen', icon: <Plus />, shortcut: '⌘Enter', run: a.newLinkedScene },
```

- [ ] **Step 8: Ta bort gamla filer och kör alla tester**

```bash
git rm -q src/useLinearParser.ts src/utils/linearConversion.ts src/__tests__/LinearConversion.test.ts src/__tests__/LinearParser.test.ts
grep -rn "linearConversion\|useLinearParser\|ArrowLink\|linearText\|docReloadKey\|linearInitialized\|nodes-updated-from-parser" src/ ; echo "exit: $?"
```
Expected: grep ger inga träffar (exit 1).

Run: `npx jest 2>&1 | tail -8`
Expected: alla tester PASS. `GraphPane` saknar ännu `viewportRef`-hantering; det är ofarligt (propen ignoreras) fram till Task 7.

Run: `npm run build 2>&1 | tail -3`
Expected: `✓ built in ...`.

- [ ] **Step 9: Commit**

```bash
git add -A src/ 
git commit -m "feat(sync): nodes are the single source of truth; doc and graph both render from nodes"
```

---

### Task 6: Fokus i titelfältet efter ⌘Enter

**Files:**
- Modify: `src/NodeEditorContext.ts`, `src/NodeCard.jsx`, `src/GraphPane.jsx`
- Test: `src/__tests__/NodeCardFocus.test.jsx`

**Interfaces:**
- Consumes: `focusTitleId`, `onTitleFocused` props på `GraphPane` (Task 5).
- Produces: context-fält `focusTitleId: string | null`, `onTitleFocused: () => void`.

- [ ] **Step 1: Skriv det fallerande testet**

```jsx
// src/__tests__/NodeCardFocus.test.jsx
import { render, act } from '@testing-library/react'
import { ReactFlowProvider } from 'reactflow'
import { jest } from '@jest/globals'
import NodeCard from '../NodeCard.jsx'
import NodeEditorContext from '../NodeEditorContext.ts'

// Same stubs as NodeClick.test.jsx: the resizer needs a real node context.
jest.mock('@reactflow/node-resizer', () => ({ NodeResizer: () => null }))
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }

function renderCard(ctx) {
  return render(
    <ReactFlowProvider>
      <NodeEditorContext.Provider value={{
        updateNodeText: () => {}, beginEdit: () => {}, resizingRef: { current: false },
        selectNode: () => {}, activeNodeId: '001', matchSet: null,
        focusTitleId: null, onTitleFocused: () => {}, ...ctx,
      }}>
        <NodeCard id="001" data={{ title: '', text: '', color: '#1f2937' }} selected width={220} height={120} />
      </NodeEditorContext.Provider>
    </ReactFlowProvider>
  )
}

test('focuses the title input when focusTitleId matches and reports back', async () => {
  jest.useFakeTimers()
  const onTitleFocused = jest.fn()
  const { container } = renderCard({ focusTitleId: '001', onTitleFocused })
  await act(async () => { jest.runAllTimers() })
  expect(document.activeElement).toBe(container.querySelector('.node-title-input'))
  expect(onTitleFocused).toHaveBeenCalled()
  jest.useRealTimers()
})

test('does not steal focus for another id', async () => {
  jest.useFakeTimers()
  const { container } = renderCard({ focusTitleId: '002' })
  await act(async () => { jest.runAllTimers() })
  expect(document.activeElement).not.toBe(container.querySelector('.node-title-input'))
  jest.useRealTimers()
})
```

- [ ] **Step 2: Kör och se att det fallerar**

Run: `npx jest --testPathPattern=NodeCardFocus 2>&1 | tail -6`
Expected: FAIL på första testet (fokus hamnar i textarean).

- [ ] **Step 3: Uppdatera contexten**

```ts
// src/NodeEditorContext.ts  (ersätt interfacet och default-värdet)
export interface NodeEditorContextType {
  updateNodeText: (id: string, text: string) => void
  beginEdit?: (key: string) => void
  resizingRef: MutableRefObject<boolean>
  selectNode: (id: string, data: { text?: string; title?: string }) => void
  activeNodeId: string | null
  matchSet?: Set<string> | null
  /** Scene whose title input should receive focus (set by cmd+Enter). */
  focusTitleId: string | null
  onTitleFocused: () => void
}

const NodeEditorContext = createContext<NodeEditorContextType>({
  updateNodeText: (_id, _value) => {},
  resizingRef: { current: false },
  selectNode: (_id, _data) => {},
  activeNodeId: null,
  matchSet: null,
  focusTitleId: null,
  onTitleFocused: () => {},
})
```

- [ ] **Step 4: NodeCard**

I `NodeCard`: läs `focusTitleId, onTitleFocused` ur contexten, lägg till `const titleRef = useRef(null)`, ge titel-`<input>` `ref={titleRef}`, och lägg till effekten efter den som fokuserar textarean:

```jsx
  useEffect(() => {
    if (!selected || focusTitleId !== id) return
    const t = setTimeout(() => {
      titleRef.current?.focus()
      onTitleFocused?.()
    }, 0)
    return () => clearTimeout(t)
  }, [selected, focusTitleId, id, onTitleFocused])
```

- [ ] **Step 5: GraphPane**

Lägg till props `viewportRef, focusTitleId, onTitleFocused` i `GraphPane`-signaturen och skicka dem till providern:

```jsx
      <NodeEditorContext.Provider value={{ updateNodeText, beginEdit, resizingRef, selectNode, activeNodeId, matchSet, focusTitleId, onTitleFocused }}>
```

- [ ] **Step 6: Kör tester**

Run: `npx jest --testPathPattern="NodeCardFocus|NodeClick|NodeSize" 2>&1 | tail -6`
Expected: PASS.

- [ ] **Step 7: Commit**

```bash
git add src/NodeEditorContext.ts src/NodeCard.jsx src/GraphPane.jsx src/__tests__/NodeCardFocus.test.jsx
git commit -m "feat(graph): focus title input of the scene created by cmd+Enter"
```

---

### Task 7: `ViewportBridge`: rätt placering och panorering

**Files:**
- Modify: `src/GraphPane.jsx`
- Test: `src/__tests__/GraphPaneBridge.test.jsx`

**Interfaces:**
- Consumes: `viewportRef` (Task 5).
- Produces: `viewportRef.current` = ReactFlow-instansen (`screenToFlowPosition`, `flowToScreenPosition`, `setCenter`, `getZoom`) medan `GraphPane` är monterad.

- [ ] **Step 1: Skriv det fallerande testet**

```jsx
// src/__tests__/GraphPaneBridge.test.jsx
import { render } from '@testing-library/react'
import { createRef } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { ViewportBridge } from '../GraphPane.jsx'

test('ViewportBridge exposes the ReactFlow instance on viewportRef and clears it on unmount', () => {
  const viewportRef = createRef()
  const { unmount } = render(
    <ReactFlowProvider>
      <ViewportBridge viewportRef={viewportRef} />
    </ReactFlowProvider>
  )
  expect(typeof viewportRef.current?.screenToFlowPosition).toBe('function')
  expect(typeof viewportRef.current?.setCenter).toBe('function')
  unmount()
  expect(viewportRef.current).toBeNull()
})
```

- [ ] **Step 2: Kör och se att det fallerar**

Run: `npx jest --testPathPattern=GraphPaneBridge 2>&1 | tail -6`
Expected: FAIL, `viewportRef.current` är `null`.

- [ ] **Step 3: Implementera bryggan**

I `src/GraphPane.jsx`, importera `useEffect` och lägg till komponenten:

```jsx
import { useEffect, useMemo, useState } from 'react'

export function ViewportBridge({ viewportRef }) {
  const rf = useReactFlow()
  useEffect(() => {
    if (!viewportRef) return
    viewportRef.current = rf
    return () => { if (viewportRef.current === rf) viewportRef.current = null }
  }, [rf, viewportRef])
  return null
}
```

Rendera den inne i `<ReactFlow>` direkt efter `<MiniMap zoomable pannable />`:
```jsx
          <ViewportBridge viewportRef={viewportRef} />
```

- [ ] **Step 4: Kör tester och bygg**

Run: `npx jest 2>&1 | tail -6`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add src/GraphPane.jsx src/__tests__/GraphPaneBridge.test.jsx
git commit -m "feat(graph): ViewportBridge so new nodes land in view and cmd+arrow pans"
```

---

### Task 8: Ta bort sektioner

**Files:**
- Delete: `src/SectionNode.jsx`
- Modify: `src/App.jsx`, `src/GraphPane.jsx`, `src/CommandPalette.jsx`, `src/__tests__/CommandPalette.test.jsx`, `src/useProjectStorage.js:61`

- [ ] **Step 1: App.jsx**

- Ta bort `import SectionNode from './SectionNode.jsx'`.
- `const nodeTypes = useMemo(() => ({ card: NodeCard }), [])`.
- Ta bort hela `const addSection = () => { ... }`.
- I `onNodeClick`: ta bort blocket `if (node.type === 'group') { ... return }`.
- Ta bort `onAddSection={addSection}` (två ställen) och `addSection,` i paletten.
- I `handleProjectSwitch`, `duplicateProject`, `importProject`, `restoreVersion`: lägg `.filter(n => n.type !== 'group')` före `.map(n => ({` på `loaded`, och sätt `type: 'card'` där `n.type || 'card'` står.

- [ ] **Step 2: GraphPane.jsx**

Ta bort `onAddSection` ur props och ur `GraphToolbar` (signatur, knapp, `Layers`-import).

- [ ] **Step 3: useProjectStorage.js**

I `loaded`-mappningen (rad ~61) lägg `.filter(n => n.type !== 'group')` före `.map`.

- [ ] **Step 4: CommandPalette.test.jsx**

Ta bort raden `addSection: jest.fn(),` och lägg till `newLinkedScene: jest.fn(),`.

- [ ] **Step 5: Radera filen och verifiera**

```bash
git rm -q src/SectionNode.jsx
grep -rn "SectionNode\|addSection\|onAddSection\|'group'" src/ | grep -v __tests__ ; echo "exit: $?"
```
Expected: träffar bara på `.filter(n => n.type !== 'group')`-raderna och `isScene` i `docSync.ts`.

Run: `npx jest 2>&1 | tail -6` → PASS. Run: `npx eslint src/ 2>&1 | tail -5` → inga fel.

- [ ] **Step 6: Commit**

```bash
git add -A src/
git commit -m "refactor: remove half-built section nodes"
```

---

### Task 9: "Sparad hh:mm" i topplisten

**Files:**
- Modify: `src/App.jsx`, `src/AppShell.jsx`, `src/Topbar.jsx`
- Test: `src/__tests__/Topbar.test.jsx`

- [ ] **Step 1: Skriv det fallerande testet**

```jsx
// src/__tests__/Topbar.test.jsx
import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Topbar from '../Topbar.jsx'

const props = { projectName: 'X', setProjectName: () => {}, onCmdK: () => {}, onShare: () => {} }

test('shows the last saved time', () => {
  const t = new Date(2026, 8, 10, 14, 32).getTime()
  render(<Topbar {...props} isSaving={false} lastSavedAt={t} />)
  expect(screen.getByText('sparad 14:32')).toBeInTheDocument()
})

test('shows "sparar…" while saving', () => {
  render(<Topbar {...props} isSaving lastSavedAt={Date.now()} />)
  expect(screen.getByText('sparar…')).toBeInTheDocument()
})

test('shows plain "sparad" before any save', () => {
  render(<Topbar {...props} isSaving={false} lastSavedAt={null} />)
  expect(screen.getByText('sparad')).toBeInTheDocument()
})
```

- [ ] **Step 2: Kör och se att det fallerar**

Run: `npx jest --testPathPattern=Topbar 2>&1 | tail -6`
Expected: FAIL på första testet.

- [ ] **Step 3: Topbar**

```jsx
// src/Topbar.jsx: ny prop lastSavedAt, och pillen:
function fmtTime(ts) {
  const d = new Date(ts)
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`
}
// ...
export default function Topbar({ projectName, setProjectName, isSaving, lastSavedAt, onCmdK, onShare, userMenuSlot, projectMenuSlot }) {
// ...
      <span className={`pill ${isSaving ? 'saving' : ''}`} aria-live="polite">
        <span className="dot" aria-hidden="true" />
        {isSaving ? 'sparar…' : lastSavedAt ? `sparad ${fmtTime(lastSavedAt)}` : 'sparad'}
      </span>
```

- [ ] **Step 4: AppShell och App**

`AppShell`: ta emot `lastSavedAt` i props och skicka `lastSavedAt={lastSavedAt}` till `<Topbar>`.

`App.jsx`: lägg till `const [lastSavedAt, setLastSavedAt] = useState(null)`. I Firestore-effekten, efter `await saveToFirestore(projectId, data)`, lägg `if (!cancelled) setLastSavedAt(Date.now())`. Lägg till en effekt för utloggat läge (localStorage sparar synkront i `useProjectStorage`):
```js
  useEffect(() => {
    if (user) return
    if (nodes.length === 0 && !hadContentRef.current) return
    setLastSavedAt(Date.now())
  }, [user, nodes])
```
Skicka `lastSavedAt={lastSavedAt}` till `<AppShell>`.

- [ ] **Step 5: Kör tester, commit**

Run: `npx jest 2>&1 | tail -6` → PASS.

```bash
git add src/Topbar.jsx src/AppShell.jsx src/App.jsx src/__tests__/Topbar.test.jsx
git commit -m "feat(topbar): show time of last save"
```

---

### Task 10: Dokumentation, version, rökprov, preview

**Files:**
- Modify: `package.json`, `CLAUDE.md`, `CHANGELOG.md`, `facts/REGISTRY.md`, `docs/superpowers/specs/2026-09-10-graf-dokument-synk-design.md`

- [ ] **Step 1: Version**

`package.json`: `"version": "0.15.0"`. `CLAUDE.md`: `Current version: 0.15.0`.

- [ ] **Step 2: CHANGELOG**

Överst i `CHANGELOG.md`:

```markdown
## v0.15.0 — Advanced: graf och dokument är samma berättelse — 2026-09-10

### Changed
- **Noderna är enda sanningen.** Dokumentet ritas om från noderna vid varje
  ändring och skriver tillbaka till dem. Grafändringar (ny nod, titel, text,
  koppling) syns direkt i dokumentet; dokumentändringar syns direkt i grafen.
  Ersätter den enkelriktade synken från v0.7.4.
- **Referenser skrivs `[004]`** i dokumentet (gamla `[#004]` förstås). Skriver
  man `[` läggs `]` till automatiskt. En referens till en scen som saknas skapar
  den, tom, i graf, dokument och outline.
- **Radera en rubrik** i dokumentet: texten flyter in i scenen ovanför; noden
  finns kvar om något pekar på den.
- **Nya noder** utan markerad nod hamnar mitt i det du ser, oavsett zoom.
- **Sparpillen** visar klockslag för senaste sparning.

### Added
- **⌘Enter** skapar nästa länkade scen (först en redan refererad tom scen,
  annars nästa lediga nummer), markerar den och ställer kursorn i titeln. I
  både graf och dokument.
- **⌘ + pil** byter scen: i grafen närmsta nod i pilens riktning, i dokumentet
  föregående/nästa scen.

### Removed
- Sektionsnoder (halvbyggda och avstängda sedan v0.9.4).
```

- [ ] **Step 3: REGISTRY**

Ta bort raderna för `ArrowLink`, `useLinearParser`, `linearConversion`, `SectionNode` och deras tester. Lägg till:

```markdown
| SceneRef | src/SceneRef.ts | TipTap pill for `[NNN]` scene references; serialises `[NNN]` | → DocPane |
| BracketAutoClose | src/BracketAutoClose.ts | `[` inserts `[]`; `]` completes a `[NNN]` pill or skips over | → DocPane |
| docSync | src/utils/docSync.ts | nodesToDoc / docToNodes (nodes are the source of truth), chooseNextSceneId | → DocPane, App |
| graphNav | src/utils/graphNav.ts | pickNodeInDirection for cmd+arrow | → App |
| docSync.test | src/__tests__/docSync.test.ts | Round trip, existence rule, baseline guard | → docSync |
| graphNav.test | src/__tests__/graphNav.test.ts | Direction picking | → graphNav |
| SceneRef.test | src/__tests__/SceneRef.test.ts | Pill parse/serialise, bracket auto-close | → SceneRef |
| NodeCardFocus.test | src/__tests__/NodeCardFocus.test.jsx | Title focus after cmd+Enter | → NodeCard |
| GraphPaneBridge.test | src/__tests__/GraphPaneBridge.test.jsx | viewportRef exposure | → GraphPane |
| Topbar.test | src/__tests__/Topbar.test.jsx | Saved-time pill | → Topbar |
```

Ta också bort noten överst om `feature/redesign-modes-and-layout` (den är gammal; allt är på master).

- [ ] **Step 4: Kör allt**

```bash
npx jest 2>&1 | tail -6
npx eslint src/ 2>&1 | tail -3
npm run build 2>&1 | tail -3
```
Expected: alla tester PASS, inga lint-fel, bygget klart.

- [ ] **Step 5: Manuellt rökprov lokalt**

Starta `npm run dev` (via Browser-panelen) och gå igenom listan i specens avsnitt 11, punkt 1 till 9, i Advanced. Notera resultat per punkt. Kontrollera sedan Basic på `/workshop`: skapa scen, skriv, koppla, förhandsgranska. Öppna inte Firestore-delning lokalt om anonym inloggning inte är påslagen i dev.

- [ ] **Step 6: Commit och preview**

```bash
git add package.json CLAUDE.md CHANGELOG.md facts/REGISTRY.md
git commit -m "chore(release): v0.15.0 — nodes as single source of truth, cmd+Enter, cmd+arrow"
git push -u origin feature/doc-graph-sync
```

Vercel bygger en preview för grenen. Hämta adressen (`vercel ls` eller Vercel-dashboarden) och skicka den till Ola tillsammans med rökprovslistan. Merge till `master` sker först efter Olas ja.

---

## Self-review mot specen

| Spec-avsnitt | Task |
|---|---|
| 4 Existensregel | 1 (docToNodes steg 4 och 5, test "deleting a heading…") |
| 5 Grammatik: `[NNN]`, tresiffrigt, auto-stängning, visning, ordning, översättning | 1, 3, 4 |
| 6.1 nodesToDoc / docToNodes | 1 |
| 6.2 Riktningsspärr | 4 (`lastMarkdownRef` + `normalizeDoc`, `emitUpdate=false`), 5 (`baselineIds` + funktionell `setNodes`). Spärren bor i DocPane, som äger editorn, i stället för i App. Specens 6.2 har uppdaterats med den formuleringen. |
| 6.3 Kursor och scroll | 4 (selection/scrollTop, `pendingCursorRef`, flush före omskrivning) |
| 6.4 Ångra | 5 (`beginEdit('doc')`, `pushUndoState` i `createLinkedScene`) |
| 7.1 ⌘Enter | 1 (`chooseNextSceneId`), 5, 6 |
| 7.2 Placering | 5 (`viewportCenterPosition`), 7 |
| 7.3 ⌘+pil | 2, 4 (dokument), 5 (graf), 7 (panorering) |
| 7.4 Sektioner bort | 8 |
| 8 Topplist | 9 |
| 10 Tester 1–8 | 1 (1–4, 6), 4 (5), 2 (7), 5+7 (8: placering testas via `viewportCenterPosition` manuellt i rökprovet, eftersom den läser DOM-mått; bryggan testas i 7) |
| 11 Rökprov, 12 Leverans | 10, 0 |

