// Silhouette metrology for the RENDER (clean dark background, so the subject can be
// separated automatically). Proportion arguments — "the head reads small", "the figure
// is pear-shaped" — are exactly the kind that eyeballing gets wrong by 20%, and 20% is
// the difference between a likeness and a near-miss.
//
//   npm run silhouette                      # captures/latest/full_front.png
//   npm run silhouette -- captures/latest/full_side.png
//
// Prints the bounding box, then the silhouette width at a ladder of heights expressed
// as a fraction of total figure height, in metres (using the known 1.85 m figure).
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const file = process.argv[2] || 'captures/latest/full_front.png';

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 400, height: 300 } });
const src = `data:image/png;base64,${readFileSync(resolve(root, file)).toString('base64')}`;

const out = await page.evaluate(async (src) => {
  const img = new Image();
  img.src = src;
  await img.decode();
  const c = document.createElement('canvas');
  c.width = img.naturalWidth; c.height = img.naturalHeight;
  const g = c.getContext('2d', { willReadFrequently: true });
  g.drawImage(img, 0, 0);
  const d = g.getImageData(0, 0, c.width, c.height).data;
  const lum = (x, y) => {
    const i = (y * c.width + x) * 4;
    return d[i] * 0.3 + d[i + 1] * 0.6 + d[i + 2] * 0.1;
  };
  // The background is a vertical gradient plus a floor plane, both horizontally flat,
  // so the far-left column of each row IS that row's background value.
  const rows = [];
  for (let y = 0; y < c.height; y++) {
    const bg = (lum(2, y) + lum(6, y) + lum(c.width - 3, y)) / 3;
    let lo = -1, hi = -1;
    for (let x = 0; x < c.width; x++) {
      if (Math.abs(lum(x, y) - bg) > 10) { if (lo < 0) lo = x; hi = x; }
    }
    rows.push([lo, hi]);
  }
  // The cast shadow on the floor also differs from the background; the subject is the
  // topmost connected run, so walk down from the top and stop where the run jumps.
  let top = rows.findIndex((r) => r[0] >= 0);
  return { rows, top, w: c.width, h: c.height };
}, src);

await browser.close();

const { rows, top } = out;
let bottom = rows.length - 1;
while (bottom > top && rows[bottom][0] < 0) bottom--;
const H = bottom - top;

console.log(`${file}   subject rows ${top}..${bottom}  (${H} px tall)`);
console.log(`assuming a 1.85 m figure: 1 px = ${(1.85 / H * 1000).toFixed(2)} mm\n`);
console.log(' frac   y_m    px width   metres   x-centre');
for (let i = 0; i <= 20; i++) {
  const frac = i / 20;
  const y = Math.round(bottom - frac * H);
  const [lo, hi] = rows[y];
  if (lo < 0) continue;
  const m = ((hi - lo) / H) * 1.85;
  console.log(`  ${frac.toFixed(2)}  ${(frac * 1.85).toFixed(3)}   ${String(hi - lo).padStart(4)}    ${m.toFixed(3)}   ${((lo + hi) / 2).toFixed(0)}`);
}
