# Changelog

## v0.27.0 — Kommentarer i arbetslänken — 2026-09-24

### Added
- **Kommentarer, som i en PDF.** I arbetslänken (`/las/<id>`, fliken Läs) finns
  en kommentarspalt bredvid texten. Markera ett stycke text och skriv, så
  fästs kommentaren vid just den passagen; skriv utan markering så gäller den
  scenen. Namnet anges en gång och sparas i webbläsaren. Ingen inloggning.
- **Hos dig** syns samma kommentarer i läsläget för det delade projektet, med
  Klar och Ta bort. Klara kommentarer bleknar. Korten i grafen visar en
  pratbubbla med antal öppna kommentarer, och kartan i arbetslänken visar
  samma siffra.
- Kommentarerna ligger vid den delade berättelsen i databasen och finns kvar
  när du uppdaterar länken. Nya databasregler för detta är publicerade.

## v0.26.1 — Arbetslänkens karta visar pilarna — 2026-09-24

### Fixed
- Kartan i arbetslänken saknade kopplingslinjer (noderna hade inga
  anslutningspunkter). Nu ritas pilarna, och kartan följer systemets
  ljusa/mörka tema som resten av appen.

## v0.26.0 — Arbetslänk: dela läsvyn med markeringar, scenläge och karta — 2026-09-24

### Added
- **Två länkar från "Dela via länk".** Publik (`/spela/<id>`): bokläsaren utan
  regi, som förut. **Arbete** (`/las/<id>`): en sida utan inloggning för den
  du jobbar med, med tre flikar: Läs (läsvyn med gulmarkeringar och
  ljud-chips), Scen (scenläget med bubblor) och Karta (scenerna som noder med
  kopplingar, klicka på en scen för att läsa den). Uppdateras med "Uppdatera
  delad länk", tas bort med "Sluta dela".
- Publiceringen sparar en arbetskopia av texten som den är skriven, bredvid
  den rensade publika kopian. Verkstaden påverkas inte.

## v0.25.2 — Scenläge: lugnare, en spalt, bubblor under stycket — 2026-09-24

### Changed
- **En spalt.** Texten ligger centrerad och bubblorna direkt under det stycke
  de hör till, med samma nummer som siffran i texten. Inte längre text till
  vänster och ljud långt till höger.
- **Vanlig scroll.** Scrollhjul och piltangenter scrollar som vanligt. Ingen
  toning, ingen läsmarkör, ingen hjälprad.
- **Vägen hit** överst: varje besökt scen som en klickbar länk, så ett felklick
  är ett klick tillbaka. Backsteg går ett steg tillbaka.
- Höger- och vänsterpil gör ingenting särskilt längre. Helskärm slås på med en
  egen knapp i stället för automatiskt, så Esc inte gör två saker.

### Added
- **Läsmarkör som tillval** (kryssruta överst): på, så blir stycket du klickar
  på eller går till med pil ned/upp understruket. Av som standard.

## v0.25.1 — Scenläge: ljust tema, läsmarkör, tydligare knappar — 2026-09-24

### Added
- **Ljus/Mörk** i scenlägets överkant. Valet sparas.
- **Läsmarkör:** pil ned/upp, scrollhjulet eller ett klick markerar det stycke
  du är vid. Stycket får en gul kant, övriga tonas ner, och bubblorna som hör
  till stycket lyser upp medan de andra tonas ner. Så ser musikern var du är.

### Fixed
- Gulmarkering som omslöt en `{bubbla}` visades som rå kod i scenläget.
- Tangenterna 1 och 2 bytte vy i appen bakom scenläget. Nu stannar de i
  scenläget, och knapparna säger "Grön tumme · tangent G" och "Röd tumme ·
  tangent R" i stället för siffror.

## v0.25.0 — Scenläge för uppläsning med musiker — 2026-09-24

### Added
- **Scenläge** (knappen "Scen" i läsläget, eller ⌘K "Scenläge"): hela skärmen,
  mycket stor text, en scen i taget. Allt som skrivs i `{klammerparenteser}`
  lyfts ur texten och visas som numrerade gula bubblor i en spalt till höger,
  med en liten siffra i texten där ljudet ska in. Gulmarkeringar visas som
  vanligt. Valen är stora knappar, grön för första och röd för andra.
  Tangenter: 1/G och 2/R väljer, Backsteg går tillbaka, + och − ändrar
  textstorlek, Esc avslutar. Textstorleken sparas.
