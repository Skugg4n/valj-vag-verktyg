# Admin & Analytics — Design Spec

**Date:** 2026-06-18
**Branch:** `feature/admin-analytics` (off `feature/workshop-lite`)
**Status:** Approved (design), pending implementation
**Project:** `valj-vag-verktyg` — Firestore `(default)`/eur3, free Spark plan

## Goal

Give Ola a private admin dashboard with full insight into the workshop
(verkstaden): visitors, readers, authors, shared stories, and trends over time.
Underpin it with comprehensive **event logging** so no data we might later want
is lost. End-users are **children** — logging must be privacy-safe.

## Privacy decision (binding)

Log **everything sensible, pseudonymously**:

- Actor = the Firebase **anonymous (or signed-in) uid** only.
- Allowed context: `browser`, `os`, `deviceType`, `lang`, `referrer`, `screen`,
  `appVersion`, `view`, `sessionId`.
- **Never stored:** IP address, names, e-mail, precise device fingerprint.
- Retention: `events` older than **12 months** are prunable (`ts` enables it).

## Architecture — Approach A (client-side, free Spark)

- Raw append-only event log in a new `events` collection (full detail, for
  later deep-dives).
- Cheap aggregate counters maintained with `increment` so the dashboard reads
  are nearly free.
- Admin is a gated route inside the existing app; no server/Cloud Functions.
- Trade-off (accepted): counters are client-trusted — a technical user could
  inflate a view count. Rules prevent tampering with story *content*; only the
  counter fields are writable by non-owners. Low stakes here. Upgradeable to
  Blaze server aggregation later **without losing history** (raw log persists).

## Data model

### `events/{autoId}` — raw log (append-only)

Common fields on every event (set by the `track()` helper):

| Field | Type | Notes |
|-------|------|-------|
| `type` | string | event type (see taxonomy) |
| `ts` | serverTimestamp | server time |
| `anonId` | string | `auth.currentUser.uid` (anon or signed-in) |
| `sessionId` | string | random per tab, for dedupe |
| `view` | string | `workshop` \| `app` \| `reader` |
| `appVersion` | string | `__APP_VERSION__` |
| `browser` `os` `deviceType` `lang` `referrer` `screen` | string | pseudonymous context, no IP/PII |
| `payload` | map | event-specific (e.g. `storyId`, `sceneId`, `fromScene`, `toScene`, `sceneCount`) |

### Event taxonomy (`type`)

- **Visit:** `app_open`
- **Reading:** `read_open` (storyId), `read_choice` (storyId, fromScene→toScene),
  `read_complete` (storyId, endSceneId)
- **Building:** `project_create`, `scene_create`, `scene_edit`, `scene_delete`,
  `scene_color`, `edge_create`, `edge_delete`
- **Sharing:** `share_click`, `publish` (storyId, sceneCount), `unpublish`
- **Account:** `account_create` (anon login), `sign_in`
- **Error:** `error`

### Aggregates (cheap reads for dashboard)

- `published/{shareId}` gains: `views` (total), `viewsUnique` (per session),
  `lastViewedAt`. Existing content fields unchanged.
- `stats/{YYYY-MM-DD}`: per-day counts keyed by event type (visits, reads,
  publishes, new authors). Powers the trend graph.

## Reader tracking (change to `PublicReader.jsx`)

Today the reader only `getDoc`s the published story, with no auth. Change:

1. On load, `signInAnonymously(auth)` (as the workshop already does) so the
   reader is a countable pseudonymous identity.
2. Emit `read_open`, then `read_choice` on each choice, `read_complete` at an end.
3. Increment `published/{id}.views` (+ `viewsUnique` once per `sessionId`) and
   `lastViewedAt`.

Effect: readers become countable (the Auth list will grow with readers — intended).

## Admin view (`/admin`)

- **Route:** new `route.name === 'admin'` in `routing.js` / `main.jsx`,
  rendering a lazy `AdminApp.jsx`. Dark theme (matches the advanced app).
- **Gate:** visible only when signed in as Ola — uid
  `E7Kc9DudNYY5YgObML67NJt6y202`. Otherwise show a "not authorized" panel.
  A discreet "Admin" link appears in the user menu for that account.
- **Sections:**
  1. **KPI cards** (from aggregates): visits, reads, published stories, authors
     (unique creators), new in last 24 h / 7 d.
  2. **Trends** — line/bar chart from `stats/{date}`: visits / reads / publishes
     per day, selectable 7/30-day window.
  3. **Shared stories** table: title, author (short anon id), date, #scenes,
     **views**, 🔗 read, ✏️ open in workshop, 🗑️ delete (with confirm).
  4. **Reader insights:** most-read stories, most-popular choices, where readers
     reach an end (from `read_choice` / `read_complete`).
  5. **Raw event log:** paginated, filterable (type / date / story).
- **Moderation:** delete removes the published copy (reuses existing
  `deleteDoc(published/{id})`). Pseudonymous events remain as history.

## Security rules (`firestore.rules`)

```
function isAdmin() { return request.auth != null
  && request.auth.uid == 'E7Kc9DudNYY5YgObML67NJt6y202'; }

match /events/{id} {
  allow create: if request.auth != null
    && request.resource.data.anonId == request.auth.uid
    && request.resource.data.keys().hasOnly([...allowed fields...]);
  allow read: if isAdmin();
  // no update/delete (append-only); admin may delete for cleanup
  allow delete: if isAdmin();
}

match /published/{id} {
  allow read: if true;                                   // public reader
  allow create, update: if request.auth != null
    && request.resource.data.ownerUid == request.auth.uid; // owner edits content
  // anyone signed-in may bump ONLY the counter fields:
  allow update: if request.auth != null
    && request.resource.data.diff(resource.data).affectedKeys()
         .hasOnly(['views','viewsUnique','lastViewedAt']);
  allow delete: if (request.auth != null
    && resource.data.ownerUid == request.auth.uid) || isAdmin();
}

match /stats/{date} {
  allow create, update: if request.auth != null
    && request.resource.data.diff(resource.data).affectedKeys()
         .hasOnly([counter fields...]);  // increments only
  allow read: if isAdmin();
}

match /users/{userId}/{document=**} {          // unchanged
  allow read, write: if request.auth != null && request.auth.uid == userId;
}
```

(Exact field allow-lists finalized during implementation; admin uid kept in a
single shared constant on the client and mirrored in rules.)

## New / changed files

- **New:** `src/track.js` (event helper + context detection), `src/AdminApp.jsx`
  (+ small sub-components), `src/adminConfig.js` (admin uid constant),
  `src/__tests__/track.test.js`, `src/__tests__/admin.test.jsx`.
- **Changed:** `src/routing.js` + `src/main.jsx` (admin route), `src/PublicReader.jsx`
  (anon-auth + read tracking), `src/WorkshopApp.jsx` (track build/share/account
  events + admin link in user menu), `src/useFirestoreSync.js` (track publish /
  unpublish + view increment), `firestore.rules` (events/stats/published rules).

## Testing

- Unit: `track()` builds correct shape and leaks no PII; aggregate increment
  helpers; admin gating hides everything for non-admins.
- Rules: Firebase emulator tests — anon can create but not read `events`;
  `published` is publicly readable; only owner/admin can delete; view-counter
  increment allowed but content edits by non-owners denied.
- Existing Jest suite stays green; `npm run build` succeeds.

## Out of scope (v1)

- Full Auth user listing in-app (needs server/Blaze). Account counts come from
  `account_create` / `sign_in` events instead.
- Server-side tamper-proof counters (Blaze upgrade path, history preserved).
