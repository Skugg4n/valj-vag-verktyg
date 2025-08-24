import { BubbleMenu } from '@tiptap/react'

const EditorBubbleMenu = ({ editor }) => {
  if (!editor) {
    return null
  }

  const insertArrowLink = () => {
    const input = window.prompt('Node ID')
    if (!input) return
    const id = String(input).padStart(3, '0')
    editor.chain().focus().insertContent({ type: 'arrowLink', attrs: { id } }).run()
  }

  return (
    <BubbleMenu
      editor={editor}
      tippyOptions={{ duration: 100 }}
      className="bubble-menu"
      shouldShow={({ state }) => state.selection.from !== state.selection.to}
    >
      <button
        onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
        className={editor.isActive('heading', { level: 2 }) ? 'is-active' : ''}
      >
        Heading
      </button>
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
  )
}

export default EditorBubbleMenu
