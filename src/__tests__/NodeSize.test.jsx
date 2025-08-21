/* eslint-env jest */
/* global global, it, expect */
import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReactFlow, { ReactFlowProvider } from 'reactflow';
import { jest } from '@jest/globals';

jest.mock('@reactflow/node-resizer', () => ({
  NodeResizer: () => null,
}));

import NodeCard from '../NodeCard.jsx';
import NodeEditorContext from '../NodeEditorContext.ts';

// simple ResizeObserver mock for ReactFlow
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const longText = `Lorem ipsum dolor sit amet, consectetur adipiscing elit. ` +
  `Sed do eiusmod tempor incididunt ut labore et dolore magna aliqua.`;
const nodes = [
  { id: '1', type: 'card', position: { x: 0, y: 0 }, data: { text: longText } },
];

it('keeps node dimensions after click', () => {
  const { container } = render(
    <NodeEditorContext.Provider value={{ updateNodeText: () => {}, resizingRef: { current: false } }}>
      <ReactFlowProvider>
        <div style={{ width: 500, height: 500 }}>
          <ReactFlow
            nodes={nodes}
            edges={[]}
            nodeTypes={{ card: NodeCard }}
          />
        </div>
      </ReactFlowProvider>
    </NodeEditorContext.Provider>
  );
  const node = container.querySelector('.react-flow__node-card');
  expect(node).toBeInTheDocument();
  const { width, height } = getComputedStyle(node);
  fireEvent.click(node);
  expect(getComputedStyle(node).width).toBe(width);
  expect(getComputedStyle(node).height).toBe(height);
});
