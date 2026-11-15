// E2e-controles voor de navigatie: weergavekeuze, menu-groepen, zoekvenster en begrippen,
// met toetsenbordbediening. Gebruik: npm run build && node scripts/e2e-navigatie.mjs
// Schermafdrukken in test-resultaten/navigatie/.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const hier = path.dirname(fileURLToPath(import.meta.url));
const URL = 'file://' + path.resolve(hier, '../dist/kwaliteitskalender.html');
const SHOTS = path.resolve(hier, '../test-resultaten/navigatie');
mkdirSync(SHOTS, { recursive: true });

const resultaten = [];
const ok = (naam, voorwaarde, extra = '') =>
  resultaten.push(`${voorwaarde ? 'OK  ' : 'FOUT'} ${naam}${extra && !voorwaarde ? ' :: ' + extra : ''}`);
const verzoeken = [];
const fouten = [];

const browser = await chromium.launch();
async function nieuwePagina(breedte) {
  const ctx = await browser.newContext({ viewport: { width: breedte, height: breedte < 600 ? 844 : 900 }, locale: 'nl-NL' });
  // De rondleiding is in deze test al aangeboden (zie e2e-rondleiding.mjs). Bewust geen init-script:
  // localStorage aanraken bij het begin van elk document laat Chromium soms latere schrijfacties vergeten.
  await (async () => { const p = await ctx.newPage(); await p.goto(URL); await p.evaluate(() => localStorage.setItem('kwaliteitskalender:rondleiding:v1', JSON.stringify({ aangeboden: true }))); await p.waitForTimeout(150); await p.close(); })();
  const page = await ctx.newPage();
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('data:') && !u.startsWith('blob:') && u !== URL && !u.startsWith(URL + '#')) verzoeken.push(u);
  });
  page.on('console', (m) => (m.type() === 'error' || m.type() === 'warning') && fouten.push(`${breedte}px ${m.text()}`));
  page.on('pageerror', (e) => fouten.push(`${breedte}px pageerror: ${e.message}`));
  await page.goto(URL);
  await page.click('text=Verken eerst de demo');
  await page.waitForSelector('[data-rondleiding="weergave"]');
  return { ctx, page };
}
const hash = (page) => page.evaluate(() => decodeURIComponent(location.hash));
const actief = (page) => page.evaluate(() => document.activeElement?.getAttribute('aria-label') ?? document.activeElement?.textContent ?? '');