- I vanliga läsläget visas `{...}` som små chips i texten.
- I den delade publiklänken tas `{...}` bort helt.

## v0.24.2 — Färgmarkeringar överlever och syns i läsläget — 2026-09-24

### Fixed
- **Gulmarkeringar försvann** så fort dokumentet ritades om, eftersom de inte
  hade någon plats i den lagrade texten. De sparas nu som `<mark>` i scenens
  text och överlever alla omritningar, projektbyten och omladdningar.

### Added
- Markeringarna **visas i läsläget** och i den exporterade HTML-läsaren, med
  samma gula ton som i editorn. I korten och i den delade bokläsaren visas
  texten utan markering (men utan skräptecken).

## v0.24.1 — ⌘F öppnar alltid sökrutan när dokumentet syns — 2026-09-23

### Fixed
- ⌘F öppnade Chromes egen sökning om markören inte stod i texten. Nu öppnas
  dokumentets sökrad så länge dokumentet är synligt, oavsett var fokus är.

## v0.24.0 — Dela via länk, raka citattecken, stabilare markör — 2026-09-23

### Added
- **Dela via länk** i Dela-rutan. Publicerar en läsbar version på webben
  (`/spela/<id>`, samma läsare som verkstaden) som alla med länken kan öppna
  utan inloggning. Länken kopieras direkt. "Uppdatera delad länk" publicerar
  senaste texten på samma adress, "Sluta dela" tar bort den. Kräver att du
  är inloggad.

### Fixed
- **Markören hoppade** efter Shift+Enter: varje sådan radbrytning fick
  dokumentet att ritas om, och markören hamnade i rubriken under. Nu räknas
  radbrytningen som oförändrad och ingen omritning sker. När dokumentet ändå
  måste ritas om (ny scen skapad av en referens) återställs markören relativt
  sin scen, så text ovanför kan tillkomma utan att markören flyttar.
- **Raka citattecken.** Editorn byter inte längre `"` till typografiska
  citattecken, och gamla typografiska tecken rättas till raka när texten
  sparas.
- **Källtext-fönstret** växer med innehållet i stället för att sluta mitt i.
- Bokläsaren behåller radbrytningar inom ett stycke.

## v0.23.1 — Delbar HTML-läsare: rätt stycken och radbrytningar — 2026-09-23

### Fixed
- Den exporterade läsaren slog ihop alla radbrytningar och delade sedan upp
  texten två meningar per stycke. Nu följer den manuset: tomrad ger nytt
  stycke, enkel radbrytning ger radbrytning, `*kursiv*` och `**fet**` renderas.

## v0.23.0 — Källtext-läge i dokumentet — 2026-09-23

### Added
- **Knappen `</>` i dokumentets verktygsrad** visar hela manuset som råtext,
  exakt som det lagras: `## [001] Titel`, `[002]` för val, `*kursiv*`. Redigera
  fritt; ändringar går samma väg till noderna som den formaterade vyn. Klicka
  igen för att komma tillbaka. Bra när något ser skumt ut i den fina texten.

## v0.22.1 — Läsarens brödsmulor flyter inte längre över texten — 2026-09-23

### Fixed
- Raden "Vägen hit" i läsläget låg fast nederst i fönstret och flöt över
  texten i långa kapitel. Den ligger nu sist på sidan under en linje, och visas
  först när minst ett val gjorts.

## v0.22.0 — Sök och ersätt i dokumentet — 2026-09-23

### Added
- **⌘F i dokumentet** öppnar en sökrad: sökord, räknare "2 av 7", pilar,
  Enter för nästa, Shift+Enter för föregående, Esc stänger. Träffarna
  markeras i texten och dokumentet scrollar till den aktuella. Sökningen är
  skiftlägesokänslig och täcker titlar, löptext och regianvisningar.
- **Ersätt och Ersätt alla** i samma rad. Pillarna (`[NNN]`) rörs aldrig.
- **Grafen följer med:** samma sökord filtrerar korten i grafen, och scenen
  med den aktuella träffen markeras.
- I grafläget utan dokument hoppar ⌘F till "Sök scen…" som förut.

## v0.21.3 — Länk skapas direkt vid tredje siffran — 2026-09-23

### Fixed
- Skriver man `[` (som ger `[]`) och sedan tre siffror blir referensen en pill
  direkt. Tidigare krävdes att man raderade och skrev om den avslutande
  hakparentesen. Inne i rubriker förblir `[NNN]` text som förut.

