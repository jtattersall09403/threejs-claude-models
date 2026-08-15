// Presentation: renderer, moody Skyrim-interior lighting, orbit controls and the
// deterministic camera hook the capture tool drives.
import * as THREE from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';

function backdrop() {
  const geo = new THREE.SphereGeometry(24, 32, 24);
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    depthWrite: false,
    fog: false,
    uniforms: {},
    vertexShader: `varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
    fragmentShader: `
      varying vec3 vP;
      void main() {
        vec3 d = normalize(vP);
        float h = d.y * 0.5 + 0.5;
        vec3 top = vec3(0.010, 0.010, 0.013);
        vec3 mid = vec3(0.038, 0.031, 0.026);
        vec3 low = vec3(0.014, 0.012, 0.011);
        vec3 c = mix(low, mid, smoothstep(0.10, 0.46, h));
        c = mix(c, top, smoothstep(0.46, 0.95, h));
        // faint warm pool behind the subject
        c += vec3(0.030, 0.018, 0.008) * pow(max(0.0, d.z), 3.0) * smoothstep(0.0, 0.5, h);
        gl_FragColor = vec4(c, 1.0);
      }`,
  });
  const m = new THREE.Mesh(geo, mat);
  m.frustumCulled = false;
  return m;
}

function environmentMap(renderer) {
  // A tiny procedural equirect: warm from the front-left, cold and dark elsewhere.
  const w = 64, h = 32;
  const data = new Float32Array(w * h * 4);
  for (let y = 0; y < h; y++) {
    const theta = (y / (h - 1)) * Math.PI;
    for (let x = 0; x < w; x++) {
      const phi = (x / w) * Math.PI * 2;
      const dx = Math.sin(theta) * Math.cos(phi);
      const dy = Math.cos(theta);
      const dz = Math.sin(theta) * Math.sin(phi);
      const up = Math.max(0, dy);
      const warm = Math.pow(Math.max(0, dx * 0.6 + dz * 0.7 + 0.2), 2.2);
      const i = (y * w + x) * 4;
      data[i] = 0.030 + up * 0.045 + warm * 0.30;
      data[i + 1] = 0.030 + up * 0.048 + warm * 0.19;
      data[i + 2] = 0.038 + up * 0.062 + warm * 0.08;
      data[i + 3] = 1;
    }
  }
  const tex = new THREE.DataTexture(data, w, h, THREE.RGBAFormat, THREE.FloatType);
  tex.mapping = THREE.EquirectangularReflectionMapping;
  tex.needsUpdate = true;
  const pmrem = new THREE.PMREMGenerator(renderer);
  const env = pmrem.fromEquirectangular(tex).texture;
  pmrem.dispose();
  tex.dispose();
  return env;
}

function ground() {
  const geo = new THREE.CircleGeometry(7, 64);
  geo.rotateX(-Math.PI / 2);
  const mat = new THREE.MeshStandardMaterial({
    color: 0x14120f, roughness: 0.95, metalness: 0.0,
  });
  mat.onBeforeCompile = (shader) => {
    shader.vertexShader = shader.vertexShader.replace(
      '#include <common>', '#include <common>\nvarying vec3 vWP;',
    ).replace('#include <begin_vertex>', '#include <begin_vertex>\n vWP = position;');
    shader.fragmentShader = shader.fragmentShader.replace(
      '#include <common>', `#include <common>
      varying vec3 vWP;
      float h21(vec2 p){ p = fract(p*vec2(123.34,456.21)); p += dot(p,p+45.32); return fract(p.x*p.y); }
      float n2(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.0-2.0*f);
        return mix(mix(h21(i),h21(i+vec2(1,0)),f.x), mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x), f.y); }`,
    ).replace('#include <color_fragment>', `#include <color_fragment>
      float g = n2(vWP.xz*7.0)*0.55 + n2(vWP.xz*23.0)*0.3 + n2(vWP.xz*61.0)*0.15;
      float r = length(vWP.xz);
      diffuseColor.rgb *= 0.45 + g*1.1;
      diffuseColor.rgb *= smoothstep(6.8, 1.6, r);`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
      roughnessFactor = clamp(0.98 - g*0.22, 0.6, 1.0);`);
  };
  const m = new THREE.Mesh(geo, mat);
  m.receiveShadow = true;
  return m;
}

