// Samples matched points on a reference crop and on a render, normalises both to a
// common anchor so exposure cancels, and prints the ratio. Eyeballing "too bright"
// is unreliable; this turns it into "2.2x too bright" and lets convergence be checked.
//
//   npm run measure
import { chromium } from 'playwright';
import { readFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const b64 = (p) => readFileSync(p).toString('base64');

// Sample points as fractions of each image's width/height, so the two can be framed
// differently. `anchor` is the point everything is normalised against.
const SETS = [
  {
    name: 'head (front)',
    ref: {
      file: 'corpus/character/Screenshot_20260815_080957_com_google_android_youtube_MainActivity.jpg',
      mime: 'image/jpeg',
      // the reference head occupies roughly x 0.50-0.78, y 0.31-0.64 of the frame
      pts: {
        crown_black: [0.635, 0.345], cranium_plate: [0.628, 0.375],
        brow_maroon: [0.600, 0.392], muzzle_top: [0.634, 0.470],
        muzzle_side: [0.596, 0.470], chin: [0.632, 0.560],
        throat: [0.630, 0.610], horn_bone: [0.560, 0.330],
      },
    },
    render: {
      file: 'captures/latest/head_front.png',
      mime: 'image/png',
      pts: {
        crown_black: [0.500, 0.330], cranium_plate: [0.500, 0.370],
        brow_maroon: [0.440, 0.392], muzzle_top: [0.500, 0.470],
        muzzle_side: [0.420, 0.478], chin: [0.500, 0.585],
        throat: [0.500, 0.650], horn_bone: [0.378, 0.268],
      },
    },
    anchor: 'muzzle_top',
  },
];

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 700 } });

/**
 * Writes captures/compare/_measure_points.png showing exactly where each sample
 * lands on both images. ALWAYS look at this before trusting the numbers — a sample
 * on the wrong feature produces confident nonsense.
 */
async function annotate(set) {
  const refSrc = `data:${set.ref.mime};base64,${b64(resolve(root, set.ref.file))}`;
  const renSrc = `data:${set.render.mime};base64,${b64(resolve(root, set.render.file))}`;
  const html = [refSrc, renSrc].map((src, i) => {
    const spec = i === 0 ? set.ref : set.render;
    const dots = Object.entries(spec.pts).map(([n, [x, y]]) =>
      `<div style="position:absolute;left:${x * 100}%;top:${y * 100}%;width:9px;height:9px;
        margin:-5px 0 0 -5px;border:2px solid #0f0;border-radius:50%"></div>
       <div style="position:absolute;left:${x * 100}%;top:${y * 100}%;margin:6px 0 0 8px;
        color:#0f0;font:9px monospace;text-shadow:0 0 3px #000">${n}</div>`).join('');
    return `<div style="position:relative;flex:1"><img src="${src}" style="width:100%;display:block">${dots}</div>`;
  }).join('');
  await page.setContent(`<body style="margin:0;background:#111;display:flex;gap:6px">${html}</body>`);
  await page.screenshot({ path: resolve(root, 'captures/compare/_measure_points.png'), fullPage: true });
}

async function sample(spec) {
  const src = `data:${spec.mime};base64,${b64(resolve(root, spec.file))}`;
  return page.evaluate(async ([src, pts]) => {
    const img = new Image();
    img.src = src;
    await img.decode();
    const c = document.createElement('canvas');
    c.width = img.naturalWidth; c.height = img.naturalHeight;
    const g = c.getContext('2d', { willReadFrequently: true });
    g.drawImage(img, 0, 0);
    const out = {};
    for (const [name, [fx, fy]] of Object.entries(pts)) {
      const x = Math.round(fx * c.width), y = Math.round(fy * c.height);
      const d = g.getImageData(x - 3, y - 3, 7, 7).data;
      let r = 0, gg = 0, b = 0;
      for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; b += d[i + 2]; }
      const n = d.length / 4;
      out[name] = [r / n, gg / n, b / n];
    }
    return out;
  }, [src, spec.pts]);
}

const lum = (c) => 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2];
const hue = (c) => {
  const [r, g, b] = c.map((v) => v / 255);
  const mx = Math.max(r, g, b), mn = Math.min(r, g, b), d = mx - mn;
  if (d < 1e-6) return 0;
  let h = mx === r ? ((g - b) / d) % 6 : mx === g ? (b - r) / d + 2 : (r - g) / d + 4;
  return Math.round(((h * 60) + 360) % 360);
};

for (const set of SETS) {
  await annotate(set);
  const ref = await sample(set.ref);
  const ren = await sample(set.render);
  const rA = lum(ref[set.anchor]), nA = lum(ren[set.anchor]);
  console.log(`\n${set.name}  (normalised to ${set.anchor})`);
  console.log('point           refN   renN   ratio   refHue renHue');
  for (const k of Object.keys(set.ref.pts)) {
    const a = lum(ref[k]) / rA, b = lum(ren[k]) / nA;
    const flag = Math.abs(b / a - 1) > 0.35 ? '  <-- off' : '';
    console.log(
      `${k.padEnd(15)} ${a.toFixed(2).padStart(5)} ${b.toFixed(2).padStart(6)} ` +
      `${(b / a).toFixed(2).padStart(6)}   ${String(hue(ref[k])).padStart(5)} ${String(hue(ren[k])).padStart(6)}${flag}`,
    );
  }
}
await browser.close();
