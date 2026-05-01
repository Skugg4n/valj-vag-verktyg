# Modes & Layout Redesign — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Spec:** `docs/superpowers/specs/2026-05-01-modes-and-layout-design.md`
**Goal:** Replace the current single-pane shell with four modes (Skiss / Skiss + Innehåll / Innehåll / Läsa), a 56px sidebar nav, a slim 44px topbar, a ⌘K command palette, a Google-Docs-style document editor, and a redesigned reader. Existing functionality is preserved; the chrome is reorganised.
**Architecture:** Single branch `feature/redesign-modes-and-layout` cut from `master`, after `master` is tagged `pre-redesign-v0.8.2` for rollback. App.jsx slims to data + hooks; new `AppShell` orchestrates UI state (mode, splitRatio, focusMode, palette). Existing hooks (`useFirestoreSync`, `useProjectStorage`, `useAi`) and TipTap editor (`LinearTextEditor`) are reused untouched.
**Tech Stack:** React 19, Vite 6, ReactFlow 11, TipTap 2, Headless UI, Lucide React, Jest + @testing-library/react. Plain CSS with custom properties (no Tailwind).

---

## Conventions for every task

- After every step that touches code, the app must still run (`npm run dev`) and `npx jest` must still pass.
- Commit at the end of each task. Commit messages use conventional commits (`feat(scope): ...`, `chore(scope): ...`).
- All Swedish labels are exactly as in the spec (`Skiss`, `Innehåll`, `Läsa`, `Sök`, `Avsluta fokus`, `Nytt projekt...`, `Importera markdown`, etc.).
- Do not introduce Tailwind utility classes anywhere. Use the `.btn` / `.btn.ghost` / `.btn.primary` / `.btn.danger` system extended in `index.css`.
- All new components live in `src/` (not in subfolders) to match existing convention.
- Tests live in `src/__tests__/<Component>.test.{jsx,tsx}`.

---

## Task 0: Branch setup, design-handoff archive, cherry-pick

**Files:**
- Create: `docs/design-handoff/styles.css` (copy)
- Create: `docs/design-handoff/README.md` (copy of source handoff README, for posterity)
- Tag: `pre-redesign-v0.8.2`
- Branch: `feature/redesign-modes-and-layout`

- [ ] **Step 1: Confirm clean master**

```bash
git checkout master
git pull
git status
```
Expected: clean working tree on `master`.

- [ ] **Step 2: Tag rollback marker on master**

```bash
git tag pre-redesign-v0.8.2
git tag --list | grep pre-redesign
```
Expected: `pre-redesign-v0.8.2` printed.

- [ ] **Step 3: Cut redesign branch**

```bash
git checkout -b feature/redesign-modes-and-layout
git status
```
Expected: `On branch feature/redesign-modes-and-layout`.

- [ ] **Step 4: Cherry-pick the spec doc commits from `feature/fix-tailwind-classes`**

```bash
git log --oneline feature/fix-tailwind-classes ^master | head
```
Identify the two spec commits (subjects: `docs(spec): redesign modes and layout (v0.9.0)` and `docs(spec): self-review fixes — kbd shortcuts, AI scope`).

```bash
git cherry-pick <hash-of-spec-commit> <hash-of-self-review-commit>
git log --oneline -3
```
Expected: both commits now on `feature/redesign-modes-and-layout`.

- [ ] **Step 5: Cherry-pick the LinearView scroll fix from `feature/fix-tailwind-classes`**

The fix lives in the working tree of `feature/fix-tailwind-classes` (uncommitted). Apply it directly:

```bash
git checkout feature/fix-tailwind-classes -- src/LinearView.jsx
git diff src/LinearView.jsx | head -40
```

Verify the diff matches the manual DOM scroll fix described in CLAUDE.md's Gotcha section (replaces `editor.chain().setTextSelection(targetPos).scrollIntoView().run()` with `requestAnimationFrame` + manual `container.scrollTop` adjustment).

- [ ] **Step 6: Commit the cherry-picked LinearView fix**

```bash
git add src/LinearView.jsx
git commit -m "fix(linear): scroll heading to top of container

ProseMirror's scrollIntoView() does not scroll to the top of the
nearest scroll container. Replace it with a manual DOM scroll
that lines the active <h2> up with the container top + 16px.

This is preserved from feature/fix-tailwind-classes; the Tailwind
cleanup on FloatingMenu/index.css from that branch is intentionally
not picked up — those files are deleted/rewritten in this redesign.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

- [ ] **Step 7: Archive the design handoff CSS for engineers**

```bash
mkdir -p docs/design-handoff
cp /tmp/vvv-design/design_handoff_modes_and_layout/styles.css docs/design-handoff/styles.css
cp /tmp/vvv-design/design_handoff_modes_and_layout/README.md docs/design-handoff/README.md
```

If `/tmp/vvv-design/` is gone, re-extract from `~/Downloads/valj-vag-verktyg.zip` using:
```bash
python3 -c "import zipfile; z=zipfile.ZipFile('/Users/olabelin/Downloads/valj-vag-verktyg.zip'); [z.extract(i, '/tmp/vvv-design/') for i in z.infolist() if not i.filename.endswith('.html')]"
```

- [ ] **Step 8: Commit the design handoff archive**

```bash
git add docs/design-handoff/
git commit -m "docs(design): archive Claude Design handoff for redesign

Source CSS (styles.css) and README from the design package, copied
into the repo so future engineers can reference the canonical token
values, exact dimensions, and prose explanation alongside the spec.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

- [ ] **Step 9: Verify baseline build still works**

```bash
npm run build 2>&1 | tail -10
```
Expected: build succeeds (no new code yet).

```bash
npx jest 2>&1 | tail -10
```
Expected: tests pass (or same baseline as master).

---

## Task 1: Design tokens, fonts, base CSS

**Files:**
- Modify: `src/theme.css` (full rewrite)
- Modify: `index.html` (add Google Fonts link)
- Modify: `src/index.css` (remove now-unused old vars; the old `--text`, `--btn`, `--btn-hover`, `--modal-bg`, `--card` references already exist throughout — replace with `--ink`, `--panel-2`, `--line`, etc.)

This task introduces the new tokens but does NOT yet remove the old ones (`--text`, `--btn`, etc.) — those are kept as aliases so existing CSS still resolves. Aliases are dropped in Task 7.

- [ ] **Step 1: Rewrite `src/theme.css` to the full token set**

Replace the entire file with:

```css
/* === Välj Väg Verktyg — Design tokens === */
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
  --font-doc:  "Source Serif Pro", "Iowan Old Style", Georgia, "Times New Roman", serif;
  --font-mono: "JetBrains Mono", ui-monospace, "SF Mono", Menlo, monospace;

  /* Scale */
  --r-sm: 4px;
  --r:    6px;
  --r-md: 10px;
  --r-lg: 14px;

  /* Easing */
  --ease: cubic-bezier(.2,.8,.2,1);

  /* Legacy aliases — kept until Task 7 cleanup so existing index.css
     rules (--text, --btn, --modal-bg, etc.) keep resolving. */
  --text:       var(--ink);
  --text-dim:   var(--ink-dim);
  --btn:        var(--panel-2);
  --btn-hover:  var(--line);
  --modal-bg:   var(--panel);
  --radius:     var(--r);
  --gap:        0.5rem;
  --font-size:  14px;
}

/* Reading-mode tokens (used by ReadPane via [data-reading="..."]) */
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

@media (max-width: 768px) {
  :root {
    --font-size: 12px;
    --gap: 0.25rem;
  }
}
```

The old `[data-theme="light"]` and `[data-theme="dark"]` blocks are gone.

- [ ] **Step 2: Add Google Fonts link to `index.html`**

Open `index.html`. Inside `<head>`, before the existing `<title>` tag, add:

```html
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+Pro:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500&family=Inter:wght@400;500;600&display=swap" rel="stylesheet">
```

(Inter is already used; preloading it via Google Fonts removes a layout-shift; if `Inter` is loaded by another mechanism in the project, leave it in this link anyway — no harm.)

- [ ] **Step 3: Remove `data-theme` attribute setting from `App.jsx`**

In `src/App.jsx`, locate the `useEffect` that sets `data-theme`:

```js
useEffect(() => {
  document.documentElement.setAttribute('data-theme', theme)
  localStorage.setItem('vv-theme', theme)
}, [theme])
```

Replace with a hard-coded effect that **clears any stale attribute**:

```js
useEffect(() => {
  document.documentElement.removeAttribute('data-theme')
}, [])
```

Also remove the `theme` state declaration line:
```js
const [theme, setTheme] = useState(() => localStorage.getItem('vv-theme') || 'dark')
```

And the theme toggle button in the header (the `<Button variant="ghost" icon={theme === 'dark' ? Sun : Moon} ...>` block, around lines 1158–1165).

The `Sun` / `Moon` imports (lines 12–13) become unused — remove them. ESLint will catch them otherwise.

- [ ] **Step 4: Add a localStorage helper module**

Create `src/utils/persistence.js`:

```js
const PREFIX = 'vv-'

export function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function saveLS(key, value) {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value))
  } catch {
    /* quota exhausted or disabled — ignore */
  }
}
```

- [ ] **Step 5: Test the persistence helpers**

Create `src/__tests__/persistence.test.js`:

```js
import { loadLS, saveLS } from '../utils/persistence.js'

describe('persistence', () => {
  beforeEach(() => localStorage.clear())

  it('returns fallback when key absent', () => {
    expect(loadLS('mode', 'split')).toBe('split')
  })

  it('roundtrips a string value', () => {
    saveLS('mode', 'text')
    expect(loadLS('mode', 'split')).toBe('text')
  })

  it('roundtrips a number value', () => {
    saveLS('split-ratio', 0.42)
    expect(loadLS('split-ratio', 0.5)).toBe(0.42)
  })

  it('returns fallback on malformed JSON', () => {
    localStorage.setItem('vv-mode', 'not-json{')
    expect(loadLS('mode', 'split')).toBe('split')
  })

  it('namespaces with vv- prefix', () => {
    saveLS('foo', 'bar')
    expect(localStorage.getItem('vv-foo')).toBe('"bar"')
  })
})
```

- [ ] **Step 6: Run tests**

```bash
npx jest --testPathPattern=persistence
```
Expected: 5 passing tests.

- [ ] **Step 7: Run dev server, smoke check**

```bash
npm run dev
```
Open http://localhost:5173. Confirm:
- App still loads.
- Existing UI looks the same (legacy aliases preserve appearance).
- No console errors about missing `--text`, `--btn`, `--btn-hover`, `--modal-bg`.

Stop the dev server (Ctrl+C).

- [ ] **Step 8: Commit**

```bash
git add src/theme.css index.html src/App.jsx src/utils/persistence.js src/__tests__/persistence.test.js
git commit -m "feat(theme): add full token set, fonts, persistence helper

- Replace minimal --bg/--panel/--card vars with the full token set
  from the design package: --bg-soft, --panel-2, --line/-strong,
  --ink/-soft/-dim, --accent/-soft, --good/--warn/--danger.
- Keep legacy aliases (--text, --btn, --modal-bg, --radius) until
  Task 7 cleanup so existing CSS keeps resolving.
- Add reading-mode tokens (paper/dark) for ReadPane.
- Drop [data-theme=light] and [data-theme=dark]; app is dark-only.
- Import Source Serif Pro + JetBrains Mono from Google Fonts.
- Add src/utils/persistence.js for vv-prefixed localStorage I/O.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 2: AppShell skeleton, SidebarNav, slim Topbar, mode switching

**Files:**
- Create: `src/AppShell.jsx`
- Create: `src/SidebarNav.jsx`
- Create: `src/Topbar.jsx`
- Create: `src/__tests__/AppShell.test.jsx`
- Modify: `src/App.jsx` (replace JSX from `<header>...</header>` block onward with `<AppShell />`; pass through props)
- Modify: `src/index.css` (append shell + sidebar + topbar rules from `docs/design-handoff/styles.css` lines 161–245 and 827–865)

In this task the four modes are wired but their contents reuse the existing components inside placeholder wrappers, so the app keeps working while the shell is built. GraphPane/DocPane/ReadPane proper land in Tasks 3–5.

- [ ] **Step 1: Append shell/sidebar/topbar styles to `src/index.css`**

Open `docs/design-handoff/styles.css` and copy the rules under sections "App shell", "Top bar", "Workspace", "Sidebar variant for menus", and the scrollbar block at the end (lines roughly 161–245 and 827–870 of that file). Append them verbatim to `src/index.css`. Keep the existing rules above untouched.

The exact rules to append (full block):

```css
/* ----- App shell ----- */
.app-shell {
  display: flex;
  height: 100vh;
  background: var(--bg);
  color: var(--ink);
  overflow: hidden;
  font-size: 14px;
  font-family: var(--font-ui);
}
.app-shell .right-col {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

/* ----- Top bar (slim, 44px) ----- */
.topbar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  padding: 0 14px;
  border-bottom: 1px solid var(--line);
  background: var(--bg);
  flex: 0 0 auto;
}
.topbar .project-name {
  background: transparent;
  border: none;
  outline: none;
  font-family: var(--font-doc);
  font-style: italic;
  font-size: 15px;
  color: var(--ink);
  padding: 4px 8px;
  border-radius: 4px;
  min-width: 200px;
}
.topbar .project-name:hover,
.topbar .project-name:focus { background: var(--panel); }
.topbar .pill {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  padding: 3px 8px;
  font-size: 11.5px;
  font-weight: 500;
  border-radius: 999px;
  background: var(--panel-2);
  color: var(--ink-soft);
  border: 1px solid var(--line);
}
.topbar .pill .dot {
  width: 6px; height: 6px;
  border-radius: 50%;
  background: var(--good);
}
.topbar .pill.saving .dot { background: var(--warn); }
.topbar .divider { width: 1px; height: 22px; background: var(--line); }
.topbar .avatar {
  width: 26px; height: 26px;
  border-radius: 50%;
  background: linear-gradient(135deg, var(--accent), #b88dff);
  border: none;
  cursor: pointer;
}
.topbar .kbd {
  display: inline-block;
  padding: 1px 5px;
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--ink-dim);
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 3px;
  margin-left: 6px;
}

/* ----- Workspace ----- */
.workspace {
  flex: 1;
  display: flex;
  position: relative;
  overflow: hidden;
  min-height: 0;
}

