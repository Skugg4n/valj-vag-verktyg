import Button from './Button.jsx'

export default function AiProofreadPanel({ original = '', improved = '', onApply, onClose }) {
  return (
    <div id="modal" role="dialog" aria-modal="true" className="show">
      <button
        id="closeModal"
        className="btn ghost"
        aria-label="Close"
        onClick={onClose}
      >
        Close
      </button>
      <div id="modalList">
        <h3>AI Proofread</h3>
        <p>Original:</p>
        <div className="suggestion">{original}</div>
        <p>Improved:</p>
        <div className="suggestion">{improved}</div>
        <Button variant="primary" onClick={() => onApply(improved)}>Use text</Button>
      </div>
    </div>
  )
}
