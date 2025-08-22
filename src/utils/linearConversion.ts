import type { Node } from 'reactflow'
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../constants.js'

function escapeHtml(str: string): string {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

export function convertNodesToHtml(nodes: Node[]): string {
  return nodes
    .map(n => {
      const title = escapeHtml(n.data?.title || '')
      const header = `<h2 data-node-id="${n.id}">#${n.id} ${title}</h2>`
      const paragraphs = (n.data?.text || '')
        .split(/\n+/)
        .filter(p => p.length > 0)
        .map(p => `<p>${escapeHtml(p)}</p>`)
        .join('')
      return `${header}${paragraphs}`
    })
    .join('')
}

export function convertNodesToLinearText(nodes: Node[]): string {
  return nodes
    .map(n => {
      const header = `#${String(n.id).padStart(3, '0')} ${n.data?.title || ''}`
      const body = (n.data?.text || '')
        .split(/\n+/)
        .map(p => p.trim())
        .filter(p => p.length > 0)
        .join('\n')
      return body ? `${header}\n\n${body}` : header
    })
    .join('\n\n')
}

export function parseHtmlToNodes(html: string, prevNodes: Node[] = []): Node[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const elements = Array.from(doc.body.children)
  const headers = elements.filter(el => {
    if (el.tagName.toLowerCase() === 'h2') return true
    const text = el.textContent || ''
    return /^#\d{3}\s/.test(text)
  })
  const prevMap = new Map(prevNodes.map(n => [n.id, n]))

  return headers.map((header, index) => {
    const textContent = header.textContent || ''
    const idMatch = textContent.match(/^#(\d{3})/)
    const id =
      header.getAttribute('data-node-id') ||
      (idMatch ? idMatch[1] : String(index + 1).padStart(3, '0'))
    const title = textContent.replace(/^#\d+\s*/, '').trim()
    const paragraphs: string[] = []
    let el: Element | null = header.nextElementSibling
    while (el) {
      const txt = el.textContent || ''
      if (el.tagName.toLowerCase() === 'h2' || /^#\d{3}\s/.test(txt)) break
      if (el.tagName.toLowerCase() === 'p') {
        if (txt.trim().length > 0) paragraphs.push(txt)
      }
      el = el.nextElementSibling
    }
    const text = paragraphs.join('\n')
    const prev = prevMap.get(id)
    if (prev) {
      return { ...prev, data: { ...prev.data, title, text } }
    }
    return {
      id,
      type: 'card',
      position: { x: 0, y: index * DEFAULT_NODE_HEIGHT },
      data: { title, text, color: '#1f2937' },
      width: DEFAULT_NODE_WIDTH,
      height: DEFAULT_NODE_HEIGHT,
    }
  })
}

export default convertNodesToHtml
