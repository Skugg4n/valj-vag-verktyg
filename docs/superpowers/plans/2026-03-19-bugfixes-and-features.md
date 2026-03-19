# Välj Väg Verktyg — Bug Fixes & Features Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix critical bugs in the branching story editor (Linear View node destruction, broken outline, missing scroll) and add new features (overview mode, zoom range, background sections).

**Architecture:** The app is a React + Vite SPA using React Flow for the graph editor and TipTap for rich text in Linear View. Fixes target `useLinearParser.ts` (node preservation), `LinearView.jsx` (outline sidebar with scroll-to), `NodeCard.jsx` (scroll, zoom-aware rendering), and `App.jsx` (color picker accessibility, zoom config). New features use React Flow's built-in group nodes and viewport hooks.

**Tech Stack:** React 19, Vite 6, React Flow 11, TipTap, TypeScript (parser), CSS custom properties for theming.

---

## File Map

| File | Changes | Responsibility |
|------|---------|----------------|
| `src/useLinearParser.ts` | **Major fix** | Preserve nodes not found in linear text instead of deleting them |
| `src/LinearView.jsx` | **Major rewrite** | Add outline sidebar with scroll-to-node, fix add-node button, proper layout |
| `src/NodeCard.jsx` | **Modify** | Enable scrolling in preview, add zoom-aware overview mode |
| `src/App.jsx` | **Modify** | Expose color picker when node selected (not just in editor panel), increase zoom range, add group node support |
| `src/index.css` | **Modify** | Fix gradient bug, add outline sidebar styles, scroll styles, overview mode styles |
| `src/constants.js` | **Modify** | Add zoom thresholds |

---

### Task 1: Fix Linear View Parser — Stop Destroying Nodes

The most critical bug. When editing in Linear View, any node whose `## #NNN` header is temporarily malformed gets permanently deleted from the graph (position, size, edges — all lost).

**Files:**
- Modify: `src/useLinearParser.ts:29-51`
- Test: `src/__tests__/LinearParser.test.ts`

- [ ] **Step 1: Write failing test for node preservation**

In `src/__tests__/LinearParser.test.ts`, add:

```typescript
import { parseLinearText } from '../useLinearParser'

describe('parseLinearText', () => {
  it('parses well-formed nodes', () => {
    const raw = '## #001 Title One\nBody one\n## #002 Title Two\nBody two'
    const result = parseLinearText(raw)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ id: '001', title: 'Title One', text: 'Body one' })
    expect(result[1]).toEqual({ id: '002', title: 'Title Two', text: 'Body two' })
  })

  it('handles nodes without ## prefix', () => {
    const raw = '#001 Title One\nBody one'
    const result = parseLinearText(raw)
    expect(result).toHaveLength(1)
    expect(result[0].id).toBe('001')
  })
})
```

- [ ] **Step 2: Run test to verify it passes (existing parser should handle these)**

Run: `npx jest src/__tests__/LinearParser.test.ts --verbose`

- [ ] **Step 3: Fix useLinearParser to preserve unmatched nodes**

Replace the `useEffect` in `useLinearParser.ts` (lines 29-51) so that nodes NOT found in the parsed text are preserved (appended at end) rather than deleted:

```typescript
export default function useLinearParser(raw: string = '', setNodes: any): void {
  useEffect(() => {
    if (typeof setNodes !== 'function') return
    const parsed = parseLinearText(raw)
    setNodes((ns: any[]) => {
      const map = new Map(ns.map(n => [n.id, n]))
      const seenIds = new Set<string>()

      // Build updated nodes from parsed text
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

      // Preserve nodes that weren't in the parsed text (don't destroy them)
      for (const n of ns) {
        if (!seenIds.has(n.id)) {
          updated.push(n)
        }
      }

      return updated
    })
  }, [raw, setNodes])
}
```

- [ ] **Step 4: Run all tests**

Run: `npx jest --verbose`

- [ ] **Step 5: Commit**

```bash
git add src/useLinearParser.ts src/__tests__/LinearParser.test.ts
git commit -m "fix: preserve nodes during Linear View editing"
```

---

### Task 2: Fix Linear View Layout — Add Outline Sidebar with Scroll-to-Node

