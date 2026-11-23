import * as THREE from 'three';
import * as H from '../common.js';
import { hiMap, mercY, regionMaskTexture } from '../map-hi.js';
import { REICH_1942, GROUPS_1943 } from '../history.js';

// Vormarsch auf Berlin (Stil wie Szene 3 und 5): Das Reich ist rot. Von Westen schiebt sich die Front vom Rhein bis
// an die Elbe (März → Ende April 1945), von Osten von Oder und Neiße bis Berlin. Erobertes Gebiet wird blau bzw.
// ocker eingefärbt, flache Kartenpfeile schieben die Fronten. Bei Torgau treffen sich beide Seiten an der Elbe,
// dann fällt Berlin. Frontverläufe vereinfacht.
const LATS = [55, 54.5, 53.5, 52.5, 51.5, 50.5, 49.5, 48.5, 47.3];
const WEST_A = [6.9, 6.9, 6.9, 6.5, 6.0, 6.3, 6.8, 7.6, 7.6];        // Anfang März 1945: Rhein, Westwall
const WEST_B = [10.2, 10.5, 10.8, 11.6, 12.85, 12.5, 12.5, 12.8, 11.0];   // Ende April: Elbe, Mulde, Bayern, Tirol
const EAST_A = [21.0, 15.6, 14.5, 14.6, 14.9, 16.6, 18.2, 19.0, 17.2];   // Anfang März: Pommern, Oder, Neiße, Schlesien
const EAST_B = [12.4, 12.4, 12.6, 13.25, 13.15, 14.6, 16.2, 15.8, 15.4]; // Ende April: Berlin eingeschlossen, Torgau, Wien
const BB = [4.5, 44.8, 25, 56.6];
const lerpFront = (A, B, lat, u) => {
  for (let i = 0; i < LATS.length - 1; i++) if (lat <= LATS[i] && lat >= LATS[i + 1]) { const k = (LATS[i] - lat) / (LATS[i] - LATS[i + 1]); return H.lerp(H.lerp(A[i], B[i], u), H.lerp(A[i + 1], B[i + 1], u), k); }
  return lat > LATS[0] ? H.lerp(A[0], B[0], u) : H.lerp(A[A.length - 1], B[B.length - 1], u);
};

