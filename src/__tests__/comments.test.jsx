import { render, screen, fireEvent, waitFor } from '@testing-library/react'
import '@testing-library/jest-dom'
import { jest } from '@jest/globals'

jest.mock('../comments.js', () => ({
  countBySceneId: (comments) => {
    const out = {}
    for (const c of comments || []) { if (!c.resolved) out[c.sceneId] = (out[c.sceneId] || 0) + 1 }
    return out
  },
  loadAuthor: () => 'Cecilia',
  saveAuthor: jest.fn(),
}))

import CommentsPanel from '../CommentsPanel.jsx'
import { countBySceneId } from '../comments.js'

const COMMENTS = [
  { id: 'a', sceneId: '001', text: 'Trumma här?', author: 'Cecilia', quote: 'Bussen kör', resolved: false },
  { id: 'b', sceneId: '001', text: 'Klart', author: 'Ola', resolved: true },
  { id: 'c', sceneId: '002', text: 'Annan scen', author: 'Cecilia', resolved: false },
]

describe('countBySceneId', () => {
  it('counts unresolved comments per scene', () => {
    expect(countBySceneId(COMMENTS)).toEqual({ '001': 1, '002': 1 })
  })
})

describe('CommentsPanel', () => {
  it('lists the scene\'s open comments with quote, hides resolved unless asked', () => {
    const { container, rerender } = render(<CommentsPanel sceneId="001" comments={COMMENTS} onAdd={async () => {}} />)
    expect(container.querySelectorAll('.cmt')).toHaveLength(1)
    expect(container.querySelector('.cmt-quote').textContent).toContain('Bussen kör')
    expect(screen.getByText('1 klara')).toBeInTheDocument()
    rerender(<CommentsPanel sceneId="001" comments={COMMENTS} onAdd={async () => {}} showResolved />)
    expect(container.querySelectorAll('.cmt')).toHaveLength(2)
  })

  it('submits a comment with the quote and remembered name', async () => {
    const onAdd = jest.fn(async () => {})
    const onClearQuote = jest.fn()
    render(<CommentsPanel sceneId="001" comments={[]} quoteDraft="gupp" onClearQuote={onClearQuote} onAdd={onAdd} />)
    expect(screen.getByLabelText('Ditt namn').value).toBe('Cecilia')
    fireEvent.change(screen.getByPlaceholderText(/Skriv om det markerade/), { target: { value: 'Ljud här' } })
    fireEvent.click(screen.getByText('Skicka'))
    await waitFor(() => expect(onAdd).toHaveBeenCalledWith({ sceneId: '001', quote: 'gupp', text: 'Ljud här', author: 'Cecilia' }))
    expect(onClearQuote).toHaveBeenCalled()
  })

  it('shows resolve and delete only when moderating', () => {
    const onResolve = jest.fn()
    const { container, rerender } = render(<CommentsPanel sceneId="001" comments={COMMENTS} onAdd={async () => {}} />)
    expect(container.querySelector('.cmt-actions')).toBeNull()
    rerender(<CommentsPanel sceneId="001" comments={COMMENTS} onAdd={async () => {}} canModerate onResolve={onResolve} />)
    fireEvent.click(screen.getByTitle('Markera som klar'))
    expect(onResolve).toHaveBeenCalledWith('a', true)
  })
})
