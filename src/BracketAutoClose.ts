import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'

// "[" inserts "[]" with the cursor inside. "]" either finishes a scene
// reference ("[004" + "]" -> pill) or skips over an existing "]".
const BracketAutoClose = Extension.create({
  name: 'bracketAutoClose',

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: new PluginKey('bracketAutoClose'),
        props: {
          handleTextInput(view, from, to, text) {
            const { state } = view
            if (from !== to) return false
            if (text === '[') {
              const tr = state.tr.insertText('[]', from, to)
              tr.setSelection(TextSelection.create(tr.doc, from + 1))
              view.dispatch(tr)
              return true
            }
            // Typing the third digit inside an auto-closed "[]" completes the
            // reference straight away; the user never has to type "]" again.
            if (/^\d$/.test(text)) {
              const $from = state.doc.resolve(from)
              const before = $from.parent.textBetween(0, $from.parentOffset, '\0', '\0') + text
              const m = before.match(/\[#?(\d{3})$/)
              const after = state.doc.textBetween(to, Math.min(to + 1, state.doc.content.size), '\0', '\0')
              const sceneRef = state.schema.nodes.sceneRef
              if (m && after === ']' && sceneRef && $from.parent.type.name !== 'heading') {
                const start = from - (m[0].length - 1)
                view.dispatch(state.tr.replaceWith(start, to + 1, sceneRef.create({ id: m[1] })))
                return true
              }
              return false
            }
            if (text === ']') {
              const after = state.doc.textBetween(from, Math.min(from + 1, state.doc.content.size), '\0', '\0')
              if (after !== ']') return false
              const $from = state.doc.resolve(from)
              const before = $from.parent.textBetween(0, $from.parentOffset, '\0', '\0')
              const m = before.match(/\[#?(\d{3})$/)
              const sceneRef = state.schema.nodes.sceneRef
              if (m && sceneRef && $from.parent.type.name !== 'heading') {
                const start = from - m[0].length
                const tr = state.tr.replaceWith(start, from + 1, sceneRef.create({ id: m[1] }))
                view.dispatch(tr)
                return true
              }
              view.dispatch(state.tr.setSelection(TextSelection.create(state.doc, from + 1)))
              return true
            }
            return false
          },
        },
      }),
    ]
  },
})

export default BracketAutoClose
