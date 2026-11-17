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
    bannerColor: { type: 'color', value: '#b4231c', label: 'Fahnenfarbe' },
    slogan: { type: 'text', value: 'Totaler Krieg – kürzester Krieg', label: 'Spruchband' },
    speakerGlow: { type: 'boolean', value: true, label: 'Redner leuchtet rot' },
    crowdGlow: { type: 'boolean', value: true, label: 'Publikum als weiße Silhouetten' },
    wallColor: { type: 'color', value: '#55607a', label: 'Wand' },
    crowdColor: { type: 'color', value: '#5b5f6a', label: 'Publikum' },
    tRaise: { type: 'number', min: 0, max: 10, step: .1, value: 3.8, label: 'Arme hoch ab (s)' },
    spotIntensity: { type: 'number', min: 0, max: 600, step: 10, value: 220, label: 'Scheinwerfer' },
    ...H.cameraParams([0, 2.6, 24], [0, 4, 15], [0, 3, -8], 42)
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
    // Fahnen an der Rückwand und Spruchband über der Bühne
    for (let i = 0; i < p.banners; i++) {
      const x = (i - (p.banners - 1) / 2) * 6.2;
      const b = new THREE.Mesh(new THREE.PlaneGeometry(3.2, 11), flagMat(256, 880, 330)); b.position.set(x, 11.3, -13.4); scene.add(b);
    }
    const band = new THREE.Mesh(new THREE.PlaneGeometry(26, 1.6), new THREE.MeshLambertMaterial({ map: textTex(p.slogan.toUpperCase()), emissive: '#ffffff', emissiveMap: textTex(p.slogan.toUpperCase()), emissiveIntensity: .22 }));
    band.position.set(0, 4.9, -13.3); scene.add(band);
    // Bühne, Rednerpult mit Hakenkreuz, Mikrofone
    const SH = 2.6;   // hohe Bühne, damit der Redner über dem Publikum steht
    const stage = H.box(22, SH, 6, '#3d4554'); stage.position.set(0, SH / 2, -9); scene.add(stage);
    const podium = H.box(1.5, .95, .8, '#3a2f28'); podium.position.set(0, SH + .475, -7.9); scene.add(podium);
    const emblem = new THREE.Mesh(new THREE.PlaneGeometry(1.1, 1.1), new THREE.MeshLambertMaterial({ map: flagTex(256, 256, 128), emissive: '#ffffff', emissiveMap: flagTex(256, 256, 128), emissiveIntensity: .1 }));
    emblem.scale.setScalar(.7); emblem.position.set(0, SH + .5, -7.49); scene.add(emblem);
    const speaker = H.figure({ color: '#1c1d22', head: P.skin, glow: p.speakerGlow ? H.ROLE.axis : null, strength: 1.6, scale: 1.25, model: 'suit', pose: 'Rallying_The_Crowd_To_Make_Them_Cheer', loopPose: true }); speaker.position.set(0, SH, -8.7); speaker.rotation.y = -Math.PI / 2; scene.add(speaker);
    const armL = speaker.userData.armL, armR = speaker.userData.armR;
    for (const x of [-.5, .5]) { const st = H.cyl(.02, .02, 1.1, P.black, 6); st.position.set(x, SH + 1.45, -7.6); scene.add(st); const mic = H.cyl(.05, .04, .18, P.black, 8); mic.position.set(x, SH + 2.0, -7.6); scene.add(mic); }
    // Scheinwerfer von den Galerien auf den Redner, sichtbare Lichtkegel
    for (const x of [-9, 9]) {
      const sp = new THREE.SpotLight('#fff2d6', p.spotIntensity, 44, .3, .5, 1.2);
      sp.position.set(x, 17, 4); sp.target.position.set(0, SH + 1.2, -8.5); sp.castShadow = false;
      scene.add(sp, sp.target);
      const len = sp.position.distanceTo(sp.target.position);
      const beam = new THREE.Mesh(new THREE.ConeGeometry(2.6, len, 18, 1, true), new THREE.MeshBasicMaterial({ color: '#fff2d6', transparent: true, opacity: .035, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending }));
      beam.geometry.translate(0, -len / 2, 0); beam.position.copy(sp.position);
      beam.quaternion.setFromUnitVectors(new THREE.Vector3(0, -1, 0), sp.target.position.clone().sub(sp.position).normalize()); scene.add(beam);
    }
    const crowd = [];
    for (let i = 0; i < p.rows; i++) for (let j = 0; j < p.cols; j++) {
      const f = H.figure({ color: p.crowdColor, glow: p.crowdGlow ? H.ROLE.civil : null, strength: 1.25, model: 'civil', seed: i * 31 + j + 1 });
      f.position.set((j - (p.cols - 1) / 2) * 1.4 + (r() - .5) * .5, 0, 2 - i * 1.7 + (r() - .5) * .5);
      f.rotation.y = Math.PI / 2 + (r() - .5) * .3; scene.add(f);
      crowd.push({ f, arms: [f.userData.armL, f.userData.armR], ph: r() * 6, delay: r() * .8 });
    }
    const carpet = H.box(4, .05, 26, '#4a1f1b'); carpet.position.set(0, .03, 2); carpet.receiveShadow = true; scene.add(carpet);
    for (const x of [-10, 10]) { const tripod = H.cyl(.08, .12, 3, '#2a2d35', 6); tripod.position.set(x, 1.5, 6); scene.add(tripod); const lamp = H.cyl(.5, .35, .6, '#2a2d35', 10); lamp.rotation.z = x > 0 ? .8 : -.8; lamp.position.set(x, 3.2, 6); scene.add(lamp); }

    return {
      update(t, p) {
        const g = Math.sin(t * 5) * .3;
        armL.rotation.z = -1.3 + g; armR.rotation.z = 1.0 - g * .6 + Math.sin(t * 3.1) * .3;
        speaker.position.y = 2.6 + Math.abs(Math.sin(t * 5)) * .03;
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
