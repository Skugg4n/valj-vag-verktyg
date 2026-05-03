import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import AppShell, { clampRatio } from '../AppShell.jsx'

beforeEach(() => localStorage.clear())

function makeShell(extra = {}) {
  return (
    <AppShell
      projectName="Test"
      setProjectName={() => {}}
      isSaving={false}
      renderSkiss={() => <div data-testid="skiss-content">SKISS</div>}
      renderSplit={() => <div data-testid="split-content">SPLIT</div>}
      renderText={() => <div data-testid="text-content">TEXT</div>}
      renderRead={() => <div data-testid="read-content">READ</div>}
      onShowHistory={() => {}}
      onOpenPalette={() => {}}
      onShowSettings={() => {}}
      onShare={() => {}}
      onAvatarClick={() => {}}
      {...extra}
    />
  )
}

describe('AppShell', () => {
  it('renders split mode by default', () => {
    render(makeShell())
    expect(screen.getByTestId('split-content')).toBeInTheDocument()
  })

  it('switches mode via sidebar button', () => {
    render(makeShell())
    fireEvent.click(screen.getByLabelText('Innehåll'))
    expect(screen.getByTestId('text-content')).toBeInTheDocument()
  })

  it('switches mode via 1/2/3/4 keys outside inputs', () => {
    render(makeShell())
    fireEvent.keyDown(window, { key: '1' })
    expect(screen.getByTestId('skiss-content')).toBeInTheDocument()
    fireEvent.keyDown(window, { key: '4' })
    expect(screen.getByTestId('read-content')).toBeInTheDocument()
  })

  it('does NOT switch mode when key fires from an input', () => {
    render(makeShell())
    const input = screen.getByLabelText('Projektnamn')
    fireEvent.keyDown(input, { key: '1' })
    expect(screen.getByTestId('split-content')).toBeInTheDocument()
  })

  it('opens palette via ⌘K', () => {
    const onOpenPalette = jest.fn()
    render(makeShell({ onOpenPalette }))
    fireEvent.keyDown(window, { key: 'k', metaKey: true })
    expect(onOpenPalette).toHaveBeenCalledTimes(1)
  })

  it('persists mode to localStorage on change', () => {
    render(makeShell())
    fireEvent.click(screen.getByLabelText('Läsa'))
    expect(localStorage.getItem('vv-mode')).toBe('"read"')
  })
})

describe('clampRatio', () => {
  it('clamps below 0.2 to 0.2', () => {
    expect(clampRatio(0.05)).toBe(0.2)
  })
  it('clamps above 0.8 to 0.8', () => {
    expect(clampRatio(0.95)).toBe(0.8)
  })
  it('returns 0.42 for NaN', () => {
    expect(clampRatio(Number.NaN)).toBe(0.42)
  })
  it('passes valid values through', () => {
    expect(clampRatio(0.5)).toBe(0.5)
  })
})
