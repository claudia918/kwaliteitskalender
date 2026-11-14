// E2e-controle van Gesprekken, Compliance, Export, FAQ en Contact tegen dist/ (file://).
// Draaien: npm run build && node scripts/e2e-export.mjs
// Schermafdrukken, downloads en PDF's komen in test-resultaten/export/.
import { createRequire } from 'node:module';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { resolve } from 'node:path';

const require = createRequire(import.meta.url);
const { chromium } = require('playwright');
const XLSX = require('xlsx');

const ROOT = resolve(import.meta.dirname, '..');
const HTML = resolve(ROOT, 'dist/kwaliteitskalender.html');
const URL = 'file://' + HTML;
const UIT = resolve(ROOT, 'test-resultaten/export');
mkdirSync(UIT, { recursive: true });

const resultaten = [];
const ok = (naam, voorwaarde, extra = '') =>
  resultaten.push(`${voorwaarde ? 'OK  ' : 'FOUT'} ${naam}${extra ? ' :: ' + extra : ''}`);

const STATE = 'kwaliteitskalender:state:v5';
const UI = 'kwaliteitskalender:ui:v1';

/** Organisatie zonder activiteiten (setup voltooid, lege kalenders). */
const LEEG = {
  versie: 5,
  schooljaar: '2026/2027',
  organisatie: {
    bestuurNaam: 'Stichting Leeg',
    scholen: [
      { id: 'sch-a', naam: 'School A', type: 'havo', cluster: 'cl-1' },
      { id: 'sch-b', naam: 'School B', type: 'vmbo', cluster: 'cl-1' },
    ],
    clusters: [{ id: 'cl-1', naam: 'Cluster Een' }],
    gesprekscyclus: [
      { id: 'Herfst', naam: 'Herfst', maand: 'Nov', kleur: 'Herfst', icoon: 'blad', thema: 'Onderwijsresultaten & veiligheid', volgorde: 0 },
      { id: 'Winter', naam: 'Winter', maand: 'Feb', kleur: 'Winter', icoon: 'sneeuw', thema: 'Personeel & tussenevaluatie', volgorde: 1 },
      { id: 'Lente', naam: 'Lente', maand: 'Apr', kleur: 'Lente', icoon: 'bloem', thema: 'Financiën, formatie & leskwaliteit', volgorde: 2 },
      { id: 'Zomer', naam: 'Zomer', maand: 'Jul', kleur: 'Zomer', icoon: 'zon', thema: 'Jaarafsluiting', volgorde: 3 },
    ],
  },
  modus: 'eigen',
  setupVoltooid: true,
  bestuurItems: [],
  schoolKalenders: { 'sch-a': [], 'sch-b': [] },
  tijden: {},
  verwijderd: {},
};

/** Back-up zoals de oude app (state versie 4) die maakte: numerieke school-id's, eigen gesprek. */
const OUD_V4 = {
  versie: 4,
  schooljaar: '2025/2026',
  organisatie: {
    bestuurNaam: 'Stichting Oud',
    scholen: [
      { id: 1, naam: 'Lyceum Oud', type: 'havo/vwo', cluster: 'noord' },
      { id: 7, naam: 'VMBO Oud', type: 'vmbo', cluster: '' },
    ],
    clusters: [{ id: 'noord', naam: 'Cluster Noord', scholen: [1] }],
    gesprekscyclus: [
      { id: 'Herfst', naam: 'Herfst', maand: 'Nov', kleur: 'Herfst', icoon: 'blad', thema: 'T', volgorde: 0 },
      { id: 'g-1a2b3c4d', naam: 'Tussengesprek', maand: 'Mrt', kleur: 'Doorlopend', icoon: 'vlag', volgorde: 1 },
    ],
  },
  modus: 'eigen',
  setupVoltooid: true,
  bestuurItems: [{ uid: 'bestuur-CVB-01', activiteitId: 'CVB-01', maand: 'Okt', gesprek: 'Herfst', status: 'bezig' }],
  schoolKalenders: {
    1: [
      {
        uid: 's1-OP0-01',
        activiteitId: 'OP0-01',
        maand: 'Okt',
        gesprek: 'g-1a2b3c4d',
        status: 'gereed',
        afwijking: { reden: 'Andere planning' },
        eigenaar: 'Sectievoorzitter',
        deadline: '2025-10-15',
        bewijs: [{ id: 'b1', label: 'Verslag', url: 'https://intranet.example/verslag' }],
      },
    ],
    7: [],
  },
};

