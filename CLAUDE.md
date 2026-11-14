# Kwaliteitskalender VO

Jaarkalender voor kwaliteitszorg in het voortgezet onderwijs (bestuur, cluster, school), gekoppeld aan
het inspectiekader en de seizoensgesprekken. Herbouw van een oude React + Supabase-app als **één
HTML-bestand** dat een medewerker downloadt en dubbelklikt (`file://`). Collega's binnen één organisatie
werken samen via één gedeeld kalenderbestand op hun eigen SharePoint/OneDrive/netwerkschijf.

## Harde eisen (privacy)
1. **Geen netwerk.** Geen `fetch`, XHR, WebSocket, beacons, analytics, externe fonts, CDN's of iframes.
   De CSP-metatag (`vite.config.ts`, alleen in de build) blokkeert alles; maak hem nooit ruimer.
2. **Eén bestand.** `npm run build` levert alleen `dist/kwaliteitskalender.html`. Alles (JS, CSS, fonts,
   iconen, logo's) zit erin. Geen lazy chunks die als los bestand geladen moeten worden.
3. **Geen externe bronnen.** Geen URL's in `src`/`href` behalve `data:`, `blob:`, `mailto:`, `tel:` en
   `#/`-routes. Afbeeldingen als import (worden data-URI) of inline SVG.
4. **Geen accounts of namen** in opgeslagen gegevens, behalve wat gebruikers zelf in vrije velden typen.
   Bij vrije velden altijd de hint `PRIVACY_REGEL` ("Vermeld geen leerling- of andere persoonsgegevens.").
5. Moet werken vanaf `file://`: `HashRouter`, geen service worker, geen `window.open` naar externe sites.

`scripts/controleer-build.mjs` (draait na elke build) controleert 1-3.

## Commando's
- `npm run dev`: ontwikkelserver (zonder CSP).
- `npm run build`: typecheck, build naar één bestand, buildcontrole.
- `npm test`: vitest (domeinlaag).
- `npm run typecheck`
- `npm run test:e2e`: Playwright tegen `dist/` (eerst bouwen; schermafdrukken in `test-resultaten/`).

## Mappen
- `src/domein/` puur TypeScript, geen React: types, seed-data (letterlijk uit de oude app), berekeningen,
  mutaties, migratie, samenvoegen. Met tests.
- `src/store/` React-context met state, niveau en alle acties; autosave naar localStorage.
- `src/sync/` gedeeld kalenderbestand (File System Access API, IndexedDB, handmatig).
- `src/componenten/` gedeelde componenten naar het design system.
- `src/schil/` app-schil: topbar, zijbalk, scopebalk, footer, help, foutgrens, routes, Gegevens & delen, stijlgids.
- `src/schermen/` één bestand per scherm (`Dashboard.tsx`, `Kalender.tsx`, ...). Hier werken de schermbouwers.
- `src/stijl/` tokens (enige bron van kleuren/maten), fonts, basis-CSS.
- `docs/ARCHITECTUUR.md` store-API, selectors, componenten, conventies, bestandsformaat. **Lees dit eerst.**

## Taal en stijl
Nederlands, je-vorm, sentence case, geen emoji, geen em dash (gebruik dubbele punt, komma of punt).
Alleen tokens uit `src/stijl/tokens.css` via Tailwind-klassen; geen losse hexwaarden.
