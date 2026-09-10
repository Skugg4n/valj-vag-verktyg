# Strategi: vad verktyget är, vilka delar som finns och hur det ska fungera

> Skrivet 2026-09-09, beslut låsta 2026-09-10 tillsammans med Ola. Bakgrund: Advanced
> visade sig ha en trasig graf/text-synk som lagats i omgångar utan gemensam målbild.
> Syftet med dokumentet är att alla ändringar framöver ska prövas mot det här, inte
> mot senaste buggrapporten. Detaljerad spec för synken:
> `docs/superpowers/specs/2026-09-10-graf-dokument-synk-design.md`.

---

## 1. Vad vi försöker uppnå

Ur `facts/VISION.md` (skrivet i mars 2026):

> Ett kreativt verktyg för att skapa välj-väg-böcker med sömlös växling mellan
> nodvy, linjär textvy och spelvy.

Kärnan: författaren ska kunna **se strukturen** (grafen) och **skriva långform**
(dokumentet) om *samma* berättelse, och växla fritt utan att något går sönder.
Sedan **läsa** resultatet som en läsare skulle, och **exportera** i öppna format.

Principer: sömlöshet, lätthet, överblick, portabilitet.
Uttalade icke-mål: ingen publiceringsplattform, ingen generell texteditor, inget
samarbete i realtid.

**Två produkter i samma kodbas, med olika publik:**

| | Advanced (Välj Väg Verktyg) | Basic (Ola Belins Berättarverkstad) |
|---|---|---|
| Adress | valj-vag-verktyg.vercel.app | verkstaden.olabelin.se |
| Användare | Ola själv, som författare | Barn och handledare, live med publik |
| Innehåll | Lång bok, många scener, lång text | 10 till 20 scener, korta texter |
| Läge | Under utveckling, buggig | I drift, får inte gå sönder |
| Kod | `App.jsx` plus paneler nedan | `WorkshopApp.jsx` plus egna komponenter |

De delar bara: inloggning, Firestore-lagring, läsaren (`BookReader`) och några
små hjälpfiler. Ingen av Advanced-editorns vy- eller synkfiler används av Basic.

---

## 2. Vilka delar Advanced har idag

### 2.1 Datamodellen (det alla vyer bygger på)

- **Nod** = en scen. Har id (`001`, `002` ...), titel, text, färg, position i
  grafen, storlek. Två specialsorter: **idé-nod** (`isIdea`, id `idea-<tid>`,
  hör inte till berättelsen förrän den "befordras") och **sektion** (grupp-ram,
  avstängd i v0.9.4 för att den var halvbyggd).
- **Koppling** = en länk `[#NNN]` inne i en scens text. Grafens pilar räknas fram
  ur texten varje gång (`scanEdges`). Det finns alltså ingen separat lista med
  kopplingar; texten är sanningen.
- **Projekt** = en lista noder plus namn. Sparas i localStorage alltid, i
  Firestore när man är inloggad, med versionshistoria var femte minut.

### 2.2 De fyra lägena (v0.9.0, maj 2026)

| Läge | Kortkommando | Vad den visar | Fil |
|---|---|---|---|
| Skiss | 1 | Grafen i fullbredd | `GraphPane.jsx`, `NodeCard.jsx` |
| Skiss + Innehåll | 2 | Graf till vänster, dokument till höger | båda |
| Innehåll | 3 | Dokumentet i fullbredd, med outline | `DocPane.jsx` |
| Läsa | 4 | Läsarvy med val, brödsmulor, papper/mörkt | `ReadPane.jsx` |

Runt dem: sidorail (`SidebarNav`), topplist med projektmeny och sparstatus
(`Topbar`, `ProjectMenu`), kommandopalett ⌘K (`CommandPalette`).

### 2.3 Verktyg och paneler

- **Versionshistorik** (`HistoryModal`): Firestore-versioner, spara med ⌘S, återställ.
- **Insikter** (`InsightsModal`, `storyAnalysis.js`): oåtkomliga scener, återvändsgränder, längsta väg, loopar.
- **Export** (`ExportModal`): JSON, Markdown, fristående HTML-läsare.
- **Import** av Markdown.
- **Auto-layout** med Dagre.
- **Ångra/gör om** med hopslagna steg per redigering.
- **AI-paneler** finns som kod men är inaktiva.

### 2.4 Synken graf ↔ dokument: så fungerar den idag (och varför den är trasig)

Detta är kärnan i problemet.

```
Graf (nodes)  ──── en gång vid laddning ───▶  Dokument (linearText)
Graf (nodes)  ◀─── vid varje tangent (0,5 s) ──  Dokument (linearText)
```

- Dokumenttexten skapas **en enda gång** från noderna när projektet laddas.
- Därefter skickas ändringar **bara från dokumentet till grafen**. Allt du gör i
  grafen (ny nod, ny titel, ny koppling, ny text i kortet) når aldrig dokumentet.
- När du sedan skriver i dokumentet tolkas dess gamla innehåll som sanning och
  skriver över grafens noder. Kopplingar som bara fanns i grafen försvinner.
- Nya noder som skapas i dokumentet kräver exakt formen `## #004 Titel` på egen
  rad. Ingen hjälp finns för det.

Detta infördes medvetet i v0.7.4 (mars) för att stoppa en oändlig loop
(graf → text → graf → ...) som frös webbläsaren. Omgörningen i maj byggde nytt
utseende ovanpå samma halva synk. Sedan dess har buggarna lagats en och en
(v0.9.1 till v0.9.5) utan att grundfrågan ställts: **vem äger sanningen?**

