import { render, act } from '@testing-library/react'
import { ReactFlowProvider } from 'reactflow'
import { jest } from '@jest/globals'
import NodeCard from '../NodeCard.jsx'
import NodeEditorContext from '../NodeEditorContext.ts'

// Same stubs as NodeClick.test.jsx: the resizer needs a real node context.
jest.mock('@reactflow/node-resizer', () => ({ NodeResizer: () => null }))
global.ResizeObserver = class { observe() {} unobserve() {} disconnect() {} }

function renderCard(ctx) {
  return render(
    <ReactFlowProvider>
      <NodeEditorContext.Provider value={{
        updateNodeText: () => {}, beginEdit: () => {}, resizingRef: { current: false },
        selectNode: () => {}, activeNodeId: '001', matchSet: null,
        focusTitleId: null, onTitleFocused: () => {}, ...ctx,
      }}>
        <NodeCard id="001" data={{ title: '', text: '', color: '#1f2937' }} selected width={220} height={120} />
      </NodeEditorContext.Provider>
    </ReactFlowProvider>
  )
}

test('focuses the title input when focusTitleId matches and reports back', async () => {
  jest.useFakeTimers()
  const onTitleFocused = jest.fn()
  const { container } = renderCard({ focusTitleId: '001', onTitleFocused })
  await act(async () => { jest.runAllTimers() })
  expect(document.activeElement).toBe(container.querySelector('.node-title-input'))
  expect(onTitleFocused).toHaveBeenCalled()
  jest.useRealTimers()
})

test('does not steal focus for another id', async () => {
  jest.useFakeTimers()
  const { container } = renderCard({ focusTitleId: '002' })
  await act(async () => { jest.runAllTimers() })
  expect(document.activeElement).not.toBe(container.querySelector('.node-title-input'))
  jest.useRealTimers()
})
