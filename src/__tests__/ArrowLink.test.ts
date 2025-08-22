import { Editor } from '@tiptap/core'
import StarterKit from '@tiptap/starter-kit'
import Underline from '@tiptap/extension-underline'
import { Markdown } from 'tiptap-markdown'
import CustomLink from '../CustomLink.ts'
import ArrowLink from '../ArrowLink.ts'

describe('ArrowLink markdown conversion', () => {
  test('parses and serializes arrow links and bold text', () => {
    const editor = new Editor({
      extensions: [StarterKit, Underline, CustomLink, ArrowLink, Markdown],
      content: '**bold** \u2192 [#123]',
    })

    const markdown = editor.storage.markdown.getMarkdown()
    expect(markdown).toBe('**bold** \u2192 [#123]')

    const html = editor.getHTML()
    expect(html).toContain('data-arrow-id="123"')
    expect(html).toContain('\u2192 #123')
  })
})
