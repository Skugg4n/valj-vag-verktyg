import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Markdown } from 'tiptap-markdown'
import CustomLink from './CustomLink.ts'
import ArrowLink from './ArrowLink.ts'
import BubbleMenuExtension from '@tiptap/extension-bubble-menu'
import EditorBubbleMenu from './EditorBubbleMenu.jsx'
import useLinearParser from './useLinearParser.ts'
import 'tippy.js/dist/tippy.css'
import { Extension } from '@tiptap/core'

const KeyboardShortcuts = Extension.create({
  name: 'keyboardShortcuts',
  addKeyboardShortcuts() {
    return {
      'Mod-k': () => {
        console.log('Skapa länk-genväg aktiverad!')
        return true
      },
    }
  },
})

export default function LinearView({ isOpen, text, setText, setNodes, nextId, onClose }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ bulletList: false, orderedList: false, listItem: false }),
      Underline,
      CustomLink.configure({ openOnClick: false }),
      ArrowLink,
      Markdown.configure({ html: false }),
      BubbleMenuExtension,
      KeyboardShortcuts,
    ],
    content: text || '',
    onUpdate({ editor }) {
      setText(editor.storage.markdown.getMarkdown())
    },
  })

  const [outline, setOutline] = useState([])
  const [next, setNext] = useState(nextId)
  const [activeId, setActiveId] = useState(null)
  const mainRef = useRef(null)

  useEffect(() => {
    if (editor && text !== editor.storage.markdown.getMarkdown()) {
      editor.commands.setContent(text || '')
    }
  }, [text, editor])

  useLinearParser(text, setNodes)

  useEffect(() => {
    setNext(nextId)
  }, [nextId])

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

  const insertNextNodeNumber = () => {
    if (!editor) return
    const nodeId = `#${String(next).padStart(3, '0')}`
    editor.chain().focus().insertContent(nodeId).run()
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

  useEffect(() => {
    if (!editor) return
    const updateOutline = () => {
      const el = document.getElementById('linearEditor')
      if (!el) return
      const items = []
        el.querySelectorAll('h2').forEach(h => {
          const m = h.textContent.match(/^#(\d{3})(.*)$/)
          if (m) {
            h.dataset.id = m[1]
            h.id = m[1]
            // store the title without the numeric id so we can format it separately
            items.push({ id: m[1], title: m[2].trim() })
          }
        })
      setOutline(items)
    }
    updateOutline()
    editor.on('update', updateOutline)
    return () => editor.off('update', updateOutline)
  }, [editor])

  const jumpTo = useCallback(id => {
    if (!editor) return

    let targetPos = null
    const targetIdString = `#${id}`

    editor.state.doc.descendants((node, pos) => {
      if (
        node.type.name === 'heading' &&
        node.textContent.startsWith(targetIdString)
      ) {
        targetPos = pos
        return false
      }
    })

    if (targetPos !== null) {
      editor
        .chain()
        .focus()
        .setTextSelection(targetPos)
        .scrollIntoView()
        .run()
      setActiveId(id)
    }
  }, [editor])

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

  useEffect(() => {
    const container = mainRef.current
    if (!container) return
    const handleScroll = () => {
      const headings = Array.from(
        document.querySelectorAll('#linearEditor h2')
      )
      const top = container.getBoundingClientRect().top
      let current = null
      headings.forEach(h => {
        const rect = h.getBoundingClientRect()
        if (rect.top - top <= 10) {
          current = h.dataset.id || current
        }
      })
      setActiveId(current)
    }
    container.addEventListener('scroll', handleScroll)
    handleScroll()
    return () => container.removeEventListener('scroll', handleScroll)
  }, [outline])

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
    <div
      className="fixed top-0 right-0 h-full w-4/5 bg-gray-800 linear-container shadow-2xl transform transition-transform duration-300 ease-in-out z-[70] flex flex-col"
      style={{ transform: isOpen ? 'translateX(0)' : 'translateX(100%)' }}
    >
      <header className="linear-header p-3 flex items-center justify-between border-b">
        <h1 className="text-lg font-bold">Linear View</h1>
        <div className="flex items-center gap-3">
          <button
            className="btn"
            type="button"
            onClick={insertNextNodeNumber}
            aria-label="Next node number"
          >
            <Plus aria-hidden="true" />
          </button>
          <button className="btn" type="button" onClick={exportMarkdown}>
            Exportera
          </button>
          <button className="btn primary" type="button" onClick={onClose}>
            Stäng
          </button>
        </div>
      </header>
      <div className="flex flex-1 min-h-0">
        <aside className="hidden md:flex md:flex-col md:w-1/4 linear-sidebar h-full min-h-0">
          <div className="flex-1 overflow-y-auto p-4 no-scrollbar">
            <h2 className="text-sm font-semibold text-dim uppercase tracking-wider mb-4">
              Outline
            </h2>
            <ul className="space-y-1">
              {outline.map(item => (
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
          <footer className="p-4 border-t linear-footer">
            <h3 className="text-xs font-semibold text-dim uppercase mb-2">Shortcuts</h3>
            <div className="text-xs text-dim space-y-1">
              <p>
                <span className="font-mono shortcut-key">Cmd/Ctrl + B</span>: Bold
              </p>
              <p>
                <span className="font-mono shortcut-key">Cmd/Ctrl + I</span>: Italic
              </p>
              <p>
                <span className="font-mono shortcut-key">Cmd/Ctrl + Opt + 2</span>: Heading
              </p>
            </div>
          </footer>
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
