# Architectuur Kwaliteitskalender VO (versie 5)

Dit document is, samen met `CLAUDE.md` en de analyse van de oude app (`inventaris.md`, `design.md`,
`seed-data.json`), de basis voor het bouwen van de schermen. Functionaliteit en teksten komen uit de
inventaris; vormgeving uit het design system; alle code-afspraken staan hier.

## 1. Overzicht

```
main.tsx → schil/App.tsx
  Foutgrens → StoreProvider → ToastProvider → BevestigProvider → HashRouter → RondleidingProvider
            → SyncProvider (gepauzeerd tijdens oefenen) → Poort
  Poort: oefenen → OefenOmgeving (tweede StoreProvider op de oefenkalender + OefenSyncProvider) → routes
         setupVoltooid === false → Opstart (schermen/Welkom.tsx of schermen/Wizard.tsx)
         anders → Layout (OefenBand, ZoekProvider, Topbar met WeergaveKiezer en ZoekKnop, Sidebar/Lade,
                  <Outlet/>, Footer, ConflictDialoog, Spotlight, RondleidingAanbod, RondleidingKeuze,
                  AfsluitingVenster)
```

| Laag | Map | Afhankelijk van |
|---|---|---|
| Domein (puur, getest) | `src/domein` | niets |
| Store | `src/store` | domein |
| Sync | `src/sync` | domein, store, componenten (toast) |
| Componenten | `src/componenten` | domein (types/seed), geen store (alleen `store/oefenopslag` voor de duur van "Ongedaan maken" tijdens het oefenen) |
| Schil | `src/schil` | alles |
| Schermen | `src/schermen` | componenten, store, domein, (sync) |

Importeer vanuit schermen bij voorkeur via de barrels: `../componenten`, `../store`, `../domein`.

## 2. Routes en schermbestanden

| Pad | Bestand | Opmerking |
|---|---|---|
| `/` | `schermen/Start.tsx` (+ `schermen/start/`) | één startscherm voor alle niveaus (was Start + Dashboard) |
| `/dashboard` | doorverwijzing naar `/` | oude links blijven werken |
| `/gesprekken` | `schermen/Gesprekken.tsx` | |
| `/bibliotheek` | `schermen/Bibliotheek.tsx` | |
| `/kalender` | `schermen/Kalender.tsx` | matrix, lijst, detailvenster |
| `/compliance` | `schermen/Compliance.tsx` | |
| `/export` | `schermen/Export.tsx` | gespreksdossier, Excel, print, back-up |
| `/organisatie` | `schermen/Organisatie.tsx` | op elk niveau; de instellingen gelden voor het hele bestuur |
| `/begrippen` | `schermen/Begrippen.tsx` | `BEGRIPPEN` uit `domein/begrippen.ts`; `?begrip=<sleutel>` springt ernaartoe |
| `/faq` | `schermen/Faq.tsx` | teksten: `FAQ` uit `domein/inhoud.ts`; `?zoek=` vult het zoekveld |
| `/contact` | `schermen/Contact.tsx` | alleen contactgegevens (`CONTACT`), mailto/tel; geen formulier |
| `/gegevens` | `schil/GegevensDelen.tsx` | af (fundament) |
| `/stijlgids` | `schil/Stijlgids.tsx` | alle componenten; niet in het menu |
| `*` | redirect naar `/` | |
| (geen route) | `schermen/Welkom.tsx`, `schermen/Wizard.tsx` | zolang `state.setupVoltooid === false` |

### Conventies voor schermen
- Elk scherm is een **default export** zonder props (Welkom: `{ onStartWizard }`, Wizard: `{ onTerug }`).
  Houd bestandsnaam en export aan; maak extra subcomponenten in hetzelfde bestand of in
  `src/schermen/<scherm>/...` (bv. `src/schermen/kalender/DetailVenster.tsx`). Wijzig geen bestanden van
  andere schermen. Iets dat meerdere schermen nodig hebben: voeg het toe aan `src/componenten` of
  `src/domein` zonder bestaande signaturen te breken, en documenteer het hier.
- Opbouw: `<div className="space-y-6">` met eerst `<PageHeader title="<menulabel>" subtitle="<één regel: wat je hier doet>" actions=... />`. Zet vaktermen in de subtitel met `<Begrip>`. Geen label boven de titel (de prop `eyebrow` bestaat nog maar wordt genegeerd); de kop heeft een haarlijn eronder.
  De schil levert de paginabreedte (max 1440px) en padding; voeg zelf geen buitenmarge toe.
- Grids: `grid gap-4 lg:grid-cols-3`, KPI-rij `grid grid-cols-2 gap-4 lg:grid-cols-4`. Kaarten met `Card`.
- Data: `useStore()` voor state en acties, `useScope()` voor de scope van het niveau, berekeningen uit
  `domein/berekeningen.ts`. Zet geen rekenlogica in componenten die ook in het domein hoort; nieuwe pure
  functies in het domein krijgen een test.
- Clusterniveau is alleen-lezen: `useScope().editScope === null`. Toon dan de info-balk uit de inventaris
  (`<InfoBalk>`), en geen bewerkknoppen.
