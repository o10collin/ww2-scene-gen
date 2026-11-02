import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'kriegswende', title: 'Kriegswende', seed: 15, duration: 8,
  script: 'Die Rote Armee drängt die deutschen Truppen zurück. Dies wird oft als Kriegswende bezeichnet.',
  caption: { title: 'Die Kriegswende', sub: '1943' },
  params: {
    frontStart: { type: 'number', min: 10, max: 48, step: .5, value: 43, label: 'Front Start (Länge °)' },
    frontEnd: { type: 'number', min: 10, max: 48, step: .5, value: 24, label: 'Front Ende (Länge °)' },
    arrows: { type: 'number', min: 1, max: 8, step: 1, value: 4, label: 'Pfeile' },
    landColor: { type: 'color', value: '#d8c59c', label: 'Land' },
    seaColor: { type: 'color', value: '#36627f', label: 'Meer' },
    germanyColor: { type: 'color', value: '#4a4e57', label: 'Deutschland' },
    ussrColor: { type: 'color', value: '#a8574c', label: 'Sowjetunion' },
    frontColor: { type: 'color', value: '#c6473a', label: 'Frontlinie' },
    labels: { type: 'boolean', value: true, label: 'Beschriftungen' },
    ...H.cameraParams([8, 30, 20], [2, 24, 14], [4, 0, -4], 38)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, '#9fb3c2', 60, 160);
    H.lights(scene, { sun: [10, 20, 10], shadows, shadowSize: 60 });
    const map = H.europeMap({ land: p.landColor, sea: p.seaColor, center: [26, 51], highlight: { deutschland: p.germanyColor, osten: p.ussrColor } });
    scene.add(map);
    const proj = map.userData.project, d = map.userData.depth;
    const frontMat = new THREE.MeshBasicMaterial({ color: p.frontColor });
    let front = null;
    const arrows = [];
    for (let i = 0; i < p.arrows; i++) {
      const a = H.arrow(3, p.frontColor, { width: .6, height: .25 });
      a.rotation.y = Math.PI; scene.add(a); arrows.push({ a, lat: 58 - (i + .5) * (14 / p.arrows), off: r() * 3 });
    }
    const marks = [];
    if (p.labels) {
      for (const [name, txt] of [['stalingrad', 'Stalingrad'], ['berlin', 'Berlin'], ['moskau', 'Moskau']]) {
        const v = proj(...H.PLACES[name]);
        const m = H.sphere(.4, P.black, 10); m.position.set(v.x, d + .3, v.z); scene.add(m);
        const l = H.label(txt, { size: 1.1 }); l.position.set(v.x, d + 1.6, v.z); scene.add(l); marks.push(l);
      }
    }
    const frontShape = (lon, t) => {
      const pts = [];
      for (let i = 0; i <= 12; i++) {
        const lat = 60 - i * (16 / 12);
        const bulge = Math.sin(i / 12 * Math.PI) * 3 + Math.sin(i * 1.7 + t * .3) * 1.2;
        const v = proj(lon + bulge, lat); v.y = d + .2; pts.push(v);
      }
      return pts;
    };
    return {
      update(t, p) {
        const u = H.easeInOut(H.span(t, .5, p.duration - .5));
        const lon = H.lerp(p.frontStart, p.frontEnd, u);
        if (front) { scene.remove(front); front.geometry.dispose(); }
        const curve = new THREE.CatmullRomCurve3(frontShape(lon, t));
        front = new THREE.Mesh(new THREE.TubeGeometry(curve, 40, .22, 6, false), frontMat);
        front.castShadow = false; scene.add(front);
        for (const ar of arrows) {
          const v = proj(lon + 1.5, ar.lat);
          ar.a.position.set(v.x, d + .5, v.z);
          ar.a.userData.setLength(2 + 1.2 * H.pulse(t + ar.off, .7) + u * 1.5);
        }
      },
      dispose() { frontMat.dispose(); }
    };
  }
};
