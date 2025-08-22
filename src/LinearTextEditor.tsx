import { useCallback } from 'react'
import { EditorContent, useEditor } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import { parseLinearText } from './useLinearParser.ts'

interface NodeData {
  id: string
  data: {
    title?: string
    text?: string
  }
}

interface Props {
  nodes: NodeData[]
  onSave: (nodes: ReturnType<typeof parseLinearText>) => void
  onClose: () => void
}

export default function LinearTextEditor({ nodes = [], onSave, onClose }: Props) {
  const initialContent = nodes
    .map(n => `#${n.id} ${n.data?.title ?? ''}\n${n.data?.text ?? ''}`)
    .join('\n\n')

  const editor = useEditor({
    extensions: [StarterKit],
    content: initialContent,
  })

  const handleSave = useCallback(() => {
    if (!editor) return
    const parsed = parseLinearText(editor.getText())
    onSave(parsed)
  }, [editor, onSave])

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
