import { showInWorkshopList } from '../workshopList.js'

describe('showInWorkshopList', () => {
  it('shows a story this browser created (local id)', () => {
    expect(showInWorkshopList('x', { cloud: false }, ['x'])).toBe(true)
  })

  it('shows a cloud story tagged workshop', () => {
    expect(showInWorkshopList('x', { cloud: true, app: 'workshop' }, [])).toBe(true)
  })

  it('shows an untagged cloud story (never hide a real workshop story)', () => {
    expect(showInWorkshopList('x', { cloud: true, app: null }, [])).toBe(true)
  })

  it('hides an explicitly advanced-app project', () => {
    expect(showInWorkshopList('x', { cloud: true, app: 'advanced' }, [])).toBe(false)
  })

  it('hides a purely local non-workshop project (no local id, not cloud)', () => {
    expect(showInWorkshopList('x', { cloud: false }, [])).toBe(false)
  })
})
