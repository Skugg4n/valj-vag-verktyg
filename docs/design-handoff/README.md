# Handoff: Lägen & Upplägg — Välj Väg Verktyg

## Översikt

En omarbetning av app-skalet i `valj-vag-verktyg` (CYOA-bokverktyg) som inför **fyra distinkta arbetslägen** för bokskapande och städar upp menystrukturen. Designen löser tre konkreta problem från dagens version:

1. **Splittrade menyer** — header (toppen), FloatingMenu (nere vänster) och projekt-popover är spridda. Streamlinas till en sammanhållen layout.
2. **Canvas/Page-delen är inte fullt funktionell** — outline klumpig, ingen fullbredd, dålig typografi, inget fokusläge. Görs om till en Google Docs-aktig editor.
3. **Lägen finns inte explicit** — nodgraf och löptext är alltid sida vid sida; "Läsa" är eftersatt. Ersätts med fyra växlingsbara lägen som var och en kan användas helt fristående.

## Om filerna i detta paket

HTML/JSX-filerna i mappen är **designreferenser** — interaktiva prototyper byggda med React + Babel-in-browser för att visa avsedd look och beteende. De är **inte produktionskod** och ska inte kopieras in i kodbasen som de är.

Uppdraget är att **återskapa designen i den befintliga kodbasen** (React 19 + Vite + ReactFlow 11 + TipTap 2 + Headless UI + Lucide React) enligt de konventioner som finns där (CSS custom properties från `theme.css`, `.btn` / `.btn.ghost` / `.btn.primary` / `.btn.danger`-systemet, svenska UI-labels). Tailwind-klasser ska INTE återinföras (togs bort i v0.8.1).

## Fidelitet

**Hi-fi.** Färger, typografi, mått, ikoner, hover/active-states och layout är alla bestämda och ska följas pixelnära. Avvikelser bör endast göras där den befintliga design-systemet (CSS-variabler i `theme.css`) säger något annat — i så fall: utöka `theme.css` med de nya variablerna i denna spec.

## Vald variant: **C — Sidebar-nav**

Denna handoff implementerar **Variant C** (sidebar-nav till vänster, slim toppbar). Lägen är ikoner i en 56px bred sidobar; toppbaren reduceras till projektnamn + sök + dela + avatar. Detta utnyttjar bredden bäst och frigör vertikal yta för innehållet.

Variant A (streamlinead toppbar med lägen som tabs i mitten) och B (kontextuell toppbar med åtgärder per läge) är dokumenterade i prototyperna men **ska inte byggas** i denna omgång.

---

## Designtokens

Lägg till/uppdatera i `src/theme.css`. Detta är en **putsad** variant av nuvarande dark-tema — samma DNA, något varmare bläck, mjukare blå accent.

### Färger (dark, default)

```css
:root {
  /* Bakgrund */
  --bg:           #0d1117;   /* app-bakgrund */
  --bg-soft:      #11161e;   /* graph-canvas, sidobar-bg */
  --panel:        #161b22;   /* paneler, toolbars */
  --panel-2:      #1b212b;   /* hover, doc-page */
  --line:         #232a36;   /* skiljestreck, kanter */
  --line-strong:  #2f3845;   /* nodborders, toolbars */
  --card:         #1f2937;   /* nod-bakgrund */

  /* Bläck */
  --ink:          #e8ecf2;   /* primär text */
  --ink-soft:     #b6bdc9;   /* sekundär */
  --ink-dim:      #7d8696;   /* dämpad / metadata */

  /* Accent */
  --accent:       #6ea8ff;   /* huvudaccent — desaturerad blå */
  --accent-soft:  #2a3b5c;   /* fyllning för aktiva states */

  /* Status */
  --good:         #6cd09a;
  --warn:         #f0b955;
  --danger:       #f06a6a;
}
```

### Läs-läge tema-tokens (Läsa-läget)

```css
[data-reading="paper"] {
  --paper-bg:       #f6f1e6;
  --paper-ink:      #1d1a16;
  --paper-ink-dim:  #6a6258;
  --paper-rule:     #d9d0bf;
}
[data-reading="dark"] {
  --paper-bg:       #15191f;
  --paper-ink:      #e8ecf2;
  --paper-ink-dim:  #8a93a3;
  --paper-rule:     #2a3140;
}
```

