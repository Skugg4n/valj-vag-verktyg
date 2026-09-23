import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import { Markdown } from 'tiptap-markdown'
import SearchReplace from '../SearchReplace.ts'
import SceneRef from '../SceneRef.ts'

function makeEditor(content: string) {
  return new Editor({ extensions: [StarterKit, Markdown, SceneRef, SearchReplace], content })
}

describe('SearchReplace', () => {
  test('counts matches case-insensitively across paragraphs and headings', () => {
    const editor = makeEditor('## [001] Hästtjejen\n\nhästtjejen pekar. Hästtjejen igen. [002]')
    editor.commands.setSearchTerm('hästtjejen')
    expect(editor.storage.searchReplace.matches).toHaveLength(3)
    expect(editor.storage.searchReplace.index).toBe(0)
    expect(editor.getHTML()).toContain('[001]')
  })

  test('next and prev wrap around and select the match', () => {
    const editor = makeEditor('a b a b a')
    editor.commands.setSearchTerm('a')
    editor.commands.nextMatch()
    expect(editor.storage.searchReplace.index).toBe(1)
    editor.commands.nextMatch(); editor.commands.nextMatch()
    expect(editor.storage.searchReplace.index).toBe(0)
    editor.commands.prevMatch()
    expect(editor.storage.searchReplace.index).toBe(2)
    const { from, to } = editor.state.selection
    expect(editor.state.doc.textBetween(from, to)).toBe('a')
  })

  test('replaceCurrent replaces only the active match and keeps counting', () => {
    const editor = makeEditor('katt och katt')
    editor.commands.setSearchTerm('katt')
    editor.commands.replaceCurrent('hund')
    expect(editor.getText()).toBe('hund och katt')
    expect(editor.storage.searchReplace.matches).toHaveLength(1)
  })

  test('replaceAll replaces every match, pills untouched', () => {
    const editor = makeEditor('katt [002] katt\n\nkatt')
    editor.commands.setSearchTerm('katt')
    editor.commands.replaceAll('hund')
    expect(editor.storage.markdown.getMarkdown()).toBe('hund [002] hund\n\nhund')
    expect(editor.storage.searchReplace.matches).toHaveLength(0)
  })

  test('matches follow edits and clearSearch removes them', () => {
    const editor = makeEditor('x')
    editor.commands.setSearchTerm('x')
    editor.view.dispatch(editor.state.tr.insertText(' x', editor.state.doc.content.size - 1))
    expect(editor.storage.searchReplace.matches).toHaveLength(2)
    editor.commands.clearSearch()
    expect(editor.storage.searchReplace.matches).toHaveLength(0)
  })
})
