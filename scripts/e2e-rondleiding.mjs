// E2e-controle van de rondleiding tegen dist/ (file://).
// Gebruik: npm run build && node scripts/e2e-rondleiding.mjs. Schermafdrukken in test-resultaten/rondleiding/.
//
// Bewijst vooral: oefenen verandert je eigen kalender (localStorage) en een gekoppeld kalenderbestand
// niet, ook niet als je halverwege herlaadt of stopt. Verder: automatisch aanbieden bij eerste gebruik
// (demo, eigen bestuur, kalenderbestand), niet opnieuw bij een tweede bezoek, oproepbaar vanuit de
// helpknop, het menu en het zoekvenster, elke stap uitvoerbaar, overslaan, 390 breed en alleen toetsenbord.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const hier = path.dirname(fileURLToPath(import.meta.url));
const URL = 'file://' + path.resolve(hier, '../dist/kwaliteitskalender.html');
const SHOTS = path.resolve(hier, '../test-resultaten/rondleiding');
mkdirSync(SHOTS, { recursive: true });

const RONDLEIDING = 'kwaliteitskalender:rondleiding:v1';
/** De echte gegevens en voorkeuren: moeten na het oefenen byte voor byte gelijk zijn. */
const ECHT = [
  'kwaliteitskalender:state:v5',
  'kwaliteitskalender:ui:v1',
  'kwaliteitskalender:voorkeur:v1',
  'kwaliteitskalender:kalender-weergave:v1',
];

const resultaten = [];
const ok = (naam, voorwaarde, extra = '') => resultaten.push(`${voorwaarde ? 'OK  ' : 'FOUT'} ${naam}${extra && !voorwaarde ? ' :: ' + extra : ''}`);
const verzoeken = [];
const fouten = [];

// Nep File System Access API: één bestand in het geheugen van de pagina (zoals scripts/e2e/sync.cjs).
const NEP_BESTAND = (tekst) => `
  window.__bestand = { naam: 'collega.kwaliteitskalender.json', tekst: ${JSON.stringify(tekst)}, tijd: 1 };
  window.__schrijfteller = 0;
  const maakHandle = () => ({
    kind: 'file', get name() { return window.__bestand.naam; },
    async getFile() { return new File([window.__bestand.tekst], window.__bestand.naam, { lastModified: window.__bestand.tijd }); },
    async createWritable() { let buf = ''; return { async write(t) { buf += t; }, async close() { window.__bestand.tekst = buf; window.__bestand.tijd = Date.now(); window.__schrijfteller++; } }; },
    async queryPermission() { return 'granted'; }, async requestPermission() { return 'granted'; },
  });
  window.showOpenFilePicker = async () => [maakHandle()];
  window.showSaveFilePicker = async () => maakHandle();
`;

const browser = await chromium.launch();

async function nieuwePagina(breedte, { init } = {}) {
  const ctx = await browser.newContext({ viewport: { width: breedte, height: breedte < 600 ? 844 : 900 }, deviceScaleFactor: 1, locale: 'nl-NL' });
  if (init) await ctx.addInitScript(init);
  const page = await ctx.newPage();
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('data:') && !u.startsWith('blob:') && !u.startsWith('file://')) verzoeken.push(u);
  });
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && fouten.push(`${breedte}px ${m.text()}`));
  page.on('pageerror', (e) => fouten.push(`${breedte}px pageerror: ${e.message}`));
  await page.goto(URL);
  return { ctx, page };
}

const wacht = (page, ms = 200) => page.waitForTimeout(ms);
const echt = (page) => page.evaluate((ks) => Object.fromEntries(ks.map((k) => [k, localStorage.getItem(k)])), ECHT);
const voortgang = (page) => page.evaluate((k) => JSON.parse(localStorage.getItem(k) ?? 'null'), RONDLEIDING);
const KAART = '[data-rondleiding-kaart]';
const kaartTitel = (page) => page.textContent(`${KAART} h2`);
const stapTekst = (page) => page.textContent(`${KAART} .tnum`);
const actiefTekst = (page) => page.evaluate(() => (document.activeElement?.textContent ?? '').trim());

