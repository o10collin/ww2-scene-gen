import * as THREE from 'three';
import * as H from '../common.js';
import { hiMap, mercY, regionMaskTexture } from '../map-hi.js';
import { REICH_1942 } from '../history.js';

// Kriegswende an der Ostfront (Stil wie Szene 3): Nach Stalingrad drängt die Rote Armee die Front von der Wolga
// bis an den Donez zurück (Nov. 1942 -> März 1943). Das von Deutschland besetzte sowjetische Gebiet (rot getönt)
// schrumpft mit der Front, gelbe Kartenpfeile schieben sie nach Westen. Frontverläufe vereinfacht.
const LATS = [60, 58, 56, 54, 52, 50, 48.7, 47, 45.5, 44];
const FRONT_A = [30.2, 31.6, 32.4, 35.0, 36.8, 39.8, 44.4, 44.2, 44.0, 43.2];   // November 1942 (bis Stalingrad, Kaukasus)
const FRONT_B = [30.2, 31.4, 32.4, 34.6, 35.6, 36.4, 37.6, 38.6, 38.2, 37.6];   // März 1943 (Rschew, Kursker Bogen, Donez, Mius)
const SOVIET_LAND = [{ c: '643' }, { c: '804' }, { c: '112' }, { c: '233' }, { c: '428' }, { c: '440' }, { c: '498' }];
const BBOX = [21, 43, 50, 61];
const ARROWS = [[57, 0], [53.2, .25], [49.6, .1], [47.0, .35]];                 // [Breite, Startverzögerung]

