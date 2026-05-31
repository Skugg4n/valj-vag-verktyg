import { analyzeStory, outgoing } from '../storyAnalysis.js'

// "Vakthusets Hemlighet" — the sample story from the design handoff.
// Mirrors the numbers shown in the Insikter sketch (bild 4).
const node = (id, title, text, extra = {}) => ({
  id,
  type: 'card',
  position: { x: 0, y: 0 },
  data: { title, text, color: '#1f2937', ...extra },
})

const STORY = [
  node('001', 'Stigen vid sjön', 'Dimman ligger tjock. Två stigar: längs vattnet [#002], eller upp mot byn [#003].'),
  node('002', 'Längs vattnet', 'Sjön är spegelblank. Ett rödfärgat vakthus [#004]. Eller vänd om [#001].'),
  node('003', 'Upp mot byn', 'Backen är brant. En kvinna vinkar från ett kök [#005]. Eller fortsätt förbi [#006]?'),
  node('004', 'Vakthuset', 'Dörren står på glänt. En logg från 1957. Steg bakom dig.'),
  node('005', 'Köket', 'Kvinnan heter Vera. Hon räcker dig en nyckel [#004].'),
  node('006', 'Genom byn', 'Husen tar slut. Du står vid samma stig du nyss lämnade [#001].'),
]

describe('outgoing', () => {
  it('extracts unique, valid scene references from text', () => {
    expect(outgoing(STORY[0], new Set(['001', '002', '003']))).toEqual(['002', '003'])
  })

  it('drops references to non-existent scenes when validIds given', () => {
    const n = node('001', 'X', 'go [#999] and [#002]')
    expect(outgoing(n, new Set(['002']))).toEqual(['002'])
  })

  it('matches both [#NNN] and bare #NNN', () => {
    const n = node('001', 'X', 'a [#002] b #003 c')
    expect(outgoing(n)).toEqual(['002', '003'])
  })
})

describe('analyzeStory — Vakthusets Hemlighet', () => {
  const a = analyzeStory(STORY)

  it('counts 6 scenes and 8 choices', () => {
    expect(a.sceneCount).toBe(6)
    expect(a.edgeCount).toBe(8)
  })

  it('has exactly one ending (#004, no outgoing)', () => {
    expect(a.endings).toBe(1)
    expect(a.deadEnds.map(n => n.id)).toEqual(['004'])
  })

  it('reports ~1.3 choices per scene', () => {
    expect(a.avgChoices).toBeCloseTo(8 / 6, 2)
  })

  it('finds the longest path #001 → #003 → #005 → #004', () => {
    expect(a.longest.map(n => n.id)).toEqual(['001', '003', '005', '004'])
  })

  it('detects the loop (back-edges to #001)', () => {
    expect(a.hasCycle).toBe(true)
  })

  it('has no unreachable, orphan, or empty scenes', () => {
    expect(a.unreachable).toEqual([])
    expect(a.orphans).toEqual([])
    expect(a.empty).toEqual([])
  })

  it('uses #001 as the start scene', () => {
    expect(a.startId).toBe('001')
  })

  it('counts words across all scenes', () => {
    expect(a.totalWords).toBeGreaterThan(0)
  })
})

describe('analyzeStory — edge cases', () => {
  it('excludes idea notes and group containers from scene structure', () => {
    const mixed = [
      node('001', 'Scene', 'lone scene'),
      node('idea-1', '💡 Idé', 'a loose thought', { isIdea: true }),
      { id: 'section-1', type: 'group', data: { label: 'Akt 1' } },
    ]
    const a = analyzeStory(mixed)
    expect(a.sceneCount).toBe(1)
    expect(a.ideaCount).toBe(1)
  })

  it('treats "idea-" prefixed nodes as ideas even without the flag (post-reload)', () => {
    const mixed = [
      node('001', 'Scene', 'lone scene'),
      node('idea-1717', 'Tanke', 'flaggan tappades vid omladdning'), // no isIdea flag
    ]
    const a = analyzeStory(mixed)
    expect(a.sceneCount).toBe(1)
    expect(a.ideaCount).toBe(1)
  })

  it('flags an empty scene', () => {
    const a = analyzeStory([node('001', 'Tom', '   ')])
    expect(a.empty.map(n => n.id)).toEqual(['001'])
  })

  it('flags an unreachable scene', () => {
    // #001 links nowhere; #002 is islanded → unreachable + orphan.
    const a = analyzeStory([node('001', 'A', 'slut'), node('002', 'B', 'ensam')])
    expect(a.unreachable.map(n => n.id)).toEqual(['002'])
    expect(a.orphans.map(n => n.id)).toEqual(['002'])
  })

  it('handles an empty story without throwing', () => {
    const a = analyzeStory([])
    expect(a.sceneCount).toBe(0)
    expect(a.startId).toBeNull()
    expect(a.longest).toEqual([])
  })
})
