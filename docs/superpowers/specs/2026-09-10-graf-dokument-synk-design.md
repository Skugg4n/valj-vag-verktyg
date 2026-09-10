# Spec: Graf ↔ dokument-synk i Advanced (noderna är sanningen)

**Datum:** 2026-09-10
**Status:** Beslutad i samtal med Ola 2026-09-09 till 2026-09-10. Målbild i `facts/STRATEGY.md`.
**Gäller:** Advanced-editorn (`App.jsx` och dess paneler). **Basic (verkstaden) berörs inte.**
**Version vid leverans:** 0.15.0.

## 1. Problemet

Dokumentvyn skapas från noderna en gång vid laddning och skickar sedan bara
ändringar åt ett håll (dokument → noder). Grafändringar syns aldrig i dokumentet,
och när man skriver i dokumentet skriver dess gamla kopia över grafen så att
kopplingar försvinner. Infört i v0.7.4 för att stoppa en oändlig loop. Se
`facts/STRATEGY.md` avsnitt 2.4.

## 2. Målet i en mening

Noderna är den enda sanningen. Grafen och dokumentet är två vyer som båda ritas
om från noderna vid varje ändring, och författaren kan skriva löptext i
dokumentet utan att tänka på teknik.

## 3. Icke-mål

- Inga ändringar i `WorkshopApp.jsx`, `Workshop*.jsx`, `BookReader.jsx`,
  `PublicReader.jsx`, `sceneRefs.js`, `storyExport.js`, `useFirestoreSync.js`,
  `routing.js`, `main.jsx`. Dessa delas med Basic eller styr routing.
- Inget nytt lagringsformat. Nodtexten lagras som idag med `[#NNN]`-länkar.
- Inget samarbete i realtid, ingen AI.

## 4. Datamodell (oförändrad, men förtydligad)

- Nod: `{ id: '003', data: { title, text, color, isIdea? }, position, width, height }`.
- Länk = `[#NNN]` i `data.text`. Grafens pilar räknas fram ur texten
  (`scanEdges`). Ingen separat länklista.
- Idé-noder (`isIdea` eller id `idea-*`) ingår inte i dokumentet.
- Sektioner (`type: 'group'`, `SectionNode`) tas bort ur koden.

**Existensregel:** en scen finns om den har en rubrik i dokumentet **eller** pekas
på av minst ett `[#NNN]` i någon scens text. En scen som varken har rubrik, text
eller inkommande länk tas bort automatiskt vid nästa synk från dokumentet.

## 5. Dokumentets grammatik

Dokumentet visas och redigeras i TipTap (`DocPane.jsx`). Det som editorn
innehåller kallas nedan *dokumenttext*; den serialiseras till Markdown och tolkas
till noder.

| Skrivs i dokumentet | Betydelse | Lagras i noden som |
|---|---|---|
| `[003] Titel` som egen rubrikrad (h2) | Scen 003 med titel "Titel" | `id: '003', title: 'Titel'` |
| Rubrikrad utan nummer | Ny scen med nästa lediga nummer | tilldelas vid tolkning |
| Löptext under rubriken | Scenens text, fri formatering | `data.text` (Markdown) |
| `[004]` inne i löptext | Val som leder till 004 | `[#004]` i `data.text` |
| `[#004]` (gammalt format) | Samma som ovan | `[#004]` |

Regler:

- **Bara tresiffriga nummer** `[000]` till `[999]` räknas som referens. `[1]`, `[12]`,
  `[1234]` är vanlig text.
- **Auto-stängning:** skriver man `[` i dokumentet infogas `]` och kursorn står
  mellan dem. Skriver man `]` när nästa tecken redan är `]` hoppar kursorn förbi.
- **Visning:** i editorn renderas `[004]` som en klickbar pill (dagens `ArrowLink`
  ändras till att hitta `\[(#?)(\d{3})\]` och visa `[004]`). Klick på pillen
  markerar scen 004 i grafen och scrollar dokumentet dit.
