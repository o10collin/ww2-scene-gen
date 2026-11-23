import * as THREE from 'three';
import * as H from '../common.js';
import { JAPAN_1941 } from '../history.js';
const { P } = H;

// Japan kämpft weiter (Stil wie Szene 2): Globus mit echten Küsten, Blick auf den Westpazifik. Das Japanische
// Kaiserreich (Japan, Korea, Taiwan) ist rot, die im Sommer 1945 noch besetzten Gebiete (Mandschukuo, Ostchina,
// Indochina, Malaya, Niederländisch-Indien) heller rot. Die USA rücken über die Inseln vor: Bögen mit Kartenpunkten
// von Pearl Harbor über Saipan, Iwo Jima und Okinawa bis vor Japan. Gebiete vereinfacht.
const TOKIO = [35.7, 139.7], PEARL = [21.3, -157.9], SAIPAN = [15.2, 145.75], IWO = [24.78, 141.32], OKINAWA = [26.4, 127.8], KYUSHU = [32.0, 131.0];
const OCCUPIED_1945 = [
  { c: '156', clip: [[115, 39], [124, 39], [126, 41.5], [131, 42.5], [135, 48], [134, 53.6], [119, 53.6], [116, 49], [114, 42]] },   // Mandschukuo
  { c: '156', clip: [[109, 40.5], [124, 40.5], [123, 29], [121, 25], [116, 22.3], [109, 21], [112, 28], [113, 34]] },               // besetztes Ostchina
  { c: '704' }, { c: '418' }, { c: '116' }, { c: '458' }, { c: '360' }
];

export default {
  id: 'japan-kaempft-weiter', title: 'Japan kämpft weiter', seed: 24, duration: 7, rev: 2,
  script: 'Obwohl Deutschland den Krieg verliert, kämpft Japan weiter.',
  caption: { title: 'Der Krieg im Pazifik geht weiter', sub: 'Sommer 1945' },
  params: {
    globeSize: { type: 'number', min: 2, max: 8, step: .05, value: 5, label: 'Globus Radius' },
    globeY: { type: 'number', min: -8, max: 4, step: .05, value: -.4, label: 'Globus Höhe (− = tiefer)' },
    lonStart: { type: 'number', min: 90, max: 220, step: 1, value: 152, label: 'Blick Länge Start (°)' },
    lonEnd: { type: 'number', min: 90, max: 220, step: 1, value: 136, label: 'Blick Länge Ende (°)' },
    tilt: { type: 'number', min: -45, max: 45, step: 1, value: 22, label: 'Neigung (°)' },
    tHop: { type: 'number', min: 0, max: 7, step: .1, value: .9, label: 'Inselsprünge ab (s)' },
    oceanColor: { type: 'color', value: '#0d1520', label: 'Ozean' },
    landColor: { type: 'color', value: '#6f747c', label: 'Land' },
    spaceColor: { type: 'color', value: '#06080c', label: 'Hintergrund' },
    atmosphere: { type: 'boolean', value: true, label: 'Atmosphärensaum' },
    labels: { type: 'boolean', value: true, label: 'Beschriftungen' },
    labelSize: { type: 'number', min: .2, max: 1.5, step: .01, value: .4, label: 'Beschriftung Größe' },
    ...H.cameraParams([0, 2.5, 14], [1, 2, 12.5], [0, 0, 0], 40)
  },
  build({ scene, params: p, rng: r }) {
    scene.background = new THREE.Color(p.spaceColor);
    H.lights(scene, { sun: [8, 6, 10], shadows: false, intensity: 1.5, hemi: .75, skyColor: '#ffffff', groundColor: '#223' });
    const stars = H.particles(r, { count: 500, area: [90, 60, 20], color: '#ffffff', size: .1, opacity: .6 }); stars.position.z = -35; scene.add(stars);
    const R = p.globeSize, k = R / 5;
    const g = H.globe(R, { ocean: p.oceanColor, land: p.landColor });
    g.children[1].visible = p.atmosphere;
    const tilt = new THREE.Group(); tilt.rotation.x = p.tilt * Math.PI / 180; tilt.position.y = p.globeY; tilt.add(g); scene.add(tilt);
    const U = g.userData;
    const fJapan = U.highlight(JAPAN_1941, H.ROLE.axis), fOcc = U.highlight(OCCUPIED_1945, '#c4524b', .95);
    fJapan.userData.setAmount(.75);

    const pin = (ll, c, sz = 1) => U.pin(ll[0], ll[1], c, { size: .5 * k * sz });
    const mJapan = pin(TOKIO, H.ROLE.axis, 1.05);
    // Bogenhöhe aus dem Winkel zwischen den Orten: lange Bögen müssen höher steigen, sonst tauchen sie in den Globus
    const liftFor = (a, b) => 2.06 - Math.cos(H.latLon(a[0], a[1], 1).angleTo(H.latLon(b[0], b[1], 1)) / 2);
    const hops = [[PEARL, SAIPAN, 'Saipan', 0, 1], [SAIPAN, IWO, 'Iwo Jima', 1.25, 1], [IWO, OKINAWA, 'Okinawa', 2.3, -1]].map(([a, b, name, d, side]) => ({ side,
      arc: U.arc(a, b, H.ROLE.west, { lift: liftFor(a, b), radius: .022 * k, head: .085 * k }), dst: pin(b, H.ROLE.west, .8), name, ll: b, d
    }));
    for (const h of hops) h.dst.userData.set({ opacity: 0 });
    const final = U.arc(OKINAWA, KYUSHU, H.ROLE.west, { lift: liftFor(OKINAWA, KYUSHU), radius: .03 * k, head: .1 * k });
    const mPearl = pin(PEARL, H.ROLE.west, .9);

    const labels = [];
    const L = (txt, ll, from) => { if (!p.labels) return; const l = U.label(txt, ll[0], ll[1], { size: p.labelSize * k, lift: 1.14, font: H.labelFont(60, 500) }); labels.push({ l, from }); };
    L('Japan', [TOKIO[0] + 6, TOKIO[1] + 6], () => 0);
    L('Besetzte Gebiete', [33, 112], () => .3);
    L('Pearl Harbor', [PEARL[0] + 5, PEARL[1]], () => 0);
    for (const h of hops) L(h.name, h.side > 0 ? [h.ll[0] + .5, h.ll[1] + 8.5] : [h.ll[0] - 4.2, h.ll[1] - 2], () => p.tHop + h.d + .8);

    return {
      update(t, p) {
        const lon = H.lerp(p.lonStart, p.lonEnd, H.easeInOut(t / p.duration));
        g.rotation.y = (-90 - lon) * Math.PI / 180;
        fOcc.userData.setAmount(.5 * H.span(t, 0, .6));
        mJapan.userData.set({ halo: (t % 1.6) / 1.6 });
        for (const h of hops) {
          const u = H.span(t, p.tHop + h.d, p.tHop + h.d + 1.0);
          h.arc.userData.setProgress(u);
          h.dst.userData.set({ opacity: H.span(u, .85, 1), halo: u >= 1 ? ((t - p.tHop - h.d - 1) % 1.4) / 1.4 : 0 });
        }
        final.userData.setProgress(H.span(t, p.tHop + 3.5, p.tHop + 4.6));
        for (const { l, from } of labels) l.userData.show = H.span(t, from(), from() + .5);
      }
    };
  }
};
