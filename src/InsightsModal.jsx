import { useEffect, useMemo } from 'react'
import {
  X, HelpCircle, Layers, BookOpen, FileText, RotateCcw, ArrowRight,
} from 'lucide-react'
import { analyzeStory } from './storyAnalysis.js'

function InsightRow({ icon, tone, label, items, onJump, emptyLabel }) {
  return (
    <div className={`insight-row ${tone}`}>
      <div className="insight-head">
        <span className="insight-icon">{icon}</span>
        <span className="insight-label">{label}</span>
        <span className="insight-count">{items.length}</span>
      </div>
      {items.length > 0 ? (
        <div className="insight-chips">
          {items.map(n => (
            <button key={n.id} className="insight-chip" onClick={() => onJump(n.id)}>
              <span className="chip-dot" style={{ background: n.color }} />
              #{n.id} {n.title || 'Namnlös'}
            </button>
          ))}
        </div>
      ) : (
        <div className="insight-ok">{emptyLabel}</div>
      )}
    </div>
  )
}

export default function InsightsModal({ open, onClose, nodes, onJump }) {
  useEffect(() => {
    if (!open) return
    const onKey = e => { if (e.key === 'Escape') onClose?.() }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, onClose])

  const a = useMemo(() => (open ? analyzeStory(nodes) : null), [open, nodes])

  if (!open || !a) return null

  const jump = id => { onJump?.(id); onClose?.() }

  return (
    <div
      className="modal-bg"
      role="dialog"
      aria-modal="true"
      aria-label="Insikter"
      onMouseDown={e => { if (e.target === e.currentTarget) onClose?.() }}
    >
      <div className="modal lg">
        <div className="modal-head">
          <h3>Insikter</h3>
          <button className="btn ghost icon" onClick={onClose} aria-label="Stäng"><X /></button>
        </div>
        <div className="modal-body">
          <div className="stat-grid">
            <div className="stat"><span className="stat-num">{a.sceneCount}</span><span className="stat-lbl">scener</span></div>
            <div className="stat"><span className="stat-num">{a.edgeCount}</span><span className="stat-lbl">vägval</span></div>
            <div className="stat"><span className="stat-num">{a.endings}</span><span className="stat-lbl">slut</span></div>
            <div className="stat"><span className="stat-num">{a.longest.length}</span><span className="stat-lbl">längsta väg</span></div>
            <div className="stat"><span className="stat-num">{a.avgChoices.toFixed(1)}</span><span className="stat-lbl">val/scen</span></div>
            <div className="stat"><span className="stat-num">{a.totalWords}</span><span className="stat-lbl">ord</span></div>
          </div>

          {a.hasCycle && (
            <div className="insight-note">
              <RotateCcw size={14} />
              Berättelsen innehåller loopar (scener som leder tillbaka). Det kan vara avsiktligt.
            </div>
          )}

          <InsightRow icon={<HelpCircle size={15} />} tone="warn" label="Onåbara scener" items={a.unreachable}
            onJump={jump} emptyLabel="Alla scener går att nå från början ✓" />
          <InsightRow icon={<Layers size={15} />} tone="warn" label="Saknar ingång (föräldralösa)" items={a.orphans}
            onJump={jump} emptyLabel="Varje scen har minst en väg in ✓" />
          <InsightRow icon={<BookOpen size={15} />} tone="neutral" label="Återvändsgränder / slut" items={a.deadEnds}
            onJump={jump} emptyLabel="Inga slutscener" />
          <InsightRow icon={<FileText size={15} />} tone="warn" label="Tomma scener" items={a.empty}
            onJump={jump} emptyLabel="Alla scener har text ✓" />

          <div className="insight-row neutral">
            <div className="insight-head">
              <span className="insight-icon"><ArrowRight size={15} /></span>
              <span className="insight-label">Längsta väg genom berättelsen</span>
              <span className="insight-count">{a.longest.length}</span>
            </div>
            {a.longest.length > 0 ? (
              <div className="longest-path">
                {a.longest.map((n, i) => (
                  <span key={n.id} style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                    <button className="insight-chip" onClick={() => jump(n.id)}>
                      <span className="chip-dot" style={{ background: n.color }} />
                      #{n.id} {n.title || 'Namnlös'}
                    </button>
                    {i < a.longest.length - 1 && <span className="path-arrow">→</span>}
                  </span>
                ))}
              </div>
            ) : (
              <div className="insight-ok">Lägg till scener för att se en väg.</div>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
