import { BubbleMenu } from '@tiptap/react'
import { Bold, Italic, Underline, Strikethrough, Heading2, Link2, Highlighter } from 'lucide-react'

export default function EditorBubbleMenu({ editor }) {
  if (!editor) return null

  return (
    <BubbleMenu editor={editor} tippyOptions={{ duration: 150 }}
      shouldShow={({ state }) => {
        const { from, to } = state.selection
        return from !== to
      }}
    >
      <div className="bubble-menu">
        <button
          className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Rubrik"
        >
          <Heading2 className="h-4 w-4" />
        </button>
        <button
          className={editor.isActive('bold') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Fet"
        >
          <Bold className="h-4 w-4" />
        </button>
        <button
          className={editor.isActive('italic') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Kursiv"
        >
          <Italic className="h-4 w-4" />
        </button>
        <button
          className={editor.isActive('underline') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Understruken"
        >
          <Underline className="h-4 w-4" />
        </button>
        <button
          className={editor.isActive('strike') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Genomstruken"
        >
          <Strikethrough className="h-4 w-4" />
        </button>
        <button
          className={editor.isActive('highlight') ? 'is-active' : ''}
          onClick={() => editor.chain().focus().toggleHighlight().run()}
          title="Markera"
        >
          <Highlighter className="h-4 w-4" />
        </button>
        <button
          onClick={() => {
            const id = prompt('Nod-ID (t.ex. 003):')
            if (id && /^\d{3}$/.test(id)) {
              editor.chain().focus().insertContent(`[#${id}]`).run()
            }
          }}
          title="Länk till nod"
        >
          <Link2 className="h-4 w-4" />
        </button>
      </div>
    </BubbleMenu>
  )
}
