import { useEffect, useRef } from 'react'
import useLinearParser from './useLinearParser.js'

export default function LinearView({ text, setText, setNodes, onClose }) {
  const editorRef = useRef(null)

  useEffect(() => {
    if (editorRef.current) {
      editorRef.current.innerText = text || ''
    }
  }, [text])

  useLinearParser(text, setNodes)

  const onInput = () => {
    if (editorRef.current) {
      setText(editorRef.current.innerText)
    }
  }

  return (
    <div id="modal" role="dialog" aria-modal="true" className="show">
      <button
        className="btn ghost"
        id="closeModal"
        aria-label="Close linear view"
        onClick={onClose}
      >
        Close
      </button>
      <div
        id="linearEditor"
        contentEditable
        suppressContentEditableWarning
        ref={editorRef}
        onInput={onInput}
      />
    </div>
  )
}
