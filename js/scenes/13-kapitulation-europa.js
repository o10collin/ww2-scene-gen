import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'kapitulation-europa', title: 'Kapitulation Deutschlands', seed: 23, duration: 8,
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
    const pap = H.paper(.7, .9); pap.position.set(0, .88, .2); scene.add(pap);
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
    const signer = H.figure({ color: '#555a63', glow: H.ROLE.axis, model: 'soldier', pose: 'Male_Writing_While_Seated', seed: 7 }); signer.position.set(0, 0, 1.2); signer.rotation.y = Math.PI / 2; scene.add(signer);
    const sChair = new THREE.Group(); const sSeat = H.box(.55, .08, .55, '#3a2e26'); sSeat.position.y = .5; const sBack = H.box(.55, .7, .06, '#3a2e26'); sBack.position.set(0, .9, .25); sChair.add(sSeat, sBack); sChair.position.set(0, 0, 1.45); scene.add(sChair);
    const armL = signer.userData.armL, armR = signer.userData.armR;
    if (p.flags) {
      const sets = [[P.blue, P.white, P.red], [P.red, P.white, P.blue], [P.red, P.red], [P.blue, P.white, P.red]];
      sets.forEach((c, i) => { const f = H.flag(c, { pole: 3.2, w: 1.2, h: .8 }); f.position.set(-4.5 + i * 3, 0, -4.5); f.rotation.y = -.2; scene.add(f); });
    }
    for (let i = 0; i < 5; i++) { const ch = new THREE.Group(); const seat = H.box(.55, .08, .55, '#3a2e26'); seat.position.y = .5; const back = H.box(.55, .7, .06, '#3a2e26'); back.position.set(0, .9, -.25); ch.add(seat, back); ch.position.set(-2.6 + i * 1.3, 0, -1.9); scene.add(ch); }
    for (const x of [-1.4, 1.4]) { const st = H.cyl(.015, .015, .4, P.black, 6); st.position.set(x, 1.05, -.3); scene.add(st); const mic = H.cyl(.04, .03, .12, P.black, 8); mic.position.set(x, 1.3, -.3); scene.add(mic); }
    const carpet = H.box(10, .03, 7, '#3b2a2a'); carpet.position.set(0, .02, 0); carpet.receiveShadow = true; scene.add(carpet);
    for (let i = 0; i < 4; i++) { const f = H.paper(.5, .7); f.position.set(-2.4 + i * 1.5, .88, -.5); f.rotation.y = (r() - .5) * .5; scene.add(f); }
    const lampStand = H.cyl(.04, .06, 1.8, '#2a2a2a', 8); lampStand.position.set(4.2, .9, -1); scene.add(lampStand);
    const lampShade = H.cone(.45, .5, '#4a3a2a', 12); lampShade.rotation.x = Math.PI; lampShade.position.set(4.2, 2.0, -1); scene.add(lampShade);
    const standLight = new THREE.PointLight('#ffe0b0', 8, 8, 1.6); standLight.position.set(4.2, 1.7, -1); scene.add(standLight);

    return {
      update(t, p) {
        const u = H.span(t, p.tSign, p.tSign + p.signDur);
        sig.at(u);
        const writing = u > 0 && u < 1;
        armR.rotation.z = writing ? -1.2 + Math.sin(t * 12) * .08 : -.2;
        armL.rotation.z = writing ? -.9 : -.1;
        signer.rotation.x = writing ? .18 : 0;
        lampLight.intensity = 30 + Math.sin(t * 9) * .6;
      }
    };
  }
};
