import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'kapitulation-europa', title: 'Kapitulation Deutschlands', seed: 23, duration: 8, rev: 3,
  script: 'Am 8. Mai kapituliert Deutschland und setzt dem Zweiten Weltkrieg in Europa ein Ende.',
  caption: { title: 'Kriegsende in Europa', sub: '8. Mai 1945' },
  params: {
    tSign: { type: 'number', min: 0, max: 10, step: .1, value: 1.5, label: 'Unterschrift ab (s)' },
    signDur: { type: 'number', min: .5, max: 8, step: .1, value: 4, label: 'Unterschrift Dauer (s)' },
    flags: { type: 'boolean', value: true, label: 'Flaggen' },
    wallColor: { type: 'color', value: '#3a3f47', label: 'Wand' },
    floorColor: { type: 'color', value: '#2b3038', label: 'Boden' },
    lightColor: { type: 'color', value: '#ffe6c2', label: 'Lampenlicht' },
    ...H.cameraParams([-5, 2.6, 7], [-1.5, 2.1, 4.2], [0, 1, 0], 38)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, '#0e1014', 20, 60);
    H.lights(scene, { sun: [-3, 8, 5], intensity: .6, hemi: .6, shadows, skyColor: p.lightColor, groundColor: '#221', shadowSize: 20 });
    scene.add(H.ground(80, p.floorColor));
    const wall = H.box(40, 10, .5, p.wallColor); wall.position.set(0, 5, -6); scene.add(wall);
    const sideW = H.box(.5, 10, 30, p.wallColor); sideW.position.set(-12, 5, 0); scene.add(sideW);
    for (let i = 0; i < 3; i++) { const win = new THREE.Mesh(new THREE.PlaneGeometry(1.6, 3), new THREE.MeshBasicMaterial({ color: '#d8c8a8' })); win.rotation.y = Math.PI / 2; win.position.set(-11.7, 4.5, -4 + i * 4); scene.add(win); }
    const tbl = H.table(6, 1.6, .8, '#5b4634'); scene.add(tbl);
    const cloth = H.box(6.1, .03, 1.65, '#3e5a3a'); cloth.position.y = .85; scene.add(cloth);
    const pap = H.paper(.3, .42); pap.position.set(0, .885, .45); pap.rotation.y = .06; scene.add(pap);   // etwa A4 im Maßstab der Figuren
    const sig = H.signing(pap, P.black);
    const lampLight = new THREE.PointLight(p.lightColor, 30, 14, 1.5); lampLight.position.set(0, 3.2, 0); scene.add(lampLight);
    const shade = H.cone(.7, .5, '#2a2a2a', 16); shade.rotation.x = Math.PI; shade.position.set(0, 3.4, 0); scene.add(shade);
    // Delegationen hinter dem Tisch
    const roles = [H.ROLE.west, H.ROLE.west, H.ROLE.soviet, H.ROLE.west, H.ROLE.soviet];
    for (let i = 0; i < 5; i++) {
      const f = H.figure({ color: P.grey, glow: roles[i], model: i % 2 ? 'suit' : 'soldier', pose: i === 2 ? 'Sitting_And_Talking_To_Another_Person' : 'Male_Talking_While_Seated', seed: i + 11 });
      f.position.set(-2.6 + i * 1.3, 0, -1.7); f.rotation.y = -Math.PI / 2; scene.add(f);
    }
    // Unterzeichnender vor dem Tisch
    // (Hüfte liegt bei dieser Sitzanimation 18 cm vor und 8 cm höher als bei den Delegierten: Figur etwas tiefer, Stuhl direkt unter der Hüfte)
    const signer = H.figure({ color: '#555a63', glow: H.ROLE.axis, model: 'soldier', pose: 'Male_Writing_While_Seated', seed: 7 }); signer.position.set(0, -.08, 1.02); signer.rotation.y = Math.PI / 2; scene.add(signer);
    const sChair = H.chair(); sChair.rotation.y = Math.PI; sChair.position.set(0, 0, .9); scene.add(sChair);
    // Flaggen der vier Siegermächte an Fahnenstangen mit Standfuß vor der Rückwand (hängendes Tuch, leicht bewegt)
    const flags = [];
    if (p.flags) ['usa', 'uk', 'ussr', 'france'].forEach((k, i) => { const f = H.nationalFlag(k, { w: 1.3, h: .8, pole: 3.1 }); f.position.set(-1.0 + i * 1.9, 0, -5.3); f.rotation.y = .12; scene.add(f); flags.push(f); });
    for (let i = 0; i < 5; i++) { const ch = H.chair(); ch.position.set(-2.6 + i * 1.3, 0, -1.85); scene.add(ch); }
    for (const x of [-1.4, 1.4]) { const st = H.cyl(.015, .015, .4, P.black, 6); st.position.set(x, 1.05, -.3); scene.add(st); const mic = H.cyl(.04, .03, .12, P.black, 8); mic.position.set(x, 1.3, -.3); scene.add(mic); }
    const carpet = H.box(10, .03, 7, '#3b2a2a'); carpet.position.set(0, .02, 0); carpet.receiveShadow = true; scene.add(carpet);
    for (let i = 0; i < 4; i++) { const f = H.paper(.28, .4); f.position.set(-2.4 + i * 1.5, .88, -.42); f.rotation.y = (r() - .5) * .5; scene.add(f); }
    const lampStand = H.cyl(.04, .06, 1.8, '#2a2a2a', 8); lampStand.position.set(5.0, .9, -1); scene.add(lampStand);
    const lampShade = H.cone(.45, .5, '#4a3a2a', 12); lampShade.rotation.x = Math.PI; lampShade.position.set(5.0, 2.0, -1); scene.add(lampShade);
    const standLight = new THREE.PointLight('#ffe0b0', 8, 8, 1.6); standLight.position.set(5.0, 1.7, -1); scene.add(standLight);

    // ---------- Raumdetails (Lagezimmer in Reims): Wandvertäfelung, Wandkarten, Uhr, Hängelampen ----------
    const wainB = H.box(40, 1.1, .08, '#2c2520'); wainB.position.set(0, .55, -5.72); scene.add(wainB);
    const wainS = H.box(.08, 1.1, 30, '#2c2520'); wainS.position.set(-11.72, .55, 0); scene.add(wainS);
    for (const [y, z] of [[1.12, -5.68]]) { const rail = H.box(40, .06, .1, '#4a3b30'); rail.position.set(0, y, z); scene.add(rail); }
    const mapTex = (seed, W = 512, Hh = 340) => {
      const c = document.createElement('canvas'); c.width = W; c.height = Hh; const q = c.getContext('2d');
      q.fillStyle = '#c9c0a4'; q.fillRect(0, 0, W, Hh);
      let rs = seed; const rr = () => (rs = (rs * 16807) % 2147483647) / 2147483647;
      q.fillStyle = '#8fa7b3'; q.beginPath(); q.moveTo(0, 0); for (let x = 0; x <= W; x += 32) q.lineTo(x, 40 + rr() * 90 + Math.sin(x / 60 + seed) * 30); q.lineTo(W, 0); q.fill();   // Meer
      q.strokeStyle = 'rgba(90,70,50,.55)'; q.lineWidth = 2; for (let k = 0; k < 9; k++) { q.beginPath(); let x = rr() * W, y = 120 + rr() * (Hh - 140); q.moveTo(x, y); for (let j = 0; j < 7; j++) { x += (rr() - .5) * 90; y += (rr() - .5) * 60; q.lineTo(x, y); } q.stroke(); }   // Grenzen
      q.strokeStyle = 'rgba(60,60,60,.18)'; q.lineWidth = 1; for (let x = 0; x < W; x += 48) { q.beginPath(); q.moveTo(x, 0); q.lineTo(x, Hh); q.stroke(); } for (let y = 0; y < Hh; y += 48) { q.beginPath(); q.moveTo(0, y); q.lineTo(W, y); q.stroke(); }   // Gitternetz
      for (let k = 0; k < 14; k++) { q.fillStyle = rr() < .5 ? '#b33a2e' : '#2f5fb3'; q.beginPath(); q.arc(rr() * W, 130 + rr() * (Hh - 150), 5, 0, 7); q.fill(); }   // Stecknadeln
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    };
    const wallMap = (x, y, z, w, h, ry, seed) => {
      const fr = H.box(w + .12, h + .12, .05, '#3a2e24'); fr.position.set(x, y, z); fr.rotation.y = ry; scene.add(fr);
      const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshLambertMaterial({ map: mapTex(seed) })); m.position.set(x + Math.sin(ry) * .035, y, z + Math.cos(ry) * .035); m.rotation.y = ry; scene.add(m);
    };
    wallMap(-6.4, 3.0, -5.72, 3.4, 2.2, 0, 11); wallMap(8.6, 3.0, -5.72, 3.0, 2.0, 0, 29); wallMap(-11.7, 3.2, -6.0 + 2, 2.6, 1.8, Math.PI / 2, 47);
    const clock = new THREE.Group(); const face = H.cyl(.32, .32, .05, '#e9e4d6', 24); face.rotation.x = Math.PI / 2; clock.add(face);
    const rim = H.mesh(new THREE.TorusGeometry(.33, .03, 6, 24), '#3a2e24'); clock.add(rim);
    for (const [len, ang] of [[.2, 1.2], [.27, -2.1]]) { const hand = H.box(.02, len, .01, '#111'); hand.geometry.translate(0, len / 2, 0); hand.position.z = .03; hand.rotation.z = ang; clock.add(hand); }
    clock.position.set(3.4, 3.55, -5.68); scene.add(clock);
    for (const x of [-2.3, 2.3]) {
      const cord = H.cyl(.012, .012, 1.4, P.black, 5); cord.position.set(x, 4.3, 0); scene.add(cord);
      const sh = H.cone(.42, .3, '#2a2a2a', 14); sh.rotation.x = Math.PI; sh.position.set(x, 3.5, 0); scene.add(sh);
      const bulb = new THREE.Mesh(new THREE.SphereGeometry(.07, 8, 6), new THREE.MeshBasicMaterial({ color: new THREE.Color(p.lightColor).multiplyScalar(1.6) })); bulb.position.set(x, 3.38, 0); scene.add(bulb);
      const pl = new THREE.PointLight(p.lightColor, 9, 9, 1.6); pl.position.set(x, 3.3, 0); scene.add(pl);
    }
    // ---------- Tisch: Namensschilder, Wassergläser, Aschenbecher, Tintenfass ----------
    const glassM = new THREE.MeshLambertMaterial({ color: '#cfe3ea', transparent: true, opacity: .38 });
    for (let i = 0; i < 5; i++) {
      const x = -2.6 + i * 1.3;
      const card = H.box(.26, .1, .02, '#efe9dc'); card.position.set(x, .92, -.62); card.rotation.x = -.35; scene.add(card);
      const gl = new THREE.Mesh(new THREE.CylinderGeometry(.04, .035, .12, 12), glassM); gl.position.set(x + .38, .93, -.45); scene.add(gl);
      if (i % 2 === 0) { const ash = H.cyl(.08, .07, .03, '#3a3d42', 12); ash.position.set(x - .4, .885, -.35); scene.add(ash); }
    }
    const ink = H.cyl(.05, .06, .08, '#1c2026', 10); ink.position.set(.42, .91, .45); scene.add(ink);
    const blotter = H.box(.6, .015, .5, '#2f3a2c'); blotter.position.set(0, .868, .45); scene.add(blotter);
    // ---------- Personen: Offiziere hinter den Delegationen, zwei deutsche Begleiter hinter dem Unterzeichner ----------
    const standers = [[-3.3, -3.2, H.ROLE.west, 'Standing_Idle_Loop'], [1.9, -4.1, H.ROLE.soviet, 'Thinking_While_Standing'], [-1.95, -3.4, H.ROLE.west, 'Standing_Idle']];
    standers.forEach(([x, z, glow, pose], k) => { const f = H.figure({ color: P.grey, glow, model: k % 2 ? 'soldier' : 'suit', pose, loopPose: true, seed: 140 + k * 3 }); f.position.set(x, 0, z); f.rotation.y = -Math.PI / 2 + (k - 1) * .15; scene.add(f); });
    for (const [x, z, k] of [[1.0, 1.5, 0], [2.35, 2.6, 1]]) { const f = H.figure({ color: '#555a63', glow: H.ROLE.axis, model: 'soldier', pose: 'Standing_Idle_Loop', loopPose: true, seed: 160 + k * 5 }); f.position.set(x, 0, z); f.rotation.y = Math.PI / 2 + .3; scene.add(f); }   // rechts hinter dem Unterzeichner, verdecken ihn nicht
    // ---------- Pressefotografen mit Kameras auf Stativen; die Blitze lösen während der Unterzeichnung aus ----------
    const flashes = [];
    for (const [x, z, ry, k] of [[3.5, .9, -2.85, 0], [-3.9, -1.9, -.1, 1]]) {
      const g = new THREE.Group(), dk = '#22252b';
      for (let q = 0; q < 3; q++) { const a = q / 3 * Math.PI * 2, leg = H.cyl(.015, .02, 1.45, dk, 5); leg.position.set(Math.cos(a) * .2, .7, Math.sin(a) * .2); leg.rotation.set(Math.sin(a) * .28, 0, -Math.cos(a) * .28); g.add(leg); }
      const body = H.box(.22, .2, .18, dk); body.position.y = 1.5; g.add(body);
      const lens = H.cyl(.05, .06, .14, '#111', 10); lens.rotation.z = Math.PI / 2; lens.position.set(.17, 1.5, 0); g.add(lens);
      const dishM = new THREE.MeshBasicMaterial({ color: '#c9ccd2', side: THREE.DoubleSide });
      const dish = new THREE.Mesh(new THREE.CylinderGeometry(.16, .04, .1, 16, 1, true), dishM); dish.rotation.z = -Math.PI / 2; dish.position.set(.08, 1.78, 0); g.add(dish);
      const light = new THREE.PointLight('#e8f0ff', 0, 10, 1.4); light.position.set(.25, 1.78, 0); g.add(light);
      g.position.set(x, 0, z); g.rotation.y = ry; scene.add(g);
      const ph = H.figure({ color: '#4a4c50', glow: H.ROLE.civil, strength: 1.2, model: 'civil', pose: 'Standing_Idle_Loop', loopPose: true, seed: 180 + k * 7 }); ph.position.set(x + .45, 0, z + .35); ph.rotation.y = ry + Math.PI / 2 + .3; scene.add(ph);
      flashes.push({ light, dishM, times: k ? [2.6, 4.4, 6.1] : [1.9, 3.6, 5.3, 6.8] });
    }

    return {
      update(t, p) {
        const u = H.span(t, p.tSign, p.tSign + p.signDur);
        sig.at(u);
        for (const f of flashes) {                                                   // kurzer, harter Blitz mit Nachglühen
          const age = Math.min(...f.times.map(q => (t >= q ? t - q : 99)));
          const k = age < .12 ? 1 - age / .12 : 0;
          f.light.intensity = 40 * k; f.dishM.color.set('#c9ccd2').lerp(new THREE.Color('#ffffff').multiplyScalar(3), k);
        }
        lampLight.intensity = 30 + Math.sin(t * 9) * .6;
        for (const f of flags) f.userData.at(t);
      }
    };
  }
};
