import type { Node } from 'reactflow'

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

export default convertNodesToHtml
