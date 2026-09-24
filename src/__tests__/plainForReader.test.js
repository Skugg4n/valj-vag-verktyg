import { plainForReader } from '../App.jsx'

test('published text is plain: no emphasis markers, straight quotes, refs kept', () => {
  expect(plainForReader('*[MUSIK: tema]* “Hej” **fet** [#002]\\\nrad'))
    .toBe('[MUSIK: tema] "Hej" fet [#002]\nrad')
})

test('stage cues in {braces} are dropped from the public text', () => {
  expect(plainForReader('Pling. {Ljudeffekt} Sedan {musik: tema} tystnad.')).toBe('Pling. Sedan tystnad.')
})
