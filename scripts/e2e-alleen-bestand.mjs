// E2E voor "alleen in het kalenderbestand bewaren": de kalender staat dan niet in de browseropslag,
// alleen in het gekoppelde bestand. Draait tegen dist/ met een nagebootst bestand dat herladen overleeft.
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import path from 'node:path';
import fs from 'node:fs';
const require = createRequire(import.meta.url);
const { chromium } = require('playwright');

const hier = path.dirname(fileURLToPath(import.meta.url));
const UIT = path.resolve(hier, '../test-resultaten/alleen-bestand');
fs.mkdirSync(UIT, { recursive: true });
const URL = 'file://' + path.resolve(hier, '../dist/kwaliteitskalender.html');
const res = [];
const ok = (n, c, x = '') => res.push(`${c ? 'OK  ' : 'FOUT'} ${n}${x ? ' :: ' + x : ''}`);

// Nep File System Access API. Het "bestand" staat in localStorage onder een testsleutel, zodat het
// herladen overleeft. Het handvat is kloonbaar (alleen het veld __nep), zodat IndexedDB het onthoudt;
// bij teruglezen wordt het weer een werkend handvat. Toestemming is instelbaar per test.
const NEP = `
  const B = '__test_bestand', T = '__test_toestemming', S = '__test_schrijfteller';
  const lees = () => JSON.parse(localStorage.getItem(B) || '{"tekst":"","tijd":1}');
  let toegestaan = false;
  const proto = {
    kind: 'file',
    get name() { return 'test.kwaliteitskalender.json'; },
    async getFile() { const b = lees(); return new File([b.tekst], this.name, { lastModified: b.tijd }); },
    async createWritable() { let buf = ''; return { async write(t) { buf += t; }, async close() {
      localStorage.setItem(B, JSON.stringify({ tekst: buf, tijd: Date.now() }));
      localStorage.setItem(S, String(Number(localStorage.getItem(S) || 0) + 1)); } }; },
    async queryPermission() { return localStorage.getItem(T) === 'vragen' && !toegestaan ? 'prompt' : 'granted'; },
    async requestPermission() { toegestaan = true; return 'granted'; },
  };
  const maakHandle = () => Object.assign(Object.create(proto), { __nep: true });
  window.showOpenFilePicker = async () => [maakHandle()];
  window.showSaveFilePicker = async () => maakHandle();
  const d = Object.getOwnPropertyDescriptor(IDBRequest.prototype, 'result');
  Object.defineProperty(IDBRequest.prototype, 'result', { get() { const r = d.get.call(this); return r && r.__nep ? maakHandle() : r; } });
`;

const STATE = 'kwaliteitskalender:state:v5';
const bestand = (p) => p.evaluate(() => JSON.parse(JSON.parse(localStorage.getItem('__test_bestand')).tekst));
const browserKalender = (p) => p.evaluate((k) => localStorage.getItem(k), STATE);
// De bestuursnaam zoals de app hem kent: het veld op Organisatie (zonder herladen).
const naamInApp = async (p) => {
  await p.evaluate(() => (location.hash = '#/organisatie'));
  await p.waitForSelector('input[placeholder="bv. Stichting Onderwijs Regio X"]');
  return p.inputValue('input[placeholder="bv. Stichting Onderwijs Regio X"]');
};
const schrijfteller = (p) => p.evaluate(() => Number(localStorage.getItem('__test_schrijfteller') || 0));

const b = await chromium.launch();
const fouten = [];
const verzoeken = [];
const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
// De rondleiding is hier al aangeboden (zie e2e-rondleiding.mjs); bewust via een eenmalige pagina.
{
  const p0 = await ctx.newPage();
  await p0.goto(URL);
  await p0.evaluate(() => localStorage.setItem('kwaliteitskalender:rondleiding:v1', JSON.stringify({ aangeboden: true })));
  await p0.waitForTimeout(150);
  await p0.close();
}
await ctx.addInitScript(NEP);
const p = await ctx.newPage();
p.on('pageerror', (e) => fouten.push(e.message));
p.on('console', (m) => m.type() === 'error' && fouten.push(m.text()));
p.on('request', (r) => {
  if (!/^(file|data|blob):/.test(r.url())) verzoeken.push(r.url());
});
p.on('dialog', (d) => d.accept()); // beforeunload-vraag

