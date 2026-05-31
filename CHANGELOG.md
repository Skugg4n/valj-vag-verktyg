## v0.9.3 — Audit fixes — 2026-05-31

### Fixed
- **Document didn't reload on project switch/import/duplicate/restore** —
  the doc editor kept showing the previous project's prose (and editing
  it could overwrite the new project's scenes). The editor now remounts
  and loads the correct prose on every full-document load.
- **Logged-out data loss** — local projects are now always persisted
  per-project (not only when auto-save was on), so editing project A,
  switching to B, and reloading no longer drops A's edits.
- Reader "Dela" button now opens the export dialog (was a no-op).
- "Sektion" nodes show their label again (were rendering as empty boxes).

## v0.9.2 — Graph→doc scroll sync — 2026-05-31

### Fixed
- Clicking a node in the graph now scrolls the document on the right to
  that scene. Headings are (re)tagged with their `#NNN` id on demand at
  click time — the previous tagging relied on the editor's `update`
  event, which the initial `setContent` doesn't emit, so the scroll
  target was never found.

## v0.9.1 — Node card bugfixes — 2026-05-31

### Fixed
- Doubled/overlapping text on a node card while editing — the read-view
  preview no longer renders under the editor textarea (the line-clamp
  `display` was overriding the `aria-hidden` hide).
- Colour picker now closes on an outside click and when the node is
  deselected (it previously stayed open over the text). Picking a
  swatch still sets the colour and closes the picker.

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

### Added — Variant C completion (2026-05-31)
- **Insikter & analys** modal (sidebar Layers button + ⌘K): scene,
  choice, ending, word counts; longest path; unreachable / orphan /
  dead-end / empty scene detection; loop warning; click a scene to jump
  to it. Pure logic in `storyAnalysis.js` with unit tests.
- **Versionshistorik** modal wired to Firestore history with manual
  "Spara nuvarande som version" (⌘S) and restore — replaces the old
  alert/prompt flow; graceful logged-out state.
- **Projekt-switcher** in the topbar (replaces the bare name input):
  project list with scene count + last edited, switch, new, rename,
  duplicate, delete.
- **Export** modal: JSON backup, Markdown, and a standalone,
  offline-playable **shareable reader HTML** (`buildReaderHTML`).
- **Grafsök**: search overlay that dims non-matching scenes and rings
  matches (title / text / id), with a live match count.
- **Idé-noder**: diagonally-striped fill + dashed border; "Befordra
  till scen"; excluded from Innehåll, Läsa, the shareable reader, and
  the analysis (identified by data flag or persisted `idea-` id prefix).
- Edges are scanned on project load (no more empty graph until first
  edit); reader strips the space a removed ref left before punctuation.

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
