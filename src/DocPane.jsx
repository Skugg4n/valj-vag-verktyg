/* global __APP_VERSION__ */
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
  List, Link as LinkIcon, Plus, Maximize2, Code2,
} from 'lucide-react'
import CustomLink from './CustomLink.ts'
import SceneRef from './SceneRef.ts'
import BracketAutoClose from './BracketAutoClose.ts'
import ActiveNodeHighlight from './ActiveNodeHighlight.ts'
import SearchReplace from './SearchReplace.ts'
import FindBar from './FindBar.jsx'
import EditorBubbleMenu from './EditorBubbleMenu.jsx'
import { nodesToDoc, normalizeDoc, isIdeaNode } from './utils/docSync.ts'
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

/** Start/end positions for every h2, in document order, with ids.
 *  `start` is the heading node's opening boundary (position right before its
 *  content); `end` is the position at the end of its text content. */
function headingPositions(doc) {
  const out = []
  doc.descendants((node, pos) => {
    if (node.type.name === 'heading' && node.attrs.level === 2) {
      const m = node.textContent.match(HEADING_ID)
      out.push({ id: m ? m[1] : null, start: pos, end: pos + node.nodeSize - 1 })
      return false
    }
    return true
  })
  return out
}

export default function DocPane({
  nodes = [],
  onDocChange,
  onNewScene,
  activeNodeId, onSelectNode,
  full = false,
  focusMode = false,
  setFocusMode,
  isSaving = false,
}) {
  const [outlineHidden, setOutlineHidden] = useState(false)
  const [findOpen, setFindOpen] = useState(false)
  // Source mode: the whole document as raw markdown (what the nodes store),
  // for fixing things the rich editor hides. Same sync path as the editor.
  const [sourceMode, setSourceMode] = useState(false)
  const [sourceText, setSourceText] = useState('')
  const sourceTimerRef = useRef(null)
  const sourceBaselineRef = useRef('')
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
  // graph->doc write). It travels with each onDocChange so docToNodes can
  // merge per scene instead of overwriting scenes the user never touched.
  const baselineRef = useRef('')
  const debounceRef = useRef(null)
  const pendingRef = useRef(null)          // { md, baselineMarkdown } awaiting debounce
  const pendingCursorRef = useRef(null)    // scene id whose heading should get the cursor
  const [syncTick, bump] = useState(0)     // bumped to force a re-check after a flush
  const callbacksRef = useRef({ onDocChange, onNewScene, onSelectNode })
  useEffect(() => { callbacksRef.current = { onDocChange, onNewScene, onSelectNode } })

  const flushPending = useCallback(() => {
    if (debounceRef.current) { clearTimeout(debounceRef.current); debounceRef.current = null }
    const p = pendingRef.current
    pendingRef.current = null
    if (p) callbacksRef.current.onDocChange?.(p.md, p.baselineMarkdown)
  }, [])

  // Keyboard commands that need the editor: cmd+Enter (new scene) and
  // cmd+Up/Down (previous/next scene). Callbacks are read through refs so the
  // extension is created once.
  const DocKeys = useMemo(() => Extension.create({
    name: 'docKeys',
    addKeyboardShortcuts() {
      return {
        'Mod-f': () => {
          setFindOpen(true)
          return true
        },
        'Mod-Enter': ({ editor }) => {
          flushPending()
          const fromId = sceneIdAtSelection(editor.state)
          const id = callbacksRef.current.onNewScene?.(fromId)
          if (id) {
            const h = headingPositions(editor.state.doc).find(h => h.id === id)
            if (h) editor.chain().focus().setTextSelection(h.end).run()
            else pendingCursorRef.current = id
          }
          return true
        },
        'Mod-ArrowUp': ({ editor }) => {
          const hs = headingPositions(editor.state.doc)
          const pos = editor.state.selection.from
          // The previous heading is the last one whose end lies before the
          // cursor. The `- 1` margin treats a cursor one character before a
          // heading's end as still inside that heading. Cursor in body ->
          // own heading; cursor in heading -> previous heading.
          const prev = [...hs].reverse().find(h => h.end < pos - 1)
          if (!prev) return true
          editor.chain().focus().setTextSelection(prev.end).run()
          return true
        },
        'Mod-ArrowDown': ({ editor }) => {
          const hs = headingPositions(editor.state.doc)
          const pos = editor.state.selection.from
          // The next heading is the first whose opening boundary lies after
          // the cursor. The current heading's own `start` is always < pos
          // when the cursor is inside it (start is the position right
          // before the heading's content), so it never matches here -
          // fixing the bug where cmd+down from inside a heading landed on
          // that same heading's own end instead of advancing.
          const next = hs.find(h => h.start > pos)
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
      Typography.configure({
        openDoubleQuote: false, closeDoubleQuote: false,
        openSingleQuote: false, closeSingleQuote: false,
      }),
      Highlight,
      Markdown.configure({ html: false }),
      BubbleMenuExtension,
      ActiveNodeHighlight,
      SearchReplace,
      DocKeys,
    ],
    content: '',
    onUpdate({ editor }) {
      const md = editor.storage.markdown.getMarkdown()
      lastMarkdownRef.current = md
      pendingRef.current = { md, baselineMarkdown: baselineRef.current }
      if (debounceRef.current) clearTimeout(debounceRef.current)
      debounceRef.current = setTimeout(flushPending, DEBOUNCE_MS)
    },
    // Leaving the editor must not park an edit in the debounce.
    onBlur: () => flushPending(),
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
    // change re-runs this effect with fresh markdown. If the flush doesn't
    // change `nodes` (e.g. the parent ignores it), bump syncTick so this
    // effect re-evaluates on the next render instead of going silent.
    if (pendingRef.current) { flushPending(); bump(n => n + 1); return }

    const { from, to } = editor.state.selection
    const scrollTop = scrollRef.current?.scrollTop ?? 0
    const wasInHeading = editor.state.selection.$from.parent.type.name === 'heading'
    const headingId = wasInHeading ? sceneIdAtSelection(editor.state) : null
    // Remember the cursor relative to its scene, so a rewrite that inserts or
    // removes scenes above it (a new [NNN] heading, say) doesn't move it.
    const sceneId = sceneIdAtSelection(editor.state)
    const sceneStartBefore = sceneId ? headingPositions(editor.state.doc).find(h => h.id === sceneId)?.start ?? 0 : 0
    const offsetFrom = from - sceneStartBefore
    const offsetTo = to - sceneStartBefore

    editor.commands.setContent(markdown, false)
    lastMarkdownRef.current = markdown
    baselineRef.current = markdown

    const explicitTargetId = pendingCursorRef.current
    pendingCursorRef.current = null
    const max = editor.state.doc.content.size
    if (explicitTargetId) {
      // Came from an explicit action (⌘Enter / toolbar "new scene") — it's
      // fine, expected even, to move focus into the doc for this.
      const h = headingPositions(editor.state.doc).find(h => h.id === explicitTargetId)
      if (h) editor.chain().focus().setTextSelection(h.end).run()
    } else if (headingId) {
      // The cursor merely happened to be in a heading before the rewrite.
      // Restore the selection there without stealing focus if the user
      // isn't actually focused on the editor right now.
      const h = headingPositions(editor.state.doc).find(h => h.id === headingId)
      if (h && editor.isFocused) editor.commands.setTextSelection(h.end)
    } else if (editor.isFocused) {
      const hs = headingPositions(editor.state.doc)
      const idx = sceneId ? hs.findIndex(h => h.id === sceneId) : -1
      let nf = from, nt = to
      if (idx >= 0) {
        const start = hs[idx].start
        const sceneEnd = idx + 1 < hs.length ? hs[idx + 1].start - 1 : max
        nf = Math.min(start + offsetFrom, sceneEnd)
        nt = Math.min(start + offsetTo, sceneEnd)
      }
      editor.commands.setTextSelection({ from: Math.max(0, Math.min(nf, max)), to: Math.max(0, Math.min(nt, max)) })
    }
    if (scrollRef.current) scrollRef.current.scrollTop = scrollTop
  }, [editor, markdown, flushPending, syncTick])

  // Unmount (mode switch, project switch) must deliver a pending edit, not
  // drop it: flushPending clears the timer and calls onDocChange.
  useEffect(() => () => flushPending(), [flushPending])

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

  // Find bar helpers. The graph listens for the query so both views filter
  // on the same word; the active match's scene becomes the selected scene.
  const closeFind = useCallback(() => {
    setFindOpen(false)
    requestAnimationFrame(() => editor?.commands.focus())
  }, [editor])
  const broadcastQuery = useCallback((q) => {
    window.dispatchEvent(new CustomEvent('vv-doc-search', { detail: q }))
  }, [])
  const scrollToMatch = useCallback(() => {
    if (!editor) return
    const { matches, index } = editor.storage.searchReplace
    const m = matches[index]
    const container = scrollRef.current
    if (!m || !container) return
    const coords = editor.view.coordsAtPos(m.from)
    const cRect = container.getBoundingClientRect()
    container.scrollTop += coords.top - cRect.top - cRect.height / 2
    const id = sceneIdAtSelection(editor.state)
    if (id) {
      fromScrollRef.current = id
      callbacksRef.current.onSelectNode?.(id)
    }
  }, [editor])

  // Source mode helpers. Entering: flush the editor and snapshot the nodes'
  // markdown. Typing: debounce, then hand the raw markdown to the same
  // onDocChange as the rich editor (baseline = the snapshot we started from).
  const flushSource = useCallback(() => {
    if (sourceTimerRef.current) { clearTimeout(sourceTimerRef.current); sourceTimerRef.current = null }
    if (sourceText !== sourceBaselineRef.current) {
      callbacksRef.current.onDocChange?.(sourceText, sourceBaselineRef.current)
      sourceBaselineRef.current = sourceText
    }
  }, [sourceText])
  const toggleSource = useCallback(() => {
    if (sourceMode) {
      flushSource()
      setSourceMode(false)
      return
    }
    flushPending()
    setFindOpen(false)
    sourceBaselineRef.current = markdown
    setSourceText(markdown)
    setSourceMode(true)
  }, [sourceMode, flushSource, flushPending, markdown])
  const onSourceChange = useCallback((e) => {
    const v = e.target.value
    setSourceText(v)
    if (sourceTimerRef.current) clearTimeout(sourceTimerRef.current)
    sourceTimerRef.current = setTimeout(() => {
      sourceTimerRef.current = null
      if (v !== sourceBaselineRef.current) {
        callbacksRef.current.onDocChange?.(v, sourceBaselineRef.current)
        sourceBaselineRef.current = v
      }
    }, DEBOUNCE_MS)
  }, [])
  // Nodes changed from elsewhere (graph, undo) while in source mode: refresh
  // the text unless the user has unsent edits.
  useEffect(() => {
    if (!sourceMode) return
    if (sourceTimerRef.current) return
    if (normalizeDoc(markdown) !== normalizeDoc(sourceBaselineRef.current)) {
      sourceBaselineRef.current = markdown
      setSourceText(markdown)
    }
  }, [markdown, sourceMode])
  useEffect(() => () => { if (sourceTimerRef.current) clearTimeout(sourceTimerRef.current) }, [])

  const newSceneFromToolbar = () => {
    if (!editor) return
    flushPending()
    const id = onNewScene?.(sceneIdAtSelection(editor.state))
    if (id) {
      const h = headingPositions(editor.state.doc).find(h => h.id === id)
      if (h) editor.chain().focus().setTextSelection(h.end).run()
      else pendingCursorRef.current = id
    }
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
        sourceMode={sourceMode}
        onToggleSource={toggleSource}
      />

      <FindBar
        editor={editor}
        open={findOpen}
        onClose={closeFind}
        onQueryChange={broadcastQuery}
        onMatchChange={scrollToMatch}
      />

      <div className="doc-body">
        <Outline
          entries={outlineEntries}
          activeId={activeNodeId}
          hidden={outlineHidden}
          onPick={onSelectNode}
        />
        <div className="doc-scroll" ref={scrollRef}>
          {sourceMode ? (
            <textarea
              className="doc-source"
              value={sourceText}
              ref={el => { if (el) { el.style.height = 'auto'; el.style.height = `${el.scrollHeight + 4}px` } }}
              onChange={onSourceChange}
              spellCheck={false}
              aria-label="Dokumentets källtext"
            />
          ) : (
            <EditorContent editor={editor} />
          )}
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

function DocToolbar({ editor, outlineHidden, setOutlineHidden, full, focusMode, setFocusMode, onNewScene, sourceMode, onToggleSource }) {
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
          title="Fet" aria-label="Fet"
        ><Bold /></button>
        <button
          className={`tb-btn ${editor.isActive('italic') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Kursiv" aria-label="Kursiv"
        ><Italic /></button>
        <button
          className={`tb-btn ${editor.isActive('underline') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Understruken" aria-label="Understruken"
        ><UnderlineIcon /></button>
      </div>
      <div className="group">
        <button
          className={`tb-btn ${editor.isActive('bulletList') ? 'active' : ''}`}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Lista" aria-label="Lista"
        ><List /></button>
        <button
          className="tb-btn"
          onClick={() => {
            const url = window.prompt('Länk URL:')
            if (url) editor.chain().focus().setLink({ href: url }).run()
          }}
          title="Länk" aria-label="Länk"
        ><LinkIcon /></button>
      </div>
      <div className="group">
        <button className="tb-btn" onClick={onNewScene} title="Ny scen (⌘Enter)" aria-label="Ny scen">
          <Plus />
        </button>
      </div>
      <div className="group">
        <button
          className={`tb-btn ${sourceMode ? 'active' : ''}`}
          onClick={onToggleSource}
          title={sourceMode ? 'Tillbaka till formaterad text' : 'Visa källtext (markdown)'}
          aria-label="Visa källtext"
          aria-pressed={!!sourceMode}
        >
          <Code2 />
        </button>
      </div>
      <span style={{ flex: 1 }} />
      {full && (
        <button
          className={`tb-btn ${focusMode ? 'active' : ''}`}
          onClick={() => setFocusMode(f => !f)}
          title="Fokusläge" aria-label="Fokusläge"
        ><Maximize2 /></button>
      )}
    </div>
  )
}

function Outline({ entries, activeId, hidden, onPick }) {
  return (
    <aside className={`doc-outline${hidden ? ' hidden' : ''}`} aria-label="Outline" aria-hidden={hidden}>
      <div className="doc-outline-title">Outline</div>
      <ul className="doc-outline-list">
        {entries.map(e => (
          <li key={e.id}>
            <button
              className={`doc-outline-item${activeId === e.id ? ' active' : ''}`}
              onClick={() => onPick?.(e.id)}
              title={e.title || `[${e.id}]`}
            >
              <span className="id-tag">[{e.id}]</span>
              {e.title || (e.empty ? '(tom)' : '(utan titel)')}
            </button>
          </li>
        ))}
      </ul>
    </aside>
  )
}