export function createViewer(container) {
  const renderer = new THREE.WebGLRenderer({
    antialias: true, powerPreference: 'high-performance', preserveDrawingBuffer: true,
  });
  renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
  renderer.setSize(container.clientWidth, container.clientHeight);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  container.appendChild(renderer.domElement);

  const scene = new THREE.Scene();
  scene.fog = new THREE.FogExp2(0x07070a, 0.055);
  scene.environment = environmentMap(renderer);
  scene.environmentIntensity = 0.55;
  scene.add(backdrop());
  scene.add(ground());

  const camera = new THREE.PerspectiveCamera(32, container.clientWidth / container.clientHeight, 0.05, 100);
  camera.position.set(1.5, 1.35, 3.0);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.075;
  controls.target.set(0, 1.02, 0);
  controls.minDistance = 0.4;
  controls.maxDistance = 8;
  controls.maxPolarAngle = Math.PI * 0.52;
  controls.update();

  // ---- lights ---------------------------------------------------------------
  const key = new THREE.SpotLight(0xffcf9a, 90, 14, 0.62, 0.75, 2);
  key.position.set(2.0, 3.0, 2.5);
  key.target.position.set(0, 1.15, 0);
  key.castShadow = true;
  key.shadow.mapSize.set(2048, 2048);
  key.shadow.camera.near = 0.5;
  key.shadow.camera.far = 12;
  key.shadow.bias = -0.0009;
  key.shadow.normalBias = 0.012;
  key.shadow.radius = 2.5;
  scene.add(key, key.target);

  const fill = new THREE.DirectionalLight(0x6c86ad, 0.34);
  fill.position.set(-2.8, 1.6, 1.4);
  scene.add(fill);

  const rimWarm = new THREE.DirectionalLight(0xffb173, 1.65);
  rimWarm.position.set(-1.5, 2.0, -2.8);
  scene.add(rimWarm);

  const rimCool = new THREE.DirectionalLight(0x87a6cf, 0.85);
  rimCool.position.set(2.2, 1.7, -2.4);
  scene.add(rimCool);

  const bounce = new THREE.HemisphereLight(0x2a2a33, 0x151009, 0.35);
  scene.add(bounce);

  // a small warm practical near the face, like a candle just off-frame
  const practical = new THREE.PointLight(0xff9d4a, 2.2, 3.2, 2);
  practical.position.set(0.85, 1.42, 0.95);
  scene.add(practical);

  const resize = () => {
    const w = container.clientWidth, h = container.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  };
  addEventListener('resize', resize);

  const clock = new THREE.Clock();
  const updaters = [];
  function render() {
    controls.update();
    const dt = clock.getDelta();
    for (const u of updaters) u(dt);
    renderer.render(scene, camera);
  }
  renderer.setAnimationLoop(render);

  // The capture tool pauses the rAF loop so software rasterisation isn't competing
  // with the screenshot readback.
  window.__pauseLoop = () => renderer.setAnimationLoop(null);
  window.__resumeLoop = () => renderer.setAnimationLoop(render);

  /** Deterministic framing used by tools/capture.mjs and the UI presets. */
  function setCamera(azDeg, elDeg, dist, targetY = 1.02, fov) {
    const az = (azDeg * Math.PI) / 180;
    const el = (elDeg * Math.PI) / 180;
    controls.target.set(0, targetY, 0);
    camera.position.set(
      Math.sin(az) * Math.cos(el) * dist,
      targetY + Math.sin(el) * dist,
      Math.cos(az) * Math.cos(el) * dist,
    );
    if (fov) { camera.fov = fov; camera.updateProjectionMatrix(); }
    controls.update();
    renderer.render(scene, camera);
  }

  return { renderer, scene, camera, controls, setCamera, updaters, lights: { key, fill, rimWarm, rimCool, practical } };
}