## v0.21.2 — Läsaren visar radbrytningar och kursiv, inga bakstreck — 2026-09-23

### Fixed
- **Läsläget** visar inte längre bakstreck vid radbrytningar gjorda med
  Shift+Enter. Enkel radbrytning blir radbrytning, dubbel blir nytt stycke,
  `*kursiv*` och `**fet**` renderas, `\[` blir `[`. Samma tvätt görs i den
  exporterade HTML-läsaren.
- **Gamla texter tvättas när projektet laddas**, så bakstreck som sparats av
  tidigare versioner försvinner utan att du behöver röra scenerna.
- **⌘F** hoppar till "Sök scen…" i grafen. I dokumentläget lämnas ⌘F till
  webbläsarens egen sökning.

## v0.21.1 — Rubrik 1 som scen, renare lagrad text — 2026-09-23

### Fixed
- **`# [018] Titel` (Rubrik 1 med scennummer) räknas nu som scen** i dokumentet,
  inte bara `##`. Tidigare hamnade allt under en sådan rubrik i scenen ovanför,
  och referenserna i texten skapade tomma dubbletter som inte gick att ta bort
  (de återskapades eftersom texten fortfarande pekade på dem). En vanlig
  Rubrik 1 utan nummer är fortfarande text.
- **Lagrad scentext innehåller inte längre markdown-escapes.** `\[MUSIK: ...\]`
  sparas som `[MUSIK: ...]`, och radbrytningar med Shift+Enter sparas som
  markdown-radbrytning i stället för ett bakstreck. Syns i kort, läsare och export.

## v0.21.0 — Ljust tema — 2026-09-23

### Added
- **Ljust tema** i Advanced. Standard är "Följ systemet": appen byter själv
  när datorn byter mellan ljust och mörkt. Välj fast läge i Inställningar
  (Tema: Följ systemet / Ljust / Mörkt), med sol/måne-knappen i sidoraden,
  eller "Byt tema" i kommandopaletten. Valet sparas i webbläsaren.
- Kort med standardfärg följer temat (vita på ljust, mörkgrå på mörkt).
  Kort du färgat själv behåller sin färg.

### Changed
- Kvarvarande hårdkodade gråa och röda färger i gränssnittet går nu via
  tema-variabler. Läsläget behåller sin egen papper/mörkt-knapp. Verkstaden
  påverkas inte.

## v0.20.0 — Importera manus (markdown) — 2026-09-23

### Added
- **Importera manus (markdown)** i projektmenyn och kommandopaletten. Ett manus
  med rubriker `# [001] Titel` (h1 eller h2) och val skrivna `[002]`, `[#002]`
  eller `[[002]](#002)` blir ett **nytt projekt** med noder, titlar, texter och
  kopplingar. Refererade scener utan rubrik skapas tomma. Noderna läggs i nivåer
  efter avstånd från 001. Regianvisningar i kursiv, `*[MUSIK: ...]*`, ligger kvar
  som text. Format: `facts/MANUS-FORMAT.md`.
- JSON-importen accepterar nu bara `.json` i filväljaren; menyposten heter
  "Importera JSON…".

## v0.19.0 — Sammanslagning: verkstadens juni-arbete + Advanced-synken — 2026-09-21

Master innehöll inte det som låg live (v0.18.1 publicerades från grenen
`feature/workshop-lite` i juni utan att slås ihop). Den här versionen förenar
båda spåren: allt från v0.15.2 till v0.18.1 (verkstaden) och v0.15.0/v0.15.1
(Advanced-synken, nedan daterade september). Se `facts/LESSONS.md` 2026-09-20.

## v0.18.1: Readable node text on light cards + visible crash screen (2026-06-22)

### Fixed
- Node cards with a light fill (e.g. a yellow workshop story opened in the
  advanced editor) showed light text on a light background, unreadable. The card
  id/title/body now follow the contrast-aware colour the card already computes
  (dark text on light cards, light text on dark cards). CSS-only, in the advanced
  editor's node styling.
- The crash screen was dark text with no background, so on a dark page it looked
  like a blank black screen. It now has a white background and prints the error,
  so a failure shows what went wrong instead of a black page.

## v0.18.0: Workshop list cleanup + admin polish (2026-06-20)

