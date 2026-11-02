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
    wallColor: { type: 'color', value: '#7d7461', label: 'Wand' },
    floorColor: { type: 'color', value: '#4e4238', label: 'Boden' },
    lightColor: { type: 'color', value: '#ffe6c2', label: 'Lampenlicht' },
    ...H.cameraParams([-5, 2.6, 7], [-1.5, 2.1, 4.2], [0, 1, 0], 38)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, '#2a2824', 20, 60);
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
    const uniforms = ['#6b7355', '#8a7b5a', '#7a4a42', '#4a5f7a', '#6b7355'];
    for (let i = 0; i < 5; i++) {
      const f = H.figure({ color: uniforms[i], head: r() < .5 ? P.skin : '#c9a98d' });
      f.position.set(-2.6 + i * 1.3, 0, -1.4); f.rotation.y = Math.PI / 2; scene.add(f);
    }
    // Unterzeichnender vor dem Tisch
    const signer = H.figure({ color: '#555a63', head: P.skin }); signer.position.set(0, 0, 1.3); signer.rotation.y = -Math.PI / 2; scene.add(signer);
    const [, , , , armL, armR] = signer.children;
    if (p.flags) {
      const sets = [[P.blue, P.white, P.red], [P.red, P.white, P.blue], [P.red, P.red], [P.blue, P.white, P.red]];
      sets.forEach((c, i) => { const f = H.flag(c, { pole: 3.2, w: 1.2, h: .8 }); f.position.set(-4.5 + i * 3, 0, -4.5); f.rotation.y = -.2; scene.add(f); });
    }
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
