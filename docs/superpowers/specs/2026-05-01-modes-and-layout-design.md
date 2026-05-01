# Spec — Modes & Layout Redesign (v0.9.0)

**Status:** Approved by user 2026-05-01.
**Source:** Hi-fi design handoff from Claude Design (`design_handoff_modes_and_layout/`, see `README.md`, `styles.css`, prototype JSX).
**Target:** `valj-vag-verktyg` v0.9.0.
**Branch:** `feature/redesign-modes-and-layout` (cut from `master`).
**Rollback tag:** `pre-redesign-v0.8.2` placed on `master` before branching.

## Goal

Replace the current single-pane shell with **four distinct modes** (Skiss / Skiss + Innehåll / Innehåll / Läsa), a 56px sidebar nav, a slim 44px topbar, a ⌘K command palette, a Google-Docs-style document editor, and a redesigned reader. Existing functionality is preserved; the chrome is reorganised.

## Non-goals

- No data-model changes (nodes, edges, projects, history snapshots stay as-is).
- No Firestore / auth / AI integration changes.
- No new business logic — only chrome reorganisation and visual rework.
- No light app theme. Reading mode keeps its own `paper` / `dark` toggle.
- No multi-user / real-time collab features.

## Visual fidelity

Hi-fi. Colours, typography, sizes, icons, hover/active states, and layout are pixel-targeted at the values in the prototype's `styles.css`. Deviations are only allowed when the existing token system disagrees — in which case the token gets extended, not the spec relaxed.

## Design tokens (final list)

Add/replace in `src/theme.css`:

```css
:root {
  /* Background */
  --bg:          #0d1117;
  --bg-soft:     #11161e;
  --panel:       #161b22;
  --panel-2:     #1b212b;
  --line:        #232a36;
  --line-strong: #2f3845;
  --card:        #1f2937;

  /* Ink */
  --ink:      #e8ecf2;
  --ink-soft: #b6bdc9;
  --ink-dim:  #7d8696;

  /* Accent */
  --accent:      #6ea8ff;
  --accent-soft: #2a3b5c;

  /* Status */
  --good:   #6cd09a;
  --warn:   #f0b955;
  --danger: #f06a6a;

  /* Typography */
  --font-ui:   "Inter", -apple-system, "Segoe UI", system-ui, sans-serif;
  --font-doc:  "Source Serif Pro", "Iowan Old Style", Georgia, serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;

  /* Scale */
  --r-sm: 4px;  --r: 6px;  --r-md: 10px;  --r-lg: 14px;
  --ease: cubic-bezier(.2,.8,.2,1);
}

[data-reading="paper"] {
  --paper-bg:      #f6f1e6;
  --paper-ink:     #1d1a16;
  --paper-ink-dim: #6a6258;
  --paper-rule:    #d9d0bf;
}
[data-reading="dark"] {
  --paper-bg:      #15191f;
  --paper-ink:     #e8ecf2;
  --paper-ink-dim: #8a93a3;
  --paper-rule:    #2a3140;
}
```

The current `[data-theme="light"]` and `[data-theme="dark"]` blocks are removed. App is dark-only.

## Fonts

Add to `index.html` (single tag):

