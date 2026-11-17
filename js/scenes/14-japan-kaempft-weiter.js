import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

const JAPAN = [36.2, 138.3], PEARL = [21.3, -157.9];

export default {
  id: 'japan-kaempft-weiter', title: 'Japan kämpft weiter', seed: 24, duration: 7,
  script: 'Obwohl Deutschland den Krieg verliert, kämpft Japan weiter.',
  caption: { title: 'Der Krieg im Pazifik geht weiter', sub: 'Sommer 1945' },
  params: {
    rotStart: { type: 'number', min: -360, max: 360, step: 1, value: 120, label: 'Drehung Start (°)' },
    rotEnd: { type: 'number', min: -360, max: 360, step: 1, value: 100, label: 'Drehung Ende (°)' },
    tilt: { type: 'number', min: -45, max: 45, step: 1, value: 15, label: 'Neigung (°)' },
    fleet: { type: 'number', min: 0, max: 12, step: 1, value: 6, label: 'Schiffe US-Flotte' },
    oceanColor: { type: 'color', value: '#0e1520', label: 'Ozean' },
    landColor: { type: 'color', value: '#767b82', label: 'Land' },
    spaceColor: { type: 'color', value: '#07090e', label: 'Hintergrund' },
    japanColor: { type: 'color', value: '#c6473a', label: 'Japan-Markierung' },
    labels: { type: 'boolean', value: true, label: 'Beschriftungen' },
    ...H.cameraParams([0, 2.5, 13], [.5, 2, 11.5], [0, 0, 0], 40)
  },
  build({ scene, params: p, rng: r, shadows }) {
    scene.background = new THREE.Color(p.spaceColor);
    H.lights(scene, { sun: [8, 6, 10], shadows: false, intensity: 1.4, hemi: .7, skyColor: '#ffffff', groundColor: '#223' });
    const stars = H.particles(r, { count: 400, area: [80, 60, 20], color: '#ffffff', size: .12, opacity: .7 }); stars.position.z = -30; scene.add(stars);
    const g = H.globe(5, { ocean: p.oceanColor, land: p.landColor }); g.rotation.x = p.tilt * Math.PI / 180; scene.add(g);
    const U = g.userData;
    const jp = U.marker(JAPAN[0], JAPAN[1], p.japanColor, .22); jp.material = H.glowMat(H.ROLE.axis, 2);
    const ring = new THREE.Mesh(new THREE.RingGeometry(.9, 1, 32), new THREE.MeshBasicMaterial({ color: p.japanColor, transparent: true, side: THREE.DoubleSide }));
    ring.position.copy(jp.position); ring.lookAt(jp.position.clone().multiplyScalar(2)); g.add(ring);
    const route = U.arc(PEARL, JAPAN, '#9fb3c2', { lift: 1.12, radius: .03 }); route.userData.setProgress(1); route.material.transparent = true; route.material.opacity = .35;
    const p0 = H.latLon(PEARL[0], PEARL[1], 5), p2 = H.latLon(JAPAN[0], JAPAN[1], 5);
    const mid = p0.clone().add(p2).multiplyScalar(.5).normalize().multiplyScalar(5.3);
    const curve = new THREE.QuadraticBezierCurve3(p0, mid, p2);
    const ships = [];
    for (let i = 0; i < p.fleet; i++) { const s = H.box(.22, .1, .1, H.glowMat(H.ROLE.west, 1.8)); s.castShadow = false; g.add(s); ships.push({ s, lag: i * .07 + (r() - .5) * .03, side: (r() - .5) * .25 }); }
    if (p.labels) {
      const l1 = H.label('Japan', { size: .6, bg: 'rgba(20,25,35,.75)', depth: true }); l1.position.copy(H.latLon(JAPAN[0] + 5, JAPAN[1], 6.2)); g.add(l1);
      const l2 = H.label('USA (Pazifikflotte)', { size: .5, bg: 'rgba(20,25,35,.75)', depth: true }); l2.position.copy(H.latLon(PEARL[0] - 5, PEARL[1] - 6, 6.4)); g.add(l2);
    }
    const n = new THREE.Vector3();
    return {
      update(t, p) {
        g.rotation.y = H.lerp(p.rotStart, p.rotEnd, H.easeInOut(t / p.duration)) * Math.PI / 180;
        jp.scale.setScalar(1 + .35 * H.pulse(t, 1.4));
        const rk = (t % 1.5) / 1.5; ring.scale.setScalar(.3 + rk * 1.6); ring.material.opacity = (1 - rk) * .8;
        for (const sh of ships) {
          const u = H.clamp(H.span(t, .5, p.duration) * .7 - sh.lag, 0, 1);
          curve.getPoint(u, sh.s.position); n.copy(sh.s.position).normalize();
          sh.s.position.addScaledVector(n, .05); sh.s.lookAt(n.clone().multiplyScalar(20)); sh.s.rotateX(Math.PI / 2);
        }
      }
    };
  }
};
