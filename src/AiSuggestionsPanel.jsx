import Button from './Button.jsx'

export default function AiSuggestionsPanel({ suggestions = [], onPick, onClose }) {
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
        <h3>AI Suggestions</h3>
        {suggestions.length === 0 && <p>No suggestions</p>}
        <ul>
          {suggestions.map((s, i) => (
            <li key={i}>
              <Button variant="ghost" onClick={() => onPick(s)}>
                {s}
              </Button>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
