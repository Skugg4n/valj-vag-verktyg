// Tiny path router for the three entry points. No router library needed.

export function parseRoute(pathname) {
  const play = pathname.match(/^\/spela\/([^/]+)\/?$/)
  if (play) return { name: 'play', shareId: play[1] }
  if (/^\/workshop(\/|$)/.test(pathname)) return { name: 'workshop' }
  return { name: 'app' }
}

export function shareUrl(shareId, origin = window.location.origin) {
  return `${origin}/spela/${shareId}`
}
