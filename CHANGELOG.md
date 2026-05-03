## v0.9.0 — Modes & Layout Redesign — 2026-05-03

Major UI overhaul derived from the Claude Design handoff
(`docs/design-handoff/`). Single, cohesive shell with four distinct
modes: Skiss, Skiss + Innehåll, Innehåll, Läsa.

### Added
- 56px sidebar nav for mode switching
- Slim 44px topbar with project name, save pill (sparad / sparar…),
  search button, share, and avatar slot
- ⌘K command palette (Lägen / Skapa / Verktyg / Visa / Projekt)
- Settings modal aggregating font-size, auto-save, debug, AI launcher
- DocPane: Google-Docs-style page with collapsible outline, focus
  mode, status bar, accent-pill ref-link rendering
- ReadPane: paper/dark themes, drop-cap, redesigned choice buttons,
  sticky breadcrumb, läsare/redaktör toggle
- GraphPane: floating toolbar, zoom controls, restyled minimap;
  NodeCard restyled with accent-bar + active glow
- Design tokens (full set: bg/panel/line/ink/accent/status), Source
  Serif Pro + JetBrains Mono fonts, vv-prefixed localStorage helpers
- Keyboard shortcuts: ⌘K, 1/2/3/4, Esc; existing ⌘Z/⌘⇧Z/⌘N/⌘D
  preserved
- `pre-redesign-v0.8.2` git tag on master for rollback

### Changed
- App.jsx slimmed dramatically; UI orchestration moves to AppShell
- Light theme dropped (dark-only); reading mode keeps its own
  paper/dark toggle
- Project switcher / new project / import / export / auto-layout /
  history all reachable through the command palette
- LinearView scroll fix preserved (manual DOM scroll for ProseMirror)

### Removed
- FloatingMenu component (replaced by command palette)
- LinearView component (replaced by DocPane)
- Playthrough modal (replaced by ReadPane mode)
- `[data-theme="light"]` block in theme.css
- Legacy CSS aliases (--text, --btn, --modal-bg, --radius, --gap)
