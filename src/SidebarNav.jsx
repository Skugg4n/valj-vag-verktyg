import { Network, Columns2, FileText, BookOpen, BarChart3, History, Settings, Sun, Moon } from 'lucide-react'

const MODES = [
  { id: 'skiss', label: 'Skiss', icon: Network },
  { id: 'split', label: 'Skiss + Innehåll', icon: Columns2 },
  { id: 'text',  label: 'Innehåll', icon: FileText },
  { id: 'read',  label: 'Läsa', icon: BookOpen },
]

export default function SidebarNav({ mode, setMode, onShowInsights, onShowHistory, onShowSettings, theme = 'dark', onToggleTheme }) {
  return (
    <nav className="sidebar-nav" aria-label="Lägesväxlare">
      <button className="logo" title="Hem" aria-label="Hem" onClick={() => setMode('split')} />
      <div className="sep" aria-hidden="true" />
      {MODES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          className={`sb-btn ${mode === id ? 'active' : ''}`}
          title={label}
          aria-label={label}
          aria-pressed={mode === id}
          onClick={() => setMode(id)}
        >
          <Icon />
        </button>
      ))}
      <div className="spacer" />
      <button className="sb-btn" title="Insikter & analys" aria-label="Insikter & analys" onClick={onShowInsights}>
        <BarChart3 />
      </button>
      <button className="sb-btn" title="Historik" aria-label="Historik" onClick={onShowHistory}>
        <History />
      </button>
      <button
        className="sb-btn"
        title={theme === 'dark' ? 'Ljust tema' : 'Mörkt tema'}
        aria-label={theme === 'dark' ? 'Byt till ljust tema' : 'Byt till mörkt tema'}
        onClick={onToggleTheme}
      >
        {theme === 'dark' ? <Sun /> : <Moon />}
      </button>
      <button className="sb-btn" title="Inställningar" aria-label="Inställningar" onClick={onShowSettings}>
        <Settings />
      </button>
    </nav>
  )
}
