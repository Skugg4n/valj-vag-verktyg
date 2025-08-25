import { Extension } from '@tiptap/core'
import { Plugin, PluginKey } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

const ActiveNodePluginKey = new PluginKey('active-node-highlight')

const ActiveNodeHighlight = Extension.create({
  name: 'activeNodeHighlight',

  addCommands() {
    return {
      setActiveNodeId:
        id =>
        ({ state, dispatch }) => {
          const tr = state.tr.setMeta(ActiveNodePluginKey, id)
          dispatch(tr)
          return true
        },
    }
  },

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: ActiveNodePluginKey,
        state: {
          init: () => null,
          apply(tr, value) {
            const meta = tr.getMeta(ActiveNodePluginKey)
            return meta !== undefined ? meta : value
          },
        },
        props: {
          decorations(state) {
            const activeId = ActiveNodePluginKey.getState(state)
            if (!activeId) return null
            const { doc } = state
            const decorations: Decoration[] = []
            const target = `#${activeId}`
            doc.descendants((node, pos) => {
              if (node.type.name === 'heading' && node.textContent.startsWith(target)) {
                decorations.push(
                  Decoration.node(pos, pos + node.nodeSize, { class: 'is-active-node' })
                )
                return false
              }
            })
            return DecorationSet.create(doc, decorations)
          },
        },
      }),
    ]
  },
})

export default ActiveNodeHighlight