/* ----- Sidebar nav ----- */
.sidebar-nav {
  width: 56px;
  flex: 0 0 auto;
  background: var(--bg-soft);
  border-right: 1px solid var(--line);
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 12px 0;
  gap: 4px;
}
.sidebar-nav .logo {
  width: 40px; height: 40px;
  border-radius: 8px;
  background: linear-gradient(135deg, var(--accent), #b88dff);
  border: none;
  cursor: pointer;
  position: relative;
}
.sidebar-nav .logo::after {
  content: "";
  position: absolute; inset: 12px;
  border: 1.5px solid rgba(13,17,23,.5);
  border-radius: 2px;
  border-right-color: transparent;
  border-bottom-color: transparent;
}
.sidebar-nav .sep { width: 28px; height: 1px; background: var(--line); margin: 8px 0; }
.sidebar-nav .sb-btn {
  width: 40px; height: 40px;
  display: inline-flex;
  align-items: center; justify-content: center;
  background: transparent;
  border: none;
  border-radius: 8px;
  color: var(--ink-dim);
  cursor: pointer;
  position: relative;
  transition: background 0.15s var(--ease), color 0.15s var(--ease);
}
.sidebar-nav .sb-btn:hover { background: var(--panel); color: var(--ink); }
.sidebar-nav .sb-btn.active { background: var(--panel-2); color: var(--accent); }
.sidebar-nav .sb-btn.active::before {
  content: "";
  position: absolute;
  left: -1px;
  top: 8px; bottom: 8px;
  width: 2px;
  background: var(--accent);
  border-radius: 0 2px 2px 0;
}
.sidebar-nav .sb-btn svg { width: 18px; height: 18px; }
.sidebar-nav .spacer { flex: 1; }

/* Scrollbar tweaks for the new shell */
.app-shell ::-webkit-scrollbar { width: 8px; height: 8px; }
.app-shell ::-webkit-scrollbar-thumb { background: var(--line-strong); border-radius: 4px; }
.app-shell ::-webkit-scrollbar-thumb:hover { background: var(--ink-dim); }
.app-shell ::-webkit-scrollbar-track { background: transparent; }
```

- [ ] **Step 2: Create `src/SidebarNav.jsx`**

```jsx
import { Network, Columns2, FileText, BookOpen, History, Settings } from 'lucide-react'

const MODES = [
  { id: 'skiss', label: 'Skiss', icon: Network },
  { id: 'split', label: 'Skiss + Innehåll', icon: Columns2 },
  { id: 'text',  label: 'Innehåll', icon: FileText },
  { id: 'read',  label: 'Läsa', icon: BookOpen },
]

export default function SidebarNav({ mode, setMode, onShowHistory, onShowSettings }) {
  return (
    <nav className="sidebar-nav" aria-label="Lägesväxlare">
      <button className="logo" title="Hem" aria-label="Hem" onClick={() => setMode('split')} />
      <div className="sep" aria-hidden="true" />
      {MODES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`sb-btn ${mode === id ? 'active' : ''}`}
          title={label}
          aria-label={label}
          aria-pressed={mode === id}
          onClick={() => setMode(id)}
        >
          <Icon />
        </button>
      ))}
      <div className="spacer" />
      <button className="sb-btn" title="Historik" aria-label="Historik" onClick={onShowHistory}>
        <History />
      </button>
      <button className="sb-btn" title="Inställningar" aria-label="Inställningar" onClick={onShowSettings}>
        <Settings />
      </button>
    </nav>
  )
}
```

- [ ] **Step 3: Create `src/Topbar.jsx`**

```jsx
import { Search, Share2 } from 'lucide-react'

export default function Topbar({
  projectName,
  setProjectName,
  isSaving,
  onCmdK,
  onShare,
  onAvatarClick,
}) {
  return (
    <header className="topbar">
      <input
        className="project-name"
        value={projectName}
        onChange={e => setProjectName(e.target.value)}
        placeholder="Projektnamn"
        aria-label="Projektnamn"
      />
      <span className={`pill ${isSaving ? 'saving' : ''}`} aria-live="polite">
        <span className="dot" aria-hidden="true" />
        {isSaving ? 'sparar…' : 'sparad'}
      </span>
      <span style={{ flex: 1 }} />
      <button className="btn ghost sm" onClick={onCmdK} title="Sök / Kommandopalett">
        <Search />
        Sök
        <span className="kbd">⌘K</span>
      </button>
      <button className="btn ghost icon" onClick={onShare} title="Dela" aria-label="Dela">
        <Share2 />
      </button>
      <span className="divider" aria-hidden="true" />
      <button className="avatar" onClick={onAvatarClick} title="Konto" aria-label="Konto" />
    </header>
  )
}
```

- [ ] **Step 4: Create `src/AppShell.jsx`**

```jsx
import { useState, useEffect, useCallback } from 'react'
import SidebarNav from './SidebarNav.jsx'
import Topbar from './Topbar.jsx'
import { loadLS, saveLS } from './utils/persistence.js'

const MODES = ['skiss', 'split', 'text', 'read']

export default function AppShell({
  // Data + handlers from App.jsx — passed through to mode renderers
  projectName, setProjectName,
  isSaving,
  renderSkiss,   // () => ReactNode
  renderSplit,   // ({ ratio }) => ReactNode
  renderText,    // ({ focusMode }) => ReactNode
  renderRead,    // () => ReactNode
  onShowHistory,
  onOpenPalette,
  onShowSettings,
  onShare,
  onAvatarClick,
}) {
  const [mode, setModeRaw] = useState(() => {
    const m = loadLS('mode', 'split')
    return MODES.includes(m) ? m : 'split'
  })
  const [splitRatio, setSplitRatio] = useState(() => {
    const r = loadLS('split-ratio', 0.42)
    return clampRatio(typeof r === 'number' ? r : 0.42)
  })
  const [focusMode, setFocusMode] = useState(false)

  const setMode = useCallback((m) => {
    if (!MODES.includes(m)) return
    setModeRaw(m)
    saveLS('mode', m)
    if (m !== 'text') setFocusMode(false)
  }, [])

  // Persist split ratio (debounced via mouseup in split renderer; here we
  // just persist whatever value lands in state)
  useEffect(() => {
    saveLS('split-ratio', splitRatio)
  }, [splitRatio])

  // Keyboard shortcuts: ⌘K, 1/2/3/4, Esc
  useEffect(() => {
    const onKey = (e) => {
      const inEditable =
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenPalette?.()
        return
      }
      if (e.key === 'Escape' && focusMode) {
        e.preventDefault()
        setFocusMode(false)
        return
      }
      if (!inEditable && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        setMode(MODES[Number(e.key) - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusMode, setMode, onOpenPalette])

  let workspace = null
  if (mode === 'skiss') workspace = renderSkiss?.()
  else if (mode === 'split') workspace = renderSplit?.({ ratio: splitRatio, setRatio: setSplitRatio })
  else if (mode === 'text') workspace = renderText?.({ focusMode, setFocusMode })
  else if (mode === 'read') workspace = renderRead?.()

  const shellClass = `app-shell${focusMode && mode === 'text' ? ' focus-mode' : ''}`

  return (
    <div className={shellClass}>
      <SidebarNav
        mode={mode}
        setMode={setMode}
        onShowHistory={onShowHistory}
        onShowSettings={onShowSettings}
      />
      <div className="right-col">
        <Topbar
          projectName={projectName}
          setProjectName={setProjectName}
          isSaving={isSaving}
          onCmdK={onOpenPalette}
          onShare={onShare}
          onAvatarClick={onAvatarClick}
        />
        <div className="workspace">{workspace}</div>
      </div>
      {focusMode && mode === 'text' && (
        <button
          className="btn ghost sm"
          style={{ position: 'fixed', top: 16, right: 16, zIndex: 30 }}
          onClick={() => setFocusMode(false)}
        >
          Avsluta fokus
        </button>
      )}
    </div>
  )
}

export function clampRatio(r) {
  if (Number.isNaN(r)) return 0.42
  return Math.max(0.2, Math.min(0.8, r))
}
```

- [ ] **Step 5: Test AppShell wiring**

Create `src/__tests__/AppShell.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import AppShell, { clampRatio } from '../AppShell.jsx'

beforeEach(() => localStorage.clear())

function makeShell(extra = {}) {
  return (
    <AppShell
      projectName="Test"
      setProjectName={() => {}}
      isSaving={false}
      renderSkiss={() => <div data-testid="skiss-content">SKISS</div>}
      renderSplit={() => <div data-testid="split-content">SPLIT</div>}
      renderText={() => <div data-testid="text-content">TEXT</div>}
      renderRead={() => <div data-testid="read-content">READ</div>}
      onShowHistory={() => {}}
      onOpenPalette={() => {}}
      onShowSettings={() => {}}
      onShare={() => {}}
      onAvatarClick={() => {}}
      {...extra}
    />
  )
}

describe('AppShell', () => {
  it('renders split mode by default', () => {
    render(makeShell())
    expect(screen.getByTestId('split-content')).toBeInTheDocument()
  })

  it('switches mode via sidebar button', () => {
    render(makeShell())
    fireEvent.click(screen.getByLabelText('Innehåll'))
    expect(screen.getByTestId('text-content')).toBeInTheDocument()
  })

  it('switches mode via 1/2/3/4 keys outside inputs', () => {
    render(makeShell())
    fireEvent.keyDown(window, { key: '1' })
    expect(screen.getByTestId('skiss-content')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: '4' })
    expect(screen.getByTestId('read-content')).toBeInTheDocument()
  })

  it('does NOT switch mode when key fires from an input', () => {
    render(makeShell())
    const input = screen.getByLabelText('Projektnamn')
    fireEvent.keyDown(input, { key: '1' })
    expect(screen.getByTestId('split-content')).toBeInTheDocument()
  })

  it('opens palette via ⌘K', () => {
    const onOpenPalette = jest.fn()
    render(makeShell({ onOpenPalette }))
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(onOpenPalette).toHaveBeenCalledTimes(1)
  })

  it('persists mode to localStorage on change', () => {
    render(makeShell())
    fireEvent.click(screen.getByLabelText('Läsa'))
    expect(localStorage.getItem('vv-mode')).toBe('"read"')
  })
})

describe('clampRatio', () => {
  it('clamps below 0.2 to 0.2', () => {
    expect(clampRatio(0.05)).toBe(0.2)
  })
  it('clamps above 0.8 to 0.8', () => {
    expect(clampRatio(0.95)).toBe(0.8)
  })
  it('returns 0.42 for NaN', () => {
    expect(clampRatio(Number.NaN)).toBe(0.42)
  })
  it('passes valid values through', () => {
    expect(clampRatio(0.5)).toBe(0.5)
  })
})
```

- [ ] **Step 6: Wire `App.jsx` to render `AppShell` instead of the old header+main**

Open `src/App.jsx`. The existing JSX is the entire `return (...)` block that begins with `<header>` and ends with `</>`. Replace it with the structure below. Many existing handlers (`addNode`, `deleteNode`, `undo`, `redo`, `handleProjectSwitch`, `handleAutoLayout`, `exportProject`, `exportMarkdown`, `importProject`, `addIdea`, `addSection`, `showHistory`, `confirmNewProject`, `startPlaythrough`) are kept and passed into `AppShell` as render-callbacks or button handlers. The `<header>` block disappears.

At the top of `App.jsx`, add:

```jsx
import AppShell from './AppShell.jsx'
```

And remove now-unused imports from the top of the file:
```jsx
// REMOVE these unused-after-this-task imports:
//   Plus, Trash2, RotateCcw, RotateCw, Download, Upload, FilePlus, FileText, ChevronDown
// from 'lucide-react'
//   Popover, Transition  from '@headlessui/react'
//   Button   from './Button.jsx'
//   FloatingMenu from './FloatingMenu.jsx'
```

Wait — `FloatingMenu` is still rendered until Task 7. And `Popover/Transition` are used by `UserMenu`. Keep those. Only remove imports that are demonstrably unused after this step:
- `Plus, Trash2, RotateCcw, RotateCw, Download, Upload, FilePlus, FileText, ChevronDown` — moved to graph/palette later, currently unused.
- `Button` — was used by header buttons; still used by `LinearView`/`Playthrough`? grep before deleting:

```bash
grep -rn "from './Button" src/
```

Keep the import only if other files use it. (It is used by other files; keep the import in App.jsx for safety until it's truly unreferenced after Task 7.) **Decision: leave `Button` import in place; only remove the lucide icons listed above.**

Replace the entire `return (...)` block with:

```jsx
return (
  <>
    <AppShell
      projectName={projectName}
      setProjectName={setProjectName}
      isSaving={false /* TODO: wire saveQueue state — Task 6 */}
      renderSkiss={() => (
        <div id="graph" style={{ flex: 1, position: 'relative' }}>
          <NodeEditorContext.Provider value={{ updateNodeText, resizingRef, selectNode }}>
            <ReactFlow
              style={{ width: '100%', height: '100%' }}
              nodes={nodes}
              edges={edges}
              defaultEdgeOptions={defaultEdgeOptions}
              onNodesChange={onNodesChange}
              onEdgesChange={onEdgesChange}
              onConnect={onConnect}
              onNodeClick={onNodeClick}
              onReconnect={onReconnect}
              onReconnectStart={onReconnectStart}
              onReconnectEnd={onReconnectEnd}
              edgesUpdatable
              onNodeDragStop={() => pushUndoState()}
              onPaneClick={onPaneClick}
              nodeTypes={nodeTypes}
              snapToGrid
              snapGrid={[16, 16]}
              fitView
              minZoom={0.1}
              maxZoom={4}
            >
              <Background color="#374151" variant="dots" gap={16} size={1} />
              <MiniMap zoomable pannable />
              <Controls />
            </ReactFlow>
          </NodeEditorContext.Provider>
        </div>
      )}
      renderSplit={({ ratio, setRatio }) => (
        <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
          <div style={{ flex: ratio, minWidth: 0, display: 'flex' }}>
            <div id="graph" style={{ flex: 1, position: 'relative' }}>
              <NodeEditorContext.Provider value={{ updateNodeText, resizingRef, selectNode }}>
                <ReactFlow
                  style={{ width: '100%', height: '100%' }}
                  nodes={nodes}
                  edges={edges}
                  defaultEdgeOptions={defaultEdgeOptions}
                  onNodesChange={onNodesChange}
                  onEdgesChange={onEdgesChange}
                  onConnect={onConnect}
                  onNodeClick={onNodeClick}
                  onReconnect={onReconnect}
                  onReconnectStart={onReconnectStart}
                  onReconnectEnd={onReconnectEnd}
                  edgesUpdatable
                  onNodeDragStop={() => pushUndoState()}
                  onPaneClick={onPaneClick}
                  nodeTypes={nodeTypes}
                  snapToGrid
                  snapGrid={[16, 16]}
                  fitView
                  minZoom={0.1}
                  maxZoom={4}
                >
                  <Background color="#374151" variant="dots" gap={16} size={1} />
                  <MiniMap zoomable pannable />
                  <Controls />
                </ReactFlow>
              </NodeEditorContext.Provider>
            </div>
          </div>
          <div
            className="split-divider"
            onMouseDown={() => {
              const onMove = (e) => {
                const root = document.querySelector('.workspace')
                if (!root) return
                const rect = root.getBoundingClientRect()
                const r = (e.clientX - rect.left) / rect.width
                setRatio(Math.max(0.2, Math.min(0.8, r)))
              }
              const onUp = () => {
                window.removeEventListener('mousemove', onMove)
                window.removeEventListener('mouseup', onUp)
              }
              window.addEventListener('mousemove', onMove)
              window.addEventListener('mouseup', onUp)
            }}
          />
          <div style={{ flex: 1 - ratio, minWidth: 0, display: 'flex' }}>
            <LinearView
              text={linearText}
              setText={setLinearText}
              setNodes={setNodes}
              nextId={nextId}
              expanded={false}
              onToggleExpand={() => {}}
              activeNodeId={activeNodeId}
              onSelectNode={handleLinearSelect}
            />
          </div>
        </div>
      )}
      renderText={() => (
        <LinearView
          text={linearText}
          setText={setLinearText}
          setNodes={setNodes}
          nextId={nextId}
          expanded={true}
          onToggleExpand={() => {}}
          activeNodeId={activeNodeId}
          onSelectNode={handleLinearSelect}
        />
      )}
      renderRead={() => null /* placeholder until Task 5 */}
      onShowHistory={showHistory}
      onOpenPalette={() => alert('Command palette coming in Task 6')}
      onShowSettings={openSettings}
      onShare={() => {}}
      onAvatarClick={() => {/* UserMenu handled inside avatar later */}}
    />

    {/* Modals/overlays kept at root for now */}
    {showPlay && (
      <Playthrough
        nodes={nodes}
        startId={currentId || undefined}
        onClose={() => setShowPlay(false)}
      />
    )}
    {showAiSettings && (
      <AiSettingsModal
        settings={aiSettings}
        onChange={setAiSettings}
        onClose={() => setShowAiSettings(false)}
      />
    )}
    {showNewProject && (
      <NewProjectModal
        onConfirm={startNewProject}
        onClose={() => setShowNewProject(false)}
      />
    )}

    {/* FloatingMenu kept until Task 7 so all functions remain reachable */}
    <FloatingMenu
      onShowSettings={openSettings}
      onPlaythrough={startPlaythrough}
      onAutoLayout={!showPlay ? handleAutoLayout : undefined}
      onAddSection={addSection}
      onAddIdea={addIdea}
      onShowHistory={showHistory}
      onHelp={openHelp}
    />

    <div
      style={{
        position: 'fixed',
        bottom: 4,
        right: 16,
        fontSize: '12px',
        opacity: 0.6,
        zIndex: 5,
      }}
    >
      v{__APP_VERSION__} ({__GIT_HASH__})
    </div>
  </>
)
```

Notes:
- `LinearView` is reused for both `text` and `split` modes for now — it'll be replaced by `DocPane` in Task 4.
- `renderRead` returns `null` until Task 5; the modes button still works but the read mode is empty. The old `Playthrough` modal is still triggered by `FloatingMenu` → "Spela igenom".
- All existing modals (Playthrough, AiSettingsModal, NewProjectModal) kept at root. FloatingMenu kept (it's the only access to addIdea/addSection/showHistory/openHelp until palette lands).
- The header `<header>` block, the project popover, the project switcher select, the import file input, the search input — all gone.

The `importRef` variable is no longer attached to a DOM `<input type="file">`. To preserve import functionality until Task 6 wires it through palette, add a hidden file input in the JSX. Add inside the outer `<>...</>`:

```jsx
<input
  ref={importRef}
  type="file"
  onChange={importProject}
  style={{ display: 'none' }}
/>
```

The `showSearch` / `searchQuery` state and effect block (lines ~987-998 in current App.jsx) are now unreachable from the UI. Delete them along with their `useEffect`. Also delete `setShowSearch`/`setSearchQuery` from the `useState` declarations and the `⌘F` shortcut block in the keydown handler — `⌘F` wakes up the (now-deleted) search; remove that block.

Actually, **keep `⌘F` doing nothing for now** — Task 6 will route it to the palette. To keep it simple: change the `⌘F` branch to just `e.preventDefault()` and nothing else. That preserves the existing keyboard hook signature without dangling references.

Concretely, the `⌘F` block currently is:
```js
} else if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
  e.preventDefault()
  setShowSearch(s => !s)
  if (showSearch) setSearchQuery('')
}
```
Change to:
```js
} else if ((e.metaKey || e.ctrlKey) && e.key === 'f') {
  e.preventDefault()
  // legacy search removed in Task 2; ⌘F currently a no-op until palette lands in Task 6
}
```
And remove the `useEffect` that watches `searchQuery`, the `useState` for `showSearch`/`searchQuery`, and any references.

- [ ] **Step 7: Delete the unused `header { ... }` rule from `src/index.css`**

Search `src/index.css` for the `header { position: sticky; ... }` rule (around line 19 of the current file) and delete it. Also remove the `.search-input` rule if present, since the search input is gone.

- [ ] **Step 8: Run tests**

```bash
npx jest 2>&1 | tail -20
```
Expected: all green. Existing LinearView tests (if any) still pass; new AppShell tests pass.

- [ ] **Step 9: Run dev server, manual smoke**

```bash
npm run dev
```
At http://localhost:5173, verify:
- 56px sidebar appears on the left with logo + 4 mode icons + history + settings.
- 44px topbar with project-name input, save pill, search button (⌘K kbd), share, avatar.
- Click each sidebar mode → workspace updates: Skiss shows graph only; Split shows graph+text; Innehåll shows full-width text; Läsa shows blank (placeholder).
- 1/2/3/4 keys switch mode (when not in input).
- ⌘K shows the alert ("Command palette coming in Task 6").
- FloatingMenu still works (auto-layout, idea, history, etc.).
- Project create/import/export still work (via FloatingMenu → palette stub for now... actually they're still bound through... hmm — they were bound in the deleted Project popover. They're now unreachable from the UI. **That's intentional** — they reappear in the palette in Task 6. For development, you can use the FloatingMenu's "Visa historik" or trigger via the browser console: `window.dispatchEvent(new Event('foo'))` style not applicable. **Acceptable interim:** project switch / import / export are temporarily unreachable. If this is too disruptive for dev, add a temporary `<button onClick={confirmNewProject}>` etc. — but the spec sequence already handles it via palette in Task 6.)

Stop the dev server.

- [ ] **Step 10: Commit**

```bash
git add src/AppShell.jsx src/SidebarNav.jsx src/Topbar.jsx \
        src/__tests__/AppShell.test.jsx \
        src/App.jsx src/index.css
