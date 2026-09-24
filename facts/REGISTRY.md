# Project Registry

## Core Components
| Name | Path | Description | Related |
|------|------|-------------|---------|
| App | src/App.jsx | Root data/state + handlers; renders AppShell + modals | → AppShell, all panes/modals |
| main | src/main.jsx | Entry point with ErrorBoundary + AuthProvider | → App, AuthContext |
| AppShell | src/AppShell.jsx | Mode state (skiss/split/text/read), splitRatio, focus, keyboard (⌘K, 1–4, Esc) | → SidebarNav, Topbar |
| SidebarNav | src/SidebarNav.jsx | 56px left rail: mode buttons + Insikter/Historik/Inställningar | → AppShell |
| Topbar | src/Topbar.jsx | Slim 44px bar: project menu slot, save pill, search, share, avatar | → AppShell, ProjectMenu, UserMenu |
| GraphPane | src/GraphPane.jsx | Skiss/Split graph wrapper: ReactFlow, toolbar, zoom, minimap, scene search | → NodeCard |
| DocPane | src/DocPane.jsx | Innehåll doc editor (TipTap) with outline, focus mode, status bar | → TipTap extensions |
| PublicRead | src/PublicRead.jsx | /las/:id working link: read view with marks and cues, stage mode, read-only scene map | → ReadPane, StagePane, useFirestoreSync |
| StagePane | src/StagePane.jsx | Scenläge: fullscreen reader for reader + musician, {cues} as bubbles, green/red choices, keyboard | → ReadPane, stageCues |
| ReadPane | src/ReadPane.jsx | Läsa mode: paper/dark, drop-cap, choices, breadcrumb | → App |
| NodeCard | src/NodeCard.jsx | Graph node card (accent bar, active glow, idea styling, search dim/match) | → GraphPane, constants |
| CommandPalette | src/CommandPalette.jsx | ⌘K palette (Lägen/Skapa/Verktyg/Visa/Projekt) | → App |
| SettingsModal | src/SettingsModal.jsx | Font-size, auto-save, debug, AI launcher | → App |
| InsightsModal | src/InsightsModal.jsx | Insikter & analys (bild 4): stats, scene-health rows, longest path | → storyAnalysis |
| HistoryModal | src/HistoryModal.jsx | Versionshistorik (bild 5): Firestore versions, save (⌘S), restore | → useFirestoreSync |
| ExportModal | src/ExportModal.jsx | Export: JSON / Markdown / shareable reader HTML | → buildReaderHTML |
| ProjectMenu | src/ProjectMenu.jsx | Topbar project switcher: list/switch/new/rename/duplicate/delete | → App |
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
| ActiveNodeHighlight | src/ActiveNodeHighlight.ts | Highlights active node in editor | → LinearView |
| SceneRef | src/SceneRef.ts | TipTap pill for `[NNN]` scene references; serialises `[NNN]` | → DocPane |
| SearchReplace | src/SearchReplace.ts | TipTap extension: find matches, decorations, next/prev, replace/replaceAll | → DocPane, FindBar |
| FindBar | src/FindBar.jsx | Search-and-replace bar in the document (⌘F) | → DocPane |
| BracketAutoClose | src/BracketAutoClose.ts | `[` inserts `[]`; `]` completes a `[NNN]` pill or skips over | → DocPane |

## Hooks
| Name | Path | Description | Related |
|------|------|-------------|---------|
| theme | src/theme.js | useTheme(): system/light/dark preference, stamps data-theme, toggle | → App, SettingsModal, SidebarNav |
| useProjectStorage | src/useProjectStorage.js | LocalStorage CRUD for projects | → App |
| useFirestoreSync | src/useFirestoreSync.js | Firestore sync + history (saveHistorySnapshot, getHistory) | → App, firebase, HistoryModal |
| useAi | src/useAi.js | AI integration (inactive) | → AiSettingsModal |

## Utilities
| Name | Path | Description | Related |
|------|------|-------------|---------|
| docSync | src/utils/docSync.ts | nodesToDoc / docToNodes (nodes are the source of truth), chooseNextSceneId | → DocPane, App |
| stageCues | src/stageCues.js | extractCues / stripCues / splitMarkers for {cue} instructions | → StagePane, ReadPane, App |
| graphNav | src/utils/graphNav.ts | pickNodeInDirection for cmd+arrow | → App |
| manuscriptImport | src/utils/manuscriptImport.ts | parseManuscript: markdown manus → nodes (h1/h2 `[NNN]` headings, refs, layered layout) | → App |
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