function normaliseer(s) {
  // vergelijk wat ertoe doet; tijdstempels en volgorde van sleutels doen niet mee
  const sorteer = (v) =>
    Array.isArray(v) ? v.map(sorteer) : v && typeof v === 'object' ? Object.fromEntries(Object.keys(v).sort().map((k) => [k, sorteer(v[k])])) : v;
  return JSON.stringify(sorteer({ ...s }));
}

/** PDF-paginaformaat (pt) uit de eerste /MediaBox. */
function mediaBox(pad) {
  const t = readFileSync(pad).toString('latin1');
  const m = t.match(/\/MediaBox\s*\[\s*([\d.]+)\s+([\d.]+)\s+([\d.]+)\s+([\d.]+)\s*\]/);
  const paginas = (t.match(/\/Type\s*\/Page[^s]/g) || []).length;
  return m ? { b: Math.round(+m[3] - +m[1]), h: Math.round(+m[4] - +m[2]), paginas } : null;
}

(async () => {
  const browser = await chromium.launch();
  const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1, acceptDownloads: true });
  // window.print() niet echt openen: de printweergave blijft dan staan voor page.pdf()
  await ctx.addInitScript(() => {
    window.__printTeller = 0;
    window.print = () => {
      window.__printTeller++;
    };
  });
  const verzoeken = [];
  const fouten = [];
  const volg = (p) => {
    p.on('request', (r) => {
      const u = r.url();
      if (!u.startsWith('data:') && !u.startsWith('blob:') && !u.startsWith('file://')) verzoeken.push(u);
    });
    p.on('console', (m) => {
      if (m.type() === 'error' || m.type() === 'warning') fouten.push(`${m.type()}: ${m.text()}`);
    });
    p.on('pageerror', (e) => fouten.push('pageerror: ' + e.message));
  };
  const page = await ctx.newPage();
  volg(page);

  const zetState = async (state, ui) => {
    await page.evaluate(
      ([s, u, kS, kU]) => {
        localStorage.clear();
        if (s) localStorage.setItem(kS, JSON.stringify(s));
        if (u) localStorage.setItem(kU, JSON.stringify(u));
      },
      [state, ui, STATE, UI],
    );
    await page.reload();
  };
  const zetUi = async (ui) => {
    await page.evaluate(([u, k]) => localStorage.setItem(k, JSON.stringify(u)), [ui, UI]);
  };
  const naar = async (route) => {
    await page.goto(URL + '#' + route);
    await page.reload();
    await page.waitForSelector('main h1');
  };
  const pdf = async (pad) => {
    await page.emulateMedia({ media: 'print' });
    await page.pdf({ path: pad, preferCSSPageSize: true, printBackground: true });
    await page.emulateMedia({ media: null });
  };
  const leesState = () => page.evaluate((k) => JSON.parse(localStorage.getItem(k)), STATE);

  /* ---------------- demo laden ---------------- */
  await page.goto(URL);
  await page.locator('button', { hasText: /demo/i }).first().click();
  await page.waitForSelector('nav[aria-label="Hoofdmenu"]');
  const demo = await leesState();
  ok('demo geladen', demo?.modus === 'demo' && demo.organisatie.scholen.length === 5);
  const eersteSchool = demo.organisatie.scholen[0].id;
  const eersteCluster = demo.organisatie.clusters[0].id;

  /* ---------------- schermafdrukken: alle schermen, niveaus, breedtes ---------------- */
  const schermen = ['gesprekken', 'compliance', 'export', 'faq', 'contact'];
  const niveaus = [
    { niveau: 'bestuur', schoolId: eersteSchool, clusterId: eersteCluster },
    { niveau: 'cluster', schoolId: eersteSchool, clusterId: eersteCluster },
    { niveau: 'school', schoolId: eersteSchool, clusterId: eersteCluster },
  ];
  const fotografeer = async (label) => {
    for (const breedte of [1440, 390]) {
      await page.setViewportSize({ width: breedte, height: breedte === 390 ? 844 : 900 });
      for (const n of niveaus) {
        await zetUi(n);
        for (const s of schermen) {
          if ((s === 'faq' || s === 'contact') && n.niveau !== 'school') continue; // niveau-onafhankelijk
          await naar('/' + s);
          const h1 = (await page.textContent('main h1')) ?? '';
          const breder = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
          ok(`${label} ${breedte} ${n.niveau} /${s}`, !!h1 && !breder, breder ? 'horizontale scroll' : h1);
          await page.screenshot({ path: `${UIT}/${label}-${breedte}-${n.niveau}-${s}.png`, fullPage: true });
        }
      }
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  };
  await fotografeer('demo');

  /* ---------------- Gesprekken: inhoud ---------------- */
  await zetUi(niveaus[2]);
  await naar('/gesprekken');
  await page.click('[role=tab]:has-text("Winter")');
  const gTekst = await page.textContent('main');
  ok('gesprekken school: voorbereiding', gTekst.includes('Jouw voorbereiding') && gTekst.includes('Vereiste schoolinput'));
  const link = await page.getAttribute('main a[href*="kalender?item="]', 'href');
  ok('gesprekken: link naar activiteit', !!link && /#\/kalender\?item=/.test(link), link ?? '');
  await zetUi(niveaus[0]);
  await naar('/gesprekken');
  const gB = await page.textContent('main');
  ok('gesprekken bestuur: status per school en bestuursinput', gB.includes('Status per school') && gB.includes('Bestuursinput') && gB.includes('Voorbereiding bestuur'));

  /* ---------------- Compliance ---------------- */
  await naar('/compliance');
  const cB = await page.textContent('main');
  ok('compliance bestuur: vaste standaarden per school', cB.includes('Vaste standaarden per school') && cB.includes('Gymnasium Oost'));
  ok('compliance: geen gesprek-id in afwijkingen', !/→\s*g-[0-9a-f]/.test(cB));

  /* ---------------- FAQ: geen cloudteksten ---------------- */
  await naar('/faq');
  await page.$$eval('details', (ds) => ds.forEach((d) => (d.open = true)));
  const faq = (await page.textContent('main')).toLowerCase();
  const verboden = ['inlog', 'log in', 'uitlog', 'uitnodig', 'wachtwoord', 'database', 'frankfurt', 'cloud', ' ai ', '(ai)', 'api-sleutel', 'anthropic', 'contactformulier', 'formulier', '—'];
  const gevonden = verboden.filter((w) => faq.includes(w));
  ok('faq zonder cloud/AI/formulier-teksten', gevonden.length === 0, gevonden.join(', '));
  ok('faq legt gedeeld bestand en privacy uit', faq.includes('gedeeld') && faq.includes('persoonsgegevens') && faq.includes('back-up'));
  await page.fill('input[type=search]', 'back-up');
  const nZoek = await page.locator('details').count();
  ok('faq zoeken filtert', nZoek > 0 && nZoek < 10, String(nZoek));

  /* ---------------- Contact ---------------- */
  await naar('/contact');
  ok('contact: geen formulier', (await page.locator('main form, main textarea, main input').count()) === 0);
  const hrefs = await page.$$eval('main a[href]', (as) => as.map((a) => a.getAttribute('href')));
  ok('contact: mailto en tel', hrefs.some((h) => h.startsWith('mailto:')) && hrefs.some((h) => h.startsWith('tel:')), hrefs.join(' '));
  ok('contact: geen externe links', hrefs.every((h) => /^(mailto:|tel:|#)/.test(h)));

  /* ---------------- Excel (schoolniveau en cluster) ---------------- */
  await zetUi(niveaus[2]);
  await naar('/export');
  let [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Download Excel")')]);
  let pad = `${UIT}/${dl.suggestedFilename()}`;
  await dl.saveAs(pad);
  let wb = XLSX.read(readFileSync(pad));
  const schoolItems = demo.schoolKalenders[eersteSchool].length;
  const kal = XLSX.utils.sheet_to_json(wb.Sheets.Kalender);
  ok('excel: bestandsnaam', /^kwaliteitskalender-lyceum-noord-2026-2027\.xlsx$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  ok('excel: tabbladen', wb.SheetNames.join() === 'Kalender,Compliance,Afwijkingen', wb.SheetNames.join());
  ok('excel: alle activiteiten', kal.length === schoolItems, `${kal.length}/${schoolItems}`);
  const kop = XLSX.utils.sheet_to_json(wb.Sheets.Kalender, { header: 1 })[0];
  ok('excel: kolommen', kop.join('|') === 'ID|Activiteit|Bibliotheeknaam|Standaard|Kwaliteitsgebied|Gesprek|Maand|Status|Eigenaar|Deadline|Bewijs|Verplicht|Afwijking|Notitie', kop.join('|'));
  ok('excel: statuslabels', kal.every((r) => ['Gepland', 'Bezig', 'Gereed', 'Risico'].includes(r.Status)));
  const gereedDemo = demo.schoolKalenders[eersteSchool].filter((i) => i.status === 'gereed').length;
  ok('excel: aantallen kloppen', kal.filter((r) => r.Status === 'Gereed').length === gereedDemo);
  const comp = XLSX.utils.sheet_to_json(wb.Sheets.Compliance);
  ok('excel: compliance 13 standaarden', comp.length === 13 && comp.some((r) => r.Standaard === 'OP0' && r['Vaste standaard'] === 'Ja'));
  // opties uit
  await page.click('label:has-text("Compliance-overzicht")');
  await page.click('label:has-text("Afwijkingen")');
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Download Excel")')]);
  pad = `${UIT}/zonder-opties.xlsx`;
  await dl.saveAs(pad);
  wb = XLSX.read(readFileSync(pad));
  ok('excel: opties uit = alleen Kalender', wb.SheetNames.join() === 'Kalender', wb.SheetNames.join());
  await zetUi(niveaus[1]);
  await naar('/export');
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Download Excel")')]);
  pad = `${UIT}/${dl.suggestedFilename()}`;
  await dl.saveAs(pad);
  wb = XLSX.read(readFileSync(pad));
  const kalC = XLSX.utils.sheet_to_json(wb.Sheets.Kalender);
  const clusterScholen = demo.organisatie.scholen.filter((s) => s.cluster === eersteCluster);
  const nCluster = clusterScholen.reduce((n, s) => n + demo.schoolKalenders[s.id].length, 0);
  ok('excel cluster: kolom School en alle items', kalC.length === nCluster && kalC.every((r) => clusterScholen.some((s) => s.naam === r.School)), `${kalC.length}/${nCluster}`);

  /* ---------------- Printweergaven als PDF ---------------- */
  await zetUi(niveaus[2]);
  await naar('/export');
  await page.click('button:has-text("Print / PDF")');
  await page.waitForFunction(() => window.__printTeller > 0);
  await pdf(`${UIT}/matrix-a3.pdf`);
  let mb = mediaBox(`${UIT}/matrix-a3.pdf`);
  ok('print matrix: A3 liggend', mb && mb.b === 1191 && mb.h === 842, JSON.stringify(mb));
  await page.getByLabel('Gesprek', { exact: true }).selectOption({ label: 'Winter' });
  await page.click('button:has-text("Print gespreksdossier")');
  await page.waitForSelector('[data-printweergave=dossier]', { state: 'attached' });
  await pdf(`${UIT}/dossier-a4.pdf`);
  mb = mediaBox(`${UIT}/dossier-a4.pdf`);
  ok('print dossier: A4 staand', mb && mb.b === 595 && mb.h === 842, JSON.stringify(mb));
  // clusterniveau: samengevoegde matrix
  await zetUi(niveaus[1]);
  await naar('/export');
  await pdf(`${UIT}/matrix-cluster-a3.pdf`);
  // bestuursniveau: matrix van de bestuurskalender
  await zetUi(niveaus[0]);
  await naar('/export');
  await pdf(`${UIT}/matrix-bestuur-a3.pdf`);

  /* ---------------- Back-up: downloaden, leegmaken, importeren, vergelijken ---------------- */
  await zetUi(niveaus[2]);
  await naar('/export');
  const voor = await leesState();
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Download back-up")')]);
  const backupPad = `${UIT}/${dl.suggestedFilename()}`;
  await dl.saveAs(backupPad);
  ok('back-up: bestandsnaam', /^kwaliteitskalender-backup-\d{4}-\d{2}-\d{2}\.json$/.test(dl.suggestedFilename()), dl.suggestedFilename());
  const backup = JSON.parse(readFileSync(backupPad, 'utf8'));
  ok('back-up: gelijk aan de state', normaliseer(backup) === normaliseer(voor));
  // leegmaken: lege organisatie
  await zetState(LEEG, { niveau: 'school', schoolId: 'sch-a', clusterId: 'cl-1' });
  await naar('/export');
  ok('na leegmaken: andere gegevens', (await leesState()).organisatie.bestuurNaam === 'Stichting Leeg');
  let [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('button:has-text("Back-up importeren")')]);
  await fc.setFiles(backupPad);
  await page.waitForSelector('[role=dialog]');
  const dlgTekst = await page.textContent('[role=dialog]');
  ok('import: bevestiging met bestuur en aantallen', dlgTekst.includes('Stichting Leren Verbeteren') && dlgTekst.includes('5 scholen'), dlgTekst.slice(0, 160));
  await page.screenshot({ path: `${UIT}/import-bevestiging.png` });
  await page.click('[role=dialog] button:has-text("Importeren en vervangen")');
  await page.waitForTimeout(400);
  const na = await leesState();
  ok('import: state gelijk aan back-up', normaliseer(na) === normaliseer(backup));

  /* ---------------- Oude back-up (versie 4) ---------------- */
  const oudPad = `${UIT}/oude-backup-v4.json`;
  writeFileSync(oudPad, JSON.stringify(OUD_V4, null, 2));
  [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('button:has-text("Back-up importeren")')]);
  await fc.setFiles(oudPad);
  await page.waitForSelector('[role=dialog]');
  ok('oude back-up: melding vorige versie', (await page.textContent('[role=dialog]')).includes('vorige versie'));
  await page.click('[role=dialog] button:has-text("Importeren en vervangen")');
  await page.waitForTimeout(400);
  const oud = await leesState();
  ok(
    'oude back-up: gemigreerd naar v5',
    oud.versie === 5 && oud.organisatie.bestuurNaam === 'Stichting Oud' && oud.schoolKalenders['1']?.[0]?.eigenaar === 'Sectievoorzitter' && oud.organisatie.scholen[0].id === '1',
  );
  await zetUi({ niveau: 'school', schoolId: '1', clusterId: 'noord' });
  await naar('/compliance');
  const cOud = await page.textContent('main');
  ok('oude back-up: eigen gesprek als naam in afwijkingen', cOud.includes('Tussengesprek') && !cOud.includes('g-1a2b3c4d'));
  await page.screenshot({ path: `${UIT}/oud-compliance.png`, fullPage: true });
  await naar('/export');
  await page.getByLabel('Gesprek', { exact: true }).selectOption({ label: 'Tussengesprek' });
  await page.click('button:has-text("Print gespreksdossier")');
  await page.waitForSelector('[data-printweergave=dossier]', { state: 'attached' });
  const dossierTekst = await page.textContent('[data-printweergave=dossier]');
  ok(
    'dossier oude back-up: eigenaar, bewijs, afwijking en signalen',
    ['Sectievoorzitter', 'Verslag', 'Andere planning', 'Signalen voor het gesprek', '15-10-2025'].every((t) => dossierTekst.includes(t)),
  );
  await pdf(`${UIT}/dossier-oud-a4.pdf`);

  /* ---------------- Foute bestanden en een kalenderbestand ---------------- */
  await naar('/export');
  const foutPad = `${UIT}/geen-json.json`;
  writeFileSync(foutPad, 'dit is geen json');
  [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('button:has-text("Back-up importeren")')]);
  await fc.setFiles(foutPad);
  await page.waitForSelector('text=Dit is geen geldig JSON-bestand');
  ok('import: foutmelding geen JSON', true);
  const kalPad = `${UIT}/test.kwaliteitskalender.json`;
  writeFileSync(kalPad, JSON.stringify({ formaat: 'kwaliteitskalender-vo', versie: 5, opgeslagenOp: new Date().toISOString(), ...LEEG }));
  [fc] = await Promise.all([page.waitForEvent('filechooser'), page.click('button:has-text("Back-up importeren")')]);
  await fc.setFiles(kalPad);
  await page.waitForSelector('[role=dialog]');
  ok('import kalenderbestand: verwijst naar Gegevens & delen', (await page.textContent('[role=dialog]')).includes('Gegevens & delen'));
  await page.click('[role=dialog] button:has-text("Naar Gegevens")');
  await page.waitForTimeout(300);
  ok('import kalenderbestand: naar /gegevens, niets vervangen', page.url().endsWith('#/gegevens') && (await leesState()).organisatie.bestuurNaam === 'Stichting Oud');

  /* ---------------- Lege kalender ---------------- */
  await zetState(LEEG, { niveau: 'school', schoolId: 'sch-a', clusterId: 'cl-1' });
  await fotografeer('leeg');
  await zetUi({ niveau: 'school', schoolId: 'sch-a', clusterId: 'cl-1' });
  await naar('/export');
  [dl] = await Promise.all([page.waitForEvent('download'), page.click('button:has-text("Download Excel")')]);
  pad = `${UIT}/leeg.xlsx`;
  await dl.saveAs(pad);
  wb = XLSX.read(readFileSync(pad));
  const kopLeeg = XLSX.utils.sheet_to_json(wb.Sheets.Kalender, { header: 1 });
  ok('excel leeg: alleen kolomkoppen', kopLeeg.length === 1 && kopLeeg[0][0] === 'ID');
  await page.click('button:has-text("Print gespreksdossier")');
  await pdf(`${UIT}/dossier-leeg-a4.pdf`);
  // geen gesprekken
  await zetState({ ...LEEG, organisatie: { ...LEEG.organisatie, gesprekscyclus: [] } }, { niveau: 'school', schoolId: 'sch-a', clusterId: 'cl-1' });
  await naar('/gesprekken');
  ok('gesprekken zonder cyclus: lege toestand', (await page.textContent('main')).includes('Geen gesprekken ingesteld'));
  await page.screenshot({ path: `${UIT}/leeg-geen-cyclus-gesprekken.png` });
  await naar('/export');
  await page.screenshot({ path: `${UIT}/leeg-geen-cyclus-export.png`, fullPage: true });

  ok('geen netwerkverzoeken', verzoeken.length === 0, verzoeken.join(', '));
  ok('geen console-fouten', fouten.length === 0, fouten.join(' | '));
  await browser.close();
  console.log(resultaten.join('\n'));
  const nFout = resultaten.filter((r) => r.startsWith('FOUT')).length;
  console.log(`\n${resultaten.length - nFout} OK, ${nFout} FOUT`);
  process.exit(nFout ? 1 : 0);
})().catch((e) => {
  console.error(e);
  console.log(resultaten.join('\n'));
  process.exit(1);
});
