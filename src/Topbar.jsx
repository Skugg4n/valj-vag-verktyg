import { Search, Share2 } from 'lucide-react'

export default function Topbar({
  projectName,
  setProjectName,
  isSaving,
  onCmdK,
  onShare,
  onAvatarClick,
}) {
  return (
    <header className="topbar">
      <input
        className="project-name"
        value={projectName}
        onChange={e => setProjectName(e.target.value)}
        placeholder="Projektnamn"
        aria-label="Projektnamn"
      />
      <span className={`pill ${isSaving ? 'saving' : ''}`} aria-live="polite">
        <span className="dot" aria-hidden="true" />
        {isSaving ? 'sparar…' : 'sparad'}
      </span>
      <span style={{ flex: 1 }} />
      <button className="btn ghost sm" onClick={onCmdK} title="Sök / Kommandopalett">
        <Search />
        Sök
        <span className="kbd">⌘K</span>
      </button>
      <button className="btn ghost icon" onClick={onShare} title="Dela" aria-label="Dela">
        <Share2 />
      </button>
      <span className="divider" aria-hidden="true" />
      <button className="avatar" onClick={onAvatarClick} title="Konto" aria-label="Konto" />
    </header>
  )
}
