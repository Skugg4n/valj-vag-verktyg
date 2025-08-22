import { useCallback, useEffect, useState } from 'react'
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
      StarterKit,
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

  useEffect(() => {
    if (editor && text !== editor.storage.markdown.getMarkdown()) {
      editor.commands.setContent(text || '')
    }
  }, [text, editor])

  useLinearParser(text, setNodes)

  const insertNextNodeNumber = () => {
    if (!editor) return
    const nodeId = `#${String(nextId).padStart(3, '0')}`
    editor.chain().focus().insertContent(nodeId).run()
  }

  const setLink = useCallback(() => {
    if (!editor) return
    const prev = editor.getAttributes('link').href
    const url = window.prompt('URL', prev)
    if (url === null) return
    if (url === '') {
      editor.chain().focus().extendMarkRange('link').unsetLink().run()
      return
    }
    editor.chain().focus().extendMarkRange('link').setLink({ href: url }).run()
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
          items.push({ id: m[1], title: h.textContent.trim() })
        }
      })
      setOutline(items)
    }
    updateOutline()
    editor.on('update', updateOutline)
    return () => editor.off('update', updateOutline)
  }, [editor])

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
      <div className="max-w-7xl mx-auto bg-gray-800 rounded-2xl shadow-2xl overflow-hidden h-[90vh] flex flex-col">
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
              className="px-3 py-1.5 text-sm bg-blue-600 hover:bg-blue-500 rounded-md font-semibold"
              type="button"
              onClick={onClose}
            >
              Stäng
            </button>
          </div>
        </header>
        <div className="flex flex-1">
          <aside className="w-1/4 bg-gray-900/50 p-4 border-r border-gray-700 overflow-y-auto hidden md:block">
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
              Outline
            </h2>
            <ul className="space-y-1">
              {outline.map(item => (
                <li key={item.id}>
                  <button
                    className="block w-full text-left text-sm p-2 rounded-md text-gray-300 hover:bg-gray-700/50"
                    onClick={() => jumpTo(item.id)}
                  >
                    {item.title}
                  </button>
                </li>
              ))}
            </ul>
          </aside>
          <main className="flex-1 bg-gray-100 overflow-y-auto p-4 sm:p-8 md:p-12">
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
                  onClick={setLink}
                  className={editor.isActive('link') ? 'is-active' : ''}
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
