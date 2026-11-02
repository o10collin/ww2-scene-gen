import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'druck-auf-deutschland', title: 'Deutschland unter Druck', seed: 13, duration: 7,
  script: 'Die Alliierten werden stärker und Deutschland gerät mehr und mehr unter Druck.',
  caption: { title: 'Europa', sub: '1942' },
  params: {
    arrows: { type: 'number', min: 3, max: 16, step: 1, value: 8, label: 'Pfeile' },
    radius: { type: 'number', min: 5, max: 20, step: .5, value: 11, label: 'Pfeilabstand' },
    squeeze: { type: 'number', min: 0, max: .5, step: .01, value: .10, label: 'Zusammendrücken' },
    landColor: { type: 'color', value: '#767b82', label: 'Land' },
    seaColor: { type: 'color', value: '#262a2e', label: 'Meer' },
    germanyColor: { type: 'color', value: '#7a2a26', label: 'Deutschland (Fläche)' },
    labels: { type: 'boolean', value: true, label: 'Beschriftung' },
    ...H.cameraParams([0, 26, 20], [0, 21, 14], [0.5, 0, -2], 38)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, '#0b0d12', 60, 160);
    H.lights(scene, { sun: [10, 30, 10], intensity: 1.3, hemi: .5, shadows: false, skyColor: '#cfd8e3', groundColor: '#222' });
    const map = H.europeMap({ land: p.landColor, sea: p.seaColor, highlight: { deutschland: p.germanyColor } });
    scene.add(map);
    const U = map.userData;
    const de = U.countries.deutschland;
    const c = U.project(10.4, 51.1);
    const arrows = [];
    for (let i = 0; i < p.arrows; i++) {
      const ang = i / p.arrows * Math.PI * 2 + .3;
      const east = Math.cos(ang) > .3;
      const from = new THREE.Vector3(c.x + Math.cos(ang) * p.radius, 0, c.z + Math.sin(ang) * p.radius);
      const to = new THREE.Vector3(c.x + Math.cos(ang) * 3.2, 0, c.z + Math.sin(ang) * 3.2);
      const mid = from.clone().lerp(to, .5); mid.x += Math.sin(ang * 3) * 1.5; mid.z += Math.cos(ang * 2) * 1.5;
      const a = H.curvedArrow([from, mid, to], east ? H.ROLE.soviet : H.ROLE.west, { radius: .09, head: .6 });
      scene.add(a); arrows.push({ a, off: r() * 1.5 });
    }
    if (p.labels) {
      U.country(10.4, 50.2, 'Deutschland', 1.5);
      U.country(2.2, 46.8, 'Frankreich', 1.1); U.country(-2.5, 54.2, 'Großbritannien', 1.0);
      U.country(19.5, 52.2, 'Polen', 1.0); U.country(12.5, 43.0, 'Italien', 1.0); U.country(33, 53.5, 'UdSSR', 1.3);
      U.city(13.4, 52.5, 'Berlin');
    }
    return {
      update(t, p) {
        const u = H.easeInOut(t / p.duration);
        for (const { a, off } of arrows) a.userData.setProgress(H.span(t, off, off + 2.5) * (0.85 + .15 * H.pulse(t + off, .6)));
        const s = 1 - u * p.squeeze;
        de.scale.set(s, s, 1); de.userData.outline.scale.set(s, 1, s);
        de.position.x = c.x * (1 - s); de.position.z = c.z * (1 - s);
        de.userData.outline.position.copy(de.position);
      }
    };
  }
};
