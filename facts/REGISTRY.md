# Project Registry

> **Note:** Reflects the v0.9.0 "Variant C" modes-and-layout redesign on
> branch `feature/redesign-modes-and-layout` (not yet merged to master).
> Apply on merge. `LinearView`, `Playthrough`, `FloatingMenu` are removed
> there; the shell/mode/modal components below replace them.

## Core Components
| Name | Path | Description | Related |
|------|------|-------------|---------|
| App | src/App.jsx | Root data/state + handlers; renders AppShell + modals | → AppShell, all panes/modals |
| main | src/main.jsx | Entry point with ErrorBoundary + AuthProvider | → App, AuthContext |
| AppShell | src/AppShell.jsx | Mode state (skiss/split/text/read), splitRatio, focus, keyboard (⌘K, 1–4, Esc) | → SidebarNav, Topbar |
| SidebarNav | src/SidebarNav.jsx | 56px left rail: mode buttons + Insikter/Historik/Inställningar | → AppShell |
| Topbar | src/Topbar.jsx | Slim 44px bar: project menu slot, save pill, search, share, avatar | → AppShell, ProjectMenu, UserMenu |
| GraphPane | src/GraphPane.jsx | Skiss/Split graph wrapper: ReactFlow, toolbar, zoom, minimap, scene search | → NodeCard |
| DocPane | src/DocPane.jsx | Innehåll doc editor (TipTap) with outline, focus mode, status bar | → LinearTextEditor exts |
| ReadPane | src/ReadPane.jsx | Läsa mode: paper/dark, drop-cap, choices, breadcrumb | → App |
| NodeCard | src/NodeCard.jsx | Graph node card (accent bar, active glow, idea styling, search dim/match) | → GraphPane, constants |
| CommandPalette | src/CommandPalette.jsx | ⌘K palette (Lägen/Skapa/Verktyg/Visa/Projekt) | → App |
| SettingsModal | src/SettingsModal.jsx | Font-size, auto-save, debug, AI launcher | → App |
| InsightsModal | src/InsightsModal.jsx | Insikter & analys (bild 4): stats, scene-health rows, longest path | → storyAnalysis |
| HistoryModal | src/HistoryModal.jsx | Versionshistorik (bild 5): Firestore versions, save (⌘S), restore | → useFirestoreSync |
| ExportModal | src/ExportModal.jsx | Export: JSON / Markdown / shareable reader HTML | → buildReaderHTML |
| ProjectMenu | src/ProjectMenu.jsx | Topbar project switcher: list/switch/new/rename/duplicate/delete | → App |
| LinearTextEditor | src/LinearTextEditor.tsx | TipTap editor wrapper | → DocPane |
| EditorToolbar | src/EditorToolbar.jsx | Formatting toolbar for editor | → DocPane |
| EditorBubbleMenu | src/EditorBubbleMenu.jsx | Floating format menu on text selection | → DocPane |
| NewProjectModal | src/NewProjectModal.jsx | New project dialog | → App |
| UserMenu | src/UserMenu.jsx | Auth/user dropdown menu | → App, AuthContext, Topbar |
| Markdown | src/Markdown.jsx | Markdown rendering component | → General |
| Button | src/Button.jsx | Reusable button component | → General |

## Editor Extensions
| Name | Path | Description | Related |
|------|------|-------------|---------|
| CustomLink | src/CustomLink.ts | TipTap link extension | → LinearView |
| ArrowLink | src/ArrowLink.ts | TipTap node reference link (→ #NNN) | → LinearView |
| ActiveNodeHighlight | src/ActiveNodeHighlight.ts | Highlights active node in editor | → LinearView |

## Hooks
| Name | Path | Description | Related |
|------|------|-------------|---------|
| useProjectStorage | src/useProjectStorage.js | LocalStorage CRUD for projects | → App |
| useFirestoreSync | src/useFirestoreSync.js | Firestore sync + history (saveHistorySnapshot, getHistory) | → App, firebase, HistoryModal |
| useLinearParser | src/useLinearParser.ts | Parses linear text → node structure | → App, LinearView |
| useAi | src/useAi.js | AI integration (inactive) | → AiSettingsModal |

## Utilities
| Name | Path | Description | Related |
|------|------|-------------|---------|
| linearConversion | src/utils/linearConversion.ts | Converts nodes ↔ linear text (excludes ideas/groups) | → useLinearParser, DocPane |
| storyAnalysis | src/storyAnalysis.js | Pure CYOA structural analysis (reachability, dead ends, longest path, loops) | → InsightsModal |
| buildReaderHTML | src/utils/buildReaderHTML.js | Generates standalone offline-playable reader HTML + downloadFile | → ExportModal |
| persistence | src/utils/persistence.js | vv-prefixed localStorage load/save | → AppShell, ReadPane |
| parseText | src/parseText.js | Text parsing helpers | → App |
| dagreLayout | src/dagreLayout.ts | Dagre-based auto-layout for graph | → App |
| constants | src/constants.js | Default node dimensions | → NodeCard, App |
| debug | src/utils/debug.js | Debug logging utility | → General |

## Auth & Storage
| Name | Path | Description | Related |
|------|------|-------------|---------|
| AuthContext | src/AuthContext.jsx | Firebase auth context provider | → App, UserMenu |
| firebase | src/firebase.js | Firebase init and config | → useFirestoreSync, AuthContext |

## Styles
| Name | Path | Description | Related |
|------|------|-------------|---------|
| index.css | src/index.css | Base styles + component CSS | → All components |
| theme.css | src/theme.css | CSS custom properties (light/dark) | → index.css |
| App.css | src/App.css | Empty (unused) | — |

## AI Components (Inactive)
| Name | Path | Description | Related |
|------|------|-------------|---------|
| AiSettingsModal | src/AiSettingsModal.jsx | AI settings dialog | → useAi |
| AiSuggestionsPanel | src/AiSuggestionsPanel.jsx | AI suggestions panel | → useAi |
| AiProofreadPanel | src/AiProofreadPanel.jsx | AI proofreading panel | → useAi |

## Tests
| Name | Path | Description | Related |
|------|------|-------------|---------|
| ArrowLink.test | src/__tests__/ArrowLink.test.ts | Arrow link extension tests | → ArrowLink |
| LinearConversion.test | src/__tests__/LinearConversion.test.ts | Node ↔ linear conversion tests | → linearConversion |
| LinearParser.test | src/__tests__/LinearParser.test.ts | Linear parser tests | → useLinearParser |
| NodeClick.test | src/__tests__/NodeClick.test.jsx | Node click behavior tests | → NodeCard |
| NodeSize.test | src/__tests__/NodeSize.test.jsx | Node sizing tests | → NodeCard |
| ProjectStorage.test | src/__tests__/ProjectStorage.test.jsx | Storage CRUD tests | → useProjectStorage |

## Config
| Name | Path | Description | Related |
|------|------|-------------|---------|
| vite.config | vite.config.js | Vite config — injects version + git hash | → package.json |
| firebase.json | firebase.json | Firebase project config | → firestore.rules |
| firestore.rules | firestore.rules | Firestore security rules | → firebase |
| eslint.config | eslint.config.js | ESLint configuration | — |
| jest.config | jest.config.cjs | Jest test configuration | → Tests |

## Firestore Structure
| Collection | Description | Related |
|------------|-------------|---------|
| users/{uid}/projects/{id} | Project data (nodes, name, nextId) | → useFirestoreSync |
| users/{uid}/projects/{id}/history/{auto} | Auto-snapshots every 5 min | → useFirestoreSync |