The Linear View currently has no working outline sidebar. The `data-id` code is dead. The screenshot shows an outline panel on the left, but clicking items doesn't scroll. The "+" button inserts raw text that doesn't create valid nodes.

**Files:**
- Modify: `src/LinearView.jsx` (major rewrite)
- Modify: `src/index.css:235-300` (modal/linear styles)

- [ ] **Step 1: Rewrite LinearView with proper outline sidebar**

Replace `src/LinearView.jsx` entirely:

```jsx
import { useEffect, useRef, useMemo } from 'react'
import { Plus, ChevronLeft } from 'lucide-react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { Markdown } from 'tiptap-markdown'
import useLinearParser, { parseLinearText } from './useLinearParser.ts'

function preprocess(md = '') {
  return md.replace(/\[#(\d{3})]/g, '[#$1](#$1)')
}

function postprocess(md = '') {
  return md.replace(/\[#(\d{3})\]\(#\1\)/g, '[#$1]')
}

export default function LinearView({ text, setText, setNodes, nextId, onClose }) {
  const editorRef = useRef(null)
  const editor = useEditor({
    extensions: [
      StarterKit,
      Underline,
      Link.configure({ openOnClick: false }),
      Markdown.configure({ html: false }),
    ],
    content: preprocess(text || ''),
    onUpdate({ editor }) {
      setText(postprocess(editor.storage.markdown.getMarkdown()))
    },
  })

  useEffect(() => {
    if (editor && text !== postprocess(editor.storage.markdown.getMarkdown())) {
      editor.commands.setContent(preprocess(text || ''))
    }
  }, [text, editor])

  useLinearParser(text, setNodes)

  // Parse outline entries from current text
  const outlineEntries = useMemo(() => parseLinearText(text || ''), [text])

  const scrollToNode = (nodeId) => {
    const container = editorRef.current
    if (!container) return
    const headings = container.querySelectorAll('h2')
    for (const h of headings) {
      if (h.textContent?.includes(`#${nodeId}`)) {
        h.scrollIntoView({ behavior: 'smooth', block: 'start' })
        return
      }
    }
  }

  const insertNewNode = () => {
    if (!editor) return
    const nodeId = String(nextId).padStart(3, '0')
    // Insert a proper heading that the parser will recognize
    editor.chain().focus().insertContent(`\n\n## #${nodeId} \n\n`).run()
  }

  useEffect(() => {
    const handler = e => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        onClose()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [onClose])

  if (!editor) return null

  return (
    <div id="modal" role="dialog" aria-modal="true" className="show">
      <div id="linear-header">
        <button className="btn ghost" onClick={onClose} title="Close (Ctrl+S)">
          <ChevronLeft className="h-4 w-4" /> Linear View
        </button>
        <div id="linear-toolbar">
          <button className="btn ghost" type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}>B</button>
          <button className="btn ghost" type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}>I</button>
          <button className="btn ghost" type="button"
            onClick={() => editor.chain().focus().toggleUnderline().run()}>U</button>
          <button className="btn ghost" type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}>H2</button>
          <button className="btn ghost" type="button"
            onClick={insertNewNode} aria-label="Add new node" title="Add new node">
            <Plus aria-hidden="true" />
          </button>
        </div>
        <button className="btn ghost" onClick={() => {
          const md = postprocess(editor.storage.markdown.getMarkdown())
          const blob = new Blob([md], { type: 'text/markdown' })
          const a = document.createElement('a')
          a.href = URL.createObjectURL(blob)
          a.download = `linear-export-${Date.now()}.md`
          document.body.appendChild(a)
          a.click()
          document.body.removeChild(a)
          URL.revokeObjectURL(a.href)
        }}>Exportera</button>
      </div>
      <div id="linear-body">
        <aside id="linear-outline">
          <div className="outline-title">OUTLINE</div>
          {outlineEntries.map(entry => (
            <button
              key={entry.id}
              className="outline-item"
              onClick={() => scrollToNode(entry.id)}
              title={`#${entry.id} ${entry.title}`}
            >
              #{entry.id} {entry.title}
            </button>
          ))}
          <div className="outline-section">
            <div className="outline-title">SHORTCUTS</div>
            <div className="outline-shortcut"><kbd>Cmd/Ctrl + B</kbd><br/>Bold</div>
            <div className="outline-shortcut"><kbd>Cmd/Ctrl + I</kbd><br/>Italic</div>
            <div className="outline-shortcut"><kbd>Cmd/Ctrl + Opt + 2</kbd><br/>Heading</div>
          </div>
        </aside>
        <div id="linear-content" ref={editorRef}>
          <EditorContent id="linearEditor" editor={editor} />
        </div>
      </div>
    </div>
  )
}
```

- [ ] **Step 2: Add CSS for the new outline sidebar layout**

In `src/index.css`, replace the modal/linear-view styles (around lines 235-300) with:

```css
/* Linear View layout */
#linear-header {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.5rem;
  border-bottom: 1px solid var(--panel);
  background: var(--bg);
}

