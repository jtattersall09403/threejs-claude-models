// One ad-hoc framing, for zooming in on a specific defect.
//   npm run shot -- <name> <az> <el> <dist> <targetY> [fov] [width] [height]
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const [name, az, el, dist, ty, fov = 30, w = 900, h = 1100] = process.argv.slice(2);
if (!name) {
  console.error('usage: npm run shot -- <name> <az> <el> <dist> <targetY> [fov] [w] [h]');
  process.exit(1);
}

const browser = await chromium.launch({
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader'],
});
const ctx = await browser.newContext({ viewport: { width: +w, height: +h }, deviceScaleFactor: +(process.env.DPR || 1) });
const tab = await ctx.newPage();
await tab.goto(pathToFileURL(resolve(root, 'dist/argonian.html')).href);
await tab.waitForFunction('window.__ready === true', null, { timeout: 180000 });
// DEBUG=5 npm run shot -- ... renders a mask channel instead of the beauty pass.
// See the uDebug block in materials.js; mode 5 (head-space Y, banded) is the fastest
// way to find out where a mask threshold actually lands.
if (process.env.DEBUG) await tab.evaluate((k) => window.argonian.debugMasks(k), +process.env.DEBUG);
await tab.evaluate(([a, e, d, t, f]) => window.__setCamera(a, e, d, t, f),
  [+az, +el, +dist, +ty, +fov]);
await tab.waitForTimeout(80);
const out = resolve(root, 'captures/adhoc');
mkdirSync(out, { recursive: true });
await tab.screenshot({ path: resolve(out, `${name}.png`), timeout: 180000 });
console.log(`captures/adhoc/${name}.png`);
await browser.close();
