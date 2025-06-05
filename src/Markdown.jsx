import { marked } from 'marked'

export function parseHtml(text = '') {
  let html = marked.parse(text)
  html = html.replace(/\[#(\d{3})]|#(\d{3})/g, (_m, p1, p2) => {
    const id = p1 || p2
    return `<a href="#${id}">#${id}</a>`
  })
  return html
}

export default function Markdown({ children = '', className = '' }) {
  return (
    <div
      className={className}
      dangerouslySetInnerHTML={{ __html: parseHtml(children) }}
    />
  )
}
