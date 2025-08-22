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

export function parseHtmlToNodes(html: string, prevNodes: Node[] = []): Node[] {
  const parser = new DOMParser()
  const doc = parser.parseFromString(html, 'text/html')
  const headers = Array.from(doc.querySelectorAll('h2[data-node-id]'))
  const prevMap = new Map(prevNodes.map(n => [n.id, n]))

  return headers.map((h2, index) => {
    const id = h2.getAttribute('data-node-id') || ''
    const title = (h2.textContent || '').replace(/^#\d+\s*/, '').trim()
    const paragraphs: string[] = []
    let el: Element | null = h2.nextElementSibling
    while (el && !(el.tagName.toLowerCase() === 'h2' && el.hasAttribute('data-node-id'))) {
      if (el.tagName.toLowerCase() === 'p') {
        paragraphs.push(el.textContent || '')
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