```html
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+Pro:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

## File map

### New files (all in `src/`)

| File | Responsibility |
|---|---|
| `AppShell.jsx` | Mode state, splitRatio, focusMode, palette open, keyboard shortcuts. Renders sidebar + topbar + workspace + palette + settings. Receives data + handlers as props from `App.jsx`. |
| `SidebarNav.jsx` | 56px left rail. Logo, separator, 4 mode buttons (Skiss/Split/Innehåll/Läsa), spacer, History, Settings. |
| `Topbar.jsx` | 44px top bar. Project name input, save pill, search button (opens palette), share, divider, avatar (opens existing `UserMenu`). |
| `GraphPane.jsx` | Skiss mode wrapper around ReactFlow. Floating toolbar (top-left), zoom controls (bottom-right), minimap (bottom-left). |
| `DocPane.jsx` | Innehåll mode. Toolbar + collapsible outline + scroll container + `.doc-page`. Embeds existing `LinearTextEditor.tsx` (TipTap) inside the page. Status bar shown only when `full`. |
| `ReadPane.jsx` | Läsa mode. Read bar (back/restart, läsare/redaktör, paper/dark, share), reading stage with chapter num + h1 + drop-cap p + choices + sticky breadcrumb. |
| `CommandPalette.jsx` | ⌘K overlay. Sectioned list with mode-switch, create, tools, settings entries. Keyboard navigable. |
| `SettingsModal.jsx` | One modal aggregating font-size, auto-save, debug, "AI-inställningar..." launcher. |

### Rewritten in place

| File | Change |
|---|---|
| `src/theme.css` | Replace minimal vars with full token set above. |
| `src/index.css` | Port prototype `styles.css` rules. Keep existing `.btn` system extended (sizes `.sm`, `.icon`, variants stay). |
| `index.html` | Add Google Fonts link. |
| `src/NodeCard.jsx` | Restyled per spec: accent-bar on left, hover lift, active glow, ID-tag styling, line-clamp 3 on text, ref tokens rendered as `.ref` spans. |
| `src/App.jsx` | Slimmed to ~300–400 lines. Keeps Auth provider, root data state (nodes/edges/projects/currentId/etc.), hooks. Renders `<AppShell>`. The `<header>` block is gone. |

### Deleted

| File | Replaced by |
|---|---|
| `src/FloatingMenu.jsx` | Command palette |
| `src/LinearView.jsx` | `DocPane.jsx` |
| `src/Playthrough.jsx` | `ReadPane.jsx` |

### Untouched

`useFirestoreSync.js`, `useProjectStorage.js`, `useAi.js`, `AuthContext.jsx`, `firebase.js`, `dagreLayout.ts`, `parseText.js`, `LinearTextEditor.tsx` (embedded in DocPane), `EditorBubbleMenu.jsx`, `EditorToolbar.jsx`, `useLinearParser.ts`, `ActiveNodeHighlight.ts`, `ArrowLink.ts`, `CustomLink.ts`, `NewProjectModal.jsx`, `AiSettingsModal.jsx`, `AiProofreadPanel.jsx`, `AiSuggestionsPanel.jsx`, `UserMenu.jsx`, `Button.jsx`, `Markdown.jsx`, `constants.js`.

## State model

In `AppShell` (new state, persisted where noted):

```js
const [mode, setMode]                 = useState(loadLS('vv-mode', 'split'))     // persisted
const [splitRatio, setSplitRatio]     = useState(loadLS('vv-split-ratio', 0.42)) // persisted
const [outlineHidden, setOutlineHidden] = useState(false)
const [focusMode, setFocusMode]       = useState(false)
const [readTheme, setReadTheme]       = useState(loadLS('vv-read-theme', 'paper')) // persisted
const [readEditor, setReadEditor]     = useState(false)
const [cmdOpen, setCmdOpen]           = useState(false)
const [showSettings, setShowSettings] = useState(false)
```

`mode` values: `'skiss' | 'split' | 'text' | 'read'`.
`readTheme` values: `'paper' | 'dark'`.
`splitRatio` clamped to `[0.2, 0.8]` on drag.

`activeNodeId` stays in `App.jsx` (it's tied to graph data) and is passed down. All four modes read/write the same `activeNodeId`.

Existing state (`nodes`, `edges`, `currentId`, `projectName`, `autoSave`, `fontSize`, `aiSettings`, `debugMode`, etc.) stays in `App.jsx`. The `theme` state and any light-theme code paths are removed.

## Layout (Variant C — Sidebar-nav)

```
┌─────┬──────────────────────────────────────────────┐
│     │  topbar  44px                                │
│ sb  ├──────────────────────────────────────────────┤
│ 56px│           workspace (flex:1)                 │
│     │                                              │
└─────┴──────────────────────────────────────────────┘
```

Root `<App>`: `display: flex; height: 100vh; background: var(--bg); color: var(--ink)`.
- `<SidebarNav>` — fixed 56px, full height.
- Right column (`flex: 1; flex-direction: column; min-width: 0`):
  - `<Topbar>` (44px)
  - `<Workspace>` (`flex: 1; min-height: 0; overflow: hidden`)
  - Status row only in Innehåll full-width mode (rendered inside `DocPane` when `full` is true).

### `<SidebarNav>` spec

- Width 56px, `background: var(--bg-soft)`, right border 1px solid `var(--line)`.
- Layout: `flex-direction: column; align-items: center; padding: 12px 0; gap: 4px`.
- Children top-down: Logo (40×40, gradient `linear-gradient(135deg, #6ea8ff, #b88dff)`, radius 5px), 28×1px separator, four 40×40 mode buttons (radius 8px, icon 18px), `flex:1` spacer, History button, Settings button.
- Mode-button states:
  - default: `color: var(--ink-dim); background: transparent`
  - hover: `background: var(--panel); color: var(--ink)`
  - active: `background: var(--panel-2); color: var(--accent)` + 2px vertical accent bar via `::before` (`position: absolute; left: -1px; top: 8px; bottom: 8px; width: 2px; background: var(--accent); border-radius: 0 2px 2px 0`).
- Mode icons (Lucide): `Network`, `Columns2`, `FileText`, `BookOpen`. History: `History`. Settings: `Settings`.

### `<Topbar>` spec

- Height 44px, `padding: 0 14px`, `background: var(--bg)`, bottom border 1px solid `var(--line)`.
- Layout: `flex; align-items: center; gap: 12px`.
- Children left → right:
  1. Project-name input (`<input class="project-name">`) — transparent, italic 15px Source Serif Pro, padding 4px 8px, hover/focus → `background: var(--panel)`. Bound to existing `projectName` state.
  2. Save pill — pill 999px radius, padding 3px 8px, font 11.5px, `background: var(--panel-2)`, border 1px solid `var(--line)`. 6px dot (`var(--good)` if saved, `var(--warn)` if saving) + text "sparad" / "sparar…".
  3. `flex: 1` spacer.
  4. Search button — `<button class="btn ghost sm">` with `Search` icon + "Sök" + `<span class="kbd">⌘K</span>`. Click → `setCmdOpen(true)`.
  5. Share button — icon-only `Share2`, `btn ghost icon`.
  6. 1px × 22px divider.
  7. Avatar — 26×26 circle, same gradient as logo. Click → existing `UserMenu` popover.

## Modes

### 1) Skiss (`mode === 'skiss'`)

`<GraphPane>` only. Existing ReactFlow + nodes + edges, restyled.

- Background: dotted grid `radial-gradient(circle at 20px 20px, var(--line) 1px, transparent 1.5px)` over `var(--bg-soft)`, `background-size: 22px 22px`.
- Floating toolbar (`position: absolute; top: 12px; left: 12px`): `background: var(--panel); border: 1px solid var(--line); border-radius: 10px; padding: 4px; box-shadow: 0 8px 24px rgba(0,0,0,.25)`. Buttons (28×28, `.btn ghost icon`):
  - `Plus` — Ny nod (current `createNode` handler)
  - `LayoutGrid` — Auto-layout (current `dagreLayout` handler)
  - `Layers` — Sektion (placeholder; no current handler — defer to future, render disabled)
  - `Lightbulb` — Idé (placeholder; defer, render disabled)
- Zoom controls: column of three 32×32 buttons (+, −, ⌖), `position: absolute; bottom: 12px; right: 12px`. Wired to ReactFlow `useReactFlow().zoomIn/zoomOut/fitView`.
- Minimap: `<MiniMap>` from ReactFlow at `position: absolute; bottom: 12px; left: 12px; width: 180px; height: 110px`, styled to match panel chrome. Active node mini-rect uses white stroke; others 0.55 opacity.
- `<NodeCard>`:
  - `background: var(--card)`, `border: 1px solid var(--line-strong)`, `border-radius: 8px`, `padding: 10px 12px`, `box-shadow: 0 4px 14px rgba(0,0,0,.25)`.
  - Hover: `border-color: var(--accent); transform: translateY(-1px)` (transition 0.15s `var(--ease)`).
  - Active (`activeNodeId === node.id`): `border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft), 0 8px 22px rgba(0,0,0,.4)`.
  - 3px vertical accent-bar on left, coloured from `node.data.color` if present.
  - ID tag: JetBrains Mono 10px, `color: var(--ink-dim)`, above title.
  - Title: 13px / 600, line-height 1.25.
  - Preview: 11.5px, `color: var(--ink-soft)`, `-webkit-line-clamp: 3`.
  - `[#NNN]` refs in preview render as `<span class="ref">→ Titel</span>` (JetBrains Mono 10.5px, `var(--accent)`).

### 2) Skiss + Innehåll (`mode === 'split'`)

```
[ <GraphPane flex={ratio}> | <SplitDivider> | <DocPane flex={1-ratio} full={false}> ]
```

- `<SplitDivider>`: 1px wide, `background: var(--line)`, `cursor: col-resize`. Hover/active → `background: var(--accent)`. `::before` pseudo with `inset: 0 -3px` for wider hit-target.
- Drag handler updates `splitRatio` clamped to `[0.2, 0.8]` (on `mousemove` while pointer is down on divider; release on `mouseup`).
- `<DocPane full={false}>` hides outline by default in split (still toggleable).

### 3) Innehåll (`mode === 'text'`)

`<DocPane full={true}>` on full width. Status bar visible at the bottom (28px, monospace 11.5px): "{N} sektioner · {ord} ord · ● Sparad" left, "v0.x · skiss" right.

#### `<DocPane>` structure

```
.doc-pane (flex column, flex:1)
├ .doc-toolbar (40px)
├ .doc-body (flex row, flex:1, min-height:0)
│  ├ .doc-outline (200px, collapsible)
│  └ .doc-scroll (flex:1, overflow-y:auto, padding 48px 0 200px, scroll-behavior:smooth)
│     └ .doc-page (centred, max-width min(720px, 92%))
└ .doc-status (28px, only when full=true)
```

`.doc-toolbar` (40px, `border-bottom: 1px solid var(--line)`, padding 0 12px):
Groups separated by `border-right: 1px solid var(--line)` + 8px padding-right:
1. Outline-toggle (`PanelLeftClose`/`PanelLeftOpen`).
2. `<select>` Normal text / Rubrik 1 / Rubrik 2 / Rubrik 3 → TipTap `setHeading({ level })` / `setParagraph()`.
3. Bold / Italic / Underline → TipTap `toggleBold/toggleItalic/toggleUnderline`.
4. List (`List` icon → `toggleBulletList`) / Link (`Link` icon → existing link-prompt flow).
5. Plus (Ny nod) → `editor.chain().focus().insertContent('\n\n## #NNN \n\n').run()` with NNN = next node id.
6. (Right of `flex: 1`) Focus toggle (`Maximize2`) — only rendered when `full=true`.

`.doc-outline` (200px, `background: var(--bg-soft)`, `border-right: 1px solid var(--line)`, padding 12px 8px 12px 12px, `overflow-y: auto`):
- Title — 10.5px UPPERCASE letter-spacing 0.08em, `var(--ink-dim)`, font-weight 600.
- Items — `<button>` full-width, padding 5px 8px, radius 4px, font 12.5px, `border-left: 2px solid transparent`. ID tag (JetBrains Mono 10px, `var(--ink-dim)`, margin-right 6px) + title.
- Hover: `background: var(--panel); color: var(--ink)`.
- Active: `background: var(--panel-2); color: var(--ink); border-left-color: var(--accent)`. ID tag → `var(--accent)`.
- Collapsed: `width: 0; padding: 0; opacity: 0; pointer-events: none` with `transition: width 0.25s var(--ease), opacity 0.2s`.

`.doc-page`:
- `max-width: min(720px, 92%); margin: 0 auto`.
- `padding: 56px clamp(28px, 6%, 80px)`.
- `background: var(--panel); border: 1px solid var(--line); border-radius: 4px`.
- `box-shadow: 0 6px 30px rgba(0,0,0,.3)`.
- `min-height: 1100px`.
- `font-family: var(--font-doc); font-size: 16.5px; line-height: 1.7; text-wrap: pretty; color: var(--ink)`.
- Headings/paragraphs/refs styled per `styles.css` rules (see token-equivalent values reproduced in §"Visual fidelity"). The page renders the live TipTap editor (existing `LinearTextEditor`) — `.doc-page` styles apply to ProseMirror's content.

`<h2>` per node:
- 21px / 600, `margin: 38px 0 12px`, `scroll-margin-top: 24px`, `display: flex; align-items: baseline; gap: 12px`.
- Inside: `<span class="node-id" data-node-id="NNN">#NNN</span>` (JetBrains Mono 12px, `var(--ink-dim)`, padding 2px 7px, `background: var(--bg-soft)`, `border: 1px solid var(--line)`, radius 4px). Active state (`activeNodeId === NNN`): colour/border `var(--accent)`/`var(--accent-soft)`.
- + node title text.

Ref-link: `<a class="ref-link" data-target="NNN" href="#NNN">→ Titel</a>` rendered by the existing `ArrowLink`/`CustomLink` TipTap extensions.
Styling: `display: inline-flex; align-items: center; gap: 3px; font-family: var(--font-mono); font-size: 13px; color: var(--accent); background: var(--accent-soft); padding: 1px 7px; border-radius: 3px; text-decoration: none; margin: 0 2px; cursor: pointer; border: 1px solid transparent`. Hover: `border-color: var(--accent)`.

#### Focus mode

When `focusMode === true && mode === 'text'`:
- Hide `.topbar`, `.doc-toolbar`, `.doc-status`, `.sidebar-nav`, `.doc-outline` (`display: none`).
- `.doc-page`: `box-shadow: none; border: none; background: transparent`.
- "Avsluta fokus" button fixed at `top: 16px; right: 16px; z-index: 30`.
- `Esc` exits focus mode.

### 4) Läsa (`mode === 'read'`)

`<ReadPane>`:

```
.read-shell (flex column)
├ .read-bar (44px)
└ .read-stage (flex:1, overflow-y:auto, padding 60px 24px 120px)
   ├ .read-page (max-width 620px, font-family var(--font-doc))
   └ .read-breadcrumb (sticky bottom)
```

`.read-bar` (44px, padding 0 16px, `border-bottom: 1px solid var(--line)`):
- Left: "← Tillbaka" (disabled if history empty), "↺ Börja om" — both `.btn ghost sm`.
- `flex: 1` spacer.
- Läsare/Redaktör segment toggle: `display: inline-flex; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 2px`. Inner buttons: `padding: 4px 10px; border-radius: 4px; font-size: 11.5px / 500`. Active: `background: var(--panel-2); color: var(--ink)`. Inactive: `color: var(--ink-dim)`.
- Paper/Dark segment toggle: same styling.
- Share button (`Share2` + "Dela").

`.read-stage`:
- `background: var(--paper-bg)`, `color: var(--paper-ink)` (driven by `data-reading` attribute on the shell).
- `padding: 60px 24px 120px`, `scroll-behavior: smooth`.

`.read-page`:
- `max-width: 620px; margin: 0 auto; font-family: var(--font-doc)`.
- Chapter num: `<span class="chapter-num">` JetBrains Mono 11px UPPERCASE letter-spacing 0.16em, `var(--paper-ink-dim)`. Format: `KAPITEL 04` + (in editor mode) ` · #004`.
- `<h1>`: 34px / 600, letter-spacing -0.01em, line-height 1.15, margin 0 0 32px, `border-bottom: 1px solid var(--paper-rule); padding-bottom: 18px`.
- `<p>`: 19px, line-height 1.75, margin 0 0 1.1em, `text-wrap: pretty; hyphens: auto`. First `<p>` after `<h1>`: drop-cap via `::first-letter { font-size: 3.4em; float: left; line-height: 0.85; padding: 6px 8px 0 0; font-weight: 600 }`.
- Body strips `[#NNN]` / `#NNN` tokens from rendered text — choices replace them.

`.read-choices`:
- `margin-top: 44px; padding-top: 24px; border-top: 1px solid var(--paper-rule)`.
- Label "VAD GÖR DU?" — JetBrains Mono 11px UPPERCASE letter-spacing 0.14em, `var(--paper-ink-dim)`, margin-bottom 14px.
- Each choice: full-width `<button>`, padding 14px 18px, `border: 1px solid var(--paper-rule)`, radius 4px, font Source Serif Pro 17px, `color: var(--paper-ink)`, `background: transparent`, margin-bottom 10px, text-align left, `position: relative`.
- Hover: `background: rgba(0,0,0,.04)` (paper) / `rgba(255,255,255,.04)` (dark), `border-color: var(--paper-ink)`, `transform: translateX(2px)` (transition 0.18s `var(--ease)`).
- Inside: `<span class="num">A.</span>` (JetBrains Mono 11px, dim, margin-right 12px) + choice title + arrow icon (right) fading in on hover.
- In editor mode: `data-target="#NNN"` rendered via `::after { content: attr(data-target); position: absolute; right: 48px; ... }`.

`.read-breadcrumb`:
- `position: sticky; bottom: 0`.
- `background: linear-gradient(to top, var(--paper-bg) 70%, transparent)`, padding 16px 24px 14px.
- `max-width: 620px; margin: 32px auto 0`.
- JetBrains Mono 11px, `var(--paper-ink-dim)`.
- Items: `<span class="crumb">` separated by `›`. Hover: `background: rgba(0,0,0,.06)`. Current: `font-weight: 600; color: var(--paper-ink)`.
- Click on a crumb returns to that point in history.

History array lives in `ReadPane` local state, mirroring the current `Playthrough` model.

## Graph ↔ Doc synchronisation

`activeNodeId` is the single source of truth across all modes.

**Graph → Doc** (and DocPane outline):
- Click on a NodeCard → `setActiveNodeId(id)`.
- DocPane effect: when `activeNodeId` changes, find `<h2 data-node-id={id}>` in `.doc-scroll`, call `el.scrollIntoView({ block: 'start', behavior: 'smooth' })`. `scroll-margin-top: 24px` on `<h2>` handles offset. Add `is-active` class to that h2; remove from siblings.

**Doc → Graph**:
- DocPane registers `IntersectionObserver` on every `<h2 data-node-id>` with `rootMargin: '-60px 0px -60% 0px'`. Topmost intersecting heading's id → `setActiveNodeId(id)`. Updates while user scrolls naturally.
- Fallback: also a `scroll` listener (throttled by `rAF`) that finds the heading whose `getBoundingClientRect().top` is closest to (but ≤) 60px from the container top. Used if IntersectionObserver doesn't fire in edge cases (e.g., very fast scroll).

**Ref-link click** in DocPane:
- `<a class="ref-link" data-target="NNN">` click handler: `e.preventDefault(); setActiveNodeId(NNN)`. Existing scroll effect handles the rest.

**Outline-item click**:
- `setActiveNodeId(id)` — same path.

This reuses the existing `ActiveNodeHighlight` TipTap extension and the active-node tracking already in `LinearTextEditor.tsx`. The wiring moves into `DocPane`; we don't rebuild it.

## Keyboard shortcuts

Scoped to fire only when not in `<input>` or `[contenteditable]` (existing helper or simple guard):

| Shortcut | Action |
|---|---|
| ⌘K / Ctrl+K | Toggle command palette |
| `1` / `2` / `3` / `4` | Switch mode (skiss / split / text / read) |
| Esc | Close palette → close settings → exit focus mode (in priority order) |
| ⌘Z / ⌘⇧Z | Undo / Redo (existing) |
| ⌘N | New node (existing — preserved as-is) |
| ⌘D | Delete selected node (existing) |
| ⌘F | Existing find behaviour preserved as-is |

`Nytt projekt...` has no keyboard shortcut — only reachable through the command palette and the existing modal.

## Header migration

Each existing header control gets a new home:

| Current control | New home |
|---|---|
| Project-name input | Topbar (left) — same binding |
| Project switcher popover | Command palette ("Byt projekt...") |
| New Project button | Command palette ("Nytt projekt...") → `NewProjectModal` |
| Import / Export markdown | Command palette ("Importera markdown" / "Exportera markdown") |
| New Node | GraphPane toolbar + Command palette + ⌘N |
| Delete Node | Command palette ("Ta bort vald nod") + Backspace/Delete |
| Undo / Redo | Command palette + ⌘Z / ⌘⇧Z |
| Auto-layout | GraphPane toolbar + Command palette |
| Auto-save toggle | Settings modal |
| Font-size | Settings modal |
| Theme | Removed (dark-only) |
| Debug toggle | Settings modal |
| AI Settings | Settings modal → opens existing `AiSettingsModal` |
| AI Proofread | **Not exposed.** Logic is currently disabled in App.jsx (imports commented out). Re-wiring is out of scope. |
| AI Suggestions | **Not exposed.** Same status as Proofread. Re-wiring is out of scope. |
| Search (current `showSearch`) | Replaced by command palette |
| User menu | Topbar avatar → existing `UserMenu` |

## `<CommandPalette>` spec

- Triggered by `cmdOpen=true` (⌘K, search button, or `setCmdOpen(true)` from anywhere).
- Backdrop: `position: fixed; inset: 0; background: rgba(13,17,23,.6); backdrop-filter: blur(4px); z-index: 50; padding-top: 12vh; justify-content: center`.
- Container: 540px wide (max 90vw), `background: var(--panel); border: 1px solid var(--line-strong); border-radius: 14px; box-shadow: 0 24px 60px rgba(0,0,0,.5); overflow: hidden`.
- Input: full-width, padding 16px 20px, transparent, `border-bottom: 1px solid var(--line)`, font 16px, autofocus.
- Items list: `max-height: 360px; overflow-y: auto; padding: 6px`.
- Item layout: `display: flex; align-items: center; gap: 12px; padding: 10px 14px; border-radius: 6px; font-size: 13px`. Hover/active (highlighted by keyboard): `background: var(--panel-2)`. Layout: icon (`var(--ink-dim)`, `var(--accent)` when active) + label + (right) `<span class="kbd">` shortcut.
- Section headers: `font-size: 10px; UPPERCASE; letter-spacing: 0.1em; color: var(--ink-dim); padding: 8px 14px 4px`.
- Sections (minimum):
  - **Lägen** — Skiss (1), Skiss + Innehåll (2), Innehåll (3), Läsa (4).
  - **Skapa** — Ny nod (⌘N), Nytt projekt..., Auto-layout.
  - **Verktyg** — Ångra (⌘Z), Gör om (⌘⇧Z), Importera markdown..., Exportera markdown.
  - **Visa** — Visa historik..., Inställningar..., Hjälp.
- Filter: substring match on label (case-insensitive). Up/Down arrow navigates; Enter activates; Esc closes.

## `<SettingsModal>` spec

Single modal (existing modal idiom — Headless UI). Sections:

1. **Visning** — font-size slider (existing range behaviour), auto-save toggle (existing checkbox).
2. **AI** — current `aiSettings` summary + button "Öppna AI-inställningar..." that opens existing `AiSettingsModal`.
3. **Avancerat** — debug-mode toggle (existing).

Close on Esc / backdrop click / × button. No design rework of `AiSettingsModal` itself — only re-launched from here.

## Behaviour preservation contract

The redesign must NOT change any of:
- Firestore sync semantics (auto-save, history snapshots every 5 min, project list).
- Auth flow (sign-in/sign-out, `useAuth`, protected actions).
- Project create / load / delete / import / export semantics.
- Undo/redo stack behaviour.
- Auto-layout (dagre) output.
- Node id generation (`#NNN`, 3-digit zero-padded).
- Edge scanning regex `/\[#(\d{3})]|#(\d{3})/g` and re-scanning behaviour.
- TipTap document model (existing extensions: `ActiveNodeHighlight`, `ArrowLink`, `CustomLink`, etc.).
- AI proofread / suggestions / settings semantics.

Any deviation from these is a bug.

## Risk register

| Risk | Mitigation |
|---|---|
| Firestore sync regression | `useFirestoreSync` untouched; `App.jsx` still owns nodes/edges and calls the same hooks. |
| Project history snapshots break | Snapshot logic in `useFirestoreSync` — not touched. |
| Undo/redo break | State setters untouched; only JSX moves. |
| TipTap editor in DocPane misbehaves | Embed existing `LinearTextEditor.tsx` rather than rebuild. |
| ReactFlow event handlers misfire after restyle | Pure CSS changes; ReactFlow JSX wrapper barely changes. |
| AI features break | Components unchanged; just opened from new launchers. |
| Lost work mid-rewrite | Pre-tag `pre-redesign-v0.8.2`; branch separate from master; Vercel preview before merge. |
| `splitRatio` drag laggy | Use `rAF` throttling on mousemove; persist on mouseup, not on every move. |
| IntersectionObserver edge cases | Fallback scroll-listener finds nearest h2 (described in sync section). |
| `<h2>` data-node-id not rendered by TipTap | Existing `ActiveNodeHighlight` already manages this; verify integration during DocPane build. |

## Commit / PR sequence

Single branch `feature/redesign-modes-and-layout` cut from `master` after tagging `pre-redesign-v0.8.2`. Implementation in linear commits, each leaving the app runnable:

1. **`feat(theme): add full token set, fonts, paper modes`** — `theme.css` rewrite, `index.html` Google Fonts. Existing UI continues to render (it uses `--bg`, `--panel`, etc., which still exist).
2. **`feat(shell): AppShell + SidebarNav + slim Topbar`** — basic mode switching state. Modes render existing components inside placeholder wrappers so the app still works while shell is built.
3. **`feat(graph): GraphPane + restyled NodeCard`** — Skiss mode polished; toolbar/zoom/minimap wired.
4. **`feat(doc): DocPane replaces LinearView`** — outline, focus mode, status bar, ref-link rendering, scroll sync. Cherry-picks the LinearView scroll fix from `feature/fix-tailwind-classes`.
5. **`feat(read): ReadPane replaces Playthrough`** — paper/dark, drop-cap, choices, breadcrumb.
6. **`feat(palette): CommandPalette + SettingsModal`** — wire up all migrated chrome.
7. **`chore: delete FloatingMenu, LinearView, Playthrough; slim App.jsx`**.
8. **`chore(release): v0.9.0 + CHANGELOG`**.

## Testing

- **Existing Jest tests** must pass after each commit. LinearView-specific tests adapt to `DocPane`.
- **Manual smoke** before merge:
  1. Switch between all 4 modes via sidebar and via 1/2/3/4 — state persists across reload.
  2. Split mode: click node scrolls doc; scroll in doc highlights node; click `[#NNN]` link does the same; drag divider adjusts ratio (clamp 0.2–0.8).
  3. Innehåll: outline-toggle works; focus mode entered/exited via button + Esc; status bar updates word count live.
  4. Läsa: paper/dark toggles theme; läsare/redaktör shows/hides #NNN debug; back/restart work; breadcrumb-click jumps back in history.
  5. ⌘K opens palette; arrow keys + Enter navigate; Esc closes; "Skiss" entry switches mode.
  6. Existing functionality smoke: sign-in/out, project switch, new project, import/export, auto-save, undo/redo, AI proofread, AI suggestions.
- **Vercel preview** on the branch is staging; click through it before merging to `master`.
- **Rollback path** if production regresses: revert merge commit on `master`, or check out tag `pre-redesign-v0.8.2` and force-deploy via Vercel.

## Out of scope (explicit defers)

- Light app theme.
- "Sektion" and "Idé" buttons in graph toolbar — render as disabled placeholders; behaviour added in a later spec.
- AI Proofread and AI Suggestions re-wiring (the underlying calls in `useAi.js` are currently commented out in App.jsx). Only `AiSettingsModal` is preserved.
- Search inside doc body (existing `showSearch` is replaced by palette; in-doc text search is a separate concern).
- Multi-select / bulk operations in graph.
- Node-card colour picker UI rework (existing `node.data.color` still respected by accent-bar).
- Mobile / narrow-viewport layout (existing breakpoint behaviour preserved; redesigned shell is desktop-first).

## Definition of done

- All 8 commits land on `feature/redesign-modes-and-layout`.
- Manual smoke passes on Vercel preview.
- `npx jest` is green.
- `npx eslint src/` is clean (or only pre-existing warnings).
- `package.json` version is `0.9.0`.
- `CHANGELOG.md` entry for v0.9.0 added.
- `facts/REGISTRY.md` updated for new/deleted files.
- `facts/STRATEGY.md` notes the modes-and-layout decision.
- PR merged to `master`; Vercel auto-deploys.
- `pre-redesign-v0.8.2` tag exists on master pre-merge.
