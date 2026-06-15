# Spec — Workshop "lite" variant + public share link

**Status:** Approved in brainstorming by Ola 2026-06-15.
**Target:** `valj-vag-verktyg` (same codebase, same Firestore, same Vercel deploy).
**Branch:** cut a fresh `feature/workshop-lite` from `master`.

## Goal

A clean, light, kid-friendly variant for **live workshops** (facilitator at a
computer with a projector, deciding a branching story together with children),
plus a **public share link** so the kids can later open the finished story
without logging in. The existing advanced app is left untouched.

Inspired by textaventyr.se's simplicity, but prettier ("frontend-snyggt"):
calm light palette, soft-shadowed node cards, sharp connector lines, tone-plates
instead of borders. Playback uses a real **book** look (a book-spread background
image with the text laid over the pages), reused from Ola's existing book
player.

## Non-negotiables (from Ola)

- Owner (logged in) can edit. **Anyone with the link can view without logging in.**
- Stories autosave continuously — nothing is ever lost.
- Drag-and-drop nodes to rearrange the layout.
- Small content: ~10–20 scenes, short texts.
- Light mode for the editor; book feel for playback.
- Ship something that works; reuse as much as possible.

## Three entry points (one codebase)

Routing added in `src/main.jsx` by reading `window.location.pathname`
(no router library needed for 3 routes; keeps it minimal). Add `vercel.json`
with an SPA rewrite so deep paths serve `index.html`.

| Path | Renders | Auth |
|---|---|---|
| `/` (and anything unmatched) | existing advanced `App` (dark, untouched) | as today |
| `/workshop` (optionally `/workshop/:projectId`) | `WorkshopApp` (light editor) | required (facilitator) |
| `/spela/:shareId` | `PublicReader` → `BookReader` | **none** |

`vercel.json`:
```json
{ "rewrites": [{ "source": "/(.*)", "destination": "/index.html" }] }
```

The advanced app's `?play`/internal mode behavior is unaffected (those are
state, not routes).

## Public share / publish (the only new backend)

### Firestore: new public collection

`published/{shareId}` document:
```
{
  title:        string,
  nodes:        [{ id, title, text, color }],   // scenes only (idea/group excluded)
  ownerUid:     string,
  sourceProjectId: string,
  createdAt:    serverTimestamp,
  updatedAt:    serverTimestamp,
}
```

### Security rules (append to `firestore.rules`)

```
match /published/{shareId} {
  allow read: if true;                                   // anyone can play
  allow create: if request.auth != null
                && request.resource.data.ownerUid == request.auth.uid;
  allow update, delete: if request.auth != null
                && resource.data.ownerUid == request.auth.uid;
}
```
The existing `users/{userId}/**` rule is unchanged.

### Publish flow

- Each project gets a stable `shareId` (short, ~7 chars, base36) generated once
  and stored on the project (`project.data.shareId`), so the link never changes.
- "Dela" in the WorkshopApp writes/overwrites `published/{shareId}` with the
  current scenes and shows `https://<host>/spela/<shareId>` (copy button).
- Re-publishing updates the same doc → same link, fresh content.
- Publishing is **on demand** (a button), not automatic. The editor autosaves
  to the user's private project continuously; the public copy updates when the
  facilitator clicks "Dela" (typically at the end of the session).

`PublicReader` reads `published/:shareId` once (public read) and renders
`BookReader`. If the id is missing/unknown → a friendly "Berättelsen hittades
inte" message.

## Workshop editor (`WorkshopApp`) — light & clean

Reuses the existing node data model, `[#NNN]` references, ReactFlow graph,
`useProjectStorage` + `useFirestoreSync` autosave. New is the **shell** and a
**simplified node editor**.

### Layout
- **Slim top bar:** project-name (editable), save pill (reuses `isSaving`),
  `+ Ny scen`, `Spela upp` (opens BookReader locally as preview), `Dela`
  (publish + link), account/sign-out.
- **Canvas:** ReactFlow graph, light background, **drag-to-rearrange** (default),
  zoom/fit controls. No advanced sidebar, no doc pane, no command palette.
