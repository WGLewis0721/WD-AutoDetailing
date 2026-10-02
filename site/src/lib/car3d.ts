import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Shape } from './vehicles';

/* Vehicle meshes are Higgsfield image-to-3D models stored in /models/<shape>.glb with a studio render <shape>.webp as fallback. */
const modelBase = (): string => {
  const u = import.meta.url;
  return u.includes('/_astro/') ? u.replace(/_astro\/[^/]*$/, '') : new URL('/', u).href;
};
const BASE = modelBase();
const glbUrl = (s: Shape) => `${BASE}models/${s}.glb`;
const imgUrl = (s: Shape) => `${BASE}models/${s}.webp`;

const cssColor = (name: string): THREE.Color => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim());

export interface Viewer { setShape(shape: Shape | null): void; destroy(): void }

export function createViewer(host: HTMLElement): Viewer {
  const fallback = document.createElement('img');
  fallback.className = 'vfallback';
  fallback.alt = '';
  fallback.hidden = true;
  host.appendChild(fallback);

  let renderer: THREE.WebGLRenderer | null = null;
  try { renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true }); } catch { renderer = null; }
  if (!renderer) {
    return { setShape(shape) { fallback.hidden = !shape; if (shape) fallback.src = imgUrl(shape); }, destroy() { fallback.remove(); } };
  }

  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.NoToneMapping;
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');
  renderer.domElement.className = 'vcanvas';

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.2);
  key.position.set(4, 6, 5);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  const stage = new THREE.Group();
  scene.add(stage);

  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.3, 0.02, 12, 120), new THREE.MeshStandardMaterial({ color: cssColor('--gold'), metalness: 0.9, roughness: 0.3 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = 0.005;
  scene.add(ring);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(3.3, 64), new THREE.MeshBasicMaterial({ color: cssColor('--ink-2'), transparent: true, opacity: 0.55 }));
  disc.rotation.x = -Math.PI / 2; disc.position.y = 0.002;
  scene.add(disc);

  const loader = new GLTFLoader();
  const cache = new Map<Shape, THREE.Object3D>();
  let current: THREE.Object3D | null = null;
  let want: Shape | null = null;
  let yaw = -0.6;
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
    camera.position.set(0, 2.1, w / h < 1.3 ? 11.5 : 9);
    camera.lookAt(0, 0.8, 0);
  };
  const ro = new ResizeObserver(resize); ro.observe(host); resize();

  host.style.touchAction = 'pan-y';
  host.addEventListener('pointerdown', (e) => { dragging = true; lastX = e.clientX; host.setPointerCapture(e.pointerId); });
  host.addEventListener('pointermove', (e) => { if (dragging) { yaw += (e.clientX - lastX) * 0.01; lastX = e.clientX; } });
  host.addEventListener('pointerup', () => { dragging = false; });
  const io = new IntersectionObserver(([en]) => { visible = en.isIntersecting; }, { threshold: 0.05 });
  io.observe(host);

  const frame = () => {
    raf = requestAnimationFrame(frame);
    if (!visible) return;
    if (!dragging && !reduced) yaw += 0.0035;
    stage.rotation.y = yaw;
    if (fade < 1) { fade = Math.min(1, fade + 0.05); stage.scale.setScalar(0.94 + 0.06 * fade); renderer!.domElement.style.opacity = String(fade); }
    renderer!.render(scene, camera);
  };
  frame();

  /** Scale to a common length, centre on the turntable and sit on the floor. */
  const normalise = (obj: THREE.Object3D) => {
    const box = new THREE.Box3().setFromObject(obj);
    const size = box.getSize(new THREE.Vector3());
    const k = 4.6 / Math.max(size.x, size.z);
    obj.scale.setScalar(k);
    const b2 = new THREE.Box3().setFromObject(obj);
    const c = b2.getCenter(new THREE.Vector3());
    obj.position.x -= c.x; obj.position.z -= c.z; obj.position.y -= b2.min.y;
    /* The texture already carries the studio lighting, so show it as emissive and add a little gloss on top. */
    obj.traverse((o) => {
      const mesh = o as THREE.Mesh;
      const m = mesh.material as THREE.MeshStandardMaterial | undefined;
      if (!m || !m.map) return;
      mesh.material = new THREE.MeshStandardMaterial({ map: m.map, color: 0x222222, emissiveMap: m.map, emissive: 0xffffff, emissiveIntensity: 1.35, metalness: 0.55, roughness: 0.22, envMapIntensity: 1.5 });
    });
  };

  const show = (shape: Shape) => {
    fallback.hidden = true;
    if (current) stage.remove(current);
    const obj = cache.get(shape)!;
    current = obj; stage.add(obj); fade = 0;
  };

  return {
    setShape(shape) {
      want = shape;
      if (!shape) { if (current) { stage.remove(current); current = null; } fallback.hidden = true; return; }
      if (cache.has(shape)) { show(shape); return; }
      fallback.src = imgUrl(shape); fallback.hidden = false;
      loader.load(glbUrl(shape), (gltf) => {
        const obj = new THREE.Group(); obj.add(gltf.scene); normalise(obj);
        cache.set(shape, obj);
        if (want === shape) show(shape);
      }, undefined, () => { if (want === shape) fallback.hidden = false; });
    },
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); renderer!.dispose(); renderer!.domElement.remove(); fallback.remove(); },
  };
}
