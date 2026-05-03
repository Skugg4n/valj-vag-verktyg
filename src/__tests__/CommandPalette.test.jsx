import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import CommandPalette from '../CommandPalette.jsx'

function makeActions(extra = {}) {
  return {
    setMode: jest.fn(),
    addNode: jest.fn(),
    newProject: jest.fn(),
    autoLayout: jest.fn(),
    addSection: jest.fn(),
    addIdea: jest.fn(),
    undo: jest.fn(),
    redo: jest.fn(),
    importProject: jest.fn(),
    exportProject: jest.fn(),
    exportMarkdown: jest.fn(),
    showHistory: jest.fn(),
    showSettings: jest.fn(),
    openHelp: jest.fn(),
    ...extra,
  }
}

describe('CommandPalette', () => {
  it('returns null when closed', () => {
    const { container } = render(
      <CommandPalette open={false} onClose={() => {}} actions={makeActions()} />
    )
    expect(container.firstChild).toBeNull()
  })

  it('renders all sections when open', () => {
    render(<CommandPalette open onClose={() => {}} actions={makeActions()} />)
    expect(screen.getByText('Lägen')).toBeInTheDocument()
    expect(screen.getByText('Skapa')).toBeInTheDocument()
    expect(screen.getByText('Verktyg')).toBeInTheDocument()
    expect(screen.getByText('Visa')).toBeInTheDocument()
  })

  it('filters by query (substring, case-insensitive)', () => {
    render(<CommandPalette open onClose={() => {}} actions={makeActions()} />)
    fireEvent.change(screen.getByPlaceholderText('Skriv ett kommando...'), {
      target: { value: 'läs' },
    })
    expect(screen.getByText('Läsa')).toBeInTheDocument()
    expect(screen.queryByText('Skiss')).not.toBeInTheDocument()
  })

  it('runs action and closes on Enter', () => {
    const actions = makeActions()
    const onClose = jest.fn()
    render(<CommandPalette open onClose={onClose} actions={actions} />)
    fireEvent.change(screen.getByPlaceholderText('Skriv ett kommando...'), {
      target: { value: 'ny nod' },
    })
    fireEvent.keyDown(screen.getByPlaceholderText('Skriv ett kommando...'), { key: 'Enter' })
    expect(actions.addNode).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('runs action and closes on click', () => {
    const actions = makeActions()
    const onClose = jest.fn()
    render(<CommandPalette open onClose={onClose} actions={actions} />)
    fireEvent.click(screen.getByText('Auto-layout'))
    expect(actions.autoLayout).toHaveBeenCalledTimes(1)
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('Esc closes', () => {
    const onClose = jest.fn()
    render(<CommandPalette open onClose={onClose} actions={makeActions()} />)
    fireEvent.keyDown(screen.getByPlaceholderText('Skriv ett kommando...'), { key: 'Escape' })
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('extraSection items appear in the list', () => {
    const extra = { title: 'Projekt', items: [{ id: 'p-1', label: 'Byt till: Foo', run: jest.fn() }] }
    render(<CommandPalette open onClose={() => {}} actions={makeActions()} extraSection={extra} />)
    expect(screen.getByText('Projekt')).toBeInTheDocument()
    expect(screen.getByText('Byt till: Foo')).toBeInTheDocument()
  })
})
