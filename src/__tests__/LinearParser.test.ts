import { parseLinearText } from '../useLinearParser.ts'

describe('parseLinearText', () => {
  test('parses well-formed nodes with ## prefix', () => {
    const raw = '## #001 Title One\nBody one\n\n## #002 Title Two\nBody two'
    const result = parseLinearText(raw)
    expect(result).toHaveLength(2)
    expect(result[0]).toEqual({ id: '001', title: 'Title One', text: 'Body one' })
    expect(result[1]).toEqual({ id: '002', title: 'Title Two', text: 'Body two' })
  })

  test('handles nodes without title', () => {
    const raw = '## #001\nBody only'
    const result = parseLinearText(raw)
    expect(result).toHaveLength(1)
    expect(result[0].title).toBe('')
    expect(result[0].text).toBe('Body only')
  })

  test('ignores duplicate ids', () => {
    const raw = '## #001 First\nText\n\n## #001 Duplicate\nMore'
    const parsed = parseLinearText(raw)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('001')
  })

  test('skips blocks without valid heading', () => {
    const raw = 'Some random text\n\n## #002 Second\nMore'
    const parsed = parseLinearText(raw)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('002')
  })
})
