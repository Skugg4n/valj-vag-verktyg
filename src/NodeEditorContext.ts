import { createContext, MutableRefObject } from 'react'

export interface NodeEditorContextType {
  updateNodeText: (id: string, text: string) => void
  /**
   * Tracks whether a node is currently being resized. Used to suppress pane
   * clicks that would otherwise clear selection while a resize is in progress.
   */
  resizingRef: MutableRefObject<boolean>
  selectNode: (id: string, data: { text?: string; title?: string }) => void
}

const NodeEditorContext = createContext<NodeEditorContextType>({
  updateNodeText: () => {},
  resizingRef: { current: false },
  selectNode: () => {},
})

export default NodeEditorContext