try {
  /* ---- 1. Eigen kalender, bestand maken, instelling aanzetten ---- */
  await p.goto(URL);
  await p.click('text=Begin met mijn eigen bestuur');
  await p.fill('input[placeholder="bv. Stichting Onderwijs Regio X"]', 'Stichting Test');
  await p.click('button:has-text("Volgende")');
  await p.fill('input[placeholder="bv. Lyceum Noord"]', 'School A');
  await p.click('button:has-text("Toevoegen")');
  await p.click('button:has-text("Volgende")');
  await p.click('text=Kalender aanmaken');
  await p.waitForSelector('nav[aria-label="Hoofdmenu"]');
  ok('standaard: kalender staat in de browser', !!(await browserKalender(p)));

  await p.goto(URL + '#/gegevens');
  const knop = p.locator('button:has-text("Alleen in het kalenderbestand bewaren")');
  ok('zonder bestand is de instelling niet te kiezen', await knop.isDisabled());
  await p.click('button:has-text("Nieuw gedeeld bestand maken")');
  await p.waitForSelector('text=Gekoppeld aan test.kwaliteitskalender.json');
  await knop.click();
  await p.waitForSelector('text=Dit staat aan in deze browser');
  await p.waitForTimeout(300);
  ok('aan: geen kalender meer in de browseropslag', (await browserKalender(p)) === null);
  const meta = await p.evaluate(() => JSON.parse(localStorage.getItem('kwaliteitskalender:sync:v1')));
  ok('aan: browser onthoudt alleen de bestandsnaam van de koppeling', meta.bestandsnaam === 'test.kwaliteitskalender.json' && meta.basis === null && meta.vingerafdruk === null, JSON.stringify(meta).slice(0, 120));
  const alles = await p.evaluate(() => Object.entries(localStorage).filter(([k]) => !k.startsWith('__test')).map(([k, v]) => k + '=' + v).join('\n'));
  ok('aan: nergens in de browseropslag staat de naam van het bestuur of de school', !alles.includes('Stichting Test') && !alles.includes('School A'), alles.slice(0, 300));
  ok('aan: uitleg op het scherm', (await p.textContent('main')).includes('Niet in deze browser.'));
  await p.screenshot({ path: UIT + '/01-instelling-aan.png', fullPage: true });

  /* ---- 2. Wijzigen: gaat naar het bestand, niet naar de browser ---- */
  await p.goto(URL + '#/organisatie');
  const naam = p.locator('input[placeholder="bv. Stichting Onderwijs Regio X"]').first();
  await naam.fill('Stichting Gewijzigd');
  await naam.press('Tab');
  await p.waitForFunction(() => JSON.parse(JSON.parse(localStorage.getItem('__test_bestand')).tekst).organisatie.bestuurNaam === 'Stichting Gewijzigd', null, { timeout: 5000 }).then(() => ok('wijziging staat in het bestand', true)).catch(() => ok('wijziging staat in het bestand', false));
  ok('wijziging staat niet in de browseropslag', (await browserKalender(p)) === null);

  /* ---- 3. Herladen: de kalender komt uit het bestand, er wordt niets overschreven ---- */
  const voor = await p.evaluate(() => localStorage.getItem('__test_bestand'));
  const tellerVoor = await schrijfteller(p);
  await p.goto(URL + '#/organisatie');
  await p.reload();
  await p.waitForSelector('nav[aria-label="Hoofdmenu"]', { timeout: 8000 });
  await p.waitForTimeout(1500);
  ok('na herladen: kalender uit het bestand', (await naamInApp(p)) === 'Stichting Gewijzigd');
  ok('na herladen: bestand ongewijzigd', (await p.evaluate(() => localStorage.getItem('__test_bestand'))) === voor && (await schrijfteller(p)) === tellerVoor);
  ok('na herladen: nog steeds niets in de browseropslag', (await browserKalender(p)) === null);
  ok('na herladen: geen waarschuwing', !(await p.isVisible('text=Je wijzigingen worden nu niet bewaard')));

  /* ---- 4. Herladen terwijl de browser opnieuw toestemming wil ---- */
  await p.evaluate(() => localStorage.setItem('__test_toestemming', 'vragen'));
  await p.reload();
  await p.waitForSelector('text=Open je kalenderbestand');
  ok('toestemming nodig: openingsscherm met de bestandsnaam', (await p.textContent('body')).includes('test.kwaliteitskalender.json'));
  ok('toestemming nodig: geen kalender zichtbaar en niets geschreven', !(await p.isVisible('nav[aria-label="Hoofdmenu"]')) && (await schrijfteller(p)) === tellerVoor);
  await p.screenshot({ path: UIT + '/02-openingsscherm.png' });
  await p.click('button:has-text("Open test.kwaliteitskalender.json")');
  await p.waitForSelector('nav[aria-label="Hoofdmenu"]', { timeout: 8000 });
  ok('na toestaan: kalender geladen', (await naamInApp(p)) === 'Stichting Gewijzigd');
  ok('na toestaan: bestand niet overschreven door een lege kalender', (await bestand(p)).organisatie.bestuurNaam === 'Stichting Gewijzigd' && (await schrijfteller(p)) === tellerVoor);
  await p.evaluate(() => localStorage.removeItem('__test_toestemming'));

  /* ---- 5. Wijziging van een collega in het bestand ---- */
  await p.evaluate(() => {
    const ruw = JSON.parse(localStorage.getItem('__test_bestand'));
    const d = JSON.parse(ruw.tekst);
    d.organisatie.bestuurNaam = 'Stichting Collega';
    d.tijden.bestuurNaam = Date.now() + 5000;
    localStorage.setItem('__test_bestand', JSON.stringify({ tekst: JSON.stringify(d), tijd: Date.now() + 1 }));
  });
  await p.evaluate(() => window.dispatchEvent(new Event('focus')));
  await p.waitForFunction(() => document.querySelector('input[placeholder="bv. Stichting Onderwijs Regio X"]')?.value === 'Stichting Collega', null, { timeout: 5000 }).then(() => ok('wijziging van een collega komt binnen', true)).catch(() => ok('wijziging van een collega komt binnen', false));
  ok('ook dan niets in de browseropslag', (await browserKalender(p)) === null);

  /* ---- 6. Ontkoppelen terwijl de instelling aan staat: duidelijke waarschuwing ---- */
  await p.goto(URL + '#/gegevens');
  await p.click('button:has-text("Ontkoppelen")');
  await p.waitForSelector('text=Je wijzigingen worden nu niet bewaard');
  ok('zonder bestand: waarschuwing', true);
  await p.screenshot({ path: UIT + '/03-waarschuwing.png' });
  // herladen zonder koppeling: openingsscherm met "Kalenderbestand kiezen"
  await p.reload();
  await p.waitForSelector('text=Open je kalenderbestand');
  ok('zonder koppeling na herladen: openingsscherm', await p.isVisible('button:has-text("Kalenderbestand kiezen")'));
  await p.click('button:has-text("Kalenderbestand kiezen")');
  await p.waitForSelector('nav[aria-label="Hoofdmenu"]', { timeout: 8000 });
  ok('bestand kiezen vanaf het openingsscherm: kalender geladen', (await naamInApp(p)) === 'Stichting Collega');
  ok('daarna geen waarschuwing meer', !(await p.isVisible('text=Je wijzigingen worden nu niet bewaard')));

  /* ---- 7. Uitzetten: de kalender staat weer in de browser ---- */
  await p.goto(URL + '#/gegevens');
  await p.click('button:has-text("Weer in deze browser bewaren")');
  await p.waitForFunction((k) => !!localStorage.getItem(k), STATE, { timeout: 4000 }).then(() => ok('uit: kalender weer in de browseropslag', true)).catch(() => ok('uit: kalender weer in de browseropslag', false));
  const terug = JSON.parse(await browserKalender(p));
  ok('uit: de inhoud klopt', terug?.organisatie?.bestuurNaam === 'Stichting Collega');
  await p.reload();
  await p.waitForSelector('nav[aria-label="Hoofdmenu"]');
  ok('uit: na herladen gewoon de kalender', (await naamInApp(p)) === 'Stichting Collega');

  /* ---- 8. Openingsscherm: terug naar bewaren in de browser ---- */
  await p.goto(URL + '#/gegevens');
  await p.click('button:has-text("Alleen in het kalenderbestand bewaren")');
  await p.waitForSelector('text=Dit staat aan in deze browser');
  await p.evaluate(() => localStorage.setItem('__test_toestemming', 'vragen'));
  await p.reload();
  await p.waitForSelector('text=Open je kalenderbestand');
  await p.click('text=Een nieuwe kalender beginnen of de demo bekijken');
  await p.waitForSelector('text=Welkom bij de Kwaliteitskalender VO');
  ok('openingsscherm: nieuwe kalender beginnen leidt naar welkom', true);
  ok('en het bestand is daarbij niet aangeraakt', (await bestand(p)).organisatie.bestuurNaam === 'Stichting Collega');
} catch (e) {
  ok('script liep door', false, String(e).slice(0, 300));
  await p.screenshot({ path: UIT + '/fout.png' }).catch(() => {});
}
ok('geen paginafouten', fouten.length === 0, fouten.join(' | ').slice(0, 400));
ok('geen netwerkverzoeken', verzoeken.length === 0, verzoeken.join(','));
await b.close();
console.log(res.join('\n'));
const mis = res.filter((r) => r.startsWith('FOUT')).length;
console.log(`${res.length - mis} OK, ${mis} FOUT`);
process.exit(mis ? 1 : 0);
