import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'totaler-krieg', title: 'Totaler Krieg', seed: 16, duration: 7, rev: 4,
  script: 'Wenig später ruft die NS-Regierung den „totalen Krieg“ aus.',
  caption: { title: '„Totaler Krieg“', sub: 'Februar 1943' },
  params: {
    rows: { type: 'number', min: 2, max: 14, step: 1, value: 8, label: 'Reihen Publikum' },
    cols: { type: 'number', min: 4, max: 24, step: 1, value: 18, label: 'Figuren pro Reihe' },
    banners: { type: 'number', min: 0, max: 9, step: 1, value: 5, label: 'Banner' },
    bannerColor: { type: 'color', value: '#b4231c', label: 'Fahnenfarbe' },
    speakerGlow: { type: 'boolean', value: true, label: 'Redner leuchtet rot' },
    crowdGlow: { type: 'boolean', value: true, label: 'Publikum als weiße Silhouetten' },
    wallColor: { type: 'color', value: '#55607a', label: 'Wand' },
    crowdColor: { type: 'color', value: '#5b5f6a', label: 'Publikum' },
    tRaise: { type: 'number', min: 0, max: 10, step: .1, value: 3.8, label: 'Arme hoch ab (s)' },
    spotIntensity: { type: 'number', min: 0, max: 600, step: 10, value: 220, label: 'Scheinwerfer' },
    // von oben links (Galerie) über das Publikum auf den Redner, langsame Fahrt näher heran
    ...H.cameraParams([-15, 14, 9], [-11, 11.5, 3], [0, 3.4, -8.5], 32)
  },
  build({ scene, params: p, rng: r, shadows }) {
    // Berliner Sportpalast, 18. Februar 1943 (Stil wie Szene 1: blaugraue Halle, Low-Poly, Lichtkegel)
    H.sky(scene, '#1c2533', 30, 90);
    H.lights(scene, { sun: [0, 14, 6], intensity: 1.0, hemi: 1.3, shadows, skyColor: '#b4c4d8', groundColor: '#2a2e36', shadowSize: 30 });
    H.lightPool(scene, { x: 0, z: -6, radius: 16, height: 24, intensity: 320 });
    H.lightPool(scene, { x: 0, z: 4, radius: 14, height: 24, intensity: 200 });   // Saal
    scene.add(H.ground(120, '#2e3542'));
    // Texturen: Hakenkreuzfahne (historisch: rotes Tuch, weiße Scheibe, schwarzes, um 45° gedrehtes Hakenkreuz) und Spruchband
    const swastika = (g, cx, cy, sz, color) => {
      g.save(); g.translate(cx, cy); g.rotate(Math.PI / 4); g.fillStyle = color;
      const a = sz / 2, w = sz / 5;
      g.fillRect(-w / 2, -a, w, 2 * a); g.fillRect(-a, -w / 2, 2 * a, w);
      // vier Haken (im Uhrzeigersinn)
      g.fillRect(0, -a, a, w); g.fillRect(a - w, 0, w, a); g.fillRect(-a, a - w, a, w); g.fillRect(-a, -a, w, a);
      g.restore();
    };
    const flagTex = (W, Hh, circleY) => {
      const c = document.createElement('canvas'); c.width = W; c.height = Hh; const g = c.getContext('2d');
      g.fillStyle = p.bannerColor; g.fillRect(0, 0, W, Hh);
      const R = W * .36; g.fillStyle = '#f2efe8'; g.beginPath(); g.arc(W / 2, circleY, R, 0, Math.PI * 2); g.fill();
      swastika(g, W / 2, circleY, R * 1.25, '#111111');
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    };
    const flagMat = (W, Hh, cy) => new THREE.MeshLambertMaterial({ map: flagTex(W, Hh, cy), emissive: '#ffffff', emissiveMap: flagTex(W, Hh, cy), emissiveIntensity: .2 });
    const textTex = (txt) => {
      const c = document.createElement('canvas'); c.width = 4096; c.height = 256; const g = c.getContext('2d');
      g.fillStyle = '#1c1414'; g.fillRect(0, 0, 4096, 256);
      g.fillStyle = '#f4f1ea'; g.font = "700 150px 'Inter', Arial, sans-serif"; g.textAlign = 'center'; g.textBaseline = 'middle';
      try { g.letterSpacing = '18px'; } catch { /* Safari */ }
      g.fillText(txt, 2048, 136);
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
    };
    // Halle: Rückwand, Galerien mit Brüstung, Deckenträger
    const wall = H.box(60, 24, 1, p.wallColor); wall.position.set(0, 12, -14); scene.add(wall);
    for (const side of [-1, 1]) {
      const gal = H.box(6, .6, 40, '#3a4352'); gal.position.set(side * 19, 6.5, -2); scene.add(gal);
      const rail = H.box(.25, 1.2, 40, '#30353f'); rail.position.set(side * 16.1, 7.4, -2); scene.add(rail);
      for (let i = 0; i < 7; i++) { const col = H.box(.9, 24, .9, '#2c3340'); col.position.set(side * 22, 12, 8 - i * 6); scene.add(col); }
    }
    for (let i = 0; i < 6; i++) { const beam = H.box(46, .8, .8, '#2c3340'); beam.position.set(0, 22, 6 - i * 4.5); scene.add(beam); }
    // Fahnen an der Rückwand
    for (let i = 0; i < p.banners; i++) {
      const x = (i - (p.banners - 1) / 2) * 6.2;
      const b = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 11), flagMat(256, 880, 600)); b.position.set(x, 11.3, -13.4); scene.add(b);   // Scheibe im sichtbaren unteren Teil
    }

    // Bühne, Rednerpult mit Hakenkreuz, Mikrofone
    const SH = 2.6;   // hohe Bühne, damit der Redner über dem Publikum steht
    const stage = H.box(22, SH, 6, '#3d4554'); stage.position.set(0, SH / 2, -9); scene.add(stage);
    // Rednerpult: Sockel, Korpus, schräge Lesefläche mit Leiste, vorn ein Fahnentuch mit Emblem
    const wood = '#3a2f28';
    const plinth = H.box(1.7, .12, 1.0, '#2a221d'); plinth.position.set(0, SH + .06, -7.9); scene.add(plinth);
    const podium = H.box(1.5, .95, .8, wood); podium.position.set(0, SH + .595, -7.9); scene.add(podium);
    const desk = H.box(1.62, .06, .92, '#4a3b31'); desk.position.set(0, SH + 1.1, -7.9); desk.rotation.x = .12; scene.add(desk);
    const lip = H.box(1.62, .05, .04, '#2a221d'); lip.position.set(0, SH + 1.12, -7.47); scene.add(lip);
    const drape = new THREE.Mesh(new THREE.PlaneGeometry(1.2, .82), new THREE.MeshBasicMaterial({ map: flagTex(256, 176, 88), color: '#a8a8a8' })   /* unbeleuchtet: strahlt im Verfolgerlicht nicht aus */);
    drape.position.set(0, SH + .64, -7.49); scene.add(drape);
    const speaker = H.figure({ color: '#1c1d22', head: P.skin, glow: p.speakerGlow ? H.ROLE.axis : null, strength: 1.25, scale: 1.25, model: 'suit', pose: 'Rallying_The_Crowd_To_Make_Them_Cheer', loopPose: true }); speaker.position.set(0, SH, -8.7); speaker.rotation.y = -Math.PI / 2; scene.add(speaker);
    // eigener Verfolgerscheinwerfer auf den Redner, damit er sich klar von Fahnen und Wand abhebt
    const follow = new THREE.SpotLight('#fff1d8', 260, 30, .16, .45, 1.2); follow.position.set(0, 12, 2); follow.target.position.set(0, SH + 1.4, -8.7); follow.castShadow = false; scene.add(follow, follow.target);
    const armL = speaker.userData.armL, armR = speaker.userData.armR;
    for (const x of [-.5, .5]) { const st = H.cyl(.02, .02, 1.1, P.black, 6); st.position.set(x, SH + 1.45, -7.6); scene.add(st); const mic = H.cyl(.05, .04, .18, P.black, 8); mic.position.set(x, SH + 2.0, -7.6); scene.add(mic); }
    // Scheinwerfer von den Galerien auf den Redner, sichtbare Lichtkegel
    for (const x of [-9, 9]) {
      const sp = new THREE.SpotLight('#fff2d6', p.spotIntensity, 44, .3, .5, 1.2);
      sp.position.set(x, 17, 4); sp.target.position.set(0, SH + 1.2, -8.5); sp.castShadow = false;
      scene.add(sp, sp.target);
      const len = sp.position.distanceTo(sp.target.position);
    }
    // Bühnenrückwand mit Faltenwurf und großem Emblem im Lorbeerkranz hinter dem Redner
    const foldTex = (base, W = 1024) => {
      const c = document.createElement('canvas'); c.width = W; c.height = 8; const g = c.getContext('2d');
      const col = new THREE.Color(base);
      for (let x = 0; x < W; x++) { const k = .72 + .28 * Math.pow(.5 + .5 * Math.sin(x / W * Math.PI * 2 * 26), 1.6); g.fillStyle = '#' + col.clone().multiplyScalar(k).getHexString(); g.fillRect(x, 0, 1, 8); }
      const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
    };
    const backdrop = new THREE.Mesh(new THREE.PlaneGeometry(22, 4.2), new THREE.MeshLambertMaterial({ map: foldTex('#7a1c17') })); backdrop.position.set(0, SH + 2.1, -11.95); scene.add(backdrop);
    const pelmet = H.box(22.2, .35, .3, '#5a1410'); pelmet.position.set(0, SH + 4.2, -11.9); scene.add(pelmet);
    const trim = H.box(22.2, .06, .32, '#b8963e'); trim.position.set(0, SH + 4.02, -11.88); scene.add(trim);
    // unbeleuchtet (wie das Pult-Emblem), sonst strahlt es in den Scheinwerfern weiß aus
    const disc = new THREE.Mesh(new THREE.CircleGeometry(1.05, 48), new THREE.MeshBasicMaterial({ map: flagTex(256, 256, 128), color: '#9a9a9a' }));
    disc.material.map.repeat.set(.72, .72); disc.material.map.offset.set(.14, .14);
    disc.position.set(0, SH + 2.55, -11.9); scene.add(disc);
    const wreath = new THREE.Group(); const leafMat = new THREE.MeshLambertMaterial({ color: '#b8963e', flatShading: true });
    for (let k = 0; k < 28; k++) { const a = k / 28 * Math.PI * 2; if (Math.abs(a - Math.PI * 1.5) < .25) continue; const leaf = new THREE.Mesh(new THREE.OctahedronGeometry(.13, 0), leafMat); leaf.scale.set(1.5, .6, .4); leaf.position.set(Math.cos(a) * 1.2, Math.sin(a) * 1.2, 0); leaf.rotation.z = a + Math.PI / 2 + (k % 2 ? .35 : -.35); wreath.add(leaf); }
    wreath.position.copy(disc.position).setZ(-11.85); scene.add(wreath);
    // Bühnenverkleidung (Stoff mit Falten), Goldleiste, Treppe am Mittelgang, Pflanzkästen an der Bühnenkante
    const skirt = new THREE.Mesh(new THREE.PlaneGeometry(22, SH), new THREE.MeshLambertMaterial({ map: foldTex('#5e1713') })); skirt.position.set(0, SH / 2, -5.99); scene.add(skirt);
    const edge = H.box(22.1, .08, .12, '#b8963e'); edge.position.set(0, SH - .04, -5.96); scene.add(edge);
    for (let k = 0; k < 4; k++) { const st = H.box(3.6, SH * (k + 1) / 4, .55, '#3d4554'); st.position.set(0, SH * (k + 1) / 8, -6 + (4 - k) * .55 - .275); scene.add(st); }
    for (const sx of [-1, 1]) for (let k = 0; k < 4; k++) {
      const x = sx * (3.4 + k * 2.1);
      const box = H.box(1.5, .4, .45, '#2f2a26'); box.position.set(x, SH + .2, -6.35); scene.add(box);
      for (let q = 0; q < 4; q++) { const bush = new THREE.Mesh(new THREE.IcosahedronGeometry(.24 + r() * .06, 0), new THREE.MeshLambertMaterial({ color: '#2f4a33', flatShading: true })); bush.position.set(x - .54 + q * .36, SH + .52, -6.35); bush.scale.y = .8; scene.add(bush); }
    }
    // Parteiführung auf der Bühne: zwei Stuhlreihen links und rechts hinter dem Redner (sitzen, klatschen beim Jubel)
    const officials = [];
    for (const sx of [-1, 1]) for (let row = 0; row < 2; row++) for (let k = 0; k < 4; k++) {
      const x = sx * (2.3 + k * 1.15 + row * .55), z = -10.0 - row * 1.15;
      const ch = H.chair('#2e2420', '#4a1f1b'); ch.position.set(x, SH, z - .15); scene.add(ch);
      const f = H.figure({ color: (k + row) % 2 ? '#4d5046' : '#5e513d', glow: null, model: (k + row) % 3 ? 'soldier' : 'suit', pose: 'Clap_While_Seated', seed: 200 + k * 7 + row * 3 + (sx > 0 ? 50 : 0) });
      f.position.set(x, SH, z); f.rotation.y = -Math.PI / 2; scene.add(f);
      officials.push({ f, ph: r() * 3, delay: .3 + r() * .6 });
    }
    // Wochenschau-Kameras auf Stativen vor der Bühne und Lautsprechertrichter an den Bühnenecken
    const newsreel = x => {
      const g = new THREE.Group(), dk = '#22252b';
      for (let k = 0; k < 3; k++) { const leg = H.cyl(.025, .03, 1.7, dk, 5); const a = k / 3 * Math.PI * 2; leg.position.set(Math.cos(a) * .28, .8, Math.sin(a) * .28); leg.rotation.set(Math.sin(a) * .3, 0, -Math.cos(a) * .3); g.add(leg); }
      const body = H.box(.55, .42, .3, dk); body.position.y = 1.75; g.add(body);
      for (const dx of [-.15, .17]) { const reel = H.cyl(.17, .17, .06, '#30343b', 14); reel.rotation.x = Math.PI / 2; reel.position.set(dx, 2.12, 0); g.add(reel); }
      const lens = H.cyl(.07, .09, .3, '#111', 10); lens.rotation.z = Math.PI / 2; lens.position.set(.42, 1.78, 0); g.add(lens);
      g.position.set(x, 0, -3.8); g.lookAt(0, 0, -8.7); g.rotateY(-Math.PI / 2); return g;
    };
    scene.add(newsreel(-6.2), newsreel(6.2));
    for (const sx of [-1, 1]) {
      const pole = H.cyl(.06, .07, 6.5, '#2a2d35', 8); pole.position.set(sx * 10.6, 3.25, -6.4); scene.add(pole);
      // zwei Trichterlautsprecher übereinander, Öffnung zum Publikum (+Z), leicht nach unten und zur Mitte geneigt
      for (const dy of [0, .7]) {
        const horn = new THREE.Group();
        const bell = H.mesh(new THREE.CylinderGeometry(.07, .42, .95, 16, 1, true), '#6a6e76'); bell.material.side = THREE.DoubleSide; horn.add(bell);
        const drv = H.cyl(.13, .13, .22, '#2a2d35', 10); drv.position.y = .55; horn.add(drv);
        horn.rotation.set(-Math.PI / 2 + .25, sx * .35, 0, 'YXZ'); horn.position.set(sx * 10.6, 6.2 - dy, -5.9); scene.add(horn);
      }
    }
    // Galerie rechts: Zuschauer an der Brüstung und Fahnen, die über die Brüstung hängen
    const gallery = [];
    for (let row = 0; row < 2; row++) for (let k = 0; k < 11; k++) {
      const f = H.figure({ color: p.crowdColor, glow: p.crowdGlow ? H.ROLE.civil : null, strength: 1.1, model: 'civil', seed: 400 + row * 20 + k });
      f.position.set(16.7 + row * 1.2 + (r() - .5) * .2, 6.8, -10 + k * 1.75 + (r() - .5) * .4); f.rotation.y = Math.PI + (r() - .5) * .3; scene.add(f);
      gallery.push({ f, ph: r() * 6, delay: .4 + r() * .9 });
    }
    for (let k = 0; k < 4; k++) { const fl = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 3.4), flagMat(256, 580, 250)); fl.rotation.y = -Math.PI / 2; fl.position.set(15.95, 6.3, -8 + k * 5.5); scene.add(fl); }
    const crowd = [];
    for (let i = 0; i < p.rows; i++) for (let j = 0; j < p.cols; j++) {
      if (Math.abs((j - (p.cols - 1) / 2) * 1.4) < 2.4) continue;   // Mittelgang (Teppich) frei lassen
      const f = H.figure({ color: p.crowdColor, glow: p.crowdGlow ? H.ROLE.civil : null, strength: 1.25, model: 'civil', seed: i * 31 + j + 1 });
      f.position.set((j - (p.cols - 1) / 2) * 1.4 + (r() - .5) * .3, 0, 2 - i * 1.7 + (r() - .5) * .3);
      f.rotation.y = Math.PI / 2 + (r() - .5) * .3; scene.add(f);
      crowd.push({ f, arms: [f.userData.armL, f.userData.armR], ph: r() * 6, delay: r() * .8 });
    }
    const carpet = H.box(4, .05, 26, '#4a1f1b'); carpet.position.set(0, .03, 2); carpet.receiveShadow = true; scene.add(carpet);

    return {
      update(t, p) {
        const g = Math.sin(t * 5) * .3;
        armL.rotation.z = -1.3 + g; armR.rotation.z = 1.0 - g * .6 + Math.sin(t * 3.1) * .3;
        speaker.position.y = 2.6 + Math.abs(Math.sin(t * 5)) * .03;
        for (const o of officials) o.f.userData.pose('Clap_While_Seated', Math.max(0, t - (p.tRaise + o.delay)) + (t > p.tRaise + o.delay ? o.ph : 0));
        for (const c of gallery) {
          const up = H.span(t, p.tRaise + c.delay, p.tRaise + c.delay + .6);
          if (up > 0) c.f.userData.pose(c.ph > 3 ? 'Pumping_A_Fist' : 'Super_Excited', t - (p.tRaise + c.delay) + c.ph);
        }
        for (const c of crowd) {
          const up = H.easeOut(H.span(t, p.tRaise + c.delay, p.tRaise + c.delay + .6));
          if (up > 0) c.f.userData.pose(c.ph > 3 ? 'Pumping_A_Fist' : 'Super_Excited'   /* beide im Stehen (Fist_Pump-Clip war im Sitzen) */, t - (p.tRaise + c.delay) + c.ph);
          c.f.position.y = Math.sin(t * 2 + c.ph) * .03 * (1 + up * 3);
          c.arms[0].rotation.z = -up * (2.6 + Math.sin(t * 6 + c.ph) * .15);
          c.arms[1].rotation.z = up * .2;
        }
      }
    };
  }
};
