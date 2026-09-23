import { Extension } from '@tiptap/core'
import { Plugin, PluginKey, TextSelection } from 'prosemirror-state'
import { Decoration, DecorationSet } from 'prosemirror-view'

// Search and replace inside the document. Matches are computed from the
// current doc + query on every transaction (documents are small), rendered as
// decorations, and exposed through editor.storage.searchReplace.

export const SearchKey = new PluginKey('searchReplace')

export interface Match { from: number; to: number }

interface SearchState {
  query: string
  matches: Match[]
  index: number
}

function findMatches(doc: any, query: string): Match[] {
  const out: Match[] = []
  if (!query) return out
  const q = query.toLowerCase()
  doc.descendants((node: any, pos: number) => {
    if (!node.isTextblock) return true
    const text = node.textBetween(0, node.content.size, '\0', '\0').toLowerCase()
    let i = text.indexOf(q)
    while (i !== -1) {
      out.push({ from: pos + 1 + i, to: pos + 1 + i + q.length })
      i = text.indexOf(q, i + q.length)
    }
    return false
  })
  return out
}

function clampIndex(i: number, n: number): number {
  if (n === 0) return -1
  return ((i % n) + n) % n
}

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    searchReplace: {
      setSearchTerm: (query: string) => ReturnType
      nextMatch: () => ReturnType
      prevMatch: () => ReturnType
      replaceCurrent: (replacement: string) => ReturnType
      replaceAll: (replacement: string) => ReturnType
      clearSearch: () => ReturnType
    }
  }
}

const SearchReplace = Extension.create({
  name: 'searchReplace',

  addStorage() {
    return { query: '', matches: [] as Match[], index: -1 }
  },

  addCommands() {
    const stepTo = (index: number) => ({ state, dispatch, view }: any) => {
      const st: SearchState = SearchKey.getState(state)
      if (!st || st.matches.length === 0) return false
      const i = clampIndex(index, st.matches.length)
      const m = st.matches[i]
      const tr = state.tr.setMeta(SearchKey, { index: i }).setSelection(TextSelection.create(state.doc, m.from, m.to))
      dispatch?.(tr)
      view?.dispatch && (view.__vvScrollToMatch = m)
      return true
    }
    return {
      setSearchTerm: (query: string) => ({ state, dispatch }) => {
        dispatch?.(state.tr.setMeta(SearchKey, { query, index: 0 }))
        return true
      },
      nextMatch: () => (props) => stepTo((SearchKey.getState(props.state)?.index ?? -1) + 1)(props),
      prevMatch: () => (props) => stepTo((SearchKey.getState(props.state)?.index ?? 0) - 1)(props),
      replaceCurrent: (replacement: string) => ({ state, dispatch }) => {
        const st: SearchState = SearchKey.getState(state)
        if (!st || st.index < 0 || !st.matches[st.index]) return false
        const m = st.matches[st.index]
        const tr = state.tr.insertText(replacement, m.from, m.to).setMeta(SearchKey, { index: st.index })
        dispatch?.(tr)
        return true
      },
      replaceAll: (replacement: string) => ({ state, dispatch }) => {
        const st: SearchState = SearchKey.getState(state)
        if (!st || st.matches.length === 0) return false
        let tr = state.tr
        for (const m of [...st.matches].reverse()) tr = tr.insertText(replacement, m.from, m.to)
        dispatch?.(tr.setMeta(SearchKey, { index: 0 }))
        return true
      },
      clearSearch: () => ({ state, dispatch }) => {
        dispatch?.(state.tr.setMeta(SearchKey, { query: '', index: -1 }))
        return true
      },
    }
  },

  addProseMirrorPlugins() {
    const storage = this.storage
    return [
      new Plugin({
        key: SearchKey,
        state: {
          init: (): SearchState => ({ query: '', matches: [], index: -1 }),
          apply(tr, prev: SearchState): SearchState {
            const meta = tr.getMeta(SearchKey) || {}
            const query = meta.query !== undefined ? meta.query : prev.query
            const matches = (tr.docChanged || meta.query !== undefined) ? findMatches(tr.doc, query) : prev.matches
            let index = meta.index !== undefined ? meta.index : prev.index
            index = clampIndex(index < 0 ? 0 : index, matches.length)
            const next = { query, matches, index }
            storage.query = query
            storage.matches = matches
            storage.index = index
            return next
          },
        },
        props: {
          decorations(state) {
            const st: SearchState = SearchKey.getState(state)
            if (!st || st.matches.length === 0) return null
            return DecorationSet.create(
              state.doc,
              st.matches.map((m, i) =>
                Decoration.inline(m.from, m.to, { class: i === st.index ? 'search-match active' : 'search-match' })
              )
            )
          },
        },
      }),
    ]
  },
})

export default SearchReplace