- Teksten letterlijk uit de inventaris, maar zonder em dash, emoji en verwijzingen naar inloggen, leden,
  database, AI of het contactformulier. Gesprekken: "Onderwijsresultaten & veiligheid" mag (&).
- Na elke mutatie die de gebruiker uitvoert de toast uit de inventaris (`useToast()`), bv.
  `toast(\`${naam} toegevoegd aan de kalender\`)`, `toast('Activiteit verwijderd', 'danger')`.
- Bevestigen met `useBevestig()`, niet met `window.confirm` (werkt wel, maar past niet in de huisstijl).
- Vrije tekstvelden (notitie, eigenaar, bewijs, reden): hint `PRIVACY_REGEL` / `BEWIJS_HINT` uit `domein/inhoud`.
- Gesprek-id's kunnen onbekend zijn (een collega verwijderde het gesprek): gebruik altijd
  `vindGesprek(cyclus, id)` (valt terug op Doorlopend). Clusters idem: `clusterNaamVan()`.
- Print: gebruik `.no-print` en `.print-only`. Standaard `@page` is A3 liggend; een printview mag een eigen
  `<style>{'@media print { @page { size: A4 portrait; margin: 14mm } }'}</style>` renderen.
- Excel: `xlsx` (SheetJS 0.18.5) is geïnstalleerd. Statisch of dynamisch importeren mag (de singlefile-build
  bundelt dynamische imports in het ene bestand). Downloaden met `downloadTekst()` of een Blob + `a.download`.
- Back-up: `naarBackupTekst(state)` en `leesKalenderJson(tekst)` (accepteert oude back-ups v2-v4,
  v5-back-ups en kalenderbestanden). Importeren: `store.importeerState(resultaat.state)`; dat verbreekt een
  eventuele bestandskoppeling (zie §6). Bestandsnaam `kwaliteitskalender-backup-JJJJ-MM-DD.json`.
- Organisatie, blok "Gegevens": "Demodata laden" = `loadDemo()`, "Alles leegmaken" = `beginLeeg()`.
  Voeg daar een link naar `/gegevens` toe ("Gegevens & delen").

## 3. Datamodel (`src/domein/types.ts`)

Gelijk aan inventaris §2.1 (versie 4), met deze verschillen:
- `versie: 5`.
- `School.id` is een **string**. Oude id's (1, 2) worden "1", "2"; nieuwe zijn `sch-` + 12 hex.
  `schoolKalenders` is `Record<string, KalenderItem[]>`.