### Typografi

| Roll | Font | Notes |
|---|---|---|
| UI / system | `Inter`, `-apple-system`, `Segoe UI`, system-ui, sans-serif | Befintlig — behåll |
| Dokument / brand / läs | `"Source Serif Pro"`, `"Iowan Old Style"`, Georgia, serif | **Ny** — Google Font, vikt 400/600 + ital 400 |
| Mono (id-taggar, kbd, status) | `"JetBrains Mono"`, ui-monospace, "SF Mono", Menlo, monospace | **Ny** — Google Font, vikt 400/500 |

Importera Google Fonts en gång i `index.html`:
```html
<link href="https://fonts.googleapis.com/css2?family=Source+Serif+Pro:ital,wght@0,400;0,600;1,400&family=JetBrains+Mono:wght@400;500&display=swap" rel="stylesheet">
```

### Skala

```css
--r-sm: 4px;   --r: 6px;   --r-md: 10px;   --r-lg: 14px;
--ease: cubic-bezier(.2,.8,.2,1);
```

---

## Layout — Variant C (Sidebar-nav)

```
┌─────┬──────────────────────────────────────────────┐
│     │  topbar  44px                                │
│ sb  ├──────────────────────────────────────────────┤
│ 56  │                                              │
│ px  │           workspace (flex:1)                 │
│     │                                              │
└─────┴──────────────────────────────────────────────┘
```

### Top-level shell (`<App>`)

- Root: `display: flex; height: 100vh; background: var(--bg); color: var(--ink);`
- Children:
  - `<SidebarNav>` — fix bredd 56px, kant-till-kant höjd
  - Höger kolumn — `flex: 1; display: flex; flex-direction: column; min-width: 0`
    - `<Topbar>` — höjd 44px
    - `<Workspace>` — `flex: 1; min-height: 0; overflow: hidden`
    - (statusrad bara i Innehåll-läge — se DocPane nedan)

### `<SidebarNav>` — Lägesväxlare

| Detalj | Värde |
|---|---|
| Bredd | 56px |
| Bakgrund | `var(--bg-soft)` |
| Höger-kant | `1px solid var(--line)` |
| Layout | `flex column`, `align-items: center`, padding 12px 0, gap 4px |

Innehåll, top-down:
1. **Logo-knapp** (40×40, hem) — gradient `linear-gradient(135deg, #6ea8ff, #b88dff)`, border-radius 5px, 20×20 inom 40×40 button.
2. **Separator** — 28px bred, 1px hög, `var(--line)`, marginal 8px 0
3. **Lägesknappar** (4 st, vertikalt) — 40×40, border-radius 8px, ikon 18px:
   - **Skiss** — ikon `network` (lucide)
   - **Skiss + Innehåll** — ikon `panels-left-right` (alt: `split` lucide-namn)
   - **Innehåll** — ikon `file-text`
   - **Läsa** — ikon `book-open`
4. **Spacer** — `flex: 1`
5. **Historik** — ikon `history`
6. **Inställningar** — ikon `settings`

**States** för lägesknapparna:
- Default: `color: var(--ink-dim); background: transparent`
- Hover: `background: var(--panel); color: var(--ink)`
- Aktiv: `background: var(--panel-2); color: var(--accent)` + en 2px vertikal accentstreck (`::before`) längs vänsterkanten på knappen — `position: absolute; left: -1px; top: 8px; bottom: 8px; width: 2px; background: var(--accent); border-radius: 0 2px 2px 0`

### `<Topbar>` (variant C — slim)

| Detalj | Värde |
|---|---|
| Höjd | 44px |
| Padding | 0 14px |
| Bakgrund | `var(--bg)` |
| Bottom-border | `1px solid var(--line)` |
| Layout | `flex`, `align-items: center`, `gap: 12px` |

