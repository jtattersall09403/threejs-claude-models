// Headless orbit "motion capture": drives the artifact's camera hook and writes a
// flip-book of frames plus detail close-ups. Fails loudly on any page error.
import { chromium } from 'playwright';
import { rmSync, mkdirSync, existsSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const outDir = resolve(root, 'captures/latest');
const page = resolve(root, 'dist/argonian.html');

if (!existsSync(page)) {
  console.error('dist/argonian.html missing — run `npm run build` first');
  process.exit(1);
}

// [name, azimuth°, elevation°, distance, targetY, fov]
const ORBIT_STEPS = 12;
const SHOTS = [];
for (let i = 0; i < ORBIT_STEPS; i++) {
  const az = (i / ORBIT_STEPS) * 360;
  SHOTS.push([`orbit_${String(i).padStart(2, '0')}_az${Math.round(az)}`, az, 6, 3.05, 1.02, 32]);
}
SHOTS.push(
  ['head_front', 0, 2, 0.60, 1.638, 26],
  ['head_q34', 35, 4, 0.60, 1.638, 26],
  ['head_side', 88, 2, 0.62, 1.638, 26],
  ['head_rear34', 145, 8, 0.62, 1.640, 26],
  ['head_low', 10, -14, 0.62, 1.630, 26],
  ['head_top', 20, 46, 0.62, 1.660, 26],
  ['torso_front', 8, 4, 1.55, 1.28, 30],
  ['hands', 40, -6, 0.85, 0.83, 30],
  ['feet', 25, 8, 1.0, 0.30, 30],
  ['tail', 205, 6, 1.5, 0.80, 32],
  ['full_front', 0, 3, 3.05, 1.02, 32],
  ['full_side', 90, 3, 3.05, 1.02, 32],
);

const browser = await chromium.launch({
  executablePath: process.env.CHROMIUM_PATH || undefined,
  args: ['--use-gl=angle', '--use-angle=swiftshader', '--enable-unsafe-swiftshader',
         '--disable-lcd-text', '--force-device-scale-factor=1'],
});
const ctx = await browser.newContext({ viewport: { width: 820, height: 1080 }, deviceScaleFactor: 1 });
const tab = await ctx.newPage();
const consoleErrors = [];
tab.on('console', (m) => { if (m.type() === 'error') consoleErrors.push(m.text()); });
tab.on('pageerror', (e) => consoleErrors.push(String(e)));

await tab.goto(pathToFileURL(page).href);
await tab.waitForFunction('window.__ready === true', null, { timeout: 180000 });

const pageErrors = await tab.evaluate('window.__errors');
if (pageErrors.length || consoleErrors.length) {
  console.error('PAGE ERRORS:\n' + [...pageErrors, ...consoleErrors].join('\n'));
  await browser.close();
  process.exit(1);
}

// Winding/solidity audit: catches the inverted-triangle bug that makes surfaces
// look see-through instead of solid.
const audit = await tab.evaluate('window.__meshAudit()');
const bad = audit.filter((m) => m.agree < 0.9 || m.doubleSided);
for (const m of audit) {
  console.log(`  ${m.name.padEnd(9)} vol=${m.volume.toFixed(5)} outwardFaces=${(m.agree * 100).toFixed(1)}%`);
}
if (bad.length) {
  console.error('MESH AUDIT FAILED (inverted winding / non-opaque):\n' +
    bad.map((m) => `  ${m.name}: outwardFaces=${(m.agree * 100).toFixed(1)}% doubleSided=${m.doubleSided}`).join('\n'));
  await browser.close();
  process.exit(1);
}

await tab.evaluate('window.__pauseLoop()');
const info = await tab.evaluate('document.getElementById("hud").textContent');
console.log(info);

rmSync(outDir, { recursive: true, force: true });
mkdirSync(outDir, { recursive: true });

for (const [name, az, el, dist, ty, fov] of SHOTS) {
  await tab.evaluate(([a, e, d, t, f]) => window.__setCamera(a, e, d, t, f), [az, el, dist, ty, fov]);
  await tab.screenshot({ path: resolve(outDir, `${name}.png`), timeout: 180000 });
}

console.log(`wrote ${SHOTS.length} frames to captures/latest/`);
await browser.close();
