import { render, screen, act, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import DocPane from '../DocPane.jsx'

beforeAll(() => {
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

const node = (id, title = '', text = '') => ({
  id, type: 'card', position: { x: 0, y: 0 }, width: 220, height: 120,
  data: { title, text, color: '#1f2937' },
})

const baseProps = {
  onDocChange: () => {},
  onNewScene: () => null,
  activeNodeId: null,
  onSelectNode: () => {},
  full: true,
  focusMode: false,
  setFocusMode: () => {},
}

describe('DocPane', () => {
  it('renders outline and headings from nodes', () => {
    render(<DocPane {...baseProps} nodes={[node('001', 'Första', 'Lorem'), node('002', 'Andra', 'Dolor')]} />)
    expect(screen.getAllByText('Första').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Andra').length).toBeGreaterThan(0)
    expect(screen.getAllByText('[001]').length).toBeGreaterThan(0)
  })

  it('shows "(tom)" in the outline for an empty scene', () => {
    render(<DocPane {...baseProps} nodes={[node('001', 'A', 'x [#002]'), node('002')]} />)
    expect(screen.getByText('(tom)')).toBeInTheDocument()
  })

  it('updates the editor when nodes change without calling onDocChange', async () => {
    const onDocChange = jest.fn()
    const { rerender, container } = render(
      <DocPane {...baseProps} onDocChange={onDocChange} nodes={[node('001', 'Första', 'Lorem')]} />
    )
    rerender(<DocPane {...baseProps} onDocChange={onDocChange} nodes={[node('001', 'Första', 'Lorem'), node('002', 'Ny från grafen', '')]} />)
    await waitFor(() => expect(container.querySelector('.ProseMirror').textContent).toContain('Ny från grafen'))
    await act(() => new Promise(r => setTimeout(r, 400)))
    expect(onDocChange).not.toHaveBeenCalled()
  })

  it('calls onDocChange once (debounced) with baseline ids when the user edits', async () => {
    const onDocChange = jest.fn()
    const { container } = render(
      <DocPane {...baseProps} onDocChange={onDocChange} nodes={[node('001', 'Första', 'Lorem'), node('002', 'Andra', '')]} />
    )
    const pm = container.querySelector('.ProseMirror')
    await waitFor(() => expect(pm.__tiptapEditor).toBeTruthy())
    const editor = pm.__tiptapEditor
    // Simulate typing through the ProseMirror view exposed for tests. The
    // insert point is content.size - 1 (inside the last block); content.size
    // itself is outside every block and would start a new paragraph.
    jest.useFakeTimers()
    act(() => { editor.commands.insertContentAt(editor.state.doc.content.size - 1, 'Mer text') })
    act(() => { editor.commands.insertContentAt(editor.state.doc.content.size - 1, ' och mer') })
    act(() => { jest.advanceTimersByTime(350) })
    expect(onDocChange).toHaveBeenCalledTimes(1)
    const [md, baseline] = onDocChange.mock.calls[0]
    expect(md).toContain('Mer text och mer')
    expect([...baseline]).toEqual(['001', '002'])
    jest.useRealTimers()
  })

  it('does NOT render status bar when full=false', () => {
    render(<DocPane {...baseProps} full={false} nodes={[node('001', 'Hej', 'Något')]} />)
    expect(screen.queryByText(/Sparad/)).not.toBeInTheDocument()
  })

  it('calls onSelectNode when a ref pill is clicked', async () => {
    const onSelectNode = jest.fn()
    const { container } = render(
      <DocPane {...baseProps} onSelectNode={onSelectNode} nodes={[node('001', 'Hej', 'Länk till [#002].'), node('002')]} />
    )
    await waitFor(() => expect(container.querySelector('a.node-link[href="#002"]')).toBeTruthy())
    container.querySelector('a.node-link[href="#002"]').click()
    expect(onSelectNode).toHaveBeenCalledWith('002')
  })

  it('does not steal focus when nodes change while the editor is unfocused', async () => {
    const { rerender, container } = render(<DocPane {...baseProps} nodes={[node('001', 'A', 'x')]} />)
    const pm = container.querySelector('.ProseMirror')
    await waitFor(() => expect(pm.__tiptapEditor).toBeTruthy())
    // Place the selection inside the heading so the graph->doc effect's
    // headingId path (not the pendingCursorRef path) is exercised.
    act(() => { pm.__tiptapEditor.commands.setTextSelection(2) })
    const outside = document.createElement('input')
    document.body.appendChild(outside)
    outside.focus()
    rerender(<DocPane {...baseProps} nodes={[node('001', 'A', 'x'), node('002', 'B', '')]} />)
    await waitFor(() => expect(container.querySelector('.ProseMirror').textContent).toContain('B'))
    expect(document.activeElement).toBe(outside)
    outside.remove()
  })

  it('renders with no nodes prop', () => {
    render(<DocPane {...baseProps} />)
    expect(document.querySelector('.doc-pane')).toBeTruthy()
  })
})