git commit -m "feat(shell): AppShell + SidebarNav + slim Topbar

- Introduce AppShell orchestrator owning mode/splitRatio/focusMode
  state and the keyboard shortcut layer (⌘K, 1/2/3/4, Esc).
- Add 56px SidebarNav with 4 mode buttons + history + settings.
- Add 44px Topbar with project name, save pill, search button,
  share, avatar.
- App.jsx slims: deletes the old <header> block, project popover,
  project switcher select, font-size buttons, debug toggle, theme
  toggle, search input. Data state, hooks, and handlers stay.
- Modes wire up but reuse existing LinearView/ReactFlow inside
  placeholder render-callbacks; GraphPane/DocPane/ReadPane proper
  arrive in Tasks 3-5. FloatingMenu kept as interim launcher.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 3: GraphPane + restyled NodeCard

**Files:**
- Create: `src/GraphPane.jsx`
- Modify: `src/NodeCard.jsx` (restyle per spec)
- Modify: `src/App.jsx` (replace inline ReactFlow JSX in `renderSkiss`/`renderSplit` with `<GraphPane />`)
- Modify: `src/index.css` (append graph-pane + node-card rules from `docs/design-handoff/styles.css` lines 247–362)

- [ ] **Step 1: Append graph-pane styles to `src/index.css`**

Append these rules (sourced from the design-handoff `styles.css`):

```css
/* ===== GRAPH PANE ===== */
.graph-pane {
  flex: 1;
  position: relative;
  background:
    radial-gradient(circle at 20px 20px, var(--line) 1px, transparent 1.5px),
    var(--bg-soft);
  background-size: 22px 22px;
  overflow: hidden;
  min-width: 0;
}
.graph-toolbar {
  position: absolute;
  top: 12px;
  left: 12px;
  display: flex;
  gap: 4px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--r-md);
  padding: 4px;
  z-index: 5;
  box-shadow: 0 8px 24px rgba(0,0,0,.25);
}
.graph-toolbar .btn.icon { width: 28px; height: 28px; padding: 0; }

.graph-zoom {
  position: absolute;
  bottom: 12px;
  right: 12px;
  display: flex;
  flex-direction: column;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--r);
  z-index: 5;
  box-shadow: 0 8px 24px rgba(0,0,0,.25);
}
.graph-zoom button {
  background: transparent;
  border: none;
  color: var(--ink-soft);
  width: 32px; height: 32px;
  font-size: 14px;
  cursor: pointer;
  border-bottom: 1px solid var(--line);
}
.graph-zoom button:last-child { border-bottom: none; }
.graph-zoom button:hover { color: var(--ink); background: var(--panel-2); }

.graph-minimap {
  position: absolute;
  bottom: 12px;
  left: 12px;
  width: 180px;
  height: 110px;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: var(--r);
  z-index: 5;
  overflow: hidden;
  box-shadow: 0 8px 24px rgba(0,0,0,.25);
}

/* React-Flow visual overrides */
.graph-pane .react-flow__minimap {
  background: var(--panel) !important;
}
.graph-pane .react-flow__edge path {
  stroke: #3a4250;
}
.graph-pane .react-flow__edge.selected path,
.graph-pane .react-flow__edge:hover path {
  stroke: var(--accent);
}

/* Node card (re-styled in NodeCard.jsx) */
.node-card.redesigned {
  background: var(--card);
  border: 1px solid var(--line-strong);
  border-radius: 8px;
  padding: 10px 12px;
  font-size: 12.5px;
  color: var(--ink);
  box-shadow: 0 4px 14px rgba(0,0,0,.25);
  transition: border-color 0.15s var(--ease), box-shadow 0.15s var(--ease), transform 0.15s var(--ease);
  position: relative;
}
.node-card.redesigned:hover { border-color: var(--accent); transform: translateY(-1px); }
.node-card.redesigned.is-active {
  border-color: var(--accent);
  box-shadow: 0 0 0 2px var(--accent-soft), 0 8px 22px rgba(0,0,0,.4);
}
.node-card.redesigned .accent-bar {
  position: absolute;
  left: 0; top: 0; bottom: 0;
  width: 3px;
  border-radius: 8px 0 0 8px;
}
.node-card.redesigned .nc-id {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--ink-dim);
  margin-bottom: 4px;
}
.node-card.redesigned .nc-title {
  font-weight: 600;
  font-size: 13px;
  margin-bottom: 4px;
  line-height: 1.25;
  color: var(--ink);
}
.node-card.redesigned .nc-text {
  font-size: 11.5px;
  color: var(--ink-soft);
  line-height: 1.4;
  display: -webkit-box;
  -webkit-line-clamp: 3;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.node-card.redesigned .nc-text .ref {
  color: var(--accent);
  font-family: var(--font-mono);
  font-size: 10.5px;
}

/* Split-divider */
.split-divider {
  width: 1px;
  background: var(--line);
  flex: 0 0 auto;
  cursor: col-resize;
  position: relative;
}
.split-divider:hover, .split-divider.active { background: var(--accent); }
.split-divider::before {
  content: "";
  position: absolute;
  inset: 0 -3px;
}
```

- [ ] **Step 2: Create `src/GraphPane.jsx`**

```jsx
import { useCallback } from 'react'
import ReactFlow, {
  MiniMap,
  Background,
  useReactFlow,
} from 'reactflow'
import { Plus, LayoutGrid, Layers, Lightbulb, Plus as ZoomIn, Minus as ZoomOut, Crosshair } from 'lucide-react'
import NodeEditorContext from './NodeEditorContext.ts'

export default function GraphPane({
  nodes,
  edges,
  nodeTypes,
  defaultEdgeOptions,
  onNodesChange,
  onEdgesChange,
  onConnect,
  onNodeClick,
  onReconnect,
  onReconnectStart,
  onReconnectEnd,
  onPaneClick,
  onNodeDragStop,
  updateNodeText,
  resizingRef,
  selectNode,
  onAddNode,
  onAutoLayout,
  onAddSection,
  onAddIdea,
}) {
  return (
    <div className="graph-pane" id="graph">
      <NodeEditorContext.Provider value={{ updateNodeText, resizingRef, selectNode }}>
        <ReactFlow
          style={{ width: '100%', height: '100%' }}
          nodes={nodes}
          edges={edges}
          defaultEdgeOptions={defaultEdgeOptions}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onNodeClick={onNodeClick}
          onReconnect={onReconnect}
          onReconnectStart={onReconnectStart}
          onReconnectEnd={onReconnectEnd}
          edgesUpdatable
          onNodeDragStop={onNodeDragStop}
          onPaneClick={onPaneClick}
          nodeTypes={nodeTypes}
          snapToGrid
          snapGrid={[16, 16]}
          fitView
          minZoom={0.1}
          maxZoom={4}
        >
          <Background color="var(--line)" variant="dots" gap={16} size={1} />
          <MiniMap zoomable pannable className="graph-minimap-inner" />
        </ReactFlow>

        <GraphToolbar
          onAddNode={onAddNode}
          onAutoLayout={onAutoLayout}
          onAddSection={onAddSection}
          onAddIdea={onAddIdea}
        />
        <ZoomControls />
      </NodeEditorContext.Provider>
    </div>
  )
}

function GraphToolbar({ onAddNode, onAutoLayout, onAddSection, onAddIdea }) {
  return (
    <div className="graph-toolbar">
      <button className="btn ghost icon" onClick={onAddNode} title="Ny nod">
        <Plus />
      </button>
      <button className="btn ghost icon" onClick={onAutoLayout} title="Auto-layout">
        <LayoutGrid />
      </button>
      <button className="btn ghost icon" onClick={onAddSection} title="Sektion">
        <Layers />
      </button>
      <button className="btn ghost icon" onClick={onAddIdea} title="Idé">
        <Lightbulb />
      </button>
    </div>
  )
}

function ZoomControls() {
  const { zoomIn, zoomOut, fitView } = useReactFlow()
  return (
    <div className="graph-zoom">
      <button onClick={() => zoomIn()} title="Zooma in" aria-label="Zooma in">+</button>
      <button onClick={() => zoomOut()} title="Zooma ut" aria-label="Zooma ut">−</button>
      <button onClick={() => fitView()} title="Återställ zoom" aria-label="Återställ zoom">⌖</button>
    </div>
  )
}
```

- [ ] **Step 3: Restyle `src/NodeCard.jsx`**

Modify `src/NodeCard.jsx`. Add the `redesigned` class so the new CSS rules apply, and add the accent-bar element. Keep all existing functionality (resize, color picker, notes, idea promotion, overview mode).

Locate the root `<div>` in the return statement (around line 107):

```jsx
<div
  className={`node-card${selected ? ' selected' : ''}${resizing ? ' resizing' : ''}${data.isIdea ? ' idea-node' : ''}`}
```

Change to:

```jsx
<div
  className={[
    'node-card',
    'redesigned',
    selected ? 'selected' : '',
    resizing ? 'resizing' : '',
    data.isIdea ? 'idea-node' : '',
    selected ? 'is-active' : '',
  ].filter(Boolean).join(' ')}
```

Right after the opening `<div>` of the root, insert the accent-bar element:

```jsx
<span className="accent-bar" style={{ background: bg }} aria-hidden="true" />
```

The existing `bg` variable (from `data.color`) drives it.

- [ ] **Step 4: Update `App.jsx` to use `GraphPane` in renderSkiss/renderSplit**

In `App.jsx`, where you currently inline `<ReactFlow>...</ReactFlow>` inside `renderSkiss` and `renderSplit`, replace with `<GraphPane>`. Add the import at the top:

```jsx
import GraphPane from './GraphPane.jsx'
```

Replace `renderSkiss` body with:

```jsx
renderSkiss={() => (
  <GraphPane
    nodes={nodes}
    edges={edges}
    nodeTypes={nodeTypes}
    defaultEdgeOptions={defaultEdgeOptions}
    onNodesChange={onNodesChange}
    onEdgesChange={onEdgesChange}
    onConnect={onConnect}
    onNodeClick={onNodeClick}
    onReconnect={onReconnect}
    onReconnectStart={onReconnectStart}
    onReconnectEnd={onReconnectEnd}
    onPaneClick={onPaneClick}
    onNodeDragStop={() => pushUndoState()}
    updateNodeText={updateNodeText}
    resizingRef={resizingRef}
    selectNode={selectNode}
    onAddNode={addNode}
    onAutoLayout={handleAutoLayout}
    onAddSection={addSection}
    onAddIdea={addIdea}
  />
)}
```

And `renderSplit`:

```jsx
renderSplit={({ ratio, setRatio }) => (
  <div style={{ flex: 1, display: 'flex', minWidth: 0 }}>
    <div style={{ flex: ratio, minWidth: 0, display: 'flex' }}>
      <GraphPane
        nodes={nodes}
        edges={edges}
        nodeTypes={nodeTypes}
        defaultEdgeOptions={defaultEdgeOptions}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onConnect={onConnect}
        onNodeClick={onNodeClick}
        onReconnect={onReconnect}
        onReconnectStart={onReconnectStart}
        onReconnectEnd={onReconnectEnd}
        onPaneClick={onPaneClick}
        onNodeDragStop={() => pushUndoState()}
        updateNodeText={updateNodeText}
        resizingRef={resizingRef}
        selectNode={selectNode}
        onAddNode={addNode}
        onAutoLayout={handleAutoLayout}
        onAddSection={addSection}
        onAddIdea={addIdea}
      />
    </div>
    <div
      className="split-divider"
      onMouseDown={() => {
        const onMove = (e) => {
          const root = document.querySelector('.workspace')
          if (!root) return
          const rect = root.getBoundingClientRect()
          const r = (e.clientX - rect.left) / rect.width
          setRatio(Math.max(0.2, Math.min(0.8, r)))
        }
        const onUp = () => {
          window.removeEventListener('mousemove', onMove)
          window.removeEventListener('mouseup', onUp)
        }
        window.addEventListener('mousemove', onMove)
        window.addEventListener('mouseup', onUp)
      }}
    />
    <div style={{ flex: 1 - ratio, minWidth: 0, display: 'flex' }}>
      <LinearView
        text={linearText}
        setText={setLinearText}
        setNodes={setNodes}
        nextId={nextId}
        expanded={false}
        onToggleExpand={() => {}}
        activeNodeId={activeNodeId}
        onSelectNode={handleLinearSelect}
      />
    </div>
  </div>
)}
```

