import { marked } from 'marked'

export function parseText(text = '') {
  const tokens = marked.lexer(text)
  const bodyParts = []
  for (const t of tokens) {
    if (t.type === 'paragraph' || t.type === 'text') {
      bodyParts.push(t.text)
    }
  }
  const snippet = bodyParts.join(' ').trim().slice(0, 50)
  return { snippet }
}
