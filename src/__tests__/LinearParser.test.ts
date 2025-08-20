import { parseLinearText } from '../useLinearParser.ts'

describe('parseLinearText', () => {
  test('ignores duplicate ids', () => {
    const raw = '#001 First\nText\n\n#001 Duplicate\nMore'
    const parsed = parseLinearText(raw)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('001')
  })

  test('skips malformed ids', () => {
    const raw = '#00A Invalid\nText\n\n#002 Second\nMore'
    const parsed = parseLinearText(raw)
    expect(parsed).toHaveLength(1)
    expect(parsed[0].id).toBe('002')
  })
})