## Workshop Variant (Lite)
> Separate light variant for live workshops. Reached at `/workshop`; public
> reader at `/spela/:shareId`. Scenes use `type: 'card'` so stories are
> shared with the advanced app. See `docs/superpowers/specs/2026-06-15-*`.

| Name | Path | Description | Related |
|------|------|-------------|---------|
| WorkshopApp | src/WorkshopApp.jsx | Workshop orchestrator: graph+drag canvas, story menu, autosave, publish/share, playback overlay | → WorkshopNode, WorkshopEditPanel, BookReader |
| WorkshopNode | src/WorkshopNode.jsx | Light tone-plate scene card for the workshop graph | → WorkshopApp, sceneRefs |
| WorkshopEditPanel | src/WorkshopEditPanel.jsx | Permanent right pane: name/body/colour/choices, create-and-link | → WorkshopApp, sceneRefs |
| BookReader | src/BookReader.jsx | Book-spread playback (fit-to-page, drop-cap, A/B choices) | → WorkshopApp, PublicReader, sceneRefs |
| PublicReader | src/PublicReader.jsx | No-login reader for /spela/:id — loads published copy | → BookReader, useFirestoreSync |
| sceneRefs | src/sceneRefs.js | Canonical [#NNN] parser (refIds, parseScene, split/joinBodyAndChoices) | → WorkshopNode, WorkshopEditPanel, BookReader |
| routing | src/routing.js | parseRoute(pathname) → app/workshop/play; shareUrl() | → main |
| storyExport | src/storyExport.js | isScene(), toPublishedNodes() for publishing | → WorkshopApp |
| shareId | src/utils/shareId.js | makeShareId() → 7-char base36 | → WorkshopApp |
| workshopTheme.css | src/workshopTheme.css | Light 60/30/10 tokens scoped to [data-app=workshop] | → WorkshopApp.css |
| WorkshopApp.css | src/WorkshopApp.css | Workshop editor styling | → WorkshopApp |
| BookReader.css | src/BookReader.css | Book-spread player styling | → BookReader |
| book-spread.jpg | src/assets/book-spread.jpg | Self-hosted open-book background image | → BookReader |

## Tests
| Name | Path | Description | Related |
|------|------|-------------|---------|
| sceneRefs.test | src/__tests__/sceneRefs.test.js | [#NNN] parse/split/join tests | → sceneRefs |
| routing.test | src/__tests__/routing.test.js | parseRoute / shareUrl tests | → routing |
| NodeClick.test | src/__tests__/NodeClick.test.jsx | Node click behavior tests | → NodeCard |
| NodeSize.test | src/__tests__/NodeSize.test.jsx | Node sizing tests | → NodeCard |
| ProjectStorage.test | src/__tests__/ProjectStorage.test.jsx | Storage CRUD tests | → useProjectStorage |
| docSync.test | src/__tests__/docSync.test.ts | Round trip, existence rule, baseline guard | → docSync |
| graphNav.test | src/__tests__/graphNav.test.ts | Direction picking | → graphNav |
| theme.test | src/__tests__/theme.test.jsx | resolveTheme + useTheme (persist, toggle, OS change) | → theme |
| manuscriptImport.test | src/__tests__/manuscriptImport.test.ts | Manuscript parsing, refs, empty scenes, layout | → manuscriptImport |
| SearchReplace.test | src/__tests__/SearchReplace.test.ts | Matching, cycling, replace | → SearchReplace |
| plainForReader.test | src/__tests__/plainForReader.test.js | Published text is plain (no markdown markers) | → App |
| PublicRead.test | src/__tests__/PublicRead.test.jsx | Rich copy preferred, tabs, no share button | → PublicRead |
| StagePane.test | src/__tests__/StagePane.test.jsx | Bubbles, markers, choice colours, keys | → StagePane |
| stageCues.test | src/__tests__/stageCues.test.js | Cue extraction and stripping | → stageCues |
| SceneRef.test | src/__tests__/SceneRef.test.ts | Pill parse/serialise, bracket auto-close | → SceneRef |
| NodeCardFocus.test | src/__tests__/NodeCardFocus.test.jsx | Title focus after cmd+Enter | → NodeCard |
| GraphPaneBridge.test | src/__tests__/GraphPaneBridge.test.jsx | viewportRef exposure | → GraphPane |
| Topbar.test | src/__tests__/Topbar.test.jsx | Saved-time pill | → Topbar |
| createLinkedScene.test | src/__tests__/createLinkedScene.test.js | chooseNextSceneId invariant after a doc flush | → docSync |

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
| published/{shareId} | Public read-only story copy (read: any, write: owner) | → PublicReader, useFirestoreSync |
