import { parseRoute, shareUrl } from '../routing.js'

describe('parseRoute', () => {
  it('defaults to advanced app', () => { expect(parseRoute('/')).toEqual({ name: 'app' }) })
  it('routes /workshop', () => { expect(parseRoute('/workshop')).toEqual({ name: 'workshop' }) })
  it('routes /workshop/anything', () => { expect(parseRoute('/workshop/x')).toEqual({ name: 'workshop' }) })
  it('routes /spela/:id', () => { expect(parseRoute('/spela/abc123')).toEqual({ name: 'play', shareId: 'abc123' }) })
  it('ignores a trailing slash on /spela/:id', () => { expect(parseRoute('/spela/abc123/')).toEqual({ name: 'play', shareId: 'abc123' }) })
  it('unknown path → app', () => { expect(parseRoute('/whatever')).toEqual({ name: 'app' }) })
})

describe('shareUrl', () => {
  it('builds an absolute /spela link', () => {
    expect(shareUrl('abc123', 'https://x.app')).toBe('https://x.app/spela/abc123')
  })
})
