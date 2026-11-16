import * as THREE from 'three';
import * as H from '../common.js';
import { hiMap } from '../map-hi.js';
import { REICH_1942 } from '../history.js';

// Europa Ende 1942: das Großdeutsche Reich in seinen damaligen Grenzen (mit Österreich, Böhmen und Mähren,
// den annektierten Teilen Polens, Ostpreußen mit Memelland, Elsass-Lothringen, Luxemburg, Nord-Slowenien),
// Farben wie im übrigen Video: graues Land, dunkles Meer, helle Grenzen, nur das Reich rot. Besetzte Gebiete,
// Achsenverbündete, Sowjetunion und Großbritannien lassen sich optional einfärben („Bündnisse einfärben“).
// Druck von allen Seiten: Bomberangriffe aus England, Landung in Nordafrika und El Alamein, sowjetische
// Gegenoffensiven bei Stalingrad und Rschew. Der Frontverlauf im Osten (Nov. 1942) leuchtet gelb.

// Frontverlauf Ost, November 1942 (Leningrad – Rschew – Woronesch – Don – Stalingrad – Kaukasus)
const FRONT = [[30.2, 59.75], [31.3, 59.1], [31.6, 58.3], [32.2, 57.5], [31.0, 56.6], [30.6, 56.25], [32.0, 55.95], [34.3, 56.3], [35.0, 55.6], [35.0, 54.6], [35.6, 54.0], [36.3, 53.2], [36.8, 52.4], [37.6, 51.8], [39.2, 51.65], [39.8, 50.8], [41.0, 50.0], [42.5, 49.5], [43.6, 49.0], [44.5, 48.7], [44.4, 47.6], [44.0, 46.6], [44.3, 45.5], [44.6, 44.6], [44.6, 43.75], [43.6, 43.45], [42.3, 43.6], [40.0, 44.15], [39.1, 44.1]];
// alles westlich/südlich der Front (für den besetzten Teil Russlands)
const WEST_OF_FRONT = [[20, 61], [30.2, 61], ...FRONT, [37, 43.5], [20, 43.5]];
const EAST_OF_FRONT = [[30.2, 61], [30.2, 72], [70, 72], [70, 38], [39.1, 38], [39.1, 44.1], ...[...FRONT].reverse()];

const OCCUPIED = [
  { c: '250' }, { c: '056' }, { c: '528' }, { c: '208' }, { c: '578' }, { c: '616' }, { c: '688' }, { c: 'Kosovo' }, { c: '300' }, { c: '499' },
  { c: '233' }, { c: '428' }, { c: '440' }, { c: '112' }, { c: '804' }, { c: '643', clip: WEST_OF_FRONT }
];
const AXIS_ALLIES = [{ c: '380' }, { c: '348' }, { c: '642' }, { c: '100' }, { c: '246' }, { c: '703' }, { c: '191' }, { c: '070' }, { c: '008' }, { c: '498' }, { c: '434' }, { c: '705' }];
const SOVIET = [{ c: '643', clip: EAST_OF_FRONT }, { c: '268' }, { c: '051' }, { c: '031' }, { c: '398' }];
const BRITAIN = [{ c: '826' }];

// Pfeile: [Farbe, Start (s), Wegpunkte]
const ARROWS = [
  ['west', .6, [[-0.4, 52.2], [3.2, 52.6], [6.9, 50.95]]],             // RAF: London -> Köln
  ['west', 1.2, [[-0.6, 53.5], [4.5, 54.6], [9.9, 53.55]]],            // RAF: England -> Hamburg
  ['west', 2.0, [[-1.0, 35.6], [3.0, 36.9], [9.8, 36.8]]],             // Operation Torch: Oran -> Algier -> Tunis
  ['west', 1.6, [[29.0, 30.9], [25.5, 31.6], [21.5, 32.1]]],           // El Alamein -> Libyen
  ['soviet', 2.6, [[44.8, 51.4], [43.3, 50.0], [43.6, 48.85]]],        // Stalingrad, Nordzange
  ['soviet', 2.9, [[48.0, 46.6], [45.8, 47.5], [44.0, 48.45]]],        // Stalingrad, Südzange
  ['soviet', 3.4, [[39.4, 55.4], [37.0, 56.2], [34.8, 56.35]]],        // Moskau -> Rschew
  ['soviet', 3.8, [[43.0, 53.0], [40.8, 52.2], [38.7, 51.8]]]         // Woronesch
];

