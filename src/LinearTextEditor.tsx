import { useCallback } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
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
    extensions: [StarterKit],
    content,
  })

  const handleSave = useCallback(() => {
    if (!editor) return
    const html = editor.getHTML()
    const parsed = parseHtmlToNodes(html, nodes)
    setNodes(parsed)
    onClose()
  }, [editor, nodes, setNodes, onClose])

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
      </div>
      <EditorContent editor={editor} />
    </div>
  )
}
