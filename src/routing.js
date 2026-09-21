// Tiny path router for the three entry points. No router library needed.

export function parseRoute(pathname, hostname = '') {
  const play = pathname.match(/^\/spela\/([^/]+)\/?$/)
  if (play) return { name: 'play', shareId: play[1] }
  // Admin dashboard — reachable on any host; gated client-side to the admin uid.
  if (/^\/admin(\/|$)/.test(pathname)) return { name: 'admin' }
  // Dedicated workshop subdomain (verkstad. or verkstaden.): everything that
  // isn't a /spela link is the workshop — so the root goes straight there.
  if (/^verkstad(en)?\./i.test(hostname)) return { name: 'workshop' }
  if (/^\/workshop(\/|$)/.test(pathname)) return { name: 'workshop' }
  return { name: 'app' }
}

export function shareUrl(shareId, origin = window.location.origin) {
  return `${origin}/spela/${shareId}`
}
