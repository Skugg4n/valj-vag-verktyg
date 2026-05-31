import { useState, useRef, useEffect } from 'react'
import { ChevronDown, Copy, Trash2, FilePlus, Pencil, Upload, Download, History } from 'lucide-react'

function timeAgo(ts) {
  if (!ts) return ''
  const s = Math.floor((Date.now() - ts) / 1000)
  if (s < 60) return 'nyss'
  if (s < 3600) return `${Math.floor(s / 60)} min sedan`
  if (s < 86400) return `${Math.floor(s / 3600)} tim sedan`
  return new Date(ts).toLocaleDateString('sv-SE', { day: 'numeric', month: 'short' })
}

// projects: [{ id, name, nodeCount, updated }] sorted newest-first.
export default function ProjectMenu({
  projects = [],
  currentId,
  currentName,
  ops = {},
  onNew,
  onRename,
  onImport,
  onExport,
  onHistory,
}) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    const onDoc = e => { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [open])

  return (
    <div className="proj-menu" ref={ref}>
      <button className="proj-trigger" onClick={() => setOpen(o => !o)} title="Projekt" aria-haspopup="menu" aria-expanded={open}>
        <span className="proj-trigger-name">{currentName?.trim() || 'Namnlös berättelse'}</span>
        <ChevronDown size={14} />
      </button>
      {open && (
        <div className="proj-pop" role="menu">
          <div className="proj-pop-section">Projekt · {projects.length}</div>
          <div className="proj-list">
            {projects.map(p => (
              <button
                key={p.id}
                className={`proj-item ${p.id === currentId ? 'active' : ''}`}
                onClick={() => { ops.switchProject?.(p.id); setOpen(false) }}
              >
                <span className="proj-item-main">
                  <span className="proj-item-name">{p.name?.trim() || 'Namnlös'}</span>
                  <span className="proj-item-meta">{p.nodeCount} scener · {timeAgo(p.updated)}</span>
                </span>
                <span className="proj-item-tools">
                  <span
                    className="proj-mini"
                    role="button"
                    tabIndex={0}
                    title="Duplicera"
                    onClick={e => { e.stopPropagation(); ops.duplicateProject?.(p.id); setOpen(false) }}
                  >
                    <Copy size={13} />
                  </span>
                  {projects.length > 1 && (
                    <span
                      className="proj-mini danger"
                      role="button"
                      tabIndex={0}
                      title="Radera"
                      onClick={e => {
                        e.stopPropagation()
                        if (confirm(`Radera "${p.name?.trim() || 'Namnlös'}"? Detta går inte att ångra.`)) {
                          ops.deleteProject?.(p.id)
                          setOpen(false)
                        }
                      }}
                    >
                      <Trash2 size={13} />
                    </span>
                  )}
                </span>
              </button>
            ))}
          </div>
          <div className="proj-pop-divider" />
          <button className="proj-action" onClick={() => { setOpen(false); onNew?.() }}><FilePlus size={15} /> Nytt projekt</button>
          <button className="proj-action" onClick={() => { setOpen(false); onRename?.() }}><Pencil size={15} /> Byt namn</button>
          <button className="proj-action" onClick={() => { setOpen(false); onImport?.() }}><Upload size={15} /> Importera…</button>
          <button className="proj-action" onClick={() => { setOpen(false); onExport?.() }}><Download size={15} /> Exportera…</button>
          <button className="proj-action" onClick={() => { setOpen(false); onHistory?.() }}><History size={15} /> Versionshistorik</button>
        </div>
      )}
    </div>
  )
}
