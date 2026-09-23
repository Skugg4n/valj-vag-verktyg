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

  it('escapes </script> inside scene text so the embedded script cannot break out', () => {
    const html = buildReaderHTML([node('001', 'A', 'evil </script> payload')], 'Test')
    // The raw closing tag must not appear inside the embedded data...
    expect(html).not.toContain('evil </script> payload')
    // ...it is encoded as < so the JS parser still reads it back.
    expect(html).toContain('\\u003c/script>')
  })
})

describe('embedded runtime: paragraphs and inline markdown', () => {
  // Pull the pure helpers out of the generated script and run them here.
  function helpers(html) {
    const src = html.match(/<script>([\s\S]*?)function render\(\)/)[1]
    const escSrc = html.match(/function esc\(s\)\{[^\n]*\}/)[0]
    // eslint-disable-next-line no-new-func
    return new Function(src + '\n' + escSrc + '\nreturn { clean, paras, inline }')()
  }
  const html = buildReaderHTML([node('001', 'A', 'x')], 'T')
  const { paras, inline } = helpers(html)

  it('keeps blank-line paragraphs and single line breaks', () => {
    const ps = paras('Alba petar där sladdarna satt. "Inte bra.\nInte bra", muttrar hon.\n\nMen allt är normalt. [#002]')
    expect(ps).toEqual(['Alba petar där sladdarna satt. "Inte bra.\nInte bra", muttrar hon.', 'Men allt är normalt.'])
    expect(inline(ps[0])).toContain('"Inte bra.<br>Inte bra", muttrar hon.')
  })

  it('does not split a long paragraph into sentence pairs', () => {
    expect(paras('En. Två. Tre. Fyra. Fem.')).toEqual(['En. Två. Tre. Fyra. Fem.'])
  })

  it('renders italics and bold, unescapes brackets, handles backslash breaks', () => {
    const ps = paras('*\\[MUSIK: tema\\]* och **fet**\\\nrad två')
    expect(ps).toEqual(['*[MUSIK: tema]* och **fet**\nrad två'])
    expect(inline(ps[0])).toBe('<em>[MUSIK: tema]</em> och <strong>fet</strong><br>rad två')
  })
})