export default {
  id: 'zangenangriff', title: 'Vormarsch auf Berlin', seed: 21, duration: 11, rev: 2,
  script: 'Während sie 1945 von Westen immer weiter in Richtung Deutschland vorrücken, nähern sich aus dem Osten auch sowjetische Truppen, welche daraufhin Berlin einnehmen.',
  caption: { title: 'Berlin', sub: 'April 1945' },
  params: {
    mapScale: { type: 'number', min: .3, max: 2.5, step: .01, value: 1.05, label: 'Kartenmaßstab (Zoom)' },
    mapCenterLon: { type: 'number', min: 0, max: 25, step: .1, value: 12.6, label: 'Bildmitte Länge (°)' },
    mapCenterLat: { type: 'number', min: 44, max: 58, step: .1, value: 51.0, label: 'Bildmitte Breite (°)' },
    tWest: { type: 'number', min: 0, max: 10, step: .1, value: .6, label: 'West ab (s)' },
    tEast: { type: 'number', min: 0, max: 10, step: .1, value: 1.4, label: 'Ost ab (s)' },
    tBerlin: { type: 'number', min: 0, max: 12, step: .1, value: 8.6, label: 'Berlin fällt (s)' },
    arrowSize: { type: 'number', min: .3, max: 3, step: .05, value: 1, label: 'Pfeilstärke' },
    landColor: { type: 'color', value: '#5c6476', label: 'Land' },
    seaColor: { type: 'color', value: '#080d16', label: 'Meer' },
    borderColor: { type: 'color', value: '#ebeef4', label: 'Grenzen' },
    germanyColor: { type: 'color', value: '#ff2d2d', label: 'Deutsches Reich' },
    labels: { type: 'boolean', value: true, label: 'Beschriftung' },
    labelSize: { type: 'number', min: .3, max: 4, step: .05, value: 2.1, label: 'Beschriftung Größe' },
    ...H.cameraParams([0, 21, 14], [0, 20.4, 13.6], [0.5, 0, -2], 38)
  },
  build({ scene, params: p }) {
    H.sky(scene, '#06080c', 30, 56);
    H.lights(scene, { sun: [10, 30, 10], intensity: 1.3, hemi: .5, shadows: false, skyColor: '#cfd8e3', groundColor: '#222' });
    const border = new THREE.Color(p.borderColor), rgba = a => `rgba(${border.r * 255 | 0},${border.g * 255 | 0},${border.b * 255 | 0},${a})`;
    const map = hiMap({
      bbox: [-25, 30, 50, 66], texW: 3072, detail: { bbox: [-4, 42, 30, 59], texW: 6144 },
      center: [p.mapCenterLon, p.mapCenterLat], scale: p.mapScale, land: p.landColor, sea: p.seaColor,
      borders: rgba(.62), coast: rgba(.45), borderWidth: 3.6, groups: GROUPS_1943,
      regions: [{ name: 'reich', parts: REICH_1942, color: p.germanyColor, alpha: .82, outline: '#ffffff', outlineWidth: 2.4, layer: { bbox: BB } }]
    });
    map.position.set(p.lookX, 0, p.lookZ);
    scene.add(map);
    const U = map.userData;
    U.layers.reich.userData.mesh.material.color.setScalar(1.15);

    // Erobertes Reichsgebiet: blau westlich der Westfront, ocker östlich der Ostfront (Shader über der Reichsfläche)
    const a = U.project(BB[0], BB[1]), b = U.project(BB[2], BB[3]);
    const occ = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false,
      uniforms: { mask: { value: regionMaskTexture(REICH_1942, BB, 3072) }, uw: { value: 0 }, ue: { value: 0 }, lats: { value: LATS },
        wa: { value: WEST_A }, wb: { value: WEST_B }, ea: { value: EAST_A }, eb: { value: EAST_B },
        cw: { value: new THREE.Color(H.ROLE.west).multiplyScalar(1.05) }, ce: { value: new THREE.Color(H.ROLE.soviet).multiplyScalar(1.0) },
        bb: { value: new THREE.Vector4(BB[0], mercY(BB[1]), BB[2], mercY(BB[3])) } },
      vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.); }',
      fragmentShader: `
        uniform sampler2D mask; uniform float uw, ue; uniform float lats[9], wa[9], wb[9], ea[9], eb[9]; uniform vec3 cw, ce; uniform vec4 bb;
        varying vec2 vUv;
        float front(float lat, float A[9], float B[9], float u) {
          float f = mix(A[0], B[0], u);
          for (int i = 0; i < 8; i++) if (lat <= lats[i] && lat >= lats[i + 1]) { float k = (lats[i] - lat) / (lats[i] - lats[i + 1]); f = mix(mix(A[i], B[i], u), mix(A[i + 1], B[i + 1], u), k); }
          if (lat < lats[8]) f = mix(A[8], B[8], u);
          return f;
        }
        void main() {
          float lon = mix(bb.x, bb.z, vUv.x), my = mix(bb.y, bb.w, vUv.y);
          float lat = degrees(2. * atan(exp(radians(my))) - 1.5707963);
          float m = texture2D(mask, vUv).a;
          float w = smoothstep(.06, -.06, lon - front(lat, wa, wb, uw));
          float e = smoothstep(-.06, .06, lon - front(lat, ea, eb, ue));
          vec3 col = w > e ? cw : ce;
          gl_FragColor = vec4(col, max(w, e) * m * .9);
        }`
    });
    const occM = new THREE.Mesh(new THREE.PlaneGeometry(b.x - a.x, a.z - b.z), occ);
    occM.rotation.x = -Math.PI / 2; occM.position.set((a.x + b.x) / 2, .03, (a.z + b.z) / 2); occM.renderOrder = 3; map.add(occM);

    // Frontlinien als leuchtende Röhren (nur über Mitteleuropa), jedes Bild neu
    const lineMat = H.glowMat('#ffe2a8', 1.5);
    let lines = [];
    const buildLines = (uw, ue) => {
      for (const l of lines) { map.remove(l); l.geometry.dispose(); }
      lines = [[WEST_A, WEST_B, uw], [EAST_A, EAST_B, ue]].map(([A, B, u]) => {
        const pts = []; for (let lat = A === WEST_A ? 53.6 : 54.4; lat >= 47.4; lat -= .25) pts.push(U.project(lerpFront(A, B, lat, u), lat, .07));
        const m = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 90, .045, 5, false), lineMat); m.renderOrder = 4; map.add(m); return m;
      });
    };

    // Kartenpfeile: Start außerhalb des Bildes, Spitze immer an der Front
    const AW = [[53.0, 0], [51.0, .3], [49.0, .15]], AE = [[53.4, 0], [52.3, .2], [50.6, .35]];
    const arrows = [
      ...AW.map(([lat, d]) => ({ side: 'w', lat, d, a: U.flatArrow([[-4, lat], [H.lerp(-4, WEST_B[4] - .4, .5), lat + .4], [lerpFront(WEST_A, WEST_B, lat, 1) - .35, lat]], H.ROLE.west, { width: .42 * p.arrowSize, head: 1.0 * p.arrowSize, headW: 1.05 * p.arrowSize }) })),
      ...AE.map(([lat, d]) => ({ side: 'e', lat, d, a: U.flatArrow([[27, lat], [H.lerp(27, EAST_B[3] + .4, .5), lat + .4], [lerpFront(EAST_A, EAST_B, lat, 1) + .35, lat]], H.ROLE.soviet, { width: .42 * p.arrowSize, head: 1.0 * p.arrowSize, headW: 1.05 * p.arrowSize }) }))
    ];
    for (const ar of arrows) { ar.lon0 = ar.side === 'w' ? -4 : 27; ar.lon1 = lerpFront(...(ar.side === 'w' ? [WEST_A, WEST_B] : [EAST_A, EAST_B]), ar.lat, 1) + (ar.side === 'w' ? -.35 : .35); }

    // Beschriftung, Berlin, Torgau
    const s = p.labelSize;
    const berlin = U.pin(13.4, 52.52, H.ROLE.axis, { size: .55 }), berlinS = U.pin(13.4, 52.52, H.ROLE.soviet, { size: .55 }); berlinS.userData.set({ opacity: 0 });   // Punkt wechselt die Farbe, wenn Berlin fällt
    const torgau = U.pin(13.0, 51.56, '#ffffff', { size: .42 }); torgau.userData.set({ opacity: 0 });
    let lTorgau = null;
    if (p.labels) {
      const lb = U.country(13.4, 52.52, 'Berlin', .4 * s, { box: true }); const v = U.project(13.4, 52.52, .6); lb.position.set(v.x, .6, v.z - .75);
      lTorgau = U.country(13.0, 51.56, 'Torgau', .32 * s, { box: true }); const vt = U.project(13.0, 51.56, .6); lTorgau.position.set(vt.x + 1.3, .6, vt.z + .1); lTorgau.material.opacity = 0;
      U.country(14.2, 49.7, 'Deutsches Reich', .5 * s, { box: true });
    }
    return {
      update(t, p) {
        const uw = H.easeInOut(H.span(t, p.tWest, p.tBerlin - .9)), ue = H.easeInOut(H.span(t, p.tEast, p.tBerlin));
        occ.uniforms.uw.value = uw; occ.uniforms.ue.value = ue;
        buildLines(uw, ue);
        for (const ar of arrows) {
          const u = ar.side === 'w' ? uw : ue, A = ar.side === 'w' ? [WEST_A, WEST_B] : [EAST_A, EAST_B];
          const tip = lerpFront(A[0], A[1], ar.lat, u) + (ar.side === 'w' ? -.35 : .35);
          const frac = (tip - ar.lon0) / (ar.lon1 - ar.lon0), t0 = (ar.side === 'w' ? p.tWest : p.tEast) + ar.d;
          ar.a.setProgress(Math.max(.05, frac) * H.span(t, t0 - .5, t0 + .2));
        }
        const meet = H.span(t, p.tBerlin - 1.4, p.tBerlin - .9);
        torgau.userData.set({ opacity: meet, halo: meet > 0 ? ((t - p.tBerlin + 1.4) % 1.4) / 1.4 : 0 }); if (lTorgau) lTorgau.material.opacity = meet;
        const fall = t > p.tBerlin;
        const fk = H.span(t, p.tBerlin, p.tBerlin + .4);
        berlin.userData.set({ opacity: 1 - fk }); berlinS.userData.set({ opacity: fk, halo: fall ? ((t - p.tBerlin) % 1.2) / 1.2 : 0, scale: 1 + .2 * fk });
      },
      dispose() { lineMat.dispose(); occ.dispose(); }
    };
  }
};
