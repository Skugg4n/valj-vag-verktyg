/* eslint-env jest */
/* global describe, it, expect */
import { renderHook } from '@testing-library/react'
import { jest } from '@jest/globals'
import useProjectStorage from '../useProjectStorage.js'

describe('useProjectStorage persistence', () => {
  it('keeps resized node size after reload', () => {
    const store = {}
    const mockStorage = {
      getItem: key => (key in store ? store[key] : null),
      setItem: (key, value) => {
        store[key] = value
      },
      removeItem: key => {
        delete store[key]
      },
    }
    Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true })

    const initialNode = {
      id: '1',
      type: 'card',
      position: { x: 0, y: 0 },
      data: { text: '' },
      width: 100,
      height: 100,
      style: { width: 100, height: 100 },
    }

    const noop = () => {}
    const { rerender, unmount } = renderHook(
      ({ nodes }) =>
        useProjectStorage({
          nodes,
          nextId: 2,
          projectName: '',
          autoSave: false,
          setNodes: noop,
          setNextId: noop,
          setProjectName: noop,
        }),
      { initialProps: { nodes: [initialNode] } }
    )

    const resized = {
      ...initialNode,
      width: 200,
      height: 150,
      style: { width: 200, height: 150 },
    }
    rerender({ nodes: [resized] })
    unmount()

    const setNodesLoaded = jest.fn()
    renderHook(() =>
      useProjectStorage({
        nodes: [],
        nextId: 2,
        projectName: '',
        autoSave: false,
        setNodes: setNodesLoaded,
        setNextId: noop,
        setProjectName: noop,
      })
    )

    expect(setNodesLoaded).toHaveBeenCalledWith([
      expect.objectContaining({
        width: 200,
        height: 150,
        style: { width: 200, height: 150 },
      }),
    ])
  })
})