### Changed
- The workshop story list no longer shows advanced-app projects. Stories are
  tagged by which app created them (workshop vs advanced). The list shows
  workshop and untagged stories and hides only those explicitly from the
  advanced app, so a real workshop story is never accidentally hidden across
  devices. Covered by unit tests (workshopList).

### Added
- Admin dashboard: an "Uppdatera" button to reload stats without a full reload.
- The admin's own reads of share links are no longer counted in the stats.

## v0.17.0: Stories are never lost — account linking + honest save status (2026-06-20)

### Fixed
- Logging in with Google no longer throws away anonymous work. The anonymous
  session is now *linked* (upgraded) to Google, keeping the same identity and all
  its data. If the Google account already exists, the in-progress work is copied
  into it, and any copy failure is reported to the user instead of lost silently.
- The cloud listener no longer overwrites the story you currently have open.

### Added
- An always-visible save status in the workshop topbar: "Sparat på den här
  enheten" (without login) vs "Sparar…" / "Sparat i ditt konto" / "Kunde inte
  spara" (logged in). A failed cloud backup is surfaced honestly, never a false
  "saved". Backed by unit tests (saveStatus, migrateProjects).
- Clearer welcome text: without login the story is saved only on this device.

## v0.16.0: Workshop stories sync to your account (2026-06-20)

### Changed
- Workshop stories now save to the cloud for any signed-in identity, including
  anonymous (a same-browser safety net), not just logged-in Google users.
- The story list shows every cloud-synced story (flagged on load), so your
  stories appear on any device when you are logged in with Google, instead of
  being limited to the browser's local list.

## v0.15.2: Fix sign-in on the verkstaden domain (2026-06-19)

### Fixed
- Sign-in failed on verkstaden.olabelin.se with auth/unauthorized-domain. The
  root cause: the domain was not in Firebase Auth's authorized domains. Added
  verkstaden.olabelin.se and verkstad.olabelin.se.
- Reverted to signInWithPopup. signInWithRedirect cannot complete on a custom
  domain whose auth handler is on a different origin (the credential cannot be
  read back across domains), which bounced mobile users back to the login gate.

## v0.15.1: Fix mobile Google sign-in (2026-06-19)

### Fixed
- Google sign-in on mobile (the popup opened, then vanished without completing).
  Mobile now uses a full-page redirect (signInWithRedirect); desktop keeps the
  popup with a redirect fallback when it is blocked or dismissed.

## v0.15.0 — Admin dashboard + pseudonymous analytics — 2026-06-18

### Added
- **Pseudonymous event logging.** A `track()` helper records visits, reads,
  reader choices, story builds, and shares to an `events` collection — keyed to
  the anonymous Firebase uid only (browser/OS/device/lang/referrer context; no
  IP, no names, no PII). Cheap aggregate counters: `published/{id}.views` and
  per-day `stats/{date}`.
- **Reader tracking.** `PublicReader` signs readers in anonymously so they are
  countable, and logs `read_open` / `read_choice` / `read_complete` + view
  counts.
- **/admin dashboard** (dark, gated to the admin uid): KPI cards, a 14-day
  trend chart, shared-stories table with moderation (delete), reader insights
  (most-read, popular choices, device/browser breakdown), and a raw event log.
  Discreet "Admin" link in the user menu for the admin account.
- `firestore.rules`: `events` (create-by-self, admin-read), `stats`, and
  `published` (public read, counter-only updates by non-owners, admin
  list/delete).

### Changed
- `UserMenu` now treats anonymous identities as signed-out for display (the
  workshop signs visitors in anonymously on load for analytics).

### Notes
- Scope-limited on purpose: per-keystroke `scene_edit` is **not** logged (avoids
  write-spam on the free Spark plan); coarse build events are. Full Auth user
  listing is out of scope (needs a server/Blaze) — counts come from events.
- Going live requires deploying `firestore.rules` (additive, validated).

## v0.14.2 — Workshop: brand re-skin (warm cream + teal + Fredoka) — 2026-06-17

### Changed
- **Workshop re-skin** to match olabelin.se + Racet/Välj Väg: warm cream canvas,
  white cards with more air, teal accent, Fredoka in the brand, Hanken Grotesk in
  the UI. Pure design-token + font + padding changes scoped to
  `[data-app='workshop']` — function unchanged, advanced (dark) mode untouched.
- Calmer, warmer scene-colour palette in the workshop colour picker.

