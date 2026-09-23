import { renderHook, act } from '@testing-library/react'
import { resolveTheme, useTheme } from '../theme.js'

describe('resolveTheme', () => {
  test('explicit choice wins', () => {
    expect(resolveTheme('light', true)).toBe('light')
    expect(resolveTheme('dark', false)).toBe('dark')
  })
  test('system follows the OS', () => {
    expect(resolveTheme('system', true)).toBe('dark')
    expect(resolveTheme('system', false)).toBe('light')
    expect(resolveTheme('nonsense', false)).toBe('light')
  })
})

describe('useTheme', () => {
  let listeners
  beforeEach(() => {
    localStorage.clear()
    listeners = []
    window.matchMedia = jest.fn().mockImplementation(() => ({
      matches: true,
      addEventListener: (_t, fn) => listeners.push(fn),
      removeEventListener: (_t, fn) => { listeners = listeners.filter(l => l !== fn) },
    }))
  })

  test('defaults to system (dark here) and stamps data-theme', () => {
    const { result } = renderHook(() => useTheme())
    expect(result.current.pref).toBe('system')
    expect(result.current.resolved).toBe('dark')
    expect(document.documentElement.getAttribute('data-theme')).toBe('dark')
  })

  test('toggle pins the opposite of what is shown and persists', () => {
    const { result } = renderHook(() => useTheme())
    act(() => result.current.toggle())
    expect(result.current.pref).toBe('light')
    expect(result.current.resolved).toBe('light')
    expect(document.documentElement.getAttribute('data-theme')).toBe('light')
    expect(JSON.parse(localStorage.getItem('vv-theme'))).toBe('light')
  })

  test('system pref reacts to OS changes', () => {
    const { result } = renderHook(() => useTheme())
    act(() => listeners.forEach(fn => fn({ matches: false })))
    expect(result.current.resolved).toBe('light')
  })

  test('a stored preference is honoured', () => {
    localStorage.setItem('vv-theme', JSON.stringify('light'))
    const { result } = renderHook(() => useTheme())
    expect(result.current.resolved).toBe('light')
  })
})
