import { render, screen, waitFor, fireEvent } from '@testing-library/react'
import '@testing-library/jest-dom'
import { jest } from '@jest/globals'

jest.mock('../useFirestoreSync.js', () => ({
  getPublished: jest.fn(async () => ({
    title: 'Världshopparen',
    nodes: [{ id: '001', title: 'Start', text: 'Plain. [#002]' }, { id: '002', title: 'Slut', text: 'x' }],
    rich: { nodes: [
      { id: '001', title: 'Start', text: '<mark>Matteläraren</mark> ropar. {Ljudeffekt} [#002]', color: '#1f2937', position: { x: 0, y: 0 }, width: 220, height: 100 },
      { id: '002', title: 'Slut', text: 'x', color: '#1f2937', position: { x: 300, y: 0 }, width: 220, height: 100 },
    ] },
  })),
}))
jest.mock('../comments.js', () => ({
  useComments: () => [{ id: 'k1', sceneId: '001', text: 'Trumma här?', author: 'Cecilia', quote: '', resolved: false }],
  addComment: jest.fn(async () => {}),
  countBySceneId: (cs) => { const o = {}; for (const c of cs) { if (!c.resolved) o[c.sceneId] = (o[c.sceneId] || 0) + 1 } return o },
}))
jest.mock('../CommentsPanel.jsx', () => ({ __esModule: true, default: ({ comments, sceneId }) => <aside className="cmt-panel">{comments.filter(c => c.sceneId === sceneId).length} kommentarer</aside> }))
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }
global.IntersectionObserver = class { observe() {} unobserve() {} disconnect() {} }

import PublicRead, { richToNodes, edgesFrom } from '../PublicRead.jsx'

describe('PublicRead (/las/:id)', () => {
  it('prefers the rich copy and builds edges from refs', () => {
    const nodes = richToNodes({ nodes: [{ id: '001', text: 'plain' }], rich: { nodes: [{ id: '001', text: 'rich [#002]' }, { id: '002', text: '' }] } })
    expect(nodes[0].data.text).toBe('rich [#002]')
    expect(edgesFrom(nodes)).toEqual([expect.objectContaining({ source: '001', target: '002' })])
    expect(richToNodes({ nodes: [{ id: '001', text: 'plain' }] })[0].data.text).toBe('plain')
  })

  it('renders the read view with highlight and cue chip, no Dela button, and switches tabs', async () => {
    const { container } = render(<PublicRead shareId="abc" />)
    await waitFor(() => expect(screen.getByRole('heading', { level: 1 }).textContent).toBe('Start'))
    expect(container.querySelector('.read-page mark').textContent).toBe('Matteläraren')
    expect(container.querySelector('.read-cue').textContent).toBe('Ljudeffekt')
    expect(screen.queryByTitle('Dela')).toBeNull()
    expect(container.querySelector('.cmt-panel').textContent).toBe('1 kommentarer')
    fireEvent.click(screen.getByRole('tab', { name: 'Karta' }))
    await waitFor(() => expect(container.querySelectorAll('.react-flow__node')).toHaveLength(2))
    expect(container.querySelectorAll('.pr-node .react-flow__handle')).toHaveLength(4)
    expect(container.querySelector('.pr-node-badge').textContent).toBe('1')
    fireEvent.click(screen.getByRole('tab', { name: 'Scen' }))
    expect(container.querySelector('.stage')).toBeTruthy()
    expect(container.querySelector('.stage-cue').textContent).toBe('1Ljudeffekt')
  })
})
