import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import SceneRef from '../SceneRef.ts'
import BracketAutoClose from '../BracketAutoClose.ts'

function makeEditor(content: string) {
  return new Editor({ extensions: [StarterKit, Markdown, SceneRef, BracketAutoClose], content })
}

describe('SceneRef', () => {
  test('[004] in a paragraph becomes a pill and serialises back as [004]', () => {
    const editor = makeEditor('Gå till [004] nu')
    expect(editor.getHTML()).toContain('data-scene-id="004"')
    expect(editor.getHTML()).toContain('>[004]<')
    expect(editor.storage.markdown.getMarkdown()).toBe('Gå till [004] nu')
  })

  test('legacy [#004] is accepted and rewritten to [004]', () => {
    const editor = makeEditor('Gå till [#004]')
    expect(editor.getHTML()).toContain('data-scene-id="004"')
    expect(editor.storage.markdown.getMarkdown()).toBe('Gå till [004]')
  })

  test('[003] in a heading stays plain text', () => {
    const editor = makeEditor('## [003] Titel')
    expect(editor.getHTML()).not.toContain('data-scene-id')
    expect(editor.getHTML()).toContain('[003] Titel')
  })

  test('[12] is not a reference', () => {
    const editor = makeEditor('Se [12]')
    expect(editor.getHTML()).not.toContain('data-scene-id')
  })
})

describe('BracketAutoClose', () => {
  test('typing [ inserts [] with the cursor inside', () => {
    const editor = makeEditor('')
    editor.commands.focus('end')
    editor.view.someProp('handleTextInput', f => f(editor.view, 1, 1, '['))
    expect(editor.getText()).toBe('[]')
    expect(editor.state.selection.from).toBe(2)
  })

  test('typing ] after [004 inside [] completes a pill', () => {
    const editor = makeEditor('')
    editor.commands.focus('end')
    editor.view.someProp('handleTextInput', f => f(editor.view, 1, 1, '['))
    // Plain text insert (insertContentAt would run the markdown parser).
    editor.view.dispatch(editor.state.tr.insertText('004', 2))
    const pos = editor.state.selection.from
    editor.view.someProp('handleTextInput', f => f(editor.view, pos, pos, ']'))
    expect(editor.getHTML()).toContain('data-scene-id="004"')
    expect(editor.storage.markdown.getMarkdown()).toBe('[004]')
  })

  test('typing ] when the next char is ] just skips over it', () => {
    const editor = makeEditor('')
    editor.commands.focus('end')
    editor.view.someProp('handleTextInput', f => f(editor.view, 1, 1, '['))
    editor.view.dispatch(editor.state.tr.insertText('ab', 2))
    const pos = editor.state.selection.from
    editor.view.someProp('handleTextInput', f => f(editor.view, pos, pos, ']'))
    expect(editor.getText()).toBe('[ab]')
    expect(editor.state.selection.from).toBe(pos + 1)
  })
})
