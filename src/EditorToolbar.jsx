// src/EditorToolbar.jsx
import {
  Bold, Italic, Underline as UnderlineIcon, Strikethrough,
  AlignLeft, AlignCenter, AlignRight,
  Heading1, Heading2, Heading3,
  List, ListOrdered, Quote, Minus,
  Undo2, Redo2, Link2, Hash
} from 'lucide-react'

function ToolbarButton({ icon: Icon, active, onClick, title, label }) {
  return (
    <button
      className={`toolbar-btn${active ? ' active' : ''}`}
      onMouseDown={e => { e.preventDefault(); onClick() }}
      title={title}
      type="button"
    >
      {Icon ? <Icon className="h-4 w-4" /> : label}
    </button>
  )
}

function ToolbarDivider() {
  return <div className="toolbar-divider" />
}

export default function EditorToolbar({ editor, onInsertNode }) {
  if (!editor) return null

  return (
    <div className="editor-toolbar">
      <div className="toolbar-group">
        <ToolbarButton icon={Undo2} onClick={() => editor.chain().focus().undo().run()} title="Ångra (Ctrl+Z)" />
        <ToolbarButton icon={Redo2} onClick={() => editor.chain().focus().redo().run()} title="Gör om (Ctrl+Shift+Z)" />
      </div>

      <ToolbarDivider />

      <div className="toolbar-group">
        <ToolbarButton
          icon={Heading1} active={editor.isActive('heading', { level: 1 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 1 }).run()}
          title="Rubrik 1 (Ctrl+Alt+1)"
        />
        <ToolbarButton
          icon={Heading2} active={editor.isActive('heading', { level: 2 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
          title="Rubrik 2 (Ctrl+Alt+2)"
        />
        <ToolbarButton
          icon={Heading3} active={editor.isActive('heading', { level: 3 })}
          onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
          title="Rubrik 3 (Ctrl+Alt+3)"
        />
      </div>

      <ToolbarDivider />

      <div className="toolbar-group">
        <ToolbarButton
          icon={Bold} active={editor.isActive('bold')}
          onClick={() => editor.chain().focus().toggleBold().run()}
          title="Fet (Ctrl+B)"
        />
        <ToolbarButton
          icon={Italic} active={editor.isActive('italic')}
          onClick={() => editor.chain().focus().toggleItalic().run()}
          title="Kursiv (Ctrl+I)"
        />
        <ToolbarButton
          icon={UnderlineIcon} active={editor.isActive('underline')}
          onClick={() => editor.chain().focus().toggleUnderline().run()}
          title="Understruken (Ctrl+U)"
        />
        <ToolbarButton
          icon={Strikethrough} active={editor.isActive('strike')}
          onClick={() => editor.chain().focus().toggleStrike().run()}
          title="Genomstruken"
        />
      </div>

      <ToolbarDivider />

      <div className="toolbar-group">
        <ToolbarButton
          icon={AlignLeft} active={editor.isActive({ textAlign: 'left' })}
          onClick={() => editor.chain().focus().setTextAlign('left').run()}
          title="Vänsterjustera"
        />
        <ToolbarButton
          icon={AlignCenter} active={editor.isActive({ textAlign: 'center' })}
          onClick={() => editor.chain().focus().setTextAlign('center').run()}
          title="Centrera"
        />
        <ToolbarButton
          icon={AlignRight} active={editor.isActive({ textAlign: 'right' })}
          onClick={() => editor.chain().focus().setTextAlign('right').run()}
          title="Högerjustera"
        />
      </div>

      <ToolbarDivider />

      <div className="toolbar-group">
        <ToolbarButton
          icon={List} active={editor.isActive('bulletList')}
          onClick={() => editor.chain().focus().toggleBulletList().run()}
          title="Punktlista"
        />
        <ToolbarButton
          icon={ListOrdered} active={editor.isActive('orderedList')}
          onClick={() => editor.chain().focus().toggleOrderedList().run()}
          title="Numrerad lista"
        />
        <ToolbarButton
          icon={Quote} active={editor.isActive('blockquote')}
          onClick={() => editor.chain().focus().toggleBlockquote().run()}
          title="Citat"
        />
        <ToolbarButton
          icon={Minus}
          onClick={() => editor.chain().focus().setHorizontalRule().run()}
          title="Horisontell linje"
        />
      </div>

      <ToolbarDivider />

      <div className="toolbar-group">
        <ToolbarButton
          icon={Hash}
          onClick={onInsertNode}
          title="Infoga ny nod"
        />
        <ToolbarButton
          icon={Link2}
          onClick={() => {
            const id = prompt('Nod-ID att länka till (t.ex. 003):')
            if (id && /^\d{3}$/.test(id)) {
              editor.chain().focus().insertContent(`[#${id}]`).run()
            }
          }}
          title="Infoga länk till nod"
        />
      </div>
    </div>
  )
}
