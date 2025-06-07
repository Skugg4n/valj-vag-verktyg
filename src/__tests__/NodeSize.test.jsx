import React from 'react';
import { render, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import ReactFlow from 'reactflow';

// simple ResizeObserver mock for ReactFlow
global.ResizeObserver = class {
  observe() {}
  unobserve() {}
  disconnect() {}
};

const nodes = [{ id: '1', position: { x: 0, y: 0 }, data: {} }];

it('keeps node dimensions after click', () => {
  const { container } = render(
    <div style={{ width: 500, height: 500 }}>
      <ReactFlow nodes={nodes} edges={[]} />
    </div>
  );
  const node = container.querySelector('.react-flow__node');
  expect(node).toBeInTheDocument();
  const width = node.style.width;
  const height = node.style.height;
  fireEvent.click(node);
  expect(node.style.width).toBe(width);
  expect(node.style.height).toBe(height);
});
