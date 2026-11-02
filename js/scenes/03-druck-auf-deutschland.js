import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'druck-auf-deutschland', title: 'Deutschland unter Druck', seed: 13, duration: 7,
  script: 'Die Alliierten werden stärker und Deutschland gerät mehr und mehr unter Druck.',
  caption: { title: 'Die Alliierten werden stärker', sub: '1942' },
  params: {
    arrows: { type: 'number', min: 3, max: 16, step: 1, value: 9, label: 'Pfeile' },
    radius: { type: 'number', min: 5, max: 20, step: .5, value: 10, label: 'Pfeilabstand' },
    growth: { type: 'number', min: 0, max: 8, step: .1, value: 4.5, label: 'Pfeilwachstum' },
    squeeze: { type: 'number', min: 0, max: .5, step: .01, value: .12, label: 'Zusammendrücken' },
    landColor: { type: 'color', value: '#d8c59c', label: 'Land' },
    seaColor: { type: 'color', value: '#36627f', label: 'Meer' },
    germanyColor: { type: 'color', value: '#4a4e57', label: 'Deutschland' },
    arrowColorW: { type: 'color', value: '#3f6fa3', label: 'Pfeile West/Süd' },
    arrowColorE: { type: 'color', value: '#c6473a', label: 'Pfeile Ost' },
    label: { type: 'boolean', value: true, label: 'Beschriftung' },
    ...H.cameraParams([0, 30, 22], [0, 22, 15], [0.5, 0, -2], 38)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, '#9fb3c2', 60, 160);
    H.lights(scene, { sun: [10, 20, 10], shadows, shadowSize: 50 });
    const map = H.europeMap({ land: p.landColor, sea: p.seaColor, highlight: { deutschland: p.germanyColor } });
    scene.add(map);
    const de = map.userData.countries.deutschland;
    const c = map.userData.project(10.4, 51.1);
    const arrows = [];
    for (let i = 0; i < p.arrows; i++) {
      const ang = i / p.arrows * Math.PI * 2 + .3;
      const east = Math.cos(ang) > .3;
      const a = H.arrow(2, east ? p.arrowColorE : p.arrowColorW, { width: .7, height: .3 });
      a.position.set(c.x + Math.cos(ang) * p.radius, .6, c.z + Math.sin(ang) * p.radius);
      a.rotation.y = Math.atan2(Math.sin(ang), -Math.cos(ang));  // zeigt zur Mitte
      scene.add(a); arrows.push({ a, off: r() * 2 });
    }
    let lbl = null;
    if (p.label) { lbl = H.label('Deutschland', { size: 1.4, color: '#f4f1ea' }); lbl.position.set(c.x, 2.4, c.z); scene.add(lbl); }
    return {
      update(t, p) {
        const u = H.easeInOut(t / p.duration);
        for (const { a, off } of arrows) a.userData.setLength(1 + u * p.growth + .35 * H.pulse(t + off, .8));
        const s = 1 - u * p.squeeze;
        de.scale.set(s, s, 1); de.position.y = Math.sin(t * 6) * .03 * u;
        de.position.x = c.x * (1 - s); de.position.z = c.z * (1 - s);
      }
    };
  }
};
