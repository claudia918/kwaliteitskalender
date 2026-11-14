const { chromium } = require('playwright');
require('fs').mkdirSync(require('path').resolve(__dirname, '../../test-resultaten'), { recursive: true });
const fs = require('fs');
const URL = 'file://' + require('path').resolve(__dirname, '../../dist/kwaliteitskalender.html');
const res = []; const ok = (n, c, x='') => res.push(`${c?'OK  ':'FOUT'} ${n}${x?' :: '+x:''}`);
// nep File System Access API: één bestand in het geheugen van de pagina (window.__bestand)
const NEP = `
  window.__bestand = { naam: 'test.kwaliteitskalender.json', tekst: '', tijd: 1 };
  const maakHandle = () => ({
    kind: 'file', get name() { return window.__bestand.naam; },
    async getFile() { return new File([window.__bestand.tekst], window.__bestand.naam, { lastModified: window.__bestand.tijd }); },
    async createWritable() { let buf=''; return { async write(t){ buf += t; }, async close(){ window.__bestand.tekst = buf; window.__bestand.tijd = Date.now(); window.__schrijfteller=(window.__schrijfteller||0)+1; } }; },
    async queryPermission(){ return 'granted'; }, async requestPermission(){ return 'granted'; },
  });
  window.showOpenFilePicker = async () => [maakHandle()];
  window.showSaveFilePicker = async () => maakHandle();
`;
(async () => {
  const b = await chromium.launch();
  const fouten = [], verzoeken = [];
  // ---- 1. Handmatig (browser zonder FSA) ----
  const ctxH = await b.newContext({ viewport: { width: 1280, height: 900 }, acceptDownloads: true });
  await ctxH.addInitScript(() => { delete Window.prototype.showOpenFilePicker; delete Window.prototype.showSaveFilePicker; delete window.showOpenFilePicker; delete window.showSaveFilePicker; });
  const h = await ctxH.newPage();
  h.on('pageerror', e => fouten.push(e.message)); h.on('console', m => m.type()==='error' && fouten.push(m.text()));
  h.on('request', r => { if (!r.url().startsWith('file://') && !r.url().startsWith('data:') && !r.url().startsWith('blob:')) verzoeken.push(r.url()); });
  await h.goto(URL);
  await h.click('text=Verken eerst de demo');
  await h.goto(URL + '#/gegevens');
  ok('zonder FSA: waarschuwing', (await h.textContent('main')).includes('kan een bestand niet blijvend koppelen'));
  const [dl] = await Promise.all([h.waitForEvent('download'), h.click('button:has-text("Opslaan als bestand")')]);
  const pad = require('path').resolve(__dirname, '../../test-resultaten/download.json'); await dl.saveAs(pad);
  const inhoud = JSON.parse(fs.readFileSync(pad, 'utf8'));
  ok('download is kalenderbestand', inhoud.formaat === 'kwaliteitskalender-vo' && inhoud.versie === 5 && !('modus' in inhoud), dl.suggestedFilename());
  // demo verlaten en bestand openen vanaf welkom
  await h.click('button:has-text("Demo verlaten")'); await h.click('[role=dialog] >> text=Opnieuw beginnen');
  await h.waitForSelector('text=Welkom bij de Kwaliteitskalender VO');
  const [fc] = await Promise.all([h.waitForEvent('filechooser'), h.click('text=Gedeeld kalenderbestand openen')]);
  await fc.setFiles(pad);
  await h.waitForSelector('nav[aria-label="Hoofdmenu"]');
  const kop = await h.textContent('header');
  ok('bestand openen vanaf welkom: eigen modus (Lokaal)', kop.includes('Lokaal') && !kop.includes('Demo-data'));
  // collega wijzigt bestuursnaam + verwijdert item; samenvoegen
  const coll = JSON.parse(JSON.stringify(inhoud));
  coll.organisatie.bestuurNaam = 'Stichting Collega'; coll.tijden.bestuurNaam = Date.now() + 1000;
  const weg = coll.schoolKalenders['1'].shift(); coll.verwijderd[`item:s:1:${weg.uid}`] = Date.now() + 1000;
  fs.writeFileSync(require('path').resolve(__dirname, '../../test-resultaten/collega.json'), JSON.stringify(coll));
  await h.goto(URL + '#/gegevens');
  const [fc2] = await Promise.all([h.waitForEvent('filechooser'), h.click('button:has-text("Samenvoegen met bestand")')]);
  await fc2.setFiles(require('path').resolve(__dirname, '../../test-resultaten/collega.json'));
  await h.waitForSelector('text=Samengevoegd: 2 wijzigingen verwerkt');
  await h.click('[role=tablist][aria-label=Niveau] >> text=Bestuur');
  ok('samenvoegen: naam collega', (await h.textContent('main')).includes('Stichting Collega'));
  const n1 = await h.evaluate(() => JSON.parse(localStorage.getItem('kwaliteitskalender:state:v5')).schoolKalenders['1'].length);
  ok('samenvoegen: verwijderd item weg', n1 === 66, String(n1));
  await h.screenshot({ path: require('path').resolve(__dirname, '../../test-resultaten') + '/20-handmatig.png' });
  await ctxH.close();

  // ---- 2. Automatisch (nep-FSA) ----
  const ctx = await b.newContext({ viewport: { width: 1280, height: 900 } });
  await ctx.addInitScript(NEP);
  const p = await ctx.newPage();
  p.on('pageerror', e => fouten.push(e.message)); p.on('console', m => m.type()==='error' && fouten.push(m.text()));
  await p.goto(URL);
  await p.click('text=Begin met mijn eigen bestuur');
  await p.fill('input[placeholder="bv. Stichting Onderwijs Regio X"]', 'Stichting Test');
  await p.click('button:has-text("Volgende")');
  await p.fill('input[placeholder="bv. Lyceum Noord"]', 'School A'); await p.click('button:has-text("Toevoegen")');
  await p.click('button:has-text("Volgende")');
  await p.click('text=Kalender aanmaken');
  await p.waitForSelector('nav[aria-label="Hoofdmenu"]');
  await p.goto(URL + '#/gegevens');
  await p.click('button:has-text("Nieuw gedeeld bestand maken")');
  await p.waitForSelector('text=Gekoppeld aan test.kwaliteitskalender.json');
  let bestand = JSON.parse(await p.evaluate(() => window.__bestand.tekst));
  const schoolId = bestand.organisatie.scholen[0].id;
  ok('nieuw bestand geschreven', bestand.organisatie.bestuurNaam === 'Stichting Test' && bestand.schoolKalenders[schoolId].length === 19);
  ok('topbar toont bestandsnaam', (await p.textContent('header')).includes('test.kwaliteitskalender.json'));
  // lokale wijziging → wordt (vertraagd) weggeschreven
  await p.evaluate(() => { /* via UI-loze route: niveau wisselen verandert geen data */ });
  await p.goto(URL + '#/stijlgids'); // geen data
  // collega wijzigt item status in bestand
  await p.evaluate((sid) => { const d = JSON.parse(window.__bestand.tekst); const it = d.schoolKalenders[sid][0]; it.status='gereed'; it.gewijzigd = Date.now()+5000; d.organisatie.bestuurNaam='Stichting Test (collega)'; d.tijden.bestuurNaam=Date.now()+5000; window.__bestand.tekst = JSON.stringify(d); window.__bestand.tijd = Date.now(); }, schoolId);
  await p.evaluate(() => window.dispatchEvent(new Event('focus')));
  await p.waitForSelector('text=wijzigingen van collega’s verwerkt', { timeout: 5000 }).then(() => ok('toast bij wijzigingen collega', true)).catch(() => ok('toast bij wijzigingen collega', false));
  const lokaal = await p.evaluate(() => JSON.parse(localStorage.getItem('kwaliteitskalender:state:v5')));
  ok('wijziging collega lokaal verwerkt', lokaal.organisatie.bestuurNaam === 'Stichting Test (collega)' && lokaal.schoolKalenders[schoolId][0].status === 'gereed');
  // conflict: lokaal en extern wijzigen hetzelfde item
  await p.goto(URL + '#/organisatie');
  await p.evaluate(() => window.__schrijfteller = 0);
  // lokale wijziging via localStorage-event is lastig; gebruik bestand + lokale state via store: simuleer met bestuursnaam in beide
  await p.evaluate(() => { const d = JSON.parse(window.__bestand.tekst); d.organisatie.bestuurNaam='Naam extern'; d.tijden.bestuurNaam=Date.now()+20000; window.__bestand.tekst=JSON.stringify(d); window.__bestand.tijd=Date.now(); });
  // lokale wijziging: andere tab simuleren via storage-event
  await p.evaluate(() => { const s = JSON.parse(localStorage.getItem('kwaliteitskalender:state:v5')); s.organisatie.bestuurNaam='Naam lokaal'; s.tijden.bestuurNaam=Date.now()+10000; window.dispatchEvent(new StorageEvent('storage', { key: 'kwaliteitskalender:state:v5', newValue: JSON.stringify(s) })); });
  await p.waitForTimeout(2500);
  const conflictTekst = await p.textContent('body');
  ok('conflictmelding', conflictTekst.includes('Tegelijk gewijzigd door jou en een collega') && conflictTekst.includes('Naam van het bestuur'));
  await p.screenshot({ path: require('path').resolve(__dirname, '../../test-resultaten') + '/21-conflict.png' });
  const eind = JSON.parse(await p.evaluate(() => window.__bestand.tekst));
  ok('nieuwste wint (extern)', eind.organisatie.bestuurNaam === 'Naam extern', eind.organisatie.bestuurNaam);
  ok('geen paginafouten', fouten.length === 0, fouten.join(' | '));
  ok('geen netwerkverzoeken', verzoeken.length === 0, verzoeken.join(','));
  // CSP blokkeert fetch
  const csp = await p.evaluate(async () => { try { await fetch('https://example.com/x'); return 'toegestaan'; } catch (e) { return 'geblokkeerd'; } });
  ok('CSP blokkeert fetch', csp === 'geblokkeerd');
  await b.close();
  console.log(res.join('\n'));
})().catch(e => { console.error(e); console.log(res.join('\n')); process.exit(1); });
