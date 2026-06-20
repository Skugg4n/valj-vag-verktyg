import { saveStatusLabel } from '../saveStatus.js'

describe('saveStatusLabel', () => {
  it('anonymous: device save is the honest message', () => {
    const r = saveStatusLabel({ isAnonymous: true, cloudState: 'saved' })
    expect(r.text).toBe('Sparat på den här enheten')
    expect(r.error).toBe(false)
  })

  it('anonymous: a failed cloud backup is surfaced, never a plain green light', () => {
    const r = saveStatusLabel({ isAnonymous: true, cloudState: 'error' })
    expect(r.error).toBe(true)
    expect(r.text).toMatch(/molnbackup misslyckades/)
  })

  it('signed in: saving / saved / error', () => {
    expect(saveStatusLabel({ isAnonymous: false, cloudState: 'saving' }).text).toBe('Sparar…')
    expect(saveStatusLabel({ isAnonymous: false, cloudState: 'saved' }).text).toBe('Sparat i ditt konto')
    const e = saveStatusLabel({ isAnonymous: false, cloudState: 'error' })
    expect(e.text).toBe('Kunde inte spara')
    expect(e.error).toBe(true)
  })

  it('idle counts as saved (localStorage save is synchronous)', () => {
    expect(saveStatusLabel({ isAnonymous: true, cloudState: 'idle' }).text).toBe('Sparat på den här enheten')
    expect(saveStatusLabel({ isAnonymous: false, cloudState: 'idle' }).text).toBe('Sparat i ditt konto')
  })
})
