import {
  nodesToDoc, docToNodes, normalizeDoc, sceneIdsInDoc, chooseNextSceneId,
} from '../utils/docSync.ts'

const node = (id: string, title = '', text = '', extra: any = {}) => ({
  id, type: 'card', position: { x: 0, y: 0 }, width: 220, height: 120,
  data: { title, text, color: '#1f2937' }, ...extra,
} as any)

describe('nodesToDoc', () => {
  test('sorts by id, writes [NNN] headings and rewrites [#NNN] to [NNN]', () => {
    const md = nodesToDoc([
      node('002', 'Två', 'Gå till [#001] eller [#003]'),
      node('001', 'Ett', 'Start'),
      node('003', '', ''),
    ])
    expect(md).toBe(
      '## [001] Ett\n\nStart\n\n## [002] Två\n\nGå till [001] eller [003]\n\n## [003]'
    )
  })

  test('excludes idea nodes and group nodes', () => {
    const md = nodesToDoc([
      node('001', 'Ett', ''),
      node('idea-1', 'Idé', 'x', { data: { title: 'Idé', text: 'x', isIdea: true } }),
      { id: 'section-1', type: 'group', position: { x: 0, y: 0 }, data: { label: 'S' } } as any,
    ])
    expect(md).toBe('## [001] Ett')
  })
})

describe('docToNodes', () => {
  const prev = [node('001', 'Ett', 'Start [#002]', { position: { x: 10, y: 20 } }), node('002', 'Två', 'Slut')]
  const base = new Set(['001', '002'])

  test('parses [NNN], [#NNN], escaped \\[NNN\\] and legacy #NNN headings', () => {
    const md = '## [001] Ett\n\nStart [002]\n\n## \\[002\\] Två\n\nSlut'
    const r = docToNodes(md, prev, { nextId: 3, baselineIds: base })
    expect(r.nodes.map(n => n.id)).toEqual(['001', '002'])
    expect(r.nodes[0].data.text).toBe('Start [#002]')
    expect(r.nodes[1].data.title).toBe('Två')
    const legacy = docToNodes('## #001 Ett\n\nStart \\[#002\\]', prev, { nextId: 3, baselineIds: base })
    expect(legacy.nodes[0].data.text).toBe('Start [#002]')
  })

  test('keeps position, size and colour for known ids', () => {
    const r = docToNodes('## [001] Nytt namn\n\nStart [002]\n\n## [002] Två\n\nSlut', prev, { nextId: 3, baselineIds: base })
    expect(r.nodes[0].position).toEqual({ x: 10, y: 20 })
    expect(r.nodes[0].data.title).toBe('Nytt namn')
    expect(r.changed).toBe(true)
  })

  test('ignores non-three-digit brackets', () => {
    const r = docToNodes('## [001] Ett\n\nSe [12] och [1234]', [node('001')], { nextId: 2, baselineIds: new Set(['001']) })
    expect(r.nodes).toHaveLength(1)
    expect(r.nodes[0].data.text).toBe('Se [12] och [1234]')
  })

  test('a reference to a missing scene creates an empty node placed right of its parent', () => {
    const r = docToNodes('## [001] Ett\n\nGå till [004]', [node('001', '', '', { position: { x: 100, y: 50 } })], { nextId: 2, baselineIds: new Set(['001']) })
    expect(r.nodes.map(n => n.id)).toEqual(['001', '004'])
    expect(r.createdIds).toEqual(['004'])
    expect(r.nodes[1].data).toMatchObject({ title: '', text: '' })
    expect(r.nodes[1].position).toEqual({ x: 400, y: 50 })
    expect(r.nextId).toBe(5)
  })

  test('a second missing reference from the same parent does not land on an existing child', () => {
    const prevN = [
      node('003', 'Tre', 'x [#004] [#006]', { position: { x: 0, y: 0 } }),
      node('004', 'Fyra', '', { position: { x: 300, y: 0 } }),
    ]
    const r = docToNodes('## [003] Tre\n\nx [004] [006]\n\n## [004] Fyra', prevN, {
      nextId: 7, baselineIds: new Set(['003', '004']),
    })
    const six = r.nodes.find(n => n.id === '006')
    expect(six).toBeTruthy()
    expect(six!.position).not.toEqual({ x: 300, y: 0 })
  })

  test('heading without number gets the next free id', () => {
    const r = docToNodes('## [001] Ett\n\nStart\n\n## Ny scen\n\nText', [node('001')], { nextId: 2, baselineIds: new Set(['001']) })
    expect(r.nodes.map(n => n.id)).toEqual(['001', '002'])
    expect(r.nodes[1].data.title).toBe('Ny scen')
    expect(r.nextId).toBe(3)
  })

  test('a numberless heading never steals an id used later in the document', () => {
    const r = docToNodes('## Ny\n\nx\n\n## [002] B', [node('001')], { nextId: 2, baselineIds: new Set(['001']) })
    const ids = r.nodes.map(n => n.id).sort()
    expect(ids).toContain('003')
    expect(ids).not.toContain('002x')
    const ny = r.nodes.find(n => n.data.title === 'Ny')
    expect(ny!.id).toBe('003')
  })

  test('deleting a heading merges its text upward; node survives only if referenced', () => {
    const referenced = docToNodes('## [001] Ett\n\nStart [002]\n\nSlut', prev, { nextId: 3, baselineIds: base })
    expect(referenced.nodes.map(n => n.id)).toEqual(['001', '002'])
    expect(referenced.nodes[0].data.text).toBe('Start [#002]\n\nSlut')
    expect(referenced.nodes[1].data).toMatchObject({ title: '', text: '' })

    const unreferenced = docToNodes('## [001] Ett\n\nStart\n\nSlut', prev, { nextId: 3, baselineIds: base })
    expect(unreferenced.nodes.map(n => n.id)).toEqual(['001'])
  })

  test('scenes not in the baseline are never touched (graph change during typing)', () => {
    const withNew = [...prev, node('005', 'Från grafen', 'text')]
    const r = docToNodes('## [001] Ett\n\nStart [002]\n\n## [002] Två\n\nSlut', withNew, { nextId: 6, baselineIds: base })
    expect(r.nodes.map(n => n.id)).toEqual(['001', '002', '005'])
    expect(r.nodes[2].data.title).toBe('Från grafen')
  })

  test('baselineMarkdown: an untouched scene keeps what the graph wrote', () => {
    const baselineMd = '## [001] A\n\nx'
    const prevN = [node('001', 'A', 'x [#005]')]
    const r = docToNodes(baselineMd, prevN, { nextId: 6, baselineMarkdown: baselineMd })
    expect(r.changed).toBe(false)
    expect(r.nodes[0].data.text).toBe('x [#005]')
  })

  test('baselineMarkdown: a scene the user edited takes the document text', () => {
    const baselineMd = '## [001] A\n\nx'
    const prevN = [node('001', 'A', 'x [#005]')]
    const r = docToNodes('## [001] A\n\nx y', prevN, { nextId: 6, baselineMarkdown: baselineMd })
    expect(r.changed).toBe(true)
    expect(r.nodes[0].data.text).toBe('x y')
  })

  test('baselineMarkdown: per-scene merge, only the edited scene follows the doc', () => {
    const baselineMd = '## [001] A\n\nett\n\n## [002] B\n\ntva'
    const prevN = [node('001', 'A', 'ett [#005]'), node('002', 'B', 'tva')]
    const r = docToNodes('## [001] A\n\nett\n\n## [002] B\n\ntva tre', prevN, { nextId: 6, baselineMarkdown: baselineMd })
    expect(r.nodes[0].data.text).toBe('ett [#005]')
    expect(r.nodes[1].data.text).toBe('tva tre')
  })

  test('idea nodes pass through untouched', () => {
    const idea = node('idea-1', '💡 Idé', 'x', { data: { title: '💡 Idé', text: 'x', isIdea: true } })
    const r = docToNodes('## [001] Ett', [node('001'), idea], { nextId: 2, baselineIds: new Set(['001']) })
    expect(r.nodes.map(n => n.id)).toEqual(['001', 'idea-1'])
  })

  test('round trip is stable and reports changed=false', () => {
    const md = nodesToDoc(prev)
    const r = docToNodes(md, prev, { nextId: 3, baselineIds: base })
    expect(r.changed).toBe(false)
    expect(r.nodes).toBe(prev)
  })

  test('group nodes pass through untouched and do not mark the result as changed', () => {
    const group = { id: 'section-1', type: 'group', position: { x: 0, y: 0 }, data: { label: 'S' } } as any
    const withGroup = [...prev, group]
    const r = docToNodes(nodesToDoc(withGroup), withGroup, { nextId: 3, baselineIds: base })
    expect(r.changed).toBe(false)
    expect(r.nodes).toBe(withGroup)
    const edited = docToNodes('## [001] Nytt\n\nStart [002]\n\n## [002] Två\n\nSlut', withGroup, { nextId: 3, baselineIds: base })
    expect(edited.nodes.map(n => n.id)).toEqual(['001', '002', 'section-1'])
  })
})

