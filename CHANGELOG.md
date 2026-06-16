## v0.13.3 — Workshop: verkstaden subdomain + cursor in the body on select — 2026-06-16

### Added
- **Clicking a scene puts the cursor straight into "Vad händer här?"** so you can
  start writing immediately (cursor at the end of any existing text).

### Fixed
- **`verkstaden.*` subdomain now routes to the workshop at its root** (the route
  match was widened from `verkstad.` to `verkstad(en).`). Needed because the
  `verkstad` DNS record was stuck in Loopia's replication, so we moved to the
  fresh `verkstaden.olabelin.se` which replicates cleanly.

## v0.13.2 — Workshop: branded as "Ola Belins Berättarverkstad" — 2026-06-16

### Changed
- **Renamed to "Ola Belins Berättarverkstad"** — the top-bar brand, the welcome
  modal title, and the browser tab title (while in the workshop).
- **Shorter welcome copy** (two lines): what it is + that the story lives in this
  browser / log in to keep or share it.

## v0.13.1 — Workshop: dedicated subdomain routing — 2026-06-16

### Added
- **A `verkstad.*` subdomain serves the workshop at its root.** When the app is
  loaded from a host starting with `verkstad.` (e.g. verkstad.olabelin.se), `/`
  goes straight to the workshop instead of the advanced app. `/spela/:id` share
  links still work on that host too.

## v0.13.0 — Workshop: welcome modal, working edge-select, tighter rules — 2026-06-16

### Added
- **First-visit welcome modal** explaining, simply, that the story is saved in
  this browser (and to log in to keep/share it). A "?" in the top bar reopens it.

### Fixed
- **Clicking a connection line now actually selects it** (and shows the × to
  delete). Controlled edges were missing an `onEdgesChange` handler, so the
  selection never applied — added one (select-only; structure still comes from
  the `[#ref]`s).

### Security
- **`published` stories can be opened by link but no longer enumerated.** Split
  `allow read` into `allow get: if true; allow list: if false;` so nobody can
  query the whole collection of shared stories.

## v0.12.1 — Workshop: grab a connection anywhere on the line — 2026-06-16

### Changed
- **Click anywhere on a connection line to select it** (wide hit area). The
  selected line highlights and a **×** appears at its middle — click it to
  remove the link. Much easier than aiming for the small endpoint.
  (Endpoint-dragging to delete/reconnect still works too.)

## v0.12.0 — Workshop: scaling cards, yellow default, draggable edges — 2026-06-16

### Added
- **Drag an edge to edit it.** Grab a connection's end and drop it in empty
  space to delete it, or onto another scene to relink it. (Edges are derived
  from the `[#ref]`s, so this rewrites the scene text.)

### Changed
- **Scene cards scale with the text size.** A− / A+ now grows the whole card
  proportionally, so bigger text no longer gets clipped — verified at multiple
  scales (text still truncates with "…", nothing spills).
- **New scenes default to the warm yellow** instead of the blue.

## v0.11.3 — Workshop: stop clipping the connection dots (real root cause) — 2026-06-16

### Fixed
- **The connection dots are no longer clipped.** Root cause found: the card's
  `overflow: hidden` (needed to clip preview text + round the corners) was also
  clipping the handles, which sit on the card edges. Restructured the node so an
  **inner wrapper** does the clipping while the dots live outside it — they can
  never be cut now, including on hover.
- **Preview text ends with "…"** via deterministic truncation in code, instead
  of relying on `-webkit-line-clamp` (which silently failed here because the
  body's computed `display` wasn't `-webkit-box`).
- Verified live in a browser this time (handles full + centred, text truncates
  with "…", card stays a fixed size).

## v0.11.2 — Workshop: version badge, steady cards, add-field reset — 2026-06-16

### Added
- **Version number in the top bar** (e.g. "v0.11.2") so it's always clear which
  build is live — bumped every release.

### Fixed
- **The add-a-choice field no longer appears on scenes you didn't open.** It now
  resets when you select another scene (it used to stay open after adding one).
- **Scene cards have a real fixed size** (set on the node itself, not just CSS),
  so the connection dots sit still and the preview text clamps to 3 lines with
  "…" instead of spilling below the card. (Removed a flex rule that was
  defeating the line clamp.)

## v0.11.1 — Workshop: fix handles, edges, and node text clipping — 2026-06-16

### Fixed
- **Connection lines are back and you can drag-connect again.** v0.11.0 made
  both node handles "source" type, which left edges with no target to attach
  to (so lines vanished and dragging did nothing). Restored a target (left) +
  source (right) handle. Links still go both ways: drag from one scene's right
  dot to another scene's left dot, in any direction.
- **The connection dots no longer jump around.** Scene cards now have a fixed
  height, so the dots stay centred instead of moving as the card is measured.
- **Node text ends cleanly with "…".** Removed the character cap that fought
  the 3-line clamp; the preview now truncates with an ellipsis inside the card
  instead of spilling a half-line below it.
- Connection lines are a touch darker so they read clearly on the canvas.

## v0.11.0 — Workshop: scale control, no popups, new palette, two-way links — 2026-06-16

Big round of on-site usability fixes from live feedback.

### Added
- **Text size control (A− / A+)** in the top bar — scales all editor text so it
  reads well on a projector/TV. Choice is remembered.
