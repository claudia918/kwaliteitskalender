// E2e-controle van de Kalender en de Bibliotheek (na `npm run build`).
// Gebruik: node scripts/e2e-kalender.mjs   (schermafdrukken in test-resultaten/kalender/)
//
// Navigeert rechtstreeks naar #/kalender en #/bibliotheek en zet niveau en school via localStorage,
// zodat het script niet afhangt van menuteksten of de niveauwisselaar in de topbar.
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

const STATE = 'kwaliteitskalender:state:v5';
const UI = 'kwaliteitskalender:ui:v1';
const PREF = 'kwaliteitskalender:kalender-weergave:v1';
const SCHOOL = '1'; // Lyceum Noord in de demo
const UID = 's1-SKA3-03'; // Scholen op de Kaart actualiseren (1), SKA3, september
const CHIP = `button[data-uid="${UID}"]`;
const chipVan = (uid) => `[data-chip]:has(button[data-uid="${uid}"])`;

async function state(page) {
  return page.evaluate((k) => JSON.parse(localStorage.getItem(k)), STATE);
}
async function item(page, uid, kalender = SCHOOL) {
  const s = await state(page);
  const lijst = kalender === 'bestuur' ? s.bestuurItems : (s.schoolKalenders[kalender] ?? []);
  return lijst.find((i) => i.uid === uid) ?? null;
}
const wacht = (page, ms = 150) => page.waitForTimeout(ms);
async function geenHorizontaleScroll(page) {
  return page.evaluate(() => document.documentElement.scrollWidth <= window.innerWidth + 1);
}
/** Niveau (en school/cluster) zetten zonder de topbar: via de UI-voorkeur en herladen. */
async function naarNiveau(page, ui, hash = '#/kalender') {
  await page.evaluate(([k, v]) => localStorage.setItem(k, JSON.stringify(v)), [UI, ui]);
  await page.goto(URL + hash);
  await page.reload();
  await page.waitForSelector('main h1');
}
async function foto(page, naam) {
  await wacht(page, 350);
  await page.screenshot({ path: `${SHOTS}/${naam}.png` });
}
const ongedaanKnop = (page) => page.locator('[data-rondleiding="ongedaan"] >> role=button[name="Ongedaan maken"]');