- **Dokumentordning** är nummerordning (`localeCompare` på id som idag).
- Vid översättning dokument → noder skrivs `[004]` om till `[#004]`. Vid
  översättning noder → dokument skrivs `[#004]` om till `[004]`. Alla andra
  konsumenter (ReadPane, storyAnalysis, buildReaderHTML, Firestore, export) ser
  aldrig något annat än `[#NNN]`.

## 6. Synkmotorn

### 6.1 Princip

Ett enda tillstånd: `nodes` i `App.jsx`. Två avledda vyer:

```
                 ┌──────────── nodesToDoc ────────────┐
                 │                                     ▼
   Graf ◀── render ── nodes ◀── docToNodes ── dokumenttext (TipTap)
                 ▲                                     │
                 └──── grafhandlers (addNode m.fl.) ────┘
```

- **nodesToDoc(nodes) → markdown.** Ren funktion. Filtrerar bort idé-noder,
  sorterar på id, skriver `[NNN] Titel` som h2 och texten under, med `[#NNN]`
  omskrivet till `[NNN]`.
- **docToNodes(markdown, prevNodes) → nodes.** Ren funktion. Tolkar rubriker och
  text, skriver `[NNN]` till `[#NNN]`, behåller position/färg/storlek från
  `prevNodes` för kända id, ger nya noder en position (se 7.2), tilldelar nummer
  åt rubriker utan nummer, skapar tomma noder för refererade id som saknas,
  tar bort noder enligt existensregeln (idé-noder undantagna, de rörs inte).

### 6.2 Riktningsspärr (så att loopen från v0.7.3 inte kan uppstå)

`App.jsx` håller en `syncOriginRef` med värdet `'graph' | 'doc' | null`.

- **Grafändring** (alla mutationer i App.jsx: addNode, deleteNode, onConnect,
  reconnect, NodeCard-textredigering, titel/färg, import, projektbyte, undo/redo,
  auto-layout): sätt `syncOriginRef = 'graph'`, uppdatera `nodes`. En effekt på
  `nodes` räknar `nodesToDoc(nodes)` och om resultatet skiljer sig från det
  dokumentet redan har, sätts det i editorn med `setContent(..., false)` så att
  `onUpdate` inte utlöses. Kursorposition bevaras (se 6.3).
- **Dokumentändring** (`onUpdate` i TipTap): sätt `syncOriginRef = 'doc'`,
  debounce 300 ms, kör `docToNodes` och `setNodes`. Effekten ovan ser
  `syncOriginRef === 'doc'`, hoppar över `setContent`, och nollställer flaggan.
- **Likhetskontroll** som andra spärr: `nodesToDoc(nodes)` jämförs med senaste
  markdown som skrevs in eller lästes ur editorn. Är de lika görs ingenting.
  Loopen kräver att båda spärrarna fallerar samtidigt.

Ingen `linearInitialized`, ingen `docReloadKey`, ingen `hasLoaded`. Editorn
monteras en gång och matas alltid via samma väg.

**Implementation (beslut vid planering 2026-09-10):** spärren ligger i `DocPane`,
som äger editorn, i stället för i `App.jsx`: `lastMarkdownRef` jämförs med
`normalizeDoc` (som jämnar ut `\[`/`[` och `[#NNN]`/`[NNN]`), och graf → dok
skrivs alltid med `emitUpdate=false`. Dessutom skickar varje dokumentändring med
`baselineIds`, scenerna dokumentet visade när redigeringen började, så att
`docToNodes` bara får ta bort eller tömma scener som faktiskt stod i dokumentet.
Det stänger kapplöpningen "grafändring medan man skriver": en nod som skapats i
grafen efter att dokumentet ritades kan aldrig raderas av dokumentets nästa
uppdatering.

### 6.3 Kursor och scroll bevaras

När dokumentet skrivs om från grafen medan användaren står i editorn: spara
`editor.state.selection` (från/till som absoluta positioner) och scrolltopp,
gör `setContent`, återställ selection begränsad till dokumentets nya längd,
återställ scrolltopp. Om användaren skriver aktivt (senaste tangent < 300 ms
sedan) skjuts omskrivningen upp tills debouncen löpt ut, så att den aldrig
kapar ett pågående ord.

### 6.4 Ångra

