import { parseHtmlToNodes } from '../utils/linearConversion.ts'
import { DEFAULT_NODE_WIDTH, DEFAULT_NODE_HEIGHT } from '../constants.js'
import type { Node } from 'reactflow'

describe('parseHtmlToNodes', () => {
  test('parses html and preserves existing nodes', () => {
    const html = `\
<h2 data-node-id="001">#001 Start</h2>
<p>First line</p>
<h2 data-node-id="002">#002 Next</h2>
<p>Second</p>`
    const prev: Node[] = [{
      id: '001',
      type: 'card',
      position: { x: 5, y: 10 },
      data: { title: 'Old', text: 'Old text', color: '#000' },
      width: 111,
      height: 222,
    } as any]
    const nodes = parseHtmlToNodes(html, prev)
    expect(nodes).toHaveLength(2)
    expect(nodes[0].position).toEqual({ x: 5, y: 10 })
    expect(nodes[0].data.title).toBe('Start')
    expect(nodes[0].data.text).toBe('First line')
    expect(nodes[0].width).toBe(111)
    expect(nodes[1].id).toBe('002')
    expect(nodes[1].data.title).toBe('Next')
    expect(nodes[1].data.text).toBe('Second')
    expect(nodes[1].width).toBe(DEFAULT_NODE_WIDTH)
    expect(nodes[1].position).toEqual({ x: 0, y: DEFAULT_NODE_HEIGHT })
  })

  test('parses headings without data-node-id attribute', () => {
    const html = `<h2>#001 Alpha</h2><p>A</p><h2>#002 Beta</h2><p>B</p>`
    const nodes = parseHtmlToNodes(html)
    expect(nodes).toHaveLength(2)
    expect(nodes[0].id).toBe('001')
    expect(nodes[0].data.title).toBe('Alpha')
    expect(nodes[0].data.text).toBe('A')
    expect(nodes[1].id).toBe('002')
    expect(nodes[1].data.title).toBe('Beta')
    expect(nodes[1].data.text).toBe('B')
  })

  test('parses plain paragraphs that start with ids', () => {
    const html = `<p>#001 Start</p><p>First line</p><p>#002 Next</p><p>Second line</p>`
    const nodes = parseHtmlToNodes(html)
    expect(nodes).toHaveLength(2)
    expect(nodes[0].id).toBe('001')
    expect(nodes[0].data.title).toBe('Start')
    expect(nodes[0].data.text).toBe('First line')
    expect(nodes[1].id).toBe('002')
    expect(nodes[1].data.title).toBe('Next')
    expect(nodes[1].data.text).toBe('Second line')
  })
})