#linear-body {
  flex: 1;
  display: flex;
  overflow: hidden;
}

#linear-outline {
  width: 200px;
  min-width: 200px;
  overflow-y: auto;
  padding: 0.75rem;
  border-right: 1px solid var(--panel);
  background: var(--panel);
}

.outline-title {
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.05em;
  color: var(--text-dim);
  margin-bottom: 0.5rem;
}

.outline-item {
  display: block;
  width: 100%;
  text-align: left;
  background: none;
  border: none;
  color: var(--text);
  font-size: 13px;
  padding: 0.35rem 0.5rem;
  border-radius: var(--radius);
  cursor: pointer;
  margin-bottom: 2px;
  line-height: 1.3;
}

.outline-item:hover {
  background: var(--btn-hover);
}

.outline-section {
  margin-top: 1.5rem;
}

.outline-shortcut {
  font-size: 12px;
  color: var(--text-dim);
  margin-bottom: 0.5rem;
}

.outline-shortcut kbd {
  font-family: monospace;
  font-size: 11px;
  background: var(--btn);
  padding: 1px 4px;
  border-radius: 3px;
}

#linear-content {
  flex: 1;
  overflow-y: auto;
  padding: 1rem 2rem;
}

/* Keep existing #linearEditor styles */
```

- [ ] **Step 3: Also update the #linear-toolbar style**

Update `#linear-toolbar` in index.css to remove the old standalone positioning:

```css
#linear-toolbar {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  flex: 1;
}
```

- [ ] **Step 4: Manual test — open Linear View, verify outline shows, click entries scroll**

- [ ] **Step 5: Commit**

```bash
git add src/LinearView.jsx src/index.css
git commit -m "fix: rebuild Linear View with working outline sidebar and scroll-to-node"
```

---

### Task 3: Fix Node Color Picker Visibility

The color picker is inside the collapsible editor panel, only visible when the panel is open AND a node is selected. This makes it easy to miss.

**Files:**
- Modify: `src/App.jsx:1089-1113` (color picker section)

- [ ] **Step 1: Move color picker trigger to the node header area in NodeCard**

Actually, the simplest fix: the color picker already exists in the editor panel's formatting toolbar (App.jsx lines 1089-1113). The issue is the editor panel collapses. The color picker itself works — it just needs to be accessible. Ensure the formatting toolbar (including color picker) is always visible when a node is selected, even if the panel is collapsed.

Move the color picker into a small floating pill that appears near the selected node, or simply ensure the editor panel auto-opens when a node is clicked.

In `src/App.jsx`, modify `onNodeClick` to auto-expand the editor:

```jsx
const onNodeClick = (_e, node) => {
  setCurrentId(node.id)
  setText(node.data.text || '')
  setTitle(node.data.title || '')
  setEditorCollapsed(false) // Auto-open editor when selecting a node
}
```

- [ ] **Step 2: Manual test — click a node, verify editor opens and color picker is accessible**

- [ ] **Step 3: Commit**

```bash
git add src/App.jsx
git commit -m "fix: auto-open editor panel when selecting a node"
```

---

### Task 4: Enable Scrolling in Node Preview Mode

Preview mode (when node is not selected) has `overflow: hidden` — users can't scroll to read long content. The edit mode scrollbar is also hidden.

**Files:**
- Modify: `src/index.css:388-427`