Grafhandlers pushar undo-snapshot som idag. Dokumentändringar pushar ett
hopslaget snapshot per skrivpass (dagens `textEditRef`-logik, flyttad så att den
gäller docToNodes-resultatet). Undo sätter `syncOriginRef = 'graph'` så att
dokumentet ritas om.

## 7. Grafen

### 7.1 ⌘Enter: ny länkad scen

I både graf och dokument. Utgångsscen = markerad nod i grafen, eller scenen
kursorn står i, i dokumentet.

1. Välj nummer: första scen som pekas på från utgångsscenen men saknar rubrik och
   text (i nummerordning). Finns ingen: nästa lediga nummer (`nextId`).
2. Om numret är nytt: lägg `[#NNN]` sist i utgångsscenens text (med mellanslag
   före om texten inte är tom), skapa noden.
3. Placera noden till höger om utgångsscenen (dagens spawn-offset-logik).
4. Markera den nya noden. I grafen: öppna titelfältet i `NodeCard` med fokus. I
   dokumentet: ställ kursorn i den nya rubrikraden efter `[NNN] `.

### 7.2 Placering av nya noder

- Med utgångsscen: till höger, som idag.
- Utan utgångsscen (⌘N utan markering, eller nod skapad av en referens i
  dokumentet utan tydlig förälder): mitt i den synliga vyn, omräknad med
  ReactFlows `screenToFlowPosition`. En nod skapad av referens `[004]` i scen
  003 har 003 som förälder och placeras till höger om den.

### 7.3 ⌘ + pil: byt scen

- **I grafen:** från den markerade nodens mitt, välj bland noderna vars mitt
  ligger i pilens halvplan (t.ex. ⌘→: `dx > 0`). Poäng = `|längs| + 2·|tvärs|`
  där `längs` är avståndet i pilens riktning och `tvärs` vinkelrätt. Lägst poäng
  vinner, så rakt fram slår snett även om snett är närmare. Ingen kandidat: gör
  ingenting. Vald nod markeras och grafen panorerar så att den är synlig.
- **I dokumentet:** ⌘↑ / ⌘↓ ställer kursorn i föregående / nästa rubrik. ⌘← / ⌘→
  gör ingenting (lämnas till editorn).
- Kommandona registreras i `App.jsx` tillsammans med ⌘N/⌘Z och tar inte över när
  fokus är i ett `input` utanför dokumentet (projektnamn, sök).

### 7.4 Sektioner tas bort

`SectionNode.jsx` raderas. `addSection`, `onAddSection`, `nodeTypes.group`,
kommandopalettens post och `type: 'group'`-filtren tas bort. Gamla projekt med
group-noder: dessa filtreras bort vid laddning.

## 8. Topplisten

Sparpillen visar `sparad 14:32` (tid för senaste lyckade sparning, lokal tid) i
stället för bara `sparad`. `sparar…` som idag under pågående sparning.

## 9. Filer som ändras

| Fil | Ändring |
|---|---|
| `src/utils/linearConversion.ts` | Ersätts av `nodesToDoc` och `docToNodes` med reglerna i 5 och 6.1. `convertNodesToHtml` tas bort om oanvänd. |
| `src/useLinearParser.ts` | Tas bort. Logiken flyttar till `docToNodes` plus debounce i `DocPane`. |
| `src/DocPane.jsx` | Tar emot `nodes` och en `onDocChange`-callback i stället för `text/setText`. Äger debounce, kursorbevarande, auto-stängning av `[`. |
| `src/ArrowLink.ts` | Matchar `\[(#?)(\d{3})\]`, renderar `[NNN]`, skriver `[NNN]` i Markdown. |
| `src/App.jsx` | `syncOriginRef`, ⌘Enter, ⌘+pil, `screenToFlowPosition`, borttagning av `linearText`/`docReloadKey`/sektioner. |
| `src/NodeCard.jsx` | Kan öppna titelfält med fokus på begäran (prop `focusTitle`). |
| `src/GraphPane.jsx` | Exponerar `screenToFlowPosition` och panorering till nod. Sektionsknapp bort. |
| `src/Topbar.jsx` | Sparad-tid. |
| `src/CommandPalette.jsx` | Sektion bort, ⌘Enter och ⌘+pil listas. |
| `src/SectionNode.jsx` | Raderas. |
| `facts/REGISTRY.md`, `CHANGELOG.md`, `package.json` | Uppdateras. Version 0.15.0. |