Innehåll vänster→höger:
- **Projektnamn** (input) — transparent bg, no border, font Source Serif Pro italic 15px, padding 4px 8px, hover/focus `background: var(--panel)`. Samma binding som dagens `projectName`.
- **Spara-pill** — pill 999px radius, padding 3px 8px, font-size 11.5px, `background: var(--panel-2)`, border `1px solid var(--line)`. Innehåll: 6px grön dot (`var(--good)` om sparat, `var(--warn)` om osparat) + text "sparad" / "sparar…".
- `flex: 1` spacer
- **Sök-knapp** — `<button class="btn ghost sm">` med ikon `search` + text "Sök" + `<span class="kbd">⌘K</span>`. Öppnar command palette.
- **Dela** — ikon-only `share` (lucide), btn ghost
- 1px×22px divider
- **Avatar** — 26×26 cirkel, samma gradient som logo

---

## Lägen (workspace-innehåll)

Workspace renderar exakt **ett** av följande beroende på aktivt läge. Lägesväxling triggas av sidebar-knapp eller kortkommandona `1`/`2`/`3`/`4` (när inte i input).

### 1) Skiss

Bara nod-grafen, full bredd. Återanvänd dagens `ReactFlow` med `NodeCard`. Visuell uppstädning:

- **Bakgrund** — radial-dot grid: `radial-gradient(circle at 20px 20px, var(--line) 1px, transparent 1.5px); background-size: 22px 22px;` på `var(--bg-soft)`.
- **Toolbar** — flytande, `position: absolute; top: 12px; left: 12px`, `display: flex; gap: 4px`, padding 4px, `background: var(--panel)`, `border: 1px solid var(--line)`, `border-radius: 10px`, `box-shadow: 0 8px 24px rgba(0,0,0,.25)`. Knappar: `plus` (Ny nod), `layout` (Auto-layout), `layers` (Sektion), `lightbulb` (Idé). Alla 28×28, `btn ghost icon`.
- **Zoom-controls** — `position: absolute; bottom: 12px; right: 12px`, kolumn av tre 32×32-knappar (+ / − / ⌖) i `var(--panel)`-container med `border-radius: 6px`.
- **Mini-map** — `position: absolute; bottom: 12px; left: 12px; width: 180px; height: 110px`, bakgrund `var(--panel)`, samma border/shadow. Återanvänd ReactFlow `<MiniMap>` men styla att matcha (pannable, zoomable).
- **Nod-card** (NodeCard.jsx) — uppdatera styling:
  - `background: var(--card)`, `border: 1px solid var(--line-strong)`, `border-radius: 8px`, `padding: 10px 12px`, `box-shadow: 0 4px 14px rgba(0,0,0,.25)`
  - Aktiv (vald): `border-color: var(--accent); box-shadow: 0 0 0 2px var(--accent-soft), 0 8px 22px rgba(0,0,0,.4)`
  - Hover: `border-color: var(--accent); transform: translateY(-1px)` med `transition: 0.15s var(--ease)`
  - Lägg till en 3px vertikal `accent-bar` på vänsterkanten färgad enligt nodens `data.color`
  - ID-tag (`#001`) — JetBrains Mono 10px, `var(--ink-dim)`, ovanför titel
  - Titel — 13px 600 vikt, line-height 1.25
  - Text-preview — 11.5px, `var(--ink-soft)`, line-clamp 3
  - Refs (`[#NNN]`) i preview renderas som `<span class="ref">→ Titel</span>` — JetBrains Mono 10.5px, `var(--accent)`

### 2) Skiss + Innehåll (split)

`flex` rad: `[GraphPane (flex: ratio)] [SplitDivider] [DocPane (flex: 1-ratio)]` där `ratio` default = `0.42` (graf får ~42% av bredden).

- **SplitDivider** — 1px bred kolumn, `background: var(--line)`, `cursor: col-resize`. På hover/aktiv: `background: var(--accent)`. `::before`-pseudo med `inset: 0 -3px` för bredare hit-target.
- Drag uppdaterar `ratio` clampad till [0.2, 0.8].
- I split-läget — outline i DocPane döljs default (för att spara plats); användaren kan toggla från doc-toolbar.

**Nod ↔ text-koppling i split:**
- Klick på nod (graph) → sätter `activeId` → DocPane scrollar (`smooth`) så att section med `data-node-id={id}` är 60px från toppen + den sectionens `<h2>` får klassen `is-active`.
- Klick på en `[#NNN]`-länk i DocPane (renderad som `<a class="ref-link">`) → samma `activeId`-uppdatering + scrollar i DocPane.
- DocPane lyssnar på sin egen scroll och rapporterar tillbaka aktuell section som `activeId` (debounce ej nödvändig). Det får GraphPane att highlighta motsvarande nod (border-färg accent + accent-soft glow) och bågar in/ut från noden.
- Mini-map i graph reflekterar samma `activeId`: aktiv rect har vit stroke, övriga 0.55 opacity.

