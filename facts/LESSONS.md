# Lessons & Discoveries

## 2026-06-15 — The Firestore `(default)` database was never provisioned
**Discovery:** The Firebase project `valj-vag-verktyg` has **no Firestore
database**. `firebase.json` declares `database: "(default)"` in `eur3`, and
`src/firebase.js` calls `getFirestore(app)`, but the database itself was never
created (`firestore_get_database .../databases/(default)` → "does not exist";
`firestore_list_databases` → empty). Billing is **not** enabled on the project.

**Impact:**
- The advanced app's "Firestore sync" (history snapshots, cross-device) has
  silently never worked — the app runs entirely on `localStorage` (`cyoa-*`
  keys), which is why it appears fine.
- The workshop **public share link** (`/spela/:id`) depends entirely on
  Firestore (`published/{shareId}` write on Dela, no-auth read on play). It
  **cannot work in production until the database is created** — independent of
  the security rules.
- Symptom in the browser console: repeated
  `@firebase/firestore: Database '(default)' not found` warnings, then
  `Failed to get document because the client is offline`. The public reader
  sits on "Laddar berättelsen…" for ~10s before the offline error fires.

**Required to make publishing work (Ola decision — provisioning prod infra):**
1. Create the Firestore database: `firebase firestore:databases:create "(default)" --location eur3`
   (Native mode; available on the free Spark plan with quotas — billing not
   strictly required for small workshop use). **Location is permanent.**
2. Deploy rules: `firebase deploy --only firestore:rules` (adds the
   `published/{shareId}` rule: read public, write owner-only).

**Lesson:** Don't assume a declared backend is provisioned. A hardcoded/declared
config (`firebase.json`, `firebase.js`) is intent, not proof the resource exists
— verify with the admin API before building features that depend on it.
