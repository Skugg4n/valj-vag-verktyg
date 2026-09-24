// Stage cues: anything written in {curly braces} in a scene is an instruction
// for the musician/actor, not for the audience. The stage view lifts them out
// as numbered bubbles; the public reader drops them.

const CUE_RE = /\{([^{}]*)\}/g

/**
 * Split cues out of a body text.
 * Returns { text, cues } where `text` has each cue replaced by a marker
 * "\uE000N\uE000" (N = 1-based cue number) and `cues` is the list of texts.
 */
export function extractCues(body) {
  const cues = []
  const text = (body || '').replace(CUE_RE, (_m, inner) => {
    const t = inner.trim()
    if (!t) return ''
    cues.push(t)
    return `\uE000${cues.length}\uE000`
  })
  return { text: text.replace(/[ \t]+([.,!?;:])/g, '$1').replace(/ {2,}/g, ' '), cues }
}

/** Remove cues entirely (public reader, card previews). */
export function stripCues(body) {
  return (body || '')
    .replace(CUE_RE, '')
    .replace(/[ \t]+([.,!?;:])/g, '$1')
    .replace(/ {2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
}

/** Split a marker-bearing paragraph into text parts and cue markers. */
export function splitMarkers(text) {
  return (text || '').split(/(\uE000\d+\uE000)/).filter(Boolean).map(part => {
    const m = part.match(/^\uE000(\d+)\uE000$/)
    return m ? { cue: Number(m[1]) } : { text: part }
  })
}
