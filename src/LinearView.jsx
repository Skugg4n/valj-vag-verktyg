import { useEffect } from 'react'
import { Plus } from 'lucide-react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import Link from '@tiptap/extension-link'
import { Markdown } from 'tiptap-markdown'
import useLinearParser from './useLinearParser.js'

function preprocess(md = '') {
  return md.replace(/\[#(\d{3})]/g, '[#$1](#$1)')
}

function postprocess(md = '') {
  return md.replace(/\[#(\d{3})\]\(#\1\)/g, '[#$1]')
}

export default function LinearView({ text, setText, setNodes, nextId, onClose }) {
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

  const insertNextNodeNumber = () => {
    if (!editor) return
    const nodeId = `#${String(nextId).padStart(3, '0')}`
    editor.chain().focus().insertContent(nodeId).run()
  }

  useEffect(() => {
    if (!editor) return
    const updateIds = () => {
      const el = document.getElementById('linearEditor')
      if (!el) return
      el.querySelectorAll('h2').forEach(h => {
        const m = h.textContent.match(/^#(\d{3})/)
        if (m) h.dataset.id = m[1]
      })
    }
    updateIds()
    editor.on('update', updateIds)
    return () => editor.off('update', updateIds)
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

  return (
    <div id="modal" role="dialog" aria-modal="true" className="show">
      <div id="linear-toolbar">
        <button
          className="btn ghost"
          type="button"
          onClick={() => editor.chain().focus().toggleBold().run()}
        >
          B
        </button>
        <button
          className="btn ghost"
          type="button"
          onClick={() => editor.chain().focus().toggleItalic().run()}
        >
          I
        </button>
        <button
          className="btn ghost"
          type="button"
          onClick={() => editor.chain().focus().toggleUnderline().run()}
        >
          U
        </button>
        <button
          className="btn ghost"
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
        >
          H1
        </button>
        <button
          className="btn ghost"
          type="button"
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        >
          H2
        </button>
        <button
          className="btn ghost"
          type="button"
          onClick={insertNextNodeNumber}
          aria-label="Next node number"
        >
          <Plus aria-hidden="true" />
        </button>
      </div>
      <button
        className="btn ghost"
        id="closeModal"
        aria-label="Close linear view"
        onClick={onClose}
      >
        Close
      </button>
      <EditorContent id="linearEditor" editor={editor} />
    </div>
  )
}
