// Short, URL-friendly share slug (7 chars, base36). Math.random is fine in
// app code (only Workflow scripts forbid it).
export function makeShareId() {
  let s = ''
  while (s.length < 7) s += Math.random().toString(36).slice(2)
  return s.slice(0, 7)
}
