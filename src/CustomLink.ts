import Link from '@tiptap/extension-link'

// Link extension that ignores anchors used by ArrowLink
const CustomLink = Link.extend({
  parseHTML() {
    return [{ tag: 'a[href]:not([data-arrow-id])' }]
  },
})

export default CustomLink