- **Type the choice name as you branch.** "+ Lägg till val" is now a single
  field: type what the choice is called and press Enter to create + link a new
  scene. Stays open so you can add several in a row. Existing scenes still
  listed below to link to.
- **Scene markers in the graph:** a "★ Start" badge on the first scene, "Slut"
  on scenes with no choices, and "Tom" on scenes with no text yet — so you can
  see loose ends at a glance.
- **Two-way links.** Scenes can now link in both directions (e.g. die →
  return to the previous scene): drag from either side of a node, or use
  "länka en scen du redan har".

### Changed
- **New colour system.** Replaced the generic blue with a calmer petrol/teal
  accent. Selection is shown by lift + shadow instead of an outline (no more
  outlines). Connection handles are clean rings; lines are a warm grey.
- **The body text field grows with the text** — no manual resizing.
- **No browser popups.** Delete / share / login prompts are now calm in-app
  dialogs and a toast.
- **Playback without the book image.** The reading view is now a clean light
  page (keeps the serif type, drop-cap and choices). Also drops the 1.5 MB
  book image from the bundle.

## v0.10.2 — Workshop polish: copy, dead-ends, calmer UI — 2026-06-16

Round of fixes from a specialist review pass (UX, UI consistency, proxy critic).

### Fixed
- **Reader no longer dead-ends.** If a published story links to a scene that
  was later removed, the book showed an empty page with no way out. It now
  shows "Den här sidan saknas." with a "↺ Börja om" button on the page.
- **No raw scene ids leak to readers.** A choice with no target title used to
  read "Gå till #009"; it now falls back to "Fortsätt".

### Changed
- **Removed all em-dashes from user-facing text** (share button, panel hints,
  export descriptions).
- **Calmer chrome:** the "Dela" button is disabled (with a hint) when there
  are no scenes yet, instead of popping a browser alert. Removed the redundant
  "Byt namn" menu item — the story name is already an inline field — which also
  removes a `prompt()` popup.
- The story menu now closes when you click outside it.
- Brand label "Workshop" → "Berättelseverkstad". Softer end-of-branch copy.

## v0.10.1 — Workshop: fix spaces in scene text — 2026-06-15

### Fixed
- **Could not type spaces in the workshop "Vad händer här?" field.** The
  textarea was controlled by the stored value, which `joinBodyAndChoices`
  trims on every keystroke — so each space was momentarily trailing and got
  stripped before the next character. The field is now driven by local draft
  state (untrimmed while typing); the stored value is still trimmed.

## v0.10.0 — Workshop lite variant + public share link — 2026-06-15

A separate, light, kid-friendly variant for live workshops, parallel to
the advanced app (which is untouched). Reached at `/workshop`.

### Added
- **Workshop editor** (`/workshop`): clean light theme (60/30/10, soft
  shadows, tone-plate scene headers, sharp connector lines). Drag-and-drop
  scene cards on a graph canvas, with a permanent right edit panel
  (name / body / colour / choices).
- **Create-and-link choices**: "+ Lägg till val → Skapa ny scen" makes a
  new scene and links it in one step; or link an existing scene.
- **Story menu**: new / rename / delete / switch between workshop stories
  (tracked separately from advanced projects via `cyoa-workshop-ids`).
- **Book-feel playback** (`Spela upp`): `BookReader` plays the story on a
  real open-book background image, fit-to-page text, drop-cap, A/B choices,
  back / restart.
- **Public share link** (`/spela/:id`): owner publishes a read-only copy to
  a public Firestore collection; anyone with the link reads it in the book
  player **without logging in**. "Sluta dela" unpublishes.
- Continuous Firestore autosave (2s debounce) so nothing is lost.
- Scene model is unified (`type: 'card'`) so a workshop story opens in the
  advanced app and vice-versa. One shared `[#NNN]` ref util (`sceneRefs.js`).

### Deploy note
- Publishing needs the new `published/{shareId}` rule live:
  run `firebase deploy --only firestore:rules`.

## v0.9.5 — Undo for all node edits + two-way scroll sync — 2026-05-31

### Added
- **Doc → graph scroll sync**: scrolling the document now highlights the
  matching scene in the graph and outline (the reverse direction already
  worked). A guard prevents the two scroll directions from fighting.

### Fixed
- **Title, colour and notes edits are now undoable** — they create
  coalesced undo checkpoints like text edits (one step per edit burst),
  so Ctrl+Z reverts them and they're no longer silently discarded by a
  later undo.

## v0.9.4 — Audit fixes, round 2 — 2026-05-31

### Fixed
- **Undo no longer steps one character at a time** — typing in a scene
  now coalesces into a single undo step per edit burst.
- **Delete is consistent and clean** — Backspace and Delete both route
  through one handler (ReactFlow's built-in delete is disabled); deleting
  a scene now strips its `[#NNN]` references from other scenes so no
  dangling links remain.
- Selecting nodes/edges no longer fills the undo stack with no-op entries.
- **Firestore: a deliberately-emptied project now persists** (deletions
  stick) without clobbering a real project during initial load.
- Document status bar reflects real save state ("● Sparar…" / "● Sparad")
  and drops the stray "· skiss" label.
- Reader chapter number follows the reading path, not numeric id order.

### Changed
- "Sektion" creation is disabled for now — the section nodes were
  half-built (overlapped and blocked other nodes). The label rendering
  stays for when the feature is finished.

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
