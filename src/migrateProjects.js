// Copy held projects into a new account via writeFn(project). Returns counts so
// the caller can tell the user if some failed — work is never silently lost.
export async function copyProjects(held, writeFn) {
  let copied = 0
  let failed = 0
  for (const p of held) {
    try {
      await writeFn(p)
      copied += 1
    } catch {
      failed += 1
    }
  }
  return { copied, failed, total: held.length }
}
