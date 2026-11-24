import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'fuehrerbunker', title: 'Berlin, 30. April 1945', seed: 22, duration: 10, rev: 3,
  script: 'Hitler nimmt sich am 30. April 1945 durch einen Pistolenschuss in die rechte Schläfe dann endgültig das Leben.',
  caption: { title: 'Das Ende im Bunker', sub: '30. April 1945' },
  params: {
    tDescend: { type: 'number', min: 0, max: 10, step: .1, value: 1.4, label: 'Abstieg ab (s)' },
    descendDur: { type: 'number', min: .5, max: 8, step: .1, value: 3.4, label: 'Abstieg Dauer (s)' },
    tRaise: { type: 'number', min: 0, max: 15, step: .1, value: 6.6, label: 'Hebt die Pistole ab (s)' },
    tShot: { type: 'number', min: 0, max: 15, step: .1, value: 8.0, label: 'Schuss bei (s)' },
    flicker: { type: 'number', min: 0, max: 1, step: .05, value: .5, label: 'Lampenflackern' },
    ruins: { type: 'number', min: 10, max: 80, step: 5, value: 40, label: 'Ruinen oben' },
    skyColor: { type: 'color', value: '#5a5e66', label: 'Himmel' },
    earthColor: { type: 'color', value: '#3a3129', label: 'Erde' },
    bunkerColor: { type: 'color', value: '#6c6a66', label: 'Bunkerwände' },
    lampColor: { type: 'color', value: '#ffd9a0', label: 'Lampenlicht' },
    lookEndX: { type: 'number', min: -20, max: 20, step: .1, value: 0, label: 'Blick Ende Abstieg X', group: 'Kamera', live: true },
    lookEndY: { type: 'number', min: -20, max: 20, step: .1, value: -6.6, label: 'Blick Ende Abstieg Y', group: 'Kamera', live: true },
    lookEndZ: { type: 'number', min: -20, max: 20, step: .1, value: -4, label: 'Blick Ende Abstieg Z', group: 'Kamera', live: true },
    closeX: { type: 'number', min: -20, max: 20, step: .1, value: -.6, label: 'Nah X', group: 'Kamera', live: true },
    closeY: { type: 'number', min: -20, max: 20, step: .1, value: -7.6, label: 'Nah Y', group: 'Kamera', live: true },
    closeZ: { type: 'number', min: -20, max: 20, step: .1, value: -.6, label: 'Nah Z', group: 'Kamera', live: true },
    ...H.cameraParams([0, 8, 30], [0, -6.3, 8], [0, 3, -12], 40)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 30, 110);
    const L = H.lights(scene, { sun: [-6, 14, 10], intensity: .7, hemi: .7, shadows, skyColor: p.skyColor, groundColor: '#222', shadowSize: 50 });
    // Oberfläche: Ruinenstadt hinter der Schnittkante (z < 0)
    const surf = H.ground(140, '#4d4a46'); surf.position.set(0, 0, -70); scene.add(surf);
    // Oberfläche auch vor der Schnittkante (z > 0): von oben verdeckt sie den Bunker vollständig. Sie ist nur von oben
    // sichtbar (einseitig) – sobald die Kamera unter die Erdoberfläche sinkt, gibt sie den Schnitt frei.
    const front = H.ground(140, '#4d4a46'); front.scale.y = 60 / 140; front.position.set(0, 0, 30); scene.add(front);
    // Garten der Reichskanzlei über dem Bunker: Notausgang (Betonblock mit Tür) und kegelförmiger Turm, kahle,
    // zerschossene Bäume, Granattrichter, Trümmer
    const conc = '#77746e', concD = '#5d5a55';
    const exitB = H.box(4.2, 3.0, 3.4, conc); exitB.position.set(1.5, 1.5, -3.2); scene.add(exitB);
    const exitTop = H.box(4.6, .35, 3.8, concD); exitTop.position.set(1.5, 3.17, -3.2); scene.add(exitTop);
    const exitDoor = H.box(1.1, 2.0, .1, '#2c2a27'); exitDoor.position.set(1.5, 1.0, -1.47); scene.add(exitDoor);
    const tower = H.cyl(1.25, 1.45, 4.2, conc, 16); tower.position.set(-2.6, 2.1, -4.2); scene.add(tower);
    const cap = H.cone(1.6, 1.9, concD, 16); cap.position.set(-2.6, 5.15, -4.2); scene.add(cap);
    for (const a of [0, 2.1, 4.2]) { const slit = H.box(.5, .14, .1, '#1d1c1a'); slit.position.set(-2.6 + Math.sin(a) * 1.3, 3.2, -4.2 + Math.cos(a) * 1.3); slit.rotation.y = a; scene.add(slit); }
    // Alles, was vor der Schnittkante (z > 0) auf der Oberfläche steht, liegt in einer Gruppe: Sobald die Kamera unter
    // die Erdoberfläche sinkt, wäre es dort vom Erdreich verdeckt -> ausblenden (die Fläche selbst ist von unten unsichtbar)
    const frontDeco = new THREE.Group(); scene.add(frontDeco);
    const put = (o, z) => (z > 0 ? frontDeco : scene).add(o);
    const tree = (x, z, h) => {
      const g = new THREE.Group(), bark = '#2e2924';
      const trunk = H.cyl(.12, .2, h, bark, 6); trunk.position.y = h / 2; g.add(trunk);
      for (let k = 0; k < 4; k++) { const len = h * (.25 + r() * .2), br = H.cyl(.03, .07, len, bark, 5); const a = r() * 6.28, el = .5 + r() * .5; br.position.set(Math.cos(a) * Math.sin(el) * len / 2, h * (.55 + k * .1) + Math.cos(el) * len / 2, Math.sin(a) * Math.sin(el) * len / 2); br.rotation.set(Math.sin(a) * el, 0, -Math.cos(a) * el); g.add(br); }
      g.position.set(x, 0, z); g.rotation.z = (r() - .5) * .12; put(g, z);
    };
    for (const [x, z, h] of [[-9, -6, 5.5], [8.5, -9, 4.2], [-15, 4, 4.8], [13, 6, 3.6], [-6, 12, 3.2], [18, -3, 5.0]]) tree(x, z, h);
    for (const [x, z, rr] of [[-5, 6, 1.5], [6, 9, 1.2], [11, -2, 1.7], [-13, -2, 1.3], [2, 15, 1.4]]) { const c = H.crater(rr, '#3b3833'); c.position.set(x, 0, z); put(c, z); }
    for (let i = 0; i < 40; i++) { const b = H.box(.3 + r() * 1.0, .15 + r() * .4, .3 + r() * 1.0, r() < .5 ? '#5a5752' : '#45423e'); const x = -26 + r() * 52, z = -12 + r() * 40; if (Math.abs(x - 1.5) < 3 && Math.abs(z + 3.2) < 2.6) continue; b.position.set(x, .12, z); b.rotation.y = r() * 3; put(b, z); }   // Trümmer
    const city = H.city(r, { count: p.ruins, area: 70, minH: 3, maxH: 11, colors: ['#5a5752', '#6a655e', '#4b4845'], ruined: true });
    city.position.z = -42; scene.add(city);
    const smokes = [];
    for (let i = 0; i < 5; i++) { const s = H.smokeColumn(r, { height: 16, width: 1.8, color: '#3d3b39' }); s.position.set(-30 + r() * 60, 3, -20 - r() * 40); scene.add(s); smokes.push(s); }
    // Erdreich im Schnitt
    const earth = (w, h, d, x, y, z) => { const b = H.box(w, h, d, p.earthColor); b.position.set(x, y, z); b.receiveShadow = false; scene.add(b); };
    // Oberkanten 2 cm unter der Erdoberfläche (sonst flimmern die deckungsgleichen Flächen)
    earth(140, 13.98, 64, 0, -7.01, -38);  // hinter dem Raum
    earth(140, 4.6, 6, 0, -11.9, -3);       // unter dem Raum
    earth(140, 4.48, 6, 0, -2.26, -3);      // über dem Raum
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
    const sofa = H.box(2.2, .5, .95, '#5a3d3d'); sofa.position.set(-2.5, -9.2, -5.25); scene.add(sofa);
    const sofaBack = H.box(2.2, .85, .25, '#5a3d3d'); sofaBack.position.set(-2.5, -8.6, -5.72); scene.add(sofaBack);
    for (const x of [-3.65, -1.35]) { const arm = H.box(.22, .7, .95, '#4e3434'); arm.position.set(x, -9.05, -5.25); scene.add(arm); }

    // ---------- Hitler auf dem Sofa (Darstellung ohne Verletzungen): sitzt, hebt die Pistole an die rechte Schläfe,
    // Schuss = Mündungsblitz und Licht, sackt zur Seite, die Pistole fällt zu Boden ----------
    const POSE = 'Male_Talking_While_Seated', POSE_T = 1.2;
    const hitler = H.figure({ color: '#2a2b30', head: P.skin, glow: H.ROLE.axis, strength: 1.35, model: 'suit', seed: 2, pose: POSE });
    hitler.position.set(-2.5, -9.45, -5.22); hitler.rotation.y = -Math.PI / 2; scene.add(hitler);
    const bone = {}; hitler.traverse(o => { if (o.isBone) bone[o.name.replace(/^mixamorig\d*:?/, '')] = o; });
    const pistol = new THREE.Group();
    { const m = new THREE.MeshLambertMaterial({ color: '#1a1b1e' }); const slide = new THREE.Mesh(new THREE.BoxGeometry(.035, .045, .17), m); slide.position.z = .05; const grip = new THREE.Mesh(new THREE.BoxGeometry(.03, .1, .045), m); grip.position.set(0, -.06, -.01); grip.rotation.x = .25; pistol.add(slide, grip); }
    scene.add(pistol);
    const muzzle = new THREE.PointLight('#ffe0a0', 0, 10, 1.6); scene.add(muzzle);
    const muzzleFlash = new THREE.Mesh(new THREE.SphereGeometry(.05, 8, 6), H.glowMat('#fff0c0', 1.2)); muzzleFlash.visible = false; scene.add(muzzleFlash);
    const V3 = () => new THREE.Vector3(), Q = () => new THREE.Quaternion();
    const wp = (b, v = V3()) => b.getWorldPosition(v);
    // Knochen so drehen, dass seine +Y-Achse (Richtung zum Kindknochen) auf dir zeigt (kleinste Drehung, Verdrehung bleibt)
    const aimBone = (b, dir) => {
      const qw = b.getWorldQuaternion(Q()), cur = new THREE.Vector3(0, 1, 0).applyQuaternion(qw).normalize();
      const nq = Q().setFromUnitVectors(cur, dir.clone().normalize()).multiply(qw);
      b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(nq)); b.updateMatrixWorld(true);
    };
    const armIK = target => {                                                                // Zwei-Knochen-IK für den rechten Arm
      const S = wp(bone.RightArm), E0 = wp(bone.RightForeArm), W0 = wp(bone.RightHand);
      const a = S.distanceTo(E0), c = E0.distanceTo(W0), d = Math.min(S.distanceTo(target), a + c - 1e-3);
      const n = target.clone().sub(S).normalize(), x = (a * a - c * c + d * d) / (2 * d), h = Math.sqrt(Math.max(0, a * a - x * x));
      const pole = new THREE.Vector3(-1, -1.1, .15); pole.sub(n.clone().multiplyScalar(pole.dot(n))).normalize();   // Ellbogen nach außen-unten
      const E = S.clone().addScaledVector(n, x).addScaledVector(pole, h);
      aimBone(bone.RightArm, E.clone().sub(S)); aimBone(bone.RightForeArm, S.clone().addScaledVector(n, d).sub(wp(bone.RightForeArm)));
    };
    const tilt = (b, axis, ang) => {                                                         // Knochen um eine Weltachse drehen
      if (!ang) return; const qw = b.getWorldQuaternion(Q()); const nq = Q().setFromAxisAngle(axis, ang).multiply(qw);
      b.quaternion.copy(b.parent.getWorldQuaternion(Q()).invert().multiply(nq)); b.updateMatrixWorld(true);
    };
    const pistolFloor = new THREE.Vector3(-2.95, -9.43, -4.5);
    const animateHitler = (t, p) => {
      hitler.userData.pose(POSE, POSE_T);                                                    // ruhige Sitzhaltung
      hitler.updateMatrixWorld(true);
      const shot = t - p.tShot, slump = H.easeOut(H.span(shot, .02, .55));
      // Oberkörper sackt nach dem Schuss zur linken Seite und nach vorn, Kopf hängt
      tilt(bone.Spine, new THREE.Vector3(0, 0, 1), -.5 * slump); tilt(bone.Spine1, new THREE.Vector3(1, 0, 0), .22 * slump); tilt(bone.Head, new THREE.Vector3(0, 0, 1), -.45 * slump);
      tilt(bone.Head, new THREE.Vector3(1, 0, 0), (.25 + .25 * slump) * (shot < 0 ? H.span(t, p.tRaise - 1.5, p.tRaise) : 1));   // vorher gesenkter Blick
      const head = wp(bone.Head), rest = wp(bone.RightHand);
      const temple = head.clone().add(new THREE.Vector3(-.21, .0, .04));   // Handgelenk neben der rechten Schläfe
      const raise = H.smooth(H.span(t, p.tRaise, p.tRaise + 1.0));
      const drop = H.smooth(H.span(shot, .05, .45));
      const hang = wp(bone.RightArm).add(new THREE.Vector3(-.05, -.58, .12));
      const target = rest.clone().lerp(temple, raise).lerp(hang, drop);
      if (raise > 0) { armIK(target); if (drop < 1) { const hd = head.clone().add(new THREE.Vector3(0, .06, 0)).sub(wp(bone.RightHand)); const fw = wp(bone.RightHand).sub(wp(bone.RightForeArm)).normalize(); aimBone(bone.RightHand, fw.lerp(hd.normalize(), raise * (1 - drop))); } }   // Hand dreht zur Schläfe
      // Pistole: in der Hand, Lauf zur Schläfe; nach dem Schuss fällt sie zu Boden
      const hand = wp(bone.RightHand), fall = H.span(shot, .35, .85);
      if (fall <= 0) {
        pistol.position.copy(hand).add(new THREE.Vector3(.0, .04, .0));
        const aimAt = raise > .9 ? head.clone() : hand.clone().add(new THREE.Vector3(0, 0, 1));
        pistol.lookAt(aimAt);
      } else {
        const from = hang.clone(), k = fall * fall;
        pistol.position.lerpVectors(from, pistolFloor, k); pistol.position.y = H.lerp(from.y, pistolFloor.y, k);
        pistol.rotation.set(Math.PI / 2 * fall, 1.1, .3 * fall);
      }
      const fl = shot >= 0 && shot < .09;
      muzzle.intensity = fl ? 14 : 0; muzzle.position.copy(temple);
      muzzleFlash.visible = fl; muzzleFlash.position.copy(temple).add(new THREE.Vector3(-.12, 0, 0)); muzzleFlash.scale.setScalar(.7);
    };
    const tbl = H.table(1.6, .8, .7, '#4a3a2e'); tbl.position.set(3.6, -9.45, -3.2); scene.add(tbl);
    const pipe = H.cyl(.08, .08, 12, '#55524d', 8); pipe.rotation.z = Math.PI / 2; pipe.position.set(0, -4.9, -5.5); scene.add(pipe);
    const lampCord = H.cyl(.02, .02, .7, P.black, 6); lampCord.position.set(0, -5.1, -3); scene.add(lampCord);
    const shade = H.cone(.4, .35, '#3a3a3a', 12); shade.rotation.x = Math.PI; shade.position.set(0, -5.5, -3); scene.add(shade);
    const bulb = new THREE.Mesh(new THREE.SphereGeometry(.12, 10, 8), new THREE.MeshBasicMaterial({ color: p.lampColor })); bulb.position.set(0, -5.65, -3); scene.add(bulb);
    const lamp = new THREE.PointLight(p.lampColor, 18, 16, 1.6); lamp.position.set(0, -5.8, -3); scene.add(lamp);
    const flash = new THREE.PointLight('#ffffff', 0, 20); flash.position.set(2, -7.5, -4); scene.add(flash);
    let camPath = null, lookPath = null, camKey = ''; const lookTmp = new THREE.Vector3();
    const wallMap = new THREE.Mesh(new THREE.PlaneGeometry(2.4, 1.6), new THREE.MeshLambertMaterial({ color: '#8a8673', map: H.terrainTexture() })); wallMap.position.set(-3.2, -6.6, -5.82); scene.add(wallMap);
    const mapFrame = H.box(2.55, 1.75, .04, '#2a2420'); mapFrame.position.set(-3.2, -6.6, -5.86); scene.add(mapFrame);
    const phone = H.box(.35, .2, .25, P.black); phone.position.set(3.2, -8.63, -3.2); scene.add(phone);
    const papers = H.paper(.5, .7); papers.position.set(3.9, -8.74, -3.1); papers.rotation.y = .3; scene.add(papers);
    for (const x of [2.8, 4.4]) { const ch = new THREE.Group(); const seat = H.box(.5, .08, .5, '#3a2e26'); seat.position.y = -9.1; const back = H.box(.5, .6, .06, '#3a2e26'); back.position.set(0, -8.8, -.22); for (const [lx, lz] of [[-.2, -.2], [.2, -.2], [-.2, .2], [.2, .2]]) { const leg = H.box(.05, .5, .05, '#3a2e26'); leg.position.set(lx, -9.35, lz); ch.add(leg); } ch.add(seat, back); ch.position.set(x, 0, -2.4); scene.add(ch); }
    for (const y of [-5.0, -5.2]) { const pp = H.cyl(.05, .05, 12, '#55524d', 6); pp.rotation.z = Math.PI / 2; pp.position.set(0, y, -5.7); scene.add(pp); }
    const door2 = H.box(1.2, 2.4, .12, '#4a3a2e'); door2.position.set(-5.85, -8.2, -1.5); door2.rotation.y = Math.PI / 2; scene.add(door2);
    const cage = new THREE.Mesh(new THREE.SphereGeometry(.26, 6, 4), new THREE.MeshBasicMaterial({ color: '#111', wireframe: true })); cage.position.set(0, -5.62, -3); scene.add(cage);

    return {
      update(t, p) {
        animateHitler(t, p);
        for (const s of smokes) s.userData.at(t, .7);
        const after = t - p.tShot;
        const fl = 1 - p.flicker * (.5 + .5 * Math.sin(t * 31) * Math.sin(t * 7.3)) * (Math.sin(t * 2.1) > .4 ? 1 : .15);
        const on = after < 0 || after > .25 ? (after > .25 ? .15 : 1) : 0;
        lamp.intensity = 18 * fl * on; bulb.material.color.set(p.lampColor).multiplyScalar(on * fl + .05);
        flash.intensity = after > 0 && after < .1 ? 70 : 0;
        L.sun.intensity = .7; L.hemi.intensity = .7 * (after > 0 ? .5 : 1);
      },
      camera(t, cam, p) {
        // Eine durchgehende, gleichmäßige Fahrt: über der Ruinenstadt (Bunker verdeckt) senkrecht unter die
        // Erdoberfläche bis vor den Schnitt und weiter auf das Sofa zu. Position und Blick folgen je einer Spline,
        // Tempo nach Bogenlänge mit einer einzigen weichen Beschleunigung/Abbremsung (kein Halt zwischen den Phasen).
        if (!camPath || camKey !== [p.camFromX, p.camFromY, p.camFromZ, p.camToX, p.camToY, p.camToZ, p.closeX, p.closeY, p.closeZ, p.lookX, p.lookY, p.lookZ, p.lookEndX, p.lookEndY, p.lookEndZ].join()) {
          camKey = [p.camFromX, p.camFromY, p.camFromZ, p.camToX, p.camToY, p.camToZ, p.closeX, p.closeY, p.closeZ, p.lookX, p.lookY, p.lookZ, p.lookEndX, p.lookEndY, p.lookEndZ].join();
          const A = new THREE.Vector3(p.camFromX, p.camFromY, p.camFromZ), B = new THREE.Vector3(p.camToX, p.camToY, p.camToZ), C = new THREE.Vector3(p.closeX, p.closeY, p.closeZ);
          const M = new THREE.Vector3(A.x + (B.x - A.x) * .35, (A.y + B.y) * .5 - 1.2, A.z + (B.z - A.z) * .6);   // weicher Bogen nach unten
          camPath = new THREE.CatmullRomCurve3([A, M, B, C], false, 'centripetal');
          const LA = new THREE.Vector3(p.lookX, p.lookY, p.lookZ), LB = new THREE.Vector3(p.lookEndX, p.lookEndY, p.lookEndZ), LC = new THREE.Vector3(-2.5, -8.55, -5.1);
          lookPath = new THREE.CatmullRomCurve3([LA, LA.clone().lerp(LB, .5), LB, LC], false, 'centripetal');
        }
        const u = H.easeInOut(H.span(t, p.tDescend, p.tShot - .3));
        camPath.getPointAt(u, cam.position);
        frontDeco.visible = cam.position.y > .05;
        cam.lookAt(lookPath.getPointAt(u, lookTmp));
      }
    };
  }
};
