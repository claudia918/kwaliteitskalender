// E2e-controles voor Welkom, Wizard, Start, Dashboard en Organisatie.
// Gebruik: npm run build && node scripts/e2e-start.mjs
// Schermafdrukken in test-resultaten/start/.
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const hier = path.dirname(fileURLToPath(import.meta.url));
const HTML = path.resolve(hier, '../dist/kwaliteitskalender.html');
const URL = 'file://' + HTML;
const SHOTS = path.resolve(hier, '../test-resultaten/start');
mkdirSync(SHOTS, { recursive: true });

const resultaten = [];
const ok = (naam, voorwaarde, extra = '') =>
  resultaten.push(`${voorwaarde ? 'OK  ' : 'FOUT'} ${naam}${extra && !voorwaarde ? ' :: ' + extra : ''}`);

const browser = await chromium.launch();
const verzoeken = [];
const fouten = [];

async function nieuwePagina(breedte) {
  const ctx = await browser.newContext({ viewport: { width: breedte, height: breedte < 600 ? 844 : 900 }, deviceScaleFactor: 1 });
  const page = await ctx.newPage();
  page.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('data:') && !u.startsWith('blob:') && u !== URL && !u.startsWith(URL + '#')) verzoeken.push(u);
  });
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') fouten.push(`${breedte}px ${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => fouten.push(`${breedte}px pageerror: ${e.message}`));
  return { ctx, page };
}

async function geenHorizontaleScroll(page, naam) {
  const [sw, iw] = await page.evaluate(() => [document.documentElement.scrollWidth, window.innerWidth]);
  ok(`geen horizontale scroll: ${naam}`, sw <= iw, `${sw} > ${iw}`);
}

async function kiesNiveau(page, label) {
  await page.click(`[role=tablist][aria-label=Niveau] [role=tab][title="${label}"]`);
  await page.waitForTimeout(80);
}

async function shot(page, naam) {
  await page.evaluate(() => window.scrollTo(0, 0));
  await page.waitForTimeout(150);
  await page.screenshot({ path: `${SHOTS}/${naam}.png`, fullPage: true });
}

