// E2e-controle van de Kalender-editor en de Bibliotheek (na `npm run build`).
// Gebruik: node scripts/e2e-kalender.mjs   (schermafdrukken in test-resultaten/kalender/)
import { createRequire } from 'node:module';
import { mkdirSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const HTML = resolve(import.meta.dirname, '..', 'dist', 'kwaliteitskalender.html');
const URL = 'file://' + HTML;
const SHOTS = resolve(import.meta.dirname, '..', 'test-resultaten', 'kalender');
mkdirSync(SHOTS, { recursive: true });

const resultaten = [];
let fout = false;
const ok = (naam, voorwaarde, extra = '') => {
  if (!voorwaarde) fout = true;
  resultaten.push(`${voorwaarde ? 'OK  ' : 'FOUT'} ${naam}${extra ? ' :: ' + extra : ''}`);
};

const SCHOOL = '1'; // Lyceum Noord in de demo
const UID = 's1-SKA3-03'; // Scholen op de Kaart actualiseren (1), SKA3, september

async function state(page) {
  return page.evaluate(() => JSON.parse(localStorage.getItem('kwaliteitskalender:state:v5')));
}
async function item(page, uid, kalender = SCHOOL) {
  const s = await state(page);
  const lijst = kalender === 'bestuur' ? s.bestuurItems : s.schoolKalenders[kalender] ?? [];
  return lijst.find((i) => i.uid === uid) ?? null;
}
async function wachtOpOpslaan(page) {
  await page.waitForTimeout(150);
}
async function geenHorizontaleScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}
async function niveau(page, n) {
  await page.click(`[role=tablist][aria-label=Niveau] >> text=${n}`);
  await page.waitForTimeout(100);
}

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'nl-NL' });
const page = await ctx.newPage();
const verzoeken = [];
const fouten = [];
const volg = (p) => {
  p.on('request', (r) => {
    const u = r.url();
    if (!u.startsWith('data:') && !u.startsWith('blob:') && u !== URL && !u.startsWith(URL + '#')) verzoeken.push(u);
  });
  p.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') fouten.push(`${m.type()}: ${m.text()}`);
  });
  p.on('pageerror', (e) => fouten.push('pageerror: ' + e.message));
};
volg(page);