export default {
  id: 'kriegswende', title: 'Kriegswende', seed: 15, duration: 8,
  script: 'Die Rote Armee drängt die deutschen Truppen zurück. Dies wird oft als Kriegswende bezeichnet.',
  caption: { title: 'Ostfront', sub: 'Februar 1943' },
  params: {
    mapScale: { type: 'number', min: .3, max: 2.5, step: .01, value: .95, label: 'Kartenmaßstab (Zoom)' },
    mapCenterLon: { type: 'number', min: 10, max: 50, step: .1, value: 32, label: 'Bildmitte Länge (°)' },
    mapCenterLat: { type: 'number', min: 40, max: 62, step: .1, value: 51.5, label: 'Bildmitte Breite (°)' },
    tStart: { type: 'number', min: 0, max: 8, step: .1, value: 1.2, label: 'Gegenoffensive ab (s)' },
    tEnd: { type: 'number', min: 0, max: 8, step: .1, value: 6.6, label: 'Front erreicht Donez (s)' },
    arrowSize: { type: 'number', min: .3, max: 3, step: .05, value: 1, label: 'Pfeilstärke' },
    landColor: { type: 'color', value: '#5c6476', label: 'Land' },
    seaColor: { type: 'color', value: '#080d16', label: 'Meer' },
    borderColor: { type: 'color', value: '#ebeef4', label: 'Grenzen' },
    germanyColor: { type: 'color', value: '#ff2d2d', label: 'Deutsches Reich' },
    occupiedColor: { type: 'color', value: '#b5524b', label: 'Besetztes Gebiet' },
    frontColor: { type: 'color', value: '#ffe2a8', label: 'Frontlinie' },
    labels: { type: 'boolean', value: true, label: 'Beschriftung' },
    labelSize: { type: 'number', min: .3, max: 4, step: .05, value: 2.1, label: 'Beschriftung Größe' },
    ...H.cameraParams([8, 28, 20], [2, 22, 14], [4, 0, -4], 38)
  },
  build({ scene, params: p, rng: r }) {
    H.sky(scene, '#06080c', 30, 56);
    H.lights(scene, { sun: [10, 30, 10], intensity: 1.3, hemi: .5, shadows: false, skyColor: '#cfd8e3', groundColor: '#222' });
    const border = new THREE.Color(p.borderColor), rgba = a => `rgba(${border.r * 255 | 0},${border.g * 255 | 0},${border.b * 255 | 0},${a})`;
    const map = hiMap({
      bbox: [-20, 25, 90, 78], texW: 3072, detail: { bbox: [4, 38, 58, 64], texW: 6144 },
      center: [p.mapCenterLon, p.mapCenterLat], scale: p.mapScale, land: p.landColor, sea: p.seaColor,
      borders: rgba(.42), coast: rgba(.3), borderWidth: 1.8,
      regions: [{ name: 'reich', parts: REICH_1942, color: p.germanyColor, alpha: .82, outline: '#ffffff', outlineWidth: 2.4, layer: { bbox: [4.5, 44.8, 25, 56.6] } }]
    });
    map.position.set(p.lookX, 0, p.lookZ);   // Bildmitte auf den Blickpunkt der Kamera
    scene.add(map);
    const U = map.userData;
    U.layers.reich.userData.mesh.material.color.setScalar(1.15);

    // Besetztes sowjetisches Gebiet: Fläche über dem Ausschnitt, Shader blendet alles östlich der Front aus
    const a = U.project(BBOX[0], BBOX[1]), b = U.project(BBOX[2], BBOX[3]);
    const occMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { mask: { value: regionMaskTexture(SOVIET_LAND, BBOX, 3072) }, col: { value: new THREE.Color(p.occupiedColor) }, u: { value: 0 },
        lats: { value: LATS }, fa: { value: FRONT_A }, fb: { value: FRONT_B }, bb: { value: new THREE.Vector4(BBOX[0], mercY(BBOX[1]), BBOX[2], mercY(BBOX[3])) } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `
        uniform sampler2D mask; uniform vec3 col; uniform float u; uniform float lats[10]; uniform float fa[10]; uniform float fb[10]; uniform vec4 bb;
        varying vec2 vUv;
        float frontLon(float lat) {
          float f = mix(fa[0], fb[0], u);
          for (int i = 0; i < 9; i++) {
            if (lat <= lats[i] && lat >= lats[i + 1]) { float k = (lats[i] - lat) / (lats[i] - lats[i + 1]); f = mix(mix(fa[i], fb[i], u), mix(fa[i + 1], fb[i + 1], u), k); }
          }
          if (lat < lats[9]) f = mix(fa[9], fb[9], u);
          return f;
        }
        void main() {
          float lon = mix(bb.x, bb.z, vUv.x), my = mix(bb.y, bb.w, vUv.y);
          float lat = degrees(2. * atan(exp(radians(my))) - 1.5707963);
          float m = texture2D(mask, vUv).a;
          float d = frontLon(lat) - lon;                    // > 0: westlich der Front = besetzt
          float occ = smoothstep(-.08, .08, d) * m;
          float hatch = step(.5, fract((gl_FragCoord.x + gl_FragCoord.y) / 14.));   // feine Schraffur: besetzt, nicht Reichsgebiet
          gl_FragColor = vec4(col * (1. + hatch * .25), occ * (.42 + hatch * .12));
        }`
    });
    const occ = new THREE.Mesh(new THREE.PlaneGeometry(b.x - a.x, a.z - b.z), occMat);
    occ.rotation.x = -Math.PI / 2; occ.position.set((a.x + b.x) / 2, .01, (a.z + b.z) / 2); occ.renderOrder = 1; map.add(occ);

    // Frontlinie: leuchtende Röhre, jedes Bild aus dem Verlauf neu gebaut
    const frontMat = H.glowMat(p.frontColor, 1.6);
    let front = null;
    const frontAt = (lat, u) => {
      for (let i = 0; i < 9; i++) if (lat <= LATS[i] && lat >= LATS[i + 1]) { const k = (LATS[i] - lat) / (LATS[i] - LATS[i + 1]); return H.lerp(H.lerp(FRONT_A[i], FRONT_B[i], u), H.lerp(FRONT_A[i + 1], FRONT_B[i + 1], u), k); }
      return H.lerp(FRONT_A[9], FRONT_B[9], u);
    };

    // Kartenpfeile der Roten Armee: wachsen mit der Front, die Spitze sitzt immer an der Frontlinie
    const arrows = ARROWS.map(([lat, delay]) => {
      const lonA = frontAt(lat, 0) + 4.5, lonB = frontAt(lat, 1) + .3;
      const pts = [[lonA, lat], [(lonA + lonB) / 2, lat + .5], [lonB, lat]];
      return { a: U.flatArrow(pts, H.ROLE.soviet, { width: .42 * p.arrowSize, head: 1.0 * p.arrowSize, headW: 1.05 * p.arrowSize }), lat, lonA, lonB, delay };
    });

    const s = p.labelSize;
    const city = (ll, name, color, dx = 0, dz = -.7) => {
      U.pin(ll[0], ll[1], color, { size: .5 });
      if (p.labels) { const l = U.country(ll[0], ll[1], name, .36 * s, { box: true }); const v = U.project(ll[0], ll[1], .6); l.position.set(v.x + dx, .6, v.z + dz); }
    };
    city([13.4, 52.5], 'Berlin', H.ROLE.axis); city([37.6, 55.75], 'Moskau', H.ROLE.soviet);
    city([44.5, 48.7], 'Stalingrad', H.ROLE.soviet, 1.9, .1); city([36.2, 50.0], 'Charkow', '#ffffff', 1.6, .1);
    if (p.labels) {
      U.country(16.5, 50.3, 'Deutsches Reich', .5 * s, { box: true });
      U.country(44.5, 57.0, 'Sowjetunion', .5 * s, { box: true });
    }
    return {
      update(t, p) {
        const u = H.easeInOut(H.span(t, p.tStart, p.tEnd));
        occMat.uniforms.u.value = u;
        if (front) { map.remove(front); front.geometry.dispose(); }
        const pts = [];
        for (let lat = 60; lat >= 45; lat -= .5) pts.push(U.project(frontAt(lat, u), lat, .05));
        front = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 80, .045, 5, false), frontMat);
        front.renderOrder = 3; map.add(front);
        for (const ar of arrows) {
          const tip = frontAt(ar.lat, u) + .3;
          ar.a.setProgress(t < p.tStart - .4 + ar.delay ? 0 : Math.max(.12, (ar.lonA - tip) / (ar.lonA - ar.lonB)) * H.span(t, p.tStart - .4 + ar.delay, p.tStart + ar.delay));
        }
      },
      dispose() { frontMat.dispose(); occMat.dispose(); }
    };
  }
};