- Nieuwe clusters krijgen id `cl-` + 12 hex (oude slug-id's blijven geldig); nieuwe gesprekken `g-` + 12 hex.
- Entiteiten hebben `gewijzigd?: number` (ms). Ontbreekt bij oude gegevens (= 0).
- `tijden: { bestuurNaam?, schooljaar? }`: tijdstempels van die twee instellingen.
- `verwijderd: Record<sleutel, ms>`: tombstones (sleutels in `domein/sleutels.ts`).
- Lokaal (niet gedeeld): `modus`, `setupVoltooid`, `onboardingVerborgen`.
- Niet in de state: gekozen niveau/school/cluster (in `localStorage['kwaliteitskalender:ui:v1']`).

localStorage-sleutels: `kwaliteitskalender:state:v5` (state), `kwaliteitskalender:ui:v1`,
`kwaliteitskalender:sync:v1` (syncmeta), `kwaliteitskalender:voorkeur:v1` (voorkeuren per browser:
ingeklapt overzicht, tabblad van de werklijst) en `kwaliteitskalender:bezoek:v1` (laatst actief, voor
"Sinds je vorige bezoek"). Voorkeuren gaan nooit naar het gedeelde bestand. IndexedDB `kwaliteitskalender` / `koppeling` (bestandshandle).

## 4. Store-API (`useStore()` uit `src/store`)

Alle acties werken direct (autosave, tijdstempels, tombstones). `EditScope = { kind: 'bestuur' } | { kind: 'school', schoolId }`.

**State en keuze**
| Veld | Type |
|---|---|
| `state` | `State` |
| `niveau`, `setNiveau(n)` | `'bestuur' \| 'cluster' \| 'school'` |
| `clusterId`, `setClusterId(id)` | `string` |
| `schoolId`, `setSchoolId(id)` | `string` |
| `laatstOpgeslagen` | `number \| null` (voor "Opgeslagen") |
| `opslagWerkt` | `boolean` |
| `generatie` | `number`, telt op bij volledige vervanging |

**Kalenderitems**
| Actie | Signatuur | Gedrag |
|---|---|---|
| `moveItem` | `(scope, uid, maand: Maand) => void` | |
| `setItemStatus` | `(scope, uid, status: Status) => void` | voegt historie toe `{status, datum}`; zelfde status = niets |
| `addActiviteit` | `(scope, activiteitId) => string \| null` | nieuw item (uuid), maand uit periode, standaardgesprek, gepland; geeft uid |
| `addEigenActiviteit` | `(scope, { naam, standaard, gesprek, periode?, omschrijving? }) => string` | id `EIGEN-xxxxxxxx`, `custom` in het item |
| `removeItem` | `(scope, uid) => void` | tombstone |
| `herstelItem` | `(scope, item: KalenderItem) => void` | **ongedaan maken**: zet een eerder bewaarde versie van het item terug (ook na verwijderen: tombstone weg), met een nieuwe tijdstempel |
| `setKoppeling` | `(scope, uid, gesprek, reden) => void` | afwijking als gesprek ≠ standaardgesprek; lege reden → "Aangepast door school" |
| `setNotitie` / `setEigenNaam` / `setEigenaar` | `(scope, uid, tekst) => void` | trim; leeg wist |
| `setDeadline` | `(scope, uid, 'JJJJ-MM-DD' \| '') => void` | |
| `slaItemOp` | `(scope, uid, { gesprek?, reden?, notitie?, eigenNaam?, eigenaar?, deadline?, maand? }) => void` | **"Opslaan" in het detailvenster**: één wijziging, één tijdstempel |
| `addBewijs` | `(scope, uid, { label, url? }) => void` | |
| `removeBewijs` | `(scope, uid, bewijsId) => void` | |

**Organisatie en cyclus**
| Actie | Signatuur |
|---|---|
| `setBestuurNaam` | `(naam) => void` |
| `setSchooljaar` | `(jaar) => void` |
| `addSchool` | `({ naam, type?, cluster? }) => schoolId` (lege naam → "School n", leeg type → "vo") |
| `updateSchool` | `(id, Partial<{ naam, type, cluster }>) => void` |
| `removeSchool` | `(id) => void` (ook haar kalender) |
| `addCluster` | `(naam) => clusterId` |
| `updateCluster` | `(id, { naam }) => void` |
| `removeCluster` | `(id) => void` (scholen krijgen cluster "") |
| `addGesprek` | `() => gesprekId` ("Gesprek n", Nov, Doorlopend, vlag) |
| `updateGesprek` | `(id, Partial<{ naam, maand, kleur, icoon, thema, volgorde }>) => void` |
| `removeGesprek` | `(id) => void` (items → Doorlopend, afwijking gewist) |
| `moveGesprek` | `(id, -1 \| 1) => void` |
| `resetCyclus` | `() => void` (vier seizoenen; items van verdwenen gesprekken → Doorlopend) |

**Setup, onboarding, demo**
| Actie | Gedrag |
|---|---|
| `voltooiWizard({ bestuurNaam, schooljaar, scholen: [{naam, type?}], sjabloon })` | alles in één keer; niveau bestuur, of school bij precies één school |
| `completeSetup()` | setup voltooid, modus eigen, niveau bestuur |
| `pasSjabloonToe()` | 19 verplichte schoolactiviteiten per school + 30 bestuursactiviteiten, zonder dubbele |
| `verbergOnboarding()` | |
| `loadDemo()` | demo, niveau school, eerste school/cluster |
| `beginLeeg()` / `reset()` | lege state, welkomstscherm |
| `importeerState(state)` | vervangt alles (na `leesKalenderJson`) |

Intern (alleen `src/sync`): `haalState()`, `voegGedeeldSamen(g)`, `neemGedeeldOver(g)`.
Pure varianten van alle acties: `mutaties.*` in `src/domein/mutaties.ts` (met `nu`-parameter; voor tests).

## 5. Selectors en berekeningen

**Hooks** (`src/store/selectors.ts`)
- `useScope(): { niveau, scope: { items, isBestuur, standaarden }, editScope, editable, isBestuur, library, scopeLabel }`
  (zoals `vr()` in het origineel; `library` = 30 bestuurs- of 67 schoolactiviteiten).
- `useKomendGesprek(): KomendGesprek | null` (`{ gesprek, datum, dagenTot, verstreken }`).
- `useVoorkeur(sleutel, standaard)` (`src/store/voorkeuren.ts`): `[waarde, zet]`, per browser in localStorage.
- `useBezoek(): { vorig, begin }`: einde van het vorige bezoek (of null) en begin van dit bezoek.

**Pure functies** (`src/domein/berekeningen.ts`, `hulp.ts`)
| Functie | Uitleg |
|---|---|
| `scopeVoor(state, niveau, clusterId, schoolId)` | scope per niveau |
| `editScopeVoor(niveau, schoolId)` | null op clusterniveau |
| `scopeLabel(state, niveau, clusterId, schoolId)` | school-/cluster-/bestuursnaam |
| `schoolIdsVoorNiveau(org, niveau, clusterId)` | scholen bij bestuur/cluster |
| `voortgang(items)` | `{ totaal, gereed, bezig, gepland, risico, pct }` |
| `itemsVoorGesprek(items, id)`, `voortgangVoorGesprek(items, id)` | |
| `komendGesprek(cyclus, schooljaar, vandaag)`, `deadlineVanGesprek(g, startjaar)`, `startjaar()` | §2.3 |
| `verstrekenDeadlines(items, vandaag)` | deadline < vandaag en niet gereed |
| `dekkingPerStandaard(items, standaarden)` | `{ standaard, aantal, gereed, afgedekt }[]` |
| `ontbrekendeVasteStandaarden(items, standaarden)` | kern zonder item |
| `afwijkingen(items)`, `staatOpKalender(items, activiteitId)` | |
| `overzichtPerSchool(state, schoolIds)`, `gemiddeldGereed(overzicht)` | KPI's en "Voortgang per school" |
| `aandachtspunten(items, standaarden, vandaag)` | `{ soort, tekst }[]`, teksten letterlijk |
| `heatmapCel(itemsVanSchool, gesprekId)` | `{ voortgang, toon: 'leeg'\|'risico'\|'gereed'\|'half'\|'laag', tekst, titel }` |
| `statusVoorStandaardInGesprek(items, gesprekId, code)` | Gesprekken, status per school |
| `filterActiviteiten(lijst, { zoek, gesprek, gebied })` | bibliotheek |
| `vindSchool`, `vindCluster`, `clusterNaamVan`, `scholenInCluster`, `itemsVanSchool`, `itemsVanEditScope` | |
| `cyclusOpVolgorde(state)`, `sorteerOpNaam(items)`, `heeftActiviteiten(state)` | |
| `activiteitVan(item)`, `effectieveNaam(item)`, `standaardGesprekVan(item)` | |
| `vindGesprek(cyclus, id)`, `gesprekOpties(cyclus)` (cyclus + Doorlopend), `gesorteerdeCyclus()` | |
| `maandUitPeriode()`, `gebiedUitStandaard()`, `bibliotheek(isBestuur)`, `standaardenVoor(isBestuur)` | |
| `vandaagISO()`, `formatDatumLang(d)` ("1 februari 2027"), `formatDatumKort(iso)` ("1-2-2027"), `formatTijdstip(ms)`, `slug()`, `aantal(n, 'activiteit', 'activiteiten')` | |

**Startscherm** (`src/domein/thuis.ts`): `volgendeStap(invoer)` geeft de belangrijkste stap
(`scholen-toevoegen`, `kalender-leeg`, `verstreken`, `risico`, `vaste-standaard`, `school-vaste-standaard`,
`gesprek-leeg`, `gesprek-open`, `gesprek-klaar`, `geen-cyclus`), `stapTekst(stap, bewerkbaar)` de zin en
knoptekst. Verder `maandVan(d)`, `maandVoluit(m)`, `werklijstVolgorde`, `itemsInMaand`, `eersteOpenItem`,
`gewijzigdSinds(items, vorig, begin)`, `lijstTekst`.
**Zoeken** (`src/domein/zoeken.ts`): `normaliseer`, `zoekScore(vraag, hoofd, rest)`, `zoekIn(lijst, vraag, velden, max)`.
**Begrippen** (`src/domein/begrippen.ts`): `BEGRIPPEN` (sleutel → `{ term, uitleg, ookGenoemd?, pad? }`),
`BEGRIPPEN_LIJST`, `begrip(sleutel)`. Nieuwe vaktermen hier toevoegen; component en zoekvenster volgen.

**Seed** (`src/domein/seed.ts`): `ACTIVITEITEN_SCHOOL`, `ACTIVITEITEN_BESTUUR`, `ACTIVITEIT_OP_ID`,
`STANDAARDEN(_SCHOOL|_BESTUUR)`, `STANDAARD_OP_CODE`, `VASTE_STANDAARDEN`, `GEBIEDEN`, `GEBIED_CODES`,
`MAANDEN`, `STANDAARD_GESPREKSCYCLUS`, `GESPREKKEN_INHOUD`, `STATUSSEN`, `STATUS_VOLGORDE`,
`ICOON_OPTIES`, `KLEUR_OPTIES`, `GESPREK_FILTER_OPTIES`, `SCHOOLTYPE_SUGGESTIES`, `STANDAARD_SCHOOLJAAR`,
`SEED` (het hele JSON-bestand). **Teksten voor de lokale versie** (`src/domein/inhoud.ts`): `HELPTEKSTEN`,
`FAQ`, `CONTACT`, `FOOTER_TEKST`, `PRIVACY_REGEL`, `BEWIJS_HINT`, `WELKOM_BOUWSTENEN`, `WELKOM_VOETNOOT`,
`BESTUUR_START_TEGELS`.

## 6. Samenwerken: bestandsformaat en samenvoegregels

**Bestand** `<naam>.kwaliteitskalender.json`:
```json
{ "formaat": "kwaliteitskalender-vo", "versie": 5, "opgeslagenOp": "2026-11-14T19:00:00.000Z",
  "schooljaar": "...", "organisatie": { "bestuurNaam", "scholen", "clusters", "gesprekscyclus" },
  "bestuurItems": [...], "schoolKalenders": { "<schoolId>": [...] },
  "tijden": { "bestuurNaam": 0, "schooljaar": 0 }, "verwijderd": { "<sleutel>": 0 } }
```
Geen lokale velden (modus, setup), geen accounts, apparaatnamen of e-mailadressen.

**Sleutels**: `school:{id}`, `cluster:{id}`, `gesprek:{id}`, `item:b:{uid}`, `item:s:{schoolId}:{uid}`,
`instelling:bestuurNaam`, `instelling:schooljaar`.

**Regels** (`samenvoegen(lokaal, extern, basis?)` in `src/domein/samenvoegen.ts`, 22 tests):
1. Per entiteit en per instelling wint de hoogste tijdstempel.
2. Tombstones doen mee als versie: verwijderen wint van oudere wijzigingen; een latere wijziging of
   toevoeging (bv. sjabloon opnieuw toepassen) wint van de tombstone.
3. Gelijke tijd: verwijdering wint; anders de grootste canonieke JSON (deterministisch).
4. Items van een school die na samenvoegen niet bestaat, vervallen.
5. Conflict = beide kanten wijzigden dezelfde sleutel sinds `basis` (handtekeningen van de vorige sync)
   en de inhoud verschilt. Gemeld in een dialoog (`ConflictDialoog`).
6. Mutaties stempelen met `max(nu, vorige + 1)`, zodat een bewerking altijd wint van de versie waarop
   ze gebaseerd is, ook bij een scheve klok.
7. Resultaat is volgorde-onafhankelijk vergeleken (`vingerafdruk`); er wordt alleen geschreven als het
   externe bestand echt anders is.

**Sync-laag** (`useSync()` uit `src/sync/SyncProvider.tsx`): `ondersteund`, `status`
(`'geen' | 'verbinden' | 'gekoppeld' | 'toestemming-nodig' | 'fout'`), `bestandsnaam`, `laatsteSync`,
`bezig`, `fout`, `conflicten`, en acties `koppelBestaand(kies?)`, `maakGedeeldBestand()`,
`herstelToestemming()`, `synchroniseerNu()`, `ontkoppel()`, `openBestand(file, kies?)`,
`samenvoegenMetBestand(file)`, `opslaanAlsBestand()`, `sluitConflicten()`.
Synchroniseren: 1,5 s na elke wijziging, bij vensterfocus/zichtbaar worden en elke 30 s.
Binnenkomende wijzigingen geven een toast; conflicten een dialoog. `loadDemo`, `beginLeeg`, `reset` en
`importeerState` **verbreken de koppeling** (het bestand zelf blijft ongewijzigd). In de demo kan geen
nieuw gedeeld bestand gemaakt worden. Een andere browser-tab: wijzigingen worden via het
`storage`-event samengevoegd.

## 7. Componenten (`src/componenten`)

Alle waarden komen uit `src/stijl/tokens.css` (design system). Tailwind-kleuren zijn **alleen** tokens:
`bg-surface-card|page|sunken|hover|subtle`, `text-ink-strong|body|muted|subtle`, `border-line|line-subtle|line-strong`,
`bg-niveau`, `text-niveau-strong`, `bg-niveau-surface`, `border-niveau-border`, `bg-brand-yellow(-soft)`,
`text-status-{success,warning,danger,info,neutral}`, `bg-status-*-surface`, `border-status-*-border`,
`text-kg-op`, `bg-kg-op-surface`, `text-seizoen-herfst`, `bg-seizoen-herfst-surface`, `gray-25..900`.
Tekst: `text-display|h1|h2|h3|h4|base|sm|xs|2xs`, `.eyebrow` (klein label in sentence case boven een blok),
`.kk-groepskop` (kleine hoofdletters, alleen voor groepskoppen in menu, zoeklijst en tabelkop), `.kk-link` (zwart,
onderstreept), `.tnum`. Radius `rounded-sm|md|lg|xl` (3, 4, 4, 6 px); `rounded-full` alleen voor stippen.
Schaduw: `shadow-xs` en `shadow-sm` zijn leeg (vlakken zweven niet); `shadow-md|lg|pop` alleen voor wat echt zweeft
(opgepakte chip, menu, dialoog, melding). Geen opacity-modifiers (`bg-niveau/40` werkt niet).
`text-ink-muted` en `text-ink-subtle` zijn bewust dezelfde grijstint.
Voor dynamische kleuren altijd de tabellen in `stijlen.ts` gebruiken (Tailwind ziet geen samengestelde klassen).

| Component | Props (belangrijkste) |
|---|---|
| `Button` | `variant: 'primary' (geel) \| 'secondary' (zwart omlijnd) \| 'ghost' \| 'danger' \| 'danger-zacht' \| 'niveau' (zwart; historische naam)`, `size: 'sm' \| 'md' \| 'lg'`, `icon`, `iconRight` (Lucide-component), + button-props. Eén gele knop per scherm |
| `ButtonLink` | als Button + `to` (react-router) |
| `IconButton` | `icon`, `label` (verplicht), `size`, `variant: 'ghost' \| 'secondary'` |
| `knopKlassen(variant, size, className)` | klassen voor een `<a>`/`<label>` als knop |
| `Badge` | `tone: neutral\|brand\|success\|warning\|danger\|info\|niveau`, `variant: soft\|solid\|outline`, `size`, `icon`, `dot`, `title`. Rechthoekig, wit met haarlijn; alleen waar het informatie draagt |
| `StandaardBadge` | `code` |
| `VasteStandaardBadge` | `compact` ("vast") |
| `VerplichtBadge`, `AfwijkingBadge` | `reden?`, `label?` |
| `StatusBadge` | `status`, `size: 'sm' \| 'md'` (icoon in statuskleur + label, zonder vlak) |
| `StatusDot` | `status` |
| `SeizoenBadge` | `gesprek: { naam, kleur, icoon }`, `size`, `showLabel`, `label` (icoon in seizoenskleur + naam, zonder vlak) |
| `GesprekIcoonView` | `icoon`, `kleur` |
| `KwaliteitsgebiedTag` | `gebied`, `showName`, `size` (kleurvlak + code op wit) |
| `GebiedDot` | `gebied` |
| `Card` | `title`, `subtitle`, `action`, `padding: none\|sm\|md\|lg`, `divider`, `as`, `className`, `bodyClassName`, `rondleiding` (anker). Wit, 1px haarlijn, radius 4px, geen schaduw (`elevated` doet niets meer). Liever lijnen en witruimte dan kaart-in-kaart |
| `KpiTile` | `label`, `value`, `unit`, `icon`, `tone: neutral\|success\|warning\|danger\|niveau`, `hint` |
| `ProgressBar` | `value` (0-100), `color` (CSS, bv. `seizoenKlassen(k).var`; standaard zwart), `size`, `label`, `showValue`. Dun en recht |
| `IconTile` | `icon`, `tone: niveau\|brand\|success\|info\|danger\|warning\|neutral`, `size`. Alleen het icoon, geen tegel; niveau en brand zijn zwart |
| `EmptyState` | `icon` (los, grijs), `title`, `body`, `action`, `watermark`, `compact` (binnen een kaart) |
| `InfoBalk` | `tone: info\|warning\|niveau\|neutral`, `icon`. Wit met haarlijn; de toon zit alleen in het icoon |
| `PageHeader` | `title`, `subtitle`, `actions` (`eyebrow` wordt genegeerd) |
| `SectionHeader` | `title`, `subtitle`, `action` |
| `Swoosh` | gele S-curve; staat al in de footer. Verder alleen op schermen zonder footer (welkom, introductie van de rondleiding) |
| `Veld` | `label`, `verplicht`, `hint`, `fout`, children: `(id) => <Input id={id} …/>` |
| `Input`, `Textarea` | + `veldMaat: 'sm' \| 'md'` |
| `Select` | `options: (string \| { value, label })[]`, `placeholder`, `veldMaat`, + select-props |
| `SearchField` | `value`, `onChange(string)`, `placeholder`, `label` |
| `Checkbox` | `checked`, `onChange(bool)`, `label`, `beschrijving` |
| `FilterChip` | `active`, `onClick`, `dotClassName` (bv. `gebiedKlassen('OP').dot`), `icon`, `count`. Rechthoekig; aan = zwart met witte tekst; telling als gewone tekst |
| `SegmentedControl` | `value`, `onChange`, `options: { value, label, icon?, compact? }[]`. Tekst met een zwarte streep onder de actieve keuze, geen bak (`accent` wordt genegeerd) |
| `Begrip` | `term: BegripSleutel`, `children?` (eigen tekst). Stippellijn; uitleg bij hover, focus en tik; Esc sluit. Het is een knop: niet binnen een link of knop zetten |
| `Dialog` | `open`, `onClose`, `title`, `subtitle`, `footer`, `width: sm\|md\|lg\|xl`, `blokkeerAchtergrond` (Esc, focus-trap, focus terug) |
| `useBevestig()` | `await bevestig({ titel, tekst, bevestigLabel, annuleerLabel, gevaarlijk }) → boolean` |
| `useToast()` | `toast(tekst, toon?, duurMs \| { duur?, actie?: { label, onClick } })`; max 3, 2400 ms; met actie 8 s, pauzeert bij muis/focus, Ctrl/Cmd+Z voert de nieuwste actie uit. Geeft een functie die de toast weghaalt |
| `useOngedaan()` | `{ toon(tekst, herstel), sluit() }`: toast met "Ongedaan maken" (kalender, bibliotheek, werklijst op Start). Het enige mechanisme voor ongedaan maken |
| `ToastDock` | zet iets (de actiebalk van de kalender) onder de toasts in dezelfde kolom onderaan |
| `useWisToasts()` | alle toasts weg (begin/einde van het oefenen) |
| `meldSignaal(naam)` | `'ongedaan' \| 'zoek-gekozen'`: kleine gebeurtenissen voor de rondleiding (window-event) |
| `ActivityChip` | `gebied`, `code`, `naam`, `status`, `verplicht`, `afwijking`, `selected`, `compact`, + button-props |
| `AppLogo`, `LvLogo`, `LvMonogram` | logo's |
| `stijlen.ts` | `GEBIED_KLASSEN`/`gebiedKlassen()`, `SEIZOEN_KLASSEN`/`seizoenKlassen()` (`{ ink, surface, border, dot, var }`), `STATUS_STIJL` (+ `label`, `icoon`), `GESPREK_ICONEN`/`gesprekIcoon()`, `NIVEAU_ICONEN`, `NIVEAU_LABELS`, `icoonOpNaam('lucide:Gauge')` |

Voorbeelden van alles: `src/schil/Stijlgids.tsx` (`#/stijlgids`).

### Keuzes waar het design system het origineel verving
- Niveaukleur school is staalblauw `#34607A` (was magenta). Bestuur wijnrood, cluster pruim.
- Niveaukleur zit alleen op twee plekken in de schil: de 3px-lijn boven de topbar (en de mobiele lade) en de
  weergaveknop (blokje met icoon, het label "School"/"Hele bestuur", de iconen in de keuzelijst). Menu, knoppen,
  filters, links en voortgangsbalken zijn zwart en geel. Data-kleuren (gebied, seizoen, status) veranderen niet mee.
- Kwaliteitsgebied = kleurvlak + code op wit (geen getinte vakken); matrixchips zijn wit met haarlijn.
- "Verplicht" is oranje met stip (was rood); "Vaste standaard" gele rand met sleutel en zwarte tekst.
- Toasts zijn witte kaarten met haarlijn en een los icoon in de toonkleur (was zwarte pil). Dialogen radius 6px.

### Vormgevingsronde "papier" (huisstijl Leren verbeteren)
Doel: de app moet aanvoelen als papier en niet als een gegenereerd dashboard. Regels:
- Twee kleuren (geel `--lv-yellow`, zwart), één lettertype (Poppins), één swoosh per scherm (de voettekst).
- Geel is schaars: de primaire knop (één per scherm), de focusring (geel met dunne zwarte binnenrand voor contrast),
  het actieve menu-item (gele markering links), de swoosh. Overige knoppen zwart omlijnd of zwart.
- Vlakken wit met 1px haarlijn en radius 4px, geen schaduw. Geen getinte vlakken als versiering, geen gekleurde
  linkerranden, geen iconen in tegeltjes. Getinte vlakken alleen waar het vlak informatie draagt: heatmap,
  seizoen in de kop van de matrix, een opgepakte/gemarkeerde chip, een net toegevoegde regel.
- Geen labels in hoofdletters boven titels en kaarten; `.eyebrow` is gewone tekst. Hoofdletters alleen in `.kk-groepskop`.
- Keuzes (weergave, gesprek, tabbladen) als tekst met een zwarte streep onder de actieve keuze; filters rechthoekig.
- Status en seizoen klein: icoon of stip in de kleur, tekst donker.
- Geen AI-clichés zoals het `Sparkles`-icoon.
- Logo: LV-monogram (geel in zwarte tegel); footer het volledige Leren verbeteren-logo.
- Niveau-icoon cluster is `Layers` (was `Users`).

## 7a. Navigatie (schil)

- **Wat bekijk ik** (`schil/WeergaveKiezer.tsx`): één knop in de topbar met de niveaukleur, die een lijst
  opent met "Hele bestuur", de clusters en de scholen (zoekveld vanaf 8 keuzes, pijltjes, Enter, Esc).
  Vervangt de niveauwisselaar en de scopebalk. `useWeergave()` geeft `{ opties, huidigeSleutel, kies, huidig, eenSchool }`.
  Bij één school zonder clusters heten de keuzes "Je school" en "Bestuur".
- **Menu** (`schil/navigatie.ts`): `MENU` in groepen (overzicht, Plannen, Voorbereiden, Controleren, Beheer,
  Hulp), elk item met `beschrijving` en `zoekwoorden` (ook oude namen, zoals "compliance" en "dashboard").
- **Zoekvenster** (`schil/Zoekvenster.tsx`): `ZoekProvider` (in Layout) met Ctrl/Cmd+K en `/`; `useZoeken().open()`.
  Vindt activiteiten op alle kalenders (wat je bekijkt eerst), bibliotheekactiviteiten, scholen en clusters,
  schermen, begrippen en veelgestelde vragen. Kiezen zet zo nodig de weergave en navigeert:
  kalenderitem → `/kalender?item=<uid>`; bibliotheek → `/kalender?item=<uid>` als hij al op de kalender
  staat, anders `/bibliotheek?zoek=<naam>`.
- **Start** (`schermen/Start.tsx`, `schermen/start/Werklijst.tsx`, `schermen/start/Overzicht.tsx`):
  volgende stap (één zin, één knop) naast het komende gesprek; "Aan de slag" (eigen kalender, verbergbaar);
  werklijst "Deze maand" / "Voor <gesprek>" met statusknoppen Bezig en Gereed (nog eens klikken = gepland);
  "Hoe staat het ervoor" (inklapbaar, onthouden per browser); "Sinds je vorige bezoek" alleen met een gekoppeld bestand.
- **`data-rondleiding`** (ankers voor de rondleiding): schil `weergave`, `weergave-lijst`, `zoeken`, `delen`
  (sync-status), `hulp`, `menu-knop`, `menu-<groep>`, `menu-rondleiding`; Start `volgende-stap`, `deze-maand`,
  `aan-de-slag`, `hoe-staat-het`, `sinds-vorig-bezoek`; Kalender `toevoegen`, `kalender-weergave`, `periode`,
  `filter`, `voortgang`, `matrix`, `eerste-rij` (matrixrij of lijstregel met de eerste zichtbare activiteit),
  `chip`, `actiebalk`, `ongedaan` (toast met actie), `toevoegpaneel`, `detailvenster`; Bibliotheek
  `bibliotheek-stand`, `bibliotheek-zoek`, `bibliotheek-filter`, `eigen-activiteit`; Gesprekken `gesprek-keuze`,
  `gesprek-info`, `gesprek-voorbereiding`, `gesprek-scholen`; Export `export-dossier|kalender|backup`; Dekking
  `dekking-vast|alle|afwijkingen`; Organisatie `org-bestuur|scholen|cyclus|aanbevolen`; Gegevens
  `gegevens-waar|samenwerken|privacy`. Hernoem een anker niet zonder `schil/rondleiding/tours.ts` mee te nemen.

## 7b. Rondleiding (`src/schil/rondleiding/`)

- **Wat**: de eerste rondleiding (8 stappen: wat bekijk ik, wat moet ik nu doen, plannen, ongedaan maken,
  toevoegen, zoeken, voorbereiden, delen en privacy) en per scherm een korte (`tours.ts`). Een stap licht het
  echte onderdeel uit (`doel`, `ook`) en gaat verder zodra `klaar(context)` waar is (meting van de oefenkalender,
  pad, signalen); zonder `klaar` is het een kijkstap met Volgende. Sla over en Vorige zijn er altijd.
- **Oefenen zonder risico** (`RondleidingProvider.tsx`): tijdens een rondleiding rendert `Poort` de routes binnen
  `OefenOmgeving`: een tweede `StoreProvider` met `oefenState()` (`domein/oefenen.ts`), `zonderOpslag`,
  `initieelUi`, en `OefenSyncProvider` (geen bestand, koppelen kan niet). De echte store blijft erboven
  gemonteerd en onaangeroerd; de echte `SyncProvider` is `gepauzeerd`. Voorkeur-hooks schrijven tijdens het
  oefenen naar een tijdelijk geheugen (`store/oefenopslag.ts`); de filters van de bibliotheek worden bewaard en
  teruggezet; toasts worden gewist. Na afloop navigeert de rondleiding terug naar het pad van voor de start.
- **Onthouden**: `localStorage['kwaliteitskalender:rondleiding:v1']` = `{ aangeboden, eersteAf, schermen[], lopend }`
  (per browser, nooit in de state of het bestand). De oefenkalender zelf staat in
  `sessionStorage['kwaliteitskalender:oefen:v1']`: herladen gaat verder op de oefenkalender; een nieuw bezoek
  biedt "Verder met de rondleiding?" aan.
- **Eerste gebruik**: zodra de setup voltooid is en er nog niets is aangeboden. Na demo of wizard
  (`rondleidingNa('demo' | 'eigen')`) een introductie in het midden; na een kalenderbestand (of als bestaande
  gebruiker) een rustig aanbod in de hoek, zodat je meteen kunt werken.
- **Oproepen**: helpknop (verder / dit scherm / de rondleiding), menu Hulp > Rondleiding (`RondleidingKeuze`),
  zoekvenster (groep Rondleidingen).
- **Spotlight** (`Spotlight.tsx`): SVG-dimlaag met gaten (vangt geen klikken), gele ring, kaart via
  `plaatsKaart()` (nooit over het onderdeel; past het nergens, dan een blad en licht alleen het vrije deel op).
  Staat er een venster open, dan licht dat op; zonder plek ernaast wordt de kaart een balk bovenaan. Toetsenbord:
  focus op de kaarttitel, "Naar het onderdeel" (zichtbaar bij focus) zet de focus op het onderdeel, Esc onderbreekt.
- **Afsluiting** (`Afsluiting.tsx`): terug in de eigen kalender, die als jaarlint (`domein/jaarlint.ts`) met wat je
  oefende; "Print als poster" (A3, alleen de poster via `html.kk-poster-print`).

## 8. Tests
- `npm test`: domein (berekeningen, migratie, mutaties, samenvoegen, startscherm, zoeken, begrippen, oefenkalender,
  plaatsing van de kaart, jaarlint).
- `npm run test:e2e` (na `npm run build`): opent `dist/kwaliteitskalender.html` via `file://` in headless
  Chromium; controleert routes, niveaukleur, herladen, netwerkstilte, console, CSP, handmatige
  bestandsflow en de automatische sync met een nagebootste File System Access API.
  `scripts/e2e-navigatie.mjs` test weergavekeuze, menu-groepen, zoekvenster en begrippen met het toetsenbord.
  `scripts/e2e-rondleiding.mjs` test de rondleiding: automatisch aanbieden (demo, wizard, bestand), niet bij een
  tweede bezoek, oproepen, elke stap, overslaan, herladen, 390 breed, alleen toetsenbord, en dat localStorage en
  een gekoppeld bestand byte voor byte gelijk blijven. De andere e2e-scripts zetten de rondleiding op
  "aangeboden" (init-script), zodat de introductie hun schermen niet bedekt.
  Wisselen van weergave in een test: klik `[data-rondleiding="weergave"]` en dan
  `[role=listbox] [role=option]:has-text("<naam>")`, of zet `kwaliteitskalender:ui:v1` en herlaad.
  Pas de e2e-scripts aan als je schermen echte koppen (h1) geven die anders heten; ze controleren nu
  alleen dat er een h1 is.


### Steunkleur magenta

Het magenta van het merk (`--lv-magenta`, de tweede kleur op projectlerenverbeteren.nl) is de kleur voor links (`.kk-link`), de actieve keuze in filters en tabs, voortgangsbalken, de knopvariant `niveau` en één uitgelicht vlak per scherm ("Volgende stap" op Start, met de gele knop erop). Het bestuursniveau gebruikt hetzelfde magenta. Geselecteerde chips en "nu"-labels blijven zwart.
