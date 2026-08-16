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
  SHOTS.push([`orbit_${String(i).padStart(2, '0')}_az${Math.round(az)}`, az, 5, 3.95, 0.92, 32]);
}
SHOTS.push(
  // pulled back and raised: at 0.92 m the horn tips fell outside the frame, so the
  // one thing these shots exist to judge — the head's silhouette — was cropped away
  ['head_front', 0, 4, 1.32, 1.676, 30],
  ['head_q34', 35, 5, 1.34, 1.676, 30],
  ['head_side', 88, 4, 1.40, 1.676, 30],
  ['head_rear34', 145, 8, 0.96, 1.678, 30],
  ['head_low', 10, -16, 0.94, 1.660, 30],
  ['head_top', 20, 46, 0.96, 1.700, 30],
  ['torso_front', 8, 2, 2.05, 1.30, 30],
  // head AND shoulders together, framed like face-front-and-bust-proportions.jpg. The
  // bust comparison exists to judge head-to-shoulder proportion, so a framing that
  // crops the head out of it answers nothing.
  ['bust', 6, 3, 1.35, 1.575, 30],
// Re-aimed after the arms were returned to hanging at the sides: at target y 0.86 from
  // az 48 this shot was full of coat with the hand at the frame edge. Judge the framing
  // before judging the model.
  ['hands', 62, -8, 0.90, 0.775, 32],
  ['feet', 25, 10, 1.15, 0.28, 30],
// The tail leaves the hips going BACK and DOWN to about y 0.2; framed at y 0.78 from
  // 1.75 m the shot was filled with the coat's back and the tail was out of frame
  // entirely — the one thing it exists to show.
  ['tail', 218, 10, 1.55, 0.52, 34],
  ['full_front', 0, 3, 3.95, 0.92, 32],
  ['full_side', 90, 3, 3.95, 0.92, 32],
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
// GARMENTS are legitimately double-sided (see the note on clothMat in materials.js):
// cloth has two faces, and the garment bakes produce thin near-coincident sheets whose
// orientation marching cubes cannot be relied on to get right. The SKIN, HORN and EYE
// meshes must stay single-sided, because double-siding them would hide exactly the
// inverted-winding failure this audit exists to catch (trap 1).
const SOLID = new Set(['skin', 'horn', 'eye']);
const bad = audit.filter((m) => m.agree < 0.9 || (m.doubleSided && SOLID.has(m.name)));
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

const framingProblems = [];
for (const [name, az, el, dist, ty, fov] of SHOTS) {
  await tab.evaluate(([a, e, d, t, f]) => window.__setCamera(a, e, d, t, f), [az, el, dist, ty, fov]);
  if (name.startsWith('orbit') || name.startsWith('full')) {
    const fs = await tab.evaluate('window.__frameStats()');
    if (fs.fillH > 0.98 || fs.fillH < 0.45 || fs.bottom < 0.0 || fs.top > 1.0) {
      framingProblems.push(`${name}: fills ${(fs.fillH * 100).toFixed(0)}% of frame, ` +
        `y ${fs.bottom.toFixed(2)}..${fs.top.toFixed(2)} (want inside 0..1)`);
    }
  }
  await tab.screenshot({ path: resolve(outDir, `${name}.png`), timeout: 180000 });
}
if (framingProblems.length) {
  console.error('FRAMING PROBLEMS — the full-body shots do not contain the subject:\n  ' +
    framingProblems.join('\n  '));
  await browser.close();
  process.exit(1);
}

console.log(`wrote ${SHOTS.length} frames to captures/latest/`);
await browser.close();