### 2.5 Kända fel utöver synken

- Ny nod utan markerad nod placeras i skärmpixlar, inte grafkoordinater. Efter
  zoom eller panorering hamnar den utanför synfältet.
- Ny nod får inte fokus. Man måste klicka sig till den (Olas önskan: ⌘Enter som
  skapar länkad nod och ställer kursorn i titeln).
- Sektioner är avstängda.

---

## 3. Hur det ska fungera (målbild, utkast)

### 3.1 En sanning

Noderna är sanningen. Dokumentet är en **vy** av noderna, precis som grafen är
en vy av noderna. Ingen av vyerna får ha ett eget minne av innehållet som kan
glida isär från noderna.

Konkret betyder det:

- Ändrar du i grafen (titel, text, koppling, ny nod, borttagen nod) så ritas
  dokumentet om från noderna, direkt.
- Skriver du i dokumentet så uppdateras noderna, och grafen ritas om från dem.
- Loopen från mars undviks genom en enkel regel: en uppdatering som kom **från**
  dokumentet skickas inte **tillbaka** till dokumentet, och tvärtom. Det är ett
  känt mönster, det ska ha ett automatiskt test som bevisar att loopen inte kan
  uppstå.

### 3.2 Dokumentet som skrivyta

- Varje scen är en rubrik `#NNN Titel` följd av sin text. Outline till vänster.
- En koppling skrivs som en länkpill `→ #NNN` i texten och motsvarar en pil i
  grafen. Klick på pillen hoppar dit.
- **Ny scen (beslut 2026-09-09):** ⌘Enter skapar en ny scen länkad från den
  scen kursorn står i, lägger in rubriken och ställer kursorn i titeln. Samma
  kommando i graf och dokument. Att skriva rubriken för hand fungerar fortfarande.
- **Byta scen med tangentbordet (beslut 2026-09-09):** ⌘ + piltangent flyttar
  markering och kursor mellan scener, i båda vyerna, så att man kan skapa en scen,
  pila tillbaka till den föregående och skapa nästa utan att röra musen.
  - I grafen: ⌘ + pil markerar närmsta nod i pilens riktning, mätt från den
    markerade nodens mitt. Vid flera kandidater vinner den som ligger mest rakt i
    pilens riktning, inte den med kortast avstånd. Eftersom layouten lägger
    föräldrar till vänster och barn till höger blir det i praktiken vägnavigering.
  - I dokumentet: ⌘↑ / ⌘↓ går till föregående / nästa scen i listan. ⌘← / ⌘→ gör
    ingenting där.
  - ⌘Enter lägger den nya noden till höger om den markerade, så ⌘← tar en tillbaka.
- **Referenser (beslut 2026-09-10):** i dokumentet skrivs en scenrubrik `[003] Titel`
  och ett val `[004]` inne i löptexten. Bara tresiffriga nummer räknas. Skriver
  man `[` läggs `]` till automatiskt. Internt lagras länkar fortfarande som
  `[#NNN]` så att läsare, export och Basic är orörda; översättningen sker bara i
  dokumentvyn.
- **En scen finns så länge den har en rubrik eller pekas på av ett val.** En
  referens till en scen som saknas skapar den: tom nod i grafen, tom rubrik i
  dokumentet på sin plats i nummerordning, "004 (tom)" i outline. Rättar man
  numret försvinner den tomma scenen igen. ⌘Enter tar först den första scen som
  pekas på men saknar rubrik, annars nästa lediga nummer.
- **Radering (beslut 2026-09-10):** raderas en rubrikrad flyter texten under in i
  scenen ovanför. Noden finns kvar om något val pekar på den, annars försvinner
  den. ⌘Z tar tillbaka allt. Inga låsta rader, inga dialoger.
- **Dokumentordning** = nummerordning.

### 3.3 Grafen som strukturyta

- Ny nod hamnar synligt: bredvid markerad nod om någon är markerad, annars mitt
  i det du ser just nu, räknat i grafens koordinater.
- ⌘Enter från en nod: skapa länkad nod, markera den, kursor i titeln.
- Dra en koppling från en nods kant till en annan skapar `[#NNN]` i texten.
- **Idé-noder behålls** (beslut 2026-09-10). De hålls utanför dokumentet och stör
  inte synken. **Sektioner tas bort ur koden** tills de behövs på riktigt.

### 3.4 Läsläget

Redan i bra skick enligt tidigare test. Ska bara följa noderna.

### 3.5 Lagring

Noderna sparas lokalt alltid och i Firestore inloggad. Historik var femte
minut. Detta fungerar sedan juni när databasen skapades.

Beslut 2026-09-10: lagringen behålls som den är. Topplisten får en tydlig
"Sparad hh:mm"-text så att man ser att det hänt.

---

## 4. Hur vi arbetar framåt (så att det inte plåstras igen)

1. Ingen ändring i Advanced-editorn utan att den kan pekas ut i det här
   dokumentet. Saknas punkten, uppdatera dokumentet först.
2. Synken får ett eget testpaket: graf → dok, dok → graf, ingen loop, ingen
   förlorad koppling. Alla måste vara gröna innan något pushas.
3. Basic får ett eget "rökprov" som körs före varje deploy: öppna verkstaden,
   skapa scen, koppla, dela, öppna delningslänken utloggad.
4. Ola testar varje steg på en förhandsadress innan master.
