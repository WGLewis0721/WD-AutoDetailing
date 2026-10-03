import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { toCreasedNormals } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { LoopSubdivision } from 'three-subdivide';
import { modelLength, type ModelKey } from './vehicles';

/* Vehicle meshes are Higgsfield image-to-3D models stored in /models/<key>.glb with a studio render <key>.webp as fallback. */
const modelBase = (): string => {
  const u = import.meta.url;
  return u.includes('/_astro/') ? u.replace(/_astro\/[^/]*$/, '') : new URL('/', u).href;
};
const BASE = modelBase();
const glbUrl = (k: ModelKey) => `${BASE}models/${k}.glb`;
const imgUrl = (k: ModelKey) => `${BASE}models/${k}.webp`;

/* Scene units per metre. Every mesh is scaled to its real length, so a 3-row SUV is visibly bigger than a crossover. */
const UNITS_PER_METRE = 0.86;


export interface Viewer { setModel(key: ModelKey | null): void; draw(): void; destroy(): void }
export interface ViewerOptions { spin?: boolean; auto?: boolean; yaw?: number; turntable?: boolean; onReady?: (key: ModelKey) => void }

export function createViewer(host: HTMLElement, opts: ViewerOptions = {}): Viewer {
  const { spin = true, auto = true, turntable = true } = opts;
  const fallback = document.createElement('img');
  fallback.className = 'vfallback';
  fallback.alt = '';
  fallback.hidden = true;
  host.appendChild(fallback);

  let renderer: THREE.WebGLRenderer | null = null;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true, preserveDrawingBuffer: !spin }); } catch { renderer = null; }
  if (!renderer) {
    return { setModel(key) { fallback.hidden = !key; if (key) fallback.src = imgUrl(key); }, draw() { /* no WebGL */ }, destroy() { fallback.remove(); } };
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.className = 'vcanvas';

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  /* Paint reflects the driveway and house: the stage photo doubles as the environment map. */
  new THREE.TextureLoader().load(`${BASE}models/driveway-env.jpg`, (tex) => {
    tex.mapping = THREE.EquirectangularReflectionMapping;
    tex.colorSpace = THREE.SRGBColorSpace;
    scene.environment = pmrem.fromEquirectangular(tex).texture;
    tex.dispose();
  });
  const sun = new THREE.DirectionalLight(0xffd9a8, 2.2);
  sun.position.set(-5, 4, 4);
  scene.add(sun);
  scene.add(new THREE.HemisphereLight(0xfff1dc, 0x8a7a68, 0.7));

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const stage = new THREE.Group();
  scene.add(stage);

  /* Soft contact shadow on the driveway. */
  const shadowTex = (() => {
    const c = document.createElement('canvas'); c.width = c.height = 256;
    const g = c.getContext('2d')!;
    const grad = g.createRadialGradient(128, 128, 8, 128, 128, 126);
    grad.addColorStop(0, 'rgba(0,0,0,0.78)'); grad.addColorStop(0.55, 'rgba(0,0,0,0.38)'); grad.addColorStop(1, 'rgba(0,0,0,0)'); // check-tokens:ignore (neutral shadow)
    g.fillStyle = grad; g.fillRect(0, 0, 256, 256);
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
  })();
  const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1, 1), new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false }));
  shadow.rotation.x = -Math.PI / 2; shadow.position.y = 0.004;
  scene.add(shadow);
  void turntable;

  const loader = new GLTFLoader();
  const cache = new Map<ModelKey, THREE.Object3D>();
  let current: THREE.Object3D | null = null;
  let want: ModelKey | null = null;
  let yaw = opts.yaw ?? -0.6;
  let dragging = false;
  let lastX = 0;
  let fade = 1;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0;
  let visible = true;

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    if (!w || !h) return;
    renderer!.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    camera.position.set(0, 1.45, w / h < 1.3 ? 11.5 : 9);
    camera.lookAt(0, 1.05, 0);
  };
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  if (spin) {
    host.style.touchAction = 'pan-y';
    host.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; host.setPointerCapture(e.pointerId); });
    host.addEventListener('pointermove', (e) => { if (dragging) { yaw += (e.clientX - lastX) * 0.01; lastX = e.clientX; } });
    host.addEventListener('pointerup', () => { dragging = false; });
  }
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.05 });
  io.observe(host);

  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    if (spin && auto && !dragging && !reduced) yaw += 0.0035;
    stage.rotation.y = yaw;
    if (fade < 1) { fade = spin ? Math.min(1, fade + 0.05) : 1; stage.scale.setScalar(0.94 + 0.06 * fade); renderer!.domElement.style.opacity = String(fade); }
    renderer!.render(scene, camera);
  };
  frame();

  /** Scale to the vehicle's real length, centre on the turntable and sit on the floor. */
  const normalise = (obj: THREE.Object3D, k: ModelKey) => {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    /* Meshes arrive with the length on either horizontal axis; turn them all nose-along-X so one yaw suits every model. */
    if (size.z > size.x) obj.rotation.y = Math.PI / 2;
    obj.scale.setScalar((modelLength(k) * UNITS_PER_METRE) / Math.max(size.x, size.z));
    const b2 = new THREE.Box3().setFromObject(obj);
    const c = b2.getCenter(new THREE.Vector3());
    obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= b2.min.y;
    /* Smooth the faceted image-to-3D mesh (position-based creased normals), sharpen the texture and give the paint a clear coat. */
    const aniso = renderer!.capabilities.getMaxAnisotropy();
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const m = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (!m || !m.map) return;
      /* One Loop subdivision pass rounds off the low-poly silhouette before the normals are smoothed. */
      mesh.geometry = toCreasedNormals(LoopSubdivision.modify(mesh.geometry, 1, { split: true, uvSmooth: false, preserveEdges: false, flatOnly: false }), Math.PI / 2.4);
      m.map.anisotropy = aniso;
      mesh.material = new THREE.MeshPhysicalMaterial({ map: m.map, color: 0x1c1c1c, emissiveMap: m.map, emissive: 0xffffff, emissiveIntensity: 0.9, metalness: 0.35, roughness: 0.28, clearcoat: 1, clearcoatRoughness: 0.12, envMapIntensity: 1.6 });
    });
    /* Size and place the contact shadow under this vehicle. */
    const fin = new THREE.Box3().setFromObject(obj);
    const fs = fin.getSize(new THREE.Vector3());
    shadow.scale.set(Math.max(fs.x, fs.z) * 1.45, Math.max(fs.x, fs.z) * 1.45, 1);
  };

  const show = (k: ModelKey) => {
    fallback.hidden = true;
    if (current) stage.remove(current);
    const obj = cache.get(k)!;
    current = obj; stage.add(obj); fade = 0;
    opts.onReady?.(k);
  };

  return {
    setModel(k) {
      if (k === want && (current || !k)) return;
      want = k;
      if (!k) { if (current) { stage.remove(current); current = null; } fallback.hidden = true; return; }
      if (cache.has(k)) { show(k); return; }
      fallback.src = imgUrl(k); fallback.hidden = false;
      loader.load(glbUrl(k), (gltf) => {
        const obj = new THREE.Group(); obj.add(gltf.scene); normalise(obj, k);
        cache.set(k, obj);
        if (want === k) show(k);
      }, undefined, () => { if (want === k) fallback.hidden = false; });
    },
    /** Render one frame now, without waiting for the animation loop (used for still captures). */
    draw() { fade = 1; stage.scale.setScalar(1); stage.rotation.y = yaw; renderer!.domElement.style.opacity = '1'; renderer!.render(scene, camera); },
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); renderer!.dispose(); renderer!.domElement.remove(); fallback.remove(); },
  };
}
