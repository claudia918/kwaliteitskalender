// E2e-controles voor Welkom, Wizard, Start (volgende stap, werklijst, overzicht) en Organisatie.
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
  // De rondleiding is in deze test al aangeboden (zie e2e-rondleiding.mjs). Bewust geen init-script:
  // localStorage aanraken bij het begin van elk document laat Chromium soms latere schrijfacties vergeten.
  await (async () => { const p = await ctx.newPage(); await p.goto(URL); await p.evaluate(() => localStorage.setItem('kwaliteitskalender:rondleiding:v1', JSON.stringify({ aangeboden: true }))); await p.waitForTimeout(150); await p.close(); })();
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

/** Wat je bekijkt: weergaveknop in de topbar, dan de optie met deze naam. */
async function kies(page, naam) {
  await page.click('[data-rondleiding="weergave"]');
  await page.click(`[role=listbox] [role=option]:has-text("${naam}")`);
  await page.waitForTimeout(100);
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
    ok(`${tag} start: aan de slag 1 van 4`, (await page.textContent('main')).includes('Aan de slag · 1 van 4'));
    ok(
      `${tag} start: volgende stap bij lege kalender`,
      (await page.textContent('[data-rondleiding="volgende-stap"]')).includes('Je kalender is nog leeg'),
    );
    ok(`${tag} start: geen werklijst bij lege kalender`, (await page.locator('[data-rondleiding="deze-maand"]').count()) === 0);
    ok(`${tag} start: weergaveknop toont bestuur`, (await page.textContent('[data-rondleiding="weergave"]')).includes('Stichting Proef'));
    await geenHorizontaleScroll(page, `${tag} start leeg`);
    await shot(page, `${tag}-05-start-leeg`);

    await page.goto(URL + '#/dashboard');
    await page.waitForSelector('main h1:has-text("Stichting Proef")');
    ok(`${tag} /dashboard verwijst naar start`, (await page.evaluate(() => location.hash)) === '#/');

    // Organisatie: cluster toevoegen, school koppelen, gesprek aanpassen
    await page.goto(URL + '#/organisatie');
    await page.waitForSelector('main h1:has-text("Organisatie")');
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

    // Volgende stap: aanbevolen activiteiten toevoegen
    await page.goto(URL + '#/');
    await page.click('[data-rondleiding="volgende-stap"] button:has-text("Aanbevolen activiteiten toevoegen")');
    await page.waitForSelector('[data-rondleiding="deze-maand"]');
    ok(`${tag} start: werklijst na vullen`, true);
    ok(`${tag} start: volgende stap verandert`, !(await page.textContent('[data-rondleiding="volgende-stap"]')).includes('nog leeg'));
    ok(`${tag} start: aan de slag 2 van 4`, (await page.textContent('main')).includes('Aan de slag · 2 van 4'));
    ok(`${tag} start: heatmap`, await page.isVisible('text=Per school en gesprek'));

    // Schoolniveau: status met één klik
    await kies(page, 'Proefcollege');
    await page.waitForSelector('main h1:has-text("Proefcollege")');
    const lijst = page.locator('[data-rondleiding="deze-maand"]');
    if ((await lijst.locator('li[data-uid]').count()) === 0 && (await lijst.locator('[role=tab]').count()) > 1) {
      await lijst.locator('[role=tab]').nth(1).click();
    }
    const uid = await lijst.locator('li[data-uid]').first().getAttribute('data-uid');
    const regel = lijst.locator(`li[data-uid="${uid}"]`);
    await regel.locator('button:has-text("Gereed")').click();
    await page.waitForTimeout(200);
    ok(`${tag} werklijst: gereed met één klik`, (await regel.locator('button:has-text("Gereed")').getAttribute('aria-pressed')) === 'true');
    const status = await page.evaluate((u) => {
      const s = JSON.parse(localStorage.getItem('kwaliteitskalender:state:v5'));
      return Object.values(s.schoolKalenders).flat().find((i) => i.uid === u)?.status;
    }, uid);
    ok(`${tag} werklijst: status bewaard`, status === 'gereed', String(status));
    ok(`${tag} werklijst: regel blijft staan`, (await regel.count()) === 1);
    ok(`${tag} start: aan de slag 3 van 4`, (await page.textContent('main')).includes('Aan de slag · 3 van 4'));
    await regel.locator('button:has-text("Gereed")').click();
    await page.waitForTimeout(150);
    ok(`${tag} werklijst: nog eens klikken zet terug`, (await regel.locator('button:has-text("Gereed")').getAttribute('aria-pressed')) === 'false');
    await geenHorizontaleScroll(page, `${tag} start school eigen`);
    await shot(page, `${tag}-08-start-school-eigen`);

    await kies(page, 'Cluster Oost');
    await page.waitForSelector('main h1:has-text("Cluster Oost")');
    ok(`${tag} cluster: alleen lezen`, await page.isVisible('text=alleen om te lezen'));
    ok(`${tag} cluster: geen statusknoppen`, (await page.locator('[data-rondleiding="deze-maand"] button[aria-pressed]').count()) === 0);
    await shot(page, `${tag}-09-start-cluster-eigen`);

    // Herladen behoudt alles
    await page.reload();
    await page.waitForSelector('main h1:has-text("Cluster Oost")');
    ok(`${tag} herladen behoudt eigen kalender`, true);
    await ctx.close();
  }

  /* ---------------- Eén school: zo min mogelijk niveaus ---------------- */
  {
    const { ctx, page } = await nieuwePagina(breedte);
    await page.goto(URL);
    await page.click('text=Begin met mijn eigen bestuur');
    await page.fill('input[placeholder="bv. Stichting Onderwijs Regio X"]', 'Stichting Een');
    await page.keyboard.press('Enter');
    await page.fill('input[placeholder="bv. Lyceum Noord"]', 'Enige School');
    await page.keyboard.press('Enter');
    await page.click('button:has-text("Volgende")');
    await page.click('button:has-text("Kalender aanmaken")');
    await page.waitForSelector('main h1:has-text("Enige School")');
    ok(`${tag} één school: begint op de school`, (await page.textContent('[data-rondleiding="weergave"]')).includes('Je school'));
    await page.click('[data-rondleiding="weergave"]');
    ok(`${tag} één school: twee keuzes`, (await page.locator('[role=listbox] [role=option]').count()) === 2);
    await page.keyboard.press('Escape');
    await geenHorizontaleScroll(page, `${tag} één school`);
    await shot(page, `${tag}-09b-een-school`);
    await ctx.close();
  }

  /* ---------------- Demo ---------------- */
  {
    const { ctx, page } = await nieuwePagina(breedte);
    await page.goto(URL);
    await page.click('text=Verken eerst de demo');
    await page.waitForSelector('main h1:has-text("Lyceum Noord")');
    ok(`${tag} demo start school: volgende stap`, await page.isVisible('[data-rondleiding="volgende-stap"]'));
    ok(`${tag} demo start school: voortgang`, await page.isVisible('text=Hoe staat het ervoor'));
    ok(`${tag} demo werklijst linkt naar kalender`, (await page.locator('a[href^="#/kalender?item="]').count()) > 0);
    await geenHorizontaleScroll(page, `${tag} demo school`);
    await shot(page, `${tag}-10-demo-start-school`);

    await page.goto(URL + '#/organisatie');
    await page.waitForSelector('main h1:has-text("Organisatie")');
    ok(`${tag} organisatie ook op schoolniveau`, await page.isVisible('text=gelden voor het hele bestuur'));
    await shot(page, `${tag}-11-organisatie-school`);

    // Overzicht inklappen wordt onthouden (per browser)
    await page.goto(URL + '#/');
    await page.click('button[aria-controls="overzicht-inhoud"]');
    await page.reload();
    await page.waitForSelector('main h1');
    ok(`${tag} ingeklapt overzicht onthouden`, (await page.locator('#overzicht-inhoud').count()) === 0);
    await page.click('button[aria-controls="overzicht-inhoud"]');

    await kies(page, 'Cluster Noord');
    await page.waitForSelector('main h1:has-text("Cluster Noord")');
    ok(`${tag} demo cluster: heatmap`, await page.isVisible('text=Per school en gesprek'));
    await geenHorizontaleScroll(page, `${tag} demo cluster`);
    await shot(page, `${tag}-12-demo-start-cluster`);

    await kies(page, 'Hele bestuur');
    await page.goto(URL + '#/');
    await page.waitForSelector('main h1:has-text("Stichting Leren Verbeteren")');
    ok(`${tag} demo start: geen onboarding`, !(await page.isVisible('text=Zet je kwaliteitskalender op')));
    ok(`${tag} demo start bestuur: voortgang per school`, await page.isVisible('text=Voortgang per school'));
    ok(`${tag} demo bestuur: 5 scholen in heatmap`, (await page.locator('table tbody tr').count()) === 5);
    await geenHorizontaleScroll(page, `${tag} demo bestuur`);
    await shot(page, `${tag}-13-demo-start-bestuur`);
    // Klik op een school in de heatmap opent die school
    await page.click('table tbody tr >> nth=2 >> button');
    await page.waitForSelector('main h1:has-text("VMBO Zuid")');
    ok(`${tag} heatmap: klik opent school`, true);

    await kies(page, 'Hele bestuur');
    await page.goto(URL + '#/organisatie');
    await page.waitForSelector('main h1:has-text("Organisatie")');
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
