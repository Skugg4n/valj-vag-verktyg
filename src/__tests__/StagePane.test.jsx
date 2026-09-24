import { render, screen, fireEvent, act } from '@testing-library/react'
import '@testing-library/jest-dom'
import StagePane from '../StagePane.jsx'

const NODES = [
  { id: '001', data: { title: 'Start', text: 'Bussen kör över ett gupp. {Ljudeffekt: gupp} Klick. {Trumma}\n\nVälj: [#002] eller [#003]' } },
  { id: '002', data: { title: 'Vänster', text: 'Blött. [#001]' } },
  { id: '003', data: { title: 'Höger', text: 'Slut här.' } },
]

describe('StagePane', () => {
  beforeEach(() => { localStorage.clear() })

  it('shows the scene, lifts {cues} into numbered bubbles and marks their spots', () => {
    const { container } = render(<StagePane nodes={NODES} startId="001" onExit={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Start')
    const cues = container.querySelectorAll('.stage-cue')
    expect(cues).toHaveLength(2)
    expect(cues[0].textContent).toBe('1Ljudeffekt: gupp')
    expect(cues[1].textContent).toBe('2Trumma')
    const text = container.querySelector('.stage-text').textContent
    expect(text).not.toContain('{')
    expect(container.querySelectorAll('.stage-mark')).toHaveLength(2)
  })

  it('renders choices as green then red and navigates with keys and clicks', () => {
    const { container } = render(<StagePane nodes={NODES} startId="001" onExit={() => {}} />)
    const btns = container.querySelectorAll('.stage-choice')
    expect(btns[0].className).toContain('green')
    expect(btns[1].className).toContain('red')
    act(() => { fireEvent.keyDown(window, { key: '2' }) })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Höger')
    expect(container.querySelector('.stage-choice.neutral').textContent).toContain('Börja om')
    act(() => { fireEvent.keyDown(window, { key: 'Backspace' }) })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Start')
    fireEvent.click(container.querySelectorAll('.stage-choice')[0])
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Vänster')
  })

  it('Esc exits, +/- change the text scale', () => {
    const onExit = jest.fn()
    const { container } = render(<StagePane nodes={NODES} startId="001" onExit={onExit} />)
    act(() => { fireEvent.keyDown(window, { key: '+' }) })
    expect(container.querySelector('.stage').style.getPropertyValue('--stage-scale')).toBe('1.7')
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }) })
    expect(onExit).toHaveBeenCalled()
  })
})
