import { createContext, MutableRefObject } from 'react'

export interface NodeEditorContextType {
  updateNodeText: (id: string, text: string) => void
  /**
   * Tracks whether a node is currently being resized. Used to suppress pane
   * clicks that would otherwise clear selection while a resize is in progress.
   */
  resizingRef: MutableRefObject<boolean>
}

const NodeEditorContext = createContext<NodeEditorContextType>({
  updateNodeText: () => {},
  resizingRef: { current: false },
})

export default NodeEditorContext
