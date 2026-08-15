// Bundles src/ + three.js into one self-contained HTML file (no external requests —
// Artifact pages run under a strict CSP).
import { build } from 'esbuild';
import { writeFileSync, mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');

const result = await build({
  entryPoints: [resolve(root, 'src/main.js')],
  bundle: true,
  format: 'iife',
  minify: true,
  legalComments: 'none',
  target: ['chrome110'],
  write: false,
  logLevel: 'info',
});

const js = result.outputFiles[0].text;

const html = `<title>Argonian</title>
<style>
  :root { color-scheme: dark; }
  html, body { margin: 0; height: 100%; background: #070709; }
  #app { position: fixed; inset: 0; }
  #app canvas { display: block; width: 100%; height: 100%; }
  #status, #hud {
    position: fixed; left: 50%; transform: translateX(-50%);
    font: 12px/1.6 ui-monospace, SFMono-Regular, Menlo, monospace;
    letter-spacing: .04em; color: #8d8578; pointer-events: none;
    text-shadow: 0 1px 3px #000;
  }
  #status { top: 50%; }
  #hud { bottom: 14px; opacity: .75; }
</style>
<div id="app"></div>
<div id="status">building…</div>
<div id="hud"></div>
<script>${js}</script>
`;

mkdirSync(resolve(root, 'dist'), { recursive: true });
writeFileSync(resolve(root, 'dist/argonian.html'), html);
console.log(`dist/argonian.html  ${(html.length / 1024).toFixed(0)} KB`);
