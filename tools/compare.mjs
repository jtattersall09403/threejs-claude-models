// Builds side-by-side reference/render sheets so the inner loop can actually
// compare rather than remember. Reference crops are cropped to the character out of
// the full screenshots; renders come from captures/latest/.
//
//   npm run compare
//
// Writes captures/compare/*.png — read these with the Read tool.
import { chromium } from 'playwright';
import { readFileSync, mkdirSync, rmSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const REF = resolve(root, 'corpus/character');
const CAP = resolve(root, 'captures/latest');
const OUT = resolve(root, 'captures/compare');

// Reference screenshots are 2172x2352 with the character in the lower-right area.
// crop = [x, y, w, h] in source pixels, chosen to frame the head/torso.
const PAIRS = [
  {
    name: 'head_front',
    ref: 'Screenshot_20260815_080957_com_google_android_youtube_MainActivity.jpg',
    crop: [1080, 740, 620, 780],
    render: 'head_front.png',
    note: 'front — plating, brow band, eye value, muzzle width',
  },
  {
    name: 'head_q34',
    ref: 'Screenshot_20260815_081002_com_google_android_youtube_MainActivity.jpg',
    crop: [1040, 700, 700, 820],
    render: 'head_q34.png',
    note: '3/4 — horn sweep + band, socket band, jaw line',
  },
  {
    name: 'head_side',
    ref: 'face-left-profile.jpg',
    crop: [0, 0, 827, 921],   // the named refs ARE already close crops — use them whole
    render: 'head_side.png',
    note: 'profile — muzzle top line, jaw depth, occiput',
  },
  {
    name: 'head_rear34',
    ref: 'Screenshot_20260815_080949_com_google_android_youtube_MainActivity.jpg',
    crop: [1060, 700, 720, 840],
    render: 'head_rear34.png',
    note: 'rear 3/4 — horn ring, crown spikes, throat scutes',
  },
  {
    name: 'torso',
    ref: 'Screenshot_20260815_081046_com_google_android_youtube_MainActivity.jpg',
    crop: [980, 700, 900, 1000],
    render: 'torso_front.png',
    note: 'torso — tunic value + folds, sash, collar, sleeves',
  },
];

const b64 = (p) => readFileSync(p).toString('base64');

const html = `<style>
  body { margin:0; background:#111; font:12px ui-monospace,monospace; color:#bbb; }
  .row { display:flex; align-items:flex-start; gap:8px; padding:8px; }
  .col { flex:1; }
  img { width:100%; display:block; background:#000; }
  h2 { font-size:13px; margin:0 0 6px; color:#e0d8c8; font-weight:normal; }
  .lbl { padding:3px 0; color:#8a8272; }
</style>
${PAIRS.map((p) => {
  let ref = '';
  try {
    ref = `data:image/jpeg;base64,${b64(resolve(REF, p.ref))}`;
  } catch { return ''; }
  let ren = '';
  try {
    ren = `data:image/png;base64,${b64(resolve(CAP, p.render))}`;
  } catch { return ''; }
  const [x, y, w, h] = p.crop;
  return `<div id="${p.name}">
    <h2>${p.name} — ${p.note}</h2>
    <div class="row">
      <div class="col"><div class="lbl">REFERENCE</div>
        <div style="width:100%;aspect-ratio:${w}/${h};overflow:hidden;position:relative">
          <img src="${ref}" style="position:absolute;width:${(2172 / w) * 100}%;
            left:${(-x / w) * 100}%; top:${(-y / h) * 100}%; height:auto;">
        </div></div>
      <div class="col"><div class="lbl">RENDER</div><img src="${ren}"></div>
    </div>
  </div>`;
}).join('\n')}
`;

rmSync(OUT, { recursive: true, force: true });
mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch({ args: ['--disable-lcd-text'] });
const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
await page.setContent(html);
for (const p of PAIRS) {
  const el = await page.$(`#${p.name}`);
  if (!el) continue;
  await el.screenshot({ path: resolve(OUT, `${p.name}.png`), timeout: 60000 });
}
console.log(`wrote ${PAIRS.length} comparison sheets to captures/compare/`);
await browser.close();
