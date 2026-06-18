// Pure, firebase-free helpers for the analytics event log.
// Everything here is pseudonymous: technical context only, never IP, names,
// e-mail, or precise fingerprints. Kept separate from track.js so it can be
// unit-tested without touching Firebase.

/* global __APP_VERSION__ */
const APP_VERSION = typeof __APP_VERSION__ !== 'undefined' ? __APP_VERSION__ : 'dev'

export function detectOS(ua = '') {
  if (/Windows/i.test(ua)) return 'Windows'
  if (/Android/i.test(ua)) return 'Android'
  if (/iPhone|iPad|iPod/i.test(ua)) return 'iOS'
  if (/Mac OS X|Macintosh/i.test(ua)) return 'macOS'
  if (/Linux/i.test(ua)) return 'Linux'
  return 'Other'
}

export function detectBrowser(ua = '') {
  if (/Edg\//i.test(ua)) return 'Edge'
  if (/OPR\/|Opera/i.test(ua)) return 'Opera'
  if (/Firefox\//i.test(ua)) return 'Firefox'
  if (/Chrome\//i.test(ua)) return 'Chrome'
  if (/Safari\//i.test(ua)) return 'Safari'
  return 'Other'
}

export function detectDeviceType(ua = '') {
  if (/iPad|Tablet/i.test(ua)) return 'tablet'
  if (/Mobi|iPhone|iPod|Android.*Mobile/i.test(ua)) return 'mobile'
  return 'desktop'
}

let _sessionId = null
export function getSessionId() {
  if (_sessionId) return _sessionId
  try {
    _sessionId = sessionStorage.getItem('vv_sid')
    if (!_sessionId) {
      _sessionId = Math.random().toString(36).slice(2, 10) + Date.now().toString(36)
      sessionStorage.setItem('vv_sid', _sessionId)
    }
  } catch {
    _sessionId = 'nostore'
  }
  return _sessionId
}

// Has this browser session already been counted as a unique view of `shareId`?
export function markViewedThisSession(shareId) {
  try {
    const key = `vv_viewed_${shareId}`
    if (sessionStorage.getItem(key)) return false
    sessionStorage.setItem(key, '1')
    return true
  } catch {
    return true
  }
}

export function getContext(view = 'unknown') {
  const ua = (typeof navigator !== 'undefined' && navigator.userAgent) || ''
  const scr = (typeof window !== 'undefined' && window.screen) || {}
  return {
    view,
    appVersion: APP_VERSION,
    browser: detectBrowser(ua),
    os: detectOS(ua),
    deviceType: detectDeviceType(ua),
    lang: (typeof navigator !== 'undefined' && navigator.language) || '',
    referrer: (typeof document !== 'undefined' && document.referrer) || '',
    screen: `${scr.width || 0}x${scr.height || 0}`,
    sessionId: getSessionId(),
  }
}

// Pure: assemble the event document body (minus serverTimestamp `ts`).
// Only the pseudonymous anonId + technical context + an event-specific payload.
export function buildEvent(type, payload, ctx, anonId) {
  return {
    type,
    anonId: anonId || '',
    ...ctx,
    payload: payload || {},
  }
}
