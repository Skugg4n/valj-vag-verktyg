import { Node, mergeAttributes, nodeInputRule, nodePasteRule } from '@tiptap/core'

// ArrowLink is an inline atom that renders references like "→ [#123]" as links
// pointing to the referenced node id.
const ArrowLink = Node.create({
  name: 'arrowLink',
  inline: true,
  group: 'inline',
  atom: true,
  selectable: false,

  addAttributes() {
    return {
      id: {
        default: null,
        parseHTML: element => element.getAttribute('data-arrow-id'),
        renderHTML: attributes => ({
          'data-arrow-id': attributes.id,
          href: `#${attributes.id}`,
          class: 'arrow-link',
        }),
      },
    }
  },

  parseHTML() {
    return [{ tag: 'a[data-arrow-id]' }]
  },

  renderHTML({ HTMLAttributes }) {
    const id = HTMLAttributes['data-arrow-id'] || HTMLAttributes.id
    return ['a', mergeAttributes(HTMLAttributes), `\u2192 #${id}`]
  },

  addInputRules() {
    return [
      nodeInputRule({
        find: /\u2192\s\[#(\d{3})\]$/, // → [#123]
        type: this.type,
        getAttributes: match => ({ id: match[1] }),
      }),
    ]
  },

  addPasteRules() {
    return [
      nodePasteRule({
        find: /\u2192\s\[#(\d{3})\]/g,
        type: this.type,
        getAttributes: match => ({ id: match[1] }),
      }),
    ]
  },

  addStorage() {
    return {
      markdown: {
        serialize: (state, node) => {
          state.write(`\u2192 [#${node.attrs.id}]`)
        },
        parse: {
          updateDOM(element) {
            // Replace occurrences of → [#123] in the HTML with anchor elements
            element.innerHTML = element.innerHTML.replace(/\u2192\s\[#(\d{3})\]/g, (_, id) => {
              return `<a data-arrow-id="${id}" href="#${id}">\u2192 #${id}</a>`
            })
          },
        },
      },
    }
  },
})

export default ArrowLink

