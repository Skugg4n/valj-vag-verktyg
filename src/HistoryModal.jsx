import { useEffect } from 'react'
import { X, Plus, RotateCcw } from 'lucide-react'

export default function HistoryModal({
  open,
  onClose,
  items = [],
  isLoggedIn = false,
  busy = false,
  onSaveVersion,
  onRestore,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      className="modal-bg"
      role="dialog"
      aria-modal="true"
      aria-label="Versionshistorik"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className="modal">
        <div className="modal-head">
          <h3>Versionshistorik</h3>
          <button className="btn ghost icon" onClick={onClose} aria-label="Stäng"><X /></button>
        </div>
        <div className="modal-body">
          <button
            className="btn primary"
            style={{ width: '100%', justifyContent: 'center', marginBottom: 12 }}
            onClick={onSaveVersion}
            disabled={!isLoggedIn || busy}
          >
            <Plus /> Spara nuvarande som version
          </button>

          {!isLoggedIn ? (
            <div className="hist-empty">
              Logga in för att spara och bläddra bland versioner. När du är inloggad
              sparas din berättelse automatiskt och kan återställas här.
            </div>
          ) : busy && items.length === 0 ? (
            <div className="hist-empty">Laddar versioner…</div>
          ) : items.length === 0 ? (
            <div className="hist-empty">
              Inga sparade versioner ännu. Versioner sparas automatiskt medan du arbetar.
            </div>
          ) : (
            <div className="hist-list">
              {items.map(h => (
                <div key={h.id} className="hist-item">
                  <span className="hist-dot" />
                  <span className="hist-main">
                    <span className="hist-label">{h.label || 'Auto-sparad'}</span>
                    <span className="hist-meta">
                      {(h.nodes || []).length} scener · {h.savedAt}
                    </span>
                  </span>
                  <button className="btn ghost sm" onClick={() => onRestore?.(h)} disabled={busy}>
                    <RotateCcw size={13} /> Återställ
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
