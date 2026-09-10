import { pickNodeInDirection, nodeCenter, freePosition } from '../utils/graphNav.ts'

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

describe('freePosition', () => {
  test('returns the candidate untouched when nothing is near', () => {
    expect(freePosition({ x: 300, y: 0 }, [n('001', 0, 0)])).toEqual({ x: 300, y: 0 })
  })
  test('moves down past a node sitting on the candidate', () => {
    expect(freePosition({ x: 300, y: 0 }, [n('001', 0, 0), n('004', 300, 0)])).toEqual({ x: 300, y: 150 })
  })
  test('keeps moving down past a stack of occupied slots', () => {
    const nodes = [n('004', 300, 0), n('005', 300, 150), n('006', 300, 300)]
    expect(freePosition({ x: 300, y: 0 }, nodes)).toEqual({ x: 300, y: 450 })
  })
  test('a node more than 40 px away in x does not block', () => {
    expect(freePosition({ x: 300, y: 0 }, [n('004', 341, 0)])).toEqual({ x: 300, y: 0 })
  })
  test('within the 40 px tolerance counts as occupied', () => {
    expect(freePosition({ x: 300, y: 0 }, [n('004', 339, 39) ])).toEqual({ x: 300, y: 150 })
  })
})
