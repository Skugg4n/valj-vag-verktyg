import { copyProjects } from '../migrateProjects.js'

describe('copyProjects (anon → account migration)', () => {
  it('copies every project when all writes succeed', async () => {
    const held = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const r = await copyProjects(held, async () => {})
    expect(r).toEqual({ copied: 3, failed: 0, total: 3 })
  })

  it('counts failures instead of silently losing them', async () => {
    const held = [{ id: 'a' }, { id: 'b' }, { id: 'c' }]
    const r = await copyProjects(held, async (p) => {
      if (p.id === 'b') throw new Error('network')
    })
    expect(r.copied).toBe(2)
    expect(r.failed).toBe(1)
    expect(r.total).toBe(3)
  })

  it('handles an empty list', async () => {
    expect(await copyProjects([], async () => {})).toEqual({ copied: 0, failed: 0, total: 0 })
  })
})
