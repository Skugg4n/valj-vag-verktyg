import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
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
  text, setText, setNodes, nextId,
  activeNodeId, onSelectNode,
  full = false,
  focusMode = false,
  setFocusMode,
  isSaving = false,
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

  // Initial content load — runs exactly once per editor instance
  const hasLoaded = useRef(false)
  useEffect(() => {
    if (!editor || !text || hasLoaded.current) return
    hasLoaded.current = true
    editor.commands.setContent(text, false)
  }, [text, editor])

  // Sync parser: text -> nodes (debounced inside useLinearParser)
  useLinearParser(text, setNodes)

  // Outline: parsed from current text
  const outlineEntries = useMemo(() => parseLinearText(text || ''), [text])

  // Tag every rendered <h2> with data-node-id="NNN" from its "#NNN" text.
  // Returns the heading matching `wantId` (if any). ProseMirror regenerates
  // heading DOM on its own schedule and wipes external attributes, and the
  // initial setContent uses emitUpdate=false, so we (re)tag on demand right
  // before we need it rather than trusting a persisted attribute.
  const tagHeadings = useCallback((wantId) => {
    const container = scrollRef.current
    if (!container) return null
    let match = null
    container.querySelectorAll('h2').forEach(h => {
      const m = (h.textContent || '').match(/^#(\d{3})/)
      if (!m) return
      if (h.getAttribute('data-node-id') !== m[1]) h.setAttribute('data-node-id', m[1])
      if (wantId && m[1] === wantId) match = h
    })
    return match
  }, [])

  // Graph -> Doc: when activeNodeId changes from outside (e.g. clicking a node
  // in the graph), scroll to that scene's heading. Self-contained: it (re)tags
  // every heading by its "#NNN" text and finds the target by id at click time,
  // when the DOM is guaranteed rendered — so it doesn't depend on the async
  // tagging effect having already run. Manual DOM scroll because ProseMirror's
  // scrollIntoView doesn't line up with the top of the scroll container.
  useEffect(() => {
    if (!activeNodeId) return
    const container = scrollRef.current
    if (!container) return
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
  // ArrowLink.ts renders: <a class="node-link" href="#NNN"> — match that contract.
  useEffect(() => {
    const container = scrollRef.current
    if (!container) return
    const onClick = (e) => {
      const a = e.target.closest('a.node-link')
      if (!a) return
      const href = a.getAttribute('href') || ''
      const m = href.match(/^#(\d{3})$/)
      if (m) {
        e.preventDefault()
        onSelectNode?.(m[1])
      }
    }
    container.addEventListener('click', onClick)
    return () => container.removeEventListener('click', onClick)
  }, [onSelectNode])

  // Status: word count — use TipTap's CharacterCount API so markdown syntax
  // tokens don't inflate the count.
  const wordCount = editor?.storage.characterCount?.words?.() ?? 0
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
          <span className="saved">{isSaving ? '● Sparar…' : '● Sparad'}</span>
          <span style={{ flex: 1 }} />
          <span>v{__APP_VERSION__}</span>
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
        <button className="tb-btn" onClick={insertNewSection} title="Ny nod" aria-label="Ny nod">
          <Plus />
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
