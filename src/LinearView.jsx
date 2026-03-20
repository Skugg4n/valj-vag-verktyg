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
      // One-way flow: editor -> setText -> parser -> nodes
      setText(editor.storage.markdown.getMarkdown())
    },
  })

  // Load text into editor when it arrives (initial load / project switch)
  const hasLoadedContent = useRef(false)
  useEffect(() => {
    if (!editor || !text || hasLoadedContent.current) return
    hasLoadedContent.current = true
    editor.commands.setContent(text)
  }, [text, editor])

  // Parse text into outline entries (lightweight, no DOM scanning)
  const outlineEntries = useMemo(() => parseLinearText(text || ''), [text])

  // Sync parser: text -> nodes (debounced inside useLinearParser)
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