### 3) Innehåll

DocPane på full bredd. Lägg till **statusrad** (28px hög, monospace 11.5px, samma färger som doc-toolbaren) längst ner: "{N} sektioner · {ord} ord · ● Sparad" till vänster, "v0.x · skiss" till höger.

#### `<DocPane>` struktur

```
.doc-pane (flex column, flex:1)
  .doc-toolbar (40px hög, scrollar horisontellt om nödvändigt)
  .doc-body (flex row, flex:1, min-height:0)
    .doc-outline (200px, flex:0 0 auto) — kan döljas (width: 0, opacity: 0)
    .doc-scroll (flex:1, overflow-y:auto, padding: 48px 0 200px, scroll-behavior: smooth)
      .doc-page (centrerad)
  .doc-status (28px) — bara i fullbredds-läge
```

#### `.doc-toolbar`

- Höjd 40px, padding 0 12px, `border-bottom: 1px solid var(--line)`
- Knappar 28×28, `border-radius: 4px`, ikon 15px, `color: var(--ink-soft)`. Hover: `background: var(--panel-2); color: var(--ink)`. Aktiv: `background: var(--accent-soft); color: var(--accent)`.
- Grupper separeras med `1px solid var(--line)` höger-kant + 8px padding.
- Grupp 1: Outline-toggle (ikon `layers`)
- Grupp 2: `<select>` med Normal text / Rubrik 1 / Rubrik 2 / Rubrik 3 — transparent bg, `1px solid var(--line)`, padding 3px 6px
- Grupp 3: Bold / Italic / Underline (anslut till TipTap-kommandon)
- Grupp 4: List / Link
- Grupp 5: Plus (Ny nod — `editor.chain().focus().insertContent('\n\n## #NNN \n\n').run()`)
- `flex: 1` spacer
- I fullbredds-läge: Fokus-toggle (ikon `focus`) längst höger

#### `.doc-outline`

- 200px bred, `background: var(--bg-soft)`, `border-right: 1px solid var(--line)`, padding 12px 8px 12px 12px, `overflow-y: auto`.
- Title — 10.5px UPPERCASE letter-spacing 0.08em, `var(--ink-dim)`, font-weight 600, padding 4px 8px.
- Items — `<button>`, full bredd, text-align left, padding 5px 8px, `border-radius: 4px`, font 12.5px, line-height 1.4, `border-left: 2px solid transparent`. ID-tag (JetBrains Mono 10px `var(--ink-dim)`, marginal-right 6px) + titel.
- Hover: `background: var(--panel); color: var(--ink)`.
- Aktiv: `background: var(--panel-2); color: var(--ink); border-left-color: var(--accent)`. ID-tag färgas `var(--accent)`.
- **Toggle**: Outline kan kollapsas (`width: 0; padding: 0; opacity: 0; pointer-events: none`) med `transition: width 0.25s var(--ease), opacity 0.2s`. Knapp i doc-toolbar styr.

#### `.doc-page` (Google Docs-känsla)

- `max-width: min(720px, 92%)`, `margin: 0 auto`
- `padding: 56px clamp(28px, 6%, 80px)` — generös vit yta på sidorna
- `background: var(--panel)`, `border: 1px solid var(--line)`, `border-radius: 4px`
- `box-shadow: 0 6px 30px rgba(0,0,0,.3)`
- `min-height: 1100px` (känns som ett A4-ark)
- Font: Source Serif Pro 16.5px, `line-height: 1.7`, `text-wrap: pretty`, `color: var(--ink)`

