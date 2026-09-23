import { parseManuscript, normaliseRefs, projectNameFromFile } from '../utils/manuscriptImport.ts'

const md = `# [001] Start

Bussen rullar. *[MUSIK: hemmatemat.]*

Om Alba trycker, håll upp grön tumme nu. [[002]](#002)

Om hon låter bli, håll upp röd tumme nu. [003]

## [002] Klick

VOOOMP. [#004]

# [003] Ingenting

Klick. [004]
`

describe('parseManuscript', () => {
  test('h1 and h2 headings with [NNN] become scenes; all ref spellings become [#NNN]', () => {
    const p = parseManuscript(md)
    expect(p.nodes.map(n => n.id)).toEqual(['001', '002', '003', '004'])
    expect(p.nodes[0].data.title).toBe('Start')
    expect(p.nodes[0].data.text).toContain('grön tumme nu. [#002]')
    expect(p.nodes[0].data.text).toContain('röd tumme nu. [#003]')
    expect(p.nodes[1].data.text).toBe('VOOOMP. [#004]')
    expect(p.sceneCount).toBe(3)
  })

  test('stage directions in italics are kept as text', () => {
    const p = parseManuscript(md)
    expect(p.nodes[0].data.text).toContain('*[MUSIK: hemmatemat.]*')
  })

  test('a referenced scene without a heading is created empty and reported', () => {
    const p = parseManuscript(md)
    const n4 = p.nodes.find(n => n.id === '004')!
    expect(n4.data).toMatchObject({ title: '', text: '' })
    expect(p.createdEmpty).toEqual(['004'])
    expect(p.nextNodeId).toBe(5)
  })

  test('layout: layers by distance from 001, one row per scene in a layer', () => {
    const p = parseManuscript(md)
    const pos = Object.fromEntries(p.nodes.map(n => [n.id, n.position]))
    expect(pos['001']).toEqual({ x: 0, y: 0 })
    expect(pos['002'].x).toBe(340)
    expect(pos['003'].x).toBe(340)
    expect(pos['002'].y).not.toBe(pos['003'].y)
    expect(pos['004'].x).toBe(680)
  })

  test('duplicate headings: the second becomes text of the first', () => {
    const p = parseManuscript('# [001] A\n\nx\n\n# [001] B\n\ny')
    expect(p.nodes).toHaveLength(1)
    expect(p.nodes[0].data.text).toContain('B')
    expect(p.nodes[0].data.text).toContain('y')
  })

  test('scenes unreachable from 001 land in a last column', () => {
    const p = parseManuscript('# [001] A\n\n[002]\n\n# [002] B\n\n# [009] Lös')
    const pos = Object.fromEntries(p.nodes.map(n => [n.id, n.position]))
    expect(pos['009'].x).toBeGreaterThan(pos['002'].x)
  })

  test('text before the first heading is ignored; [12] is not a reference', () => {
    const p = parseManuscript('Titelsida\n\n# [001] A\n\nSe [12] och [1234].')
    expect(p.nodes).toHaveLength(1)
    expect(p.nodes[0].data.text).toBe('Se [12] och [1234].')
  })
})

describe('helpers', () => {
  test('normaliseRefs', () => {
    expect(normaliseRefs('a [[002]](#002) b [003] c [#004] d [\\[005\\]](#005)')).toBe('a [#002] b [#003] c [#004] d [#005]')
  })
  test('projectNameFromFile', () => {
    expect(projectNameFromFile('varldshopparen_manus_v01.md')).toBe('varldshopparen manus v01')
    expect(projectNameFromFile('Racet.markdown')).toBe('Racet')
  })
})