The `<Controls />` import becomes unused — remove `Controls` from the `reactflow` import in App.jsx (still used by `GraphPane`? No, `GraphPane` doesn't render `<Controls>` either, the spec replaces them with `ZoomControls`).

- [ ] **Step 5: Make active-node highlight follow `activeNodeId` in NodeCard**

Currently NodeCard uses `selected` (ReactFlow's selection state) for the active style. The spec wants the **active node** (`activeNodeId`) to be the visually-highlighted one even when not selected. Pass `activeNodeId` through context.

Open `src/NodeEditorContext.ts` and add `activeNodeId?: string | null` to the context shape:

```ts
import { createContext } from 'react'

const NodeEditorContext = createContext({
  updateNodeText: (_id: string, _value: string) => {},
  resizingRef: { current: false } as React.MutableRefObject<boolean>,
  selectNode: (_id: string, _data: any) => {},
  activeNodeId: null as string | null,
})

export default NodeEditorContext
```

In `GraphPane.jsx`, pass `activeNodeId` into the provider:

```jsx
<NodeEditorContext.Provider value={{ updateNodeText, resizingRef, selectNode, activeNodeId }}>
```

And accept the new prop in `GraphPane`'s function signature.

In `App.jsx`, pass `activeNodeId={activeNodeId}` into both `<GraphPane />` calls.

In `NodeCard.jsx`, read it from context and update the active class:

```jsx
const { updateNodeText, resizingRef, selectNode, activeNodeId } = useContext(NodeEditorContext)
const isActive = activeNodeId === id || selected
```

Replace the className builder with:

```jsx
className={[
  'node-card',
  'redesigned',
  selected ? 'selected' : '',
  resizing ? 'resizing' : '',
  data.isIdea ? 'idea-node' : '',
  isActive ? 'is-active' : '',
].filter(Boolean).join(' ')}
```

- [ ] **Step 6: Run tests**

```bash
npx jest 2>&1 | tail -10
```
Expected: green.

- [ ] **Step 7: Manual smoke**

```bash
npm run dev
```
Verify:
- Skiss mode shows the dotted-grid background, floating top-left toolbar with 4 icons, bottom-right zoom controls (`+ / − / ⌖`), bottom-left minimap (180×110).
- Click ➕ creates a new node. Click 🔲 grid auto-layouts. Sektion / Idé buttons work.
- NodeCard cards have the new look: rounded corners, accent-bar on left, hover lift, active glow when `activeNodeId` matches.
- Split mode: graph on left, divider, LinearView on right; drag divider resizes (clamped 0.2–0.8) and persists across reload.

- [ ] **Step 8: Commit**

```bash
git add src/GraphPane.jsx src/NodeCard.jsx src/NodeEditorContext.ts \
        src/App.jsx src/index.css
git commit -m "feat(graph): GraphPane + restyled NodeCard

- New GraphPane wraps ReactFlow with floating toolbar (Ny nod /
  Auto-layout / Sektion / Idé), bottom-right zoom controls, and
  bottom-left minimap.
- Background switches to radial-dot grid on bg-soft.
- NodeCard restyled per spec: card bg, line-strong border, accent
  bar on left coloured by data.color, hover lift, active glow tied
  to activeNodeId (not just ReactFlow selection).
- NodeEditorContext gains activeNodeId; GraphPane provides it,
  NodeCard reads it.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 4: DocPane (replaces LinearView)

**Files:**
- Create: `src/DocPane.jsx`
- Create: `src/__tests__/DocPane.test.jsx`
- Modify: `src/App.jsx` (replace `<LinearView />` in renderText/renderSplit with `<DocPane />`)
- Modify: `src/index.css` (append doc-pane rules from `docs/design-handoff/styles.css` lines 364–566)

DocPane reuses the existing TipTap editor configuration from `LinearView.jsx` (StarterKit, Underline, CustomLink, ArrowLink, ActiveNodeHighlight, etc.). The new chrome is the toolbar, collapsible outline, scroll container, and `.doc-page` styling. The wrapped editor still parses linear text → nodes via `useLinearParser`.

- [ ] **Step 1: Append doc-pane styles to `src/index.css`**

```css
/* ===== DOC PANE ===== */
.doc-pane {
  flex: 1;
  display: flex;
  flex-direction: column;
  background: var(--bg);
  border-left: 1px solid var(--line);
  min-width: 0;
}
.doc-toolbar {
  display: flex;
  align-items: center;
  gap: 4px;
  height: 40px;
  padding: 0 12px;
  border-bottom: 1px solid var(--line);
  background: var(--bg);
  overflow-x: auto;
  flex: 0 0 auto;
}
.doc-toolbar .group {
  display: flex;
  align-items: center;
  gap: 1px;
  padding-right: 8px;
  margin-right: 4px;
  border-right: 1px solid var(--line);
}
.doc-toolbar .group:last-child { border-right: none; }
.doc-toolbar .tb-btn {
  width: 28px; height: 28px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: transparent;
  border: none;
  border-radius: 4px;
  color: var(--ink-soft);
  cursor: pointer;
  font-size: 13px;
  font-weight: 500;
}
.doc-toolbar .tb-btn:hover { background: var(--panel-2); color: var(--ink); }
.doc-toolbar .tb-btn.active { background: var(--accent-soft); color: var(--accent); }
.doc-toolbar .tb-btn svg { width: 15px; height: 15px; }
.doc-toolbar select {
  background: transparent;
  border: 1px solid var(--line);
  color: var(--ink-soft);
  border-radius: 4px;
  padding: 3px 6px;
  font-size: 12px;
  outline: none;
}

.doc-body { flex: 1; display: flex; min-height: 0; overflow: hidden; }

.doc-outline {
  width: 200px;
  flex: 0 0 auto;
  background: var(--bg-soft);
  border-right: 1px solid var(--line);
  overflow-y: auto;
  padding: 12px 8px 12px 12px;
  transition: width 0.25s var(--ease), opacity 0.2s, padding 0.25s var(--ease);
}
.doc-outline.hidden { width: 0; padding-left: 0; padding-right: 0; opacity: 0; pointer-events: none; }
.doc-outline-title {
  font-size: 10.5px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-dim);
  font-weight: 600;
  padding: 4px 8px;
  margin-bottom: 6px;
}
.doc-outline-list { list-style: none; padding: 0; margin: 0; }
.doc-outline-item {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: none;
  padding: 5px 8px;
  border-radius: 4px;
  color: var(--ink-soft);
  cursor: pointer;
  font-size: 12.5px;
  line-height: 1.4;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  border-left: 2px solid transparent;
}
.doc-outline-item:hover { background: var(--panel); color: var(--ink); }
.doc-outline-item.active {
  background: var(--panel-2);
  color: var(--ink);
  border-left-color: var(--accent);
}
.doc-outline-item .id-tag {
  font-family: var(--font-mono);
  font-size: 10px;
  color: var(--ink-dim);
  margin-right: 6px;
}
.doc-outline-item.active .id-tag { color: var(--accent); }

.doc-scroll {
  flex: 1;
  overflow-y: auto;
  padding: 48px 0 200px;
  scroll-behavior: smooth;
}

/* The page itself — Google-Docs / manuscript feel */
.doc-page {
  max-width: min(720px, 92%);
  margin: 0 auto;
  padding: 56px clamp(28px, 6%, 80px);
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 4px;
  font-family: var(--font-doc);
  font-size: 16.5px;
  line-height: 1.7;
  color: var(--ink);
  box-shadow: 0 6px 30px rgba(0,0,0,.3);
  min-height: 1100px;
}
.doc-page h1 {
  font-size: 30px;
  font-weight: 600;
  letter-spacing: -0.01em;
  margin: 0 0 4px;
  line-height: 1.2;
}
.doc-page h2 {
  font-size: 21px;
  font-weight: 600;
  margin: 38px 0 12px;
  letter-spacing: -0.005em;
  scroll-margin-top: 24px;
  display: flex;
  align-items: baseline;
  gap: 12px;
}
.doc-page h2 .node-id {
  font-family: var(--font-mono);
  font-size: 12px;
  color: var(--ink-dim);
  font-weight: 500;
  background: var(--bg-soft);
  padding: 2px 7px;
  border-radius: 4px;
  border: 1px solid var(--line);
}
.doc-page h2.is-active .node-id { color: var(--accent); border-color: var(--accent-soft); background: var(--accent-soft); }
.doc-page p { margin: 0 0 1em; text-wrap: pretty; }
.doc-page p:last-child { margin-bottom: 0; }
.doc-page .ref-link {
  display: inline-flex;
  align-items: center;
  gap: 3px;
  font-family: var(--font-mono);
  font-size: 13px;
  color: var(--accent);
  background: var(--accent-soft);
  padding: 1px 7px;
  border-radius: 3px;
  text-decoration: none;
  margin: 0 2px;
  cursor: pointer;
  border: 1px solid transparent;
  transition: border-color 0.15s var(--ease);
}
.doc-page .ref-link:hover { border-color: var(--accent); }

/* Status bar */
.doc-status {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 28px;
  padding: 0 14px;
  border-top: 1px solid var(--line);
  background: var(--bg);
  color: var(--ink-dim);
  font-size: 11.5px;
  font-family: var(--font-mono);
  flex: 0 0 auto;
}
.doc-status .sep { color: var(--line-strong); }
.doc-status .saved { color: var(--good); }

/* Focus mode */
.app-shell.focus-mode .topbar,
.app-shell.focus-mode .doc-toolbar,
.app-shell.focus-mode .doc-status,
.app-shell.focus-mode .sidebar-nav,
.app-shell.focus-mode .doc-outline { display: none; }
.app-shell.focus-mode .doc-pane { border-left: none; }
.app-shell.focus-mode .doc-page {
  box-shadow: none;
  border: none;
  background: transparent;
}
```

- [ ] **Step 2: Create `src/DocPane.jsx` (the heart of this task)**

This component is large. It encapsulates: TipTap editor reuse, doc-toolbar, collapsible outline, status bar, scroll-sync (Doc → Graph), reactive scroll-target (Graph → Doc), and ref-link click handling.

```jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
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
import ArrowLink from './ArrowLink.ts'
import ActiveNodeHighlight from './ActiveNodeHighlight.ts'
import EditorBubbleMenu from './EditorBubbleMenu.jsx'
import useLinearParser, { parseLinearText } from './useLinearParser.ts'
import 'tippy.js/dist/tippy.css'

export default function DocPane({
  text, setText, setNodes, nextId, nodes,
  activeNodeId, onSelectNode,
  full = false,
  focusMode = false,
  setFocusMode,
}) {
  const [outlineHidden, setOutlineHidden] = useState(false)
  const scrollRef = useRef(null)
  const initialTextRef = useRef(text)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: { levels: [1, 2, 3] } }),
      Underline,
      CustomLink.configure({ openOnClick: false }),
      ArrowLink,
      TextAlign.configure({ types: ['heading', 'paragraph'] }),
      Placeholder.configure({ placeholder: 'Börja skriva din berättelse...' }),
      CharacterCount,
      Typography,
      Highlight,
      Markdown.configure({ html: false }),
      BubbleMenuExtension,
      ActiveNodeHighlight,
    ],
    content: initialTextRef.current || '',
    onUpdate({ editor }) {
      setText(editor.storage.markdown.getMarkdown())
    },
    editorProps: {
      attributes: { class: 'doc-page' },
    },
  })

  // Initial content load
  const hasLoaded = useRef(false)
  useEffect(() => {
    if (!editor || !text || hasLoaded.current) return
    hasLoaded.current = true
    editor.commands.setContent(text, false)
  }, [text, editor])

  // Sync parser: text -> nodes
  useLinearParser(text, setNodes)

  // Outline: parsed from current text
  const outlineEntries = useMemo(() => parseLinearText(text || ''), [text])

  // Graph -> Doc: when activeNodeId changes from outside, scroll to that h2
  useEffect(() => {
    if (!activeNodeId) return
    const container = scrollRef.current
    if (!container) return
    const h2 = container.querySelector(`h2[data-node-id="${activeNodeId}"]`)
    if (!h2) return
    requestAnimationFrame(() => {
      const cRect = container.getBoundingClientRect()
      const hRect = h2.getBoundingClientRect()
      container.scrollTop += hRect.top - cRect.top - 16
      container.querySelectorAll('h2.is-active').forEach(el => el.classList.remove('is-active'))
      h2.classList.add('is-active')
    })
  }, [activeNodeId])

  // Doc -> Graph: IntersectionObserver detects which heading is at the top
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const headings = Array.from(container.querySelectorAll('h2[data-node-id]'))
    if (headings.length === 0) return
    const obs = new IntersectionObserver(
      (entries) => {
        const visible = entries
          .filter(e => e.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible.length === 0) return
        const id = visible[0].target.getAttribute('data-node-id')
        if (id && id !== activeNodeId) onSelectNode?.(id)
      },
      { root: container, rootMargin: '-60px 0px -60% 0px', threshold: 0 }
    )
    headings.forEach(h => obs.observe(h))
    return () => obs.disconnect()
  }, [outlineEntries, onSelectNode, activeNodeId])

  // Ref-link click handler (delegated on the scroll container)
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const onClick = (e) => {
      const a = e.target.closest('a.ref-link')
      if (!a) return
      const target = a.getAttribute('data-target')
      if (target) {
        e.preventDefault()
        onSelectNode?.(target)
      }
    }
    container.addEventListener('click', onClick)
    return () => container.removeEventListener('click', onClick)
  }, [onSelectNode])

  // Status: word count
  const wordCount = useMemo(
    () => (text || '').split(/\s+/).filter(Boolean).length,
    [text]
  )
  const sectionCount = outlineEntries.length

  return (
    <div className="doc-pane">
      <DocToolbar
        editor={editor}
        outlineHidden={outlineHidden}
        setOutlineHidden={setOutlineHidden}
        full={full}
        focusMode={focusMode}
        setFocusMode={setFocusMode}
        nextId={nextId}
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
          <span>{sectionCount} sektioner</span>
          <span className="sep">·</span>
          <span>{wordCount} ord</span>
          <span className="sep">·</span>
          <span className="saved">● Sparad</span>
          <span style={{ flex: 1 }} />
          <span>v{__APP_VERSION__} · skiss</span>
        </div>
      )}

      {editor && <EditorBubbleMenu editor={editor} />}
    </div>
  )
}

