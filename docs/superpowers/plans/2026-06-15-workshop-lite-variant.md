# Workshop Lite Variant — Implementation Plan

> **For agentic workers:** Use superpowers:executing-plans or subagent-driven-development. Steps use checkbox (`- [ ]`) tracking.

**Goal:** A clean light `/workshop` editor and a public no-login `/spela/:id` book reader, parallel to the untouched advanced app, with a public share link backed by a new Firestore collection.

**Architecture:** Same codebase/Firestore/deploy. `main.jsx` becomes a tiny path router (`/` → advanced `App`, `/workshop` → `WorkshopApp`, `/spela/:id` → `PublicReader`). A public `published/{shareId}` collection holds a read-only copy of a story; the workshop editor publishes to it on demand. Both the workshop "Spela upp" preview and the public reader render a `BookReader` (book-spread background + scene text + choices), reusing the scene-walk logic from `ReadPane`.

**Tech Stack:** React 19, Vite 6, ReactFlow 11, Firebase/Firestore, plain CSS tokens. Jest + @testing-library. No router library (path parsed manually). Spec: `docs/superpowers/specs/2026-06-15-workshop-lite-variant-design.md`.

**Branch:** `feature/workshop-lite` cut from `master`. Each task ends runnable; `npx jest` + `npm run build` stay green.

---

## Revisions after review (binding — supersede conflicting details below)

