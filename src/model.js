// Assembles the character: bakes the SDF anatomy, sweeps the hard parts and the
// clothing, auto-skins everything to the shared skeleton and returns one group.
import * as THREE from 'three';
import { polygonise } from './core/mc.js';
import { computeSkinning } from './core/skin.js';
import { MeshBuilder, scalePartAbout } from './core/geom.js';
import { createSkeleton, buildSegments } from './rig/skeleton.js';
import {
  buildBodyField, buildHeadField, transformHeadField, BODY_BOUNDS, HEAD_BOUNDS, HEAD_XF,
} from './parts/anatomy.js';
import {
  buildHorn, buildHornCuff, buildCrownSpikes, buildJawSpikes, buildTeeth, buildFingers,
  buildEyes,
} from './parts/features.js';
import {
  clothingFields, buildStrap, buildBelt, buildWristWraps, buildMedallion,
} from './parts/clothing.js';
import { createMaterials } from './materials/materials.js';
import { REGION } from './parts/regions.js';

/** Bake an SDF to a mesh part with exact gradient normals. */
function bakeField(field, bounds, cell) {
  const { field: grid, grid: g } = field.bake(bounds, cell);
  const { positions, indices } = polygonise(grid, g, 0);
  const normals = new Float32Array(positions.length);
  const tmp = [0, 0, 0];
  const h = cell * 0.42;
  for (let i = 0; i < positions.length; i += 3) {
    field.normalAt(positions[i], positions[i + 1], positions[i + 2], h, tmp);
    normals[i] = tmp[0]; normals[i + 1] = tmp[1]; normals[i + 2] = tmp[2];
  }
  return { positions, indices: Array.from(indices), normals };
}

/** Light Taubin smoothing removes marching-cubes ripple without shrinking the form. */
function smoothPositions(part, iterations = 2, lambda = 0.42, mu = -0.44) {
  const { positions, indices } = part;
  const n = positions.length / 3;
  const adj = new Array(n);
  for (let i = 0; i < n; i++) adj[i] = [];
  const seen = new Set();
  for (let i = 0; i < indices.length; i += 3) {
    for (let e = 0; e < 3; e++) {
      const a = indices[i + e], b = indices[i + ((e + 1) % 3)];
      const key = a < b ? a * 4194304 + b : b * 4194304 + a;
      if (seen.has(key)) continue;
      seen.add(key);
      adj[a].push(b); adj[b].push(a);
    }
  }
  const tmp = new Float32Array(positions.length);
  const pass = (factor) => {
    for (let i = 0; i < n; i++) {
      const nb = adj[i];
      if (!nb.length) {
        tmp[i * 3] = positions[i * 3]; tmp[i * 3 + 1] = positions[i * 3 + 1]; tmp[i * 3 + 2] = positions[i * 3 + 2];
        continue;
      }
      let sx = 0, sy = 0, sz = 0;
      for (const j of nb) { sx += positions[j * 3]; sy += positions[j * 3 + 1]; sz += positions[j * 3 + 2]; }
      sx /= nb.length; sy /= nb.length; sz /= nb.length;
      tmp[i * 3] = positions[i * 3] + factor * (sx - positions[i * 3]);
      tmp[i * 3 + 1] = positions[i * 3 + 1] + factor * (sy - positions[i * 3 + 1]);
      tmp[i * 3 + 2] = positions[i * 3 + 2] + factor * (sz - positions[i * 3 + 2]);
    }
    positions.set(tmp);
  };
  for (let it = 0; it < iterations; it++) { pass(lambda); pass(mu); }
  return part;
}

function skinnedMesh(builder, material, rig, name) {
  const geo = builder.build();
  const mesh = new THREE.SkinnedMesh(geo, material);
  mesh.name = name;
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  // geometry is authored in the same space as the bone rest poses, so the bind
  // matrix is identity; the root bone lives on the group, not on any one mesh.
  mesh.bind(rig.skeleton, new THREE.Matrix4());
  return mesh;
}

