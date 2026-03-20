# Linear View Rewrite — Word Processor Experience

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform Linear View from a broken sync-loop into a proper writing environment that feels like Google Docs, where authors can write their branching story as flowing text and have it seamlessly sync with the node graph.

**Architecture:** Make TipTap the **source of truth** for text content while in Linear View. Stop the bidirectional sync loop by making the flow one-directional during editing: TipTap → nodes (via debounced parser). Only sync nodes → TipTap on initial open and explicit reload. Add a proper formatting toolbar, slash commands, and smart node detection.

**Tech Stack:** TipTap 2.13+, new extensions: @tiptap/extension-text-align, @tiptap/extension-placeholder, @tiptap/extension-character-count, @tiptap/extension-highlight, @tiptap/extension-typography

---

## Root Cause Analysis

The current system has a fatal feedback loop:
```
nodes → convertNodesToLinearText → linearText → TipTap → onUpdate → setText
→ useLinearParser → setNodes → useEffect → convertNodesToLinearText → LOOP
```

Format mismatch makes it worse: `convertNodesToLinearText` outputs `#001 Title` but TipTap serializes headings as `## #001 Title`. The equality guard fails, causing content to reset.

**Solution:** Break the loop. TipTap edits only flow OUT to nodes (debounced). Nodes only flow IN to TipTap on mount/explicit sync. No more `useEffect` regenerating linearText from nodes while the editor is active.

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `src/LinearView.jsx` | **Rewrite** | Main editor component with toolbar, one-directional sync |
| `src/EditorToolbar.jsx` | **Create** | Full formatting toolbar (Word-style menu bar) |
| `src/EditorBubbleMenu.jsx` | **Rewrite** | Enhanced floating menu for selections |
| `src/useLinearParser.ts` | **Modify** | Add debounce, fix title parsing, trigger edge scan |
| `src/utils/linearConversion.ts` | **Modify** | Sort nodes by ID, output `## ` prefix to match TipTap format |
| `src/App.jsx` | **Modify** | Remove the nodes→linearText useEffect loop, add edge scan after parser |
| `src/index.css` | **Modify** | Toolbar styles, editor typography |
| `package.json` | **Modify** | Add new TipTap extensions |

---

### Task 1: Install TipTap Extensions

**Files:**
- Modify: `package.json`

- [ ] **Step 1: Install new extensions**

```bash
npm install @tiptap/extension-text-align @tiptap/extension-placeholder @tiptap/extension-character-count @tiptap/extension-highlight @tiptap/extension-typography
```

- [ ] **Step 2: Verify build**

Run: `npx vite build`

- [ ] **Step 3: Commit**

```bash
git add package.json package-lock.json
git commit -m "chore: add TipTap extensions for Linear View rewrite"
```

---

### Task 2: Break the Sync Loop in App.jsx

The most critical fix. Stop `nodes` changes from regenerating `linearText` while Linear View is editing.

**Files:**
- Modify: `src/App.jsx`
- Modify: `src/utils/linearConversion.ts`

- [ ] **Step 1: Fix convertNodesToLinearText to output `## ` prefix**

In `src/utils/linearConversion.ts`, change the heading format to include `## ` so it matches what TipTap's markdown serializer produces:

```typescript
export function convertNodesToLinearText(nodes: any[]): string {
  // Sort by numeric ID for consistent ordering
  const sorted = [...nodes]
    .filter(n => n.type !== 'group')
    .sort((a, b) => a.id.localeCompare(b.id))

  return sorted
    .map(n => {
      const title = n.data?.title || ''
      const text = n.data?.text || ''
      const lines = [`## #${n.id} ${title}`.trimEnd()]
      if (text) {
        lines.push('')  // blank line after heading
        lines.push(text)
      }
      return lines.join('\n')
    })
    .join('\n\n')
}
```

- [ ] **Step 2: Remove the bidirectional sync useEffect in App.jsx**

Find and modify the useEffect that regenerates linearText from nodes (around line 143):

```jsx
// Only generate linear text on initial load and when Linear View opens
// NOT on every node change (that causes the feedback loop)
const generateLinearText = useCallback(() => {
  setLinearText(convertNodesToLinearText(nodes))
}, [nodes])
```

Remove the automatic useEffect:
```jsx
// DELETE THIS:
// useEffect(() => {
//   setLinearText(convertNodesToLinearText(nodes))
// }, [nodes])
```

Instead, call `generateLinearText()` only when opening Linear View or on initial load.

- [ ] **Step 3: Add edge scanning after parser updates**

After the `useLinearParser` call in LinearView, edges aren't updated. Add a `useEffect` in App.jsx that runs `scanEdges` when nodes change:

This already exists as explicit calls in mutation functions. Just ensure the `scanEdges` is called after parser updates too. In the `useLinearParser` useEffect, after `setNodes`, also dispatch a custom event:

```typescript
// At the end of the setNodes callback in useLinearParser:
window.dispatchEvent(new Event('nodes-updated-from-parser'))
```

In App.jsx, listen for this event and run scanEdges:
```jsx
useEffect(() => {
  const handler = () => setEdges(scanEdges(nodes))
  window.addEventListener('nodes-updated-from-parser', handler)
  return () => window.removeEventListener('nodes-updated-from-parser', handler)
}, [nodes])
```

- [ ] **Step 4: Run tests and build**

Run: `npx jest --verbose && npx vite build`

- [ ] **Step 5: Commit**

```bash
git add src/App.jsx src/utils/linearConversion.ts src/useLinearParser.ts
git commit -m "fix: break sync loop, sort nodes by ID, scan edges from parser"
```

---

### Task 3: Add Debounce to useLinearParser

**Files:**
- Modify: `src/useLinearParser.ts`

- [ ] **Step 1: Add debounce and fix title parsing**

```typescript
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
```

- [ ] **Step 2: Update tests**

In `src/__tests__/LinearParser.test.ts`, update the test to use `## ` prefix format since that's now the canonical format:

```typescript
import { parseLinearText } from '../useLinearParser.ts'

describe('parseLinearText', () => {
  test('parses well-formed nodes with ## prefix', () => {
    const raw = '## #001 Title One\nBody one\n\n## #002 Title Two\nBody two'
    const result = parseLinearText(raw)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ id: '001', title: 'Title One', text: 'Body one' })
    expect(result[1]).toEqual({ id: '002', title: 'Title Two', text: 'Body two' })
  })

  test('handles nodes without title', () => {
    const raw = '## #001\nBody only'
    const result = parseLinearText(raw)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('')
    expect(result[0].text).toBe('Body only')
  })

  test('ignores duplicate ids', () => {
    const raw = '## #001 First\nText\n\n## #001 Duplicate\nMore'
    const parsed = parseLinearText(raw)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('001')
  })

  test('skips blocks without valid heading', () => {
    const raw = 'Some random text\n\n## #002 Second\nMore'
    const parsed = parseLinearText(raw)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('002')
  })
})
```

- [ ] **Step 3: Run tests**

Run: `npx jest src/__tests__/LinearParser.test.ts --verbose`

- [ ] **Step 4: Commit**

```bash
git add src/useLinearParser.ts src/__tests__/LinearParser.test.ts
git commit -m "feat: debounced parser with consistent ## heading format"
```

---

### Task 4: Create the Formatting Toolbar

A proper Word-style toolbar with font formatting, headings, alignment, and our special CYOA tools.

**Files:**
- Create: `src/EditorToolbar.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: Create EditorToolbar component**

```jsx
// src/EditorToolbar.jsx
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  Undo2, Redo2, Link2, Hash
} from 'lucide-react'

