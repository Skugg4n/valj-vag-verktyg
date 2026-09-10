import { Node, mergeAttributes, InputRule, nodePasteRule } from '@tiptap/core'

// SceneRef is an inline atom rendering a scene reference "[004]" as a pill
// that links to scene 004. Stored node text uses "[#004]"; the document uses
// "[004]". Both spellings are accepted on the way in.
const REF_INPUT = /\[#?(\d{3})\]$/
const REF_ALL = /\[#?(\d{3})\]/g

const SceneRef = Node.create({
  name: 'sceneRef',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-scene-id'),
        renderHTML: attributes => ({
          'data-scene-id': attributes.id,
          href: `#${attributes.id}`,
          class: 'node-link',
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-scene-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const id = HTMLAttributes['data-scene-id'] || HTMLAttributes.id
    return ['a', mergeAttributes(HTMLAttributes), `[${id}]`]
  },

  addInputRules() {
    return [
      new InputRule({
        find: REF_INPUT,
        handler: ({ state, range, match }) => {
          // Headings keep "[003] Titel" as plain text.
          if (state.selection.$from.parent.type.name === 'heading') return null
          // If "[" auto-inserted a closing bracket, it sits right after the
          // typed "]"; swallow it so the pill isn't followed by a stray "]".
          const doc = state.tr.doc
          const after = doc.textBetween(range.to, Math.min(range.to + 1, doc.content.size), '\0', '\0')
          const to = after === ']' ? range.to + 1 : range.to
          state.tr.replaceWith(range.from, to, this.type.create({ id: match[1] }))
        },
      }),
    ]
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: REF_ALL,
        type: this.type,
        getAttributes: match => ({ id: match[1] }),
      }),
    ]
  },

  addStorage() {
    return {
      markdown: {
        serialize: (state: any, node: any) => {
          state.write(`[${node.attrs.id}]`)
        },
        parse: {
          updateDOM(element: HTMLElement) {
            // Only inside body text, never inside headings.
            element.querySelectorAll('p, li, blockquote').forEach(el => {
              if (!/\[#?\d{3}\]/.test(el.innerHTML)) return
              el.innerHTML = el.innerHTML.replace(REF_ALL, (_m, id) =>
                `<a data-scene-id="${id}" class="node-link" href="#${id}">[${id}]</a>`
              )
            })
          },
        },
      },
    }
  },
})

export default SceneRef
