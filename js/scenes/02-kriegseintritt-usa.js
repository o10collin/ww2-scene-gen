import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

const TOKIO = [35.7, 139.7], PEARL = [21.3, -157.9], WASHINGTON = [38.9, -77.0], BERLIN = [52.5, 13.4], ROM = [41.9, 12.5];

export default {
  id: 'kriegseintritt-usa', title: 'Kriegseintritt der USA', seed: 12, duration: 10,
  script: 'Dies führt dazu, dass die Vereinigten Staaten ihre Neutralität aufgeben und in den Zweiten Weltkrieg eintreten. Deutschland und Italien erklären ihnen kurz darauf den Krieg.',
  caption: { title: 'Die USA treten in den Krieg ein', sub: 'Dezember 1941' },
  params: {
    rotStart: { type: 'number', min: -360, max: 360, step: 1, value: 105, label: 'Drehung Start (°)' },
    rotEnd: { type: 'number', min: -360, max: 360, step: 1, value: -50, label: 'Drehung Ende (°)' },
    tilt: { type: 'number', min: -45, max: 45, step: 1, value: 12, label: 'Neigung (°)' },
    oceanColor: { type: 'color', value: '#2f5b78', label: 'Ozean' },
    landColor: { type: 'color', value: '#d6c49a', label: 'Land' },
    spaceColor: { type: 'color', value: '#141923', label: 'Hintergrund' },
    labels: { type: 'boolean', value: true, label: 'Beschriftungen' },
    tAttack: { type: 'number', min: 0, max: 10, step: .1, value: .5, label: 'Angriff ab (s)' },
    tUSA: { type: 'number', min: 0, max: 10, step: .1, value: 3.2, label: 'USA ab (s)' },
    tDeclare: { type: 'number', min: 0, max: 10, step: .1, value: 6.0, label: 'Kriegserklärung ab (s)' },
    ...H.cameraParams([0, 2.5, 14], [1, 2, 12.5], [0, 0, 0], 40)
  },
  build({ scene, params: p, rng: r, shadows }) {
    scene.background = new THREE.Color(p.spaceColor);
    H.lights(scene, { sun: [8, 6, 10], shadows: false, intensity: 1.4, hemi: .7, skyColor: '#ffffff', groundColor: '#223' });
    const stars = H.particles(r, { count: 400, area: [80, 60, 20], color: '#ffffff', size: .12, opacity: .7 });
    stars.position.z = -30; scene.add(stars);
    const g = H.globe(5, { ocean: p.oceanColor, land: p.landColor });
    g.rotation.x = p.tilt * Math.PI / 180;
    scene.add(g);
    const U = g.userData;
    const mk = (ll, c, r = .16) => U.marker(ll[0], ll[1], c, r);
    const mTokio = mk(TOKIO, P.red), mPearl = mk(PEARL, P.orange, .14), mWash = mk(WASHINGTON, P.blue, .2), mBerlin = mk(BERLIN, P.darkGrey), mRom = mk(ROM, P.darkGrey);
    const attack = U.arc(TOKIO, PEARL, P.red, { lift: 1.35 });
    const declB = U.arc(BERLIN, WASHINGTON, '#777c88', { lift: 1.45, radius: .06 });
    const declR = U.arc(ROM, WASHINGTON, '#777c88', { lift: 1.4, radius: .06 });
    const boom = H.explosion({ size: .8, duration: 1.4, color: P.orange, smoke: P.yellow });
    boom.position.copy(mPearl.position); g.add(boom);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 32), new THREE.MeshBasicMaterial({ color: P.blue, transparent: true, side: THREE.DoubleSide }));
    ring.position.copy(mWash.position); ring.lookAt(mWash.position.clone().multiplyScalar(2)); g.add(ring);
    const labels = [];
    if (p.labels) {
      for (const [ll, txt] of [[TOKIO, 'Japan'], [PEARL, 'Pearl Harbor'], [WASHINGTON, 'USA'], [BERLIN, 'Deutschland'], [ROM, 'Italien']]) {
        const l = H.label(txt, { size: .55, color: '#f4f1ea', bg: 'rgba(20,25,35,.75)', depth: true });
        l.position.copy(H.latLon(ll[0], ll[1], 6.1)); g.add(l); labels.push([l, ll]);
      }
    }
    return {
      update(t, p) {
        g.rotation.y = H.lerp(p.rotStart, p.rotEnd, H.easeInOut(t / p.duration)) * Math.PI / 180;
        attack.userData.setProgress(H.span(t, p.tAttack, p.tAttack + 1.6));
        boom.userData.at(t - (p.tAttack + 1.6));
        const usa = H.span(t, p.tUSA, p.tUSA + 1);
        mWash.scale.setScalar(.5 + usa * (1 + .3 * H.pulse(t, 1.2)));
        const rk = (t - p.tUSA) % 1.6 / 1.6;
        ring.visible = t > p.tUSA; ring.scale.setScalar(.3 + rk * 1.4); ring.material.opacity = (1 - rk) * .8;
        declB.userData.setProgress(H.span(t, p.tDeclare, p.tDeclare + 1.8));
        declR.userData.setProgress(H.span(t, p.tDeclare + .4, p.tDeclare + 2.2));
        mBerlin.scale.setScalar(t > p.tDeclare ? 1.3 : .8); mRom.scale.setScalar(t > p.tDeclare + .4 ? 1.3 : .8);
        for (const [l, ll] of labels) {
          const show = ll === TOKIO || ll === PEARL ? t > p.tAttack : ll === WASHINGTON ? t > p.tUSA : t > p.tDeclare;
          l.material.opacity = show ? 1 : 0;
        }
      }
    };
  }
};
