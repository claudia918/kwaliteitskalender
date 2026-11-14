// Controle na `vite build`: precies één bestand, CSP aanwezig, geen externe bronnen.
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { resolve } from 'node:path';

const dist = resolve(import.meta.dirname, '..', 'dist');
const fouten = [];
const bestanden = readdirSync(dist);
if (bestanden.length !== 1 || bestanden[0] !== 'kwaliteitskalender.html') {
  fouten.push(`dist/ moet precies kwaliteitskalender.html bevatten, maar bevat: ${bestanden.join(', ')}`);
}
const pad = resolve(dist, 'kwaliteitskalender.html');
const html = readFileSync(pad, 'utf8');

if (!/<meta http-equiv="Content-Security-Policy" content="default-src 'none';[^"]*connect-src 'none'/.test(html)) {
  fouten.push('Content-Security-Policy-metatag ontbreekt of is onvolledig');
}
const verboden = [
  [/<script[^>]+\bsrc=/i, 'extern <script src>'],
  [/<link[^>]+\bhref=["']?(?!data:)[^"'>\s]+/i, '<link href> naar een bestand'],
  [/url\(\s*["']?(https?:)?\/\//i, 'CSS url() naar een externe bron'],
  [/@import\s+(url\()?["']?https?:/i, 'CSS @import van een externe bron'],
  [/fonts\.googleapis|fonts\.gstatic|cdn\.jsdelivr|unpkg\.com|cdnjs/i, 'verwijzing naar een CDN'],
  [/supabase|anthropic\.com\/v1|api\.anthropic/i, 'verwijzing naar een externe dienst'],
];
for (const [re, wat] of verboden) {
  const m = html.match(re);
  if (m) fouten.push(`${wat}: ${m[0].slice(0, 120)}`);
}

const kb = (statSync(pad).size / 1024).toFixed(0);
if (fouten.length) {
  console.error('\nBuildcontrole MISLUKT:\n - ' + fouten.join('\n - '));
  process.exit(1);
}
console.log(`\nBuildcontrole geslaagd: dist/kwaliteitskalender.html (${kb} KB), één bestand, CSP aanwezig, geen externe bronnen.`);