export function buildArgonian(opts = {}) {
  const log = opts.log || (() => {});
  const rig = createSkeleton();
  const segments = buildSegments(rig);
  const materials = createMaterials();
  const meshes = {};

  const skinPart = (part) => computeSkinning(part.positions, segments);

  // ---- hide -----------------------------------------------------------------
  log('baking body');
  const bodyField = buildBodyField();
  // seatField is in head-AUTHORING space; features are seated against it and then
  // pushed through the same transform as the field itself
  const seatField = buildHeadField();
  const body = smoothPositions(bakeField(bodyField, BODY_BOUNDS, 0.0062), 2);
  log('baking head');
  // region: 0 = plain keratin, 1 = the big horns (shader draws their ring banding),
  // 2 = the metal cuffs
  const headParts = [
    { geom: buildHorn(1, seatField), region: 1 },
    { geom: buildHorn(-1, seatField), region: 1 },
    { geom: buildHornCuff(1, seatField), region: 2 },
    { geom: buildHornCuff(-1, seatField), region: 2 },
    ...buildCrownSpikes(seatField).map((geom) => ({ geom, region: 0 })),
    ...buildJawSpikes(seatField).map((geom) => ({ geom, region: 0 })),
  ];
  const headField = transformHeadField(seatField);
  const head = smoothPositions(bakeField(headField, HEAD_BOUNDS, 0.0031), 1);

  const skinB = new MeshBuilder();
  skinB.add(body, skinPart(body), REGION.SKIN);
  skinB.add(head, skinPart(head), REGION.SKIN);
  for (const f of buildFingers(rig)) {
    if (f.region === 'skin') skinB.add(f.geom, skinPart(f.geom), REGION.SKIN);
  }
  meshes.skin = skinnedMesh(skinB, materials.skin, rig, 'skin');

  // ---- horns, spikes, teeth, claws --------------------------------------------
  log('horns and spikes');
  const toHead = (p) => scalePartAbout(p, HEAD_XF.scale, HEAD_XF.pivot, HEAD_XF.offset);
  const hornB = new MeshBuilder();
  for (const { geom, region } of headParts) {
    const q = toHead(geom);
    hornB.add(q, skinPart(q), region);
  }
  for (const f of buildFingers(rig)) {
    if (f.region === 'horn') hornB.add(f.geom, skinPart(f.geom), 3);  // 3 = claw
  }
  meshes.horn = skinnedMesh(hornB, materials.horn, rig, 'horn');

  // ---- eyes --------------------------------------------------------------------
  const eyeB = new MeshBuilder();
  for (const e of buildEyes()) { const q = toHead(e); eyeB.add(q, skinPart(q), REGION.EYE); }
  meshes.eye = skinnedMesh(eyeB, materials.eye, rig, 'eye');
  meshes.eye.castShadow = false;

  // ---- clothing -----------------------------------------------------------------
  log('clothing');
  const byRegion = new Map();
  const push = (region, part) => {
    if (!byRegion.has(region)) byRegion.set(region, new MeshBuilder());
    byRegion.get(region).add(part, skinPart(part), region);
  };
  const garments = clothingFields(bodyField);
  for (const g of garments) {
    push(g.region, smoothPositions(bakeField(g.field, g.bounds, g.cell), 2));
  }
  const tunicShell = (garments.find((g) => g.tunic) || {}).shell;
  push(REGION.SASH, buildStrap(tunicShell));
  push(REGION.LEATHER, buildMedallion(tunicShell));
  for (const p of buildBelt(tunicShell)) push(REGION.BELT, p);
  for (const p of buildWristWraps(rig)) push(REGION.WRAP, p);

  const matForRegion = {
    [REGION.TUNIC]: materials.tunic,
    [REGION.UNDERSHIRT]: materials.undershirt,
    [REGION.TROUSERS]: materials.trousers,
    [REGION.LEATHER]: materials.leather,
    [REGION.WRAP]: materials.wrap,
    [REGION.SASH]: materials.sash,
    [REGION.BELT]: materials.belt,
  };
  for (const [region, builder] of byRegion) {
    const key = 'cloth' + region;
    meshes[key] = skinnedMesh(builder, matForRegion[region], rig, key);
  }

  // ---- assemble -------------------------------------------------------------------
  const group = new THREE.Group();
  group.name = 'argonian';
  group.add(rig.root);
  for (const m of Object.values(meshes)) group.add(m);

  let tris = 0;
  for (const m of Object.values(meshes)) tris += m.geometry.index.count / 3;

  return { group, rig, meshes, materials, segments, stats: { triangles: tris } };
}