**Element:**
- `<h1>` — 30px 600, letter-spacing -0.01em, line-height 1.2, margin 0 0 4px
- Subtitle — italic, `var(--ink-dim)`, 16px, margin-bottom 38px
- `<h2>` — 21px 600, margin 38px 0 12px, `scroll-margin-top: 24px`, `display: flex; align-items: baseline; gap: 12px`
  - Inuti: `<span class="node-id">#001</span>` — JetBrains Mono 12px, `var(--ink-dim)`, padding 2px 7px, `background: var(--bg-soft)`, `border: 1px solid var(--line)`, `border-radius: 4px`. Aktiv (matchar `activeId`): färg/border `var(--accent)`/`var(--accent-soft)`.
  - + nodtitel
- `<p>` — margin 0 0 1em, `text-wrap: pretty`
- **Ref-länkar** `[#NNN]` renderas som inline-element:
  ```html
  <a class="ref-link" data-target="NNN" href="#NNN">→ Längs vattnet</a>
  ```
  Styling: `display: inline-flex; align-items: center; gap: 3px; font-family: JetBrains Mono; font-size: 13px; color: var(--accent); background: var(--accent-soft); padding: 1px 7px; border-radius: 3px; text-decoration: none; margin: 0 2px; cursor: pointer; border: 1px solid transparent`. Hover: `border-color: var(--accent)`.

#### Fokusläge

I fullbredds-läge ("Innehåll") finns en knapp i doc-toolbar (ikon `focus`) som togglar `focus-mode` på app-shell. När aktiverat:
- `.topbar`, `.doc-toolbar`, `.doc-status`, `.sidebar-nav`, `.doc-outline` — `display: none`
- `.doc-page` — `box-shadow: none; border: none; background: transparent`
- En liten "Avsluta fokus"-knapp visas fixerad uppe till höger (`position: fixed; top: 16px; right: 16px; z-index: 30`).
- Esc avslutar fokusläge.

### 4) Läsa

Bok-typografi, full bredd. Strukturen är dagens `Playthrough` men med rejäl visuell omarbetning.

```
.read-shell (flex column)
  .read-bar (44px hög)
  .read-stage (flex:1, overflow-y:auto, padding 60px 24px 120px)
    .read-page (max-width: 620px, margin: 0 auto, font: Source Serif Pro)
    .read-breadcrumb (sticky bottom)
```

#### `.read-bar`

- 44px, padding 0 16px, `background: var(--bg)`, `border-bottom: 1px solid var(--line)`, `display: flex; align-items: center; gap: 12px`.
- Vänster: "← Tillbaka" (deaktiverad om history är tom), "↺ Börja om" — båda `btn ghost sm`
- `flex: 1` spacer
- **Läsare/Redaktör-toggle** — segment med 2 buttons. `display: inline-flex; background: var(--panel); border: 1px solid var(--line); border-radius: 6px; padding: 2px`. Inre buttons: padding 4px 10px, `border-radius: 4px`, font-size 11.5px 500. Aktiv: `background: var(--panel-2); color: var(--ink)`. Inaktiv: `color: var(--ink-dim)`.
- **Papper/Mörk-toggle** — samma stil
- "Dela"-knapp (ikon `share` + text)

#### `.read-stage`

- `background: var(--paper-bg)` (bestäms av `data-reading="paper"|"dark"` på shell)
- `color: var(--paper-ink)`
- Padding: 60px top/bottom-area, 24px sides
- `scroll-behavior: smooth`

#### `.read-page`

- `max-width: 620px; margin: 0 auto`, font Source Serif Pro
- **Chapter-num** — JetBrains Mono 11px `var(--paper-ink-dim)`, letter-spacing 0.16em, UPPERCASE, marginal-bottom 6px. Format: "KAPITEL 04" + (i redaktörsläge) " · #004".
- **`<h1>`** — 34px 600, letter-spacing -0.01em, line-height 1.15, margin 0 0 32px, `border-bottom: 1px solid var(--paper-rule); padding-bottom: 18px`.
- **`<p>`** — 19px, line-height 1.75, margin 0 0 1.1em, `text-wrap: pretty`, `hyphens: auto`. Första paragrafen efter `<h1>` får drop-cap: `::first-letter { font-size: 3.4em; float: left; line-height: 0.85; padding: 6px 8px 0 0; font-weight: 600 }`.
- **Text rendering**: ta bort alla `[#NNN]` / `#NNN`-tokens från brödtext (de renderas som val längst ner, inte inline).
- **Val-block** `.read-choices`:
  - margin-top 44px, padding-top 24px, `border-top: 1px solid var(--paper-rule)`.
  - Etikett "VAD GÖR DU?" — JetBrains Mono 11px UPPERCASE letter-spacing 0.14em, `var(--paper-ink-dim)`, margin-bottom 14px.
  - Varje val: full bredd `<button>`, padding 14px 18px, `border: 1px solid var(--paper-rule)`, `border-radius: 4px`, font Source Serif Pro 17px, `color: var(--paper-ink)`, `background: transparent`, margin-bottom 10px, text-align left, `position: relative`.
  - Hover: `background: rgba(0,0,0,.04)` (dark-tema: `rgba(255,255,255,.04)`), `border-color: var(--paper-ink)`, `transform: translateX(2px)`, transition 0.18s var(--ease).
  - Inuti: `<span class="num">A.</span>` (JetBrains Mono 11px, dim, marginal-right 12px) + valets titel + pil-ikon till höger som fade in på hover.
  - **I redaktörsläge**: lägg till en `data-target="#NNN"`-tagg som visas via `::after { content: attr(data-target); position: absolute; right: 48px; ... }`.

