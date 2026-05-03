const PREFIX = 'vv-'

export function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(`${PREFIX}${key}`)
    if (raw == null) return fallback
    return JSON.parse(raw)
  } catch {
    return fallback
  }
}

export function saveLS(key, value) {
  try {
    localStorage.setItem(`${PREFIX}${key}`, JSON.stringify(value))
  } catch {
    /* quota exhausted or disabled — ignore */
  }
}
