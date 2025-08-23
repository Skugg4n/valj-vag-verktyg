import { useCallback, useEffect } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Plus } from 'lucide-react'
import type { Node } from 'reactflow'
import { parseHtmlToNodes } from './utils/linearConversion.ts'

interface Props {
  content: string
  nodes: Node[]
  setNodes: (nodes: Node[]) => void
  onClose: () => void
}

export default function LinearTextEditor({ content, nodes = [], setNodes, onClose }: Props) {
  const editor = useEditor({
    extensions: [
      StarterKit.configure({ bulletList: false, orderedList: false, listItem: false }),
      Underline,
    ],
    content,
  })

  const nextId = nodes.reduce((max, n) => Math.max(max, Number(n.id)), 0) + 1

  const insertNextNodeNumber = () => {
    if (!editor) return
    const nodeId = `#${String(nextId).padStart(3, '0')}`
    editor.chain().focus().insertContent(nodeId).run()
  }

  const handleSave = useCallback(() => {
    if (!editor) return
    const html = editor.getHTML()
    const parsed = parseHtmlToNodes(html, nodes)
    setNodes(parsed)
    onClose()
  }, [editor, nodes, setNodes, onClose])

  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 's') {
        e.preventDefault()
        handleSave()
      }
    }
    window.addEventListener('keydown', handler)
    return () => window.removeEventListener('keydown', handler)
  }, [handleSave])

  if (!editor) return null

  return (
    <div id="modal" role="dialog" aria-modal="true" className="show">
      <div id="linear-toolbar" className="mb-2">
        <button className="btn" type="button" onClick={handleSave}>
          Save
        </button>
        <button className="btn ghost" type="button" onClick={onClose}>
          Close
        </button>
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
      <EditorContent editor={editor} />
    </div>
  )
}
