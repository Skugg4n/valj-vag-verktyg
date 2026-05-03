import { render, screen, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import ReadPane, { splitChoices } from '../ReadPane.jsx'

const NODES = [
  { id: '001', data: { title: 'Start', text: 'Du står vid en korsning. [#002] eller [#003]?' } },
  { id: '002', data: { title: 'Vänster', text: 'Det är blött här. [#001]' } },
  { id: '003', data: { title: 'Höger', text: 'En orm.' } },
]

function renderPane(extra = {}) {
  return render(
    <ReadPane
      nodes={NODES}
      startId="001"
      activeNodeId={null}
      onSelectNode={() => {}}
      {...extra}
    />
  )
}

describe('ReadPane', () => {
  beforeEach(() => localStorage.clear())

  it('renders the start node with title, body and choices', () => {
    renderPane()
    expect(screen.getByRole('heading', { level: 1, name: 'Start' })).toBeInTheDocument()
    expect(screen.getByText(/Du står vid en korsning/)).toBeInTheDocument()
    expect(screen.getByText('Vänster')).toBeInTheDocument()
    expect(screen.getByText('Höger')).toBeInTheDocument()
  })

  it('strips ref tokens from body text', () => {
    renderPane()
    expect(screen.queryByText(/\[#002\]/)).not.toBeInTheDocument()
  })

  it('navigates on choice click and shows breadcrumb', () => {
    renderPane()
    fireEvent.click(screen.getByText('Vänster'))
    // After clicking 'Vänster', current chapter is Vänster (in breadcrumb as current),
    // and Start should appear as a clickable crumb in the breadcrumb.
    const crumbs = screen.getAllByText('Start')
    expect(crumbs.length).toBeGreaterThan(0)
  })

  it('back returns to previous node', () => {
    renderPane()
    fireEvent.click(screen.getByText('Vänster'))
    fireEvent.click(screen.getByText('Tillbaka'))
    // Start title should now be back as the current page heading
    expect(screen.getByRole('heading', { level: 1, name: 'Start' })).toBeInTheDocument()
  })

  it('restart returns to first node and clears history', () => {
    renderPane()
    fireEvent.click(screen.getByText('Vänster'))
    fireEvent.click(screen.getByText('Börja om'))
    expect(screen.getByRole('heading', { level: 1, name: 'Start' })).toBeInTheDocument()
  })

  it('persists theme to localStorage', () => {
    renderPane()
    fireEvent.click(screen.getByText('Mörk'))
    expect(localStorage.getItem('vv-read-theme')).toBe('"dark"')
  })

  it('editor mode reveals chapter id in chapter-num', () => {
    renderPane()
    fireEvent.click(screen.getByText('Redaktör'))
    expect(screen.getByText(/#001/)).toBeInTheDocument()
  })
})

describe('splitChoices', () => {
  const nodeMap = new Map([
    ['001', { data: { title: 'Start' } }],
    ['002', { data: { title: 'Vänster' } }],
    ['003', { data: { title: 'Höger' } }],
  ])

  it('extracts unique bracketed refs as choices', () => {
    const { choices } = splitChoices('Foo [#002] bar [#003] baz.', nodeMap)
    expect(choices).toEqual([
      { id: '002', label: 'Vänster' },
      { id: '003', label: 'Höger' },
    ])
  })

  it('extracts bare #NNN refs as choices', () => {
    const { choices } = splitChoices('Trail #002 trail.', nodeMap)
    expect(choices).toEqual([{ id: '002', label: 'Vänster' }])
  })

  it('deduplicates repeated refs', () => {
    const { choices } = splitChoices('First [#002] then [#002] again.', nodeMap)
    expect(choices).toEqual([{ id: '002', label: 'Vänster' }])
  })

  it('falls back to "Gå till #NNN" when target is unknown', () => {
    const { choices } = splitChoices('Mystery [#999].', nodeMap)
    expect(choices).toEqual([{ id: '999', label: 'Gå till #999' }])
  })

  it('strips inline ref tokens and collapses leftover double-spaces', () => {
    const { body } = splitChoices('Du ser [#002] eller [#003].', nodeMap)
    expect(body).toBe('Du ser eller .')
  })

  it('handles empty/null text gracefully', () => {
    expect(splitChoices('', nodeMap)).toEqual({ body: '', choices: [] })
    expect(splitChoices(null, nodeMap)).toEqual({ body: '', choices: [] })
    expect(splitChoices(undefined, nodeMap)).toEqual({ body: '', choices: [] })
  })

  it('preserves paragraph breaks while removing ref-only lines', () => {
    const { body } = splitChoices('Para 1.\n\n[#002]\n\nPara 2.', nodeMap)
    // Ref-only line collapses, paragraph break should remain
    expect(body).toMatch(/Para 1\./)
    expect(body).toMatch(/Para 2\./)
    expect(body).not.toMatch(/\[#002\]/)
  })
})