function ToolbarButton({ icon: Icon, active, onClick, title, label }) {
  return (
    <button
      className={`toolbar-btn${active ? ' active' : ''}`}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      type="button"
    >
      {Icon ? <Icon className="h-4 w-4" /> : label}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="toolbar-divider" />
}

export default function EditorToolbar({ editor, onInsertNode }) {
  if (!editor) return null

  return (
    <div className="editor-toolbar">
      <div className="toolbar-group">
        <ToolbarButton icon={Undo2} onClick={() => editor.chain().focus().undo().run()} title="Ångra (Ctrl+Z)" />
        <ToolbarButton icon={Redo2} onClick={() => editor.chain().focus().redo().run()} title="Gör om (Ctrl+Shift+Z)" />
      </div>

      <ToolbarDivider />

      <div className="toolbar-group">
        <ToolbarButton
          icon={Heading1} active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Rubrik 1 (Ctrl+Alt+1)"
        />
        <ToolbarButton
          icon={Heading2} active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Rubrik 2 (Ctrl+Alt+2)"
        />
        <ToolbarButton
          icon={Heading3} active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Rubrik 3 (Ctrl+Alt+3)"
        />
      </div>

      <ToolbarDivider />

      <div className="toolbar-group">
        <ToolbarButton
          icon={Bold} active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Fet (Ctrl+B)"
        />
        <ToolbarButton
          icon={Italic} active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Kursiv (Ctrl+I)"
        />
        <ToolbarButton
          icon={UnderlineIcon} active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Understruken (Ctrl+U)"
        />
        <ToolbarButton
          icon={Strikethrough} active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Genomstruken"
        />
      </div>

      <ToolbarDivider />

      <div className="toolbar-group">
        <ToolbarButton
          icon={AlignLeft} active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Vänsterjustera"
        />
        <ToolbarButton
          icon={AlignCenter} active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Centrera"
        />
        <ToolbarButton
          icon={AlignRight} active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Högerjustera"
        />
      </div>

      <ToolbarDivider />

      <div className="toolbar-group">
        <ToolbarButton
          icon={List} active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Punktlista"
        />
        <ToolbarButton
          icon={ListOrdered} active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numrerad lista"
        />
        <ToolbarButton
          icon={Quote} active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Citat"
        />
        <ToolbarButton
          icon={Minus}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horisontell linje"
        />
      </div>

      <ToolbarDivider />

      <div className="toolbar-group">
        <ToolbarButton
          icon={Hash}
          onClick={onInsertNode}
          title="Infoga ny nod"
        />
        <ToolbarButton
          icon={Link2}
          onClick={() => {
            const id = prompt('Nod-ID att länka till (t.ex. 003):')
            if (id && /^\d{3}$/.test(id)) {
              editor.chain().focus().insertContent(`[#${id}]`).run()
            }
          }}
          title="Infoga länk till nod"
        />
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add toolbar CSS**

Add to `src/index.css`:

```css
.editor-toolbar {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 4px 8px;
  border-bottom: 1px solid var(--panel);
  background: var(--bg);
  flex-wrap: wrap;
  min-height: 36px;
}

.toolbar-group {
  display: flex;
  gap: 1px;
}

.toolbar-btn {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 28px;
  height: 28px;
  border: none;
  border-radius: 4px;
  background: transparent;
  color: var(--text);
  cursor: pointer;
  font-size: 12px;
  transition: background 0.15s;
}

.toolbar-btn:hover {
  background: var(--btn-hover);
}

.toolbar-btn.active {
  background: var(--accent);
  color: #fff;
}

.toolbar-divider {
  width: 1px;
  height: 20px;
  background: var(--panel);
  margin: 0 4px;
}
```

- [ ] **Step 3: Commit**

```bash
git add src/EditorToolbar.jsx src/index.css
git commit -m "feat: create Word-style formatting toolbar"
```

---

### Task 5: Rewrite LinearView

The main rewrite. One-directional sync, proper toolbar, better editor experience.

**Files:**
- Rewrite: `src/LinearView.jsx`

- [ ] **Step 1: Rewrite LinearView**

Key changes:
1. Remove the `text` prop sync useEffect (the bidirectional loop breaker)
2. Use `text` only for initial content on mount
3. Editor → nodes is one-way via debounced parser
4. Enable lists in StarterKit
5. Add new extensions (TextAlign, Placeholder, CharacterCount, Typography)
6. Replace old toolbar with new EditorToolbar
7. Better outline that reads from parser output instead of DOM scanning

```jsx
import { useCallback, useEffect, useRef, useState, useMemo } from 'react'
import { ChevronLeft, ChevronRight, Plus, Download } from 'lucide-react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import TextAlign from '@tiptap/extension-text-align'
import Placeholder from '@tiptap/extension-placeholder'
import CharacterCount from '@tiptap/extension-character-count'
import Typography from '@tiptap/extension-typography'
import Highlight from '@tiptap/extension-highlight'
import { Markdown } from 'tiptap-markdown'
import CustomLink from './CustomLink.ts'
import ArrowLink from './ArrowLink.ts'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import EditorBubbleMenu from './EditorBubbleMenu.jsx'
import EditorToolbar from './EditorToolbar.jsx'
import useLinearParser, { parseLinearText } from './useLinearParser.ts'
import ActiveNodeHighlight from './ActiveNodeHighlight.ts'
import 'tippy.js/dist/tippy.css'

export default function LinearView({
  text,
  setText,
  setNodes,
  nextId,
  expanded,
  onToggleExpand,
  activeNodeId,
  onSelectNode,
}) {
  const [next, setNext] = useState(nextId)
  const [activeId, setActiveId] = useState(null)
  const mainRef = useRef(null)
  const initialTextRef = useRef(text)

  const editor = useEditor({
    extensions: [
      StarterKit.configure({
        heading: { levels: [1, 2, 3] },
      }),
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
      // One-way flow: editor → setText → parser → nodes
      setText(editor.storage.markdown.getMarkdown())
    },
  })

  // Parse text into outline entries (lightweight, no DOM scanning)
  const outlineEntries = useMemo(() => parseLinearText(text || ''), [text])

  // Sync parser: text → nodes (debounced inside useLinearParser)
  useLinearParser(text, setNodes)

  useEffect(() => {
    setNext(nextId)
  }, [nextId])

  // Auto-convert paragraphs starting with #NNN to h2 headings
  useEffect(() => {
    if (!editor) return
    const convertHeadings = () => {
      const { doc, schema } = editor.state
      let tr = editor.state.tr
      let modified = false
      doc.descendants((node, pos) => {
        if (node.type.name === 'paragraph' && /^#\d{3}\s/.test(node.textContent)) {
          tr = tr.setNodeMarkup(pos, schema.nodes.heading, { level: 2 })
          modified = true
        }
      })
      if (modified) {
        editor.view.dispatch(tr)
      }
    }
    convertHeadings()
    editor.on('update', convertHeadings)
    return () => editor.off('update', convertHeadings)
  }, [editor])

  const insertNewNode = () => {
    if (!editor) return
    const nodeId = `#${String(next).padStart(3, '0')}`
    editor.chain().focus().insertContent(`\n\n## ${nodeId} \n\n`).run()
    setNext(n => n + 1)
  }

  const exportMarkdown = () => {
    if (!editor) return
    const md = editor.storage.markdown.getMarkdown()
    const blob = new Blob([md], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = 'linear.md'
    a.click()
    URL.revokeObjectURL(url)
  }

  const jumpTo = useCallback(
    id => {
      if (!editor) return
      let targetPos = null
      const targetIdString = `#${id}`
      editor.state.doc.descendants((node, pos) => {
        if (
          (node.type.name === 'heading' || node.type.name === 'paragraph') &&
          node.textContent.startsWith(targetIdString)
        ) {
          targetPos = pos
          return false
        }
      })
      if (targetPos !== null) {
        editor.chain().setTextSelection(targetPos).scrollIntoView().run()
        setActiveId(id)
        editor.commands.setActiveNodeId(id)
        if (onSelectNode && id !== activeNodeId) {
          onSelectNode(id)
        }
      }
    },
    [editor, onSelectNode, activeNodeId]
  )

  // Handle link clicks in editor
  useEffect(() => {
    const root = document.getElementById('linearEditor')
    if (!root) return
    const handle = e => {
      const anchor = e.target.closest('a')
      if (!anchor) return
      const href = anchor.getAttribute('href') || ''
      if (!href.startsWith('#')) return
      const id = href.slice(1)
      if (/^\d{3}$/.test(id)) {
        e.preventDefault()
        jumpTo(id)
      }
    }
    root.addEventListener('click', handle)
    return () => root.removeEventListener('click', handle)
  }, [jumpTo])

  // Jump to active node when selected from graph
  useEffect(() => {
    if (!editor) return
    if (activeNodeId) {
      jumpTo(activeNodeId)
    } else {
      editor.commands.setActiveNodeId(null)
    }
  }, [activeNodeId, editor, jumpTo])

  // Scroll-based active tracking
  useEffect(() => {
    const container = mainRef.current
    if (!container) return
    const handleScroll = () => {
      const headings = Array.from(document.querySelectorAll('#linearEditor h2'))
      const top = container.getBoundingClientRect().top
      let current = null
      headings.forEach(h => {
        const rect = h.getBoundingClientRect()
        if (rect.top - top <= 10) {
          current = h.dataset?.id || current
        }
      })
      setActiveId(current)
    }
    container.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => container.removeEventListener('scroll', handleScroll)
  }, [outlineEntries])

  // Set data-id on h2 elements for scroll tracking
  useEffect(() => {
    if (!editor) return
    const setIds = () => {
      const el = document.getElementById('linearEditor')
      if (!el) return
      el.querySelectorAll('h2').forEach(h => {
        const m = h.textContent?.match(/^#(\d{3})/)
        if (m) {
          h.dataset.id = m[1]
          h.id = m[1]
        }
      })
    }
    const observer = new MutationObserver(setIds)
    const el = document.getElementById('linearEditor')
    if (el) observer.observe(el, { childList: true, subtree: true, characterData: true })
    setIds()
    return () => observer.disconnect()
  }, [editor])

  if (!editor) return null

  const wordCount = editor.storage.characterCount?.words() || 0
  const charCount = editor.storage.characterCount?.characters() || 0

  return (
    <div id="linear-panel" className="linear-container flex flex-col h-full">
      <header className="linear-header p-3 flex items-center justify-between border-b">
        <div className="flex items-center gap-2">
          <button className="btn ghost" type="button" onClick={onToggleExpand}
            title={expanded ? 'Collapse' : 'Expand'}
            aria-label={expanded ? 'Collapse panel' : 'Expand panel'}>
            {expanded ? <ChevronRight /> : <ChevronLeft />}
          </button>
          <h1 className="text-lg font-bold">Linear View</h1>
          <span className="text-xs text-dim" style={{ opacity: 0.5 }}>
            {wordCount} ord · {charCount} tecken
          </span>
        </div>
        <div className="flex items-center gap-3">
          <button className="btn" type="button" onClick={insertNewNode} aria-label="Ny nod">
            <Plus aria-hidden="true" />
          </button>
          <button className="btn" type="button" onClick={exportMarkdown}>
            <Download className="h-4 w-4" /> Exportera
          </button>
        </div>
      </header>

      <EditorToolbar editor={editor} onInsertNode={insertNewNode} />

      <div className="flex flex-1 min-h-0">
        <aside className="hidden md:flex md:flex-col md:w-1/4 linear-sidebar h-full min-h-0">
          <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
            <h2 className="text-sm font-semibold text-dim uppercase tracking-wider mb-4">
              Outline
            </h2>
            <ul className="space-y-1">
              {outlineEntries.map(item => (
                <li key={item.id}>
                  <button
                    type="button"
                    className={`outline-btn block w-full text-left text-sm p-2 rounded-md ${
                      activeId === item.id ? 'active' : ''
                    }`}
                    onClick={() => jumpTo(item.id)}
                  >
                    #{item.id} {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </aside>
        <main className="flex-1 flex flex-col linear-main min-h-0 overflow-hidden">
          <div
            ref={mainRef}
            className="flex-1 overflow-y-auto p-4 sm:p-8 md:p-12 no-scrollbar main-editor-container"
          >
            <div className="max-w-3xl mx-auto relative">
              {editor && <EditorBubbleMenu editor={editor} />}
              <EditorContent id="linearEditor" editor={editor} />
            </div>
          </div>
        </main>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Build and test**

Run: `npx vite build && npx jest --verbose`

- [ ] **Step 3: Commit**

```bash
git add src/LinearView.jsx
git commit -m "feat: rewrite LinearView with one-way sync and full toolbar"
```

---

### Task 6: Enhance EditorBubbleMenu

**Files:**
- Rewrite: `src/EditorBubbleMenu.jsx`

- [ ] **Step 1: Add more formatting options to bubble menu**

```jsx
import { BubbleMenu } from '@tiptap/react'
import { Bold, Italic, Underline, Strikethrough, Heading2, Link2, Highlighter } from 'lucide-react'

export default function EditorBubbleMenu({ editor }) {
  if (!editor) return null

  return (
    <BubbleMenu editor={editor} tippyOptions={{ duration: 150 }}
      shouldShow={({ state }) => {
        const { from, to } = state.selection
        return from !== to
      }}
    >
      <div className="bubble-menu">
        <button
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Rubrik"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          className={editor.isActive('bold') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Fet"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          className={editor.isActive('italic') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Kursiv"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          className={editor.isActive('underline') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Understruken"
        >
          <Underline className="h-4 w-4" />
        </button>
        <button
          className={editor.isActive('strike') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Genomstruken"
        >
          <Strikethrough className="h-4 w-4" />
        </button>
        <button
          className={editor.isActive('highlight') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          title="Markera"
        >
          <Highlighter className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            const id = prompt('Nod-ID (t.ex. 003):')
            if (id && /^\d{3}$/.test(id)) {
              editor.chain().focus().insertContent(`[#${id}]`).run()
            }
          }}
          title="Länk till nod"
        >
          <Link2 className="h-4 w-4" />
        </button>
      </div>
    </BubbleMenu>
  )
}
```

- [ ] **Step 2: Commit**

```bash
git add src/EditorBubbleMenu.jsx
git commit -m "feat: enhanced bubble menu with highlight and node links"
```

---

### Task 7: Typography Polish

**Files:**
- Modify: `src/index.css`

- [ ] **Step 1: Add editor typography styles**

Add/update these styles for a proper writing experience:

```css
/* Editor typography — book-like reading experience */
#linearEditor .ProseMirror {
  font-family: 'Lora', 'Georgia', serif;
  font-size: 1.1rem;
  line-height: 1.8;
  color: var(--text);
  min-height: 80vh;
  outline: none;
}

#linearEditor .ProseMirror h1 {
  font-family: 'Inter', sans-serif;
  font-size: 2rem;
  font-weight: 700;
  margin: 2.5rem 0 1rem;
  line-height: 1.3;
}

#linearEditor .ProseMirror h2 {
  font-family: 'Inter', sans-serif;
  font-size: 1.5rem;
  font-weight: 600;
  margin: 2.5rem 0 1rem;
  padding-bottom: 0.5rem;
  border-bottom: 1px solid var(--panel);
  line-height: 1.3;
}

#linearEditor .ProseMirror h3 {
  font-family: 'Inter', sans-serif;
  font-size: 1.2rem;
  font-weight: 600;
  margin: 1.5rem 0 0.5rem;
}