### Fixed
- `index.html`: added Fredoka + Hanken Grotesk but **kept Inter** in the font
  link — the advanced mode and main app still depend on Inter, so dropping it
  would have silently changed their typography on non-Apple systems.
## v0.15.1 (Advanced-synk, ingick i 0.19.0) — Synkfixar efter slutgranskning — 2026-09-10

### Fixed
- **Ingen förlorad text vid lägesbyte.** Ett påbörjat stycke som ännu inte
  hunnit sparas levereras nu när dokumentrutan lämnas eller stängs.
- **Grafändring under skrivande skrivs inte över.** Dokumentet skickar med den
  version det utgick från, så en scen du inte rört behåller det grafen skrev.
- **Nya scener hamnar aldrig ovanpå en befintlig nod** utan flyttas nedåt.
- **Inga dubbletter av scennummer** när en scen skapats strax innan, och en
  rubrik utan nummer tar aldrig ett nummer som används längre ned i texten.

## v0.15.0 (Advanced-synk, ingick i 0.19.0) — Advanced: graf och dokument är samma berättelse — 2026-09-10

### Changed
- **Noderna är enda sanningen.** Dokumentet ritas om från noderna vid varje
  ändring och skriver tillbaka till dem. Grafändringar (ny nod, titel, text,
  koppling) syns direkt i dokumentet; dokumentändringar syns direkt i grafen.
  Ersätter den enkelriktade synken från v0.7.4.
- **Referenser skrivs `[004]`** i dokumentet (gamla `[#004]` förstås). Skriver
  man `[` läggs `]` till automatiskt. En referens till en scen som saknas skapar
  den, tom, i graf, dokument och outline.
- **Radera en rubrik** i dokumentet: texten flyter in i scenen ovanför; noden
  finns kvar om något pekar på den.
- **Nya noder** utan markerad nod hamnar mitt i det du ser, oavsett zoom.
- **Sparpillen** visar klockslag för senaste sparning.
- **Sektionsnoder tas bort vid inläsning** av gamla projekt (de sparas inte om).

### Added
- **⌘Enter** skapar nästa länkade scen (först en redan refererad tom scen,
  annars nästa lediga nummer), markerar den och ställer kursorn i titeln. I
  både graf och dokument.
- **⌘ + pil** byter scen: i grafen närmsta nod i pilens riktning, i dokumentet
  föregående/nästa scen.
- **Ny länkad scen** finns även i kommandopaletten (⌘K).

### Removed
- Sektionsnoder (halvbyggda och avstängda sedan v0.9.4).

## v0.14.1 — Workshop: share without login + author credit — 2026-06-16

### Added
- **Share without logging in.** Clicking "Dela" signs the user in anonymously
  (a silent browser identity — no dialog) so the publish satisfies the Firestore
  rules. Anonymous users stay on localStorage for their project (no per-project
  cloud sync) to keep Firestore usage down; only the published copy is written.
  Degrades gracefully (a toast) if the Anonymous provider isn't enabled yet.
  **Requires:** enable "Anonymous" sign-in in the Firebase console.
- **Author credit** in the welcome modal: "Av Ola Belin — författare till den
  interaktiva boken Racet", linking to olabelin.se.

### Changed
- Copy: "välj-väg-berättelse" (not "välj-din-väg") — matches the book name.

## v0.14.0 — Workshop: responsive mobile editor — 2026-06-16

Editing now works on phones/tablets (kids can build their own stories on mobile).

### Added
- **Mobile layout (≤640px):** the canvas is full-width, and the edit panel
  becomes a **bottom sheet** that slides up when you tap a scene and closes with
  a "✕ Klar" button (or by tapping the canvas). The top bar wraps and compresses
  so all the actions fit; the on-screen text-size control (A−/A+) is hidden on
  mobile since the device handles sizing.
- Verified at 390px: top bar fits (no horizontal overflow), canvas is full
  width, tapping a scene opens the drawer, closing returns to the map.

(The reader at `/spela/:id` was already mobile-friendly.)

## v0.13.4 — Workshop: calmer scene cards — 2026-06-16

### Changed
- **Smaller, more discreet connection dots** (8px, warm-grey instead of teal;
  they turn accent on hover). They no longer crowd the card edge.
- **Removed the Start / Slut / Tom badges** on the cards — too busy, and you can
  tell anyway.
- **Empty scenes show no body text at all** (removed the "Skriv vad som händer…"
  placeholder, which made it look like you could type inside the node instead of
  in the right-hand panel).

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
