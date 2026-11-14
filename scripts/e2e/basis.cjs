const { chromium } = require('playwright');
require('fs').mkdirSync(require('path').resolve(__dirname, '../../test-resultaten'), { recursive: true });
const path = require('path');
const fs = require('fs');
const HTML = require('path').resolve(__dirname, '../../dist/kwaliteitskalender.html');
const URL = "file://" + HTML;
const SHOTS = require('path').resolve(__dirname, '../../test-resultaten');
const resultaten = [];
const ok = (naam, voorwaarde, extra = '') => { resultaten.push(`${voorwaarde ? 'OK  ' : 'FOUT'} ${naam}${extra ? ' :: ' + extra : ''}`); };
// Wat je bekijkt kies je met de weergaveknop in de topbar (vervangt niveauwisselaar en scopebalk).
async function kies(page, naam) {
  await page.click('[data-rondleiding="weergave"]');
  await page.click(`[role=listbox] [role=option]:has-text("${naam}")`);
  await page.waitForTimeout(100);
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true });
  const page = await ctx.newPage();
  const verzoeken = [], fouten = [];
  page.on('request', (r) => { if (!r.url().startsWith('data:') && r.url() !== URL && !r.url().startsWith(URL + '#')) verzoeken.push(r.url()); });
  page.on('console', (m) => { if (m.type() === 'error' || m.type() === 'warning') fouten.push(`${m.type()}: ${m.text()}`); });
  page.on('pageerror', (e) => fouten.push('pageerror: ' + e.message));

  await page.goto(URL);
  await page.waitForSelector('text=Welkom bij de Kwaliteitskalender VO');
  ok('welkomstscherm', true);
  await page.screenshot({ path: `${SHOTS}/01-welkom.png` });
  await page.click('text=Verken eerst de demo');
  await page.waitForSelector('nav[aria-label="Hoofdmenu"]');
  ok('demo geladen', (await page.textContent('header')).includes('Demo'));
  await page.screenshot({ path: `${SHOTS}/02-demo-school.png` });

  const routes = ['/', '/dashboard', '/gesprekken', '/bibliotheek', '/kalender', '/compliance', '/export', '/organisatie', '/gegevens', '/begrippen', '/faq', '/contact'];
  for (const niveau of ['school', 'bestuur']) {
    if (niveau === 'bestuur') await kies(page, 'Hele bestuur');
    for (const r of routes) {
      await page.goto(URL + '#' + r);
      await page.waitForSelector('main h1');
      const h1 = await page.textContent('main h1');
      ok(`route ${niveau} ${r}`, !!h1, h1);
    }
  }
  // niveaukleuren
  const kleuren = {};
  for (const [n, optie] of [['Bestuur', 'Hele bestuur'], ['Cluster', 'Cluster Noord'], ['School', 'Lyceum Noord']]) {
    await kies(page, optie);
    await page.waitForTimeout(100);
    kleuren[n] = await page.evaluate(() => getComputedStyle(document.documentElement).getPropertyValue('--niveau').trim() + ' / ' + document.documentElement.dataset.niveau);
    await page.goto(URL + '#/');
    await page.screenshot({ path: `${SHOTS}/03-niveau-${n.toLowerCase()}.png` });
  }
  ok('niveauwissel verandert accentkleur', new Set(Object.values(kleuren)).size === 3, JSON.stringify(kleuren));
  // weergavekeuze toont type en clusternaam van een school
  await page.click('[data-rondleiding="weergave"]');
  const scope = await page.textContent('[role=listbox]');
  ok('weergavekeuze toont clusternaam', scope.includes('havo/vwo · Cluster Noord'));
  await page.keyboard.press('Escape');

  // herladen behoudt gegevens en niveau
  await page.goto(URL + '#/gegevens');
  await page.reload();
  await page.waitForSelector('nav[aria-label="Hoofdmenu"]');
  ok('herladen behoudt demo', (await page.textContent('header')).includes('Demo'));
  await page.screenshot({ path: `${SHOTS}/04-gegevens.png`, fullPage: true });

  // help
  await page.click('button[aria-label="Uitleg bij dit scherm"]');
  await page.waitForSelector('[role=dialog]');
  ok('helpdialoog', (await page.textContent('[role=dialog]')).includes('Uitleg: Gegevens & delen'));
  await page.screenshot({ path: `${SHOTS}/05-help.png` });
  await page.keyboard.press('Escape');

  // mobiel
  const mob = await ctx.newPage();
  await mob.setViewportSize({ width: 390, height: 844 });
  await mob.goto(URL + '#/');
  await mob.waitForSelector('main h1');
  await mob.screenshot({ path: `${SHOTS}/06-mobiel.png` });
  await mob.click('button[aria-label="Menu openen"]');
  await mob.waitForSelector('[aria-label=Menu][role=dialog]');
  await mob.waitForTimeout(400);
  await mob.screenshot({ path: `${SHOTS}/07-mobiel-lade.png` });
  await mob.close();

  ok('geen netwerkverzoeken', verzoeken.length === 0, verzoeken.join(', '));
  ok('geen console-fouten', fouten.length === 0, fouten.join(' | '));
  await browser.close();
  console.log(resultaten.join('\n'));
})().catch((e) => { console.error(e); console.log(resultaten.join('\n')); process.exit(1); });
