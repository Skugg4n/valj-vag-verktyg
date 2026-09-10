import { render } from '@testing-library/react'
import { createRef } from 'react'
import { ReactFlowProvider } from 'reactflow'
import { ViewportBridge } from '../GraphPane.jsx'

test('ViewportBridge exposes the ReactFlow instance on viewportRef and clears it on unmount', () => {
  const viewportRef = createRef()
  const { unmount } = render(
    <ReactFlowProvider>
      <ViewportBridge viewportRef={viewportRef} />
    </ReactFlowProvider>
  )
  expect(typeof viewportRef.current?.screenToFlowPosition).toBe('function')
  expect(typeof viewportRef.current?.setCenter).toBe('function')
  unmount()
  expect(viewportRef.current).toBeNull()
})
