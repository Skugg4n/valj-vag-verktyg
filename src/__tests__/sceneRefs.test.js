import { refIds, parseScene, splitBodyAndChoices, joinBodyAndChoices } from '../sceneRefs.js'

describe('refIds', () => {
  it('extracts unique ordered ids from [#NNN] and #NNN', () => {
    expect(refIds('a [#002] b #003 c [#002]')).toEqual(['002', '003'])
  })
  it('empty/null safe', () => {
    expect(refIds('')).toEqual([])
    expect(refIds(null)).toEqual([])
  })
})

describe('parseScene', () => {
  const label = id => ({ '002': 'Vänster', '003': 'Höger' }[id])
  it('returns body without refs and labelled choices', () => {
    const { body, choices } = parseScene('Du ser [#002] eller [#003].', label)
    expect(body).toBe('Du ser eller.')
    expect(choices).toEqual([
      { id: '002', label: 'Vänster' },
      { id: '003', label: 'Höger' },
    ])
  })
  it('falls back to "Gå till #NNN" when no label', () => {
    const { choices } = parseScene('x [#009]', () => '')
    expect(choices).toEqual([{ id: '009', label: 'Gå till #009' }])
  })
  it('drops the space a stripped ref leaves before punctuation', () => {
    const { body } = parseScene('vattnet [#002], och byn [#003].', label)
    expect(body).toBe('vattnet, och byn.')
  })
})

describe('splitBodyAndChoices / joinBodyAndChoices', () => {
  it('round-trips body + ids', () => {
    const text = 'Brödtext här.\n\n[#002] [#003]'
    const { body, choiceIds } = splitBodyAndChoices(text)
    expect(body).toBe('Brödtext här.')
    expect(choiceIds).toEqual(['002', '003'])
    expect(joinBodyAndChoices(body, choiceIds)).toBe('Brödtext här.\n\n[#002] [#003]')
  })
  it('join with no choices is just the body', () => {
    expect(joinBodyAndChoices('Bara text', [])).toBe('Bara text')
  })
  it('split dedupes choice ids', () => {
    expect(splitBodyAndChoices('a [#002] b [#002]').choiceIds).toEqual(['002'])
  })
  it('join with empty body but choices yields only refs', () => {
    expect(joinBodyAndChoices('', ['002'])).toBe('[#002]')
  })
})
