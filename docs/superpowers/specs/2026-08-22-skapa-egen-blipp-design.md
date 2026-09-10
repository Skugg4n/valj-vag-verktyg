# Spec: "Gör din egen berättelse"-blipp i publika läsaren

**Datum:** 2026-08-22
**Status:** Rev 2 efter granskning (Proxy Critic, UI-konsistens, creative-rethinker)

## Syfte
När någon läser en delad berättelse på `verkstaden.olabelin.se/spela/:shareId` ska de få ett ständigt men diskret tips om att de kan skapa en egen berättelse i Berättarverkstaden.

## Lösning
En liten accentknapp i läsvyns topplist (book-bar):

- Text: "✎ Gör din egen berättelse" (desktop), "✎ Gör en egen" (mobil ≤640px).
  Ikonen är textglyfen `✎︎` (tvingad textrendering), INTE färgemojin ✏️, för att matcha barens övriga glyfer (← ↺ ✕).
- Visas **endast** i den publika läsaren: `PublicReader` skickar ny prop `showCreateOwn` till `BookReader`. Villkora på propen (inte på `!onClose`) så förhandsgranskningen i verkstaden garanterat är orörd.
- Element: en riktig länk, `<a className="book-btn accent" href="/workshop" target="_blank" rel="noopener">`.
  - **Länkmål `/workshop`**, inte roten: `parseRoute` skickar roten till avancerade appen på alla värdar utom verkstads-subdomänen (Vercel-previews m.m.). `/workshop` fungerar överallt.
  - **Ny flik** så läsaren inte tappar sin plats i berättelsen (läspositionen sparas inte).
- Placering: sist i raden, efter titeln: `← Tillbaka | ↺ Börja om | (spacer) | BOKTITEL | ✎ Gör din egen berättelse`. Yttersta högerplatsen blir konsekvent "åtgärdsplatsen" (samma slot som "Stäng ✕" i förhandsgranskningen).

## Stil (BookReader.css)
Filen har **inga CSS-variabler** (hårdkodad hex-palett) och verkstadens tokens är inte laddade på `/spela`. Därför hårdkodas accenten på läsarens egen teal:

```css
.book-btn.accent {
  background: #15727a;   /* samma som .book-choice-n */
  color: #fffdf8;        /* samma varmvita som .book-page */
  font-weight: 600;
  flex-shrink: 0;
  text-decoration: none;
  display: inline-block;
}
.book-btn.accent:hover { background: #115e66; }
```

Behåll `.book-btn`:s radius 8px, padding 8px 14px, font-size 13px. Färgen gör blippen, inte formen.

### Mobilskydd (nytt, krävs)
Baren saknar idag trängselskydd. Lägg till:

```css
.book-btn { white-space: nowrap; }
.book-bar-title { min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
@media (max-width: 640px) { /* label-växling lång→kort text */ }
@media (max-width: 480px) { .book-bar-title { display: none; } }
```

## Teknisk plan
- Branch: ny feature-branch från `master` (verkstaden lever på master, v0.14.1; nuvarande checkout är gammal).
- `BookReader.jsx`: prop `showCreateOwn`, länken sist i bar-raden, label-växling via två spans.
- `PublicReader.jsx`: skicka `showCreateOwn`.
- `BookReader.css`: `.book-btn.accent` + mobilskydd enligt ovan.
- Test: gating-testfall (knapp renderas med `showCreateOwn`, inte utan) i `src/__tests__/`.
- Version: `package.json` 0.14.1 → 0.14.2, CHANGELOG-rad, samt rätta versionsraden i CLAUDE.md (står felaktigt 0.8.2).

## Medvetna val / utanför scope
- Felsidan "Berättelsen hittades inte" har ingen book-bar och därmed ingen blipp: medvetet val, sidan uppmanar redan till annan handling.
- Ingen ruta vid "Slut", ingen analytics.
- Frivillig idé från UX-granskning (ej beslutad, byggs inte utan Olas ja): en engångspuls-animation på blippen när läsaren når "Slut".

## Klart när
- Blippen syns på `/spela/:id`, leder till `/workshop` i ny flik.
- Verifierad på 375px bredd med lång boktitel: ingen overflow eller radbrytning.
- Förhandsgranskningen i verkstaden oförändrad (testfall).
- `npm run build` och `npx jest` gröna.
