import { extractCues, stripCues, splitMarkers } from '../stageCues.js'

describe('stage cues', () => {
  test('extractCues lifts {..} out as numbered markers', () => {
    const { text, cues } = extractCues('Bussen kör över ett gupp. {Ljudeffekt: gupp} Klick. {Trumma} Slut.')
    expect(cues).toEqual(['Ljudeffekt: gupp', 'Trumma'])
    expect(text).toBe('Bussen kör över ett gupp. \uE0001\uE000 Klick. \uE0002\uE000 Slut.')
  })
  test('empty braces are dropped, spacing tidied', () => {
    const { text, cues } = extractCues('Hej {} du {x}.')
    expect(cues).toEqual(['x'])
    expect(text).toBe('Hej du \uE0001\uE000.')
  })
  test('stripCues removes cues for the public reader', () => {
    expect(stripCues('Pling. {Ljudeffekt} Sedan {musik} tystnad.')).toBe('Pling. Sedan tystnad.')
  })
  test('splitMarkers separates text and cue markers', () => {
    expect(splitMarkers('a \uE0001\uE000 b')).toEqual([{ text: 'a ' }, { cue: 1 }, { text: ' b' }])
  })
})
