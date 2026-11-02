import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'kriegswende', title: 'Kriegswende', seed: 15, duration: 8,
  script: 'Die Rote Armee drängt die deutschen Truppen zurück. Dies wird oft als Kriegswende bezeichnet.',
  caption: { title: 'Ostfront', sub: 'Februar 1943' },
  params: {
    frontStart: { type: 'number', min: 10, max: 48, step: .5, value: 43, label: 'Front Start (Länge °)' },
    frontEnd: { type: 'number', min: 10, max: 48, step: .5, value: 24, label: 'Front Ende (Länge °)' },
    arrows: { type: 'number', min: 1, max: 8, step: 1, value: 4, label: 'Pfeile' },
    landColor: { type: 'color', value: '#767b82', label: 'Land' },
    seaColor: { type: 'color', value: '#262a2e', label: 'Meer' },
    germanyColor: { type: 'color', value: '#7a2a26', label: 'Deutschland (Fläche)' },
    occupiedColor: { type: 'color', value: '#6b3430', label: 'Besetztes Gebiet' },
    labels: { type: 'boolean', value: true, label: 'Beschriftungen' },
    ...H.cameraParams([8, 28, 20], [2, 22, 14], [4, 0, -4], 38)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, '#0b0d12', 60, 160);
    H.lights(scene, { sun: [10, 30, 10], intensity: 1.3, hemi: .5, shadows: false, skyColor: '#cfd8e3', groundColor: '#222' });
    const map = H.europeMap({ land: p.landColor, sea: p.seaColor, center: [26, 51], highlight: { deutschland: p.germanyColor, polen: p.occupiedColor, tschechien: p.occupiedColor, oesterreich: p.occupiedColor, balkan: p.occupiedColor } });
    scene.add(map);
    const U = map.userData, proj = U.project;
    // Besetzter Teil der Sowjetunion: Fläche westlich der Front, wird pro Bild neu gebaut
    const occMat = new THREE.MeshBasicMaterial({ color: p.occupiedColor, map: H.terrainTexture() });
    let occ = null, front = null;
    const frontMat = H.glowMat(H.ROLE.axis, 2.0);
    const arrows = [];
    for (let i = 0; i < p.arrows; i++) {
      const lat = 58 - (i + .5) * (14 / p.arrows);
      const a = H.curvedArrow([proj(40, lat), proj(36, lat + 1), proj(32, lat)], H.ROLE.soviet, { radius: .08, head: .55 });
      scene.add(a); arrows.push({ a, lat, off: r() * 2 });
    }
    if (p.labels) {
      U.country(10.4, 50.4, 'Deutschland', 1.2); U.country(36, 55.2, 'UdSSR', 1.5); U.country(19.5, 52.0, 'Polen', 1.0);
      U.city(13.4, 52.5, 'Berlin'); U.city(37.6, 55.8, 'Moskau'); U.city(44.5, 48.7, 'Stalingrad');
    }
    const frontPts = (lon, t) => {
      const pts = [];
      for (let i = 0; i <= 14; i++) {
        const lat = 60 - i * (16 / 14);
        const bulge = Math.sin(i / 14 * Math.PI) * 3 + Math.sin(i * 1.7 + t * .3) * 1.2;
        pts.push(proj(lon + bulge, lat));
      }
      return pts;
    };
    return {
      update(t, p) {
        const u = H.easeInOut(H.span(t, .5, p.duration - .5));
        const lon = H.lerp(p.frontStart, p.frontEnd, u);
        const pts = frontPts(lon, t);
        if (front) { scene.remove(front); front.geometry.dispose(); }
        front = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(v => v.clone().setY(.15))), 48, .12, 6, false), frontMat);
        front.castShadow = false; scene.add(front);
        // besetzte Fläche: Polygon von der Front bis zur polnischen Ostgrenze
        if (occ) { scene.remove(occ); occ.geometry.dispose(); }
        const poly = [proj(23.5, 60), ...pts, proj(23.5, 44)];
        const shape = new THREE.Shape(poly.map(v => new THREE.Vector2(v.x, -v.z)));
        occ = new THREE.Mesh(new THREE.ShapeGeometry(shape), occMat);
        occ.rotation.x = -Math.PI / 2; occ.position.y = .02;
        const uv = occ.geometry.attributes.uv, pa = occ.geometry.attributes.position;
        for (let i = 0; i < uv.count; i++) uv.setXY(i, pa.getX(i) / 18, pa.getY(i) / 18);
        scene.add(occ);
        for (const ar of arrows) {
          const v0 = proj(lon + 5, ar.lat), v1 = proj(lon + 2.5, ar.lat + .8), v2 = proj(lon + .3, ar.lat);
          ar.a.position.set(0, 0, 0);
          ar.a.children[0].geometry.dispose();
          const curve = new THREE.CatmullRomCurve3([v0, v1, v2].map(v => v.setY(.12)));
          ar.a.children[0].geometry = new THREE.TubeGeometry(curve, 32, .08, 6, false);
          curve.getPoint(1, ar.a.children[1].position); const tg = curve.getTangent(1).normalize();
          ar.a.children[1].quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), tg);
          ar.a.visible = t > .4 + ar.off * .3;
        }
      },
      dispose() { frontMat.dispose(); occMat.dispose(); }
    };
  }
};
