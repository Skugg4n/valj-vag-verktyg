# Manusformat för Välj Väg Verktyg

Kort regelsamling för den som skriver ett manus i markdown som ska importeras
i Advanced-editorn (valj-vag-verktyg.vercel.app, "Importera markdown").

## Regler

1. **En scen = en rubrik.** Rubriken skrivs `# [001] Titel` eller `## [001] Titel`.
   Numret är tre siffror i hakparentes. Titeln är valfri. Nummer behöver inte
   vara i ordning, men varje nummer får bara finnas en gång.
2. **Allt under rubriken är scenens text**, fram till nästa rubrik. Vanlig
   markdown: stycken med tomrad emellan, `*kursiv*`, `**fet**`.
3. **Ett val skrivs som en referens till en annan scen:** `[002]` inne i
   texten. Skriv gärna valet som en mening: `Om Alba öppnar dörren, håll upp
   grön tumme nu. [002]`. Formen `[[002]](#002)` och `[#002]` förstås också.
4. **Refererar du till en scen som inte har någon rubrik** skapas den tom vid
   import. Bra för att skissa: skriv valen först, fyll i scenerna sen.
5. **Första scenen ska vara 001.** Läsaren börjar där.
6. **Regianvisningar skrivs i kursiv med hakparentes:** `*[MUSIK: hemmatemat.]*`
   Det är den överenskomna markeringen för sådant som är till berättaren, inte
   till publiken. De ligger kvar i scenens text och visas kursiva.
7. **Skisser markeras med `*[SKISS]*`** först i stycket. Samma sak för
   `*[UTKAST ...]*` och `*[NAV ...]*`. Allt som står i `*[...]*` är regi.
8. Undvik markdown-tabeller, bilder och rubriker av nivå tre och djupare.
   De importeras som text men har ingen betydelse.

## Minsta exempel

```markdown
# [001] Start

Bussen rullar. *[MUSIK: hemmatemat.]*

Om Alba trycker på knappen, håll upp grön tumme nu. [002]

Om hon låter bli, håll upp röd tumme nu. [003]

# [002] Klick

VOOOMP. [004]

# [003] Ingenting händer

Bussen kör över ett gupp. Klick. [004]

# [004] Skolan är en potatis
```

## Vad importen gör

- Skapar en nod per rubrik, med titel och text. Referenser lagras som `[#NNN]`.
- Skapar tomma noder för refererade scener som saknar rubrik.
- Placerar noderna i nivåer efter avstånd från 001 (kör gärna Auto-layout efteråt).
- Importen skapar ett **nytt projekt**; det som redan är öppet rörs inte.
