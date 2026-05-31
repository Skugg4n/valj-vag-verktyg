import { useEffect, useMemo, useRef, useState } from 'react'
import {
  Network, Columns2, FileText, BookOpen,
  Plus, FilePlus, LayoutGrid,
  RotateCcw, RotateCw, Upload, Download,
  History, Settings, HelpCircle, Layers, Lightbulb, BarChart3,
} from 'lucide-react'

export default function CommandPalette({ open, onClose, actions, extraSection }) {
  const [q, setQ] = useState('')
  const [hi, setHi] = useState(0)
  const inputRef = useRef(null)

  useEffect(() => {
    if (open) {
      setQ('')
      setHi(0)
      requestAnimationFrame(() => inputRef.current?.focus())
    }
  }, [open])

  const sections = useMemo(() => {
    const built = buildSections(actions)
    if (extraSection?.items?.length) built.push(extraSection)
    return built
  }, [actions, extraSection])

  const flat = useMemo(() => {
    const items = []
    for (const s of sections) {
      for (const it of s.items) {
        if (!q || it.label.toLowerCase().includes(q.toLowerCase())) {
          items.push({ ...it, section: s.title })
        }
      }
    }
    return items
  }, [sections, q])

  useEffect(() => { setHi(0) }, [q])

  if (!open) return null

  const onKey = (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); setHi(h => Math.min(h + 1, flat.length - 1)) }
    else if (e.key === 'ArrowUp') { e.preventDefault(); setHi(h => Math.max(h - 1, 0)) }
    else if (e.key === 'Enter') { e.preventDefault(); flat[hi]?.run?.(); onClose?.() }
    else if (e.key === 'Escape') { e.preventDefault(); onClose?.() }
  }

  let lastSection = null
  return (
    <div className="cmd-bg" role="dialog" aria-modal="true" onMouseDown={(e) => { if (e.target === e.currentTarget) onClose?.() }}>
      <div className="cmd-palette">
        <input
          ref={inputRef}
          className="cmd-input"
          placeholder="Skriv ett kommando..."
          value={q}
          onChange={(e) => setQ(e.target.value)}
          onKeyDown={onKey}
          aria-label="Sök kommando"
        />
        <div className="cmd-list">
          {flat.length === 0 && (
            <div className="cmd-item" style={{ color: 'var(--ink-dim)' }}>Inga träffar.</div>
          )}
          {flat.map((it, i) => {
            const sectionHeader = it.section !== lastSection ? (lastSection = it.section) : null
            return (
              <div key={`${it.id}-${i}`}>
                {sectionHeader && <div className="cmd-section">{sectionHeader}</div>}
                <button
                  className={`cmd-item${i === hi ? ' active' : ''}`}
                  onMouseEnter={() => setHi(i)}
                  onClick={() => { it.run?.(); onClose?.() }}
                >
                  <span className="cmd-icon">{it.icon}</span>
                  <span>{it.label}</span>
                  {it.shortcut && <span className="kbd cmd-shortcut">{it.shortcut}</span>}
                </button>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

function buildSections(a) {
  return [
    {
      title: 'Lägen',
      items: [
        { id: 'mode-skiss', label: 'Skiss',           icon: <Network />,    shortcut: '1', run: () => a.setMode?.('skiss') },
        { id: 'mode-split', label: 'Skiss + Innehåll', icon: <Columns2 />,   shortcut: '2', run: () => a.setMode?.('split') },
        { id: 'mode-text',  label: 'Innehåll',        icon: <FileText />,   shortcut: '3', run: () => a.setMode?.('text') },
        { id: 'mode-read',  label: 'Läsa',            icon: <BookOpen />,   shortcut: '4', run: () => a.setMode?.('read') },
      ],
    },
    {
      title: 'Skapa',
      items: [
        { id: 'new-node',    label: 'Ny nod',          icon: <Plus />,       shortcut: '⌘N', run: a.addNode },
        { id: 'new-project', label: 'Nytt projekt...', icon: <FilePlus />,                  run: a.newProject },
        { id: 'auto-layout', label: 'Auto-layout',     icon: <LayoutGrid />,                run: a.autoLayout },
        { id: 'add-idea',    label: 'Idé',             icon: <Lightbulb />,                 run: a.addIdea },
      ],
    },
    {
      title: 'Verktyg',
      items: [
        { id: 'undo',     label: 'Ångra',          icon: <RotateCcw />, shortcut: '⌘Z',   run: a.undo },
        { id: 'redo',     label: 'Gör om',         icon: <RotateCw />,  shortcut: '⌘⇧Z', run: a.redo },
        { id: 'import',   label: 'Importera JSON...', icon: <Upload />,                    run: a.importProject },
        { id: 'export',   label: 'Exportera...',   icon: <Download />,                     run: a.showExport },
      ],
    },
    {
      title: 'Visa',
      items: [
        { id: 'insights', label: 'Insikter & analys...', icon: <BarChart3 />, run: a.showInsights },
        { id: 'history',  label: 'Versionshistorik...', icon: <History />,    run: a.showHistory },
        { id: 'settings', label: 'Inställningar...', icon: <Settings />,   run: a.showSettings },
        { id: 'help',     label: 'Hjälp',            icon: <HelpCircle />, run: a.openHelp },
      ],
    },
  ]
}
