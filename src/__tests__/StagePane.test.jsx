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

  it('shows the scene with {cues} as numbered bubbles directly under their paragraph', () => {
    const { container } = render(<StagePane nodes={NODES} startId="001" onExit={() => {}} />)
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Start')
    const blocks = container.querySelectorAll('.stage-block')
    expect(blocks).toHaveLength(2)
    const cues = blocks[0].querySelectorAll('.stage-cue')
    expect(cues).toHaveLength(2)
    expect(cues[0].textContent).toBe('1Ljudeffekt: gupp')
    expect(cues[1].textContent).toBe('2Trumma')
    expect(blocks[1].querySelectorAll('.stage-cue')).toHaveLength(0)
    expect(container.querySelector('.stage-text').textContent).not.toContain('{')
    expect(blocks[0].querySelectorAll('.stage-mark')).toHaveLength(2)
  })

  it('choices are green then red; keys G/R/1/2 and Backspace navigate; trail jumps back', () => {
    const { container } = render(<StagePane nodes={NODES} startId="001" onExit={() => {}} />)
    const btns = container.querySelectorAll('.stage-choice')
    expect(btns[0].className).toContain('green')
    expect(btns[1].className).toContain('red')
    act(() => { fireEvent.keyDown(window, { key: 'r' }) })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Höger')
    act(() => { fireEvent.keyDown(window, { key: 'Backspace' }) })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Start')
    act(() => { fireEvent.keyDown(window, { key: '1' }) })
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Vänster')
    act(() => { fireEvent.keyDown(window, { key: 'g' }) })   // Vänster -> [#001]
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Start')
    // trail: Start › Vänster › Start(current) — click the first crumb
    const crumbs = container.querySelectorAll('.stage-trail .stage-crumb:not(.current)')
    expect(crumbs).toHaveLength(2)
    fireEvent.click(crumbs[1])
    expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Vänster')
    expect(container.querySelectorAll('.stage-trail .stage-crumb:not(.current)')).toHaveLength(1)
  })

  it('a highlight wrapping a cue renders as mark + marker, never as raw tags', () => {
    const nodes = [{ id: '001', data: { title: 'A', text: '<mark>{Karaktär} Matteläraren ropar.</mark> Sen tyst.' } }]
    const { container } = render(<StagePane nodes={nodes} startId="001" onExit={() => {}} />)
    const txt = container.querySelector('.stage-text')
    expect(txt.textContent).not.toContain('<mark>')
    expect(txt.querySelector('mark .stage-mark').textContent).toBe('1')
  })

  it('reading marker is off by default; when on, click and arrows underline the current paragraph', () => {
    const { container } = render(<StagePane nodes={NODES} startId="001" onExit={() => {}} />)
    const ps = () => container.querySelectorAll('.stage-p')
    act(() => { fireEvent.keyDown(window, { key: 'ArrowDown' }) })
    expect(container.querySelectorAll('.stage-p.active')).toHaveLength(0)
    fireEvent.click(screen.getByLabelText('Läsmarkör'))
    fireEvent.click(ps()[1])
    expect(ps()[1].className).toContain('active')
    act(() => { fireEvent.keyDown(window, { key: 'ArrowUp' }) })
    expect(ps()[0].className).toContain('active')
    expect(ps()[1].className).not.toContain('active')
    fireEvent.click(screen.getByLabelText('Läsmarkör'))
    expect(container.querySelectorAll('.stage-p.active')).toHaveLength(0)
  })

  it('Esc exits, +/- change the text scale, theme toggle switches to light', () => {
    const onExit = jest.fn()
    const { container } = render(<StagePane nodes={NODES} startId="001" onExit={onExit} />)
    act(() => { fireEvent.keyDown(window, { key: '+' }) })
    expect(container.querySelector('.stage').style.getPropertyValue('--stage-scale')).toBe('1.7')
    fireEvent.click(screen.getByText('Ljus'))
    expect(container.querySelector('.stage').getAttribute('data-stage-theme')).toBe('paper')
    act(() => { fireEvent.keyDown(window, { key: 'Escape' }) })
    expect(onExit).toHaveBeenCalled()
  })
})
