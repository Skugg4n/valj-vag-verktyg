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

## 2026-09-20 — Master var inte det som låg live; en push till master skrev över produktionen
**Vad hände:** Produktionen (valj-vag-verktyg.vercel.app och verkstaden.olabelin.se)
kördes sedan 23 juni på `feature/workshop-lite` v0.18.1, publicerad med
`vercel --prod` från CLI utan att grenen slogs ihop i master (som stod på
v0.14.1). När v0.15.1 pushades till master byggde Vercel automatiskt och flyttade
båda adresserna till den nya deployen. Verkstaden tappade därmed molnsynk av
berättelser (v0.16), kontokoppling anonym→Google och sparstatus (v0.17),
adminpanel och döljande av avancerade projekt (v0.18) i cirka 40 minuter, tills
den gamla deployen promotades tillbaka (`vercel promote <url>`).

**Varför det inte upptäcktes:** kontrollen av "vad ligger live" lästes ur
`index-*.js`, som bara innehåller shellet. Versionen och all editor-kod ligger i
den lazy-laddade `App-*.js`. Index visade 0.14.1 fast App-chunken sa 0.18.1.

**Regler framåt:**
1. Före varje deploy: läs versionen ur App-chunken på den publicerade sajten och
   jämför med `git show master:package.json`. Skiljer de sig är master inte
   sanningen; stanna och ta reda på vilken gren som ligger live
   (`vercel inspect <prod-url>` visar aliasen).
2. Publicera aldrig en gren med `vercel --prod` utan att samma dag slå ihop den
   i master. Auto-deploy från master gör annars nästa push till en rollback.
3. Rollback är `vercel promote <tidigare prod-url> --yes`, tar under en minut.
## 2026-06-20: Anonymous identities are per-browser; login must LINK, not replace
**Discovery:** The workshop signs users in anonymously and saved work under
`users/{anonUid}/projects`. But the anonymous uid lives only in the browser, and
`loginWithGoogle` used `signInWithPopup`, which REPLACES the anonymous session
with a brand-new Google uid. So logging in (the exact action the welcome modal
told users to take "to save for good") orphaned all anonymous work under a uid
no one can reach again. The kids' stories were also made anonymously and were
only recoverable from the `published` copies.

**Fix (v0.17.0):** Use `linkWithPopup` to upgrade the anonymous account to Google
(same uid, data preserved). On `auth/credential-already-in-use` (the Google
account already exists), read the anon projects while still anonymous, sign into
the existing account, copy them over, and report any failures instead of
swallowing them. Added an honest always-visible save status, and made anonymous
= "saved on this device" explicit in the UI.

**Lesson:** Anonymous auth is a per-device identity, not a durable account. Never
tell a user their work is "saved" without being precise about WHERE (this device
vs the cloud account), never use plain sign-in to "upgrade" an anonymous user
(link the credential so data carries over), and reassure only after a confirmed
save, not optimistically.