const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, locale: 'nl-NL' });
// De rondleiding is in deze test al aangeboden (zie e2e-rondleiding.mjs). Bewust geen init-script:
// localStorage aanraken bij het begin van elk document laat Chromium soms latere schrijfacties vergeten.
await (async () => { const p = await ctx.newPage(); await p.goto(URL); await p.evaluate(() => localStorage.setItem('kwaliteitskalender:rondleiding:v1', JSON.stringify({ aangeboden: true }))); await p.waitForTimeout(150); await p.close(); })();
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
  await page.waitForSelector('nav');
  await page.evaluate((k) => localStorage.removeItem(k), PREF);
  const demo = await page.evaluate((k) => localStorage.getItem(k), STATE);
  await naarNiveau(page, { niveau: 'school', schoolId: SCHOOL, clusterId: 'Noord' });

  /* ---------------- Kalender, school, 1440 ---------------- */
  await page.waitForSelector('table[aria-label^="Kalendermatrix"]');
  ok('kop aanwezig', !!(await page.textContent('main h1')));
  ok('subtitel met schooljaar', (await page.textContent('main header')).includes('schooljaar 2026/2027'));
  ok('gespreksmaand gemarkeerd (Nov, Herfst)', (await page.textContent('thead')).includes('Herfst'));
  ok('geen uitlegregel meer over klikken', !(await page.textContent('main')).includes('Klik een activiteit om te verplaatsen'));
  ok('voortgang zichtbaar', (await page.textContent('[data-rondleiding="voortgang"]')).includes('van 67 gereed'));
  for (const naam of ['toevoegen', 'chip', 'status', 'weergave', 'filter', 'voortgang', 'periode', 'matrix'])
    ok(`rondleiding-anker ${naam}`, (await page.locator(`[data-rondleiding="${naam}"]`).count()) > 0);
  await foto(page, '01-matrix-1440');

  // selecteren, actiebalk, verplaatsen met klik, ongedaan maken
  await page.click(CHIP);
  ok('chip geselecteerd', (await page.getAttribute(CHIP, 'aria-pressed')) === 'true');
  ok('actiebalk zichtbaar', await page.isVisible('[data-selectiebalk]'));
  ok('doelcellen gemarkeerd in dezelfde rij', (await page.locator('td[data-doel][data-cel^="SKA3|"]').count()) === 5);
  await foto(page, '02-selectie-actiebalk-1440');
  await page.click('td[data-cel="SKA3|Okt"]');
  await wacht(page);
  ok('verplaatst met klik naar Okt', (await item(page, UID)).maand === 'Okt');
  ok('chip staat in de cel Okt', (await page.locator(`td[data-cel="SKA3|Okt"] ${CHIP}`).count()) === 1);
  ok('ongedaan-melding na verplaatsen', await ongedaanKnop(page).isVisible());
  await foto(page, '03-ongedaan-1440');
  await ongedaanKnop(page).click();
  await wacht(page);
  ok('ongedaan maken zet terug naar Sep', (await item(page, UID)).maand === 'Sep');
  if ((await page.getAttribute(CHIP, 'aria-pressed')) !== 'true') await page.click(CHIP);
  await page.click('td[data-cel="SKA3|Okt"]');
  await wacht(page);
  // klik in een andere rij verplaatst niet
  await page.click('td[data-cel="OP1|Dec"]', { position: { x: 5, y: 5 } }).catch(() => {});
  await wacht(page);
  ok('andere rij verplaatst niet', (await item(page, UID)).maand === 'Okt');

  // toetsenbord: pijlen, 1-4 voor status, Ctrl+Z
  await page.focus(CHIP);
  if ((await page.getAttribute(CHIP, 'aria-pressed')) !== 'true') await page.keyboard.press('Enter');
  await page.keyboard.press('ArrowRight');
  await wacht(page);
  ok('pijl rechts → Nov', (await item(page, UID)).maand === 'Nov');
  ok('focus blijft op de chip', await page.evaluate((u) => document.activeElement?.getAttribute('data-uid') === u, UID));
  await page.keyboard.press('ArrowLeft');
  await page.keyboard.press('ArrowLeft');
  await wacht(page);
  ok('2x pijl links → Sep', (await item(page, UID)).maand === 'Sep');
  await page.keyboard.press('2');
  await wacht(page);
  ok('toets 2 → status bezig', (await item(page, UID)).status === 'bezig');
  await page.keyboard.press('Control+z');
  await wacht(page);
  ok('Ctrl+Z zet status terug', (await item(page, UID)).status === 'gepland');
  await page.keyboard.press('Escape');
  ok('Esc deselecteert', (await page.getAttribute(CHIP, 'aria-pressed')) === 'false');
  ok('actiebalk weg na Esc', (await page.locator('[data-selectiebalk]').count()) === 0);

  // status met één klik op de chip (zonder detailvenster)
  await page.click(`${chipVan(UID)} [data-statusknop]`);
  ok('statusmenu opent', await page.isVisible('[role=menu][aria-label="Status kiezen"]'));
  await foto(page, '04-statusmenu-1440');
  await page.click('[role=menu] >> role=menuitemradio[name=/Gereed/]');
  await wacht(page);
  ok('status gereed via chip', (await item(page, UID)).status === 'gereed');
  ok('historie bijgewerkt', (await item(page, UID)).historie?.at(-1)?.status === 'gereed');
  ok('detailvenster niet geopend', (await page.locator('[role=dialog]').count()) === 0);
  await ongedaanKnop(page).click();
  await wacht(page);
  const naUndo = await item(page, UID);
  ok('ongedaan na status: gepland en historie terug', naUndo.status === 'gepland' && !(naUndo.historie ?? []).length, JSON.stringify(naUndo.historie));
  // met het toetsenbord: Enter opent, de volgende status heeft focus, Enter kiest
  await page.focus(`${chipVan(UID)} [data-statusknop]`);
  await page.keyboard.press('Enter');
  await page.waitForSelector('[role=menu]');
  ok('focus op de volgende status (Bezig)', (await page.evaluate(() => document.activeElement?.textContent ?? '')).includes('Bezig'));
  await page.keyboard.press('Enter');
  await wacht(page);
  ok('status bezig met toetsenbord', (await item(page, UID)).status === 'bezig');
  ok('focus terug op statusknop', await page.evaluate(() => document.activeElement?.hasAttribute('data-statusknop')));

  // actiebalk: status en verplaatsen met knoppen
  await page.click(CHIP);
  await page.click('[data-selectiebalk] >> role=radio[name=/Risico/]');
  await wacht(page);
  ok('status risico via actiebalk', (await item(page, UID)).status === 'risico');
  await page.click('[data-selectiebalk] >> role=button[name=/Een maand later/]');
  await wacht(page);
  ok('later via actiebalk → Okt', (await item(page, UID)).maand === 'Okt');
  await page.keyboard.press('Escape');

  // slepen
  await page.dragAndDrop(CHIP, 'td[data-cel="SKA3|Dec"]');
  await wacht(page);
  ok('slepen naar Dec', (await item(page, UID)).maand === 'Dec');
  await page.dragAndDrop(CHIP, 'td[data-cel="OP1|Aug"]');
  await wacht(page);
  ok('slepen naar andere rij doet niets', (await item(page, UID)).maand === 'Dec');
  await page.keyboard.press('Escape');

  // filter "Toon"
  const telZichtbaar = () => page.locator('tbody [data-chip]').count();
  const allesAantal = await telZichtbaar();
  await page.click('[data-rondleiding="filter"] >> role=radio[name=/Met risico/]');
  const s1 = (await state(page)).schoolKalenders[SCHOOL];
  const risicoInBeeld = s1.filter((i) => i.status === 'risico' && ['Aug', 'Sep', 'Okt', 'Nov', 'Dec', 'Jan'].includes(i.maand)).length;
  ok('filter risico toont alleen risico', (await telZichtbaar()) === risicoInBeeld, `${await telZichtbaar()} vs ${risicoInBeeld}`);
  ok('melding verborgen door filter', (await page.textContent('main')).includes('verborgen door het filter'));
  await foto(page, '05-filter-risico-1440');
  await page.click('[data-rondleiding="filter"] >> role=radio[name=/Nog te doen/]');
  ok('filter nog te doen: geen gereed-chips', (await page.locator('tbody [data-chip] [data-statusknop][aria-label*=": Gereed."]').count()) === 0);
  ok('filter bewaard in localStorage', (await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).filter, PREF)) === 'te-doen');
  await page.reload();
  await page.waitForSelector('table[aria-label^="Kalendermatrix"]');
  ok('filter blijft na herladen', (await page.getAttribute('[data-rondleiding="filter"] >> role=radio[name=/Nog te doen/]', 'aria-checked')) === 'true');
  await page.click('[data-rondleiding="filter"] >> role=radio[name="Alles"]');
  ok('filter alles: alle chips terug', (await telZichtbaar()) === allesAantal);

  // toevoegen vanuit een lege cel
  const voorToevoegen = (await state(page)).schoolKalenders[SCHOOL].length;
  await page.hover('td[data-cel="SKA1|Okt"]');
  ok('plusknop verschijnt bij hover', await page.locator('td[data-cel="SKA1|Okt"] [data-celplus]').isVisible());
  await page.click('td[data-cel="SKA1|Okt"] [data-celplus]');
  const pnl = page.locator('[role=dialog]');
  await pnl.locator('[data-rondleiding="toevoegpaneel"]').waitFor();
  ok('keuzepaneel: standaard SKA1 gekozen', (await pnl.getByLabel('Standaard').inputValue()) === 'SKA1');
  ok('keuzepaneel: maand oktober gekozen', (await pnl.getByLabel('Maand').inputValue()) === 'Okt');
  ok('keuzepaneel: zoekveld heeft focus', await page.evaluate(() => document.activeElement?.getAttribute('type') === 'search'));
  await foto(page, '06-toevoegpaneel-1440');
  // alles van SKA1 staat in de demo al op de kalender: dan eigen activiteit aanbieden
  ok('keuzepaneel: alles al gepland → eigen activiteit', (await pnl.textContent()).includes('staat al op de kalender'));
  await pnl.getByLabel('Standaard').selectOption('');
  await pnl.getByLabel('Zoek een activiteit').fill('xyz-bestaat-niet');
  ok('keuzepaneel: niets gevonden', (await pnl.textContent()).includes('Niets gevonden'));
  await pnl.getByLabel('Zoek een activiteit').fill('');
  await pnl.getByRole('button', { name: 'Eigen activiteit maken' }).first().click();
  const ed = page.locator('[role=dialog]');
  await ed.getByLabel(/^Naam/).waitFor();
  ok('eigen activiteit: maand vooraf ingevuld', (await ed.getByLabel('Aanbevolen periode').inputValue()) === 'okt');
  await ed.getByLabel(/^Naam/).fill('Audit examendossiers');
  await ed.getByLabel(/^Standaard/).selectOption('OP6');
  await ed.getByLabel('Gekoppeld gesprek').selectOption('Lente');
  await ed.getByLabel('Aanbevolen periode').fill('mrt');
  await ed.getByLabel('Omschrijving').fill('Steekproef van tien dossiers.');
  await ed.getByRole('button', { name: /^Toevoegen aan/ }).click();
  await wacht(page);
  const eigen = (await state(page)).schoolKalenders[SCHOOL].find((x) => x.custom?.naam === 'Audit examendossiers');
  ok('eigen activiteit opgeslagen', eigen && eigen.maand === 'Mrt' && eigen.custom.standaard === 'OP6' && eigen.gesprek === 'Lente', JSON.stringify(eigen));
  ok('ongedaan-melding na eigen activiteit', await ongedaanKnop(page).isVisible());
  ok('periode springt naar de maand van de nieuwe activiteit', (await page.locator('td[data-cel="OP6|Mrt"]').count()) === 1);

  // toevoegen via de rij-plusknop: een activiteit die er nog niet staat (eerst SKA3-03 weghalen)
  await page.click('[role=tablist][aria-label=Maanden] >> text=Aug t/m jan');
  await page.click(CHIP);
  await page.click('[data-selectiebalk] >> role=button[name=/verwijderen/]');
  await wacht(page);
  ok('verwijderd via actiebalk', (await item(page, UID)) === null);
  ok('tombstone gezet', Object.keys((await state(page)).verwijderd).some((k) => k.includes(UID)));
  await ongedaanKnop(page).click();
  await wacht(page);
  ok('ongedaan na verwijderen: terug met tombstone weg', (await item(page, UID)) !== null && !Object.keys((await state(page)).verwijderd).some((k) => k.includes(UID)));
  await page.click(CHIP);
  await page.keyboard.press('Delete');
  await wacht(page);
  ok('Delete-toets verwijdert', (await item(page, UID)) === null);
  await page.hover('tr:has(th:has-text("SKA3"))');
  await page.click('button[aria-label="Activiteit toevoegen bij SKA3"]');
  await pnl.locator('[data-rondleiding="toevoegpaneel"]').waitFor();
  await pnl.getByLabel('Maand').selectOption('Nov');
  ok('keuzepaneel toont de weggehaalde activiteit bovenaan', ((await pnl.locator('li').first().textContent()) ?? '').includes('Scholen op de Kaart actualiseren (1)'));
  await pnl.locator('li').first().getByRole('button', { name: /toevoegen in november/ }).click();
  await wacht(page);
  const terug = (await state(page)).schoolKalenders[SCHOOL].find((x) => x.activiteitId === 'SKA3-03');
  ok('toegevoegd vanuit kalender in gekozen maand', terug?.maand === 'Nov', JSON.stringify(terug));
  ok('paneel blijft open en toont toegevoegd', (await pnl.textContent()).includes('In november'));
  await pnl.getByRole('button', { name: /weer weghalen/ }).click();
  await wacht(page);
  ok('ongedaan in het paneel', !(await state(page)).schoolKalenders[SCHOOL].some((x) => x.activiteitId === 'SKA3-03'));
  await pnl.locator('li').first().getByRole('button', { name: /toevoegen in november/ }).click();
  await wacht(page);
  await pnl.getByRole('button', { name: 'Klaar' }).click();
  ok('chip zichtbaar in SKA3|Nov', (await page.locator('td[data-cel="SKA3|Nov"] [data-chip]').count()) >= 1);
  ok('aantal items klopt', (await state(page)).schoolKalenders[SCHOOL].length === voorToevoegen + 1);
  const nieuwUid = (await state(page)).schoolKalenders[SCHOOL].find((x) => x.activiteitId === 'SKA3-03').uid;

  // periode heel jaar
  await page.click('[role=tablist][aria-label=Maanden] >> text=Heel jaar');
  ok('heel jaar toont 12 maanden', (await page.locator('thead th').count()) === 13);
  await foto(page, '07-heel-jaar-1440');
  await page.click('[role=tablist][aria-label=Maanden] >> text=Aug t/m jan');

  // detailvenster: tweede klik, twee lagen
  const NCHIP = `button[data-uid="${nieuwUid}"]`;
  await page.click(NCHIP);
  await page.click(NCHIP);
  await page.waitForSelector('[role=dialog] [data-rondleiding="detailvenster"]');
  ok('detail opent via ?item=', page.url().includes(`item=${nieuwUid}`));
  const dlg = page.locator('[role=dialog]');
  ok('laag 1: geen eigen naam/bewijs zichtbaar', !(await dlg.getByLabel('Eigen naam (optioneel)').isVisible().catch(() => false)));
  await foto(page, '08-detail-laag1-1440');
  await dlg.getByRole('radio', { name: 'Bezig' }).click();
  await dlg.getByLabel('Eigenaar').fill('Kwaliteitsmedewerker');
  await dlg.getByLabel('Deadline').fill('2026-12-15');
  await dlg.getByLabel('Maand').selectOption('Jan');
  await dlg.getByLabel('Notitie').fill('Na overleg met de teamleiders.');
  await dlg.getByRole('button', { name: /^Meer/ }).click();
  await dlg.getByLabel('Eigen naam (optioneel)').fill('Scholen op de Kaart bijwerken');
  await dlg.getByLabel('Gekoppeld gesprek').selectOption('Winter');
  ok('afwijking vraagt reden', await dlg.getByLabel(/Reden voor afwijking/).isVisible());
  ok('opslaan uit zonder reden', await dlg.getByRole('button', { name: 'Opslaan' }).isDisabled());
  await dlg.getByLabel(/Reden voor afwijking/).fill('Past beter bij de tussenevaluatie');
  await dlg.getByLabel('Naam document of verslag').fill('Verslag SodK');
  await dlg.getByLabel('Link (optioneel)').fill('https://school.sharepoint.com/sites/kwaliteit/sodk.docx');
  await dlg.getByRole('button', { name: 'Koppel', exact: true }).click();
  ok('privacyhint zichtbaar', (await dlg.textContent()).includes('Vermeld geen leerling- of andere persoonsgegevens.'));
  await foto(page, '09-detail-laag2-1440');
  await dlg.getByRole('button', { name: 'Opslaan' }).click();
  await wacht(page);
  let i = await item(page, nieuwUid);
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
  ok('ongedaan-melding na opslaan', (await page.textContent('[data-rondleiding="ongedaan"]')).includes('Wijzigingen opgeslagen'));

  // Annuleren draait alles terug (ook status en bewijs)
  await page.goto(URL + `#/kalender?item=${nieuwUid}`);
  await page.waitForSelector('[role=dialog]');
  ok('laag 2 open bij een afwijking', await dlg.getByLabel('Gekoppeld gesprek').isVisible());
  await dlg.getByRole('radio', { name: 'Risico' }).click();
  await dlg.getByRole('button', { name: /Bewijsstuk .* verwijderen/ }).click();
  await dlg.getByRole('button', { name: 'Annuleren' }).click();
  await wacht(page);
  i = await item(page, nieuwUid);
  ok('annuleren wijzigt niets', i.status === 'bezig' && i.bewijs?.length === 1);
  // sluiten met wijzigingen vraagt eerst
  await page.goto(URL + `#/kalender?item=${nieuwUid}`);
  await page.waitForSelector('[role=dialog]');
  await dlg.getByLabel('Notitie').fill('Andere notitie');
  await page.keyboard.press('Escape');
  ok('sluitvraag bij niet-opgeslagen wijzigingen', await page.isVisible('text=Je wijzigingen zijn nog niet opgeslagen.'));
  await dlg.getByRole('button', { name: 'Niet opslaan' }).click();
  ok('niet opslaan', (await item(page, nieuwUid)).notitie === 'Na overleg met de teamleiders.');

  // lijstweergave met status in de rij
  await page.click('[role=tablist][aria-label=Weergave] >> text=Lijst');
  await page.waitForSelector('#maand-Jan');
  ok('lijst toont aangepaste naam', (await page.textContent('main')).includes('Scholen op de Kaart bijwerken'));
  ok('weergave bewaard', (await page.evaluate((k) => JSON.parse(localStorage.getItem(k)).weergave, PREF)) === 'lijst');
  await page.click(`[data-lijstitem="${nieuwUid}"] [data-statusknop]`);
  await page.click('[role=menu] >> role=menuitemradio[name=/Gereed/]');
  await wacht(page);
  ok('status gereed vanuit de lijst', (await item(page, nieuwUid)).status === 'gereed');
  await foto(page, '10-lijst-1440');
  await page.click(`[data-lijstitem="${nieuwUid}"] >> text=Scholen op de Kaart bijwerken`);
  await page.waitForSelector('[role=dialog]');
  ok('lijstrij opent detail', page.url().includes(`item=${nieuwUid}`));

  // verwijderen in het detailvenster: geen extra vraag, wel ongedaan maken
  await dlg.getByRole('button', { name: 'Verwijderen', exact: true }).click();
  await wacht(page);
  ok('verwijderd vanuit detail', (await item(page, nieuwUid)) === null);
  ok('geen dialoog na verwijderen', (await page.locator('[role=dialog]').count()) === 0);
  await ongedaanKnop(page).click();
  await wacht(page);
  ok('ongedaan na verwijderen vanuit detail', (await item(page, nieuwUid))?.eigenNaam === 'Scholen op de Kaart bijwerken');
  await page.click('[role=tablist][aria-label=Weergave] >> text=Matrix');

  // niet-bestaand item
  await page.goto(URL + '#/kalender?item=bestaat-niet');
  await page.waitForSelector('text=Activiteit niet gevonden');
  ok('nette melding bij onbekend item', true);
  await page.click('[role=dialog] >> text=Sluiten');
  // item op een andere kalender
  await page.goto(URL + '#/kalender?item=s2-OP2-01');
  await page.waitForSelector('text=Activiteit staat op een andere kalender');
  ok('item van andere school herkend', (await page.textContent('[role=dialog]')).includes('College Centrum'));
  await page.click('[role=dialog] >> text=Naar College Centrum');
  await page.waitForSelector('[role=dialog] >> text=Kalender van College Centrum');
  ok('wisselt naar de juiste school', true);
  await page.keyboard.press('Escape');

  /* ---------------- Bibliotheek ---------------- */
  await naarNiveau(page, { niveau: 'school', schoolId: SCHOOL, clusterId: 'Noord' }, '#/bibliotheek');
  await page.waitForSelector('main article');
  ok('stand van de kalender zichtbaar', await page.isVisible('[data-rondleiding="bibliotheek-stand"]'));
  ok('per standaard gegroepeerd', (await page.locator('main section[aria-labelledby^="std-"]').count()) >= 10);
  ok('frequentie en rol zichtbaar', (await page.textContent('main')).includes('Jaarlijks') && (await page.textContent('main')).includes('Kwaliteitsmedewerker'));
  ok('op-kalender-badge noemt de maand', (await page.textContent('main')).includes('Op kalender, '));
  await foto(page, '11-bibliotheek-1440');
  // een verplichte activiteit weghalen, dan aanvullen
  await page.goto(URL + '#/kalender?item=s1-OP0-01');
  await page.waitForSelector('[role=dialog]');
  await dlg.getByRole('button', { name: 'Verwijderen', exact: true }).click();
  await page.goto(URL + '#/bibliotheek');
  await page.waitForSelector('main article');
  ok('ontbrekende verplichte gemeld', (await page.textContent('[data-rondleiding="bibliotheek-stand"]')).includes('18 van 19'));
  await page.click('main >> role=button[name="Verplicht en ontbreekt 1"]');
  ok('filter verplicht en ontbreekt: 1', (await page.locator('main article').count()) === 1);
  await page.click('[data-rondleiding="bibliotheek-ontbreekt"]');
  await wacht(page);
  ok('voeg alle ontbrekende verplichte toe', (await state(page)).schoolKalenders[SCHOOL].some((x) => x.activiteitId === 'OP0-01'));
  ok('daarna niets meer ontbrekend', (await page.textContent('[data-rondleiding="bibliotheek-stand"]')).includes('Alle verplichte staan erop'));
  await ongedaanKnop(page).click();
  await wacht(page);
  ok('ongedaan na aanvullen', !(await state(page)).schoolKalenders[SCHOOL].some((x) => x.activiteitId === 'OP0-01'));
  await page.click('main >> role=button[name="Alles"]');
  // één toevoegen vanaf een kaart
  await page.click('main >> role=button[name=/Nog niet op de kalender/]');
  const aantalNiet = await page.locator('main article').count();
  ok('filter niet op kalender: 1 resultaat', aantalNiet === 1, String(aantalNiet));
  await page.click('main article >> role=button[name=/toevoegen aan de kalender/]');
  await wacht(page);
  ok('toegevoegd uit bibliotheek', (await state(page)).schoolKalenders[SCHOOL].some((x) => x.activiteitId === 'OP0-01'));
  ok('ongedaan-melding in bibliotheek', await ongedaanKnop(page).isVisible());
  await page.click('main >> role=button[name="Alles"]');
  await page.fill('input[type=search]', 'OP0-01');
  await page.click('main article >> text=/Op kalender/');
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
  ok('eigen activiteit zichtbaar in bibliotheek', await page.isVisible('#eigen-kop'));

  /* ---------------- Bestuur ---------------- */
  await naarNiveau(page, { niveau: 'bestuur', schoolId: SCHOOL, clusterId: 'Noord' });
  await page.waitForSelector('table[aria-label^="Kalendermatrix"]');
  ok('bestuur: BKA-rijen', (await page.textContent('tbody')).includes('BKA1'));
  const bChip = page.locator('tbody button[data-uid]').first();
  const bUid = await bChip.getAttribute('data-uid');
  const voor = (await item(page, bUid, 'bestuur')).maand;
  await bChip.click();
  await page.keyboard.press(voor === 'Jul' ? 'ArrowLeft' : 'ArrowRight');
  await wacht(page);
  ok('bestuur: verplaatsen met toetsenbord', (await item(page, bUid, 'bestuur')).maand !== voor);
  await foto(page, '12-bestuur-matrix-1440');
  await page.goto(URL + '#/bibliotheek');
  await page.waitForSelector('main article');
  ok('bestuur: 30 activiteiten', (await page.locator('main article').count()) === 30);

  /* ---------------- Cluster (alleen-lezen) ---------------- */
  await naarNiveau(page, { niveau: 'cluster', schoolId: SCHOOL, clusterId: 'Noord' });
  await page.waitForSelector('table[aria-label^="Kalendermatrix"]');
  ok('cluster: info-balk', (await page.textContent('main')).includes('Clusterweergave is alleen-lezen'));
  ok('cluster: geen verplaatsbare chips', (await page.locator('tbody button[data-uid]').count()) === 0);
  ok('cluster: geen statusknoppen', (await page.locator('tbody [data-statusknop]').count()) === 0);
  ok('cluster: geen plusknoppen', (await page.locator('[data-celplus], [data-rondleiding="toevoegen-rij"]').count()) === 0);
  ok('cluster: geen toevoegknop', (await page.locator('[data-rondleiding="toevoegen"]').count()) === 0);
  await foto(page, '13-cluster-matrix-1440');
  await page.click('[role=tablist][aria-label=Weergave] >> text=Lijst');
  ok('cluster: lijst zonder statusknoppen', (await page.locator('main [data-statusknop]').count()) === 0);
  await page.locator('main section ul button').first().click();
  await page.waitForSelector('[role=dialog]');
  ok('cluster: detail alleen-lezen', (await page.locator('[role=dialog] input, [role=dialog] textarea, [role=dialog] select').count()) === 0);
  await foto(page, '14-cluster-detail-1440');
  await page.keyboard.press('Escape');
  await page.click('[role=tablist][aria-label=Weergave] >> text=Matrix');
  await page.goto(URL + '#/bibliotheek');
  await page.waitForSelector('main article');
  ok('cluster: bibliotheek zonder Toevoegen', (await page.locator('main article >> role=button[name=/toevoegen/]').count()) === 0);
  ok('cluster: eigen activiteit uit', await page.isDisabled('main >> role=button[name="Eigen activiteit"]'));
  ok('cluster: geen stand of aanvulknop', (await page.locator('[data-rondleiding="bibliotheek-ontbreekt"]').count()) === 0);
  await foto(page, '15-cluster-bibliotheek-1440');

  /* ---------------- Lege kalender ---------------- */
  await page.evaluate(
    ([k, ui]) => {
      const s = JSON.parse(localStorage.getItem(k));
      s.modus = 'eigen';
      s.schoolKalenders['1'] = [];
      localStorage.setItem(k, JSON.stringify(s));
      localStorage.setItem(ui, JSON.stringify({ niveau: 'school', schoolId: '1', clusterId: 'Noord' }));
    },
    [STATE, UI],
  );
  await page.goto(URL + '#/kalender');
  await page.reload();
  await page.waitForSelector('[data-rondleiding="lege-start"]');
  ok('lege start in plaats van leeg raster', (await page.locator('table[aria-label^="Kalendermatrix"]').count()) === 0);
  ok('lege start: twee keuzes', (await page.textContent('[data-rondleiding="lege-start"]')).includes('Begin met de verplichte activiteiten') &&
    (await page.textContent('[data-rondleiding="lege-start"]')).includes('Kies zelf wat je plant'));
  await foto(page, '16-lege-start-1440');
  await page.click('[data-rondleiding="verplichte-toevoegen"]');
  await page.waitForSelector('table[aria-label^="Kalendermatrix"]');
  ok('lege start: 19 verplichte toegevoegd', (await state(page)).schoolKalenders['1'].length === 19);
  await foto(page, '17-na-verplichte-1440');
  await ongedaanKnop(page).click();
  await page.waitForSelector('[data-rondleiding="lege-start"]');
  ok('lege start: ongedaan maakt weer leeg', (await state(page)).schoolKalenders['1'].length === 0);
  await page.click('[data-rondleiding="lege-start"] >> role=button[name="Activiteiten kiezen"]');
  await pnl.locator('[data-rondleiding="toevoegpaneel"]').waitFor();
  ok('lege start: keuzepaneel met 67 activiteiten', (await pnl.locator('ul[aria-label="Activiteiten om toe te voegen"] > li').count()) === 67);
  await pnl.getByLabel('Zoek een activiteit').fill('BHV');
  await pnl.locator('li').first().getByRole('button', { name: /toevoegen in/ }).click();
  await pnl.getByRole('button', { name: 'Klaar' }).click();
  await page.waitForSelector('table[aria-label^="Kalendermatrix"]');
  ok('lege start: eerste activiteit gekozen', (await state(page)).schoolKalenders['1'].length === 1);

  /* ---------------- 1280 en 390 ---------------- */
  for (const [b, h] of [
    [1280, 800],
    [390, 844],
  ]) {
    const p = await ctx.newPage();
    volg(p);
    await p.setViewportSize({ width: b, height: h });
    await p.goto(URL);
    await p.evaluate(
      ([k, ui, st, d]) => {
        localStorage.removeItem(k);
        localStorage.setItem(st, d);
        localStorage.setItem(ui, JSON.stringify({ niveau: 'school', schoolId: '1', clusterId: 'Noord' }));
      },
      [PREF, UI, STATE, demo],
    );
    await p.goto(URL + '#/kalender');
    await p.reload();
    await p.waitForSelector('main h1');
    ok(`${b}: geen horizontale paginascroll (kalender)`, await geenHorizontaleScroll(p));
    if (b === 390) ok('390: standaard lijstweergave', await p.isVisible('#maand-Sep'));
    await p.evaluate(() => window.scrollTo(0, 0));
    await foto(p, `20-kalender-${b}`);
    if (b === 390) {
      // status zetten in de lijst op een telefoon
      const r = p.locator('[data-lijstitem] [data-statusknop]').first();
      await r.click();
      await foto(p, '20b-statusmenu-390');
      await p.keyboard.press('Escape');
      await p.click('[data-rondleiding="toevoegen"]');
      await p.locator('[data-rondleiding="toevoegpaneel"]').waitFor();
      await foto(p, '20c-toevoegpaneel-390');
      ok('390: keuzepaneel past', await geenHorizontaleScroll(p));
      await p.keyboard.press('Escape');
    }
    await p.click('[role=tablist][aria-label=Weergave] >> text=Matrix');
    await p.waitForSelector('table[aria-label^="Kalendermatrix"]');
    if (b === 1280) {
      const breedte = await p.evaluate(() => document.querySelector('thead th:nth-child(2)').getBoundingClientRect().width);
      ok('1280: ruime maandkolommen', breedte >= 110, `${Math.round(breedte)}px`);
      const strook = await p.evaluate(() => {
        const f = document.querySelector('[data-rondleiding="filter"]');
        return f.scrollWidth <= f.clientWidth + 1;
      });
      ok('1280: filter past zonder afkappen', strook);
    }
    ok(`${b}: geen horizontale paginascroll (matrix)`, await geenHorizontaleScroll(p));
    await foto(p, `21-matrix-${b}`);
    const c = p.locator('tbody button[data-uid]').first();
    await c.click();
    await foto(p, `21b-actiebalk-${b}`);
    ok(`${b}: actiebalk past`, await geenHorizontaleScroll(p));
    await c.click();
    await p.waitForSelector('[role=dialog]');
    await foto(p, `22-detail-${b}`);
    await p.keyboard.press('Escape');
    await p.goto(URL + '#/bibliotheek');
    await p.waitForSelector('main article');
    ok(`${b}: geen horizontale paginascroll (bibliotheek)`, await geenHorizontaleScroll(p));
    await foto(p, `23-bibliotheek-${b}`);
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
