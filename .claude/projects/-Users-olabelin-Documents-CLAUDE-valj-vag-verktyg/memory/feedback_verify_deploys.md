---
name: feedback_verify_deploys
description: Never claim something works without verifying it end-to-end on the live site
type: feedback
---

ALDRIG säga att något fungerar utan att verifiera det end-to-end på live-siten.

**Why:** Flera gånger under sessionen 2026-03-19/20 sa jag att saker var fixade (Firebase sparning, nya versioner deployade, TipTap-uppgraderingar) utan att faktiskt verifiera:
1. Firebase Firestore API:t var aldrig aktiverat — alla save-anrop failade tyst. Jag sa "Firebase är fixat" utan att testa att data faktiskt sparades.
2. Nya versioner deployade inte pga peer dependency-krockar i Vercel — jag sa "mergat och deployas nu" utan att kolla att bygget gick igenom.
3. TipTap v2→v3 uppgradering bröt siten med blank screen — jag testade bara lokalt, inte på Vercel.
4. När användaren rapporterade problem sa jag "testa hard refresh" och implicerade att felet var på deras sida, när felet var i min deploy-pipeline.

**How to apply:**
- Efter varje merge: verifiera med WebFetch eller be användaren bekräfta att rätt version syns
- Efter Firebase-ändringar: testa med firestore_list_collections eller liknande att API:t faktiskt svarar
- Om användaren säger att något inte funkar: anta att de har rätt. Undersök på min sida FÖRST innan jag föreslår att de rensar cache.
- Bygg ALDRIG lokalt och anta att Vercel bygger likadant — kolla peer deps, .npmrc, etc.
