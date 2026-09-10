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
        // SceneRef's own InputRule sits ahead of this plugin in tiptap's
        // plugin order (the combined inputRules plugin is always first), so
        // it fires before our ']' branch above when it matches. It only
        // consumes up to the just-typed ']', leaving the bracket that we
        // auto-inserted for "[" dangling right after the new pill. Clean
        // that orphan up here.
        appendTransaction(transactions, _oldState, newState) {
          if (!transactions.some(tr => tr.docChanged)) return null
          let result: any = null
          newState.doc.descendants((node, pos) => {
            if (result || node.type.name !== 'sceneRef') return
            const after = pos + node.nodeSize
            const nextChar = newState.doc.textBetween(after, Math.min(after + 1, newState.doc.content.size))
            if (nextChar === ']') {
              result = newState.tr.delete(after, after + 1)
            }
          })
          return result
        },
      }),
    ]
  },
})

export default BracketAutoClose
