import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'fuehrerbunker', title: 'Berlin, 30. April 1945', seed: 22, duration: 10,
  script: 'Hitler nimmt sich am 30. April 1945 durch einen Pistolenschuss in die rechte Schläfe dann endgültig das Leben.',
  caption: { title: 'Das Ende im Bunker', sub: '30. April 1945' },
  params: {
    tDescend: { type: 'number', min: 0, max: 10, step: .1, value: 2.0, label: 'Abstieg ab (s)' },
    descendDur: { type: 'number', min: .5, max: 8, step: .1, value: 3.5, label: 'Abstieg Dauer (s)' },
    tShot: { type: 'number', min: 0, max: 15, step: .1, value: 8.0, label: 'Schuss bei (s)' },
    flicker: { type: 'number', min: 0, max: 1, step: .05, value: .5, label: 'Lampenflackern' },
    ruins: { type: 'number', min: 10, max: 80, step: 5, value: 40, label: 'Ruinen oben' },
    skyColor: { type: 'color', value: '#5a5e66', label: 'Himmel' },
    earthColor: { type: 'color', value: '#3a3129', label: 'Erde' },
    bunkerColor: { type: 'color', value: '#6c6a66', label: 'Bunkerwände' },
    lampColor: { type: 'color', value: '#ffd9a0', label: 'Lampenlicht' },
    lookEndX: { type: 'number', min: -20, max: 20, step: .1, value: 0, label: 'Blick Ende X', group: 'Kamera', live: true },
    lookEndY: { type: 'number', min: -20, max: 20, step: .1, value: -6.6, label: 'Blick Ende Y', group: 'Kamera', live: true },
    lookEndZ: { type: 'number', min: -20, max: 20, step: .1, value: -4, label: 'Blick Ende Z', group: 'Kamera', live: true },
    ...H.cameraParams([0, 8, 30], [0, -6.3, 8], [0, 3, -12], 40)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 30, 110);
    const L = H.lights(scene, { sun: [-6, 14, 10], intensity: .7, hemi: .7, shadows, skyColor: p.skyColor, groundColor: '#222', shadowSize: 50 });
    // Oberfläche: Ruinenstadt hinter der Schnittkante (z < 0)
    const surf = H.ground(140, '#4d4a46'); surf.position.set(0, 0, -70); scene.add(surf);
    const city = H.city(r, { count: p.ruins, area: 70, minH: 3, maxH: 11, colors: ['#5a5752', '#6a655e', '#4b4845'], ruined: true });
    city.position.z = -42; scene.add(city);
    const smokes = [];
    for (let i = 0; i < 5; i++) { const s = H.smokeColumn(r, { height: 16, width: 1.8, color: '#3d3b39' }); s.position.set(-30 + r() * 60, 3, -20 - r() * 40); scene.add(s); smokes.push(s); }
    // Erdreich im Schnitt
    const earth = (w, h, d, x, y, z) => { const b = H.box(w, h, d, p.earthColor); b.position.set(x, y, z); b.receiveShadow = false; scene.add(b); };
    earth(140, 14, 64, 0, -7, -38);        // hinter dem Raum
    earth(140, 4.6, 6, 0, -11.9, -3);       // unter dem Raum
    earth(140, 4.5, 6, 0, -2.25, -3);       // über dem Raum
    earth(64, 5.5, 6, -38, -7.25, -3);      // links
    earth(64, 5.5, 6, 38, -7.25, -3);       // rechts
    // Bunkerraum: Boden -9.5 … Decke -4.5, x -6…6, z -6…0
    const wallM = H.mat(p.bunkerColor);
    const floor = H.box(12, .3, 6, '#55524d'); floor.position.set(0, -9.6, -3); scene.add(floor);
    const ceil = H.box(12, .3, 6, wallM); ceil.position.set(0, -4.6, -3); scene.add(ceil);
    const back = H.box(12, 5.2, .3, wallM); back.position.set(0, -7.1, -6); scene.add(back);
    const sideL = H.box(.3, 5.2, 6, wallM); sideL.position.set(-6, -7.1, -3); scene.add(sideL);
    const sideR = sideL.clone(); sideR.position.x = 6; scene.add(sideR);
    const door = H.box(1.4, 2.6, .15, '#4a3a2e'); door.position.set(2.5, -8.1, -5.8); scene.add(door);
    const frame = H.box(1.7, 2.9, .1, '#3a2e24'); frame.position.set(2.5, -8.05, -5.88); scene.add(frame);
    const sofa = H.box(2.2, .7, .9, '#5a3d3d'); sofa.position.set(-2.5, -9.1, -5.2); scene.add(sofa);
    const sofaBack = H.box(2.2, .9, .25, '#5a3d3d'); sofaBack.position.set(-2.5, -8.5, -5.6); scene.add(sofaBack);
    const tbl = H.table(1.6, .8, .7, '#4a3a2e'); tbl.position.set(-2.5, -9.45, -3.6); scene.add(tbl);
    const pipe = H.cyl(.08, .08, 12, '#55524d', 8); pipe.rotation.z = Math.PI / 2; pipe.position.set(0, -4.9, -5.5); scene.add(pipe);
    const lampCord = H.cyl(.02, .02, .7, P.black, 6); lampCord.position.set(0, -5.1, -3); scene.add(lampCord);
    const shade = H.cone(.4, .35, '#3a3a3a', 12); shade.rotation.x = Math.PI; shade.position.set(0, -5.5, -3); scene.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshBasicMaterial({ color: p.lampColor })); bulb.position.set(0, -5.65, -3); scene.add(bulb);
    const lamp = new THREE.PointLight(p.lampColor, 18, 16, 1.6); lamp.position.set(0, -5.8, -3); scene.add(lamp);
    const flash = new THREE.PointLight('#ffffff', 0, 20); flash.position.set(2, -7.5, -4); scene.add(flash);
    const from = new THREE.Vector3(), to = new THREE.Vector3(), look0 = new THREE.Vector3(), look1 = new THREE.Vector3();
    const wallMap = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshLambertMaterial({ color: '#8a8673', map: H.terrainTexture() })); wallMap.position.set(-3.2, -6.6, -5.82); scene.add(wallMap);
    const mapFrame = H.box(2.55, 1.75, .04, '#2a2420'); mapFrame.position.set(-3.2, -6.6, -5.86); scene.add(mapFrame);
    const phone = H.box(.35, .2, .25, P.black); phone.position.set(-2.9, -8.63, -3.6); scene.add(phone);
    const papers = H.paper(.5, .7); papers.position.set(-2.2, -8.74, -3.5); papers.rotation.y = .3; scene.add(papers);
    for (const x of [-3.4, -1.6]) { const ch = new THREE.Group(); const seat = H.box(.5, .08, .5, '#3a2e26'); seat.position.y = -9.1; const back = H.box(.5, .6, .06, '#3a2e26'); back.position.set(0, -8.8, -.22); for (const [lx, lz] of [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]]) { const leg = H.box(.05, .5, .05, '#3a2e26'); leg.position.set(lx, -9.35, lz); ch.add(leg); } ch.add(seat, back); ch.position.set(x, 0, -2.8); scene.add(ch); }
    for (const y of [-5.0, -5.2]) { const pp = H.cyl(.05, .05, 12, '#55524d', 6); pp.rotation.z = Math.PI / 2; pp.position.set(0, y, -5.7); scene.add(pp); }
    const door2 = H.box(1.2, 2.4, .12, '#4a3a2e'); door2.position.set(-5.85, -8.2, -1.5); door2.rotation.y = Math.PI / 2; scene.add(door2);
    const cage = new THREE.Mesh(new THREE.SphereGeometry(.26, 6, 4), new THREE.MeshBasicMaterial({ color: '#111', wireframe: true })); cage.position.set(0, -5.62, -3); scene.add(cage);

    return {
      update(t, p) {
        for (const s of smokes) s.userData.at(t, .7);
        const after = t - p.tShot;
        const fl = 1 - p.flicker * (.5 + .5 * Math.sin(t * 31) * Math.sin(t * 7.3)) * (Math.sin(t * 2.1) > .4 ? 1 : .15);
        const on = after < 0 || after > .25 ? (after > .25 ? .15 : 1) : 0;
        lamp.intensity = 18 * fl * on; bulb.material.color.set(p.lampColor).multiplyScalar(on * fl + .05);
        flash.intensity = after > 0 && after < .12 ? 120 : 0;
        L.sun.intensity = .7; L.hemi.intensity = .7 * (after > 0 ? .5 : 1);
      },
      camera(t, cam, p) {
        const u = H.easeInOut(H.span(t, p.tDescend, p.tDescend + p.descendDur));
        from.set(p.camFromX, p.camFromY, p.camFromZ); to.set(p.camToX, p.camToY, p.camToZ);
        look0.set(p.lookX, p.lookY, p.lookZ); look1.set(p.lookEndX, p.lookEndY, p.lookEndZ);
        cam.position.lerpVectors(from, to, u);
        cam.position.x += Math.sin(t * .4) * .3 * (1 - u);
        cam.lookAt(look0.lerp(look1, u));
      }
    };
  }
};