1. **Node type stays `card`** (NOT `scene`). Workshop registers `nodeTypes = { card: WorkshopNode }` and `addScene` creates `type:'card'`. This prevents a blank/corrupt render when a story is opened across the two apps (advanced renders `card` via `NodeCard`; workshop renders `card` via `WorkshopNode`).
2. **Project separation via `kind`.** Workshop-created projects get `data.kind = 'workshop'`. The workshop's story list shows only `kind === 'workshop'`. The advanced app is left untouched (it may list workshop stories too — acceptable; they're valid `card` stories).
3. **Editor is a permanent right pane**, not a slide-over overlay (matches textaventyr.se + the advanced split). When no scene is selected it shows a hint. Keeps the draggable graph as the left canvas (Ola's non-negotiable).
4. **`+ Lägg till val` creates-and-links a new scene immediately** (focus its title); "länka till befintlig scen" is a secondary affordance.
5. **Story menu** in the top bar: Nytt / Byt namn / Radera — reuse `confirmNewProject`/`renameProject`/`deleteProject` logic from `App.jsx`.
6. **Publish UX:** persist the share link in the top bar after publishing (`Delad ✓ — kopiera länk`), and offer **Sluta dela** (delete the `published` doc; owner-delete allowed by rules). No auto-republish; show a subtle "uppdatera delad version" hint when content changed since last publish.
7. **Login only at Dela.** `/workshop` builds fine **logged out** (localStorage autosave, already fixed in v0.9.3). Publishing prompts sign-in (needs `ownerUid`). Removes the classroom-login blocker.
8. **One shared scene-ref util** `src/sceneRefs.js` — the canonical `[#NNN]` regex + `parseScene(text, map)`. `ReadPane`, `BookReader`, `storyExport`, `workshopChoices` all import it (avoids the CLAUDE.md "edge regex must stay in sync" drift). Replaces the per-file regexes shown in tasks below.
9. **Self-host the book image** in `src/assets/` (no external `olabelin.se` dependency → no blank-book 404 for kids at home).
10. **Book legibility:** body ~2.3cqw, titles scaled up; **fit-to-page** (step font down to avoid the in-page scrollbar that breaks the book illusion) with a sensible min; **drop-cap only when the first paragraph is long** (> ~120 chars). Must be eyeballed on a projector-scale window before shipping.
11. **Don't show `#NNN`** prominently on the workshop node — the teacher thinks in scene names. Keep id only as a tiny dim affordance (or hidden).
12. **Split publish** into its own task; **add a cross-open test** in verify (create in workshop → open in advanced → renders).

Not adopted: the reviewer's "outline-first instead of graph" — Ola explicitly wants draggable nodes and referenced textaventyr (graph + side editor). Noted as a possible future view.

---

## File map

| File | Responsibility |
|---|---|
| `vercel.json` (new) | SPA rewrite so `/workshop` and `/spela/:id` serve index.html |
| `src/main.jsx` (modify) | Path router: choose App / WorkshopApp / PublicReader |
| `src/routing.js` (new) | Pure helpers: `parseRoute(pathname)`, `shareUrl(id)` |
| `src/workshopTheme.css` (new) | Light 60/30/10 tokens scoped to `[data-app="workshop"]` and the public reader |
| `src/useFirestoreSync.js` (modify) | Add `publishStory(shareId, data)`; add standalone `getPublished(shareId)` export |
| `src/utils/shareId.js` (new) | `makeShareId()` (7-char base36), pure |
| `src/storyExport.js` (new) | `toPublishedNodes(nodes)` (scenes only → {id,title,text,color}), pure (shared by publish + BookReader preview) |
| `src/BookReader.jsx` (new) | Book-spread reader: scene text on pages + choice buttons + history. Reuses `splitChoices` |
| `src/PublicReader.jsx` (new) | Loads `published/:id` → renders BookReader; loading/404 states |
| `src/WorkshopApp.jsx` (new) | Light shell: top bar (name, +Ny scen, Spela upp, Dela, account), ReactFlow graph, edit panel, publish flow, autosave via existing hooks |
| `src/WorkshopNode.jsx` (new) | Light node card (soft shadow, tone-plate header) |
| `src/WorkshopEditPanel.jsx` (new) | Right-side panel: namn, brödtext, choices list, +Lägg till val |
| `src/workshopChoices.js` (new) | Pure helpers: `splitBodyAndChoices(text, nodeMap)`, `setChoices(body, ids)` — body⇄`[#NNN]` |
| `firestore.rules` (modify) | Add public `published/{shareId}` rules |

Reuse unchanged: node model + `[#NNN]`, `useProjectStorage`, `useFirestoreSync` (project sync), ReactFlow graph + drag, `ReadPane.splitChoices`, `firebase.js`, `AuthContext`/`UserMenu`, `dagreLayout`, `constants`.

---

## Task 1: Branch, routing helpers, SPA rewrite

**Files:** Create `src/routing.js`, `vercel.json`, `src/__tests__/routing.test.js`. Modify `src/main.jsx`.

- [ ] **Step 1: Cut branch**

```bash
git checkout -b feature/workshop-lite
```

- [ ] **Step 2: Failing test for `parseRoute`** — `src/__tests__/routing.test.js`

```js
import { parseRoute, shareUrl } from '../routing.js'
describe('parseRoute', () => {
  it('defaults to advanced app', () => { expect(parseRoute('/')).toEqual({ name: 'app' }) })
  it('routes /workshop', () => { expect(parseRoute('/workshop')).toEqual({ name: 'workshop' }) })
  it('routes /spela/:id', () => { expect(parseRoute('/spela/abc123')).toEqual({ name: 'play', shareId: 'abc123' }) })
  it('ignores trailing slash on /spela/:id', () => { expect(parseRoute('/spela/abc123/')).toEqual({ name: 'play', shareId: 'abc123' }) })
  it('unknown path → app', () => { expect(parseRoute('/whatever')).toEqual({ name: 'app' }) })
})
describe('shareUrl', () => {
  it('builds an absolute /spela link', () => {
    expect(shareUrl('abc123', 'https://x.app')).toBe('https://x.app/spela/abc123')
  })
})
```

- [ ] **Step 3: Run → fails.** `npx jest --testPathPattern=routing` → FAIL (module missing).

- [ ] **Step 4: Implement `src/routing.js`**

```js
export function parseRoute(pathname) {
  const play = pathname.match(/^\/spela\/([^/]+)\/?$/)
  if (play) return { name: 'play', shareId: play[1] }
  if (/^\/workshop(\/|$)/.test(pathname)) return { name: 'workshop' }
  return { name: 'app' }
}
export function shareUrl(shareId, origin = window.location.origin) {
  return `${origin}/spela/${shareId}`
}
```

- [ ] **Step 5: Run → passes.** `npx jest --testPathPattern=routing`

- [ ] **Step 6: `vercel.json`**

```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

- [ ] **Step 7: Wire `main.jsx`** — branch on route. Render `App` (current) by default; lazy-load the others so the advanced app bundle isn't bloated.

```jsx
import { StrictMode, Component, lazy, Suspense } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import { AuthProvider } from './AuthContext.jsx'
import { parseRoute } from './routing.js'

const App = lazy(() => import('./App.jsx'))
const WorkshopApp = lazy(() => import('./WorkshopApp.jsx'))
const PublicReader = lazy(() => import('./PublicReader.jsx'))

// (keep the existing ErrorBoundary class verbatim)

const route = parseRoute(window.location.pathname)
const Fallback = <div style={{ padding: 24, fontFamily: 'sans-serif' }}>Laddar…</div>

function Root() {
  if (route.name === 'play') return <Suspense fallback={Fallback}><PublicReader shareId={route.shareId} /></Suspense>
  if (route.name === 'workshop') return (
    <AuthProvider><Suspense fallback={Fallback}><WorkshopApp /></Suspense></AuthProvider>
  )
  return <AuthProvider><Suspense fallback={Fallback}><App /></Suspense></AuthProvider>
}

createRoot(document.getElementById('root')).render(
  <StrictMode><ErrorBoundary><Root /></ErrorBoundary></StrictMode>
)
```

Note: `App.jsx` default-export becomes lazy; verify it has a default export (it does). PublicReader does NOT need AuthProvider (public).

- [ ] **Step 8: Temporary stubs** so the app builds before later tasks: create `src/WorkshopApp.jsx` and `src/PublicReader.jsx` each exporting a one-line placeholder component (`export default () => <div>…</div>`). Replaced in later tasks.

- [ ] **Step 9: Build + smoke.** `npm run build`; `npm run dev`; visit `/`, `/workshop`, `/spela/x` → each renders (advanced app / stub / stub).

- [ ] **Step 10: Commit** `feat(workshop): path routing + SPA rewrite + stubs`.

---

## Task 2: Light theme tokens (scoped)

**Files:** Create `src/workshopTheme.css`. Modify `src/main.jsx` (import it).

- [ ] **Step 1: Write `src/workshopTheme.css`** — light 60/30/10 scoped so the advanced app stays dark.

```css
/* Light theme for the workshop editor + public reader. Scoped so the
   advanced app (dark) is untouched. */
[data-app="workshop"] {
  --bg:          #f7f6f3;  /* 60% calm off-white base */
  --bg-soft:     #efece6;
  --panel:       #ffffff;
  --panel-2:     #f2efe9;  /* 30% soft tone-plate */
  --line:        #e7e2d8;
  --line-strong: #d8d2c4;
  --card:        #ffffff;
  --ink:         #20242c;
  --ink-soft:    #4b515c;
  --ink-dim:     #8a8f99;
  --accent:      #2f6df6;  /* 10% accent */
  --accent-soft: #dbe6ff;
  --good:        #1f9d6b;
  --warn:        #c98a16;
  --danger:      #d6483b;
  --soft-shadow: 0 10px 30px rgba(40,44,56,.10), 0 2px 6px rgba(40,44,56,.06);
  color: var(--ink);
  background: var(--bg);
}
```

- [ ] **Step 2: Import in `main.jsx`** after `index.css`: `import './workshopTheme.css'`. (Harmless on the advanced route — the block is scoped to `[data-app="workshop"]`.)

- [ ] **Step 3: Set the attribute** — WorkshopApp sets `document.documentElement.setAttribute('data-app','workshop')` on mount and removes it on unmount (Task 7). PublicReader/BookReader bring their own book palette (Task 5), no dependence on this.

- [ ] **Step 4: Build.** `npm run build`. Commit `feat(workshop): light theme tokens`.

---

## Task 3: Firestore — published collection + publish/read API

**Files:** Modify `firestore.rules`, `src/useFirestoreSync.js`. Create `src/utils/shareId.js`, `src/storyExport.js`, tests.

- [ ] **Step 1: Rules** — append inside `match /databases/{database}/documents { … }`:

```
match /published/{shareId} {
  allow read: if true;
  allow create: if request.auth != null
                && request.resource.data.ownerUid == request.auth.uid;
  allow update, delete: if request.auth != null
                && resource.data.ownerUid == request.auth.uid;
}
```

- [ ] **Step 2: `src/utils/shareId.js` + test**

```js
// 7-char base36 id, no ambiguous chars needed for a short share slug.
export function makeShareId() {
  let s = ''
  while (s.length < 7) s += Math.random().toString(36).slice(2)
  return s.slice(0, 7)
}
```
Test (`src/__tests__/shareId.test.js`): length 7, only `[a-z0-9]`, two calls differ.
(Note: `Math.random` is fine in app code; only Workflow scripts forbid it.)

- [ ] **Step 3: `src/storyExport.js` + test** — pure scene mapping shared by publish and BookReader preview.

```js
const REF = /\[#(\d{3})]|#(\d{3})/g
export function isScene(n) {
  return n && n.type !== 'group' && !n.data?.isIdea && !String(n.id).startsWith('idea-')
}
export function toPublishedNodes(nodes) {
  return (nodes || []).filter(isScene).map(n => ({
    id: n.id,
    title: n.data?.title || '',
    text: n.data?.text || '',
    color: n.data?.color || '#1f2937',
  }))
}
```
Test: idea/group excluded; shape `{id,title,text,color}`; order preserved.

- [ ] **Step 4: `useFirestoreSync` — add `publishStory` + standalone `getPublished`.**

In the hook, add (mirrors existing callbacks):
```js
const publishStory = useCallback(async (shareId, story) => {
  if (!user) return false
  try {
    await setDoc(doc(db, 'published', shareId), {
      title: story.title || '',
      nodes: story.nodes || [],
      ownerUid: user.uid,
      sourceProjectId: story.sourceProjectId || '',
      updatedAt: serverTimestamp(),
      createdAt: serverTimestamp(),
    }, { merge: true })
    return true
  } catch (err) { console.error('Publish failed:', err); return false }
}, [user])
```
Add `publishStory` to the hook's return object.

Standalone (module-level, no auth — used by PublicReader):
```js
export async function getPublished(shareId) {
  try {
    const snap = await getDoc(doc(db, 'published', shareId))
    return snap.exists() ? snap.data() : null
  } catch (err) { console.error('Load published failed:', err); return null }
}
```
Add `getDoc` to the `firebase/firestore` import.

- [ ] **Step 5: Run tests + build.** `npx jest`; `npm run build`. Commit `feat(workshop): published collection rules + publish/read API + helpers`.

- [ ] **Step 6: Deploy rules** (manual note for Ola; do NOT block build): `firebase deploy --only firestore:rules` is needed before the public link works in prod. Flag this in the final handoff.

---

## Task 4: BookReader (book-spread playback)

**Files:** Create `src/BookReader.jsx`, `src/BookReader.css`. Reuse `splitChoices` from `ReadPane.jsx` (export it — it already is exported).

- [ ] **Step 1: `BookReader.jsx`** — props `{ title, nodes }` (nodes = published shape `{id,title,text,color}`). Internal scene-walk (history/goTo/back/restart) mirroring ReadPane; choices from `splitChoices` (works on `{id,data:{title,text}}` OR flat — normalize to a nodeMap of `{id → {title,text}}`).

```jsx
import { useMemo, useState } from 'react'
import './BookReader.css'

const REF = /\[#(\d{3})]|#(\d{3})/g
function parse(text, map) {
  const choices = []; const seen = new Set()
  for (const m of (text || '').matchAll(REF)) {
    const id = m[1] || m[2]; if (seen.has(id)) continue; seen.add(id)
    choices.push({ id, label: map.get(id)?.title || `Gå till #${id}` })
  }
  const body = (text || '').replace(REF, '')
    .replace(/[ \t]+([.,!?;:…»)\]])/g, '$1').replace(/ {2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n').trim()
  return { body, choices }
}

export default function BookReader({ title, nodes }) {
  const map = useMemo(() => new Map((nodes || []).map(n => [n.id, n])), [nodes])
  const firstId = (nodes || [])[0]?.id || null
  const [curId, setCurId] = useState(firstId)
  const [history, setHistory] = useState([])
  const node = curId ? map.get(curId) : null
  const { body, choices } = useMemo(() => parse(node?.text || '', map), [node, map])
  if (!node) return <div className="book-shell"><div className="book-empty">Inget att läsa ännu.</div></div>
  const paras = body.split(/\n{2,}/).filter(Boolean)
  const go = id => { setHistory(h => [...h, curId]); setCurId(id) }
  const back = () => setHistory(h => { if (!h.length) return h; setCurId(h[h.length-1]); return h.slice(0,-1) })
  const restart = () => { setHistory([]); setCurId(firstId) }
  return (
    <div className="book-shell">
      <div className="book-bar">
        <button className="book-btn" onClick={back} disabled={!history.length}>← Tillbaka</button>
        <button className="book-btn" onClick={restart}>↺ Börja om</button>
        <span style={{ flex: 1 }} />
        {title && <span className="book-bar-title">{title}</span>}
      </div>
      <div className="book-wrap">
        <div className="book-spread">
          <h1 className="book-title">{node.title || 'Namnlös'}</h1>
          {paras.map((p, i) => <p key={i} className={i === 0 ? 'book-first' : undefined}>{p}</p>)}
          {choices.length ? (
            <div className="book-choices">
              <div className="book-choices-label">Vad gör du?</div>
              {choices.map((c, i) => (
                <button key={c.id} className="book-choice" onClick={() => go(c.id)}>
                  <span className="book-choice-n">{String.fromCharCode(65 + i)}.</span>{c.label}
                </button>
              ))}
            </div>
          ) : (
            <div className="book-choices"><div className="book-choices-label">Slut</div>
              <button className="book-choice" onClick={restart}><span className="book-choice-n">↺</span>Börja om</button>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: `BookReader.css`** — book-spread background + text on the pages, adapted from `appen-boken/index.html`. Single readable column (kid scenes are short); choices as page buttons.

```css
@import url('https://fonts.googleapis.com/css2?family=Oswald:wght@500;700&family=Source+Serif+Pro:ital,wght@0,400;0,600;1,400&display=swap');
.book-shell { position: fixed; inset: 0; background: #1a1a1a; display: flex; flex-direction: column; }
.book-bar { display: flex; align-items: center; gap: 8px; padding: 10px 16px; background: #14161c;
  color: #e8ecf2; font-family: 'JetBrains Mono', monospace; font-size: 12px; }
.book-bar-title { color: #aab1bd; }
.book-btn { font: inherit; background: rgba(255,255,255,.08); color: #e8ecf2; border: 1px solid rgba(255,255,255,.15);
  padding: 6px 12px; border-radius: 6px; cursor: pointer; }
.book-btn:hover { background: rgba(255,255,255,.16); }
.book-btn:disabled { opacity: .4; cursor: default; }
.book-wrap { flex: 1; display: flex; align-items: center; justify-content: center; overflow: hidden; }
.book-spread {
  width: min(100vw, 177.78vh); height: min(100%, 56.25vw);
  background: url('https://olabelin.se/microapps/valj-vag-racet-tomt-uppslag.jpg') center/100% 100% no-repeat;
  container-type: inline-size; position: relative;
  padding: 15% 19%; box-sizing: border-box; overflow-y: auto;
  font-family: 'Source Serif Pro', Georgia, serif; color: #222; font-size: 1.9cqw; line-height: 1.6;
}
.book-title { font-family: 'Oswald', sans-serif; text-transform: uppercase; font-size: 3.2cqw;
  line-height: 1.1; margin: 0 0 .6em; color: #111; }
.book-spread p { margin: 0 0 .9em; text-wrap: pretty; }
.book-first::first-letter { font-size: 2.8em; float: left; line-height: .8; padding: .05em .08em 0 0; font-weight: 600; }
.book-choices { margin-top: 1.4em; padding-top: 1em; border-top: 1px solid rgba(0,0,0,.15); }
.book-choices-label { font-family: 'Oswald', sans-serif; text-transform: uppercase; font-size: 1.2cqw;
  letter-spacing: .12em; color: #555; margin-bottom: .6em; }
.book-choice { display: block; width: 100%; text-align: left; background: rgba(255,255,255,.5);
  border: 1px solid rgba(0,0,0,.18); border-radius: 6px; padding: .6em .9em; margin-bottom: .5em;
  font: inherit; color: #1d1a16; cursor: pointer; transition: transform .15s, background .15s; }
.book-choice:hover { background: #fff; transform: translateX(3px); }
.book-choice-n { font-family: 'JetBrains Mono', monospace; font-size: .8em; color: #888; margin-right: .6em; }
.book-empty { margin: auto; color: #aab1bd; font-family: sans-serif; }
```

- [ ] **Step 3: Test** (`src/__tests__/BookReader.test.jsx`) — render with 3 published nodes; first scene title shows; clicking a choice advances (target title shows); "Tillbaka" returns. Ref tokens stripped from body.

- [ ] **Step 4: Run + build.** Commit `feat(workshop): BookReader book-spread playback`.

---

## Task 5: PublicReader route

**Files:** Replace stub `src/PublicReader.jsx`.

- [ ] **Step 1: Implement** — load `published/:shareId`, render BookReader; loading + not-found states.

```jsx
import { useEffect, useState } from 'react'
import { getPublished } from './useFirestoreSync.js'
import BookReader from './BookReader.jsx'

export default function PublicReader({ shareId }) {
  const [state, setState] = useState({ loading: true, story: null })
  useEffect(() => {
    let alive = true
    getPublished(shareId).then(s => { if (alive) setState({ loading: false, story: s }) })
    return () => { alive = false }
  }, [shareId])
  if (state.loading) return <div className="book-shell"><div className="book-empty">Laddar berättelsen…</div></div>
  if (!state.story) return <div className="book-shell"><div className="book-empty">Berättelsen hittades inte.</div></div>
  return <BookReader title={state.story.title} nodes={state.story.nodes || []} />
}
```
Import `BookReader.css` via BookReader; `.book-shell` styling already imported there.

- [ ] **Step 2: Build + manual smoke** (after Task 7 publishes, end-to-end). For now: visiting `/spela/none` shows "Berättelsen hittades inte." Commit `feat(workshop): public reader route`.

---

## Task 6: workshopChoices helpers (body ⇄ refs)

**Files:** Create `src/workshopChoices.js` + test.

- [ ] **Step 1: Implement + test** — keep body and choices separable while storing as one `text` with trailing `[#NNN]`.

```js
const REF = /\[#(\d{3})]/g
// Split a scene's stored text into prose body + ordered unique choice ids.
export function splitBodyAndChoices(text) {
  const ids = []; const seen = new Set()
  for (const m of (text || '').matchAll(REF)) { if (!seen.has(m[1])) { seen.add(m[1]); ids.push(m[1]) } }
  const body = (text || '').replace(REF, '').replace(/[ \t]+\n/g, '\n').replace(/\n{3,}/g, '\n\n').trim()
  return { body, choiceIds: ids }
}
// Recombine edited body + choice ids back into stored text.
export function joinBodyAndChoices(body, choiceIds) {
  const refs = (choiceIds || []).map(id => `[#${id}]`).join(' ')
  return refs ? `${(body || '').trim()}\n\n${refs}` : (body || '').trim()
}
```
Test: round-trip (`split` then `join` preserves body + ids); dedupes; empty handling.

- [ ] **Step 2: Run + commit** `feat(workshop): body/choices split helpers`.

---

## Task 7: WorkshopApp shell + graph + autosave

**Files:** Replace stub `src/WorkshopApp.jsx`. Reuse `useProjectStorage`, `useFirestoreSync`, ReactFlow, `dagreLayout`, `WorkshopNode` (Task 8), `WorkshopEditPanel` (Task 9).

This task is large; build it incrementally but commit once it runs. Core responsibilities:
- Owns story state: `nodes`, `edges` (scanned from `[#NNN]`), `nextId`, `projectName`, `projectId`, `shareId`.
- Reuses `useProjectStorage` + `useFirestoreSync` exactly like `App.jsx` (same `cyoa-*` keys → workshop and advanced share the same projects, which is fine/desired).
- Sets `document.documentElement.setAttribute('data-app','workshop')` on mount; removes on unmount.
- Renders: light top bar + `<ReactFlow>` (nodeTypes `{ scene: WorkshopNode }`, `nodesDraggable`, `deleteKeyCode={null}`, fitView) + `WorkshopEditPanel` (when a node is selected) + publish/share UI + a `BookReader` overlay for "Spela upp".
- Helpers ported/trimmed from App.jsx: `scanEdges`, `addScene` (creates a `scene` node with next 3-digit id), `selectNode`, autosave effects. Keep it lean — no command palette, modes, doc pane, undo stack required for v1 (but keep edits going through one `updateScene(id, patch)` that re-scans edges).

- [ ] **Step 1: Build the shell** with top bar + empty ReactFlow + "skapa din första scen" empty state.
- [ ] **Step 2: Wire `useProjectStorage`/`useFirestoreSync`** (copy the wiring from `App.jsx` lines around the hooks) so existing projects load and autosave.
- [ ] **Step 3: `addScene()`** — next id `String(nextId).padStart(3,'0')`, `type:'scene'`, `data:{title:'Ny scen',text:'',color}`, placed offset from last; `setEdges(scanEdges(updated))`.
- [ ] **Step 4: Node click → select → open edit panel.** Drag works by default (ReactFlow). Persist positions on `onNodeDragStop`.
- [ ] **Step 5: "Spela upp"** → overlay `<BookReader title={projectName} nodes={toPublishedNodes(nodes)} />` with a close button.
- [ ] **Step 6: "Dela"** → ensure `shareId` (generate via `makeShareId()` + store on project if absent) → `publishStory(shareId, { title: projectName, nodes: toPublishedNodes(nodes), sourceProjectId: projectId })` → show `shareUrl(shareId)` with a copy button + toast "Publicerad!".
- [ ] **Step 7: Build + dev smoke**: `/workshop` loads, create scenes, drag, autosave pill, Spela upp opens book. Commit `feat(workshop): workshop app shell, graph, autosave, play, share`.

---

## Task 8: WorkshopNode (light card)

**Files:** Create `src/WorkshopNode.jsx`; append node CSS to `workshopTheme.css`.

- [ ] **Step 1: Component** — `memo`, props from ReactFlow (`id, data, selected`). Renders a white rounded card: tone-plate header strip in `data.color` with the title; small body preview (first ~80 chars, refs stripped). Source/target handles for linking.

```jsx
import { memo } from 'react'
import { Handle, Position } from 'reactflow'
import { splitBodyAndChoices } from './workshopChoices.js'
function isLight(hex){ if(!hex||hex[0]!=='#')return false; const r=parseInt(hex.slice(1,3),16),g=parseInt(hex.slice(3,5),16),b=parseInt(hex.slice(5,7),16); return 0.299*r+0.587*g+0.114*b>150 }
export default memo(function WorkshopNode({ id, data, selected }) {
  const color = data?.color || '#2f6df6'
  const { body } = splitBodyAndChoices(data?.text || '')
  return (
    <div className={`ws-node${selected ? ' selected' : ''}`}>
      <div className="ws-node-head" style={{ background: color, color: isLight(color) ? '#15191f' : '#fff' }}>
        <span className="ws-node-id">#{id}</span>{data?.title || 'Namnlös'}
      </div>
      <div className="ws-node-body">{body ? body.slice(0, 90) : <span className="ws-node-empty">Tom scen</span>}</div>
      <Handle type="target" position={Position.Left} />
      <Handle type="source" position={Position.Right} />
    </div>
  )
})
```

- [ ] **Step 2: CSS** (append to `workshopTheme.css`): `.ws-node` white, radius 12, `box-shadow: var(--soft-shadow)`, no hard border; `.selected` → 2px accent ring. `.ws-node-head` rounded-top tone-plate, bold. Edges: `[data-app="workshop"] .react-flow__edge path { stroke:#9aa1ad; stroke-width:1.5 }`, selected/hover → accent. Light dotted background on `.react-flow`.
- [ ] **Step 3: Build + commit** `feat(workshop): light node card`.

---

## Task 9: WorkshopEditPanel (right-side editor)

**Files:** Create `src/WorkshopEditPanel.jsx`; append panel CSS.

- [ ] **Step 1: Component** — props `{ node, allNodes, onPatch, onAddChoice, onClose, onDelete }`.
  - Title input → `onPatch({ title })`.
  - Body textarea (value = `splitBodyAndChoices(text).body`) → on change, `onPatch({ text: joinBodyAndChoices(newBody, choiceIds) })`.
  - Choices list: each shows target title + remove (×) → updates choiceIds. `+ Lägg till val`: a small menu to (a) link an existing scene, or (b) "Skapa ny scen" → creates a scene and links it. Updates `text` via `joinBodyAndChoices`.
  - `Ta bort scen` (delete) with confirm.
- [ ] **Step 2: WorkshopApp wires it** — `onPatch(patch)` → `updateScene(selectedId, patch)` (merges into `data`, re-scans edges); `onAddChoice` creates/links; `onDelete` removes node + strips `[#id]` refs (reuse the delete-with-cleanup pattern from App.jsx).
- [ ] **Step 3: CSS** — right panel: `position:absolute; right:0; top:0; bottom:0; width:340px; background:var(--panel); box-shadow:var(--soft-shadow); padding:18px;` slide-in transform. Clean inputs (tone-plate fills, no hard borders), accent focus ring.
- [ ] **Step 4: Build + dev smoke**: select scene → edit name/body, add a choice (creates+links a scene, edge appears), delete. Commit `feat(workshop): scene edit panel + branching`.

---

## Task 10: End-to-end verify + finalize

**Files:** none new; verification + docs.

- [ ] **Step 1: `npx jest`** green (routing, shareId, storyExport, workshopChoices, BookReader tests).
- [ ] **Step 2: `npm run build`** clean.
- [ ] **Step 3: Playwright smoke** (dev server): `/workshop` → seed/create scenes, drag, edit, add choice; "Spela upp" → book reader plays, choices advance; "Dela" → link shown. Open the `/spela/:id` link in a fresh context (logged out) → plays. `/` advanced app unchanged.
- [ ] **Step 4: Deploy rules** note: remind Ola to run `firebase deploy --only firestore:rules` (or do it if firebase CLI is authed) — the public link 's read works without it (read:true) but **create/update** needs the new rules deployed for "Dela" to succeed in prod.
- [ ] **Step 5: Version + CHANGELOG** bump (v0.10.0 — new variant), `facts/REGISTRY.md` entries for the new files.
- [ ] **Step 6: Push branch → Vercel preview**; verify on the preview URL; then merge to `master` (production) once confirmed. Tag `v0.10.0`.

---

## Self-review checklist (run after writing)

- Spec coverage: routing ✓(T1) light theme ✓(T2) published+rules+API ✓(T3) book reader ✓(T4) public route ✓(T5) branching helpers ✓(T6) editor shell+autosave+publish ✓(T7) node card ✓(T8) edit panel ✓(T9) verify/deploy ✓(T10).
- Type consistency: published node shape `{id,title,text,color}` used in storyExport(T3), BookReader(T4), PublicReader(T5), publish(T7). `parseRoute` shape `{name, shareId}` used in main(T1). `splitBodyAndChoices`/`joinBodyAndChoices` names consistent T6/T8/T9.
- No placeholders: each task has concrete code/tests.
