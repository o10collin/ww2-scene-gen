import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'atombombe', title: 'Atombombe', seed: 25, duration: 10,
  script: 'Daraufhin werfen die USA zwei Atombomben auf Japan. Eine auf Hiroshima, die andere auf Nagasaki. Zehntausende sterben.',
  caption: { title: 'Hiroshima', sub: '6. August 1945' },
  params: {
    tRelease: { type: 'number', min: 0, max: 8, step: .1, value: 1.2, label: 'Abwurf bei (s)' },
    fallDur: { type: 'number', min: .5, max: 6, step: .1, value: 2.2, label: 'Fallzeit (s)' },
    flashDur: { type: 'number', min: .1, max: 3, step: .05, value: .9, label: 'Weißblitz Dauer (s)' },
    cloudHeight: { type: 'number', min: 5, max: 40, step: 1, value: 20, label: 'Pilzhöhe' },
    buildings: { type: 'number', min: 10, max: 150, step: 5, value: 90, label: 'Gebäude' },
    shock: { type: 'number', min: 0, max: 1, step: .05, value: .8, label: 'Druckwelle' },
    skyColor: { type: 'color', value: '#6f7d8c', label: 'Himmel' },
    cityColor: { type: 'color', value: '#b9aa94', label: 'Stadt' },
    fireColor: { type: 'color', value: '#e8893a', label: 'Feuerball' },
    cloudColor: { type: 'color', value: '#7d7a76', label: 'Wolke' },
    ...H.cameraParams([-34, 16, 72], [-22, 14, 60], [0, 9, -6], 40)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 60, 170);
    const L = H.lights(scene, { sun: [10, 18, 8], intensity: 1.2, hemi: .9, shadows, skyColor: p.skyColor, groundColor: '#665', shadowSize: 60 });
    scene.add(H.ground(300, '#a69c86'));
    const river = H.box(300, .05, 5, '#6d8ea3'); river.position.set(0, .02, 6); river.castShadow = false; scene.add(river);
    const city = new THREE.Group();
    const cols = Math.ceil(Math.sqrt(p.buildings)), cell = 80 / cols;
    for (let i = 0; i < p.buildings; i++) {
      const cx = (i % cols + .5) * cell - 40, cz = (Math.floor(i / cols) + .5) * cell - 40;
      if (Math.hypot(cx, cz) < 3 || Math.abs(cz - 6) < 3) continue;
      const w = cell - 1.6 - r() * 1.2, d = cell - 1.6 - r() * 1.2;
      const b = r() < .7 ? H.pagodaHouse(w, d, [p.cityColor, '#a79b88', '#cbbfa8'][i % 3]) : H.building(w, 2 + r() * 4, d, '#8f8577', { r, roof: true });
      b.position.set(cx + (r() - .5) * .6, 0, cz + (r() - .5) * .6); b.rotation.y = (r() - .5) * .2; city.add(b);
    }
    scene.add(city);
    for (let i = 0; i < 3; i++) { const br = H.box(1.6, .3, 7, '#6b6660'); br.position.set(-24 + i * 24, .3, 6); scene.add(br); for (const z of [2.8, 9.2]) { const rail = H.box(1.7, .4, .1, '#4a4642'); rail.position.set(br.position.x, .65, z); scene.add(rail); } }
    for (let i = 0; i < 6; i++) { const hill = H.sphere(10 + r() * 14, '#4e5a4a', 16); hill.position.set(-70 + i * 30, -8 - r() * 3, -60 - r() * 20); hill.scale.y = .45; scene.add(hill); }
    const blds = city.children.map(b => ({ b, d: Math.hypot(b.position.x, b.position.z), ang: Math.atan2(b.position.z, b.position.x) }));
    const bomber = H.faceZ(H.aircraft(H.glowMat(H.ROLE.west, 1.6), { span: 7.5, length: 5.5, engines: 4 })); bomber.rotation.y = Math.PI / 2; scene.add(bomber);
    const bomb = H.cyl(.35, .35, 1.6, '#3a3d44', 10); bomb.castShadow = false; scene.add(bomb);
    const fireball = H.mesh(H.isLowPoly() ? new THREE.IcosahedronGeometry(1, 1) : new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: p.fireColor, vertexColors: H.isLowPoly() })); fireball.castShadow = fireball.receiveShadow = false; fireball.visible = false; scene.add(fireball);
    const cloudMat = new THREE.MeshBasicMaterial({ color: p.cloudColor, vertexColors: H.isLowPoly() });  // flach, ohne Schattierung (Papier-Look), im Low-Poly-Look mit Facetten-Helligkeit
    const stem = H.cyl(1, 1.6, 1, cloudMat, 20); stem.castShadow = stem.receiveShadow = false; stem.visible = false; scene.add(stem);
    const cap = new THREE.Group();
    for (let i = 0; i < 10; i++) { const s = H.sphere(1, cloudMat, 14); s.castShadow = s.receiveShadow = false; s.position.set(Math.cos(i / 10 * 6.28) * 1.1, (r() - .5) * .5, Math.sin(i / 10 * 6.28) * 1.1); s.scale.setScalar(.9 + r() * .4); cap.add(s); }
    const capCore = H.sphere(1.5, cloudMat, 16); capCore.castShadow = capCore.receiveShadow = false; cap.add(capCore); cap.visible = false; scene.add(cap);
    const shockRing = new THREE.Mesh(new THREE.RingGeometry(.94, 1, 64), new THREE.MeshBasicMaterial({ color: '#f1efe8', transparent: true, side: THREE.DoubleSide, depthWrite: false })); shockRing.rotation.x = -Math.PI / 2; shockRing.position.y = .4; shockRing.visible = false; scene.add(shockRing);
    const flashLight = new THREE.PointLight('#ffffff', 0, 200); flashLight.position.set(0, 6, 0); scene.add(flashLight);
    const skyBase = new THREE.Color(p.skyColor), white = new THREE.Color('#ffffff'), skyAfter = new THREE.Color('#8e8a82');
    const bomberSpeed = 9;
    return {
      update(t, p) {
        const tHit = p.tRelease + p.fallDur;
        bomber.position.set(-70 + t * bomberSpeed, 24, -8);
        const age = t - p.tRelease;
        if (age >= 0 && age < p.fallDur) {
          const u = age / p.fallDur;
          bomb.visible = true; bomb.position.set(-70 + p.tRelease * bomberSpeed + age * bomberSpeed * .4, 24 - 18 * u * u, -8);
          bomb.rotation.z = -u * 1.2;
        } else bomb.visible = false;
        const a = t - tHit;
        const fl = a < 0 ? 0 : 1 - H.span(a, 0, p.flashDur);
        scene.background.copy(skyBase).lerp(a < 0 ? skyBase : skyAfter, H.span(a, 0, 4)).lerp(white, H.easeOut(fl));
        scene.fog.color.copy(scene.background);
        flashLight.intensity = fl * 400;
        L.sun.intensity = 1.2 - .5 * H.span(a, 0, 4);
        fireball.visible = a > 0 && a < 2.4;
        if (fireball.visible) { const k = H.easeOut(a / 2.4); fireball.position.set(0, 6 + k * 8, 0); fireball.scale.setScalar(.5 + k * 7); fireball.material.color.set(p.fireColor).lerp(new THREE.Color(p.cloudColor), H.span(a, .8, 2.4)); }
        const g = H.span(a, .3, 6);
        stem.visible = cap.visible = a > .3;
        const hgt = H.easeOut(g) * p.cloudHeight;
        stem.position.y = hgt * .5; stem.scale.set(1 + g * 2.2, hgt, 1 + g * 2.2);
        cap.position.y = hgt; cap.scale.setScalar(.5 + H.easeOut(g) * 4.5);
        cap.rotation.y = a * .08;
        const sr = H.span(a, .1, 3.5);
        shockRing.visible = sr > 0 && sr < 1; shockRing.scale.setScalar(.5 + sr * 60); shockRing.material.opacity = (1 - sr) * .9;
        const radius = .5 + sr * 60;
        for (const o of blds) {
          const hit = p.shock * H.easeOut(H.span(radius - o.d, 0, 10)) * (sr > 0 ? 1 : 0);
          o.b.rotation.z = -Math.cos(o.ang) * hit * 1.4; o.b.rotation.x = Math.sin(o.ang) * hit * 1.4;
          o.b.scale.y = 1 - hit * .7;
        }
      }
    };
  }
};