#### `.read-breadcrumb`

- `position: sticky; bottom: 0`, `background: linear-gradient(to top, var(--paper-bg) 70%, transparent)`, padding 16px 24px 14px, `max-width: 620px; margin: 32px auto 0`.
- JetBrains Mono 11px, `var(--paper-ink-dim)`.
- Items: `<span class="crumb">` separerade med `›`. Hover: `background: rgba(0,0,0,.06)`. Aktuell: `font-weight: 600; color: var(--paper-ink)`.
- Klick på en crumb går tillbaka till den punkten i historiken.

---

## Command palette (⌘K)

Öppnas från sök-knappen i topbar eller med `Cmd+K` / `Ctrl+K`.

- Bakgrund: full-screen overlay `rgba(13,17,23,.6)` + `backdrop-filter: blur(4px)`, padding-top `12vh`, justify-center.
- Container: 540px bred (max 90vw), `background: var(--panel)`, `border: 1px solid var(--line-strong)`, `border-radius: 14px`, `box-shadow: 0 24px 60px rgba(0,0,0,.5)`, overflow hidden.
- Input: full bredd, padding 16px 20px, transparent bg, no border, `border-bottom: 1px solid var(--line)`, font 16px, autoFocus.
- Lista: max-height 360px, overflow-y auto, padding 6px.
- Items: `display: flex; align-items: center; gap: 12px`, padding 10px 14px, `border-radius: 6px`, font 13px. Hover/aktiv: `background: var(--panel-2)`. Layout: ikon (var(--ink-dim), accent när aktiv) + label + (right) `<span class="kbd">`-genväg.
- Sektioner — header `font-size: 10px; UPPERCASE; letter-spacing: 0.1em; color: var(--ink-dim); padding: 8px 14px 4px`.
- Innehåll (åtminstone): Lägen (Skiss/Split/Innehåll/Läsa), Skapa (Ny nod ⌘N, Ny sektion, Ny idé), Verktyg (Auto-layout, Visa historik, Exportera markdown, Importera, Inställningar, Hjälp).
- Esc stänger.

---

## State management

Behåll dagens approach (React useState/useRef i `App.jsx`, ingen Redux/Zustand). Lägg till:

```js
const [mode, setMode] = useState('split'); // 'skiss' | 'split' | 'text' | 'read'
const [outlineHidden, setOutlineHidden] = useState(false);
const [focusMode, setFocusMode] = useState(false);
const [readTheme, setReadTheme] = useState('paper'); // 'paper' | 'dark'
const [readEditor, setReadEditor] = useState(false);
const [splitRatio, setSplitRatio] = useState(0.42);
const [cmdOpen, setCmdOpen] = useState(false);
```

`activeNodeId` finns redan — använd den i alla lägen för synk.

Persistera `mode`, `splitRatio`, `readTheme` i localStorage (key-prefix `vv-`).

## Kortkommandon

Lägg till utöver dagens (`⌘Z`, `⌘N`, `⌘D`, `⌘F`):
- `⌘K` — command palette
- `1`/`2`/`3`/`4` — växla läge (när inte i input/contenteditable)
- `Esc` — stäng command palette / avsluta fokusläge

