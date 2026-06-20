# Ideas & Backlog

## New Ideas

### Public story library (verkstaden) — proposal written 2026-06-20
Expand verkstaden into a small, moderated publishing/library product. Full
proposal: `docs/plans/2026-06-20-public-library-roadmap.md`. Phases:

- [ ] **Story metadata**: author display name (never real full name), short
      description, scene count on the published doc.
- [ ] **Public opt-in + moderation**: `public` flag + `moderation` state on
      published docs; content guideline + required checkbox at publish; approve
      / hide / remove in the admin panel (recommend pre-moderation for kids).
- [ ] **Library view** (`/bibliotek`, maybe later the front page): list
      approved public stories (title, author, scene count, read link).
- [ ] **Images in scenes**: needs a storage decision (Vercel Blob recommended;
      Firebase Storage would require the Blaze plan). Client-side downscale.

Open questions for Ola: pre- vs post-moderation; author-name format; library
placement; image storage choice; whether to update VISION.md (currently says
"inte en publiceringsplattform").

## Smaller follow-ups
- [ ] Admin dashboard: a "Uppdatera" button + optional auto-refresh (it only
      loads once on mount).
- [ ] Admin: option to exclude the admin's own reads from the stats.
