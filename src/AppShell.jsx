import { useState, useEffect, useCallback } from 'react'
import SidebarNav from './SidebarNav.jsx'
import Topbar from './Topbar.jsx'
import { loadLS, saveLS } from './utils/persistence.js'

const MODES = ['skiss', 'split', 'text', 'read']

export default function AppShell({
  projectName, setProjectName,
  isSaving,
  renderSkiss,
  renderSplit,
  renderText,
  renderRead,
  onShowHistory,
  onOpenPalette,
  onShowSettings,
  onShare,
  onAvatarClick,
}) {
  const [mode, setModeRaw] = useState(() => {
    const m = loadLS('mode', 'split')
    return MODES.includes(m) ? m : 'split'
  })
  const [splitRatio, setSplitRatio] = useState(() => {
    const r = loadLS('split-ratio', 0.42)
    return clampRatio(typeof r === 'number' ? r : 0.42)
  })
  const [focusMode, setFocusMode] = useState(false)

  const setMode = useCallback((m) => {
    if (!MODES.includes(m)) return
    setModeRaw(m)
    saveLS('mode', m)
    if (m !== 'text') setFocusMode(false)
  }, [])

  useEffect(() => {
    saveLS('split-ratio', splitRatio)
  }, [splitRatio])

  useEffect(() => {
    const onKey = (e) => {
      const inEditable =
        e.target.tagName === 'INPUT' ||
        e.target.tagName === 'TEXTAREA' ||
        e.target.isContentEditable
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault()
        onOpenPalette?.()
        return
      }
      if (e.key === 'Escape' && focusMode) {
        e.preventDefault()
        setFocusMode(false)
        return
      }
      if (!inEditable && ['1', '2', '3', '4'].includes(e.key)) {
        e.preventDefault()
        setMode(MODES[Number(e.key) - 1])
      }
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [focusMode, setMode, onOpenPalette])

  let workspace = null
  if (mode === 'skiss') workspace = renderSkiss?.()
  else if (mode === 'split') workspace = renderSplit?.({ ratio: splitRatio, setRatio: setSplitRatio })
  else if (mode === 'text') workspace = renderText?.({ focusMode, setFocusMode })
  else if (mode === 'read') workspace = renderRead?.()

  const shellClass = `app-shell${focusMode && mode === 'text' ? ' focus-mode' : ''}`

  return (
    <div className={shellClass}>
      <SidebarNav
        mode={mode}
        setMode={setMode}
        onShowHistory={onShowHistory}
        onShowSettings={onShowSettings}
      />
      <div className="right-col">
        <Topbar
          projectName={projectName}
          setProjectName={setProjectName}
          isSaving={isSaving}
          onCmdK={onOpenPalette}
          onShare={onShare}
          onAvatarClick={onAvatarClick}
        />
        <div className="workspace">{workspace}</div>
      </div>
      {focusMode && mode === 'text' && (
        <button
          className="btn ghost sm"
          style={{ position: 'fixed', top: 16, right: 16, zIndex: 30 }}
          onClick={() => setFocusMode(false)}
        >
          Avsluta fokus
        </button>
      )}
    </div>
  )
}

export function clampRatio(r) {
  if (Number.isNaN(r)) return 0.42
  return Math.max(0.2, Math.min(0.8, r))
}
