import { useCallback, useEffect, useRef, useState } from 'react'
import { Plus } from 'lucide-react'
import { BubbleMenu, EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Markdown } from 'tiptap-markdown'
import CustomLink from './CustomLink.ts'
import ArrowLink from './ArrowLink.ts'
import useLinearParser from './useLinearParser.ts'

export default function LinearView({ text, setText, setNodes, nextId, onClose }) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ bulletList: false, orderedList: false, listItem: false }),
      Underline,
      CustomLink.configure({ openOnClick: false }),
      ArrowLink,
      Markdown.configure({ html: false }),
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

  const insertArrowLink = useCallback(() => {
    if (!editor) return
    const input = window.prompt('Node ID')
    if (!input) return
    const id = String(input).padStart(3, '0')
    editor.chain().focus().insertContent({ type: 'arrowLink', attrs: { id } }).run()
  }, [editor])

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

  const jumpTo = id => {
    const el = document.querySelector(`h2[data-id="${id}"]`)
    el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  return (
    <div id="modal" role="dialog" aria-modal="true" className="show">
      <div className="w-full max-w-7xl mx-auto bg-gray-800 rounded-2xl shadow-2xl overflow-hidden h-[90vh] flex flex-col">
        <header className="bg-gray-900 text-white p-3 flex items-center justify-between border-b border-gray-700">
          <h1 className="text-lg font-bold">Linear View</h1>
          <div className="flex items-center gap-3">
            <button
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md"
              type="button"
              onClick={insertNextNodeNumber}
              aria-label="Next node number"
            >
              <Plus aria-hidden="true" />
            </button>
            <button
              className="px-3 py-1.5 text-sm bg-gray-700 hover:bg-gray-600 rounded-md"
              type="button"
              onClick={exportMarkdown}
            >
              Exportera
            </button>
            <button
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded-md font-semibold"
              type="button"
              onClick={onClose}
            >
              Stäng
            </button>
          </div>
        </header>
        <div className="flex flex-1">
          <aside className="hidden md:block md:w-1/4 bg-gray-900/50 p-4 border-r border-gray-700 overflow-y-auto h-full">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Outline
            </h2>
            <ul className="space-y-1">
              {outline.map(item => (
                <li key={item.id}>
                  <button
                    className={`block w-full text-left text-sm p-2 rounded-md ${
                      activeId === item.id
                        ? 'bg-gray-700 text-white'
                        : 'text-gray-300 hover:bg-gray-700/50'
                    }`}
                    onClick={() => jumpTo(item.id)}
                  >
                    #{item.id} {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <main ref={mainRef} className="flex-1 bg-gray-100 overflow-y-auto h-full p-4 sm:p-8 md:p-12 text-gray-900">
            <div className="max-w-3xl mx-auto relative">
              <BubbleMenu editor={editor} className="bubble-menu">
                <button
                  onClick={() => editor.chain().focus().toggleBold().run()}
                  className={editor.isActive('bold') ? 'is-active' : ''}
                >
                  <b>B</b>
                </button>
                <button
                  onClick={() => editor.chain().focus().toggleItalic().run()}
                  className={editor.isActive('italic') ? 'is-active' : ''}
                >
                  <i>I</i>
                </button>
                <button
                  onClick={insertArrowLink}
                  className={editor.isActive('arrowLink') ? 'is-active' : ''}
                >
                  Link
                </button>
              </BubbleMenu>
              <EditorContent id="linearEditor" editor={editor} />
            </div>
          </main>
        </div>
      </div>
    </div>
  )
}
