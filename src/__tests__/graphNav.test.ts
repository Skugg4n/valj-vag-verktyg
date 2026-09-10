import { pickNodeInDirection, nodeCenter } from '../utils/graphNav.ts'

const n = (id: string, x: number, y: number) => ({
  id, position: { x, y }, width: 200, height: 100, data: {},
} as any)

describe('pickNodeInDirection', () => {
  const nodes = [n('001', 0, 0), n('002', 300, 0), n('003', 300, 400), n('004', -300, 0), n('005', 0, -300)]

  test('right picks the node straight ahead even if a diagonal one is nearer', () => {
    // 006 is diagonally closer in raw distance but far across; straight one wins.
    const set = [n('001', 0, 0), n('002', 600, 0), n('006', 250, 250)]
    expect(pickNodeInDirection(set, '001', 'right')).toBe('002')
  })
  test('left, up, down', () => {
    expect(pickNodeInDirection(nodes, '001', 'left')).toBe('004')
    expect(pickNodeInDirection(nodes, '001', 'up')).toBe('005')
    expect(pickNodeInDirection(nodes, '001', 'down')).toBe('003')
  })
  test('no candidate in that direction gives null', () => {
    expect(pickNodeInDirection([n('001', 0, 0), n('002', 300, 0)], '002', 'right')).toBeNull()
  })
  test('unknown from id gives null', () => {
    expect(pickNodeInDirection(nodes, '999', 'right')).toBeNull()
  })
  test('nodeCenter uses width/height', () => {
    expect(nodeCenter(n('001', 10, 20))).toEqual({ x: 110, y: 70 })
  })
})