try {
  await page.goto(URL);
  await page.click('text=Verken eerst de demo');
  await page.waitForSelector('nav[aria-label="Hoofdmenu"]');

  /* ---------------- Kalender, school, 1440 ---------------- */
  await page.goto(URL + '#/kalender');
  await page.waitForSelector('table[aria-label^="Kalendermatrix"]');
  ok('kop Kalender-editor', (await page.textContent('main h1')) === 'Kalender-editor');
  ok('subtitel met schooljaar', (await page.textContent('main header')).includes('schooljaar 2026/2027'));
  ok('gespreksmaand gemarkeerd (Nov, Herfst)', (await page.textContent('thead')).includes('Herfst'));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/01-matrix-1440.png` });

  // klik-selectie en verplaatsen met klik
  const chip = `button[data-uid="${UID}"]`;
  await page.click(chip);
  ok('chip geselecteerd', (await page.getAttribute(chip, 'aria-pressed')) === 'true');
  ok('selectiebalk zichtbaar', await page.isVisible('[data-selectiebalk]'));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/02-selectie-1440.png` });
  await page.click('td[data-cel="SKA3|Okt"]');
  await wachtOpOpslaan(page);
  ok('verplaatst met klik naar Okt', (await item(page, UID)).maand === 'Okt');
  ok('chip staat in de cel Okt', (await page.locator(`td[data-cel="SKA3|Okt"] ${chip}`).count()) === 1);
  // klik in een andere rij verplaatst niet
  await page.click('td[data-cel="OP1|Dec"]');
  await wachtOpOpslaan(page);
  ok('andere rij verplaatst niet', (await item(page, UID)).maand === 'Okt');

  // toetsenbord
  await page.focus(chip);
  await page.keyboard.press('ArrowRight');
  await wachtOpOpslaan(page);
  ok('pijl rechts → Nov', (await item(page, UID)).maand === 'Nov');
  ok('focus blijft op de chip', await page.evaluate((u) => document.activeElement?.getAttribute('data-uid') === u, UID));
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await wachtOpOpslaan(page);
  ok('2x pijl links → Sep', (await item(page, UID)).maand === 'Sep');
  await page.keyboard.press('Escape');
  ok('Esc deselecteert', (await page.getAttribute(chip, 'aria-pressed')) === 'false');

  // slepen
  await page.dragAndDrop(chip, 'td[data-cel="SKA3|Dec"]');
  await wachtOpOpslaan(page);
  ok('slepen naar Dec', (await item(page, UID)).maand === 'Dec');
  await page.dragAndDrop(chip, 'td[data-cel="OP1|Aug"]');
  await wachtOpOpslaan(page);
  ok('slepen naar andere rij doet niets', (await item(page, UID)).maand === 'Dec');

  // periode wisselen en heel jaar
  await page.click('[role=tablist][aria-label=Maanden] >> text=Heel jaar');
  ok('heel jaar toont 12 maanden', (await page.locator('thead th').count()) === 13);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/03-heel-jaar-1440.png` });
  await page.click('[role=tablist][aria-label=Maanden] >> text=Aug t/m jan');

  // detailvenster: tweede klik (na slepen is de chip al geselecteerd; eerst deselecteren)
  await page.keyboard.press('Escape');
  await page.click(chip);
  await page.click(chip);
  await page.waitForSelector('[role=dialog]');
  ok('detail opent via ?item=', page.url().includes(`item=${UID}`));
  const dlg = page.locator('[role=dialog]');
  await dlg.getByLabel('Eigen naam (optioneel)').fill('Scholen op de Kaart bijwerken');
  await dlg.getByRole('radio', { name: 'Bezig' }).click();
  await dlg.getByLabel('Eigenaar').fill('Kwaliteitsmedewerker');
  await dlg.getByLabel('Deadline').fill('2026-12-15');
  await dlg.getByLabel('Maand').selectOption('Jan');
  await dlg.getByLabel('Gekoppeld gesprek').selectOption('Winter');
  ok('afwijking vraagt reden', await dlg.getByLabel(/Reden voor afwijking/).isVisible());
  ok('opslaan uit zonder reden', await dlg.getByRole('button', { name: 'Opslaan' }).isDisabled());
  await dlg.getByLabel(/Reden voor afwijking/).fill('Past beter bij de tussenevaluatie');
  await dlg.getByLabel('Notitie').fill('Na overleg met de teamleiders.');
  await dlg.getByLabel('Naam document of verslag').fill('Verslag SodK');
  await dlg.getByLabel('Link (optioneel)').fill('https://school.sharepoint.com/sites/kwaliteit/sodk.docx');
  await dlg.getByRole('button', { name: 'Koppel' }).click();
  ok('privacyhint zichtbaar', (await dlg.textContent()).includes('Vermeld geen leerling- of andere persoonsgegevens.'));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/04-detail-ingevuld-1440.png` });
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await page.waitForSelector('text=Wijzigingen opgeslagen');
  await wachtOpOpslaan(page);
  let i = await item(page, UID);
  ok(
    'alle velden opgeslagen',
    i.eigenNaam === 'Scholen op de Kaart bijwerken' &&
      i.status === 'bezig' &&
      i.eigenaar === 'Kwaliteitsmedewerker' &&
      i.deadline === '2026-12-15' &&
      i.maand === 'Jan' &&
      i.gesprek === 'Winter' &&
      i.afwijking?.reden === 'Past beter bij de tussenevaluatie' &&
      i.notitie === 'Na overleg met de teamleiders.' &&
      i.bewijs?.length === 1 &&
      i.bewijs[0].url.startsWith('https://') &&
      i.historie?.at(-1)?.status === 'bezig',
    JSON.stringify(i),
  );
  ok('detail gesloten, item-param weg', !page.url().includes('item='));

  // Annuleren draait alles terug (ook status en bewijs)
  await page.goto(URL + `#/kalender?item=${UID}`);
  await page.waitForSelector('[role=dialog]');
  await dlg.getByRole('radio', { name: 'Risico' }).click();
  await dlg.getByRole('button', { name: /Bewijsstuk .* verwijderen/ }).click();
  await dlg.getByRole('button', { name: 'Annuleren' }).click();
  await wachtOpOpslaan(page);
  i = await item(page, UID);
  ok('annuleren wijzigt niets', i.status === 'bezig' && i.bewijs?.length === 1);
  // sluiten met wijzigingen vraagt eerst
  await page.goto(URL + `#/kalender?item=${UID}`);
  await page.waitForSelector('[role=dialog]');
  await dlg.getByLabel('Notitie').fill('Andere notitie');
  await page.keyboard.press('Escape');
  ok('sluitvraag bij niet-opgeslagen wijzigingen', await page.isVisible('text=Je wijzigingen zijn nog niet opgeslagen.'));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/05-sluitvraag-1440.png` });
  await dlg.getByRole('button', { name: 'Niet opslaan' }).click();
  ok('niet opslaan', (await item(page, UID)).notitie === 'Na overleg met de teamleiders.');

  // lijstweergave
  await page.click('[role=tablist][aria-label=Weergave] >> text=Lijst');
  await page.waitForSelector('#maand-Jan');
  ok('lijst toont aangepaste naam', (await page.textContent('main')).includes('Scholen op de Kaart bijwerken'));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/06-lijst-1440.png` });
  await page.click('text=Scholen op de Kaart bijwerken');
  await page.waitForSelector('[role=dialog]');
  ok('lijstrij opent detail', page.url().includes(`item=${UID}`));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/07-detail-opgeslagen-1440.png` });

  // verwijderen
  await dlg.getByRole('button', { name: 'Verwijderen', exact: true }).click();
  await dlg.getByRole('button', { name: 'Ja, verwijderen' }).click();
  await page.waitForSelector('text=Activiteit verwijderd');
  await wachtOpOpslaan(page);
  ok('verwijderd', (await item(page, UID)) === null);
  ok('tombstone gezet', Object.keys((await state(page)).verwijderd).some((k) => k.includes(UID)));
  ok('geen melding na verwijderen', (await page.locator('[role=dialog]').count()) === 0);

  // niet-bestaand item
  await page.goto(URL + '#/kalender?item=bestaat-niet');
  await page.waitForSelector('text=Activiteit niet gevonden');
  ok('nette melding bij onbekend item', true);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/08-niet-gevonden-1440.png` });
  await page.click('[role=dialog] >> text=Sluiten');
  // item op een andere kalender
  await page.goto(URL + '#/kalender?item=s2-OP2-01');
  await page.waitForSelector('text=Activiteit staat op een andere kalender');
  ok('item van andere school herkend', (await page.textContent('[role=dialog]')).includes('College Centrum'));
  await page.click('[role=dialog] >> text=Naar College Centrum');
  await page.waitForSelector('[role=dialog] >> text=Kalender van College Centrum');
  ok('wisselt naar de juiste school', true);
  await page.keyboard.press('Escape');
  await niveau(page, 'School');
  await page.selectOption('select[aria-label="Kies een school"]', SCHOOL).catch(() => {});

  /* ---------------- Bibliotheek ---------------- */
  await page.goto(URL + '#/bibliotheek');
  await page.waitForSelector('main h1');
  const s = await state(page);
  if (s && (await page.locator('select[aria-label="Kies een school"]').count())) await page.selectOption('select[aria-label="Kies een school"]', SCHOOL);
  await page.evaluate(() => window.scrollTo(0, 0));
  ok('frequentie en rol zichtbaar', (await page.textContent('main')).includes('Frequentie') && (await page.textContent('main')).includes('Kwaliteitsmedewerker'));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/09-bibliotheek-1440.png` });
  await page.click('text=Alleen wat nog niet op de kalender staat');
  const aantal = await page.locator('main article').count();
  ok('filter niet op kalender: 1 resultaat', aantal === 1, String(aantal));
  await page.click('main article >> role=button[name=/toevoegen aan de kalender/]');
  await page.waitForSelector('text=Scholen op de Kaart actualiseren (1) toegevoegd aan de kalender');
  await wachtOpOpslaan(page);
  ok('toegevoegd uit bibliotheek', (await state(page)).schoolKalenders[SCHOOL].some((x) => x.activiteitId === 'SKA3-03'));
  await page.click('text=Alleen wat nog niet op de kalender staat');
  await page.fill('input[type=search]', 'SKA3-03');
  await page.click('main article >> text=Op kalender');
  await page.waitForSelector('[role=dialog]');
  ok('"Op kalender" opent het item in de kalender', page.url().includes('/kalender?item='));
  await page.keyboard.press('Escape');

  // zoeken en filters
  await page.goto(URL + '#/bibliotheek');
  await page.fill('input[type=search]', '');
  await page.click('main >> role=button[name=/^Lente/]');
  await page.click('main >> role=button[name=/^VS/]');
  const lenteVs = await page.locator('main article').count();
  ok('filter gesprek + gebied', lenteVs > 0 && lenteVs < 10, String(lenteVs));
  await page.fill('input[type=search]', 'xyzxyz');
  ok('lege toestand', await page.isVisible('text=Niets gevonden'));
  await page.click('main >> role=button[name="Filters wissen"] >> nth=0');
  ok('filters gewist', (await page.locator('main article').count()) === 67);

  // eigen activiteit
  await page.click('main >> role=button[name="Eigen activiteit"]');
  const ed = page.locator('[role=dialog]');
  await ed.getByLabel(/^Naam/).fill('Audit examendossiers');
  await ed.getByLabel(/^Standaard/).selectOption('OP6');
  await ed.getByLabel('Gekoppeld gesprek').selectOption('Lente');
  await ed.getByLabel('Aanbevolen periode').fill('mrt');
  await ed.getByLabel('Omschrijving').fill('Steekproef van tien dossiers.');
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/10-eigen-activiteit-1440.png` });
  await ed.getByRole('button', { name: /^Toevoegen aan/ }).click();
  await page.waitForSelector('text=Audit examendossiers toegevoegd aan de kalender');
  await wachtOpOpslaan(page);
  const eigen = (await state(page)).schoolKalenders[SCHOOL].find((x) => x.custom?.naam === 'Audit examendossiers');
  ok('eigen activiteit opgeslagen', eigen && eigen.maand === 'Mrt' && eigen.custom.standaard === 'OP6' && eigen.gesprek === 'Lente', JSON.stringify(eigen));
  ok('eigen activiteit zichtbaar in bibliotheek', await page.isVisible('#eigen-kop'));

  // herladen: alles bewaard
  await page.reload();
  await page.goto(URL + '#/kalender');
  await page.waitForSelector('main h1');
  const na = await state(page);
  ok(
    'na herladen bewaard',
    na.schoolKalenders[SCHOOL].some((x) => x.custom?.naam === 'Audit examendossiers') &&
      na.schoolKalenders[SCHOOL].some((x) => x.activiteitId === 'SKA3-03') &&
      !na.schoolKalenders[SCHOOL].some((x) => x.uid === UID),
  );
  await page.click('[role=tablist][aria-label=Weergave] >> text=Lijst');
  ok('eigen activiteit in de lijst (maart)', (await page.textContent('section[aria-labelledby="maand-Mrt"]')).includes('Audit examendossiers'));
  await page.click('[role=tablist][aria-label=Weergave] >> text=Matrix');

  /* ---------------- Bestuur ---------------- */
  await niveau(page, 'Bestuur');
  await page.goto(URL + '#/kalender');
  await page.waitForSelector('table[aria-label^="Kalendermatrix"]');
  ok('bestuur: BKA-rijen', (await page.textContent('tbody')).includes('BKA1'));
  const bChip = page.locator('tbody button[data-uid]').first();
  const bUid = await bChip.getAttribute('data-uid');
  const voor = (await item(page, bUid, 'bestuur')).maand;
  await bChip.click();
  await page.keyboard.press(voor === 'Jul' ? 'ArrowLeft' : 'ArrowRight');
  await wachtOpOpslaan(page);
  ok('bestuur: verplaatsen met toetsenbord', (await item(page, bUid, 'bestuur')).maand !== voor);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/11-bestuur-matrix-1440.png` });
  await page.goto(URL + '#/bibliotheek');
  await page.waitForSelector('main article');
  ok('bestuur: 30 activiteiten', (await page.locator('main article').count()) === 30);

  /* ---------------- Cluster (alleen-lezen) ---------------- */
  await niveau(page, 'Cluster');
  await page.goto(URL + '#/kalender');
  await page.waitForSelector('table[aria-label^="Kalendermatrix"]');
  ok('cluster: info-balk', (await page.textContent('main')).includes('Clusterweergave is alleen-lezen'));
  ok('cluster: geen verplaatsbare chips', (await page.locator('tbody button[data-uid]').count()) === 0);
  ok('cluster: geen toevoegknop', (await page.locator('main >> text=Activiteit toevoegen').count()) === 0);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/12-cluster-matrix-1440.png` });
  await page.click('[role=tablist][aria-label=Weergave] >> text=Lijst');
  await page.locator('main section ul button').first().click();
  await page.waitForSelector('[role=dialog]');
  ok('cluster: detail alleen-lezen', (await page.locator('[role=dialog] input, [role=dialog] textarea, [role=dialog] select').count()) === 0);
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/13-cluster-detail-1440.png` });
  await page.keyboard.press('Escape');
  await page.click('[role=tablist][aria-label=Weergave] >> text=Matrix');
  await page.goto(URL + '#/bibliotheek');
  await page.waitForSelector('main article');
  ok('cluster: bibliotheek zonder Toevoegen', (await page.locator('main article >> role=button[name=/toevoegen/]').count()) === 0);
  ok('cluster: eigen activiteit uit', await page.isDisabled('main >> role=button[name="Eigen activiteit"]'));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/14-cluster-bibliotheek-1440.png` });
  await niveau(page, 'School');

  /* ---------------- 1280 en 390 ---------------- */
  for (const [b, h] of [
    [1280, 800],
    [390, 844],
  ]) {
    const p = await ctx.newPage();
    volg(p);
    await p.setViewportSize({ width: b, height: h });
    await p.goto(URL + '#/kalender');
    await p.waitForSelector('main h1');
    ok(`${b}: geen horizontale paginascroll (kalender)`, await geenHorizontaleScroll(p));
    if (b === 390) ok('390: standaard lijstweergave', await p.isVisible('#maand-Sep'));
    await p.waitForTimeout(350);
    await p.screenshot({ path: `${SHOTS}/20-kalender-${b}.png` });
    await p.click('[role=tablist][aria-label=Weergave] >> text=Matrix');
    await p.waitForSelector('table[aria-label^="Kalendermatrix"]');
    if (b === 1280) {
      const breedte = await p.evaluate(() => document.querySelector('thead th:nth-child(2)').getBoundingClientRect().width);
      ok('1280: ruime maandkolommen', breedte >= 110, `${Math.round(breedte)}px`);
    }
    ok(`${b}: geen horizontale paginascroll (matrix)`, await geenHorizontaleScroll(p));
    await p.waitForTimeout(350);
    await p.screenshot({ path: `${SHOTS}/21-matrix-${b}.png` });
    const c = p.locator('tbody button[data-uid]').first();
    await c.click();
    await c.click();
    await p.waitForSelector('[role=dialog]');
    await p.waitForTimeout(350);
    await p.screenshot({ path: `${SHOTS}/22-detail-${b}.png` });
    await p.keyboard.press('Escape');
    await p.goto(URL + '#/bibliotheek');
    await p.waitForSelector('main article');
    ok(`${b}: geen horizontale paginascroll (bibliotheek)`, await geenHorizontaleScroll(p));
    await p.waitForTimeout(350);
    await p.screenshot({ path: `${SHOTS}/23-bibliotheek-${b}.png` });
    await p.close();
  }
} catch (e) {
  fout = true;
  resultaten.push('FOUT uitzondering: ' + (e?.stack ?? e));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${SHOTS}/99-fout.png` }).catch(() => {});
}

ok('geen netwerkverzoeken', verzoeken.length === 0, verzoeken.join(', '));
ok('geen console-fouten', fouten.length === 0, fouten.join(' | '));
await browser.close();
console.log(resultaten.join('\n'));
process.exit(fout ? 1 : 0);