/** Kaart en uitgelicht onderdeel: overlappen ze? (in px²) */
async function overlap(page) {
  return page.evaluate(() => {
    const k = document.querySelector('[data-rondleiding-kaart]')?.getBoundingClientRect();
    const r = document.querySelector('.kk-ring')?.getBoundingClientRect();
    if (!k || !r) return { overlap: 0, ring: !!r };
    const w = Math.max(0, Math.min(k.right, r.right) - Math.max(k.left, r.left));
    const h = Math.max(0, Math.min(k.bottom, r.bottom) - Math.max(k.top, r.top));
    const binnen = k.left >= 0 && k.top >= 0 && k.right <= innerWidth && k.bottom <= innerHeight;
    return { overlap: w * h, ring: true, binnen, ringOppervlak: r.width * r.height };
  });
}

async function foto(page, naam) {
  await wacht(page, 450);
  await page.screenshot({ path: `${SHOTS}/${naam}.png` });
}

/** Wacht tot de kaart een bepaalde stap toont. */
let foutTeller = 0;
async function wachtOpStap(page, n, totaal = 8) {
  try {
    await page.waitForFunction(
      ([n, t]) => document.querySelector('[data-rondleiding-kaart] .tnum')?.textContent?.includes(`stap ${n} van ${t}`),
      [n, totaal],
      { timeout: 8000 },
    );
  } catch (e) {
    await page.screenshot({ path: `${SHOTS}/fout-${++foutTeller}-stap-${n}.png` }).catch(() => {});
    const info = await page.evaluate(() => [...document.querySelectorAll('[data-rondleiding-kaart]')].map((k) => `${k.dataset.stap}/${k.dataset.fase}/${k.dataset.klaar}`).join(', '));
    throw new Error(`stap ${n} van ${totaal} niet bereikt (zie fout-${foutTeller}-stap-${n}.png; kaart ${info})`);
  }
  await wacht(page, 250);
}

/** De handeling van elke stap, met de muis. */
async function doeStap(page, n, breed) {
  switch (n) {
    case 1:
      await page.click('[data-rondleiding="weergave"]');
      await page.click('[role=listbox] [role=option]:has-text("Lyceum Noord")');
      break;
    case 2:
      await page.locator('[data-rondleiding="deze-maand"] button[aria-pressed="false"]:has-text("Gereed")').first().click();
      break;
    case 3:
      if (breed) {
        await page.locator('[data-rondleiding="eerste-rij"] button[data-uid]').first().click();
        await page.locator('[data-rondleiding="actiebalk"] button[aria-label^="Een maand later"]').click();
      } else {
        await page.locator('[data-rondleiding="eerste-rij"] button.flex-1').first().click();
        const dlg = page.locator('[role=dialog][aria-modal=true]').last();
        const maand = dlg.locator('select').first();
        const huidig = await maand.inputValue();
        const opties = await maand.locator('option').evaluateAll((os) => os.map((o) => o.value));
        await maand.selectOption(opties.find((o) => o && o !== huidig));
        await dlg.locator('button:has-text("Opslaan")').click();
      }
      break;
    case 4:
      await page.locator('[data-rondleiding="ongedaan"] >> role=button[name="Ongedaan maken"]').click();
      break;
    case 5:
      await page.click('[data-rondleiding="toevoegen"]');
      await page.locator('[role=dialog] button[aria-label*=" toevoegen in "]').first().click();
      await wacht(page, 300);
      await foto(page, `${breed ? 'desktop' : 'mobiel'}-05b-paneel`);
      await page.click('[role=dialog] button:has-text("Klaar")');
      break;
    case 6:
      await page.click('[data-rondleiding="zoeken"]');
      await page.keyboard.type('lesuitval');
      await wacht(page, 150);
      await page.keyboard.press('Enter');
      await wacht(page, 700);
      // het zoekresultaat opent het detailvenster; de rondleiding wacht tot het dicht is
      await page.keyboard.press('Escape');
      break;
    case 7:
      if (!breed) await page.click('[data-rondleiding="menu-knop"]');
      await page.locator('[data-rondleiding="menu-voorbereiden"] a:has-text("Seizoensgesprekken")').locator('visible=true').first().click();
      break;
    case 8:
      if (!breed) await page.click('[data-rondleiding="menu-knop"]');
      await page.locator('[data-rondleiding="delen"]').locator('visible=true').first().click();
      break;
  }
}

