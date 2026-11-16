import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

const TOKIO = [35.7, 139.7], PEARL = [21.3, -157.9], WASHINGTON = [38.9, -77.0], BERLIN = [52.5, 13.4], ROM = [41.9, 12.5];
const USA_C = [39.5, -98.5];

// Ablauf: Pazifik (Japan rot) -> Angriff auf Pearl Harbor (7.12.1941) -> USA leuchtet blau auf, Kriegseintritt ->
// Drehung zum Atlantik -> Deutschland und Italien erklären den USA den Krieg (11.12.1941), Bögen nach Washington.
export default {
  id: 'kriegseintritt-usa', title: 'Kriegseintritt der USA', seed: 12, duration: 10,
  script: 'Dies führt dazu, dass die Vereinigten Staaten ihre Neutralität aufgeben und in den Zweiten Weltkrieg eintreten. Deutschland und Italien erklären ihnen kurz darauf den Krieg.',
  caption: { title: 'Die USA treten in den Krieg ein', sub: 'Dezember 1941' },
  params: {
    globeSize: { type: 'number', min: 2, max: 8, step: .05, value: 5, label: 'Globus Radius' },
    globeY: { type: 'number', min: -8, max: 4, step: .05, value: -2, label: 'Globus Höhe (− = tiefer)' },
    rotOffset: { type: 'number', min: -180, max: 180, step: 1, value: 0, label: 'Drehung Korrektur (°)' },
    rotSpeed: { type: 'number', min: 0, max: 10, step: .1, value: 1.5, label: 'Grunddrehung (°/s)' },
    tilt: { type: 'number', min: -45, max: 45, step: 1, value: 16, label: 'Neigung (°)' },
    oceanColor: { type: 'color', value: '#0d1520', label: 'Ozean' },
    landColor: { type: 'color', value: '#6f747c', label: 'Land' },
    spaceColor: { type: 'color', value: '#06080c', label: 'Hintergrund' },
    atmosphere: { type: 'boolean', value: true, label: 'Atmosphärensaum' },
    labels: { type: 'boolean', value: true, label: 'Beschriftungen' },
    blastSize: { type: 'number', min: .2, max: 3, step: .05, value: 1, label: 'Explosion Größe' },
    labelSize: { type: 'number', min: .2, max: 1.5, step: .01, value: .4, label: 'Beschriftung Größe' },
    tAttack: { type: 'number', min: 0, max: 10, step: .1, value: .7, label: 'Angriff ab (s)' },
    tUSA: { type: 'number', min: 0, max: 10, step: .1, value: 2.9, label: 'USA ab (s)' },
    tDeclare: { type: 'number', min: 0, max: 10, step: .1, value: 6.3, label: 'Kriegserklärung ab (s)' },
    ...H.cameraParams([0, 2.5, 14], [1, 2, 12.5], [0, 0, 0], 40)
  },
  build({ scene, camera, params: p, rng: r }) {
    scene.background = new THREE.Color(p.spaceColor);
    H.lights(scene, { sun: [8, 6, 10], shadows: false, intensity: 1.5, hemi: .75, skyColor: '#ffffff', groundColor: '#223' });
    const stars = H.particles(r, { count: 500, area: [90, 60, 20], color: '#ffffff', size: .1, opacity: .6 });
    stars.position.z = -35; scene.add(stars);
    const R = p.globeSize;
    const g = H.globe(R, { ocean: p.oceanColor, land: p.landColor });
    g.children[1].visible = p.atmosphere;
    const tilt = new THREE.Group(); tilt.rotation.x = p.tilt * Math.PI / 180; tilt.position.y = p.globeY; tilt.add(g); scene.add(tilt);
    const U = g.userData, k = R / 5;

    // Länderflächen
    const fJapan = U.highlight(['392'], H.ROLE.axis), fUSA = U.highlight(['840'], H.ROLE.west, 1.1);
    const fGer = U.highlight(['276', '040'], H.ROLE.axis), fIta = U.highlight(['380'], H.ROLE.axis);

    // Orte als Kartenpunkte (Apple-Karten-Stil): weißer Ring, farbiger Kern, pulsierender Halo
    const pin = (ll, c, sz = 1) => U.pin(ll[0], ll[1], c, { size: .55 * k * sz });
    const mTokio = pin(TOKIO, H.ROLE.axis), mPearl = pin(PEARL, P.orange, .95), mWash = pin(WASHINGTON, H.ROLE.west, 1.05);
    const mBerlin = pin(BERLIN, H.ROLE.axis, .9), mRom = pin(ROM, H.ROLE.axis, .85);
    const attack = U.arc(TOKIO, PEARL, H.ROLE.axis, { lift: 1.22, radius: .03 * k, head: .1 * k });
    const declB = U.arc(BERLIN, WASHINGTON, H.ROLE.axis, { lift: 1.2, radius: .025 * k, head: .085 * k });
    const declR = U.arc(ROM, WASHINGTON, H.ROLE.axis, { lift: 1.15, radius: .025 * k, head: .085 * k });
    for (const a of [declB, declR]) { a.material.transparent = true; a.material.opacity = .85; }

    // Treffer in Pearl Harbor: Feuerball mit Flammenzungen, Splittern, Funken und Rauch, zwei Druckringe und ein
    // Brandfleck auf der Oberfläche. Alles in einer Gruppe, deren y-Achse die Oberflächennormale ist.
    const nPearl = H.latLon(PEARL[0], PEARL[1], 1);
    const site = new THREE.Group(); site.position.copy(nPearl).multiplyScalar(R); site.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), nPearl); g.add(site);
    const blastScale = p.blastSize * k;
    const boom = H.fireball(r, { size: .7 * blastScale, duration: 1.35, debris: 40, sparks: 80, ring: false }); site.add(boom);
    const ringGeo = new THREE.RingGeometry(.93, 1, 64);
    const mkRing = (color, o = .9) => {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      m.material.color.multiplyScalar(1.6); m.rotation.x = -Math.PI / 2; m.position.y = .01; m.visible = false; m.userData.o = o; site.add(m); return m;
    };
    const shock1 = mkRing('#ffd08a'), shock2 = mkRing(P.orange, .6);
    const scorch = new THREE.Mesh(new THREE.CircleGeometry(1, 40), new THREE.MeshBasicMaterial({ color: '#000000', transparent: true, depthWrite: false, opacity: 0 }));
    scorch.rotation.x = -Math.PI / 2; scorch.position.y = .005; scorch.scale.setScalar(.35 * blastScale); site.add(scorch);

    // Beschriftungen
    const labels = [];
    const L = (txt, ll, from, o = {}) => { if (!p.labels) return; const l = U.label(txt, ll[0], ll[1], { size: p.labelSize * k * (o.scale || 1), lift: 1 + .14 * (o.lift || 1), font: H.labelFont(60, 500) }); labels.push({ l, from }); };
    L('Japan', [TOKIO[0] + 9, TOKIO[1] + 4], () => p.tAttack - .3);
    L('Pearl Harbor', [PEARL[0] + 3, PEARL[1] + 15], () => p.tAttack + 1.2);
    L('USA', USA_C, () => p.tUSA + .3, { scale: 1.15 });
    L('Deutschland', [BERLIN[0] + 2, BERLIN[1] + 13], () => p.tDeclare);
    L('Italien', [ROM[0] - 6, ROM[1] + 6], () => p.tDeclare + .4);

    return {
      update(t, p) {
        // Blickpunkt: Pazifik -> USA -> Atlantik, mit gleichmäßiger Grunddrehung (keine Stopps)
        const lon = 168 + p.rotSpeed * t + 88 * H.smooth(H.span(t, p.tAttack + 1.2, p.tUSA + 1.6)) + 44 * H.smooth(H.span(t, p.tDeclare - 1.1, p.tDeclare + 1.4));
        g.rotation.y = (-90 - lon + p.rotOffset) * Math.PI / 180;

        // Japan ist von Beginn an markiert, Angriff mit Bogen
        fJapan.userData.setAmount(.55 + .25 * H.span(t, p.tAttack - .5, p.tAttack));
        mTokio.userData.set({ halo: ((t + .4) % 1.8) / 1.8 });
        const tHit = p.tAttack + 1.4;
        attack.userData.setProgress(H.span(t, p.tAttack, tHit));

        // Treffer
        const age = t - tHit;
        boom.userData.at(age);
        for (const [m, d, len, grow] of [[shock1, 0, .9, 1.5], [shock2, .15, 1.2, 2.1]]) {
          const u = H.span(age, d, d + len);
          m.visible = u > 0 && u < 1; m.scale.setScalar(blastScale * (.1 + H.easeOut(u) * grow * .5)); m.material.opacity = (1 - u) * m.userData.o;
        }
        // Feuerball nur, solange Pearl Harbor der Kamera zugewandt ist (sonst ragt Rauch seitlich aus dem Globus)
        site.updateWorldMatrix(true, false);
        const sw = new THREE.Vector3().setFromMatrixPosition(site.matrixWorld), cw = new THREE.Vector3().setFromMatrixPosition(tilt.matrixWorld);
        boom.scale.setScalar(Math.max(.001, H.smoothstep(.5, .78, sw.sub(cw).normalize().dot(camera.position.clone().sub(cw).normalize()))));
        scorch.material.opacity = H.span(age, .1, .6) * .45;
        mPearl.userData.set({ scale: age > 0 ? 1 : .75, halo: age > 0 ? (age % 1.4) / 1.4 : 0 });

        // USA treten ein
        const usa = H.span(t, p.tUSA, p.tUSA + .9);
        fUSA.userData.setAmount(usa * (.62 + .1 * H.pulse(t, 1.6)));
        mWash.userData.set({ scale: .7 + .3 * usa, halo: usa > 0 ? ((t - p.tUSA) % 1.6) / 1.6 : 0 });

        // Kriegserklärungen
        fGer.userData.setAmount(H.span(t, p.tDeclare - .4, p.tDeclare + .4) * .7);
        fIta.userData.setAmount(H.span(t, p.tDeclare, p.tDeclare + .8) * .7);
        declB.userData.setProgress(H.span(t, p.tDeclare + .2, p.tDeclare + 1.9));
        declR.userData.setProgress(H.span(t, p.tDeclare + .6, p.tDeclare + 2.3));
        mBerlin.userData.set({ scale: t > p.tDeclare ? 1 : .75, halo: t > p.tDeclare ? ((t - p.tDeclare) % 1.6) / 1.6 : 0 });
        mRom.userData.set({ scale: t > p.tDeclare + .4 ? 1 : .75, halo: t > p.tDeclare + .4 ? ((t - p.tDeclare - .4) % 1.6) / 1.6 : 0 });

        for (const { l, from } of labels) l.userData.show = H.span(t, from(), from() + .5);
      }
    };
  }
};
