/* eslint-env jest */
/* global global, test, expect */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReactFlow, { ReactFlowProvider } from 'reactflow';
import { jest } from '@jest/globals';

jest.mock('@reactflow/node-resizer', () => ({ NodeResizer: () => null }));

global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

import NodeCard from '../NodeCard.jsx';
import NodeEditorContext from '../NodeEditorContext.ts';

const nodes = [
  { id: '1', type: 'card', position: { x: 0, y: 0 }, data: { text: 'hello' } },
];

test('calls selectNode when node is clicked', () => {
  const selectNode = jest.fn();
  const { container } = render(
    <NodeEditorContext.Provider value={{ updateNodeText: () => {}, resizingRef: { current: false }, selectNode }}>
      <ReactFlowProvider>
        <div style={{ width: 500, height: 500 }}>
          <ReactFlow nodes={nodes} edges={[]} nodeTypes={{ card: NodeCard }} />
        </div>
      </ReactFlowProvider>
    </NodeEditorContext.Provider>
  );
  const node = container.querySelector('.node-card');
  fireEvent.click(node);
  expect(selectNode).toHaveBeenCalledWith('1', expect.objectContaining({ text: 'hello' }));
});
