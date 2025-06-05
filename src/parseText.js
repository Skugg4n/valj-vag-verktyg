import { marked } from 'marked'

export function parseText(text = '') {
  const tokens = marked.lexer(text)
  let title = ''
  let foundTitle = false
  const bodyParts = []
  for (const t of tokens) {
    if (!foundTitle && t.type === 'heading') {
      title = t.text
      foundTitle = true
    } else if (t.type === 'paragraph' || t.type === 'text') {
      bodyParts.push(t.text)
    }
  }
  const body = bodyParts.join(' ').trim()
  return { title, snippet: body.slice(0, 50) }
}
