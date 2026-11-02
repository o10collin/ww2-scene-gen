import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'zangenangriff', title: 'Vormarsch auf Berlin', seed: 21, duration: 11,
  script: 'Während sie 1945 von Westen immer weiter in Richtung Deutschland vorrücken, nähern sich aus dem Osten auch sowjetische Truppen, welche daraufhin Berlin einnehmen.',
  caption: { title: 'Berlin', sub: 'April 1945' },
  params: {
    westArrows: { type: 'number', min: 1, max: 6, step: 1, value: 3, label: 'Pfeile West' },
    eastArrows: { type: 'number', min: 1, max: 6, step: 1, value: 3, label: 'Pfeile Ost' },
    tWest: { type: 'number', min: 0, max: 10, step: .1, value: .5, label: 'West ab (s)' },
    tEast: { type: 'number', min: 0, max: 10, step: .1, value: 3, label: 'Ost ab (s)' },
    tBerlin: { type: 'number', min: 0, max: 12, step: .1, value: 8.5, label: 'Berlin fällt (s)' },
    landColor: { type: 'color', value: '#767b82', label: 'Land' },
    seaColor: { type: 'color', value: '#262a2e', label: 'Meer' },
    germanyColor: { type: 'color', value: '#7a2a26', label: 'Deutschland (Fläche)' },
    labels: { type: 'boolean', value: true, label: 'Beschriftung' },
    ...H.cameraParams([0, 28, 18], [0, 19, 10], [1, 0, -2], 38)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, '#0b0d12', 60, 160);
    H.lights(scene, { sun: [10, 30, 10], intensity: 1.3, hemi: .5, shadows: false, skyColor: '#cfd8e3', groundColor: '#222' });
    const map = H.europeMap({ land: p.landColor, sea: p.seaColor, center: [12, 51], highlight: { deutschland: p.germanyColor } });
    scene.add(map);
    const U = map.userData, proj = U.project;
    const berlin = proj(...H.PLACES.berlin);
    const mk = (from, color, t0, i, bend) => {
      const v0 = proj(from[0], from[1]);
      const v2 = berlin.clone().lerp(v0, .12);
      const mid = v0.clone().lerp(v2, .5); mid.z += bend;
      const a = H.curvedArrow([v0, mid, v2], color, { radius: .09, head: .6 });
      scene.add(a);
      return { a, t0: t0 + i * .5 };
    };
    const arrows = [];
    const westStarts = [[-1, 49.4], [-3, 47.5], [1, 51.3], [-1, 46], [3, 50.8], [-2, 48]];
    const eastStarts = [[24.5, 52.8], [24, 50.5], [26, 54.5], [23, 49.5], [26, 51.5], [25, 53.8]];
    for (let i = 0; i < p.westArrows; i++) arrows.push(mk(westStarts[i], H.ROLE.west, p.tWest, i, (i - 1) * 1.2));
    for (let i = 0; i < p.eastArrows; i++) arrows.push(mk(eastStarts[i], H.ROLE.soviet, p.tEast, i, (i - 1) * 1.2));
    const city = U.city(13.4, 52.5, 'Berlin', { size: 1.0 });
    const ring = new THREE.Mesh(new THREE.RingGeometry(.85, 1, 48), H.glowMat(H.ROLE.soviet, 2, { transparent: true, side: THREE.DoubleSide }));
    ring.rotation.x = -Math.PI / 2; ring.position.set(berlin.x, .06, berlin.z); scene.add(ring);
    if (p.labels) { U.country(10.0, 50.2, 'Deutschland', 1.3); U.country(2.2, 47.2, 'Frankreich', 1.0); U.country(20.5, 52.2, 'Polen', 1.0); }
    return {
      update(t, p) {
        for (const ar of arrows) ar.a.userData.setProgress(H.easeInOut(H.span(t, ar.t0, p.tBerlin - .3)));
        const fall = t > p.tBerlin;
        city.dot.scale.setScalar(1 + (fall ? .6 : .15) * H.pulse(t, fall ? 2 : 1));
        city.dot.material.color.set(fall ? H.ROLE.soviet : '#ffffff').multiplyScalar(1.8);
        const rk = fall ? ((t - p.tBerlin) % 1.2) / 1.2 : 0;
        ring.visible = fall; ring.scale.setScalar(.5 + rk * 4); ring.material.opacity = (1 - rk) * .9;
      }
    };
  }
};
