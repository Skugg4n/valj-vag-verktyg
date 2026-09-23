import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import SceneRef from '../SceneRef.ts'
import BracketAutoClose from '../BracketAutoClose.ts'
import CustomLink from '../CustomLink.ts'

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
    // getText() renders atom nodes as empty, so assert on HTML instead:
    // no stray "]" should follow the pill.
    expect(editor.getHTML()).not.toContain('</a>]')
  })

  test('a literal ] after a pill in loaded content survives unrelated edits', () => {
    const editor = makeEditor('Se [004]] snart')
    editor.commands.focus('end')
    editor.view.dispatch(editor.state.tr.insertText(' x', editor.state.selection.from))
    // getText() renders the pill as empty, so assert on HTML instead: the
    // literal "]" right after the pill (from the loaded content) must survive.
    expect(editor.getHTML()).toContain('>[004]</a>] snart x')
    expect(editor.getHTML()).toContain('data-scene-id="004"')
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

describe('SceneRef together with CustomLink (as in DocPane)', () => {
  test('a pill stays a sceneRef node, not a link mark, across a markdown round trip', () => {
    const editor = new Editor({
      extensions: [StarterKit, Markdown, CustomLink.configure({ openOnClick: false }), SceneRef, BracketAutoClose],
      content: 'Gå till [004] nu',
    })
    const md1 = editor.storage.markdown.getMarkdown()
    expect(md1).toBe('Gå till [004] nu')
    // Simulate the graph->doc rewrite: markdown back into the editor.
    editor.commands.setContent(md1, false)
    expect(editor.getHTML()).toContain('data-scene-id="004"')
    expect(editor.getHTML()).not.toContain('](#004)')
    expect(editor.storage.markdown.getMarkdown()).toBe('Gå till [004] nu')
  })
})

describe('BracketAutoClose: typing the digits is enough', () => {
  test('[ then 0 0 4 becomes a pill without typing ]', () => {
    const editor = makeEditor('')
    editor.commands.focus('end')
    const typeChar = (ch: string) => {
      const pos = editor.state.selection.from
      editor.view.someProp('handleTextInput', f => f(editor.view, pos, pos, ch)) ||
        editor.view.dispatch(editor.state.tr.insertText(ch, pos, pos))
    }
    typeChar('[')
    typeChar('0'); typeChar('0'); typeChar('4')
    expect(editor.getHTML()).toContain('data-scene-id="004"')
    expect(editor.getHTML()).not.toContain('</a>]')
    expect(editor.storage.markdown.getMarkdown()).toBe('[004]')
  })

  test('digits inside a heading stay text', () => {
    const editor = makeEditor('## Rubrik')
    editor.commands.focus('end')
    const typeChar = (ch: string) => {
      const pos = editor.state.selection.from
      editor.view.someProp('handleTextInput', f => f(editor.view, pos, pos, ch)) ||
        editor.view.dispatch(editor.state.tr.insertText(ch, pos, pos))
    }
    typeChar(' '); typeChar('['); typeChar('0'); typeChar('0'); typeChar('5')
    expect(editor.getHTML()).not.toContain('data-scene-id')
    expect(editor.getHTML()).toContain('[005]')
  })
})
