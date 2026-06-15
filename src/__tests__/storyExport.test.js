import { isScene, toPublishedNodes } from '../storyExport.js'
import { makeShareId } from '../utils/shareId.js'

const node = (id, title, text, extra = {}) => ({ id, type: 'card', data: { title, text, color: '#abc', ...extra } })

describe('isScene', () => {
  it('accepts a normal card', () => { expect(isScene(node('001', 'A', 'x'))).toBe(true) })
  it('rejects idea notes (flag or idea- id) and groups', () => {
    expect(isScene(node('001', 'A', 'x', { isIdea: true }))).toBe(false)
    expect(isScene(node('idea-9', 'A', 'x'))).toBe(false)
    expect(isScene({ id: 's1', type: 'group', data: {} })).toBe(false)
  })
})

describe('toPublishedNodes', () => {
  it('keeps scenes only, in order, slim shape', () => {
    const out = toPublishedNodes([
      node('001', 'Start', 'hej [#002]'),
      node('idea-1', 'Idé', 'lös', { isIdea: true }),
      node('002', 'Två', 'där'),
    ])
    expect(out).toEqual([
      { id: '001', title: 'Start', text: 'hej [#002]', color: '#abc' },
      { id: '002', title: 'Två', text: 'där', color: '#abc' },
    ])
  })
})

describe('makeShareId', () => {
  it('is 7 url-safe chars', () => { expect(makeShareId()).toMatch(/^[a-z0-9]{7}$/) })
  it('differs between calls', () => { expect(makeShareId()).not.toBe(makeShareId()) })
})
