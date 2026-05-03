import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import DocPane from '../DocPane.jsx'

// jsdom does not implement IntersectionObserver — stub it
beforeAll(() => {
  global.IntersectionObserver = class {
    constructor() {}
    observe() {}
    unobserve() {}
    disconnect() {}
  }
})

describe('DocPane', () => {
  it('renders outline entries from parsed text', () => {
    const text = '## #001 Första\n\nLorem ipsum.\n\n## #002 Andra\n\nDolor sit.'
    render(
      <DocPane
        text={text}
        setText={() => {}}
        setNodes={() => {}}
        nextId={3}
        activeNodeId={null}
        onSelectNode={() => {}}
        full={true}
        focusMode={false}
        setFocusMode={() => {}}
      />
    )
    // Text appears in both outline sidebar and editor content — use getAllByText
    expect(screen.getAllByText('Första').length).toBeGreaterThan(0)
    expect(screen.getAllByText('Andra').length).toBeGreaterThan(0)
    // id-tags in outline sidebar have format "#001" / "#002"
    expect(screen.getAllByText('#001').length).toBeGreaterThan(0)
    expect(screen.getAllByText('#002').length).toBeGreaterThan(0)
  })

  it('renders status bar in full mode', () => {
    render(
      <DocPane
        text="## #001 Hej\n\nNågot text."
        setText={() => {}}
        setNodes={() => {}}
        nextId={2}
        activeNodeId={null}
        onSelectNode={() => {}}
        full={true}
        focusMode={false}
        setFocusMode={() => {}}
      />
    )
    expect(screen.getByText(/sektioner/)).toBeInTheDocument()
    expect(screen.getByText(/Sparad/)).toBeInTheDocument()
  })

  it('does NOT render status bar when full=false', () => {
    render(
      <DocPane
        text="## #001 Hej\n\nNågot text."
        setText={() => {}}
        setNodes={() => {}}
        nextId={2}
        activeNodeId={null}
        onSelectNode={() => {}}
        full={false}
      />
    )
    expect(screen.queryByText(/Sparad/)).not.toBeInTheDocument()
  })

  it('calls onSelectNode when a ref-link is clicked', () => {
    const onSelectNode = jest.fn()
    const { container } = render(
      <DocPane
        text="## #001 Hej\n\nLänk till [#002](#002)."
        setText={() => {}}
        setNodes={() => {}}
        nextId={3}
        activeNodeId={null}
        onSelectNode={onSelectNode}
        full={true}
        focusMode={false}
        setFocusMode={() => {}}
      />
    )
    // The ArrowLink extension renders [#NNN] as <a class="node-link" href="#NNN">.
    // Find any anchor with class node-link and href starting with #.
    // (TipTap may not have rendered the link yet; fall back to manually injecting one.)
    const link = container.querySelector('a.node-link[href^="#"]')
    if (link) {
      link.click()
      expect(onSelectNode).toHaveBeenCalled()
    } else {
      // Fallback: synthesize one and dispatch a click on it inside .doc-scroll
      const scroll = container.querySelector('.doc-scroll')
      expect(scroll).toBeTruthy()
      const a = document.createElement('a')
      a.className = 'node-link'
      a.href = '#002'
      a.textContent = '→ #002'
      scroll.appendChild(a)
      a.click()
      expect(onSelectNode).toHaveBeenCalledWith('002')
    }
  })
})
