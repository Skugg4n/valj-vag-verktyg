import Link from '@tiptap/extension-link'

// Link extension that ignores the anchors SceneRef uses for [NNN] pills,
// so a pill is parsed as a sceneRef node and never as a link mark.
const CustomLink = Link.extend({
  parseHTML() {
    return [{ tag: 'a[href]:not([data-scene-id])' }]
  },
})

export default CustomLink
