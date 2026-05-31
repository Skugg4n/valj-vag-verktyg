import { buildReaderHTML } from '../utils/buildReaderHTML.js'

const node = (id, title, text, extra = {}) => ({
  id,
  type: 'card',
  data: { title, text, color: '#1f2937', ...extra },
})

const NODES = [
  node('002', 'Andra', 'mitten [#003]'),
  node('001', 'Första', 'start [#002]'),
  node('003', 'Slut', 'klart.'),
  node('idea-1', '💡 Idé', 'lös tanke', { isIdea: true }),
]

describe('buildReaderHTML', () => {
  const html = buildReaderHTML(NODES, 'Min Berättelse')

  it('produces a standalone HTML document', () => {
    expect(html.startsWith('<!doctype html>')).toBe(true)
    expect(html).toContain('</html>')
  })

  it('embeds the project title', () => {
    expect(html).toContain('<title>Min Berättelse</title>')
  })

  it('orders scenes by id so #001 is first (chapter 01)', () => {
    const idx1 = html.indexOf('"id":"001"')
    const idx2 = html.indexOf('"id":"002"')
    expect(idx1).toBeGreaterThan(-1)
    expect(idx1).toBeLessThan(idx2)
  })

  it('excludes idea notes from the playable story', () => {
    expect(html).not.toContain('lös tanke')
    expect(html).not.toContain('idea-1')
  })

  it('includes the reference-walking runtime', () => {
    expect(html).toContain('const STORY=')
    expect(html).toContain('data-go')
  })

  it('escapes the title to avoid breaking the document', () => {
    const evil = buildReaderHTML([node('001', 'A', 'x')], '<script>boom')
    expect(evil).toContain('<title>&lt;script>boom</title>')
  })
})