for (const breedte of [1440, 390]) {
  const tag = breedte === 390 ? 'mobiel' : 'desktop';

  /* ---------------- Eigen kalender via de wizard ---------------- */
  {
    const { ctx, page } = await nieuwePagina(breedte);
    await page.goto(URL);
    await page.waitForSelector('text=Welkom bij de Kwaliteitskalender VO');
    ok(`${tag} welkom: vier bouwstenen`, (await page.locator('main li h2').count()) === 4);
    ok(`${tag} welkom: gedeeld bestand openen`, await page.isVisible('text=Gedeeld kalenderbestand openen'));
    await geenHorizontaleScroll(page, `${tag} welkom`);
    await shot(page, `${tag}-01-welkom`);

    await page.click('text=Begin met mijn eigen bestuur');
    await page.waitForSelector('text=Over je bestuur');
    ok(`${tag} wizard: volgende uit zonder naam`, await page.isDisabled('button:has-text("Volgende")'));
    await shot(page, `${tag}-02-wizard-stap1`);
    await page.fill('input[placeholder="bv. Stichting Onderwijs Regio X"]', 'Stichting Proef');
    await page.keyboard.press('Enter');
    await page.waitForSelector('text=Voeg je scholen toe');
    ok(`${tag} wizard: Enter gaat naar stap 2`, true);
    ok(`${tag} wizard: volgende uit zonder school`, await page.isDisabled('button:has-text("Volgende")'));
    await page.fill('input[placeholder="bv. Lyceum Noord"]', 'Proefcollege');
    await page.fill('input[placeholder="havo/vwo"]', 'havo/vwo');
    await page.keyboard.press('Enter');
    await page.fill('input[placeholder="bv. Lyceum Noord"]', 'Proeflyceum');
    await page.click('button:has-text("Toevoegen")');
    await page.fill('input[placeholder="bv. Lyceum Noord"]', 'proefcollege');
    ok(`${tag} wizard: dubbele school geweigerd`, await page.isVisible('text=Deze school staat al in de lijst.'));
    await page.fill('input[placeholder="bv. Lyceum Noord"]', '');
    ok(`${tag} wizard: twee scholen`, (await page.textContent('main')).includes('2 scholen toegevoegd'));
    await shot(page, `${tag}-03-wizard-stap2`);
    await page.click('button:has-text("Volgende")');
    await page.waitForSelector('text=Hoe wil je beginnen?');
    ok(`${tag} wizard: tekst sjabloon`, (await page.textContent('main')).includes('op alle 2 scholen'));
    await page.click('[role=radio]:has-text("Begin met lege kalenders")');
    await shot(page, `${tag}-04-wizard-stap3`);
    await page.click('button:has-text("Kalender aanmaken")');
    await page.waitForSelector('main h1:has-text("Stichting Proef")');
    ok(`${tag} start: bestuursnaam als titel`, true);
    ok(`${tag} start: aan de slag 2/3`, (await page.textContent('main')).includes('Aan de slag · 2/3'));
    ok(`${tag} start: zeven tegels`, (await page.locator('nav[aria-label=Snelkoppelingen] a').count()) === 7);
    await geenHorizontaleScroll(page, `${tag} start leeg`);
    await shot(page, `${tag}-05-start-leeg`);

    await page.goto(URL + '#/dashboard');
    await page.waitForSelector('main h1:has-text("Stichting Proef")');
    ok(`${tag} dashboard leeg: hint bibliotheek`, await page.isVisible('text=Er staan nog geen activiteiten op deze kalender.'));
    ok(`${tag} dashboard leeg: heatmap`, await page.isVisible('text=Heatmap scholen × gesprekken'));
    await geenHorizontaleScroll(page, `${tag} dashboard leeg`);
    await shot(page, `${tag}-06-dashboard-bestuur-leeg`);

    // Organisatie: cluster toevoegen, school koppelen, gesprek aanpassen
    await page.goto(URL + '#/organisatie');
    await page.waitForSelector('main h1:has-text("Beheer")');
    ok(`${tag} organisatie: ingang gegevens & delen`, await page.isVisible('main a[href="#/gegevens"] >> nth=0'));
    await page.fill('input[placeholder="bv. Cluster Noord"]', 'Cluster Oost');
    await page.click('#clusters button:has-text("Toevoegen")');
    await page.waitForSelector('#clusters input[value="Cluster Oost"]');
    ok(`${tag} organisatie: cluster toegevoegd`, true);
    await page.selectOption('select[aria-label="Cluster van Proefcollege"]', { label: 'Cluster Oost' });
    const naamVeld = page.locator('input[aria-label="Naam van Proeflyceum"]');
    await naamVeld.fill('');
    await naamVeld.press('Tab');
    ok(`${tag} organisatie: lege schoolnaam teruggezet`, (await naamVeld.inputValue()) === 'Proeflyceum');
    await naamVeld.fill('Proeflyceum Zuid');
    await naamVeld.press('Enter');
    await page.click('#gesprekscyclus button:has-text("Gesprek toevoegen")');
    ok(`${tag} organisatie: vijf gesprekken`, (await page.locator('#gesprekscyclus ol > li').count()) === 5);
    await page.click('button[aria-label="Gesprek 5 verwijderen"]');
    await page.click('[role=dialog] button:has-text("Verwijderen")');
    await page.waitForTimeout(200);
    ok(`${tag} organisatie: gesprek verwijderd`, (await page.locator('#gesprekscyclus ol > li').count()) === 4);
    await geenHorizontaleScroll(page, `${tag} organisatie`);
    await shot(page, `${tag}-07-organisatie-eigen`);

    // Onboarding: vul met aanbevolen
    await page.goto(URL + '#/');
    await page.click('button:has-text("Vul met aanbevolen")');
    await page.waitForTimeout(200);
    ok(`${tag} start: onboarding verdwijnt als alles klaar is`, !(await page.isVisible('text=Zet je kwaliteitskalender op')));

    // Schoolniveau en cluster
    await kiesNiveau(page, 'School');
    await page.goto(URL + '#/');
    await page.waitForSelector('main h1');
    ok(`${tag} school-dashboard: checklist`, await page.isVisible('text=Checklist'));
    await geenHorizontaleScroll(page, `${tag} dashboard school eigen`);
    await shot(page, `${tag}-08-dashboard-school-eigen`);
    await kiesNiveau(page, 'Cluster');
    await page.goto(URL + '#/dashboard');
    await page.waitForSelector('main h1:has-text("Cluster Oost")');
    ok(`${tag} cluster-dashboard eigen: infobalk`, await page.isVisible('text=Clusterweergave is alleen-lezen'));
    await shot(page, `${tag}-09-dashboard-cluster-eigen`);

    // Herladen behoudt alles
    await page.reload();
    await page.waitForSelector('main h1:has-text("Cluster Oost")');
    ok(`${tag} herladen behoudt eigen kalender`, true);
    await ctx.close();
  }

  /* ---------------- Demo ---------------- */
  {
    const { ctx, page } = await nieuwePagina(breedte);
    await page.goto(URL);
    await page.click('text=Verken eerst de demo');
    await page.waitForSelector('main h1:has-text("Lyceum Noord")');
    ok(`${tag} demo school-dashboard`, await page.isVisible('text=Voortgang totaal'));
    ok(`${tag} demo checklist linkt naar kalender`, (await page.locator('a[href^="#/kalender?item="]').count()) > 0);
    await geenHorizontaleScroll(page, `${tag} demo school`);
    await shot(page, `${tag}-10-demo-dashboard-school`);

    await page.goto(URL + '#/organisatie');
    ok(`${tag} organisatie op schoolniveau: alleen bestuur`, await page.isVisible('text=Alleen voor het bestuur'));
    await shot(page, `${tag}-11-organisatie-school`);

    await kiesNiveau(page, 'Cluster');
    await page.goto(URL + '#/dashboard');
    await page.waitForSelector('main h1');
    ok(`${tag} demo cluster-dashboard: heatmap`, await page.isVisible('text=Heatmap scholen × gesprekken'));
    await geenHorizontaleScroll(page, `${tag} demo cluster`);
    await shot(page, `${tag}-12-demo-dashboard-cluster`);

    await kiesNiveau(page, 'Bestuur');
    await page.goto(URL + '#/');
    await page.waitForSelector('main h1:has-text("Stichting Leren Verbeteren")');
    ok(`${tag} demo start: geen onboarding`, !(await page.isVisible('text=Zet je kwaliteitskalender op')));
    await shot(page, `${tag}-13-demo-start`);
    await page.goto(URL + '#/dashboard');
    await page.waitForSelector('text=Voortgang per school');
    ok(`${tag} demo bestuur-dashboard: 5 scholen in heatmap`, (await page.locator('table tbody tr').count()) === 5);
    await geenHorizontaleScroll(page, `${tag} demo bestuur`);
    await shot(page, `${tag}-14-demo-dashboard-bestuur`);
    // Klik op een school in de heatmap opent het schooldashboard
    await page.click('table tbody tr >> nth=2 >> button');
    await page.waitForSelector('main h1:has-text("VMBO Zuid")');
    ok(`${tag} heatmap: klik opent school`, true);

    await kiesNiveau(page, 'Bestuur');
    await page.goto(URL + '#/organisatie');
    await page.waitForSelector('main h1:has-text("Beheer")');
    await geenHorizontaleScroll(page, `${tag} demo organisatie`);
    await shot(page, `${tag}-15-demo-organisatie`);
    // Alles leegmaken gaat terug naar welkom
    await page.click('button:has-text("Alles leegmaken")');
    await page.click('[role=dialog] button:has-text("Alles leegmaken")');
    await page.waitForSelector('text=Welkom bij de Kwaliteitskalender VO');
    ok(`${tag} alles leegmaken → welkom`, true);
    await ctx.close();
  }
}

ok('geen netwerkverzoeken', verzoeken.length === 0, verzoeken.join(', '));
ok('geen console-fouten', fouten.length === 0, fouten.join(' | '));
await browser.close();
console.log(resultaten.join('\n'));
if (resultaten.some((r) => r.startsWith('FOUT'))) process.exit(1);
