import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'kapitulation-japan', title: 'Kapitulation Japans', seed: 26, duration: 8,
  script: 'Am 2. September kapituliert dann schließlich auch Japan.',
  caption: { title: 'Kriegsende', sub: '2. September 1945' },
  params: {
    tSign: { type: 'number', min: 0, max: 10, step: .1, value: 1.5, label: 'Unterschrift ab (s)' },
    signDur: { type: 'number', min: .5, max: 8, step: .1, value: 4, label: 'Unterschrift Dauer (s)' },
    sailors: { type: 'number', min: 0, max: 40, step: 1, value: 20, label: 'Matrosen' },
    skyColor: { type: 'color', value: '#1a2430', label: 'Himmel' },
    waterColor: { type: 'color', value: '#1c2f40', label: 'Wasser' },
    shipColor: { type: 'color', value: '#737b85', label: 'Schiff' },
    ...H.cameraParams([-7, 3.2, 11], [-3, 2.6, 7.5], [0, 1.3, 0], 38)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 40, 140);
    H.lights(scene, { sun: [-8, 16, 10], intensity: .7, hemi: .5, shadows, skyColor: '#8fa3bb', groundColor: '#223', shadowSize: 40 });
    H.lightPool(scene, { x: 0, z: 0, radius: 9, height: 24, intensity: 120 });
    const water = H.wavePlane(200, 200, 48, p.waterColor, { amp: .1 }); water.position.y = -3; scene.add(water);
    for (let i = 0; i < 6; i++) { const c = H.cloud(r, P.white, 2.5); c.position.set(-60 + r() * 120, 18 + r() * 8, -60 - r() * 30); scene.add(c); }
    // Deck und Aufbauten
    const deck = H.box(40, 3, 16, p.shipColor); deck.position.set(0, -1.5, -2); scene.add(deck);
    const deckTop = H.box(40, .1, 16, '#5f6670'); deckTop.position.set(0, .05, -2); scene.add(deckTop);
    const sup = H.box(10, 7, 8, p.shipColor); sup.position.set(-8, 3.5, -8); scene.add(sup);
    const sup2 = H.box(6, 4, 5, p.shipColor); sup2.position.set(-8, 9, -8); scene.add(sup2);
    const mast = H.cyl(.15, .2, 10, P.darkGrey, 8); mast.position.set(-8, 16, -8); scene.add(mast);
    const turret = H.cyl(2.2, 2.4, 1.6, p.shipColor, 16); turret.position.set(9, .8, -6); scene.add(turret);
    for (const z of [-7, -6, -5]) { const b = H.cyl(.18, .2, 7, P.darkGrey, 8); b.rotation.z = -Math.PI / 2 + .15; b.position.set(13, 1.6, z); scene.add(b); }
    for (let i = 0; i < 14; i++) { const post = H.cyl(.04, .04, 1, P.darkGrey, 6); post.position.set(-19 + i * 3, .5, 5.9); scene.add(post); }
    const rail = H.cyl(.03, .03, 40, P.darkGrey, 6); rail.rotation.z = Math.PI / 2; rail.position.set(0, 1, 5.9); scene.add(rail);
    const fl = H.flag([P.red, P.white, P.blue], { pole: 5, w: 1.6, h: 1 }); fl.position.set(-5, 11, -8); scene.add(fl);
    // Tisch mit Dokument
    const tbl = H.table(3, 1.2, .8, '#4a3f36'); tbl.position.set(0, 0, 0); scene.add(tbl);
    const cloth = H.box(3.1, .03, 1.25, '#3e5a3a'); cloth.position.set(0, .85, 0); scene.add(cloth);
    const pap = H.paper(.7, .9); pap.position.set(0, .88, .1); scene.add(pap);
    const sig = H.signing(pap, P.black);
    const signer = H.figure({ color: '#2a2b30', glow: H.ROLE.axis, model: 'suit', pose: 'PickUp', seed: 9 }); signer.position.set(0, 0, 1.2); signer.rotation.y = -Math.PI / 2; scene.add(signer);
    const armL = signer.userData.armL, armR = signer.userData.armR;
    const officers = ['#6b6f58', '#f0efe8', '#6b6f58', '#f0efe8', '#4a4f44'];
    officers.forEach((c, i) => { const f = H.figure({ color: c, glow: H.ROLE.west, model: i % 2 ? 'suit' : 'soldier', seed: i + 21 }); f.position.set(-2.4 + i * 1.2, 0, -1.2); f.rotation.y = Math.PI / 2; scene.add(f); });
    const sailors = [];
    for (let i = 0; i < p.sailors; i++) {
      const f = H.figure({ color: '#f0efe8', scale: .9, glow: H.ROLE.civil, strength: 1.2, model: 'soldier', seed: i + 40 });
      f.position.set(-14 + r() * 28, 0, -4 - r() * 3); f.rotation.y = Math.PI / 2 + (r() - .5) * .4; scene.add(f); sailors.push({ f, ph: r() * 6 });
    }
    for (let i = 0; i < 5; i++) { const hatch = H.box(1.2, .18, 1.2, '#5a6068'); hatch.position.set(-16 + i * 7, .1, 3.5); scene.add(hatch); }
    for (let i = 0; i < 6; i++) for (const z of [-10.5, -5.5]) { const win = new THREE.Mesh(new THREE.PlaneGeometry(.5, .6), new THREE.MeshBasicMaterial({ color: '#d9c184' })); win.position.set(-11 + i * 1.2, 5.5, z === -5.5 ? -3.99 : -12.01); win.rotation.y = z === -5.5 ? 0 : Math.PI; scene.add(win); }
    for (let i = 0; i < 2; i++) { const ladder = new THREE.Group(); for (let k = 0; k < 8; k++) { const rung = H.box(.6, .04, .04, P.darkGrey); rung.position.y = k * .4; ladder.add(rung); } for (const x of [-.3, .3]) { const rail = H.box(.04, 3.2, .04, P.darkGrey); rail.position.set(x, 1.4, 0); ladder.add(rail); } ladder.position.set(-13 + i * 10, .1, -3.9); scene.add(ladder); }
    const turret2 = H.cyl(1.6, 1.8, 1.3, p.shipColor, 16); turret2.position.set(-16, .65, -5); scene.add(turret2);
    for (const z of [-5.6, -4.6]) { const b = H.cyl(.14, .16, 5, P.darkGrey, 8); b.rotation.z = Math.PI / 2 - .15; b.position.set(-19, 1.3, z); scene.add(b); }
    for (let i = 0; i < 12; i++) { const bollard = H.cyl(.12, .14, .5, P.darkGrey, 8); bollard.position.set(-18 + i * 3.3, .25, 5.3); scene.add(bollard); }
    for (let i = 0; i < 4; i++) { const ring = H.mesh(new THREE.TorusGeometry(.35, .07, 8, 16), '#d8d2c8'); ring.position.set(-15 + i * 9, 1.1, 5.95); scene.add(ring); }

    return {
      update(t, p) {
        water.userData.at(t);
        const u = H.span(t, p.tSign, p.tSign + p.signDur);
        sig.at(u);
        const writing = u > 0 && u < 1;
        armR.rotation.z = writing ? -1.2 + Math.sin(t * 12) * .08 : -.2;
        armL.rotation.z = writing ? -.9 : -.1;
        signer.rotation.x = writing ? .18 : 0;
        for (const s of sailors) s.f.position.y = Math.sin(t * 1.5 + s.ph) * .015;
      }
    };
  }
};
