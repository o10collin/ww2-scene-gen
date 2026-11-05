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
    dates: { type: 'boolean', value: true, label: 'Datumsangaben an den Bögen' },
    tAttack: { type: 'number', min: 0, max: 10, step: .1, value: .7, label: 'Angriff ab (s)' },
    tUSA: { type: 'number', min: 0, max: 10, step: .1, value: 2.9, label: 'USA ab (s)' },
    tDeclare: { type: 'number', min: 0, max: 10, step: .1, value: 6.3, label: 'Kriegserklärung ab (s)' },
    ...H.cameraParams([0, 2.5, 14], [1, 2, 12.5], [0, 0, 0], 40)
  },
  build({ scene, params: p, rng: r }) {
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

    // Orte
    const mk = (ll, c, rad) => { const m = U.marker(ll[0], ll[1], c, rad * k); m.material = H.glowMat(c, 2.2); return m; };
    const mTokio = mk(TOKIO, H.ROLE.axis, .13), mPearl = mk(PEARL, P.orange, .12), mWash = mk(WASHINGTON, H.ROLE.west, .14);
    const mBerlin = mk(BERLIN, H.ROLE.axis, .12), mRom = mk(ROM, H.ROLE.axis, .11);
    const attack = U.arc(TOKIO, PEARL, H.ROLE.axis, { lift: 1.22, radius: .045 * k, head: .11 * k });
    const declB = U.arc(BERLIN, WASHINGTON, H.ROLE.axis, { lift: 1.2, radius: .035 * k, head: .09 * k });
    const declR = U.arc(ROM, WASHINGTON, H.ROLE.axis, { lift: 1.15, radius: .035 * k, head: .09 * k });
    for (const a of [declB, declR]) { a.material.transparent = true; a.material.opacity = .85; }

    // Treffer in Pearl Harbor: kleiner Blitz und Druckring auf der Oberfläche
    const boom = H.explosion({ size: .32 * k, duration: 1.1, color: P.orange, smoke: P.darkGrey });
    boom.position.copy(mPearl.position); g.add(boom);
    const ringGeo = new THREE.RingGeometry(.85, 1, 48);
    const mkRing = (pos, color) => {
      const m = new THREE.Mesh(ringGeo, new THREE.MeshBasicMaterial({ color, transparent: true, side: THREE.DoubleSide, depthWrite: false }));
      m.material.color.multiplyScalar(1.5);
      m.position.copy(pos).multiplyScalar(1.003); m.lookAt(pos.clone().multiplyScalar(2)); m.visible = false; g.add(m); return m;
    };
    const shock = mkRing(mPearl.position, P.orange), washRing = mkRing(mWash.position, H.ROLE.west);

    // Beschriftungen
    const labels = [];
    const L = (txt, ll, from, o = {}) => { if (!p.labels) return; const l = U.label(txt, ll[0], ll[1], { size: .62 * k * (o.scale || 1), lift: 1 + .14 * (o.lift || 1), ...o.style }); labels.push({ l, from }); };
    L('Japan', [TOKIO[0] + 9, TOKIO[1] + 4], () => p.tAttack - .3);
    L('Pearl Harbor', [PEARL[0] + 3, PEARL[1] + 15], () => p.tAttack + 1.2);
    L('USA', USA_C, () => p.tUSA + .3, { scale: 1.25 });
    L('Deutschland', [BERLIN[0] + 2, BERLIN[1] + 13], () => p.tDeclare);
    L('Italien', [ROM[0] - 6, ROM[1] + 6], () => p.tDeclare + .4);
    if (p.labels && p.dates) {
      const dateStyle = { style: { font: "italic 500 60px 'Cormorant Garamond', Georgia, serif", bg: null, color: '#e9d7b4' } };
      L('7. Dezember 1941', [46, -168], () => p.tAttack + 1.4, { scale: .9, lift: 1.6, ...dateStyle });
      L('11. Dezember 1941', [38, -36], () => p.tDeclare + 1.6, { scale: .9, lift: 1.5, ...dateStyle });
    }

    return {
      update(t, p) {
        // Blickpunkt: Pazifik -> USA -> Atlantik, mit gleichmäßiger Grunddrehung (keine Stopps)
        const lon = 168 + p.rotSpeed * t + 88 * H.smooth(H.span(t, p.tAttack + 1.2, p.tUSA + 1.6)) + 44 * H.smooth(H.span(t, p.tDeclare - 1.1, p.tDeclare + 1.4));
        g.rotation.y = (-90 - lon + p.rotOffset) * Math.PI / 180;

        // Japan ist von Beginn an markiert, Angriff mit Bogen
        fJapan.userData.setAmount(.55 + .25 * H.span(t, p.tAttack - .5, p.tAttack));
        mTokio.scale.setScalar(1 + .25 * H.pulse(t, 1.3));
        const tHit = p.tAttack + 1.4;
        attack.userData.setProgress(H.span(t, p.tAttack, tHit));
        attack.material.opacity = 1;
        boom.userData.at(t - tHit);
        const sk = H.span(t, tHit, tHit + 1.1);
        shock.visible = sk > 0 && sk < 1; shock.scale.setScalar((.15 + sk * .9) * k); shock.material.opacity = (1 - sk) * .9;
        mPearl.scale.setScalar(t > tHit ? 1 + .4 * H.pulse(t, 1.1) : .7);

        // USA treten ein
        const usa = H.span(t, p.tUSA, p.tUSA + .9);
        fUSA.userData.setAmount(usa * (.62 + .1 * H.pulse(t, 1.6)));
        mWash.scale.setScalar(.6 + usa * (.6 + .25 * H.pulse(t, 1.2)));
        const rk = ((t - p.tUSA) % 1.6) / 1.6;
        washRing.visible = t > p.tUSA; washRing.scale.setScalar((.15 + rk * .8) * k); washRing.material.opacity = (1 - rk) * .7 * usa;

        // Kriegserklärungen
        fGer.userData.setAmount(H.span(t, p.tDeclare - .4, p.tDeclare + .4) * .7);
        fIta.userData.setAmount(H.span(t, p.tDeclare, p.tDeclare + .8) * .7);
        declB.userData.setProgress(H.span(t, p.tDeclare + .2, p.tDeclare + 1.9));
        declR.userData.setProgress(H.span(t, p.tDeclare + .6, p.tDeclare + 2.3));
        mBerlin.scale.setScalar(t > p.tDeclare ? 1 + .3 * H.pulse(t, 1.3) : .6);
        mRom.scale.setScalar(t > p.tDeclare + .4 ? 1 + .3 * H.pulse(t + .3, 1.3) : .6);

        for (const { l, from } of labels) l.userData.show = H.span(t, from(), from() + .5);
      }
    };
  }
};
