import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import type { Shape } from './vehicles';

/* Side profiles (x = length, y = height), car faces +x. lower = painted body, cabin = glass greenhouse. */
type P = [number, number][];
const BODY: Record<Shape, { lower: P; cabin: P }> = {
  sedan: { lower: [[-2.3, .35], [-2.3, .88], [-1.2, .92], [1.3, .92], [2.3, .8], [2.3, .35]], cabin: [[-1.35, .9], [-.85, 1.42], [.65, 1.42], [1.25, .9]] },
  coupe: { lower: [[-2.25, .35], [-2.25, .85], [-1.2, .9], [1.3, .9], [2.25, .78], [2.25, .35]], cabin: [[-1.3, .88], [-.55, 1.35], [.45, 1.35], [1.15, .88]] },
  hatch: { lower: [[-2.0, .35], [-2.0, .95], [2.05, .85], [2.05, .35]], cabin: [[-2.0, .93], [-1.7, 1.5], [.5, 1.5], [1.2, .88]] },
  suv: { lower: [[-2.35, .4], [-2.35, 1.05], [2.35, .98], [2.35, .4]], cabin: [[-2.3, 1.02], [-2.1, 1.8], [.8, 1.8], [1.5, 1.0]] },
  truck: { lower: [[-2.7, .45], [-2.7, 1.15], [2.6, 1.1], [2.6, .45]], cabin: [[-.65, 1.12], [-.55, 1.9], [.9, 1.9], [1.6, 1.1]] },
  van: { lower: [[-2.5, .4], [-2.5, 1.2], [2.5, 1.1], [2.5, .4]], cabin: [[-2.45, 1.17], [-2.45, 2.15], [1.5, 2.15], [2.45, 1.12]] },
};
const WHEEL_X: Record<Shape, [number, number]> = { sedan: [-1.45, 1.5], coupe: [-1.4, 1.5], hatch: [-1.25, 1.35], suv: [-1.5, 1.55], truck: [-1.7, 1.7], van: [-1.55, 1.6] };
const WIDTH: Record<Shape, number> = { sedan: 2.0, coupe: 2.0, hatch: 1.9, suv: 2.15, truck: 2.2, van: 2.3 };
const WHEEL_R: Record<Shape, number> = { sedan: .36, coupe: .36, hatch: .34, suv: .43, truck: .47, van: .42 };

const cssColor = (name: string): THREE.Color => new THREE.Color(getComputedStyle(document.documentElement).getPropertyValue(name).trim());

function profileShape(pts: [number, number][]): THREE.Shape {
  const s = new THREE.Shape();
  s.moveTo(pts[0][0], pts[0][1]);
  for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
  s.closePath();
  return s;
}

