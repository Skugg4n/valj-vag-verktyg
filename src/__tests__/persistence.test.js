import { loadLS, saveLS } from '../utils/persistence.js'

describe('persistence', () => {
  beforeEach(() => localStorage.clear())

  it('returns fallback when key absent', () => {
    expect(loadLS('mode', 'split')).toBe('split')
  })

  it('roundtrips a string value', () => {
    saveLS('mode', 'text')
    expect(loadLS('mode', 'split')).toBe('text')
  })

  it('roundtrips a number value', () => {
    saveLS('split-ratio', 0.42)
    expect(loadLS('split-ratio', 0.5)).toBe(0.42)
  })

  it('returns fallback on malformed JSON', () => {
    localStorage.setItem('vv-mode', 'not-json{')
    expect(loadLS('mode', 'split')).toBe('split')
  })

  it('namespaces with vv- prefix', () => {
    saveLS('foo', 'bar')
    expect(localStorage.getItem('vv-foo')).toBe('"bar"')
  })
})