export default {
  id: 'druck-auf-deutschland', title: 'Deutschland unter Druck', seed: 13, duration: 7,
  script: 'Die Alliierten werden stärker und Deutschland gerät mehr und mehr unter Druck.',
  caption: { title: 'Europa', sub: '1942' },
  params: {
    mapScale: { type: 'number', min: .2, max: 1.2, step: .01, value: .44, label: 'Kartenmaßstab' },
    mapCenterLon: { type: 'number', min: -10, max: 40, step: .5, value: 17.5, label: 'Kartenmitte Länge (°)' },
    mapCenterLat: { type: 'number', min: 30, max: 65, step: .5, value: 43.3, label: 'Kartenmitte Breite (°)' },
    squeeze: { type: 'number', min: 0, max: .3, step: .01, value: .06, label: 'Reich zusammendrücken' },
    arrowSize: { type: 'number', min: .3, max: 3, step: .05, value: 1, label: 'Pfeilstärke' },
    front: { type: 'boolean', value: true, label: 'Ostfront einzeichnen' },
    landColor: { type: 'color', value: '#767b82', label: 'Land' },
    seaColor: { type: 'color', value: '#24282d', label: 'Meer' },
    borderColor: { type: 'color', value: '#dfe5ec', label: 'Grenzen' },
    germanyColor: { type: 'color', value: '#7a2a26', label: 'Deutsches Reich' },
    tint: { type: 'boolean', value: false, label: 'Bündnisse/Besatzung einfärben' },
    occupiedColor: { type: 'color', value: '#7a2a26', label: 'Besetzte Gebiete' },
    alliesAxisColor: { type: 'color', value: '#5e3a37', label: 'Verbündete der Achse' },
    labelFont: { type: 'select', options: ['Cormorant Garamond (Serif)', 'wie Bauchbinde'], value: 'Cormorant Garamond (Serif)', label: 'Schrift Beschriftung' },
    labels: { type: 'boolean', value: true, label: 'Beschriftung' },
    labelSize: { type: 'number', min: .3, max: 3, step: .05, value: 1.55, label: 'Beschriftung Größe' },
    ...H.cameraParams([0, 26, 20], [0, 21, 14], [0.5, 0, -2], 38)
  },
  build({ scene, params: p, rng: r }) {
    H.sky(scene, '#0b1017', 28, 52);   // Kartenrand verschwindet im Dunst
    H.lights(scene, { sun: [10, 30, 10], intensity: 1.3, hemi: .5, shadows: false, skyColor: '#cfd8e3', groundColor: '#222' });
    const tint = p.tint ? [
      { parts: SOVIET, color: H.ROLE.soviet, alpha: .16 },
      { parts: BRITAIN, color: H.ROLE.west, alpha: .22 },
      { parts: AXIS_ALLIES, color: p.alliesAxisColor, alpha: .45 },
      { parts: OCCUPIED, color: p.occupiedColor, alpha: .3, hatch: '#d9b0a8', hatchAlpha: .22 }
    ] : [];
    const border = new THREE.Color(p.borderColor), rgba = a => `rgba(${border.r * 255 | 0},${border.g * 255 | 0},${border.b * 255 | 0},${a})`;
    const map = hiMap({
      bbox: [-30, 22, 82, 78], center: [p.mapCenterLon, p.mapCenterLat], scale: p.mapScale, land: p.landColor, sea: p.seaColor,
      borders: rgba(.62), coast: rgba(.55), borderWidth: 2.4, glowBorders: true,
      font: p.labelFont.startsWith('Cormorant') ? "'Cormorant Garamond', Georgia, serif" : null,
      regions: [
        ...tint,
        { name: 'reich', parts: REICH_1942, color: p.germanyColor, alpha: 1, outline: '#f4ece6', glow: '#c0453a', layer: { bbox: [4.5, 44.8, 25, 56.6], pivot: [13.5, 51.3] } }
      ]
    });
    scene.add(map);
    const U = map.userData, reich = U.layers.reich, P = ([lon, lat]) => U.project(lon, lat);

    const front = p.front ? U.line(FRONT, '#e8c27a', { radius: .03, strength: 1.1 }) : null;
    const arrows = ARROWS.map(([side, t0, pts]) => {
      const a = H.curvedArrow(pts.map(P), side === 'west' ? H.ROLE.west : H.ROLE.soviet, { radius: .085 * p.arrowSize, head: .55 * p.arrowSize, lift: .15, strength: 2.6 });
      scene.add(a); return { a, t0 };
    });

    if (p.labels) {
      const s = p.labelSize;
      U.country(11.0, 50.9, 'Deutsches Reich', .62 * s, { color: '#fff3ea', opacity: .95 });
      U.country(2.4, 46.6, 'Frankreich', .45 * s); U.country(-4.0, 56.6, 'Großbritannien', .45 * s);
      U.country(16.0, 40.7, 'Italien', .42 * s); U.country(45.0, 57.5, 'Sowjetunion', .55 * s);
      U.country(-3.8, 40.0, 'Spanien', .4 * s, { opacity: .55 }); U.country(33.5, 39.2, 'Türkei', .4 * s, { opacity: .55 });
      U.country(4.0, 32.6, 'Nordafrika', .4 * s, { opacity: .6 });
      U.city(13.4, 52.5, 'Berlin', { size: .5 * s, dx: 1.25, dz: .05 }); U.city(-0.1, 51.5, 'London', { size: .45 * s, dx: -1.2, dz: .05 });
      U.city(37.6, 55.75, 'Moskau', { size: .45 * s }); U.city(44.5, 48.7, 'Stalingrad', { size: .45 * s, dx: 1.3, dz: .1 });
      U.city(12.5, 41.9, 'Rom', { size: .42 * s }); U.city(30.3, 59.95, 'Leningrad', { size: .42 * s });
    }
    return {
      update(t, p) {
        const u = H.easeInOut(t / p.duration);
        // Reich wird spürbar zusammengedrückt und pulsiert leicht
        const sq = 1 - p.squeeze * H.smooth(H.span(t, 1.5, p.duration)) - .012 * H.pulse(t, 1.1) * H.span(t, 2, 3);
        reich.scale.set(sq, 1, sq);
        if (front) front.userData.setProgress(H.span(t, .4, 2.4));
        for (const { a, t0 } of arrows) a.userData.setProgress(H.span(t, t0, t0 + 1.8) * (.92 + .08 * H.pulse(t + t0, .7)));
      }
    };
  }
};
