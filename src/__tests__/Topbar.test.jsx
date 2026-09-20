import { render, screen } from '@testing-library/react'
import '@testing-library/jest-dom'
import Topbar from '../Topbar.jsx'

const props = { projectName: 'X', setProjectName: () => {}, onCmdK: () => {}, onShare: () => {} }

test('shows the last saved time', () => {
  const t = new Date(2026, 8, 10, 14, 32).getTime()
  render(<Topbar {...props} isSaving={false} lastSavedAt={t} />)
  expect(screen.getByText('sparad 14:32')).toBeInTheDocument()
})

test('shows "sparar…" while saving', () => {
  render(<Topbar {...props} isSaving lastSavedAt={Date.now()} />)
  expect(screen.getByText('sparar…')).toBeInTheDocument()
})

test('shows plain "sparad" before any save', () => {
  render(<Topbar {...props} isSaving={false} lastSavedAt={null} />)
  expect(screen.getByText('sparad')).toBeInTheDocument()
})
