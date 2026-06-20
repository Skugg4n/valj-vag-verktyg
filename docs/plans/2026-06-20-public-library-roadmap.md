# Proposal: Public Story Library, Metadata, Moderation, Images

**Date:** 2026-06-20
**Status:** Proposal for discussion (not yet scoped into a build)
**Context:** Ola wants verkstaden to grow into a place where stories (especially
kids') can be read by others, with creator info, a moderated public library, and
images.

## Vision shift (read this first)

`facts/VISION.md` currently states a Non-Goal: *"Inte en publiceringsplattform.
Vi skapar, vi publicerar inte."* This proposal deliberately expands that: the
verkstaden side becomes a small **creation + light-publishing** product (a
curated, moderated library), while the advanced app stays a pure creation tool.
If we go ahead, we should update VISION.md to make this conscious, not accidental.

## The four features, and why this order

They build on each other. Metadata is the foundation everything else needs.

### Phase 1 — Story metadata (foundation, low risk)
Add structured info to a story: **title** (exists), **author display name**,
**short description**, and derived **scene count**. Today a published doc only
has `title`, `nodes`, `ownerUid`. We add `authorName` and `description`.

- Where it is entered: a small "Om berättelsen" box in the workshop (and/or at
  publish time).
- **Safety for kids:** never a real full name. Use a first name, a class label
  ("3B"), or a chosen pseudonym. This pairs with the pseudonymous-analytics
  decision already made.

### Phase 2 — Public opt-in + content rules + moderation
A creator chooses whether a shared story may appear in the public library.

- New field on the published doc: `public: false` by default, plus
  `moderation: 'pending' | 'approved' | 'hidden'`.
- At publish time: a short, clear guideline ("Vad får INTE publiceras") and a
  required checkbox. Draft text: *"Berättelser som är kränkande, rasistiska,
  homofobiska, sexuella, mobbande, eller innehåller personlig information tas
  bort. Allt i biblioteket granskas manuellt."*
- **Moderation workflow — a real decision:**
  - **Pre-moderation** (safer): a public-opt-in story is `pending` and only
    appears in the library after you approve it in the admin panel. Best for
    child-generated content; costs you a review step per story.
  - **Post-moderation** (lighter): appears immediately, you can hide/remove from
    the admin panel; add a "Rapportera" link for readers.
  - **Recommendation:** start with **pre-moderation** (low volume now, and it is
    the responsible default for kids). The admin panel already exists, so this is
    just an approve/hide button per story.

### Phase 3 — Library / front-page view
A public, no-login page listing **approved, public** stories: title, author
display name, scene count, and a "Läs"-link to `/spela/:id`.

- **Placement decision:** a dedicated `/bibliotek`, or make it the verkstaden
  front page? Making it the front page changes what visitors land on (library
  first, "skapa egen" as a call to action). A separate `/bibliotek` is lower
  risk. **Recommendation:** start with `/bibliotek`, link to it from the
  workshop; promote to front page later if it earns its place.
- Reads `published` where `public == true && moderation == 'approved'`. Needs a
  small Firestore composite index.

### Phase 4 — Images in scenes (separate track, more infrastructure)
Add a picture to a scene (and/or a cover image for the library card).

- **The hard part is storage**, and it has a cost decision:
  - **Firebase Storage** — clean fit, but new projects need the **Blaze** plan
    (this project is on free Spark). Would mean enabling billing.
  - **Vercel Blob** — the app is already on Vercel; has a free tier; good option
    without leaving the stack.
  - **External host** (Cloudinary/imgbb free tier) — works, but another service.
  - Inline base64 in Firestore is **not** viable (1 MB doc limit, bloats reads).
- **Recommendation:** Vercel Blob (stays on the existing platform, free tier),
  with client-side downscaling before upload to keep within limits. This is the
  most involved feature, so it should come last.

## Cross-cutting: safety and privacy (children)

Because the public content is made by children, this is not optional:
- No real names, no personal info (enforced by the display-name field + the
  guideline checkbox + manual moderation).
- Pre-moderation as the default gate.
- A simple "Rapportera"/"Ta bort" path and an audit trail (we already log events).

## Suggested build sequence

1. **Phase 1** (metadata) — small, unlocks the rest. ~half a day.
2. **Phase 2** (public opt-in + guideline + admin approve/hide) — reuses the
   admin panel. ~1 day.
3. **Phase 3** (`/bibliotek` view) — ~1 day.
4. **Phase 4** (images) — separate, needs the storage decision first. ~2 days.

Each phase ships independently and is reversible.

## Open questions for Ola

1. **Moderation:** pre-moderation (approve before public) or post-moderation
   (public immediately, you remove bad ones)?
2. **Author name:** first name, class label, or free pseudonym?
3. **Library placement:** dedicated `/bibliotek` first, or straight to the
   verkstaden front page?
4. **Images:** how important now, and OK to use Vercel Blob (vs enabling Firebase
   Blaze billing)?
5. **Vision:** do we update VISION.md to embrace light publishing for verkstaden?
