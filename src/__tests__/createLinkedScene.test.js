import { chooseNextSceneId } from '../utils/docSync.ts'

const node = (id, title = '', text = '') => ({
  id,
  type: 'card',
  position: { x: 0, y: 0 },
  data: { title, text, color: '#1f2937' },
})

test('after a doc flush created 005, choosing from the fresh list reports it as existing', () => {
  const fresh = [node('001', 'A', 'x [#005]'), node('005')]
  expect(chooseNextSceneId(fresh, '001', 5)).toEqual({ id: '005', exists: true, referenced: true })
})

test('stale list would wrongly report 005 as new (documents the race the ref avoids)', () => {
  const stale = [node('001', 'A', 'x')]
  expect(chooseNextSceneId(stale, '001', 5)).toEqual({ id: '005', exists: false, referenced: false })
})
