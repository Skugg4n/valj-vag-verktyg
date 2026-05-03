import { useEffect } from 'react'
import { Settings as SettingsIcon } from 'lucide-react'

export default function SettingsModal({
  open, onClose,
  fontSize, setFontSize,
  autoSave, setAutoSave,
  debugMode, setDebugMode,
  onOpenAiSettings,
}) {
  useEffect(() => {
    if (!open) return
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  if (!open) return null

  return (
    <div className="modal-bg" role="dialog" aria-modal="true" aria-label="Inställningar"
      onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="modal-card">
        <header><SettingsIcon size={16} />Inställningar</header>
        <div className="body">
          <div>
            <div className="section-title">Visning</div>
            <div className="row">
              <label htmlFor="setting-font-size">Textstorlek ({fontSize}px)</label>
              <input
                id="setting-font-size"
                type="range" min="10" max="22" step="1"
                value={fontSize}
                onChange={(e) => setFontSize(Number(e.target.value))}
              />
            </div>
            <div className="row">
              <label htmlFor="setting-auto-save">Auto-save</label>
              <input
                id="setting-auto-save"
                type="checkbox"
                checked={autoSave}
                onChange={(e) => setAutoSave(e.target.checked)}
              />
            </div>
          </div>

          <div>
            <div className="section-title">AI</div>
            <div className="row">
              <span style={{ color: 'var(--ink-dim)' }}>AI-modeller och nycklar</span>
              <button className="btn ghost sm" onClick={onOpenAiSettings}>Öppna AI-inställningar...</button>
            </div>
          </div>

          <div>
            <div className="section-title">Avancerat</div>
            <div className="row">
              <label htmlFor="setting-debug">Debug-läge</label>
              <input
                id="setting-debug"
                type="checkbox"
                checked={debugMode}
                onChange={(e) => setDebugMode(e.target.checked)}
              />
            </div>
          </div>
        </div>
        <footer>
          <button className="btn ghost sm" onClick={onClose}>Stäng</button>
        </footer>
      </div>
    </div>
  )
}
