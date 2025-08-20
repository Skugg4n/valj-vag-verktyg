import { createContext } from 'react'

export interface NodeEditorContextType {
  updateNodeText: (id: string, text: string) => void
}

const NodeEditorContext = createContext<NodeEditorContextType>({
  updateNodeText: () => {},
})

export default NodeEditorContext
