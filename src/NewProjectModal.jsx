import Button from './Button.jsx'

export default function NewProjectModal({ onConfirm, onClose }) {
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
        <h3>New project</h3>
        <p>Are you sure you want to discard the current project? Be sure to download the latest version before starting a new project.</p>
        <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
          <Button variant="primary" onClick={onConfirm}>New project</Button>
          <Button onClick={onClose}>Cancel</Button>
        </div>
      </div>
    </div>
  )
}
