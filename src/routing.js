// Tiny path router for the three entry points. No router library needed.

export function parseRoute(pathname, hostname = '') {
  const play = pathname.match(/^\/spela\/([^/]+)\/?$/)
  if (play) return { name: 'play', shareId: play[1] }
  // Dedicated workshop subdomain (e.g. verkstad.olabelin.se): everything that
  // isn't a /spela link is the workshop — so the root goes straight there.
  if (/^verkstad\./i.test(hostname)) return { name: 'workshop' }
  if (/^\/workshop(\/|$)/.test(pathname)) return { name: 'workshop' }
  return { name: 'app' }
}

export function shareUrl(shareId, origin = window.location.origin) {
  return `${origin}/spela/${shareId}`
}