## 10. Tester (måste vara gröna före push)

Nya eller omskrivna i `src/__tests__/`:

1. **nodesToDoc:** sorterar på id, utesluter idé-noder, skriver `[NNN] Titel`,
   översätter `[#004]` till `[004]`, tom titel ger `[NNN]` ensamt.
2. **docToNodes:** tolkar rubrik med och utan nummer, tar `[004]` och `[#004]`,
   ignorerar `[12]`, skapar tom nod för refererad saknad scen, tar bort scen utan
   rubrik/text/inlänk, behåller position och färg för kända id, rör inte idé-noder.
3. **Rundtur:** `docToNodes(nodesToDoc(n), n)` ger samma noder (titel, text, länkar)
   för ett representativt projekt inklusive gamla `[#NNN]`.
4. **Radering av rubrik:** dokument där rubriken `[004]` tagits bort men texten
   finns kvar ger scen 003 med sammanslagen text; 004 finns kvar tom om något
   pekar på den, annars borttagen.
5. **Riktningsspärr (DocPane + App):** simulera grafändring → dokumentet
   uppdateras exakt en gång och `onDocChange` anropas noll gånger. Simulera
   dokumentändring → `setNodes` anropas en gång och `setContent` noll gånger.
   Ett test som kör 20 växlande ändringar och räknar anrop; antalet ska vara
   linjärt, inte växande.
6. **⌘Enter-numrering:** scen 003 med text `... [004] ... [009]` där 004 saknar
   rubrik ger 004; där båda har rubrik ger nästa lediga.
7. **⌘+pil-val:** given nodpositioner, ⌘→ väljer rakt fram före snett närmare;
   ingen kandidat ger `null`.
8. **Placering:** ny nod utan markering hamnar i vyns mitt i flödeskoordinater
   för ett givet viewport-transform.

Befintliga tester (`LinearConversion`, `LinearParser`, `DocPane`, `AppShell`,
`ReadPane`, `storyAnalysis`, `buildReaderHTML`, `routing`, `sceneRefs`,
`storyExport`) ska fortsatt gå igenom. `sceneRefs`, `storyExport` och `routing`
är särskilt viktiga eftersom de bevisar att Basic-vägen är orörd.

## 11. Manuellt rökprov före push

Advanced (lokalt och på Vercel-preview):

1. Nytt projekt, ⌘N, skriv titel i kortet → rubriken syns i dokumentet direkt.
2. Skriv löptext i dokumentet → kortet uppdateras, ordräknaren ändras.
3. Skriv `[` → `[]` infogas. Skriv `002` → pill, tom nod 002 i grafen, tom rubrik
   `[002]` under i dokumentet, "002 (tom)" i outline.
4. ⌘Enter från 001 → kursorn står i `[002] `. Skriv titel, ⌘↑ tillbaka till 001.
5. I grafen: dra koppling 001 → 003 → `[003]` syns i dokumentet; 003 skapas om
   den saknas.
6. Radera rubrikraden `[003]` i dokumentet → texten flyter upp i 002; noden 003
   kvar (001 pekar på den). ⌘Z återställer.
7. Zooma och panorera, ⌘N utan markering → noden syns i vyn.
8. ⌘→ / ⌘← i grafen hoppar mellan förälder och barn.
9. Ladda om sidan → allt kvar, sparpillen visar tid.

Basic (`verkstaden.olabelin.se`, på preview-adressen med `/workshop`):
skapa scen, skriv text, koppla två scener, dela, öppna delningslänken i
inkognito. Allt som idag.

## 12. Leverans

- Egen gren `feature/doc-graph-sync` från `master`. Tag `pre-sync-v0.14.1` på
  master före merge.
- Vercel preview-adress skickas till Ola för test innan merge till master.
- CHANGELOG-post för 0.15.0 som listar alla punkter ovan.