describe('normalizeDoc / sceneIdsInDoc', () => {
  test('normalizeDoc equalises escaping and legacy refs', () => {
    expect(normalizeDoc('## \\[001\\] A\n\nx [#002]  \n\n\n\n## [002]')).toBe(normalizeDoc('## [001] A\n\nx [002]\n\n## [002]'))
  })
  test('sceneIdsInDoc lists heading ids', () => {
    expect([...sceneIdsInDoc('## [001] A\n\n[003]\n\n## \\[002\\]')]).toEqual(['001', '002'])
  })
})

describe('chooseNextSceneId', () => {
  test('prefers the first referenced scene that has no title and no text', () => {
    const nodes = [node('003', 'T', 'x [#004] y [#009]'), node('004', '', ''), node('009', 'Har titel', '')]
    expect(chooseNextSceneId(nodes, '003', 10)).toEqual({ id: '004', exists: true, referenced: true })
  })
  test('falls back to nextId when all referenced scenes are written', () => {
    const nodes = [node('003', 'T', 'x [#004]'), node('004', 'Klar', 'text')]
    expect(chooseNextSceneId(nodes, '003', 5)).toEqual({ id: '005', exists: false, referenced: false })
  })
  test('referenced but missing node is reported as not existing', () => {
    const nodes = [node('003', 'T', 'x [#007]')]
    expect(chooseNextSceneId(nodes, '003', 4)).toEqual({ id: '007', exists: false, referenced: true })
  })
  test('no from node gives nextId', () => {
    expect(chooseNextSceneId([], null, 1)).toEqual({ id: '001', exists: false, referenced: false })
  })
})
