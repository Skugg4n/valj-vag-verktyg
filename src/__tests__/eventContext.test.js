import {
  buildEvent,
  getContext,
  detectOS,
  detectBrowser,
  detectDeviceType,
} from '../eventContext.js'

describe('detect helpers', () => {
  it('detects OS', () => {
    expect(detectOS('Mozilla/5.0 (Windows NT 10.0)')).toBe('Windows')
    expect(detectOS('Mozilla/5.0 (iPhone; CPU iPhone OS 17_0)')).toBe('iOS')
    expect(detectOS('Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)')).toBe('macOS')
    expect(detectOS('Mozilla/5.0 (X11; Linux x86_64)')).toBe('Linux')
  })

  it('detects browser', () => {
    expect(detectBrowser('Chrome/120 Safari/537')).toBe('Chrome')
    expect(detectBrowser('Edg/120 Chrome/120')).toBe('Edge')
    expect(detectBrowser('Firefox/120')).toBe('Firefox')
    expect(detectBrowser('Version/17 Safari/605')).toBe('Safari')
  })

  it('detects device type', () => {
    expect(detectDeviceType('iPhone; Mobile')).toBe('mobile')
    expect(detectDeviceType('iPad; Tablet')).toBe('tablet')
    expect(detectDeviceType('Macintosh')).toBe('desktop')
  })
})

describe('buildEvent', () => {
  const ctx = {
    view: 'reader', appVersion: '1.0', browser: 'Chrome', os: 'macOS',
    deviceType: 'desktop', lang: 'sv-SE', referrer: '', screen: '1440x900',
    sessionId: 'abc123',
  }

  it('includes type, anonId, context and payload', () => {
    const e = buildEvent('read_open', { storyId: 'x1' }, ctx, 'uid123')
    expect(e.type).toBe('read_open')
    expect(e.anonId).toBe('uid123')
    expect(e.payload).toEqual({ storyId: 'x1' })
    expect(e.browser).toBe('Chrome')
    expect(e.view).toBe('reader')
  })

  it('leaks no PII fields', () => {
    const e = buildEvent('app_open', {}, ctx, 'uid')
    const keys = Object.keys(e)
    for (const banned of ['ip', 'name', 'email', 'fullName', 'fingerprint', 'address']) {
      expect(keys).not.toContain(banned)
    }
  })

  it('defaults anonId and payload safely', () => {
    const e = buildEvent('app_open', undefined, ctx, undefined)
    expect(e.anonId).toBe('')
    expect(e.payload).toEqual({})
  })
})

describe('getContext', () => {
  it('returns a pseudonymous context object with no PII keys', () => {
    const ctx = getContext('workshop')
    expect(ctx.view).toBe('workshop')
    expect(typeof ctx.sessionId).toBe('string')
    expect(typeof ctx.screen).toBe('string')
    for (const banned of ['ip', 'name', 'email']) {
      expect(Object.keys(ctx)).not.toContain(banned)
    }
  })
})