- [ ] **Step 1: Enable scroll in preview mode and show scrollbar in edit mode**

In `src/index.css`, change the preview and textarea styles:

```css
/* Preview: allow scroll, keep fade hint */
.node-card .node-preview {
  color: inherit;
  overflow-y: auto;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  scrollbar-width: thin;
}

/* Edit textarea: show thin scrollbar */
.node-card .node-editor .node-textarea {
  width: 100%;
  height: 100%;
  border: none;
  background: transparent;
  color: inherit;
  font-family: 'Inter', sans-serif;
  font-size: inherit;
  resize: none;
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  overflow-y: auto;
  scrollbar-width: thin;
}
```

Remove the scrollbar-hiding rules (delete the `::-webkit-scrollbar { display: none }` blocks for both `.node-textarea` and `#text`).

- [ ] **Step 2: Fix the preview-more gradient to use node's actual background color**

The gradient hardcodes `rgba(31, 41, 55, 0)`. Since we now allow scrolling, we can simplify this — but keep it as a visual hint. Fix it to use the CSS variable:

```css
.node-card .preview-more {
  position: absolute;
  bottom: 0;
  left: 0;
  width: 100%;
  text-align: center;
  pointer-events: none;
  background: linear-gradient(
    to bottom,
    transparent 0%,
    var(--card-bg, var(--card)) 70%
  );
  color: var(--text-dim);
}
```

- [ ] **Step 3: Manual test — create node with long text, verify scrollable in both modes**

- [ ] **Step 4: Commit**

```bash
git add src/index.css
git commit -m "fix: enable scrolling in node preview and edit modes"
```

---

### Task 5: Increase Zoom Range

React Flow defaults to `minZoom: 0.5` and `maxZoom: 2`. For a large story graph, users need to zoom out further.

**Files:**
- Modify: `src/App.jsx:982-1004` (ReactFlow component)

- [ ] **Step 1: Add zoom range props to ReactFlow**

```jsx
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
  onPaneClick={onPaneClick}
  nodeTypes={nodeTypes}
  snapToGrid
  snapGrid={[16, 16]}
  fitView
  minZoom={0.1}
  maxZoom={4}
>
```

- [ ] **Step 2: Commit**

```bash
git add src/App.jsx
git commit -m "feat: increase zoom range (0.1x to 4x) for better overview"
```

---

### Task 6: Zoom-Aware Overview Mode for Nodes

When zoomed out below a threshold, nodes should show only their title prominently (like colored labels) so the graph structure is readable. Body text is hidden; title font becomes larger relative to the node.

**Files:**
- Modify: `src/NodeCard.jsx`
- Modify: `src/index.css`

- [ ] **Step 1: Add zoom detection to NodeCard**

```jsx
import { memo, useState, useContext, useEffect, useRef } from 'react'
import { Handle, Position, useReactFlow, useViewport } from 'reactflow'
// ... rest of imports

const OVERVIEW_ZOOM_THRESHOLD = 0.45

const NodeCard = memo(({ id, data, selected, width = DEFAULT_NODE_WIDTH, height = DEFAULT_NODE_HEIGHT }) => {
  const { setNodes, getNodes, updateNodeInternals } = useReactFlow()
  const { updateNodeText, resizingRef } = useContext(NodeEditorContext)
  const { zoom } = useViewport()
  const isOverview = zoom < OVERVIEW_ZOOM_THRESHOLD
  // ... rest of component
```

- [ ] **Step 2: Render overview mode when zoomed out**

In the return JSX, wrap the content conditionally:

```jsx
{isOverview ? (
  <div className="node-overview-title">
    {data.title || `#${id}`}
  </div>
) : (
  <>
    <div className="node-header">
      <span className="node-id">#{id}</span>
      {data.title && <span className="node-title">{data.title}</span>}
    </div>
    <div className="node-content">
      {/* existing preview/editor */}
    </div>
  </>
)}
```

- [ ] **Step 3: Add overview mode CSS**

```css
.node-card .node-overview-title {
  flex: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 16px;
  font-weight: bold;
  text-align: center;
  overflow: hidden;
  text-overflow: ellipsis;
  padding: 0.25rem;
  line-height: 1.2;
}
```

- [ ] **Step 4: Manual test — zoom out past threshold, verify nodes show only titles**

- [ ] **Step 5: Commit**

```bash
git add src/NodeCard.jsx src/index.css
git commit -m "feat: add overview mode showing only titles when zoomed out"
```

---

### Task 7: Background Sections / Group Nodes for Story Parts

React Flow supports "group" type nodes that act as labeled containers. We can add a feature to create labeled background sections that visually group story nodes.

**Files:**
- Modify: `src/App.jsx` (add group node creation)
- Modify: `src/index.css` (group node styling)

- [ ] **Step 1: Add "Add Section" button to the header**

In `App.jsx`, add a function:

```jsx
const addSection = () => {
  pushUndoState()
  const id = `section-${Date.now()}`
  setNodes(ns => [
    {
      id,
      type: 'group',
      position: { x: 0, y: 0 },
      data: { label: 'New Section' },
      style: {
        width: 600,
        height: 400,
        background: 'rgba(59, 130, 246, 0.05)',
        border: '2px dashed rgba(59, 130, 246, 0.3)',
        borderRadius: '12px',
        fontSize: '18px',
        fontWeight: 'bold',
        color: 'rgba(59, 130, 246, 0.5)',
        padding: '12px',
      },
    },
    ...ns,
  ])
}
```

Add button in the FloatingMenu config or header.

- [ ] **Step 2: Make group nodes editable**

Group nodes use a label. We can make the label editable by double-clicking. Add to `onNodeClick`:

```jsx
// For group nodes, allow label editing via prompt
if (node.type === 'group') {
  const label = prompt('Section name:', node.data.label || '')
  if (label !== null) {
    pushUndoState()
    setNodes(ns => ns.map(n =>
      n.id === node.id ? { ...n, data: { ...n.data, label } } : n
    ))
  }
  return
}
```

- [ ] **Step 3: Add group node styles**

```css
.react-flow__node-group {
  padding: 12px;
  font-size: 16px;
  font-weight: 600;
  color: rgba(59, 130, 246, 0.6);
}
```

- [ ] **Step 4: Add section button to FloatingMenu**

Add a new item in the Tools section of `sectionConfig` in `FloatingMenu.jsx`:

```jsx
{ label: 'Add Section', icon: LayoutGrid, action: 'onAddSection' },
```

Pass `onAddSection={addSection}` from App.jsx.

- [ ] **Step 5: Manual test — add section, drag nodes into it, verify grouping**

- [ ] **Step 6: Commit**

```bash
git add src/App.jsx src/FloatingMenu.jsx src/index.css
git commit -m "feat: add background sections for grouping story nodes"
```

---

### Task 8: Fix Node Title Editing in Editor Panel

The title input in the editor panel works, but the interaction between the editor panel title and the node header display has edge cases. Also ensure the H1/H2 buttons in the formatting toolbar work correctly for the plain textarea.

**Files:**
- Modify: `src/App.jsx:1046-1060` (heading buttons)
- Modify: `src/index.css:364-371` (node-title CSS)

- [ ] **Step 1: Fix node-title CSS margin (span doesn't respect margin-bottom)**

```css
.node-card .node-title {
  font-weight: bold;
  font-size: 15px;
  display: inline-block; /* margin works on inline-block */
  max-width: calc(100% - 3rem);
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  vertical-align: middle;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/index.css
git commit -m "fix: node title CSS display property for proper spacing"
```

---

## Summary of Tasks

| Task | Type | Priority | Description |
|------|------|----------|-------------|
| 1 | Bug fix | **Critical** | Stop Linear View parser from destroying nodes |
| 2 | Bug fix + Feature | **High** | Rebuild Linear View with working outline sidebar + scroll-to |
| 3 | Bug fix | **Medium** | Auto-open editor when selecting a node (color picker accessible) |
| 4 | Bug fix | **Medium** | Enable scrolling in node preview and edit modes |
| 5 | Feature | **Medium** | Increase zoom range (0.1x to 4x) |
| 6 | Feature | **Medium** | Zoom-aware overview mode (titles only when zoomed out) |
| 7 | Feature | **Low** | Background sections / group nodes for story parts |
| 8 | Bug fix | **Low** | Fix node title CSS |
