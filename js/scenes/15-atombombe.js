import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'atombombe', title: 'Atombombe', seed: 25, duration: 10, rev: 2,
  script: 'Daraufhin werfen die USA zwei Atombomben auf Japan. Eine auf Hiroshima, die andere auf Nagasaki. Zehntausende sterben.',
  caption: { title: 'Hiroshima', sub: '6. August 1945' },
  params: {
    tRelease: { type: 'number', min: 0, max: 8, step: .1, value: 1.2, label: 'Abwurf bei (s)' },
    fallDur: { type: 'number', min: .5, max: 6, step: .1, value: 2.2, label: 'Fallzeit (s)' },
    flashDur: { type: 'number', min: .1, max: 3, step: .05, value: .9, label: 'Weißblitz Dauer (s)' },
    cloudHeight: { type: 'number', min: 5, max: 40, step: 1, value: 44, label: 'Pilzhöhe' },
    shock: { type: 'number', min: 0, max: 1, step: .05, value: .8, label: 'Druckwelle' },
    skyColor: { type: 'color', value: '#6f7d8c', label: 'Himmel' },
    cityColor: { type: 'color', value: '#b9aa94', label: 'Stadt' },
    fireColor: { type: 'color', value: '#e8893a', label: 'Feuerball' },
    cloudColor: { type: 'color', value: '#7d7a76', label: 'Wolke' },
    ...H.cameraParams([-78, 58, 128], [-62, 50, 108], [0, 12, -14], 40)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 90, 300);
    const L = H.lights(scene, { sun: [10, 18, 8], intensity: 1.2, hemi: .9, shadows, skyColor: p.skyColor, groundColor: '#665', shadowSize: 120 });
    // ---------- Hiroshima im Flussdelta des Ōta: sechs Flussarme fächern nach Süden zur Bucht auf, dazwischen
    // Inseln mit dichtem Straßenraster aus Holzhäusern (instanziert), Steinbauten im Zentrum, Ausstellungshalle mit
    // Kuppel nahe dem Hypozentrum, Burg mit Graben im Norden, Brücken, Berge ringsum ----------
    scene.add(H.ground(700, '#a69c86'));
    const RIV = [[-64, 5.5], [-41, 4.5], [-19, 5.0], [6, 6.0], [31, 4.5], [57, 5.0]];
    const riverX = (i, z) => RIV[i][0] * (1 + .32 * Math.max(0, z) / 100) + 3.2 * Math.sin(z * .035 + i * 1.7);
    const bayZ = x => 78 + 9 * Math.sin(x * .025 + 1);
    const water = (x, z, m = 0) => z > bayZ(x) - m || RIV.some(([, w], i) => z > -130 && Math.abs(x - riverX(i, z)) < w / 2 + m);
    const waterMat = new THREE.MeshStandardMaterial({ color: '#5f7f96', roughness: .35, metalness: .1, side: THREE.DoubleSide });
    RIV.forEach(([, w], i) => {                                                      // Flussarme als Bänder
      const pos = [], idx = [];
      for (let k = 0; k <= 60; k++) { const z = -140 + k * 4, x = riverX(i, z); pos.push(x - w / 2, .03, z, x + w / 2, .03, z); if (k < 60) idx.push(k * 2, k * 2 + 1, k * 2 + 2, k * 2 + 1, k * 2 + 3, k * 2 + 2); }
      const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3)); geo.setIndex(idx); geo.computeVertexNormals();
      const m = new THREE.Mesh(geo, waterMat); m.receiveShadow = true; scene.add(m);
    });
    const bay = new THREE.Mesh(new THREE.PlaneGeometry(700, 300, 60, 1), waterMat); bay.rotation.x = -Math.PI / 2;
    { const bp = bay.geometry.attributes.position; for (let i = 0; i < bp.count; i++) { const x = bp.getX(i); if (bp.getY(i) > 0) bp.setY(i, -(bayZ(x) - 1)); else bp.setY(i, -400); } }
    bay.position.y = .03; scene.add(bay);
    // Häuser: Straßenraster (Hauptstraßen alle 18 m), dicht bebaut, Gärten ausgespart
    const bodyGeo = new THREE.BoxGeometry(1, 1, 1); bodyGeo.translate(0, .5, 0);
    const roofGeo = new THREE.ConeGeometry(.78, .55, 4); roofGeo.rotateY(Math.PI / 4); roofGeo.translate(0, .27, 0);
    const houses = [];
    for (let x = -150; x <= 150; x += 3.1) for (let z = -120; z <= 82; z += 3.1) {
      const jx = x + (r() - .5) * .8, jz = z + (r() - .5) * .8;
      if (water(jx, jz, 1.6) || ((jx % 18) + 18) % 18 < 2.4 || ((jz % 18) + 18) % 18 < 2.4 || r() < .1) continue;
      if (Math.hypot(jx + 10, jz + 48) < 14) continue;                                // Burgbezirk
      const w = 1.9 + r() * .9, d = 1.9 + r() * .9, h = 1.3 + r() * .9;
      houses.push({ x: jx, z: jz, w, d, h, ry: (r() - .5) * .12, c: r(), dist: Math.hypot(jx, jz), ang: Math.atan2(jz, jx) });
    }
    const body = new THREE.InstancedMesh(bodyGeo, new THREE.MeshLambertMaterial({ color: '#ffffff' }), houses.length);
    const roof = new THREE.InstancedMesh(roofGeo, new THREE.MeshLambertMaterial({ color: '#ffffff', flatShading: true }), houses.length);
    body.castShadow = roof.castShadow = true; body.receiveShadow = true;
    const wallCols = [p.cityColor, '#a79b88', '#cbbfa8', '#9c8f7c'].map(c => new THREE.Color(c)), roofCols = ['#4a4a50', '#56514b', '#3d4046'].map(c => new THREE.Color(c));
    houses.forEach((h, i) => { body.setColorAt(i, wallCols[Math.floor(h.c * 4)]); roof.setColorAt(i, roofCols[Math.floor(h.c * 30) % 3]); });
    scene.add(body, roof);
    const M = new THREE.Matrix4(), Qh = new THREE.Quaternion(), Sv = new THREE.Vector3(), Pv = new THREE.Vector3(), E = new THREE.Euler();
    const tmpC = new THREE.Color(), charred = new THREE.Color('#3b3735'); let colDirty = false;
    const placeHouses = (radius, shock) => {
      houses.forEach((h, i) => {
        // Druckwelle: Häuser stürzen zu flachen Trümmerhaufen ein (nach innen stärker), leicht vom Zentrum weg geneigt, verkohlt
        const hit = shock * H.easeOut(H.span(radius - h.dist, 0, 6)) * (1 - H.smooth(H.span(h.dist, 70, 120)) * .6);
        E.set(Math.sin(h.ang) * hit * .22, h.ry + hit * (h.c - .5), -Math.cos(h.ang) * hit * .22); Qh.setFromEuler(E);
        const hh = h.h * (1 - hit * .85);
        Pv.set(h.x, 0, h.z); Sv.set(h.w * (1 + hit * .15), hh, h.d * (1 + hit * .15)); M.compose(Pv, Qh, Sv); body.setMatrixAt(i, M);
        Pv.set(h.x, hh, h.z); Sv.set(Math.max(h.w, h.d) * 1.25 * (1 - hit), Math.max(.01, 1 - hit), Math.max(h.w, h.d) * 1.25 * (1 - hit)); M.compose(Pv, Qh, Sv); roof.setMatrixAt(i, M);
        if (hit !== h.lastHit) { body.setColorAt(i, tmpC.copy(wallCols[Math.floor(h.c * 4)]).lerp(charred, hit)); h.lastHit = hit; colDirty = true; }
      });
      body.instanceMatrix.needsUpdate = roof.instanceMatrix.needsUpdate = true;
      if (colDirty && body.instanceColor) { body.instanceColor.needsUpdate = true; colDirty = false; }
    };
    placeHouses(0, 0);
    // Steinbauten im Zentrum (Banken, Kaufhäuser, Verwaltung)
    const city = new THREE.Group();
    for (let i = 0; i < 46; i++) {
      const ang = r() * 6.28, d = 8 + r() * 46, x = Math.cos(ang) * d, z = Math.sin(ang) * d;
      if (water(x, z, 4)) continue;
      const b = H.building(4 + r() * 4, 4 + r() * 8, 4 + r() * 4, ['#8f8577', '#9a9184', '#7f786d'][i % 3], { r, roof: true });
      b.position.set(x, 0, z); b.rotation.y = (r() - .5) * .2; city.add(b);
    }
    // Ausstellungshalle für Industrieförderung mit Kuppel (heute Atombombenkuppel), Hypozentrum fast darüber
    const hall = new THREE.Group();
    { const base = H.box(12, 5, 7, '#a59a86'); base.position.y = 2.5; hall.add(base); const tower = H.box(5, 7, 5, '#a59a86'); tower.position.y = 3.5; hall.add(tower);
      const drum = H.cyl(2.2, 2.2, 1.5, '#a59a86', 12); drum.position.y = 7.7; hall.add(drum);
      const dome = H.mesh(new THREE.SphereGeometry(2.3, 12, 6, 0, Math.PI * 2, 0, Math.PI / 2), '#5f8a78'); dome.position.y = 8.4; hall.add(dome); }
    hall.position.set(riverX(3, 3) - 8, 0, 3); city.add(hall);
    scene.add(city);
    const blds = city.children.map(b => ({ b, d: Math.hypot(b.position.x, b.position.z), ang: Math.atan2(b.position.z, b.position.x) }));
    // Burg Hiroshima: Graben, Sockel, mehrstöckiger Turm
    { const moat = new THREE.Mesh(new THREE.RingGeometry(9, 12, 4, 1), waterMat); moat.rotation.x = -Math.PI / 2; moat.rotation.z = Math.PI / 4; moat.position.set(-10, .04, -48); scene.add(moat);
      const keep = new THREE.Group(); [[8, 3], [6.2, 2.6], [4.6, 2.3], [3.2, 2.1]].forEach(([w, h], k) => { const f = H.box(w, h, w, '#e2ddd2'); f.position.y = 2 + k * 2.6 + h / 2; keep.add(f); const rf = H.mesh(new THREE.ConeGeometry(w * .82, 1.1, 4), '#3d4046'); rf.rotation.y = Math.PI / 4; rf.position.y = 2 + k * 2.6 + h + .4; keep.add(rf); });
      const stone = H.box(9, 2, 9, '#8b8478'); stone.position.y = 1; keep.add(stone); keep.position.set(-10, 0, -48); scene.add(keep);
      for (let k = 0; k < 14; k++) { const tr = H.tree('#4f6a46', 3 + r() * 2); const a2 = k / 14 * 6.28; tr.position.set(-10 + Math.cos(a2) * 6.5, 0, -48 + Math.sin(a2) * 6.5); scene.add(tr); } }
    // Brücken über die Flussarme an den Hauptstraßen (inklusive T-förmiger Aioi-Brücke am Hypozentrum)
    for (let i = 0; i < RIV.length; i++) for (let z = -108; z <= 72; z += 36) {
      const x = riverX(i, z), w = RIV[i][1] + 2;
      const br = H.box(w, .35, 2.2, '#6b6660'); br.position.set(x, .35, z); br.rotation.y = -Math.atan(.0032 * RIV[i][0]) ; scene.add(br);
    }
    { const ax = riverX(3, -6); const t1 = H.box(RIV[3][1] + 2, .35, 2.4, '#6b6660'); t1.position.set(ax, .35, -6); scene.add(t1); const t2 = H.box(2.4, .35, 7, '#6b6660'); t2.position.set(ax, .36, -2.5); scene.add(t2); }
    // Berge im Norden, Osten und Westen, Inseln in der Bucht
    for (let i = 0; i < 16; i++) { const a2 = Math.PI * (1.05 + i / 15 * .9), d = 165 + r() * 40; const hill = H.sphere(22 + r() * 22, ['#4e5a4a', '#56624f', '#475244'][i % 3], 16); hill.position.set(Math.cos(a2) * d * 1.3, -10 - r() * 6, Math.sin(a2) * d * .9 - 20); hill.scale.y = .5; scene.add(hill); }
    for (let i = 0; i < 4; i++) { const isl = H.sphere(14 + r() * 10, '#56624f', 14); isl.position.set(-120 + i * 80 + r() * 20, -7, 150 + r() * 30); isl.scale.y = .45; scene.add(isl); }
    const fires = [];
    for (let i = 0; i < 14; i++) { const ang = r() * 6.28, d = 18 + r() * 55, x = Math.cos(ang) * d, z = Math.sin(ang) * d; if (water(x, z, 2)) continue; const f = H.flame(r, { size: 1.6 + r() * 1.4 }); f.position.set(x, 0, z); f.visible = false; scene.add(f); fires.push(f); }
    const bomber = H.faceZ(H.aircraft(H.glowMat(H.ROLE.west, 1.6), { span: 7.5, length: 5.5, engines: 4 })); bomber.rotation.y = Math.PI / 2; scene.add(bomber);
    const bomb = H.cyl(.35, .35, 1.6, '#3a3d44', 10); bomb.castShadow = false; scene.add(bomb);
    const fireball = H.mesh(H.isLowPoly() ? new THREE.IcosahedronGeometry(1, 1) : new THREE.SphereGeometry(1, 20, 14), new THREE.MeshBasicMaterial({ color: p.fireColor, vertexColors: H.isLowPoly() })); fireball.castShadow = fireball.receiveShadow = false; fireball.visible = false; scene.add(fireball);
    const cloudMat = new THREE.MeshBasicMaterial({ color: p.cloudColor, vertexColors: H.isLowPoly() });  // flach, ohne Schattierung (Papier-Look), im Low-Poly-Look mit Facetten-Helligkeit
    const stem = H.cyl(1, 1.6, 1, cloudMat, 20); stem.castShadow = stem.receiveShadow = false; stem.visible = false; scene.add(stem);
    const cap = new THREE.Group();
    for (let i = 0; i < 10; i++) { const s = H.sphere(1, cloudMat, 14); s.castShadow = s.receiveShadow = false; s.position.set(Math.cos(i / 10 * 6.28) * 1.1, (r() - .5) * .5, Math.sin(i / 10 * 6.28) * 1.1); s.scale.setScalar(.9 + r() * .4); cap.add(s); }
    const capCore = H.sphere(1.5, cloudMat, 16); capCore.castShadow = capCore.receiveShadow = false; cap.add(capCore); cap.visible = false; scene.add(cap);
    const shockRing = new THREE.Mesh(new THREE.RingGeometry(.94, 1, 64), new THREE.MeshBasicMaterial({ color: '#f1efe8', transparent: true, side: THREE.DoubleSide, depthWrite: false })); shockRing.rotation.x = -Math.PI / 2; shockRing.position.y = .4; shockRing.visible = false; scene.add(shockRing);
    const flashLight = new THREE.PointLight('#ffffff', 0, 400); flashLight.position.set(0, 6, 0); scene.add(flashLight);
    const skyBase = new THREE.Color(p.skyColor), white = new THREE.Color('#ffffff'), skyAfter = new THREE.Color('#8e8a82');
    const bomberSpeed = 14;
    return {
      update(t, p) {
        const tHit = p.tRelease + p.fallDur;
        const xRel = -bomberSpeed * p.fallDur;                                        // Abwurfpunkt so, dass die Bombe über dem Hypozentrum zündet
        bomber.position.set(xRel + (t - p.tRelease) * bomberSpeed, 50, 0);
        const age = t - p.tRelease;
        if (age >= 0 && age < p.fallDur) {
          const u = age / p.fallDur;
          bomb.visible = true; bomb.position.set(xRel + age * bomberSpeed, 49 - 43 * u * u, 0);
          bomb.rotation.z = Math.PI / 2 - Math.atan2(86 * u / p.fallDur, bomberSpeed);   // Spitze entlang der Fallkurve
        } else bomb.visible = false;
        const a = t - tHit;
        const fl = a < 0 ? 0 : 1 - H.span(a, 0, p.flashDur);
        scene.background.copy(skyBase).lerp(a < 0 ? skyBase : skyAfter, H.span(a, 0, 4)).lerp(white, H.easeOut(fl));
        scene.fog.color.copy(scene.background);
        flashLight.intensity = fl * 400;
        L.sun.intensity = 1.2 - .5 * H.span(a, 0, 4);
        fireball.visible = a > 0 && a < 2.4;
        if (fireball.visible) { const k = H.easeOut(a / 2.4); fireball.position.set(0, 6 + k * 14, 0); fireball.scale.setScalar(1 + k * 12); fireball.material.color.set(p.fireColor).lerp(new THREE.Color(p.cloudColor), H.span(a, .8, 2.4)); }
        const g = H.span(a, .3, 6);
        stem.visible = cap.visible = a > .3;
        const hgt = H.easeOut(g) * p.cloudHeight;
        stem.position.y = hgt * .5; stem.scale.set(1.5 + g * 4, hgt, 1.5 + g * 4);
        cap.position.y = hgt; cap.scale.setScalar(1 + H.easeOut(g) * 9);
        cap.rotation.y = a * .08;
        const sr = H.span(a, .1, 3.5);
        shockRing.visible = sr > 0 && sr < 1; shockRing.scale.setScalar(.5 + sr * 95); shockRing.material.opacity = (1 - sr) * .9;
        const radius = .5 + sr * 95;
        placeHouses(sr > 0 ? radius : 0, p.shock);
        for (const o of blds) {
          // Steinbauten: Mauern bleiben teils stehen (Gerippe), Dach und obere Geschosse stürzen ein, leicht geneigt
          const hit = p.shock * H.easeOut(H.span(radius - o.d, 0, 8)) * (sr > 0 ? 1 : 0);
          o.b.rotation.z = -Math.cos(o.ang) * hit * .12; o.b.rotation.x = Math.sin(o.ang) * hit * .12;
          o.b.scale.y = 1 - hit * .55;
        }
        for (const f of fires) { const fa = a - 1.2 - f.position.length() * .02; f.visible = fa > 0; if (fa > 0) { f.userData.at(t); f.scale.setScalar(Math.min(1, fa)); } }
      }
    };
  }
};