/** Hele eerste rondleiding met de muis; screenshot en controle per stap. */
async function looprondleiding(page, tag, breed, { vanaf = 1 } = {}) {
  for (let n = vanaf; n <= 8; n++) {
    await wachtOpStap(page, n);
    const o = await overlap(page);
    if (n !== 4 || o.ring) ok(`${tag} stap ${n}: kaart naast het onderdeel, binnen beeld`, o.ring && o.overlap === 0 && o.binnen, JSON.stringify(o));
    await foto(page, `${tag}-${String(n).padStart(2, '0')}-${(await kaartTitel(page)).toLowerCase().replace(/[^a-z]+/g, '-')}`);
    await doeStap(page, n, breed);
    if (n < 8) {
      await page.waitForSelector(`${KAART} :text("Gelukt"), ${KAART} .kk-vinkje`, { timeout: 5000 }).catch(() => {});
      if (n === 1) await foto(page, `${tag}-01b-gelukt`);
      await wachtOpStap(page, n + 1);
      ok(`${tag} stap ${n} gaat verder na de handeling`, true);
    }
  }
  await page.waitForSelector('text=Dit is jouw schooljaar.', { timeout: 8000 });
  ok(`${tag} stap 8 gaat door naar de afsluiting`, true);
}

try {
  /* ============ 1. Demo, desktop: eerste gebruik, hele rondleiding, gegevens onaangeroerd ============ */
  {
    const { ctx, page } = await nieuwePagina(1440);
    await page.click('text=Verken eerst de demo');
    await page.waitForSelector('text=Zullen we even oefenen?');
    ok('demo: introductie opent automatisch', true);
    await foto(page, 'desktop-00-introductie');
    ok('demo: "gezien" onthouden in localStorage', (await voortgang(page))?.aangeboden === true);
    // Eigen voorkeuren zetten die het oefenen niet mag veranderen
    await page.click('text=Niet nu');
    await page.goto(URL + '#/kalender');
    await page.click('[role=tablist][aria-label=Weergave] >> text=Lijst');
    await page.goto(URL + '#/bibliotheek');
    await page.fill('[data-rondleiding="bibliotheek-zoek"] input', 'toets');
    await page.goto(URL + '#/organisatie');
    await wacht(page, 400);
    const voor = await echt(page);
    ok('voor: eigen kalender staat in localStorage', !!voor['kwaliteitskalender:state:v5']);

    // Oproepen vanuit de helpknop
    await page.click('[data-rondleiding="hulp"]');
    await page.click('[role=dialog] >> text=De rondleiding (3 minuten)');
    await wachtOpStap(page, 1);
    ok('helpknop start de rondleiding', true);
    ok('oefenen: gele band zichtbaar', await page.isVisible('text=Oefenkalender.'));
    ok('oefenen: oefenbestuur in beeld', (await page.textContent('[data-rondleiding="weergave"]')).includes('Oefenbestuur De Zandbak'));
    ok('oefenen: begint op Start', (await page.evaluate(() => location.hash)) === '#/');
    ok('oefenen: kaart heeft focus', (await page.evaluate(() => document.activeElement?.tagName)) === 'H2');

    await looprondleiding(page, 'desktop', true);
    await foto(page, 'desktop-09-afsluiting');
    await wacht(page, 2600);
    await foto(page, 'desktop-09b-afsluiting-getekend');
    const afsluiting = await page.textContent('[role=dialog]');
    ok('afsluiting: teller van wat je deed', afsluiting.includes('1 keer gereed gemeld') && afsluiting.includes('1 keer verschoven') && afsluiting.includes('1 keer ongedaan gemaakt') && afsluiting.includes('1 keer toegevoegd') && afsluiting.includes('1 keer gezocht'), afsluiting);
    ok('afsluiting: jaarlint van de eigen kalender', afsluiting.includes('Lyceum Noord') && (await page.locator('[role=dialog] svg[role=img]').count()) === 1);
    ok('afsluiting: terug op het scherm waar je was', (await page.evaluate(() => location.hash)) === '#/organisatie');
    ok('afsluiting: geen gele band meer', !(await page.isVisible('text=Oefenkalender.')));
    const na = await echt(page);
    for (const k of ECHT) ok(`na afloop byte voor byte gelijk: ${k}`, voor[k] === na[k], `${(voor[k] ?? '').length} vs ${(na[k] ?? '').length}`);
    ok('na afloop: zoekterm in de bibliotheek terug', (await (async () => {
      await page.keyboard.press('Escape');
      await page.goto(URL + '#/bibliotheek');
      return page.inputValue('[data-rondleiding="bibliotheek-zoek"] input');
    })()) === 'toets');
    const v = await voortgang(page);
    ok('voortgang: eerste rondleiding af, niets lopend', v.eersteAf === true && v.lopend === null, JSON.stringify(v));
    ok('voortgang staat niet in de state (dus niet in het gedeelde bestand)', !na['kwaliteitskalender:state:v5'].includes('rondleiding') && !na['kwaliteitskalender:state:v5'].includes('Zandbak'));

    // Tweede bezoek: niet opnieuw
    await page.reload();
    await page.waitForSelector('main h1');
    await wacht(page, 600);
    ok('tweede bezoek: geen aanbod', !(await page.isVisible('text=Zullen we even oefenen?')) && (await page.locator('[data-rondleiding-aanbod]').count()) === 0);

    // Menu > Hulp > Rondleiding
    await page.click('[data-rondleiding="menu-rondleiding"]');
    await page.waitForSelector('[role=dialog] >> text=Rondleidingen');
    await foto(page, 'desktop-10-keuze');
    await page.click('[role=dialog] >> text=Laat zien hoe dit scherm werkt');
    await wachtOpStap(page, 1, 3);
    ok('menu: schermrondleiding van de bibliotheek', (await stapTekst(page)).includes('Bibliotheek'));
    await foto(page, 'desktop-11-scherm-bibliotheek');
    await page.click(`${KAART} button:has-text("Volgende")`);
    await wachtOpStap(page, 2, 3);
    await page.fill('[data-rondleiding="bibliotheek-zoek"] input', 'toets');
    await wachtOpStap(page, 3, 3);
    ok('schermrondleiding: typen in het zoekveld gaat verder', true);
    await page.click(`${KAART} button:has-text("Klaar")`);
    await page.waitForSelector('text=Rondleiding klaar', { timeout: 4000 });
    ok('schermrondleiding: klaar, terug in eigen kalender', !(await page.isVisible('text=Oefenkalender.')));
    ok('schermrondleiding: onthouden', (await voortgang(page)).schermen.includes('/bibliotheek'));

    // Zoekvenster
    await page.keyboard.press('Control+k');
    await page.keyboard.type('rondleiding');
    await wacht(page, 200);
    const groepen = await page.locator('[role=dialog][aria-label=Zoeken] [role=group]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
    ok('zoekvenster: groep Rondleidingen', groepen.includes('Rondleidingen'), groepen.join(', '));
    await page.click('[role=dialog][aria-label=Zoeken] [role=option]:has-text("Laat zien hoe dit scherm werkt")');
    await wachtOpStap(page, 1, 3);
    ok('zoekvenster start de schermrondleiding', true);
    // Stoppen: Esc op de kaart = onderbreken
    await page.focus(`${KAART} h2`);
    await page.keyboard.press('Escape');
    await wacht(page, 400);
    ok('Esc onderbreekt, terug in eigen kalender', !(await page.isVisible('text=Oefenkalender.')));
    ok('na onderbreken: verder te gaan via de helpknop', await (async () => {
      await page.click('[data-rondleiding="hulp"]');
      const t = await page.textContent('[role=dialog]');
      await page.keyboard.press('Escape');
      return t.includes('Verder met de rondleiding (stap 1 van 3)');
    })());
    const na2 = await echt(page);
    ok('na schermrondleidingen: eigen kalender ongewijzigd', na2['kwaliteitskalender:state:v5'] === voor['kwaliteitskalender:state:v5']);
    await ctx.close();
  }

  /* ============ 2. Herladen halverwege en overslaan ============ */
  {
    const { ctx, page } = await nieuwePagina(1440);
    await page.click('text=Verken eerst de demo');
    await page.waitForSelector('text=Zullen we even oefenen?');
    const voor = await echt(page);
    await page.click('text=Begin met oefenen');
    await wachtOpStap(page, 1);
    await doeStap(page, 1, true);
    await wachtOpStap(page, 2);
    await doeStap(page, 2, true);
    await wachtOpStap(page, 3);
    await doeStap(page, 3, true);
    await wachtOpStap(page, 4);
    await page.reload();
    await wachtOpStap(page, 4);
    ok('herladen: verder bij stap 4, nog steeds oefenen', await page.isVisible('text=Oefenkalender.'));
    ok('herladen: oefenkalender bewaard (Lyceum Noord)', (await page.textContent('[data-rondleiding="weergave"]')).includes('Lyceum Noord'));
    ok('herladen: melding weg, kaart zegt wat te doen', (await page.textContent(KAART)).includes('De melding is al weg'));
    await foto(page, 'desktop-12-na-herladen');
    const tussen = await echt(page);
    ok('herladen: eigen kalender ongewijzigd', tussen['kwaliteitskalender:state:v5'] === voor['kwaliteitskalender:state:v5']);
    // Vorige en overslaan
    await page.click(`${KAART} button:has-text("Vorige")`);
    await wachtOpStap(page, 3);
    ok('vorige: terug naar stap 3', true);
    for (let n = 3; n <= 8; n++) {
      await wachtOpStap(page, n);
      await page.click(`${KAART} button:has-text("Sla over")`);
    }
    await page.waitForSelector('text=Dit is jouw schooljaar.');
    ok('overslaan tot het eind: afsluiting', true);
    const afs = await page.textContent('[role=dialog]');
    ok('overslaan: teller klopt (gereed en verschoven van voor het herladen)', afs.includes('1 keer gereed gemeld') && afs.includes('1 keer verschoven'), afs);
    await page.click('text=Aan de slag');
    const na = await echt(page);
    for (const k of ECHT) ok(`herladen + overslaan: ${k} gelijk`, voor[k] === na[k]);
    // Stoppen halverwege met de band
    await page.click('[data-rondleiding="hulp"]');
    await page.click('[role=dialog] >> text=De rondleiding opnieuw');
    await wachtOpStap(page, 1);
    await doeStap(page, 1, true);
    await wachtOpStap(page, 2);
    await page.click('text=Stoppen met oefenen');
    await wacht(page, 400);
    ok('stoppen met de band: eigen kalender terug', !(await page.isVisible('text=Oefenkalender.')) && (await echt(page))['kwaliteitskalender:state:v5'] === voor['kwaliteitskalender:state:v5']);
    ok('stoppen: stap bewaard', (await voortgang(page)).lopend?.stap === 1);
    // Nieuw bezoek (sessie weg): aanbod om verder te gaan, in de hoek
    await page.evaluate(() => sessionStorage.clear());
    await page.reload();
    await page.waitForSelector('[data-rondleiding-aanbod]');
    ok('nieuw bezoek na onderbreken: "Verder met de rondleiding?"', (await page.textContent('[data-rondleiding-aanbod]')).includes('stap 2 van 8'));
    await page.click('[data-rondleiding-aanbod] button:has-text("Verder")');
    await wachtOpStap(page, 2);
    ok('verder: bij stap 2', true);
    await page.click(`${KAART} button[aria-label^="Rondleiding onderbreken"]`);
    await ctx.close();
  }

  /* ============ 3. Eigen bestuur via de wizard ============ */
  {
    const { ctx, page } = await nieuwePagina(1440);
    await page.click('text=Begin met mijn eigen bestuur');
    await page.fill('input[placeholder="bv. Stichting Onderwijs Regio X"]', 'Stichting Proef');
    await page.keyboard.press('Enter');
    await page.fill('input[placeholder="bv. Lyceum Noord"]', 'Proefcollege');
    await page.keyboard.press('Enter');
    await page.fill('input[placeholder="bv. Lyceum Noord"]', 'Proeflyceum');
    await page.keyboard.press('Enter');
    await page.click('button:has-text("Volgende")');
    await page.click('button:has-text("Kalender aanmaken")');
    await page.waitForSelector('text=Zullen we even oefenen?');
    ok('eigen bestuur: introductie opent automatisch', true);
    const voor = await echt(page);
    await page.click('text=Begin met oefenen');
    await wachtOpStap(page, 1);
    for (let n = 1; n <= 3; n++) {
      await doeStap(page, n, true);
      await wachtOpStap(page, n + 1);
    }
    await page.click(`${KAART} button[aria-label^="Rondleiding onderbreken"]`);
    await wacht(page, 400);
    ok('eigen bestuur: na stoppen eigen bestuur terug', (await page.textContent('main h1')).includes('Stichting Proef'));
    const na = await echt(page);
    for (const k of ECHT) ok(`eigen bestuur: ${k} gelijk`, voor[k] === na[k]);
    await ctx.close();
  }

  /* ============ 4. Kalenderbestand van een collega (gekoppeld) ============ */
  {
    // Een kalenderbestand maken uit een demo
    const { ctx: c0, page: p0 } = await nieuwePagina(1280);
    await p0.click('text=Verken eerst de demo');
    const bestand = await p0.evaluate(() => {
      const s = JSON.parse(localStorage.getItem('kwaliteitskalender:state:v5'));
      const { modus, setupVoltooid, onboardingVerborgen, ...rest } = s;
      return JSON.stringify({ formaat: 'kwaliteitskalender-vo', opgeslagenOp: new Date().toISOString(), ...rest, organisatie: { ...rest.organisatie, bestuurNaam: 'Stichting Collega' } }, null, 2);
    });
    await c0.close();

    const { ctx, page } = await nieuwePagina(1280, { init: NEP_BESTAND(bestand) });
    await page.click('text=Gedeeld kalenderbestand openen');
    await page.waitForSelector('[data-rondleiding-aanbod]');
    ok('kalenderbestand: rustig aanbod in de hoek (geen venster in de weg)', (await page.locator('[role=dialog][aria-modal=true]').count()) === 0);
    await foto(page, 'desktop-13-aanbod-bestand');
    await wacht(page, 2500); // eerste synchronisatie laten afronden
    const bestandVoor = await page.evaluate(() => window.__bestand.tekst);
    const schrijfVoor = await page.evaluate(() => window.__schrijfteller);
    const voor = await echt(page);
    await page.click('[data-rondleiding-aanbod] >> text=Rondleiding starten');
    await wachtOpStap(page, 1);
    for (let n = 1; n <= 5; n++) {
      await doeStap(page, n, true);
      await wachtOpStap(page, n + 1);
    }
    await wacht(page, 2500); // ruim na de sync-vertraging van 1,5 s
    ok('kalenderbestand: tijdens oefenen niets geschreven', (await page.evaluate(() => window.__schrijfteller)) === schrijfVoor);
    await page.click('[data-rondleiding="delen"]');
    await wachtOpStap(page, 6);
    await foto(page, 'desktop-14-oefenen-geen-bestand');
    ok('oefenen: sync-status toont geen gekoppeld bestand', (await page.textContent('[data-rondleiding="delen"]')).includes('Alleen op dit apparaat'));
    for (let n = 6; n <= 8; n++) {
      await wachtOpStap(page, n);
      // stap 8 (delen) is al gedaan: je staat op Gegevens & delen
      await page.click(`${KAART} button:has-text("Sla over"), ${KAART} button:has-text("Afronden")`);
    }
    await page.waitForSelector('text=Dit is jouw schooljaar.');
    await page.click('text=Aan de slag');
    await wacht(page, 2500);
    const bestandNa = await page.evaluate(() => window.__bestand.tekst);
    ok('kalenderbestand: byte voor byte gelijk na afloop', bestandNa === bestandVoor, `${bestandVoor.length} vs ${bestandNa.length}`);
    ok('kalenderbestand: niet herschreven', (await page.evaluate(() => window.__schrijfteller)) === schrijfVoor);
    const na = await echt(page);
    for (const k of ECHT) ok(`kalenderbestand: ${k} gelijk`, voor[k] === na[k]);
    ok('kalenderbestand: nog gekoppeld', (await page.textContent('[data-rondleiding="delen"]')).includes('collega.kwaliteitskalender.json'));
    await ctx.close();
  }

  /* ============ 5. 390 breed ============ */
  {
    const { ctx, page } = await nieuwePagina(390);
    await page.click('text=Verken eerst de demo');
    await page.waitForSelector('text=Zullen we even oefenen?');
    await foto(page, 'mobiel-00-introductie');
    const voor = await echt(page);
    await page.click('text=Begin met oefenen');
    await looprondleiding(page, 'mobiel', false);
    await foto(page, 'mobiel-09-afsluiting');
    const scroll = await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth + 1);
    ok('mobiel: geen horizontale paginascroll', scroll);
    await page.click('text=Aan de slag');
    const na = await echt(page);
    for (const k of ECHT) ok(`mobiel: ${k} gelijk`, voor[k] === na[k]);
    await ctx.close();
  }

  /* ============ 6. Alleen het toetsenbord ============ */
  {
    const { ctx, page } = await nieuwePagina(1440);
    await page.click('text=Verken eerst de demo');
    await page.waitForSelector('text=Zullen we even oefenen?');
    ok('toetsenbord: focus op "Begin met oefenen"', (await actiefTekst(page)).includes('Begin met oefenen'));
    const voor = await echt(page);
    await page.keyboard.press('Enter');
    await wachtOpStap(page, 1);
    const tab = async (zoek, max = 40) => {
      for (let i = 0; i < max; i++) {
        await page.keyboard.press('Tab');
        if (await zoek()) return true;
      }
      return false;
    };
    const naarOnderdeel = async () => {
      await page.focus(`${KAART} h2`);
      const gevonden = await tab(async () => (await actiefTekst(page)) === 'Naar het onderdeel', 6);
      await page.keyboard.press('Enter');
      return gevonden;
    };
    // 1 weergave
    ok('toetsenbord: "Naar het onderdeel" bereikbaar', await naarOnderdeel());
    await page.keyboard.press('Enter');
    await page.keyboard.type('Lyceum');
    await page.keyboard.press('Enter');
    await wachtOpStap(page, 2);
    ok('toetsenbord: focus terug op de kaart', (await page.evaluate(() => document.activeElement?.tagName)) === 'H2');
    // 2 gereed
    await naarOnderdeel();
    await tab(() => page.evaluate(() => document.activeElement?.getAttribute('aria-pressed') === 'false' && document.activeElement.textContent.includes('Gereed')));
    await page.keyboard.press('Enter');
    await wachtOpStap(page, 3);
    ok('toetsenbord: naar stap 3', true);
    // 3 verschuiven: chip selecteren en pijl rechts
    await naarOnderdeel();
    await tab(() => page.evaluate(() => !!document.activeElement?.dataset.uid));
    await page.keyboard.press('Enter');
    await page.keyboard.press('ArrowRight');
    await wachtOpStap(page, 4);
    ok('toetsenbord: naar stap 4', true);
    // 4 ongedaan: Ctrl+Z
    await page.keyboard.press('Control+z');
    await wachtOpStap(page, 5);
    ok('toetsenbord: naar stap 5', true);
    // 5 toevoegen
    await naarOnderdeel();
    await page.keyboard.press('Enter');
    await page.waitForSelector('[role=dialog] button[aria-label*=" toevoegen in "]');
    await tab(() => page.evaluate(() => (document.activeElement?.getAttribute('aria-label') ?? '').includes(' toevoegen in ')));
    await page.keyboard.press('Enter');
    await wacht(page, 300);
    await page.keyboard.press('Escape');
    await wachtOpStap(page, 6);
    ok('toetsenbord: naar stap 6', true);
    // 6 zoeken
    await page.keyboard.press('Control+k');
    await page.keyboard.type('lesuitval');
    await wacht(page, 150);
    await page.keyboard.press('Enter');
    await wacht(page, 600);
    await page.keyboard.press('Escape');
    await wachtOpStap(page, 7);
    ok('toetsenbord: naar stap 7', true);
    // 7 en 8: menu en delen
    await naarOnderdeel();
    await page.keyboard.press('Enter');
    await wachtOpStap(page, 8);
    ok('toetsenbord: naar stap 8', true);
    await naarOnderdeel();
    await page.keyboard.press('Enter');
    await page.waitForSelector('text=Dit is jouw schooljaar.');
    ok('toetsenbord: hele rondleiding zonder muis', true);
    ok('toetsenbord: focus in de afsluiting', (await actiefTekst(page)).includes('Aan de slag'));
    await foto(page, 'toetsenbord-afsluiting');
    await page.keyboard.press('Enter');
    const na = await echt(page);
    for (const k of ECHT) ok(`toetsenbord: ${k} gelijk`, voor[k] === na[k]);
    await ctx.close();
  }

  /* ============ 7. Minder beweging ============ */
  {
    const ctx = await browser.newContext({ viewport: { width: 1280, height: 800 }, reducedMotion: 'reduce' });
    const page = await ctx.newPage();
    page.on('pageerror', (e) => fouten.push(`reduced pageerror: ${e.message}`));
    await page.goto(URL);
    await page.click('text=Verken eerst de demo');
    await page.click('text=Begin met oefenen');
    await wachtOpStap(page, 1);
    const anim = await page.evaluate(() => getComputedStyle(document.querySelector('.kk-ring')).animationName);
    ok('minder beweging: geen ringanimatie', anim === 'none', anim);
    await ctx.close();
  }
} catch (e) {
  ok('script liep zonder fout', false, e.message);
}

ok('geen netwerkverzoeken', verzoeken.length === 0, verzoeken.join(', '));
ok('geen console-fouten', fouten.length === 0, fouten.join(' | '));
await browser.close();
console.log(resultaten.join('\n'));
const nFout = resultaten.filter((r) => r.startsWith('FOUT')).length;
console.log(`\n${resultaten.length - nFout} OK, ${nFout} FOUT`);
process.exit(nFout ? 1 : 0);
