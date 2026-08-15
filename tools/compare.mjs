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
// The five NAMED references are already cropped by the user to the thing their
// filename describes, so they need NO crop here — omit `crop` and they render whole.
// `crop` is only for the original 2172px screenshots, where the character is a small
// part of a wide frame.
const PAIRS = [
  {
    name: 'head_front',
    ref: 'close-crop-face-front-slight-right-profile.jpg',
    render: 'head_front.png',
    note: 'front — facial markings, brow band, eye and orange rim, muzzle width',
  },
  {
    name: 'head_q34',
    ref: 'face-neck-jawline-right-profile.jpg',
    render: 'head_q34.png',
    note: '3/4 — jawline and spikes, cheekbone, neck, horn sweep',
  },
  {
    name: 'head_side',
    ref: 'face-left-profile.jpg',
    render: 'head_side.png',
    note: 'PROFILE — forehead-to-snout curve, snout depth, jaw spikes, neck',
  },
  {
    name: 'head_jawline',
    ref: 'face-neck-jawline-closeup.jpg',
    render: 'head_low.png',
    note: 'jawline close — spike count/size/placement, neck, clavicle',
  },
  {
    name: 'bust',
    ref: 'face-front-and-bust-proportions.jpg',
    render: 'bust.png',
    note: 'bust — head-to-shoulder proportion, shoulder width and slope, stance',
  },
  {
    name: 'body',
    ref: 'Screenshot_20260815_081046_com_google_android_youtube_MainActivity.jpg',
    crop: [980, 700, 900, 1000],
    render: 'full_front.png',
    note: 'full body — garment layers, sash, belt, overall silhouette',
  },
];

/** JPEG intrinsic size, so crop zoom factors are never hard-coded to one source. */
function jpegSize(file) {
  const d = readFileSync(file);
  let i = 2;
  while (i < d.length) {
    if (d[i] !== 0xFF) { i++; continue; }
    const m = d[i + 1];
    if (m >= 0xC0 && m <= 0xCF && m !== 0xC4 && m !== 0xC8 && m !== 0xCC) {
      return { h: d.readUInt16BE(i + 5), w: d.readUInt16BE(i + 7) };
    }
    i += 2 + d.readUInt16BE(i + 2);
  }
  return { w: 2172, h: 2352 };
}

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
  // No crop => show the reference whole. The zoom factor MUST use the real source
  // width; it was hard-coded to 2172 (the original screenshots'), which scaled an
  // 827px named reference to 263% and framed the wall behind the character.
  let refBlock;
  if (p.crop) {
    const [x, y, w, h] = p.crop;
    const sw = jpegSize(resolve(REF, p.ref)).w;
    refBlock = `<div style="width:100%;aspect-ratio:${w}/${h};overflow:hidden;position:relative">
          <img src="${ref}" style="position:absolute;width:${(sw / w) * 100}%;
            left:${(-x / w) * 100}%; top:${(-y / h) * 100}%; height:auto;">
        </div>`;
  } else {
    refBlock = `<img src="${ref}">`;
  }
  return `<div id="${p.name}">
    <h2>${p.name} — ${p.note}</h2>
    <div class="row">
      <div class="col"><div class="lbl">REFERENCE</div>${refBlock}</div>
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