#linearEditor .ProseMirror p {
  margin: 0 0 1rem;
}

#linearEditor .ProseMirror p.is-editor-empty:first-child::before {
  content: attr(data-placeholder);
  float: left;
  color: var(--text-dim);
  pointer-events: none;
  height: 0;
}

#linearEditor .ProseMirror blockquote {
  border-left: 3px solid var(--accent);
  padding-left: 1rem;
  margin: 1rem 0;
  color: var(--text-dim);
  font-style: italic;
}

#linearEditor .ProseMirror ul,
#linearEditor .ProseMirror ol {
  padding-left: 1.5rem;
  margin: 0.5rem 0;
}

#linearEditor .ProseMirror hr {
  border: none;
  border-top: 2px solid var(--panel);
  margin: 2rem 0;
}

#linearEditor .ProseMirror mark {
  background: rgba(250, 204, 21, 0.4);
  border-radius: 2px;
  padding: 1px 2px;
}
```

- [ ] **Step 2: Bump version to 0.7.0**

- [ ] **Step 3: Build and test**

Run: `npx vite build && npx jest --verbose`

- [ ] **Step 4: Commit**

```bash
git add src/index.css package.json
git commit -m "feat: book-like typography for Linear View editor (v0.7.0)"
```

---

## Summary

| Task | What | Impact |
|------|------|--------|
| 1 | Install TipTap extensions | Foundation |
| 2 | Break sync loop | **Critical** — fixes the root cause of cursor jumps and data loss |
| 3 | Debounced parser | Performance + stability |
| 4 | Formatting toolbar | Word-like editing experience |
| 5 | LinearView rewrite | One-way sync, proper toolbar integration |
| 6 | Enhanced bubble menu | Quick formatting on selection |
| 7 | Typography polish | Book-like reading/writing feel |

The result: Linear View becomes a proper word processor where writing flows naturally, formatting works like Google Docs, and the branching story structure is detected automatically from `## #NNN` headings.
