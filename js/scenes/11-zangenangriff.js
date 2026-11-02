import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'zangenangriff', title: 'Vormarsch auf Berlin', seed: 21, duration: 11,
  script: 'Während sie 1945 von Westen immer weiter in Richtung Deutschland vorrücken, nähern sich aus dem Osten auch sowjetische Truppen, welche daraufhin Berlin einnehmen.',
  caption: { title: 'Berlin wird eingenommen', sub: 'Frühjahr 1945' },
  params: {
    westArrows: { type: 'number', min: 1, max: 6, step: 1, value: 3, label: 'Pfeile West' },
    eastArrows: { type: 'number', min: 1, max: 6, step: 1, value: 3, label: 'Pfeile Ost' },
    tWest: { type: 'number', min: 0, max: 10, step: .1, value: .5, label: 'West ab (s)' },
    tEast: { type: 'number', min: 0, max: 10, step: .1, value: 3, label: 'Ost ab (s)' },
    tBerlin: { type: 'number', min: 0, max: 12, step: .1, value: 8.5, label: 'Berlin fällt (s)' },
    westColor: { type: 'color', value: '#3f6fa3', label: 'Westalliierte' },
    eastColor: { type: 'color', value: '#c6473a', label: 'Rote Armee' },
    landColor: { type: 'color', value: '#d8c59c', label: 'Land' },
    seaColor: { type: 'color', value: '#36627f', label: 'Meer' },
    germanyColor: { type: 'color', value: '#4a4e57', label: 'Deutschland' },
    labels: { type: 'boolean', value: true, label: 'Beschriftung' },
    ...H.cameraParams([0, 32, 18], [0, 20, 10], [1, 0, -2], 38)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, '#9fb3c2', 60, 160);
    H.lights(scene, { sun: [10, 20, 10], shadows, shadowSize: 50 });
    const map = H.europeMap({ land: p.landColor, sea: p.seaColor, center: [12, 51], highlight: { deutschland: p.germanyColor } });
    scene.add(map);
    const proj = map.userData.project, d = map.userData.depth;
    const berlin = proj(...H.PLACES.berlin);
    const mk = (from, color, t0, n, i) => {
      const a = H.arrow(1, color, { width: .7, height: .3 });
      const v = proj(from[0], from[1]); a.position.set(v.x, d + .4, v.z);
      const dx = berlin.x - v.x, dz = berlin.z - v.z;
      a.rotation.y = Math.atan2(-dz, dx);
      scene.add(a);
      return { a, len: Math.hypot(dx, dz) - 1.2, t0: t0 + i * .5, off: r() * 3 };
    };
    const arrows = [];
    const westStarts = [[-1, 49.4], [-3, 47.5], [1, 51.3], [-1, 46], [3, 50.8], [-2, 48]];
    const eastStarts = [[24.5, 52.8], [24, 50.5], [26, 54.5], [23, 49.5], [26, 51.5], [25, 53.8]];
    for (let i = 0; i < p.westArrows; i++) arrows.push(mk(westStarts[i], p.westColor, p.tWest, p.westArrows, i));
    for (let i = 0; i < p.eastArrows; i++) arrows.push(mk(eastStarts[i], p.eastColor, p.tEast, p.eastArrows, i));
    const bm = H.sphere(.5, P.black, 12); bm.position.set(berlin.x, d + .4, berlin.z); scene.add(bm);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.8, 1, 32), new THREE.MeshBasicMaterial({ color: p.eastColor, transparent: true, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(berlin.x, d + .45, berlin.z); scene.add(ring);
    if (p.labels) { const l = H.label('Berlin', { size: 1.1 }); l.position.set(berlin.x, d + 1.8, berlin.z); scene.add(l); }
    return {
      update(t, p) {
        for (const ar of arrows) {
          const u = H.easeInOut(H.span(t, ar.t0, p.tBerlin - .3));
          ar.a.userData.setLength(Math.max(.2, u * ar.len) + .2 * H.pulse(t + ar.off, .8));
        }
        const fall = t > p.tBerlin;
        bm.material.color.set(fall ? p.eastColor : P.black);
        bm.scale.setScalar(1 + (fall ? .4 : .15) * H.pulse(t, fall ? 2 : 1));
        const rk = fall ? ((t - p.tBerlin) % 1.2) / 1.2 : 0;
        ring.visible = fall; ring.scale.setScalar(.5 + rk * 4); ring.material.opacity = (1 - rk) * .9;
      }
    };
  }
};
