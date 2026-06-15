// Canonical scene-reference helpers. ONE place for the [#NNN] pattern so the
// reader, the workshop editor, and publishing never drift (see CLAUDE.md
// gotcha about keeping the edge regex in sync).

// Matches a bracketed [#NNN] or a bare #NNN reference (3-digit scene id).
export const SCENE_REF = /\[#(\d{3})]|#(\d{3})/g
// Bracketed form only — used by the workshop editor's choice model.
const BRACKET_REF = /\[#(\d{3})]/g

// Unique, ordered scene ids referenced anywhere in the text.
export function refIds(text) {
  const ids = []
  const seen = new Set()
  for (const m of (text || '').matchAll(SCENE_REF)) {
    const id = m[1] || m[2]
    if (!seen.has(id)) { seen.add(id); ids.push(id) }
  }
  return ids
}

// Reader view: prose body (refs stripped + tidied) + ordered choices.
// getLabel(id) -> string resolves a target scene's display title.
export function parseScene(text, getLabel = () => '') {
  const choices = refIds(text).map(id => ({ id, label: getLabel(id) || `Gå till #${id}` }))
  const body = (text || '')
    .replace(SCENE_REF, '')
    .replace(/[ \t]+([.,!?;:…»)\]])/g, '$1') // drop space left before punctuation by a stripped ref
    .replace(/ {2,}/g, ' ')
    .replace(/[ \t]+\n/g, '\n')
    .trim()
  return { body, choices }
}

// Editor view: separate prose from the (bracketed) choice ids it ends with.
export function splitBodyAndChoices(text) {
  const ids = []
  const seen = new Set()
  for (const m of (text || '').matchAll(BRACKET_REF)) {
    if (!seen.has(m[1])) { seen.add(m[1]); ids.push(m[1]) }
  }
  const body = (text || '')
    .replace(BRACKET_REF, '')
    .replace(/[ \t]+\n/g, '\n')
    .replace(/\n{3,}/g, '\n\n')
    .trim()
  return { body, choiceIds: ids }
}

// Recombine edited prose + choice ids back into the stored scene text.
export function joinBodyAndChoices(body, choiceIds) {
  const refs = (choiceIds || []).map(id => `[#${id}]`).join(' ')
  const b = (body || '').trim()
  return refs ? (b ? `${b}\n\n${refs}` : refs) : b
}
