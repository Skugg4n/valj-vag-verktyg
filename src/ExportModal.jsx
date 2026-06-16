import { useEffect } from 'react'
import { X, FileJson, FileText, BookOpen } from 'lucide-react'

export default function ExportModal({
  open,
  onClose,
  onExportJSON,
  onExportMarkdown,
  onExportHTML,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  const run = fn => () => { fn?.(); onClose?.() }

  return (
    <div
      className="modal-bg"
      role="dialog"
      aria-modal="true"
      aria-label="Exportera"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className="modal sm">
        <div className="modal-head">
          <h3>Exportera</h3>
          <button className="btn ghost icon" onClick={onClose} aria-label="Stäng"><X /></button>
        </div>
        <div className="modal-body">
          <button className="export-opt" onClick={run(onExportJSON)}>
            <span className="export-icon"><FileJson size={18} /></span>
            <span>
              <span className="export-title">JSON-backup</span>
              <span className="export-desc">Fullständig: noder, positioner, färger. Kan importeras igen.</span>
            </span>
          </button>
          <button className="export-opt" onClick={run(onExportMarkdown)}>
            <span className="export-icon"><FileText size={18} /></span>
            <span>
              <span className="export-title">Markdown</span>
              <span className="export-desc">Läsbar text för publicering eller delning.</span>
            </span>
          </button>
          <button className="export-opt" onClick={run(onExportHTML)}>
            <span className="export-icon"><BookOpen size={18} /></span>
            <span>
              <span className="export-title">Delbar läsversion</span>
              <span className="export-desc">Fristående HTML, spelbar berättelse som funkar offline. Skicka till vem som helst.</span>
            </span>
          </button>
        </div>
      </div>
    </div>
  )
}
