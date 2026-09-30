import { readFileSync } from 'fs'
import { join } from 'path'
import { createHash } from 'crypto'

// public/lite.js is a plain ES5 script for old browsers; load it as one.
const src = readFileSync(join(process.cwd(), 'public/lite.js'), 'utf-8')
delete window.__VV_LITE__
window.eval(src)
const L = window.VVLite

describe('lite reader', () => {
  it('decodes Firestore REST values', () => {
    const out = L.decodeFields({
      title: { stringValue: 'Saga' },
      nodes: { arrayValue: { values: [{ mapValue: { fields: { id: { stringValue: '001' }, width: { integerValue: '220' } } } }] } },
    })
    expect(out).toEqual({ title: 'Saga', nodes: [{ id: '001', width: 220 }] })
  })

  it('lists each referenced scene once, with the target title', () => {
    const byId = { '002': { title: 'Knappen' } }
    expect(L.choicesOf('Gå [#002] eller [#003], eller [#002].', byId)).toEqual([
      { id: '002', label: 'Knappen', exists: true },
      { id: '003', label: 'Gå till #003', exists: false },
    ])
  })

  it('renders a scene with highlight, cue, emphasis and choices, escaping the rest', () => {
    const byId = { '001': { id: '001', title: 'Start <1>', text: 'Hej <mark>du</mark> {Trumma} *tyst*\\\nrad två\n\n• Välj [#002]' }, '002': { title: 'Nästa' } }
    const html = L.sceneHtml(byId['001'], byId)
    expect(html).toContain('<h1>Start &lt;1&gt;</h1>')
    expect(html).toContain('<mark>du</mark>')
    expect(html).toContain('<span class="vl-cue">Trumma</span>')
    expect(html).toContain('<em>tyst</em><br>rad två')
    expect(html).toContain('<p>• Välj</p>')
    expect(html).toContain('<a class="vl-choice vl-c0" href="#002">Nästa</a>')
  })

  it('offers a restart when a scene has no choices', () => {
    expect(L.sceneHtml({ id: '009', title: 'Slut', text: 'Klart.' }, {})).toContain('href="#start"')
  })
})

describe('offline manifest', () => {
  it('carries the checksum of the cached files, so old browsers refetch them after a change', () => {
    // If this fails: lite.js or enkel.html changed. Put the new checksum in public/enkel.appcache.
    const read = f => readFileSync(join(process.cwd(), 'public', f))
    const sum = createHash('md5').update(Buffer.concat([read('lite.js'), read('enkel.html')])).digest('hex')
    expect(read('enkel.appcache').toString()).toContain(`# files: ${sum}`)
  })
})