function buildCar(shape: Shape): THREE.Group {
  const g = new THREE.Group();
  const w = WIDTH[shape];
  const paint = new THREE.MeshPhysicalMaterial({ color: cssColor('--black'), metalness: .6, roughness: .22, clearcoat: 1, clearcoatRoughness: .08 });
  const gold = new THREE.MeshStandardMaterial({ color: cssColor('--gold'), metalness: .9, roughness: .25 });
  const glass = new THREE.MeshPhysicalMaterial({ color: cssColor('--line-dark'), metalness: .35, roughness: .03, clearcoat: 1, envMapIntensity: 1.6 });
  const tyre = new THREE.MeshStandardMaterial({ color: cssColor('--ink-2'), roughness: .9 });

  const ext = (pts: P, depth: number, bevel: number) => {
    const geo = new THREE.ExtrudeGeometry(profileShape(pts), { depth, bevelEnabled: true, bevelSize: bevel, bevelThickness: bevel, bevelSegments: 3, curveSegments: 6 });
    geo.translate(0, 0, -depth / 2);
    return geo;
  };
  const { lower, cabin } = BODY[shape];
  g.add(new THREE.Mesh(ext(lower, w - .24, .12), paint));
  g.add(new THREE.Mesh(ext(cabin, w - .5, .05), glass));
  const roofPts = cabin.filter((p) => p[1] === Math.max(...cabin.map((q) => q[1])));
  const x0 = Math.min(...roofPts.map((p) => p[0])), x1 = Math.max(...roofPts.map((p) => p[0]));
  const roof = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0 + .1, .07, w - .45), paint);
  roof.position.set((x0 + x1) / 2, roofPts[0][1] + .03, 0);
  g.add(roof);
  const lx0 = lower[0][0], lx1 = lower[lower.length - 2][0];
  const belt = new THREE.Mesh(new THREE.BoxGeometry(lx1 - lx0, .035, w - .1), gold);
  belt.position.set((lx0 + lx1) / 2, .6, 0);
  g.add(belt);
  /* Gold lamps front and rear for a little detail */
  const lampY = lower[lower.length - 2][1] - .22;
  for (const [x, z] of [[lx1 + .1, w / 2 - .45], [lx1 + .1, -w / 2 + .45], [lx0 - .1, w / 2 - .45], [lx0 - .1, -w / 2 + .45]]) {
    const lamp = new THREE.Mesh(new THREE.BoxGeometry(.06, .12, .38), gold);
    lamp.position.set(x, lampY, z);
    g.add(lamp);
  }

  const [fx, rx] = WHEEL_X[shape];
  const r = WHEEL_R[shape];
  for (const x of [fx, rx]) for (const z of [-w / 2 - .02, w / 2 + .02]) {
    const tire = new THREE.Mesh(new THREE.CylinderGeometry(r, r, .32, 28), tyre);
    tire.rotation.x = Math.PI / 2; tire.position.set(x, r, z);
    const rim = new THREE.Mesh(new THREE.CylinderGeometry(r * .62, r * .62, .34, 24), gold);
    rim.rotation.x = Math.PI / 2; rim.position.set(x, r, z);
    g.add(tire, rim);
  }
  return g;
}

export interface Viewer { setShape(shape: Shape): void; destroy(): void }

export function createViewer(host: HTMLElement): Viewer | null {
  let renderer: THREE.WebGLRenderer;
  try {
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
  } catch {
    return null;
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  host.appendChild(renderer.domElement);
  renderer.domElement.setAttribute('aria-hidden', 'true');

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(4, 6, 5);
  scene.add(key);

  const camera = new THREE.PerspectiveCamera(32, 1, 0.1, 100);
  const stage = new THREE.Group();
  scene.add(stage);

  /* Gold turntable ring */
  const ring = new THREE.Mesh(new THREE.TorusGeometry(3.4, .025, 12, 96), new THREE.MeshStandardMaterial({ color: cssColor('--gold'), metalness: .9, roughness: .3 }));
  ring.rotation.x = Math.PI / 2; ring.position.y = .01;
  scene.add(ring);

  let car: THREE.Group | null = null;
  let yaw = -0.7;
  let dragging = false;
  let lastX = 0;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let raf = 0;
  let visible = true;

  const resize = () => {
    const w = host.clientWidth, h = host.clientHeight;
    renderer.setSize(w, h, false);
    camera.aspect = w / h; camera.updateProjectionMatrix();
    camera.position.set(0, 3.2, w / h < 1.2 ? 12 : 9.4);
    camera.lookAt(0, .9, 0);
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
    if (!dragging && !reduced) yaw += 0.004;
    stage.rotation.y = yaw;
    renderer.render(scene, camera);
  };
  frame();

  return {
    setShape(shape) {
      if (car) { stage.remove(car); car.traverse((o) => { const m = o as THREE.Mesh; m.geometry?.dispose(); }); }
      car = buildCar(shape);
      stage.add(car);
    },
    destroy() { cancelAnimationFrame(raf); ro.disconnect(); io.disconnect(); renderer.dispose(); renderer.domElement.remove(); },
  };
}
