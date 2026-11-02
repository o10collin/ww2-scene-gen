import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'bombenkrieg', title: 'Bombenkrieg', seed: 18, duration: 10,
  script: 'Auf Seiten der Alliierten wird daraufhin auch eskaliert. Sie fangen damit an, deutsche Städte und Industrieanlagen zu bombardieren.',
  caption: { title: 'Luftkrieg gegen deutsche Städte', sub: '1943' },
  params: {
    bombers: { type: 'number', min: 1, max: 15, step: 1, value: 7, label: 'Bomber' },
    bombsPer: { type: 'number', min: 0, max: 8, step: 1, value: 3, label: 'Bomben je Bomber' },
    buildings: { type: 'number', min: 10, max: 120, step: 5, value: 70, label: 'Gebäude' },
    searchlights: { type: 'number', min: 0, max: 8, step: 1, value: 4, label: 'Suchscheinwerfer' },
    flakGuns: { type: 'number', min: 0, max: 6, step: 1, value: 3, label: 'Flak-Geschütze' },
    flak: { type: 'number', min: 0, max: 40, step: 1, value: 14, label: 'Flak-Wolken' },
    altitude: { type: 'number', min: 8, max: 40, step: 1, value: 20, label: 'Flughöhe' },
    skyColor: { type: 'color', value: '#10141e', label: 'Nachthimmel' },
    fireColor: { type: 'color', value: '#e07b3c', label: 'Feuer' },
    ...H.cameraParams([-34, 16, 62], [-18, 18, 52], [4, 6, 0], 40)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 40, 130);
    H.lights(scene, { sun: [-10, 20, -10], intensity: .5, hemi: .6, shadows, skyColor: '#3a4660', groundColor: '#0a0a0c', shadowSize: 50 });
    scene.add(H.ground(240, '#1a1c22'));
    const city = H.city(r, { count: p.buildings, area: 70, minH: 3, maxH: 14, colors: ['#2e323b', '#3a3f4a', '#262a32'], windows: 3 });
    scene.add(city);
    city.traverse(o => { if (o.isInstancedMesh) { o.material = new THREE.MeshBasicMaterial({ color: '#d9b36a' }); o.visible = r() < .6; } });
    const bombers = [], bombs = [];
    for (let i = 0; i < p.bombers; i++) {
      const b = H.faceZ(H.aircraft(H.glowMat(H.ROLE.west, 1.8), { span: 7, length: 5, engines: 4 }));
      scene.add(b);
      const row = Math.ceil(i / 2), side = i % 2 ? 1 : -1;
      const z = side * row * 6 + (r() - .5), lag = row * 5;
      bombers.push({ b, z, lag, y: p.altitude + r() * 2 });
      for (let k = 0; k < p.bombsPer; k++) {
        const m = H.cone(.25, 1.2, P.black, 6); m.rotation.x = Math.PI; m.castShadow = false; scene.add(m);
        const tRel = 1.5 + r() * 5;
        const fall = Math.sqrt(2 * p.altitude / 9.81) * .9;
        const boom = H.explosion({ size: 2.4, color: p.fireColor, smoke: '#3a3a3a', duration: 2.2 });
        scene.add(boom);
        const fire = H.explosion({ size: 1.2, color: p.fireColor, smoke: '#444', duration: 1.1 }); scene.add(fire);
        const smoke = H.smokeColumn(r, { height: 12, width: 1.5, color: '#2b2b2b' }); smoke.visible = false; scene.add(smoke);
        bombs.push({ m, tRel, fall, boom, fire, smoke, bomber: bombers[i], x: 0, z: 0 });
      }
    }
    const lights = [];
    for (let i = 0; i < p.searchlights; i++) {
      const beam = new THREE.Mesh(new THREE.CylinderGeometry(.15, 2.2, 60, 16, 1, true), new THREE.MeshBasicMaterial({ color: '#e8eefc', transparent: true, opacity: .14, side: THREE.DoubleSide, depthWrite: false }));
      beam.position.set(-30 + r() * 60, 0, -30 + r() * 50);
      beam.geometry.translate(0, 30, 0);
      scene.add(beam); lights.push({ beam, ph: r() * 6, sp: .3 + r() * .4 });
    }
    const flak = [];
    for (let i = 0; i < p.flak; i++) {
      const f = H.explosion({ size: .9, color: '#8a8a8a', smoke: '#5a5a5a', duration: 1.6 });
      f.position.set(-30 + r() * 60, p.altitude - 3 + r() * 8, -25 + r() * 40); scene.add(f);
      flak.push({ f, t0: r() * 9 });
    }
    const speed = 7;
    const church = new THREE.Group();
    const nave = H.box(8, 9, 16, '#2a2e36'); nave.position.y = 4.5; const roof = H.mesh(new THREE.CylinderGeometry(0, 5.6, 4, 4), '#1f2228'); roof.rotation.y = Math.PI / 4; roof.position.y = 11; roof.scale.z = 2.9;
    const tower = H.box(4, 20, 4, '#2a2e36'); tower.position.set(0, 10, 10); const spire = H.cone(2.8, 8, '#1f2228', 4); spire.position.set(0, 24, 10);
    church.add(nave, roof, tower, spire); church.position.set(8, 0, -6); scene.add(church);
    const flaks = [];
    for (let i = 0; i < p.flakGuns; i++) {
      const g = new THREE.Group();
      const base = H.cyl(1, 1.2, .5, '#2a2e36', 10); base.position.y = .25; const mount = H.box(1, .8, 1, '#2a2e36'); mount.position.y = .9;
      const barrel = H.cyl(.08, .1, 3, '#1f2228', 8); barrel.position.set(0, 2.2, .6); barrel.rotation.x = -.5;
      const flash = new THREE.Mesh(new THREE.SphereGeometry(.3, 8, 6), H.glowMat('#ffd27a', 2.2)); flash.position.set(0, 3.6, 1.4); flash.visible = false;
      g.add(base, mount, barrel, flash); g.position.set(-30 + i * 22 + r() * 6, 0, 30 + r() * 10); g.rotation.y = r() * 1.5 - .7; scene.add(g);
      flaks.push({ g, flash, ph: r() * 2 });
    }
    scene.userData.flaks = flaks;

    return {
      update(t, p) {
        for (const b of bombers) { b.b.position.set(-60 + (t * speed) - b.lag, b.y, b.z); b.b.rotation.y = Math.PI / 2; }
        for (const bm of bombs) {
          const age = t - bm.tRel;
          const bx = -60 + bm.tRel * speed - bm.bomber.lag;
          if (age < 0) { bm.m.visible = false; }
          else if (age < bm.fall) {
            bm.m.visible = true;
            bm.m.position.set(bx + age * speed * .5, bm.bomber.y - 0.5 * 9.81 * age * age * (p.altitude / (0.5 * 9.81 * bm.fall * bm.fall)), bm.bomber.z);
          } else bm.m.visible = false;
          const ix = bx + bm.fall * speed * .5;
          bm.boom.position.set(ix, 1.5, bm.bomber.z); bm.boom.userData.at(age - bm.fall);
          bm.fire.position.set(ix, 1, bm.bomber.z);
          const fa = age - bm.fall;
          bm.fire.userData.at(fa > 0 ? (fa % 1.1) : -1); bm.fire.scale.setScalar(fa > 0 ? .5 + .5 * Math.min(1, fa) : 1);
          bm.smoke.position.set(ix, 1.5, bm.bomber.z); bm.smoke.visible = fa > .3; if (fa > .3) bm.smoke.userData.at(fa - .3, .3);
        }
        for (const l of lights) { l.beam.rotation.z = Math.sin(t * l.sp + l.ph) * .5; l.beam.rotation.x = Math.cos(t * l.sp * .7 + l.ph) * .45; }
        for (const f of flak) f.f.userData.at(((t - f.t0) % 4 + 4) % 4);
        for (const fg of scene.userData.flaks) fg.flash.visible = ((t * 2 + fg.ph) % 1) < .08;
      }
    };
  }
};