## Migration / kompatibilitet

- **Borttagning av `<header>` med utspridda knappar** i `App.jsx` rad ~1010-1110. Flytta `New Node`/`Delete Node`/`Undo`/`Redo` till GraphPane-toolbar (Skiss-läge) och command palette. `Project`-popover, project-dropdown, Auto-save-checkbox, font-size, theme, debug — flyttas till command palette + en "Inställningar"-modal.
- **`FloatingMenu.jsx`** — kan tas bort helt. Allt innehåll går till command palette.
- **`Playthrough.jsx`** — uppgraderas enligt Läsa-specen ovan. Inte längre overlay/modal — det är ett fullt läge.
- **`LinearView.jsx`** — uppgraderas enligt DocPane-specen. Toolbar separeras tydligare. Outline blir collapsbar.
- **`useFirestoreSync` / `useProjectStorage`** — orörda.

## Ikoner (Lucide)

Använd Lucide React (redan i kodbasen). Mappning:

| Funktion | Lucide-namn |
|---|---|
| Lägen — Skiss | `Network` |
| Lägen — Split | `Columns2` (eller `PanelsLeftRight`) |
| Lägen — Innehåll | `FileText` |
| Lägen — Läsa | `BookOpen` |
| Auto-layout | `LayoutGrid` |
| Sektion | `Layers` |
| Idé | `Lightbulb` |
| Outline-toggle | `PanelLeftClose` / `PanelLeftOpen` |
| Fokusläge | `Maximize2` |
| Sök / cmd-K | `Search` / `Command` |
| Historik | `History` |
| Inställningar | `Settings` |
| Dela | `Share2` |
| Ny | `Plus` |
| Ta bort | `Trash2` |
| Undo/Redo | `RotateCcw` / `RotateCw` |
| Exportera | `Download` |
| Importera | `Upload` |
| Hjälp | `HelpCircle` |
| Tillbaka (Läsa) | `ArrowLeft` |
| Börja om (Läsa) | `RotateCcw` |

---

## Filer i detta paket (referens)

| Fil | Roll |
|---|---|
| `Välj Väg - Upplägg.html` | Huvudprototyp — öppna i webbläsare. Toggle "Tweaks" → "Jämförelse" visar alla tre menyvarianter (A/B/C) sida vid sida. |
| `styles.css` | All styling — färdiga tokens och regler. Källa för exakta värden. |
| `app-shell.jsx` | Toppnivå-state-machine, lägesväxling, split-divider-drag, kortkommandon. |
| `topbar.jsx` | Variant A/B/C + SidebarNav + ModeTabs + CommandPalette. **För denna handoff: använd bara `TopbarC` + `SidebarNav` + `CommandPalette`.** |
| `graph-pane.jsx` | Skiss-läget. Pan/zoom är fake i prototypen — i prod använd ReactFlow. Notera node-card-styling, edge-färger (`#3a4250` default, `#6ea8ff` aktiv), arrow-markers. |
| `doc-pane.jsx` | DocPane med toolbar, outline, page, ref-links, scroll-tracking. |
| `read-pane.jsx` | Läsa-läget med history, choices, drop-cap, breadcrumb, papper/mörk + läsare/redaktör. |
| `icons.jsx` | Inline SVG-ikoner — i prod ersätt med Lucide React-import. |
| `story-data.js` | Exempelberättelse för prototypen. Ignoreras i prod. |

## Att testa när det är byggt

1. Växla mellan alla 4 lägen via sidebar och via 1/2/3/4 — state behålls.
2. I Skiss + Innehåll: klick på nod scrollar i text. Scroll i text highlightar nod. Klick på `[#NNN]`-länk i text gör samma sak. Drag i split-divider justerar ratio.
3. I Innehåll: outline-toggle, fokusläge (Esc avslutar), statusrad uppdateras live.
4. I Läsa: papper/mörk växlar tema. Läsare/redaktör visar/döljer #NNN-debug. Tillbaka/Börja om fungerar. Klick på breadcrumb-crumb hoppar tillbaka.
5. ⌘K öppnar palette. Esc stänger. Klick på "Skiss" där växlar läge.
6. Mörk/ljus tema — fungerar fortsatt (Inställningar i palette).
