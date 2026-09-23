import { useEffect } from 'react'
import { X, FileJson, FileText, BookOpen, Link2, Copy, Ban } from 'lucide-react'

export default function ExportModal({
  open,
  onClose,
  onExportJSON,
  onExportMarkdown,
  onExportHTML,
  shareInfo = null,
  shareBusy = false,
  onShare,
  onUnshare,
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
          <button className="export-opt" onClick={() => onShare?.()} disabled={shareBusy}>
            <span className="export-icon"><Link2 size={18} /></span>
            <span>
              <span className="export-title">{shareInfo ? 'Uppdatera delad länk' : 'Dela via länk'}</span>
              <span className="export-desc">
                {shareInfo
                  ? 'Publicerar den senaste texten på samma länk.'
                  : 'Publicerar en läsbar version på webben. Alla med länken kan läsa, ingen inloggning.'}
              </span>
            </span>
          </button>
          {shareInfo && (
            <div className="share-box">
              <input className="share-url" readOnly value={shareInfo.url} onFocus={e => e.target.select()} aria-label="Delningslänk" />
              <button className="btn ghost sm" onClick={() => navigator.clipboard?.writeText(shareInfo.url)} title="Kopiera länken"><Copy size={14} /> Kopiera</button>
              <a className="btn ghost sm" href={shareInfo.url} target="_blank" rel="noopener">Öppna</a>
              <button className="btn ghost sm" onClick={() => onUnshare?.()} disabled={shareBusy} title="Länken slutar fungera"><Ban size={14} /> Sluta dela</button>
            </div>
          )}
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