try {
  /* ---------------- Desktop ---------------- */
  const { ctx, page } = await nieuwePagina(1440);

  // Menu in groepen
  for (const g of ['overzicht', 'plannen', 'voorbereiden', 'controleren', 'beheer', 'hulp']) {
    ok(`menu-groep ${g}`, (await page.locator(`nav[aria-label=Hoofdmenu] [data-rondleiding="menu-${g}"]`).count()) === 1);
  }
  const labels = await page.locator('nav[aria-label=Hoofdmenu] a').allTextContents();
  ok('menu zonder jargon "Compliance" en zonder dubbel Dashboard', !labels.includes('Compliance') && !labels.includes('Dashboard'), labels.join(', '));
  ok('menu: 11 items', labels.length === 11, labels.join(', '));
  ok('geen niveauwisselaar en scopebalk meer', (await page.locator('[role=tablist][aria-label=Niveau]').count()) === 0);

  // Weergavekeuze met het toetsenbord
  await page.focus('[data-rondleiding="weergave"]');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[role=listbox]');
  ok('weergave: opent met Enter, zoekveld krijgt focus', (await actief(page)) === 'Zoek een school of cluster');
  await page.keyboard.type('vmbo');
  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  ok('weergave: zoeken en Enter kiest VMBO Zuid', (await page.textContent('[data-rondleiding="weergave"]')).includes('VMBO Zuid'));
  ok('weergave: focus terug op de knop', (await page.evaluate(() => document.activeElement?.dataset.rondleiding)) === 'weergave');
  await page.keyboard.press('Enter');
  await page.waitForSelector('[role=listbox]');
  await page.keyboard.press('Escape');
  ok('weergave: Esc sluit', (await page.locator('[role=listbox]').count()) === 0);
  await page.screenshot({ path: `${SHOTS}/01-start-school.png` });

  // Zoekvenster: Ctrl+K, typen, pijltjes, Enter
  await page.keyboard.press('Control+k');
  await page.waitForSelector('[role=dialog][aria-label=Zoeken]');
  ok('zoeken: Ctrl+K opent, focus in het zoekveld', (await page.evaluate(() => document.activeElement?.getAttribute('role'))) === 'combobox');
  ok('zoeken: zonder vraag "Snel naar" schermen', (await page.locator('[role=dialog][aria-label=Zoeken] [role=option]').count()) === 11);
  await page.keyboard.type('lesuitval');
  await page.waitForTimeout(100);
  const groepen = await page.locator('[role=dialog][aria-label=Zoeken] [role=group]').evaluateAll((els) => els.map((e) => e.getAttribute('aria-label')));
  ok('zoeken: vindt op de kalender en in de bibliotheek', groepen.includes('Op de kalender') && groepen.includes('In de bibliotheek'), groepen.join(', '));
  const eerste = await page.textContent('[role=dialog][aria-label=Zoeken] [role=option][aria-selected=true]');
  ok('zoeken: eerste treffer van de school die je bekijkt', eerste.includes('VMBO Zuid'), eerste);
  await page.screenshot({ path: `${SHOTS}/02-zoeken.png` });
  await page.keyboard.press('Enter');
  await page.waitForTimeout(250);
  ok('zoeken: Enter opent de activiteit in de kalender', (await hash(page)).startsWith('#/kalender?item='), await hash(page));
  await page.keyboard.press('Escape'); // detailvenster van de kalender
  await page.waitForTimeout(150);

  // Zoeken naar een school wisselt de weergave
  await page.keyboard.press('Control+k');
  await page.keyboard.type('gymnasium');
  await page.waitForTimeout(100);
  await page.keyboard.press('Enter');
  await page.waitForSelector('main h1:has-text("Gymnasium Oost")');
  ok('zoeken: school kiezen wisselt de weergave en gaat naar start', (await hash(page)) === '#/');

  // Zoeken naar een scherm met een oude naam
  await page.keyboard.press('Control+k');
  await page.keyboard.type('compliance');
  await page.waitForTimeout(100);
  await page.keyboard.press('Enter');
  await page.waitForSelector('main h1:has-text("Dekking standaarden")');
  ok('zoeken: oude naam "compliance" vindt Dekking standaarden', true);

  // Begrip via zoeken, pijltjes naar beneden
  await page.keyboard.press('Control+k');
  await page.keyboard.type('vaste standaard');
  await page.waitForTimeout(100);
  const opties = page.locator('[role=dialog][aria-label=Zoeken] [role=option]');
  const teksten = await opties.allTextContents();
  const idx = teksten.findIndex((t) => t.startsWith('Vaste standaard') && t.includes('inspectie'));
  ok('zoeken: vindt het begrip', idx >= 0, teksten.join(' | '));
  for (let i = 0; i < idx; i++) await page.keyboard.press('ArrowDown');
  await page.keyboard.press('Enter');
  await page.waitForSelector('main h1:has-text("Begrippen")');
  ok('zoeken: begrip opent de begrippenlijst', (await hash(page)).includes('begrip=vaste-standaard'));

  // Geen resultaat, Esc sluit en focus keert terug
  await page.focus('[data-rondleiding="zoeken"]');
  await page.keyboard.press('Enter');
  await page.keyboard.type('qqqxyz');
  ok('zoeken: lege toestand', await page.isVisible('text=Niets gevonden'));
  await page.keyboard.press('Escape');
  ok('zoeken: Esc sluit', (await page.locator('[role=dialog][aria-label=Zoeken]').count()) === 0);
  ok('zoeken: focus terug op de zoekknop', (await page.evaluate(() => document.activeElement?.dataset.rondleiding)) === 'zoeken');

  // "/" opent ook
  await page.locator('main h1').click();
  await page.keyboard.press('/');
  ok('zoeken: "/" opent', await page.isVisible('[role=dialog][aria-label=Zoeken]'));
  await page.keyboard.press('Escape');

  // Begrippen: focus, hover, Esc
  await page.goto(URL + '#/compliance');
  await page.waitForSelector('main h1');
  const begrip = page.locator('main [data-begrip]').first();
  const term = await begrip.getAttribute('data-begrip');
  ok('begrip op Dekking standaarden', !!term);
  await begrip.focus();
  await page.waitForTimeout(100);
  ok('begrip: focus toont uitleg', await page.isVisible(`[data-begrip-uitleg="${term}"]`));
  ok('begrip: uitleg via aria-describedby', (await begrip.getAttribute('aria-describedby')) !== null);
  await page.keyboard.press('Escape');
  ok('begrip: Esc sluit', !(await page.isVisible(`[data-begrip-uitleg="${term}"]`)));
  await page.locator('main h1').hover();
  await begrip.hover();
  await page.waitForTimeout(350);
  ok('begrip: hover toont uitleg', await page.isVisible(`[data-begrip-uitleg="${term}"]`));
  await page.screenshot({ path: `${SHOTS}/03-begrip.png` });
  await page.locator('main h1').hover();
  await page.waitForTimeout(350);
  ok('begrip: weg bij verlaten', !(await page.isVisible(`[data-begrip-uitleg="${term}"]`)));
  for (const r of ['/', '/gesprekken', '/compliance', '/export', '/organisatie', '/gegevens']) {
    await page.goto(URL + '#' + r);
    await page.waitForSelector('main h1');
    ok(`begrippen op ${r}`, (await page.locator('main [data-begrip]').count()) > 0);
  }
  await ctx.close();

  /* ---------------- Mobiel ---------------- */
  const m = await nieuwePagina(390);
  const mp = m.page;
  ok('mobiel: weergaveknop zichtbaar', await mp.isVisible('[data-rondleiding="weergave"]'));
  ok('mobiel: zoekknop zichtbaar', await mp.isVisible('[data-rondleiding="zoeken"]'));
  await mp.click('[data-rondleiding="weergave"]');
  const box = await mp.locator('[role=dialog][aria-label="Wat wil je bekijken?"]').boundingBox();
  ok('mobiel: keuzepaneel past in beeld', box && box.x >= 0 && box.x + box.width <= 390, JSON.stringify(box));
  await mp.screenshot({ path: `${SHOTS}/04-mobiel-weergave.png` });
  await mp.click('[role=listbox] [role=option]:has-text("Hele bestuur")');
  await mp.click('[data-rondleiding="zoeken"]');
  await mp.keyboard.type('dossier');
  await mp.waitForTimeout(100);
  await mp.screenshot({ path: `${SHOTS}/05-mobiel-zoeken.png` });
  await mp.keyboard.press('Escape');
  await mp.click('button[aria-label="Menu openen"]');
  await mp.waitForSelector('[aria-label=Menu][role=dialog]');
  ok('mobiel: lade met demo verlaten', await mp.isVisible('[aria-label=Menu] button:has-text("Demo verlaten")'));
  await mp.waitForTimeout(300);
  await mp.screenshot({ path: `${SHOTS}/06-mobiel-menu.png` });
  await mp.click('[aria-label=Menu] a:has-text("Begrippen")');
  await mp.waitForSelector('main h1:has-text("Begrippen")');
  const tik = mp.locator('main [data-begrip]').first();
  if (await tik.count()) {
    await tik.tap?.().catch(() => tik.click());
  }
  const [sw, iw] = await mp.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  ok('mobiel: geen horizontale scroll', sw <= iw, `${sw} > ${iw}`);
  await m.ctx.close();
} catch (e) {
  ok('script liep zonder fout', false, e.message);
}

ok('geen netwerkverzoeken', verzoeken.length === 0, verzoeken.join(', '));
ok('geen console-fouten', fouten.length === 0, fouten.join(' | '));
await browser.close();
console.log(resultaten.join('\n'));
if (resultaten.some((r) => r.startsWith('FOUT'))) process.exit(1);
