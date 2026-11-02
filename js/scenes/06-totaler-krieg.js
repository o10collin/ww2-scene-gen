import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'totaler-krieg', title: 'Totaler Krieg', seed: 16, duration: 7,
  script: 'Wenig später ruft die NS-Regierung den „totalen Krieg“ aus.',
  caption: { title: '„Totaler Krieg“', sub: 'Februar 1943' },
  params: {
    rows: { type: 'number', min: 2, max: 14, step: 1, value: 8, label: 'Reihen Publikum' },
    cols: { type: 'number', min: 4, max: 24, step: 1, value: 14, label: 'Figuren pro Reihe' },
    banners: { type: 'number', min: 0, max: 9, step: 1, value: 5, label: 'Banner' },
    bannerColor: { type: 'color', value: '#b23a2f', label: 'Bannerfarbe' },
    wallColor: { type: 'color', value: '#2a2d35', label: 'Wand' },
    crowdColor: { type: 'color', value: '#5b5f6a', label: 'Publikum' },
    tRaise: { type: 'number', min: 0, max: 10, step: .1, value: 3.8, label: 'Arme hoch ab (s)' },
    spotIntensity: { type: 'number', min: 0, max: 600, step: 10, value: 260, label: 'Scheinwerfer' },
    ...H.cameraParams([0, 2.6, 24], [0, 4, 15], [0, 3, -8], 42)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, '#121419', 20, 70);
    H.lights(scene, { sun: [0, 14, 6], intensity: .35, hemi: .35, shadows, skyColor: '#667', groundColor: '#111', shadowSize: 30 });
    scene.add(H.ground(120, '#1e2026'));
    const wall = H.box(60, 24, 1, p.wallColor); wall.position.set(0, 12, -14); scene.add(wall);
    for (let i = 0; i < p.banners; i++) {
      const b = H.box(3, 16, .1, p.bannerColor); b.position.set((i - (p.banners - 1) / 2) * 6, 11, -13.4); scene.add(b);
    }
    const stage = H.box(22, 1.4, 6, '#33363e'); stage.position.set(0, .7, -9); scene.add(stage);
    const podium = H.box(1.6, 1.3, 1, '#4a4038'); podium.position.set(0, 2.05, -8); scene.add(podium);
    const speaker = H.figure({ color: '#1c1d22', head: P.skin }); speaker.position.set(0, 1.4, -8.8); speaker.rotation.y = Math.PI / 2; scene.add(speaker);
    const [, , , , armL, armR] = speaker.children;
    const mics = H.cyl(.03, .03, .6, P.black, 6); mics.position.set(0, 3.0, -7.6); scene.add(mics);
    for (const x of [-7, 7]) {
      const sp = new THREE.SpotLight('#fff2d6', p.spotIntensity, 40, .35, .5, 1.2);
      sp.position.set(x, 16, 2); sp.target.position.set(0, 2.5, -8.5); sp.castShadow = false;
      scene.add(sp, sp.target);
      const beam = new THREE.Mesh(new THREE.ConeGeometry(4, 18, 24, 1, true), new THREE.MeshBasicMaterial({ color: '#fff2d6', transparent: true, opacity: .07, side: THREE.DoubleSide, depthWrite: false }));
      beam.position.copy(sp.position).lerp(sp.target.position, .5);
      beam.lookAt(sp.target.position); beam.rotateX(-Math.PI / 2); scene.add(beam);
    }
    const crowd = [];
    for (let i = 0; i < p.rows; i++) for (let j = 0; j < p.cols; j++) {
      const f = H.figure({ color: p.crowdColor, head: r() < .5 ? P.skin : '#c9a98d' });
      f.position.set((j - (p.cols - 1) / 2) * 1.4 + (r() - .5) * .5, 0, 2 - i * 1.7 + (r() - .5) * .5);
      f.rotation.y = Math.PI / 2 + (r() - .5) * .3; scene.add(f);
      crowd.push({ f, arms: [f.children[4], f.children[5]], ph: r() * 6, delay: r() * .8 });
    }
    return {
      update(t, p) {
        const g = Math.sin(t * 5) * .3;
        armL.rotation.z = -1.3 + g; armR.rotation.z = 1.0 - g * .6 + Math.sin(t * 3.1) * .3;
        speaker.position.y = 1.4 + Math.abs(Math.sin(t * 5)) * .05;
        for (const c of crowd) {
          const up = H.easeOut(H.span(t, p.tRaise + c.delay, p.tRaise + c.delay + .6));
          c.f.position.y = Math.sin(t * 2 + c.ph) * .03 * (1 + up * 3);
          c.arms[0].rotation.z = -up * (2.6 + Math.sin(t * 6 + c.ph) * .15);
          c.arms[1].rotation.z = up * .2;
        }
      }
    };
  }
};
