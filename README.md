# Kwaliteitskalender VO

De Kwaliteitskalender VO helpt besturen en scholen in het voortgezet onderwijs hun kwaliteitszorg over
het schooljaar te plannen. Activiteiten zijn gekoppeld aan de standaarden van het inspectiekader en aan
de seizoensgesprekken (Herfst, Winter, Lente, Zomer), op drie niveaus: bestuur, cluster en school.

Het is een initiatief van Project Leren Verbeteren.

## Wat is het?

Eén HTML-bestand: `kwaliteitskalender.html`. Er is geen website, server of account. Je opent het bestand
in je browser en werkt direct. Alles wat je invult blijft op je eigen computer en, als je dat wilt, in
een kalenderbestand in een map van je eigen organisatie.

## Openen

1. Zet `kwaliteitskalender.html` op een vaste plek, bijvoorbeeld in je documenten of in een gedeelde map.
2. Dubbelklik op het bestand. Het opent in je standaardbrowser.
3. Kies **Verken eerst de demo** om rond te kijken, of **Begin met mijn eigen bestuur**.

Werkt in Microsoft Edge, Google Chrome, Firefox en Safari. Samenwerken met een automatisch
gesynchroniseerd bestand kan alleen in **Edge en Chrome**.

Tip: open het bestand steeds vanaf dezelfde plek en in dezelfde browser; de gegevens worden per browser
bewaard.

## Samenwerken met collega's

Binnen één organisatie werk je samen in één **kalenderbestand** (`<naam>.kwaliteitskalender.json`).

**In Edge of Chrome**
1. Eén persoon stelt de kalender in en kiest in het menu **Gegevens & delen** de knop
   **Nieuw gedeeld bestand maken**. Sla het bestand op in een map waar collega's bij kunnen: een
   gesynchroniseerde SharePoint- of OneDrive-map, of een netwerkschijf.
2. Collega's openen `kwaliteitskalender.html` en kiezen op het welkomstscherm **Gedeeld kalenderbestand
   openen**, of later **Gegevens & delen**, **Bestaand bestand koppelen**. Ze kiezen hetzelfde bestand.
3. Daarna gaat het vanzelf: na elke wijziging, als je terugkeert naar het venster en elke 30 seconden
   worden jouw wijzigingen en die van je collega's samengevoegd. Bovenin zie je welk bestand gekoppeld is
   en wanneer er voor het laatst is gesynchroniseerd.

Na het opnieuw openen vraagt de browser soms of de kalender het bestand weer mag bijwerken. Klik dan
bovenin op **Opnieuw verbinden**.

**In andere browsers** gebruik je op **Gegevens & delen** de knoppen **Bestand openen**, **Opslaan als
bestand** en **Samenvoegen met bestand**.

**Hoe samenvoegen werkt**
- Per activiteit, school, cluster en gesprek wint de nieuwste wijziging.
- Een verwijderde activiteit komt niet terug.
- Hebben jij en een collega sinds de vorige synchronisatie hetzelfde gewijzigd, dan blijft de nieuwste
  versie bewaard en krijg je een melding welke activiteiten het betrof.
- Maakt OneDrive of SharePoint een conflictkopie (bijvoorbeeld `kalender-LAPTOP.kwaliteitskalender.json`),
  haal die dan binnen met **Samenvoegen met bestand** en verwijder de kopie daarna.

## Privacy in het kort

- De kalender gebruikt geen internet. Een beveiligingsregel in het bestand (Content Security Policy)
  blokkeert elk netwerkverkeer; er kan dus niets weglekken, ook niet door een fout.
- Er zijn geen accounts. In het kalenderbestand staan alleen de namen van bestuur, scholen en clusters,
  de activiteiten met planning en status, en wat jullie zelf invullen.
- **Vermeld geen leerling- of persoonsgegevens.** Gebruik bij eigenaar liever een rol dan een naam, en
  verwijs bij bewijs naar een document in je eigen beveiligde omgeving.
- Wie het kalenderbestand kan openen, kan de kalender lezen en wijzigen. Regel dat met de rechten op de map.
- Project Leren Verbeteren kan je gegevens niet inzien.
- Maak af en toe een back-up via **Export**. Back-ups uit de vorige online versie kun je importeren.

## Voor beheerders: bouwen

Benodigd: Node.js 20 of nieuwer.

```bash
npm install
npm run dev        # ontwikkelen op http://localhost:5173
npm test           # unit tests
npm run typecheck
npm run build      # levert dist/kwaliteitskalender.html (één bestand) en controleert het
npm run test:e2e   # na de build: browsertest via file:// (Playwright moet beschikbaar zijn)
```

Het resultaat `dist/kwaliteitskalender.html` is het enige bestand dat je verspreidt. Technische opzet:
zie `CLAUDE.md` en `docs/ARCHITECTUUR.md`.

## Contact

Project Leren Verbeteren, contact@projectlerenverbeteren.nl, 088 20 51 636.
