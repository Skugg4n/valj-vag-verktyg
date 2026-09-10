# Project Rules — Välj Väg Verktyg

> Registrerat i Atlas (`/atlas-continue` hittar tillbaka). Manifest: `atlas.json`.

## Version Management
- Current version: 0.15.0
- Single source of truth: `package.json` → `version`
- Vite injects `__APP_VERSION__` and `__GIT_HASH__` at build time
- Version sources (update ALL on bump):
  - [ ] `package.json` — version field
  - [ ] Git commit message should include version tag

## Commands
- Dev: `npm run dev`
- Build: `npm run build`
- Test: `npx jest`
- Lint: `npx eslint src/`

## Deploy
- Hosting: Vercel (auto-deploy from git push)
- Firebase: Firestore for data sync (eur3 region)
- Production: Push to `master` branch
- Staging: Feature branches with Vercel preview deploys

## Safety Net
- Rollback: Revert via Vercel dashboard or `git revert`
- Pre-deploy tag: `git tag pre-deploy-vX.Y.Z`
- Database: Firestore with automatic history snapshots (every 5 min per project)

## Tech Stack
- React 19 + Vite 6 (frontend)
- ReactFlow 11 (node graph visualization)
- TipTap 2 (rich text editor, ProseMirror-based)
- Dagre (graph auto-layout)
- Firebase Auth + Firestore (auth & sync)
- Headless UI + Lucide React (UI components & icons)
- CSS custom properties for theming (no Tailwind — plain CSS)

## File Structure
- `src/` — all source code
- `src/__tests__/` — Jest tests
- `src/utils/` — utility functions
- `src/assets/` — static assets
- `facts/` — project documentation
- `docs/plans/` — implementation plans

## Conventions
- No Tailwind utility classes — use CSS custom properties from `theme.css`
- Use `.btn` / `.btn.ghost` / `.btn.primary` / `.btn.danger` class system for buttons
- Node IDs are 3-digit zero-padded strings: `#001`, `#002`, etc.
- State management via React useState/useRef in App.jsx (no Redux/Zustand)
- Swedish UI labels, English code

## Testing
- Run all: `npx jest`
- Run single: `npx jest --testPathPattern=<name>`
- Tests in `src/__tests__/*.test.{ts,tsx,jsx}`

## Gotchas
- ProseMirror `scrollIntoView()` doesn't scroll to top — use manual DOM scroll
- Edge scanning uses regex `/\[#(\d{3})]|#(\d{3})/g` — must match this pattern
- All Tailwind classes were replaced with plain CSS in v0.8.1 — don't reintroduce them
- App.jsx is 1280+ lines — main state lives here, be careful with refactors

## Document Routing
- **Find a component/file:** → `facts/REGISTRY.md`
- **Product vision:** → `facts/VISION.md`
- **Architecture & priorities:** → `facts/STRATEGY.md`
- **Past mistakes & rules:** → `facts/LESSONS.md`
- **Ideas & backlog:** → `facts/IDEAS.md`
- **Design decisions:** → `facts/decisions/`
- **Implementation plans:** → `docs/plans/`

## Auto-Update Triggers
| Trigger | Action |
|---------|--------|
| Create new component/file | Add entry to `facts/REGISTRY.md` |
| Rename or move a file | Update path in `facts/REGISTRY.md` |
| Delete a file | Remove entry from `facts/REGISTRY.md` |
| Make a design decision | Add to `facts/STRATEGY.md` |
| Make a mistake or discovery | Add to `facts/LESSONS.md` |
| Have an idea during work | Add to `facts/IDEAS.md` under New Ideas |
| Deploy | Version bump all sources + add `CHANGELOG.md` entry |
| Complete a feature | Update `PROJECTPLAN.md` + verify `facts/REGISTRY.md` |