- **Node = `WorkshopNode`:** rounded white card, **large soft shadow**, a colored
  **tone-plate header** (the scene's colour) with the scene title; small body
  preview. Minimal/again no hard borders. Connector edges are **sharp 1.5px**
  lines with arrowheads.
- **Click a node → edit panel** (a clean **right-side panel** that slides in —
  "textfält som fälls upp"): scene **namn**, **brödtext** (clean textarea), and a
  **choices list**. Click empty canvas / a close button to dismiss it.

### Branching (kid-friendly, no `[#NNN]` typing)
- The edit panel shows the scene's outgoing **choices** as a list.
- `+ Lägg till val`:
  - pick an existing scene, or create a new scene, and
  - it appends `[#NNN]` (the target id) to this scene's text under the hood.
- Choice label = target scene's title. This keeps the unified model so the
  reader (which derives choices from `[#NNN]` in the text via the existing
  `splitChoices`) works unchanged.
- Body text shown in the textarea is the scene text **with the trailing choice
  refs hidden** (refs are managed by the choices list, not typed by hand).

### Persistence
- Same as advanced app: `cyoa-data` + `cyoa-projects` (localStorage) and
  `users/{uid}/projects/{id}` (Firestore) via the existing hooks. Autosave is
  already always-on after the round-2 fixes.

## Playback — `BookReader` (book look)

A new reader component, adapted from Ola's `appen-boken/index.html`. Used by
both the local "Spela upp" (preview) and the public `/spela/:id`.

- **Book frame:** a wrapper sized to 16:9 (`width: min(100vw, 177.78vh);
  height: min(100vh, 56.25vw)`) with the book-spread background image
  `https://olabelin.se/microapps/valj-vag-racet-tomt-uppslag.jpg`
  (`background-size: 100% 100%`, `container-type: inline-size`).
- **Text on the pages:** the current scene's title (Oswald, uppercase) + body
  laid over the spread, positioned inside the page area (`top/bottom ~15%`,
  `left/right ~19%`), font sized in `cqw` so it scales with the book. Single or
  two-column fill depending on length; short kid scenes read fine single.
- **Choices** render as buttons styled to sit on the page ("Vad gör du?" +
  one button per choice). Choosing advances the scene (with a soft fade).
- **Navigation:** Tillbaka / Börja om; optional breadcrumb. Reuses the
  scene-walk logic from `ReadPane` (`splitChoices`, history, goTo/goBack/restart).
- Reads scenes from the published doc (public) or from current nodes (preview).

The advanced app keeps its existing `ReadPane` (paper/dark); `BookReader` is the
workshop/public reader only.

## Theming — light, 60/30/10, scoped

- A light token set applied ONLY on the workshop + public routes (e.g. a
  `data-app="workshop"` attribute on the root, or a dedicated light block), so
  the advanced app stays dark. The reader brings its own book palette.
- 60/30/10: ~60% calm off-white base, ~30% soft muted tone-plate
  (slate/sand tint) for headers/panels, ~10% accent (reuse `--accent` blue or a
  workshop accent). Tone-plates and soft shadows instead of lines/borders.
- Fonts: keep Inter for UI; book playback uses Oswald (titles) + a serif
  (Georgia/Source Serif Pro) for body, matching the book player.

## Reuse map

- ♻️ node model + `[#NNN]` refs, `useProjectStorage`, `useFirestoreSync`,
  ReactFlow graph + drag, `splitChoices`/scene-walk from `ReadPane`,
  `firebase.js`, auth (`AuthContext`/`UserMenu`).
- 🆕 `main.jsx` routing + `vercel.json`; `published` collection + rules; publish
  action + share-link UI; `WorkshopApp` shell + light theme; `WorkshopNode`;
  simplified node edit panel + choices UI; `PublicReader` + `BookReader`.

## Non-goals (v1, to ship in time)

- No image upload per scene (the book player has it; defer).
- No accounts/identity for children — view-only via link.
- No page-flip *within* a single scene (one spread per scene + choices).
- No changes to the advanced app's behaviour or theme.
- No live auto-republish (publish is a button).

## Risks / notes

- Book background image is an external URL on olabelin.se; if it moves, the
  reader background breaks. Acceptable for v1; could self-host later.
- Long scene text could overflow the book page — clamp font (cqw) / allow
  internal scroll; keep workshop scenes short (the intended use).
- `published` docs are world-readable by design; only scene title/text/colour
  are copied there (no user data).

## Acceptance

- `/workshop`: create scenes, drag to rearrange, edit name/body, add choices,
  autosaves; "Spela upp" opens the book reader; "Dela" yields a stable link.
- `/spela/:id` (logged out, even incognito): plays the published story in the
  book reader; choices work; unknown id shows a friendly message.
- `/` advanced app unchanged (dark, all current features intact).
- `npx jest` green; `npm run build` clean.
