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

  test('handles Windows line endings and special characters', () => {
    const raw = '#001 First\r\nLine with -> [] and #010 reference\r\n\r\n#002 Second\r\nMore text'
    const parsed = parseLinearText(raw)
    expect(parsed).toHaveLength(2)
    expect(parsed[0].text).toContain('-> []')
    expect(parsed[1].id).toBe('002')
    expect(parsed[1].text).toBe('More text')
  })
})