function DocToolbar({ editor, outlineHidden, setOutlineHidden, full, focusMode, setFocusMode, nextId }) {
  if (!editor) return <div className="doc-toolbar" />

  const headingLevel = editor.isActive('heading', { level: 1 })
    ? '1'
    : editor.isActive('heading', { level: 2 })
    ? '2'
    : editor.isActive('heading', { level: 3 })
    ? '3'
    : 'p'

  const onHeadingChange = (e) => {
    const v = e.target.value
    if (v === 'p') editor.chain().focus().setParagraph().run()
    else editor.chain().focus().toggleHeading({ level: Number(v) }).run()
  }

  const insertNewSection = () => {
    const id = String(nextId).padStart(3, '0')
    editor.chain().focus().insertContent(`\n\n## #${id} \n\n`).run()
  }

  return (
    <div className="doc-toolbar">
      <div className="group">
        <button
          className={`tb-btn ${outlineHidden ? '' : 'active'}`}
          onClick={() => setOutlineHidden(h => !h)}
          title="Visa/dölj outline"
          aria-label="Visa/dölj outline"
        >
          {outlineHidden ? <PanelLeftOpen /> : <PanelLeftClose />}
        </button>
      </div>
      <div className="group">
        <select value={headingLevel} onChange={onHeadingChange} aria-label="Stil">
          <option value="p">Normal text</option>
          <option value="1">Rubrik 1</option>
          <option value="2">Rubrik 2</option>
          <option value="3">Rubrik 3</option>
        </select>
      </div>
      <div className="group">
        <button
          className={`tb-btn ${editor.isActive('bold') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Fet"
          aria-label="Fet"
        ><Bold /></button>
        <button
          className={`tb-btn ${editor.isActive('italic') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Kursiv"
          aria-label="Kursiv"
        ><Italic /></button>
        <button
          className={`tb-btn ${editor.isActive('underline') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Understruken"
          aria-label="Understruken"
        ><UnderlineIcon /></button>
      </div>
      <div className="group">
        <button
          className={`tb-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista"
          aria-label="Lista"
        ><List /></button>
        <button
          className="tb-btn"
          onClick={() => {
            const url = window.prompt('Länk URL:')
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }}
          title="Länk"
          aria-label="Länk"
        ><LinkIcon /></button>
      </div>
      <div className="group">
        <button className="tb-btn" onClick={insertNewSection} title="Ny nod" aria-label="Ny nod">
          <Plus />
        </button>
      </div>
      <span style={{ flex: 1 }} />
      {full && (
        <button
          className={`tb-btn ${focusMode ? 'active' : ''}`}
          onClick={() => setFocusMode(f => !f)}
          title="Fokusläge"
          aria-label="Fokusläge"
        ><Maximize2 /></button>
      )}
    </div>
  )
}

function Outline({ entries, activeId, hidden, onPick }) {
  return (
    <aside className={`doc-outline${hidden ? ' hidden' : ''}`} aria-label="Outline">
      <div className="doc-outline-title">Outline</div>
      <ul className="doc-outline-list">
        {entries.map(e => (
          <li key={e.id}>
            <button
              className={`doc-outline-item${activeId === e.id ? ' active' : ''}`}
              onClick={() => onPick?.(e.id)}
              title={e.title || `#${e.id}`}
            >
              <span className="id-tag">#{e.id}</span>
              {e.title || '(utan titel)'}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
```

**Important:** `parseLinearText` (in `useLinearParser.ts`) currently returns entries with `{ id, title, ... }`. Confirm by reading that file:

```bash
grep -n "parseLinearText\|export" src/useLinearParser.ts | head -20
```
If the shape differs, adjust the `Outline` component to use whatever fields it returns. (Likely `entries.map(e => ({ id: e.id, title: e.title }))` already.)

- [ ] **Step 3: Update `ActiveNodeHighlight.ts` (or rendering) to emit `data-node-id` on h2**

The DocPane scroll-sync queries `h2[data-node-id="..."]`. The current TipTap pipeline parses `## #001 Title` into `<h2>#001 Title</h2>` — without the `data-node-id` attribute.

Open `src/ActiveNodeHighlight.ts`. Look for the heading-rendering or decoration logic. If it doesn't already add the attribute, add a ProseMirror plugin that decorates each `<h2>` whose first text matches `#NNN` with `data-node-id="NNN"` and `class="..."`.

If `ActiveNodeHighlight.ts` is short and you can extend it, do so. Otherwise, add a small pure-DOM mutation effect in `DocPane`:

```jsx
// After every editor update, walk the rendered h2 elements and tag them
useEffect(() => {
  const container = scrollRef.current
  if (!container) return
  const apply = () => {
    const h2s = container.querySelectorAll('h2')
    h2s.forEach(h => {
      const m = (h.textContent || '').match(/^#(\d{3})/)
      if (m) {
        h.setAttribute('data-node-id', m[1])
        // Wrap the matched id token in <span class="node-id">
        const idText = `#${m[1]}`
        if (!h.querySelector('.node-id')) {
          const html = h.innerHTML.replace(idText, `<span class="node-id">${idText}</span>`)
          h.innerHTML = html
        }
      }
    })
  }
  apply()
  // Re-apply after editor updates
  const ed = editor
  if (!ed) return
  ed.on('update', apply)
  return () => ed.off('update', apply)
}, [editor])
```

This is the pragmatic path: skip ProseMirror plugin complexity, mutate DOM directly. If it conflicts with TipTap's reconciliation, replace with a proper Decoration plugin in a follow-up.

Add this `useEffect` inside `DocPane`, just after the editor declaration.

- [ ] **Step 4: Update App.jsx to use DocPane in renderText/renderSplit**

Open `src/App.jsx`. Add import:

```jsx
import DocPane from './DocPane.jsx'
```

Replace `renderText` body:

```jsx
renderText={({ focusMode, setFocusMode }) => (
  <DocPane
    text={linearText}
    setText={setLinearText}
    setNodes={setNodes}
    nextId={nextId}
    nodes={nodes}
    activeNodeId={activeNodeId}
    onSelectNode={handleLinearSelect}
    full={true}
    focusMode={focusMode}
    setFocusMode={setFocusMode}
  />
)}
```

In `renderSplit`, replace the `<LinearView>` on the right with `<DocPane full={false} />`:

```jsx
<div style={{ flex: 1 - ratio, minWidth: 0, display: 'flex' }}>
  <DocPane
    text={linearText}
    setText={setLinearText}
    setNodes={setNodes}
    nextId={nextId}
    nodes={nodes}
    activeNodeId={activeNodeId}
    onSelectNode={handleLinearSelect}
    full={false}
  />
</div>
```

- [ ] **Step 5: Remove the now-unused `LinearView` import from App.jsx**

```jsx
// Remove: import LinearView from './LinearView.jsx'
```

`LinearView.jsx` itself stays on disk for now — it's deleted in Task 7. (We could delete it now, but Task 7 bundles deletions; either order works. To minimise interim broken states, keep it on disk.)

- [ ] **Step 6: Test DocPane outline rendering**

Create `src/__tests__/DocPane.test.jsx`:

```jsx
import { render, screen } from '@testing-library/react'
import DocPane from '../DocPane.jsx'

// jsdom does not implement IntersectionObserver — stub it
beforeAll(() => {
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('DocPane', () => {
  it('renders outline entries from parsed text', () => {
    const text = '## #001 Första\n\nLorem ipsum.\n\n## #002 Andra\n\nDolor sit.'
    render(
      <DocPane
        text={text}
        setText={() => {}}
        setNodes={() => {}}
        nextId={3}
        nodes={[]}
        activeNodeId={null}
        onSelectNode={() => {}}
        full={true}
        focusMode={false}
        setFocusMode={() => {}}
      />
    )
    expect(screen.getByText('Första')).toBeInTheDocument()
    expect(screen.getByText('Andra')).toBeInTheDocument()
    expect(screen.getByText('#001')).toBeInTheDocument()
    expect(screen.getByText('#002')).toBeInTheDocument()
  })

  it('renders status bar in full mode', () => {
    render(
      <DocPane
        text="## #001 Hej\n\nNågot text."
        setText={() => {}}
        setNodes={() => {}}
        nextId={2}
        nodes={[]}
        activeNodeId={null}
        onSelectNode={() => {}}
        full={true}
        focusMode={false}
        setFocusMode={() => {}}
      />
    )
    expect(screen.getByText(/sektioner/)).toBeInTheDocument()
    expect(screen.getByText(/Sparad/)).toBeInTheDocument()
  })

  it('does NOT render status bar when full=false', () => {
    render(
      <DocPane
        text="## #001 Hej\n\nNågot text."
        setText={() => {}}
        setNodes={() => {}}
        nextId={2}
        nodes={[]}
        activeNodeId={null}
        onSelectNode={() => {}}
        full={false}
      />
    )
    expect(screen.queryByText(/Sparad/)).not.toBeInTheDocument()
  })
})
```

- [ ] **Step 7: Run tests**

```bash
npx jest 2>&1 | tail -20
```
Expected: green (all DocPane tests pass).

If `parseLinearText` requires nodes to be present in some shape, adjust the test fixture text accordingly. If outline entries don't render (e.g., the parser shape is `{ nodeId, title }` instead of `{ id, title }`), update `Outline` accordingly.

- [ ] **Step 8: Manual smoke**

```bash
npm run dev
```
Verify in `text` mode and `split` mode:
- DocPane renders with toolbar, outline, page.
- Outline shows entries; click jumps the editor to that section.
- `[#NNN]`-style refs in body render with the accent-soft pill styling.
- Click a node in graph (split mode) → text scrolls to that section, h2's `#NNN` chip turns accent-coloured.
- Scroll the doc → graph's active node updates.
- Focus mode (button in doc-toolbar) hides chrome; Esc exits.
- Status bar in full mode shows `{N} sektioner · {ord} ord · ● Sparad`.

- [ ] **Step 9: Commit**

```bash
git add src/DocPane.jsx src/__tests__/DocPane.test.jsx \
        src/App.jsx src/index.css src/ActiveNodeHighlight.ts
git commit -m "feat(doc): DocPane replaces LinearView

- New DocPane wraps the existing TipTap editor with the redesigned
  Google-Docs-style chrome: collapsible 200px outline, doc-toolbar
  (outline-toggle, heading select, B/I/U, list, link, new-section,
  focus toggle when full), centered .doc-page (max 720px), status
  bar in full mode.
- Graph <-> Doc sync: clicking a node scrolls the matching <h2 data-
  node-id> into view; scrolling the doc updates activeNodeId via
  IntersectionObserver. Ref-link clicks set activeNodeId.
- App.jsx routes split/text modes to DocPane (LinearView no longer
  imported; file deleted in Task 7).
- ActiveNodeHighlight no longer load-bearing for data-node-id (DOM
  mutation in DocPane handles it pragmatically).

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 5: ReadPane (replaces Playthrough)

**Files:**
- Create: `src/ReadPane.jsx`
- Create: `src/__tests__/ReadPane.test.jsx`
- Modify: `src/App.jsx` (`renderRead` returns `<ReadPane />`; `showPlay`/`startPlaythrough` removed)
- Modify: `src/index.css` (append read-pane rules from `docs/design-handoff/styles.css` lines 582–748)

ReadPane subsumes Playthrough's logic (history stack, choice rendering, restart, back) and adds the redesigned chrome (paper/dark, läsare/redaktör, drop-cap, breadcrumb).

- [ ] **Step 1: Append read-pane styles to `src/index.css`**

```css
/* ===== READ PANE (Läsa) ===== */
.read-shell {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-height: 0;
}
.read-bar {
  display: flex;
  align-items: center;
  gap: 12px;
  height: 44px;
  padding: 0 16px;
  border-bottom: 1px solid var(--line);
  background: var(--bg);
  flex: 0 0 auto;
}
.read-bar .toggle {
  display: inline-flex;
  background: var(--panel);
  border: 1px solid var(--line);
  border-radius: 6px;
  padding: 2px;
}
.read-bar .toggle button {
  background: transparent;
  border: none;
  color: var(--ink-dim);
  font-size: 11.5px;
  padding: 4px 10px;
  border-radius: 4px;
  cursor: pointer;
  font-weight: 500;
}
.read-bar .toggle button.active {
  background: var(--panel-2);
  color: var(--ink);
}

.read-stage {
  flex: 1;
  overflow-y: auto;
  background: var(--paper-bg);
  color: var(--paper-ink);
  padding: 60px 24px 120px;
  scroll-behavior: smooth;
}
.read-page {
  max-width: 620px;
  margin: 0 auto;
  font-family: var(--font-doc);
}
.read-page .chapter-num {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--paper-ink-dim);
  letter-spacing: 0.16em;
  text-transform: uppercase;
  margin-bottom: 6px;
  display: block;
}
.read-page h1 {
  font-size: 34px;
  margin: 0 0 32px;
  font-weight: 600;
  letter-spacing: -0.01em;
  line-height: 1.15;
  border-bottom: 1px solid var(--paper-rule);
  padding-bottom: 18px;
}
.read-page p {
  font-size: 19px;
  line-height: 1.75;
  margin: 0 0 1.1em;
  text-wrap: pretty;
  hyphens: auto;
}
.read-page .first-letter::first-letter {
  font-size: 3.4em;
  float: left;
  line-height: 0.85;
  padding: 6px 8px 0 0;
  font-weight: 600;
}
.read-choices {
  margin-top: 44px;
  padding-top: 24px;
  border-top: 1px solid var(--paper-rule);
}
.read-choices .label {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--paper-ink-dim);
  text-transform: uppercase;
  letter-spacing: 0.14em;
  margin-bottom: 14px;
  display: block;
}
.read-choice {
  display: block;
  width: 100%;
  text-align: left;
  background: transparent;
  border: 1px solid var(--paper-rule);
  border-radius: 4px;
  padding: 14px 18px;
  margin-bottom: 10px;
  font-family: var(--font-doc);
  font-size: 17px;
  color: var(--paper-ink);
  cursor: pointer;
  transition: all 0.18s var(--ease);
  position: relative;
}
.read-choice:hover {
  background: rgba(0,0,0,.04);
  border-color: var(--paper-ink);
  transform: translateX(2px);
}
[data-reading="dark"] .read-choice:hover { background: rgba(255,255,255,.04); }
.read-choice .num {
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--paper-ink-dim);
  margin-right: 12px;
}
.read-stage.editor-mode .read-choice::after {
  content: attr(data-target);
  position: absolute;
  right: 16px; top: 50%;
  transform: translateY(-50%);
  font-family: var(--font-mono);
  font-size: 10.5px;
  color: var(--paper-ink-dim);
  background: rgba(0,0,0,.05);
  padding: 1px 6px;
  border-radius: 3px;
}
[data-reading="dark"] .read-stage.editor-mode .read-choice::after {
  background: rgba(255,255,255,.05);
}

.read-breadcrumb {
  position: sticky; bottom: 0;
  display: flex; align-items: center; gap: 6px;
  font-family: var(--font-mono);
  font-size: 11px;
  color: var(--paper-ink-dim);
  background: linear-gradient(to top, var(--paper-bg) 70%, transparent);
  padding: 16px 24px 14px;
  flex-wrap: wrap;
  max-width: 620px;
  margin: 32px auto 0;
}
.read-breadcrumb .crumb { padding: 2px 6px; border-radius: 3px; cursor: pointer; }
.read-breadcrumb .crumb:hover { background: rgba(0,0,0,.06); }
[data-reading="dark"] .read-breadcrumb .crumb:hover { background: rgba(255,255,255,.06); }
.read-breadcrumb .crumb.current { color: var(--paper-ink); font-weight: 600; }
.read-breadcrumb .sep { opacity: 0.5; }
```

- [ ] **Step 2: Create `src/ReadPane.jsx`**

```jsx
import { useEffect, useMemo, useState } from 'react'
import { ArrowLeft, RotateCcw, Share2 } from 'lucide-react'
import { loadLS, saveLS } from './utils/persistence.js'

const CHOICE_RE = /\[#(\d{3})]|#(\d{3})/g

function splitChoices(text, nodeMap) {
  // Returns { body, choices } — strips ref tokens from body, lists them as choices.
  const choices = []
  const seen = new Set()
  for (const m of (text || '').matchAll(CHOICE_RE)) {
    const id = m[1] || m[2]
    if (seen.has(id)) continue
    seen.add(id)
    const target = nodeMap.get(id)
    choices.push({ id, label: target?.data?.title || `Gå till #${id}` })
  }
  const body = (text || '').replace(CHOICE_RE, '').replace(/[ \t]+\n/g, '\n').trim()
  return { body, choices }
}

export default function ReadPane({ nodes, startId, activeNodeId, onSelectNode }) {
  const [theme, setTheme] = useState(() => loadLS('read-theme', 'paper'))
  const [editorMode, setEditorMode] = useState(false)

  const nodeMap = useMemo(() => new Map(nodes.map(n => [n.id, n])), [nodes])
  const firstId = useMemo(() => {
    if (startId && nodeMap.has(startId)) return startId
    if (activeNodeId && nodeMap.has(activeNodeId)) return activeNodeId
    const ids = Array.from(nodeMap.keys()).sort()
    return ids[0] || null
  }, [nodeMap, startId, activeNodeId])

  const [history, setHistory] = useState([])
  const [currentId, setCurrentId] = useState(firstId)

  // If startId / activeNodeId changes mid-session (e.g., palette navigates),
  // re-seed the reader.
  useEffect(() => {
    if (firstId && history.length === 0 && currentId !== firstId) setCurrentId(firstId)
  }, [firstId])

  useEffect(() => { saveLS('read-theme', theme) }, [theme])

  const node = currentId ? nodeMap.get(currentId) : null
  const { body, choices } = useMemo(
    () => splitChoices(node?.data?.text || '', nodeMap),
    [node, nodeMap]
  )

  const goTo = (id) => {
    setHistory(h => [...h, currentId])
    setCurrentId(id)
    onSelectNode?.(id)
  }
  const goBack = () => {
    if (history.length === 0) return
    const prev = history[history.length - 1]
    setHistory(h => h.slice(0, -1))
    setCurrentId(prev)
    onSelectNode?.(prev)
  }
  const restart = () => {
    setHistory([])
    setCurrentId(firstId)
    if (firstId) onSelectNode?.(firstId)
  }

  if (!node || !currentId) {
    return (
      <div className="read-shell" data-reading={theme}>
        <div className="read-bar">
          <span style={{ flex: 1 }} />
          <span style={{ color: 'var(--ink-dim)', fontSize: 13 }}>Inget att läsa ännu.</span>
        </div>
      </div>
    )
  }

  // Build chapter number from nodes ordering (numeric ids only)
  const orderedIds = Array.from(nodeMap.keys())
    .filter(id => /^\d{3}$/.test(id))
    .sort()
  const chapterIdx = orderedIds.indexOf(currentId)
  const chapterLabel = chapterIdx >= 0
    ? `KAPITEL ${String(chapterIdx + 1).padStart(2, '0')}${editorMode ? ` · #${currentId}` : ''}`
    : (editorMode ? `· #${currentId}` : '')

  // Body paragraphs
  const paragraphs = body.split(/\n{2,}/).filter(Boolean)

  return (
    <div className="read-shell" data-reading={theme}>
      <div className="read-bar">
        <button
          className="btn ghost sm"
          onClick={goBack}
          disabled={history.length === 0}
        >
          <ArrowLeft />
          Tillbaka
        </button>
        <button className="btn ghost sm" onClick={restart}>
          <RotateCcw />
          Börja om
        </button>
        <span style={{ flex: 1 }} />
        <span className="toggle" role="group" aria-label="Visningsläge">
          <button
            className={!editorMode ? 'active' : ''}
            onClick={() => setEditorMode(false)}
            aria-pressed={!editorMode}
          >Läsare</button>
          <button
            className={editorMode ? 'active' : ''}
            onClick={() => setEditorMode(true)}
            aria-pressed={editorMode}
          >Redaktör</button>
        </span>
        <span className="toggle" role="group" aria-label="Tema">
          <button
            className={theme === 'paper' ? 'active' : ''}
            onClick={() => setTheme('paper')}
            aria-pressed={theme === 'paper'}
          >Papper</button>
          <button
            className={theme === 'dark' ? 'active' : ''}
            onClick={() => setTheme('dark')}
            aria-pressed={theme === 'dark'}
          >Mörk</button>
        </span>
        <button className="btn ghost sm" title="Dela">
          <Share2 />
          Dela
        </button>
      </div>

      <div className={`read-stage${editorMode ? ' editor-mode' : ''}`}>
        <article className="read-page">
          {chapterLabel && <span className="chapter-num">{chapterLabel}</span>}
          {node.data.title && <h1>{node.data.title}</h1>}
          {paragraphs.map((p, i) => (
            <p key={i} className={i === 0 ? 'first-letter' : undefined}>{p}</p>
          ))}

          {choices.length > 0 && (
            <div className="read-choices">
              <span className="label">Vad gör du?</span>
              {choices.map((c, i) => (
                <button
                  key={c.id}
                  className="read-choice"
                  data-target={`#${c.id}`}
                  onClick={() => goTo(c.id)}
                >
                  <span className="num">{String.fromCharCode(65 + i)}.</span>
                  {c.label}
                </button>
              ))}
            </div>
          )}

          <nav className="read-breadcrumb" aria-label="Brödsmulor">
            {history.map((hId, i) => {
              const hNode = nodeMap.get(hId)
              return (
                <span key={`${hId}-${i}`} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                  <button
                    className="crumb"
                    onClick={() => {
                      setHistory(h => h.slice(0, i))
                      setCurrentId(hId)
                      onSelectNode?.(hId)
                    }}
                  >
                    {hNode?.data?.title || `#${hId}`}
                  </button>
                  <span className="sep">›</span>
                </span>
              )
            })}
            <span className="crumb current">{node.data.title || `#${currentId}`}</span>
          </nav>
        </article>
      </div>
    </div>
  )
}
```

- [ ] **Step 3: Wire ReadPane into App.jsx**

In `src/App.jsx`, add import:
```jsx
import ReadPane from './ReadPane.jsx'
```

Replace `renderRead`:
```jsx
renderRead={() => (
  <ReadPane
    nodes={nodes}
    startId={currentId || undefined}
    activeNodeId={activeNodeId}
    onSelectNode={(id) => {
      const node = nodes.find(n => n.id === id)
      if (node) selectNode(id, node.data)
    }}
  />
)}
```

Remove the `showPlay` modal at the root (the entire `{showPlay && <Playthrough ... />}` block), the `showPlay` state, and the `startPlaythrough` handler. Update the `<FloatingMenu>` usage to remove `onPlaythrough` entirely (`FloatingMenu` filters out sections with no items, so dropping the prop just removes the "Spela igenom" entry — there's no error).

Verify by grepping:

```bash
grep -n "showPlay\|startPlaythrough\|onPlaythrough" src/
```
Only the `FloatingMenu.jsx` definition site (which itself is deleted in Task 7) and possibly comments should remain.

The `Playthrough.jsx` file stays on disk; it's deleted in Task 7.

- [ ] **Step 4: Test ReadPane core flow**

Create `src/__tests__/ReadPane.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import ReadPane from '../ReadPane.jsx'

const NODES = [
  { id: '001', data: { title: 'Start', text: 'Du står vid en korsning. [#002] eller [#003]?' } },
  { id: '002', data: { title: 'Vänster', text: 'Det är blött här. [#001]' } },
  { id: '003', data: { title: 'Höger', text: 'En orm.' } },
]

function renderPane(extra = {}) {
  return render(
    <ReadPane
      nodes={NODES}
      startId="001"
      activeNodeId={null}
      onSelectNode={() => {}}
      {...extra}
    />
  )
}

describe('ReadPane', () => {
  beforeEach(() => localStorage.clear())

  it('renders the start node with title, body and choices', () => {
    renderPane()
    expect(screen.getByText('Start')).toBeInTheDocument()
    expect(screen.getByText(/Du står vid en korsning/)).toBeInTheDocument()
    expect(screen.getByText('Vänster')).toBeInTheDocument()
    expect(screen.getByText('Höger')).toBeInTheDocument()
  })

  it('strips ref tokens from body text', () => {
    renderPane()
    expect(screen.queryByText(/\[#002\]/)).not.toBeInTheDocument()
  })

  it('navigates on choice click and shows breadcrumb', () => {
    renderPane()
    fireEvent.click(screen.getByText('Vänster'))
    expect(screen.getByText('Vänster', { selector: '.crumb.current' })).toBeInTheDocument()
    expect(screen.getByText('Start', { selector: 'button.crumb' })).toBeInTheDocument()
  })

  it('back returns to previous node', () => {
    renderPane()
    fireEvent.click(screen.getByText('Vänster'))
    fireEvent.click(screen.getByText('Tillbaka'))
    expect(screen.getByText('Start', { selector: '.crumb.current' })).toBeInTheDocument()
  })

  it('restart returns to first node and clears history', () => {
    renderPane()
    fireEvent.click(screen.getByText('Vänster'))
    fireEvent.click(screen.getByText('Börja om'))
    expect(screen.queryByText('Start', { selector: 'button.crumb' })).not.toBeInTheDocument()
    expect(screen.getByText('Start', { selector: '.crumb.current' })).toBeInTheDocument()
  })

  it('persists theme to localStorage', () => {
    renderPane()
    fireEvent.click(screen.getByText('Mörk'))
    expect(localStorage.getItem('vv-read-theme')).toBe('"dark"')
  })

  it('editor mode adds chapter id to chapter-num', () => {
    renderPane()
    fireEvent.click(screen.getByText('Redaktör'))
    expect(screen.getByText(/#001/)).toBeInTheDocument()
  })
})
```

- [ ] **Step 5: Run tests**

```bash
npx jest 2>&1 | tail -10
```
Expected: green.

- [ ] **Step 6: Manual smoke**

```bash
npm run dev
```
- Switch to Läsa (mode 4). Reader appears with paper background, italic-serif body text, drop-cap on first paragraph, choice buttons at bottom.
- Click a choice → navigates; breadcrumb grows.
- "Tillbaka" disabled when history empty.
- "Börja om" clears history, returns to start.
- "Mörk" toggles theme to dark; "Papper" returns to sepia.
- "Redaktör" reveals `#NNN` chips on choices and chapter heading.

- [ ] **Step 7: Commit**

```bash
git add src/ReadPane.jsx src/__tests__/ReadPane.test.jsx \
        src/App.jsx src/index.css
git commit -m "feat(read): ReadPane replaces Playthrough

- Full-mode reader with paper/dark theme (persisted), läsare/
  redaktör toggle, drop-cap on first paragraph, redesigned
  choice buttons, sticky breadcrumb.
- History/back/restart preserved from Playthrough; clicking a
  breadcrumb crumb returns to that point.
- App.jsx wires ReadPane to renderRead and drops the showPlay
  modal + startPlaythrough handler + Playthrough import.
- Playthrough.jsx stays on disk until Task 7 cleanup.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 6: Command palette + Settings modal + save indicator

**Files:**
- Create: `src/CommandPalette.jsx`
- Create: `src/SettingsModal.jsx`
- Create: `src/__tests__/CommandPalette.test.jsx`
- Modify: `src/App.jsx` (host palette + settings modal state; pass actions; connect avatar to UserMenu)
- Modify: `src/index.css` (append palette + modal rules from `docs/design-handoff/styles.css` lines 750–826 + new modal rules)

This task wires up the chrome that was deleted in Task 2 (project switcher, new project, import/export, debug, font-size, auto-save, AI settings, history) into the palette + settings modal. After this task, `FloatingMenu` is functionally redundant (only kept until Task 7's deletion).

- [ ] **Step 1: Append palette + modal styles to `src/index.css`**

```css
/* ===== Command Palette ===== */
.cmd-bg {
  position: fixed;
  inset: 0;
  background: rgba(13,17,23,.6);
  backdrop-filter: blur(4px);
  z-index: 50;
  display: flex;
  justify-content: center;
  align-items: flex-start;
  padding-top: 12vh;
}
.cmd-palette {
  width: 540px;
  max-width: 90vw;
  background: var(--panel);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-lg);
  overflow: hidden;
  box-shadow: 0 24px 60px rgba(0,0,0,.5);
}
.cmd-input {
  width: 100%;
  padding: 16px 20px;
  background: transparent;
  border: none;
  border-bottom: 1px solid var(--line);
  color: var(--ink);
  font-size: 16px;
  outline: none;
  font-family: var(--font-ui);
}
.cmd-list { max-height: 360px; overflow-y: auto; padding: 6px; }
.cmd-item {
  display: flex; align-items: center; gap: 12px;
  padding: 10px 14px;
  border-radius: 6px;
  font-size: 13px;
  color: var(--ink-soft);
  cursor: pointer;
  border: none;
  background: transparent;
  width: 100%;
  text-align: left;
}
.cmd-item:hover, .cmd-item.active {
  background: var(--panel-2);
  color: var(--ink);
}
.cmd-item .cmd-icon { color: var(--ink-dim); display: inline-flex; }
.cmd-item.active .cmd-icon { color: var(--accent); }
.cmd-item .cmd-shortcut { margin-left: auto; }
.cmd-section {
  font-size: 10px;
  color: var(--ink-dim);
  text-transform: uppercase;
  letter-spacing: 0.1em;
  padding: 8px 14px 4px;
  font-weight: 600;
}

/* ===== Settings modal ===== */
.modal-bg {
  position: fixed;
  inset: 0;
  background: rgba(13,17,23,.6);
  backdrop-filter: blur(4px);
  z-index: 40;
  display: flex;
  justify-content: center;
  align-items: center;
}
.modal-card {
  width: 460px;
  max-width: 90vw;
  background: var(--panel);
  border: 1px solid var(--line-strong);
  border-radius: var(--r-lg);
  box-shadow: 0 24px 60px rgba(0,0,0,.5);
  overflow: hidden;
}
.modal-card header {
  padding: 14px 20px;
  border-bottom: 1px solid var(--line);
  font-weight: 600;
  display: flex;
  align-items: center;
  gap: 8px;
}
.modal-card .body { padding: 16px 20px; display: flex; flex-direction: column; gap: 18px; }
.modal-card .row { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.modal-card .row label { color: var(--ink-soft); }
.modal-card .section-title {
  font-size: 11px;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--ink-dim);
  font-weight: 600;
  margin-bottom: 8px;
}
.modal-card footer {
  padding: 12px 20px;
  border-top: 1px solid var(--line);
  display: flex;
  justify-content: flex-end;
  gap: 8px;
}
```

- [ ] **Step 2: Create `src/CommandPalette.jsx`**

```jsx
import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Network, Columns2, FileText, BookOpen,
  Plus, FilePlus, LayoutGrid,
  RotateCcw, RotateCw, Upload, Download,
  History, Settings, HelpCircle, Layers, Lightbulb,
} from 'lucide-react'

export default function CommandPalette({ open, onClose, actions }) {
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setHi(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const sections = useMemo(() => buildSections(actions), [actions])

  const flat = useMemo(() => {
    const items = []
    for (const s of sections) {
      for (const it of s.items) {
        if (!q || it.label.toLowerCase().includes(q.toLowerCase())) {
          items.push({ ...it, section: s.title })
        }
      }
    }
    return items
  }, [sections, q])

  useEffect(() => { setHi(0) }, [q])

  if (!open) return null

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, flat.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); flat[hi]?.run?.(); onClose?.() }
    else if (e.key === 'Escape') { e.preventDefault(); onClose?.() }
  }

  let lastSection = null
  return (
    <div className="cmd-bg" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="cmd-palette">
        <input
          ref={inputRef}
          className="cmd-input"
          placeholder="Skriv ett kommando..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          aria-label="Sök kommando"
        />
        <div className="cmd-list">
          {flat.length === 0 && (
            <div className="cmd-item" style={{ color: 'var(--ink-dim)' }}>Inga träffar.</div>
          )}
          {flat.map((it, i) => {
            const sectionHeader = it.section !== lastSection ? (lastSection = it.section) : null
            return (
              <div key={`${it.id}-${i}`}>
                {sectionHeader && <div className="cmd-section">{sectionHeader}</div>}
                <button
                  className={`cmd-item${i === hi ? ' active' : ''}`}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => { it.run?.(); onClose?.() }}
                >
                  <span className="cmd-icon">{it.icon}</span>
                  <span>{it.label}</span>
                  {it.shortcut && <span className="kbd cmd-shortcut">{it.shortcut}</span>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function buildSections(a) {
  return [
    {
      title: 'Lägen',
      items: [
        { id: 'mode-skiss', label: 'Skiss',           icon: <Network />,    shortcut: '1', run: () => a.setMode?.('skiss') },
        { id: 'mode-split', label: 'Skiss + Innehåll', icon: <Columns2 />,   shortcut: '2', run: () => a.setMode?.('split') },
        { id: 'mode-text',  label: 'Innehåll',        icon: <FileText />,   shortcut: '3', run: () => a.setMode?.('text') },
        { id: 'mode-read',  label: 'Läsa',            icon: <BookOpen />,   shortcut: '4', run: () => a.setMode?.('read') },
      ],
    },
    {
      title: 'Skapa',
      items: [
        { id: 'new-node',    label: 'Ny nod',         icon: <Plus />,       shortcut: '⌘N', run: a.addNode },
        { id: 'new-project', label: 'Nytt projekt...', icon: <FilePlus />, run: a.newProject },
        { id: 'auto-layout', label: 'Auto-layout',    icon: <LayoutGrid />, run: a.autoLayout },
        { id: 'add-section', label: 'Sektion',        icon: <Layers />,     run: a.addSection },
        { id: 'add-idea',    label: 'Idé',            icon: <Lightbulb />,  run: a.addIdea },
      ],
    },
    {
      title: 'Verktyg',
      items: [
        { id: 'undo',        label: 'Ångra',                icon: <RotateCcw />, shortcut: '⌘Z',   run: a.undo },
        { id: 'redo',        label: 'Gör om',               icon: <RotateCw />,  shortcut: '⌘⇧Z', run: a.redo },
        { id: 'import-md',   label: 'Importera markdown...', icon: <Upload />,   run: a.importProject },
        { id: 'export-json', label: 'Exportera JSON',       icon: <Download />,  run: a.exportProject },
        { id: 'export-md',   label: 'Exportera markdown',   icon: <Download />,  run: a.exportMarkdown },
      ],
    },
    {
      title: 'Visa',
      items: [
        { id: 'history',  label: 'Visa historik...', icon: <History />,    run: a.showHistory },
        { id: 'settings', label: 'Inställningar...',  icon: <Settings />,   run: a.showSettings },
        { id: 'help',     label: 'Hjälp',             icon: <HelpCircle />, run: a.openHelp },
      ],
    },
  ]
}
```

- [ ] **Step 3: Create `src/SettingsModal.jsx`**

```jsx
import { useEffect } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'

export default function SettingsModal({
  open, onClose,
  fontSize, setFontSize,
  autoSave, setAutoSave,
  debugMode, setDebugMode,
  onOpenAiSettings,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-label="Inställningar"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="modal-card">
        <header><SettingsIcon size={16} />Inställningar</header>
        <div className="body">
          <div>
            <div className="section-title">Visning</div>
            <div className="row">
              <label htmlFor="setting-font-size">Textstorlek ({fontSize}px)</label>
              <input
                id="setting-font-size"
                type="range" min="10" max="22" step="1"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
            </div>
            <div className="row">
              <label htmlFor="setting-auto-save">Auto-save</label>
              <input
                id="setting-auto-save"
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
              />
            </div>
          </div>

          <div>
            <div className="section-title">AI</div>
            <div className="row">
              <span style={{ color: 'var(--ink-dim)' }}>AI-modeller och nycklar</span>
              <button className="btn ghost sm" onClick={onOpenAiSettings}>Öppna AI-inställningar...</button>
            </div>
          </div>

          <div>
            <div className="section-title">Avancerat</div>
            <div className="row">
              <label htmlFor="setting-debug">Debug-läge</label>
              <input
                id="setting-debug"
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
              />
            </div>
          </div>
        </div>
        <footer>
          <button className="btn ghost sm" onClick={onClose}>Stäng</button>
        </footer>
      </div>
    </div>
  )
}
```

- [ ] **Step 4: Wire palette + settings into App.jsx**

In `src/App.jsx`:

Add imports:
```jsx
import CommandPalette from './CommandPalette.jsx'
import SettingsModal from './SettingsModal.jsx'
```

Add state hooks (near other useState calls at top of `App()`):
```jsx
const [cmdOpen, setCmdOpen] = useState(false)
const [settingsOpen, setSettingsOpen] = useState(false)
const [isSaving, setIsSaving] = useState(false)
```

Wire `isSaving` to the Firestore-save effect already in App.jsx. Locate the auto-save useEffect:
```js
useEffect(() => {
  if (!user || !projectId || nodes.length === 0) return
  // ...
  const timer = setTimeout(() => saveToFirestore(projectId, data), 2000)
  return () => clearTimeout(timer)
}, [user, nodes, nextId, projectName, projectId, saveToFirestore])
```

Modify it to flip `isSaving` true while a save is in flight:
```js
useEffect(() => {
  if (!user || !projectId || nodes.length === 0) return
  setIsSaving(true)
  const data = {
    projectName,
    nextNodeId: nextId,
    nodes: nodes.map(n => ({
      id: n.id,
      text: n.data.text || '',
      title: n.data.title || '',
      color: n.data.color || '#1f2937',
      position: n.position,
      type: n.type || 'card',
      width: n.width,
      height: n.height,
    })),
  }
  const timer = setTimeout(async () => {
    await saveToFirestore(projectId, data)
    setIsSaving(false)
  }, 2000)
  return () => { clearTimeout(timer); setIsSaving(false) }
}, [user, nodes, nextId, projectName, projectId, saveToFirestore])
```

Update the `<AppShell />` usage:
- Pass `isSaving={isSaving}` (replacing the TODO).
- Pass `onOpenPalette={() => setCmdOpen(true)}`.
- Pass `onShowSettings={() => setSettingsOpen(true)}`.

Add the palette and settings at the same level as other modals:
```jsx
<CommandPalette
  open={cmdOpen}
  onClose={() => setCmdOpen(false)}
  actions={{
    setMode: (m) => {
      // AppShell owns mode; signal via window event
      window.dispatchEvent(new CustomEvent('vv-set-mode', { detail: m }))
    },
    addNode,
    newProject: confirmNewProject,
    autoLayout: handleAutoLayout,
    addSection,
    addIdea,
    undo, redo,
    importProject: () => importRef.current?.click(),
    exportProject,
    exportMarkdown,
    showHistory,
    showSettings: () => setSettingsOpen(true),
    openHelp,
  }}
/>

<SettingsModal
  open={settingsOpen}
  onClose={() => setSettingsOpen(false)}
  fontSize={fontSize}
  setFontSize={setFontSize}
  autoSave={autoSave}
  setAutoSave={setAutoSave}
  debugMode={debugMode}
  setDebugMode={(v) => { setDebugMode(v); setDebugFlag(v) }}
  onOpenAiSettings={() => { setSettingsOpen(false); setShowAiSettings(true) }}
/>
```

The `vv-set-mode` window event needs an AppShell listener. Open `src/AppShell.jsx` and add:

```jsx
useEffect(() => {
  const onSetMode = (e) => setMode(e.detail)
  window.addEventListener('vv-set-mode', onSetMode)
  return () => window.removeEventListener('vv-set-mode', onSetMode)
}, [setMode])
```

- [ ] **Step 5: Wire avatar → UserMenu**

The `Topbar` exposes `onAvatarClick`. The current `UserMenu.jsx` is a Headless UI `<Popover>` that renders its own button. The simplest interim: render `<UserMenu />` next to the avatar in `Topbar`, hidden behind a positioned wrapper, and let the UserMenu drive its own popover.

Update `src/Topbar.jsx` to optionally accept `userMenuSlot` and render it if present:

```jsx
import { Search, Share2 } from 'lucide-react'

export default function Topbar({
  projectName,
  setProjectName,
  isSaving,
  onCmdK,
  onShare,
  userMenuSlot,
}) {
  return (
    <header className="topbar">
      <input
        className="project-name"
        value={projectName}
        onChange={e => setProjectName(e.target.value)}
        placeholder="Projektnamn"
        aria-label="Projektnamn"
      />
      <span className={`pill ${isSaving ? 'saving' : ''}`} aria-live="polite">
        <span className="dot" aria-hidden="true" />
        {isSaving ? 'sparar…' : 'sparad'}
      </span>
      <span style={{ flex: 1 }} />
      <button className="btn ghost sm" onClick={onCmdK} title="Sök / Kommandopalett">
        <Search />
        Sök
        <span className="kbd">⌘K</span>
      </button>
      <button className="btn ghost icon" onClick={onShare} title="Dela" aria-label="Dela">
        <Share2 />
      </button>
      <span className="divider" aria-hidden="true" />
      {userMenuSlot ?? <button className="avatar" title="Konto" aria-label="Konto" />}
    </header>
  )
}
```

Update `src/AppShell.jsx` to accept `userMenuSlot` prop and pass through:

```jsx
export default function AppShell({
  // ... (existing props)
  userMenuSlot,
}) {
  // ...
  <Topbar
    projectName={projectName}
    setProjectName={setProjectName}
    isSaving={isSaving}
    onCmdK={onOpenPalette}
    onShare={onShare}
    userMenuSlot={userMenuSlot}
  />
}
```

Update `src/App.jsx`:
```jsx
<AppShell
  // ... existing props
  userMenuSlot={<UserMenu />}
/>
```

If `UserMenu`'s default styling doesn't match the avatar look, that's acceptable interim — full visual polish for the avatar/usermenu pairing is out of scope (existing UserMenu component).

- [ ] **Step 6: Test palette filtering and keyboard nav**

Create `src/__tests__/CommandPalette.test.jsx`:

```jsx
import { render, screen, fireEvent } from '@testing-library/react'
import CommandPalette from '../CommandPalette.jsx'

function makeActions(extra = {}) {
  return {
    setMode: jest.fn(),
    addNode: jest.fn(),
    newProject: jest.fn(),
    autoLayout: jest.fn(),
    addSection: jest.fn(),
    addIdea: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    importProject: jest.fn(),
    exportProject: jest.fn(),
    exportMarkdown: jest.fn(),
    showHistory: jest.fn(),
    showSettings: jest.fn(),
    openHelp: jest.fn(),
    ...extra,
  }
}

describe('CommandPalette', () => {
  it('returns null when closed', () => {
    const { container } = render(
      <CommandPalette open={false} onClose={() => {}} actions={makeActions()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders all sections when open', () => {
    render(<CommandPalette open onClose={() => {}} actions={makeActions()} />)
    expect(screen.getByText('Lägen')).toBeInTheDocument()
    expect(screen.getByText('Skapa')).toBeInTheDocument()
    expect(screen.getByText('Verktyg')).toBeInTheDocument()
    expect(screen.getByText('Visa')).toBeInTheDocument()
  })

  it('filters by query (substring, case-insensitive)', () => {
    render(<CommandPalette open onClose={() => {}} actions={makeActions()} />)
    fireEvent.change(screen.getByPlaceholderText('Skriv ett kommando...'), {
      target: { value: 'läs' },
    })
    expect(screen.getByText('Läsa')).toBeInTheDocument()
    expect(screen.queryByText('Skiss')).not.toBeInTheDocument()
  })

  it('runs action and closes on Enter', () => {
    const actions = makeActions()
    const onClose = jest.fn()
    render(<CommandPalette open onClose={onClose} actions={actions} />)
    fireEvent.change(screen.getByPlaceholderText('Skriv ett kommando...'), {
      target: { value: 'ny nod' },
    })
    fireEvent.keyDown(screen.getByPlaceholderText('Skriv ett kommando...'), { key: 'Enter' })
    expect(actions.addNode).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('runs action and closes on click', () => {
    const actions = makeActions()
    const onClose = jest.fn()
    render(<CommandPalette open onClose={onClose} actions={actions} />)
    fireEvent.click(screen.getByText('Auto-layout'))
    expect(actions.autoLayout).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Esc closes', () => {
    const onClose = jest.fn()
    render(<CommandPalette open onClose={onClose} actions={makeActions()} />)
    fireEvent.keyDown(screen.getByPlaceholderText('Skriv ett kommando...'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
```

- [ ] **Step 7: Run tests**

```bash
npx jest 2>&1 | tail -10
```
Expected: green.

- [ ] **Step 8: Manual smoke**

```bash
npm run dev
```
- ⌘K opens palette. Type `läs` — only "Läsa" matches. Up/Down navigates; Enter activates; Esc closes.
- "Nytt projekt..." opens the existing modal.
- "Importera markdown..." opens the file picker.
- "Exportera markdown" downloads the .md.
- "Inställningar..." opens the settings modal: font-size slider, auto-save checkbox, debug toggle, AI link.
- Save pill in topbar: shows "sparad" (green dot) when idle; "sparar…" (yellow dot) for ~2s after a node edit.
- Avatar / UserMenu still triggers sign-in/out popover.

- [ ] **Step 9: Commit**

```bash
git add src/CommandPalette.jsx src/SettingsModal.jsx \
        src/__tests__/CommandPalette.test.jsx \
        src/App.jsx src/AppShell.jsx src/Topbar.jsx src/index.css
git commit -m "feat(palette): CommandPalette + SettingsModal + save indicator

- ⌘K command palette with sections (Lägen / Skapa / Verktyg / Visa),
  substring filter, arrow + Enter navigation, Esc close.
- Settings modal aggregates font-size, auto-save, debug, and AI
  settings launcher.
- All header chrome that was deleted in Task 2 is reachable again
  via palette: new project, import, export JSON, export markdown,
  undo/redo, history, help, auto-layout, idea, section. Project
  switcher entries arrive in the next commit (step 12).
- Topbar save pill flips to 'sparar…' while Firestore save is in
  flight and back to 'sparad' on completion.
- Avatar slot now renders existing UserMenu component.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

- [ ] **Step 10: Add project switcher entries to palette (separate commit)**

In `src/CommandPalette.jsx`, replace the `sections` memo with one that accepts an optional `extraSection`:

```jsx
export default function CommandPalette({ open, onClose, actions, extraSection }) {
  // ... existing input/list state ...

  const sections = useMemo(() => {
    const built = buildSections(actions)
    if (extraSection?.items?.length) built.push(extraSection)
    return built
  }, [actions, extraSection])

  // ... rest unchanged ...
}
```

In `src/App.jsx`, build the project-switcher items and pass them in. Add the `FilePlus` import back if it was removed:

```jsx
import { FilePlus } from 'lucide-react'

// ... inside App() ...
const projectSwitchItems = Object.values(projects)
  .sort((a, b) => (b.updated || 0) - (a.updated || 0))
  .map(p => ({
    id: `switch-${p.id}`,
    label: `Byt till: ${p.data?.projectName?.trim() || new Date(p.start).toLocaleString()}`,
    icon: <FilePlus />,
    run: () => handleProjectSwitch(p.id),
  }))

// ... in JSX ...
<CommandPalette
  open={cmdOpen}
  onClose={() => setCmdOpen(false)}
  actions={{ /* ... existing ... */ }}
  extraSection={{ title: 'Projekt', items: projectSwitchItems }}
/>
```

- [ ] **Step 11: Verify project switcher works**

```bash
npm run dev
```
Open ⌘K, type the start of a project name. The matching project appears under "Projekt"; pressing Enter switches to it.

- [ ] **Step 12: Commit project switcher**

```bash
git add src/CommandPalette.jsx src/App.jsx
git commit -m "feat(palette): project switcher entries

- CommandPalette accepts an extraSection prop, so App.jsx can
  inject one entry per known project. Selecting one calls
  handleProjectSwitch(id), preserving the existing project-load
  semantics.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 7: Cleanup — delete superseded files, slim App.jsx, drop legacy aliases

**Files:**
- Delete: `src/FloatingMenu.jsx`
- Delete: `src/LinearView.jsx`
- Delete: `src/Playthrough.jsx`
- Modify: `src/App.jsx` (drop now-unused state, handlers, imports)
- Modify: `src/theme.css` (drop legacy aliases `--text`, `--btn`, etc.)
- Modify: `src/index.css` (remove `.search-input`, `.floating-menu*`, any other dead rules)
- Modify: `facts/REGISTRY.md`

- [ ] **Step 1: Delete the superseded JSX files**

```bash
git rm src/FloatingMenu.jsx src/LinearView.jsx src/Playthrough.jsx
```

- [ ] **Step 2: Update `src/App.jsx`**

Remove now-unused imports:
```jsx
// Drop these lines:
// import LinearView from './LinearView.jsx'
// import FloatingMenu from './FloatingMenu.jsx'
// import Playthrough from './Playthrough.jsx'
// import Button from './Button.jsx'  // only if grep shows no other consumer
```

Confirm `Button` is unused:
```bash
grep -rn "from './Button" src/
```
If only the App.jsx import remains (other files don't use it), remove the import. Otherwise keep it.

Remove the `<FloatingMenu />` JSX block at the root of the return.
Remove `linearText`, `setLinearText`, `linearInitialized`, `convertNodesToLinearText` related state — wait, `linearText` is still needed by `DocPane`. Keep. **Audit:** the only unused-after-cleanup state is `text`/`title` (for the legacy textarea editor and inline edit), and `currentId`-driven flows that DocPane handles internally.

Actually, current `text` and `title` state are still used by `selectNode` / `updateNodeText` for the deleted inline node-editor block. After cleanup, are they still referenced? `selectNode` sets them, `updateNodeText` reads from `currentId === id`. They're still load-bearing for the graph node editing. **Keep them.**

Remove the `showSearch`/`searchQuery` references — they were already removed in Task 2.

- [ ] **Step 3: Drop legacy aliases from `src/theme.css`**

Open `src/theme.css`. Locate the block comment `/* Legacy aliases — kept until Task 7 cleanup */` and delete the entire alias block (`--text`, `--text-dim`, `--btn`, `--btn-hover`, `--modal-bg`, `--radius`, `--gap`, `--font-size`).

Run `grep` for any remaining usages and migrate them:

```bash
grep -rn "var(--text\b\|var(--btn\b\|var(--btn-hover\|var(--modal-bg\|var(--radius\b\|var(--gap\b\|var(--font-size" src/
```

For each match, replace with the new token:
- `var(--text)` → `var(--ink)`
- `var(--text-dim)` → `var(--ink-dim)`
- `var(--btn)` → `var(--panel-2)`
- `var(--btn-hover)` → `var(--line)`
- `var(--modal-bg)` → `var(--panel)`
- `var(--radius)` → `var(--r)`
- `var(--gap)` → `8px`
- `var(--font-size)` → `14px`

The `--font-size` is also driven by App.jsx (sets `document.documentElement.style.--font-size`). Keep that effect; just remove the alias declaration in `:root`. The runtime style override still works.

- [ ] **Step 4: Remove dead rules from `src/index.css`**

Search for and delete:
- `.search-input { ... }` — search input is gone.
- `.floating-menu*` rules from the v0.8.x cleanup — FloatingMenu is deleted.
- Any rules referencing `.popover-menu` or other old chrome (verify with grep before deleting).

```bash
grep -n "search-input\|floating-menu" src/index.css
```

For each match, delete the rule block.

- [ ] **Step 5: Update `facts/REGISTRY.md`**

Open `facts/REGISTRY.md`. Add entries for new files; mark old ones removed:

(Read the file first; follow its existing format.)

```bash
cat facts/REGISTRY.md | head -80
```

Add to the components section:
```markdown
| `src/AppShell.jsx`        | Mode/splitRatio/focusMode state; renders sidebar+topbar+workspace |
| `src/SidebarNav.jsx`      | 56px left rail with mode buttons + history + settings              |
| `src/Topbar.jsx`          | 44px top bar: project name, save pill, search, share, avatar slot  |
| `src/GraphPane.jsx`       | Skiss mode wrapper around ReactFlow + toolbar/zoom/minimap         |
| `src/DocPane.jsx`         | Innehåll mode: TipTap editor + outline + scroll sync               |
| `src/ReadPane.jsx`        | Läsa mode: paper/dark, drop-cap, choices, breadcrumb               |
| `src/CommandPalette.jsx`  | ⌘K palette: modes, create, tools, view, projects                   |
| `src/SettingsModal.jsx`   | Font-size / auto-save / debug / AI launcher                        |
| `src/utils/persistence.js`| vv-prefixed localStorage helpers                                    |
```

Mark deleted:
```markdown
| `src/FloatingMenu.jsx`    | (deleted v0.9.0 — superseded by CommandPalette) |
| `src/LinearView.jsx`      | (deleted v0.9.0 — superseded by DocPane)         |
| `src/Playthrough.jsx`     | (deleted v0.9.0 — superseded by ReadPane)        |
```

- [ ] **Step 6: Run all tests**

```bash
npx jest 2>&1 | tail -20
```
Expected: green. If any test imported `LinearView` or `Playthrough`, it must already have been ported in earlier tasks; otherwise update or delete the stale test now.

- [ ] **Step 7: Run ESLint**

```bash
npx eslint src/ 2>&1 | tail -30
```
Expected: no new errors. Warnings inherited from master are acceptable. Fix unused-import warnings introduced by this task.

- [ ] **Step 8: Build**

```bash
npm run build 2>&1 | tail -10
```
Expected: build succeeds.

- [ ] **Step 9: Manual smoke (full pass)**

```bash
npm run dev
```
Run the spec's full smoke list (see `docs/superpowers/specs/2026-05-01-modes-and-layout-design.md` §Testing → "Manual smoke before merge"). Each item must pass:

1. Switch through all 4 modes via sidebar and 1/2/3/4. Reload — mode persists.
2. Split: click node → text scrolls; scroll → node highlights; ref-link click works; drag divider clamped 0.2–0.8.
3. Innehåll: outline toggle; focus mode (button + Esc); status bar live word count.
4. Läsa: paper/dark; läsare/redaktör; back/restart; breadcrumb-jump.
5. ⌘K: arrow nav; Enter activates; Esc closes; "Skiss" entry switches mode; project switcher works.
6. Sign-in/out, project switch, new project, import/export, auto-save, undo/redo all work.

- [ ] **Step 10: Commit**

```bash
git add -A
git commit -m "chore(redesign): delete FloatingMenu/LinearView/Playthrough; drop legacy aliases

- Delete src/FloatingMenu.jsx, src/LinearView.jsx, src/Playthrough.jsx
  (replaced by CommandPalette / DocPane / ReadPane).
- Drop legacy CSS aliases (--text, --btn, --modal-bg, --radius, etc.)
  from theme.css; migrate any remaining usages to the new tokens.
- Remove dead rules from index.css (.search-input, .floating-menu*).
- Update facts/REGISTRY.md to reflect new and deleted files.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

---

## Task 8: Release v0.9.0 — version bump, CHANGELOG, facts updates, Vercel preview

**Files:**
- Modify: `package.json` (version → `0.9.0`)
- Modify: `CHANGELOG.md` (add v0.9.0 entry; create file if missing per CLAUDE.md)
- Modify: `CLAUDE.md` (current version line → `0.9.0`)
- Modify: `facts/STRATEGY.md` (note the modes-and-layout decision; only if file exists)

- [ ] **Step 1: Bump version in package.json**

Open `package.json`. Change:
```json
"version": "0.8.1",
```
to:
```json
"version": "0.9.0",
```

(Note: even though CLAUDE.md says current is 0.8.2, the package.json says 0.8.1 — likely a missed bump. Set to 0.9.0 directly.)

- [ ] **Step 2: Update CLAUDE.md current version line**

In `CLAUDE.md`, change:
```markdown
- Current version: 0.8.2
```
to:
```markdown
- Current version: 0.9.0
```

- [ ] **Step 3: Add CHANGELOG entry**

Open `CHANGELOG.md` (it's untracked at the start of this branch — create it if missing or edit the existing file).

Add at the top:
```markdown
## v0.9.0 — Modes & Layout Redesign — 2026-05-XX

Major UI overhaul derived from the Claude Design handoff
(`docs/design-handoff/`). Single, cohesive shell with four distinct
modes: Skiss, Skiss + Innehåll, Innehåll, Läsa.

### Added
- 56px sidebar nav for mode switching
- Slim 44px topbar with project name, save pill (sparad / sparar…),
  search button, share, and avatar slot
- ⌘K command palette (Lägen / Skapa / Verktyg / Visa / Projekt)
- Settings modal aggregating font-size, auto-save, debug, AI launcher
- DocPane: Google-Docs-style page with collapsible outline, focus
  mode, status bar, accent-pill ref-link rendering
- ReadPane: paper/dark themes, drop-cap, redesigned choice buttons,
  sticky breadcrumb, läsare/redaktör toggle
- GraphPane: floating toolbar, zoom controls, restyled minimap;
  NodeCard restyled with accent-bar + active glow
- Design tokens (full set: bg/panel/line/ink/accent/status), Source
  Serif Pro + JetBrains Mono fonts, vv-prefixed localStorage helpers
- Keyboard shortcuts: ⌘K, 1/2/3/4, Esc; existing ⌘Z/⌘⇧Z/⌘N/⌘D
  preserved
- `pre-redesign-v0.8.2` git tag for rollback

### Changed
- App.jsx slimmed dramatically; UI orchestration moves to AppShell
- Light theme dropped (dark-only); reading mode keeps its own
  paper/dark toggle
- Project switcher / new project / import / export / auto-layout /
  history all reachable through the command palette
- LinearView scroll fix preserved (manual DOM scroll for ProseMirror)

### Removed
- FloatingMenu component (replaced by command palette)
- LinearView component (replaced by DocPane)
- Playthrough modal (replaced by ReadPane mode)
- `[data-theme="light"]` block in theme.css
- Legacy CSS aliases (--text, --btn, --modal-bg, --radius, --gap)
```

- [ ] **Step 4: Update facts/STRATEGY.md if it exists**

```bash
ls facts/STRATEGY.md
```

If present, append (or append to a "Decisions" / "Recent" section) one entry:

```markdown
### 2026-05-01 — Modes & Layout redesign (v0.9.0)

Adopted the Claude Design handoff: four distinct work modes with
a sidebar nav, slim topbar, command palette, and Google-Docs-style
DocPane / paper-or-dark ReadPane. Light app theme dropped. Spec:
`docs/superpowers/specs/2026-05-01-modes-and-layout-design.md`.
Plan: `docs/superpowers/plans/2026-05-01-modes-and-layout.md`.
Rollback marker: tag `pre-redesign-v0.8.2`.
```

If `facts/STRATEGY.md` doesn't exist, skip this step.

- [ ] **Step 5: Run final verification**

```bash
npx jest && npx eslint src/ && npm run build
```
Expected: all three green.

- [ ] **Step 6: Commit**

```bash
git add package.json CLAUDE.md CHANGELOG.md
git add facts/STRATEGY.md 2>/dev/null
git commit -m "chore(release): v0.9.0 — modes and layout redesign

Bump package.json to 0.9.0, update CLAUDE.md current version line,
add comprehensive CHANGELOG entry covering the eight-task redesign.

Co-Authored-By: Claude Opus 4.7 <noreply@anthropic.com>"
```

- [ ] **Step 7: Push branch and create PR**

```bash
git push -u origin feature/redesign-modes-and-layout
gh pr create --title "feat: modes and layout redesign (v0.9.0)" --body "$(cat <<'EOF'
## Summary

Major UI overhaul implementing the Claude Design handoff (see
`docs/design-handoff/` and `docs/superpowers/specs/2026-05-01-modes-and-layout-design.md`).

- 4 distinct modes (Skiss / Skiss + Innehåll / Innehåll / Läsa)
- 56px sidebar nav + slim 44px topbar
- ⌘K command palette + settings modal
- Google-Docs-style DocPane (replaces LinearView)
- Redesigned ReadPane (replaces Playthrough)
- Restyled GraphPane + NodeCard
- Full design-token set + Source Serif Pro / JetBrains Mono fonts
- Light theme dropped (dark-only); reading mode keeps paper/dark

Rollback marker: tag `pre-redesign-v0.8.2` on master.

## Test plan
- [ ] Vercel preview loads without errors
- [ ] Switch all 4 modes via sidebar AND 1/2/3/4 keys; reload preserves mode
- [ ] Split: node click scrolls doc; scroll updates active node; divider drag clamped 0.2–0.8
- [ ] Innehåll: outline toggle; focus mode (Esc exits); status bar word count
- [ ] Läsa: paper/dark; läsare/redaktör; back/restart; breadcrumb jump
- [ ] ⌘K palette: filter, arrow+Enter, Esc, project switcher
- [ ] Sign-in/out, project switch, new project, import/export, auto-save, undo/redo
- [ ] AI Settings modal opens via Settings → "Öppna AI-inställningar..."

🤖 Generated with [Claude Code](https://claude.com/claude-code)
EOF
)"
```

- [ ] **Step 8: Verify Vercel preview**

The PR description shows a preview URL (Vercel auto-deploys on push). Click it. Run the same Test plan against the preview.

If a smoke item fails, fix on this branch and force-push (or push a fix-up commit) before merging.

- [ ] **Step 9: Merge to master, push tag**

After approval:

```bash
git checkout master
git merge --no-ff feature/redesign-modes-and-layout -m "Merge: modes and layout redesign (v0.9.0)"
git push
git push origin pre-redesign-v0.8.2
git tag v0.9.0
git push origin v0.9.0
```

Vercel auto-deploys master to production.

- [ ] **Step 10: Verify production**

Open the production URL. Re-run the smoke list. If a regression appears:

```bash
# Revert the merge
git revert -m 1 <merge-commit-sha>
git push
```

Or roll back via the Vercel dashboard ("Promote to production" on the previous deployment).

The `pre-redesign-v0.8.2` tag remains as the canonical rollback point if a deeper revert is needed:

```bash
git checkout pre-redesign-v0.8.2 -- .
git commit -m "rollback: revert to pre-redesign-v0.8.2"
git push
```

---

## Self-review checklist (run after writing this plan)

Before handing off, verify against `docs/superpowers/specs/2026-05-01-modes-and-layout-design.md`:

| Spec section | Plan task |
|---|---|
| Design tokens (full list) | Task 1 |
| Fonts (Google Fonts link) | Task 1 |
| File map (new/rewritten/deleted) | Tasks 2–7 (new), 7 (delete) |
| State model | Task 2 |
| Layout (sidebar + topbar + workspace) | Task 2 |
| `<SidebarNav>` spec | Task 2 |
| `<Topbar>` spec | Tasks 2 + 6 |
| Mode 1 — Skiss | Task 3 |
| Mode 2 — Split | Tasks 2 (placeholder) + 3 + 4 |
| Mode 3 — Innehåll | Task 4 |
| Mode 4 — Läsa | Task 5 |
| `<DocPane>` structure + toolbar + outline + page + ref-link | Task 4 |
| Focus mode | Task 4 |
| `<ReadPane>` structure + drop-cap + choices + breadcrumb | Task 5 |
| Graph ↔ Doc synchronisation | Task 4 |
| Keyboard shortcuts | Task 2 (⌘K, 1-4, Esc), preserved (⌘Z/⌘N/⌘D/⌘F) in App.jsx |
| Header migration | Task 6 (palette + settings); FloatingMenu removed in 7 |
| `<CommandPalette>` spec | Task 6 |
| `<SettingsModal>` spec | Task 6 |
| Behaviour preservation contract | Tasks 4, 6 keep hooks untouched; Task 7 final smoke verifies |
| Risk register | Task 0 (tag), 4 (sync fallback), 6 (save indicator) |
| Commit/PR sequence (8 commits) | Tasks 1–8 |
| Testing (Jest + manual + Vercel) | Tasks 1, 2, 4, 5, 6 (Jest); 7, 8 (manual + Vercel) |
| Out of scope | Sektion/Idé disabled-but-rendered (Task 3); AI Proofread/Suggestions never wired (no task) |
| Definition of done (8 commits, jest green, eslint clean, version bumped, CHANGELOG, REGISTRY, tag) | Task 8 |

All spec sections accounted for. No placeholders remain.
