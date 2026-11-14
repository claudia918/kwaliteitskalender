import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { viteSingleFile } from 'vite-plugin-singlefile';
import { renameSync, existsSync } from 'node:fs';
import { resolve } from 'node:path';

/**
 * Content-Security-Policy die elk netwerkverkeer blokkeert. Alleen inline script/style
 * (alles zit in het ene HTML-bestand) en data:/blob: voor afbeeldingen en fonts.
 * Alleen in de build: de dev-server laadt zelf losse modules.
 */
export const CSP = [
  "default-src 'none'",
  "script-src 'unsafe-inline'",
  "style-src 'unsafe-inline'",
  'img-src data: blob:',
  'font-src data:',
  "connect-src 'none'",
  "media-src 'none'",
  "object-src 'none'",
  "frame-src 'none'",
  "worker-src 'none'",
  "manifest-src 'none'",
  "base-uri 'none'",
  "form-action 'none'",
].join('; ');

function cspEnBestandsnaam(): Plugin {
  return {
    name: 'kk-csp-en-bestandsnaam',
    apply: 'build',
    transformIndexHtml: {
      order: 'pre',
      handler(html) {
        return html.replace(
          '<meta charset="UTF-8" />',
          `<meta charset="UTF-8" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
        );
      },
    },
    closeBundle() {
      const uit = resolve(__dirname, 'dist');
      const van = resolve(uit, 'index.html');
      if (existsSync(van)) renameSync(van, resolve(uit, 'kwaliteitskalender.html'));
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), viteSingleFile({ removeViteModuleLoader: true }), cspEnBestandsnaam()],
  build: {
    target: 'es2020',
    assetsInlineLimit: 100_000_000,
    cssCodeSplit: false,
    modulePreload: false,
    reportCompressedSize: false,
    chunkSizeWarningLimit: 5000,
  },
});
