import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

export default {
  id: 'pearl-harbor', title: 'Pearl Harbor', seed: 11, duration: 8,
  script: 'Wir schreiben das Jahr 1941. Japan greift den US-Stützpunkt Pearl Harbor an.',
  caption: { title: 'Pearl Harbor', sub: '7. Dezember 1941' },
  params: {
    ships: { type: 'number', min: 1, max: 10, step: 1, value: 6, label: 'Schiffe' },
    planes: { type: 'number', min: 1, max: 14, step: 1, value: 8, label: 'Flugzeuge' },
    torpedoPlanes: { type: 'number', min: 0, max: 8, step: 1, value: 3, label: 'davon Torpedoflugzeuge' },
    attackSpeed: { type: 'number', min: .5, max: 2, step: .05, value: 1, label: 'Angriffstempo' },
    explosionSize: { type: 'number', min: .5, max: 5, step: .1, value: 2.2, label: 'Explosionsgröße' },
    debris: { type: 'number', min: 0, max: 200, step: 10, value: 70, label: 'Trümmer je Explosion' },
    listing: { type: 'number', min: 0, max: 30, step: 1, value: 12, label: 'Schlagseite nach Treffer (°)' },
    splashes: { type: 'number', min: 0, max: 24, step: 1, value: 10, label: 'Wassersäulen' },
    splashHeight: { type: 'number', min: 3, max: 20, step: .5, value: 9, label: 'Höhe Wassersäulen' },
    flak: { type: 'number', min: 0, max: 40, step: 1, value: 16, label: 'Flak-Wolken' },
    tracers: { type: 'number', min: 0, max: 60, step: 1, value: 24, label: 'Leuchtspur-Geschosse' },
    sailorsPer: { type: 'number', min: 0, max: 6, step: 1, value: 3, label: 'Matrosen je Schiff' },
    crashPlane: { type: 'boolean', value: true, label: 'Ein Flugzeug wird abgeschossen' },
    skyColor: { type: 'color', value: '#101722', label: 'Himmel' },
    waterColor: { type: 'color', value: '#1c2d3e', label: 'Wasser' },
    details: { type: 'boolean', value: true, label: 'Hafendetails (Piers, Kräne, Hangars)' },
    ...H.cameraParams([-20, 7, 24], [-10, 6, 17], [2, 1, -2], 38)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 50, 140);
    H.lights(scene, { sun: [-10, 14, 8], shadows, intensity: 1.1, hemi: .6, skyColor: '#9fb3c8', groundColor: '#111', shadowSize: 40 });
    H.lightPool(scene, { x: 0, z: -2, radius: 22, height: 40, intensity: 220 });
    const water = H.wavePlane(160, 160, 40, p.waterColor, { amp: .08 });
    scene.add(water);
    for (let i = 0; i < 7; i++) {
      const hill = H.sphere(6 + r() * 8, i % 2 ? '#2a3038' : '#232930', 14);
      hill.position.set(-40 + i * 14 + r() * 6, -3, -40 - r() * 12); hill.scale.y = .45; scene.add(hill);
    }
    // Schiffe ("Battleship Row") mit Matrosen, Brandherden und Rauch
    const ships = [];
    for (let i = 0; i < p.ships; i++) {
      const len = 9 + r() * 3;
      const s = H.ship(P.steel, { length: len });
      s.position.set(-14 + i * 8, 0, -6 + (i % 2) * 6 + r() * 2);
      s.rotation.y = (r() - .5) * .3;
      scene.add(s);
      const sailors = [];
      for (let k = 0; k < p.sailorsPer; k++) {
        const f = H.figure({ color: P.white, helmet: '#333', glow: H.ROLE.west, strength: 1.4, scale: .5, seed: i * 7 + k + 1 });
        f.position.set(-len * .3 + k * 1.5, 1.05, (k % 2 ? .4 : -.4)); s.add(f);
        sailors.push({ f, x0: f.position.x, dir: k % 2 ? 1 : -1, len });
      }
      const flames = [];
      for (let k = 0; k < 2; k++) { const fb = H.fireball(r, { size: .55 + r() * .3, duration: 1.3, debris: 10, sparks: 30, ring: false }); fb.position.set(-len * .25 + k * len * .5, 1.5, 0); s.add(fb); flames.push({ fb, off: r() * 1.3 }); }
      const smoke = H.smokeColumn(r, { height: 11, width: 1.0 }); smoke.position.set(0, 2, 0); smoke.visible = false; s.add(smoke);
      ships.push({ s, len, hit: Infinity, list: (r() < .5 ? 1 : -1), sailors, flames, smoke });
    }
    // Flugzeuge: Bomber im Sturzflug, Torpedoflugzeuge tief über dem Wasser
    const planes = [];
    for (let i = 0; i < p.planes; i++) {
      const ship = ships[i % ships.length];
      const target = ship.s.position.clone();
      const torpedo = i < p.torpedoPlanes;
      const m = H.faceZ(H.aircraft(H.glowMat(H.ROLE.axis)));
      scene.add(m);
      const t0 = i * (0.55 / p.attackSpeed) + r() * .3, dur = 3.4 / p.attackSpeed;
      const a = torpedo ? new THREE.Vector3(-60 + r() * 8, 4 + r() * 2, target.z + 18 + r() * 8) : new THREE.Vector3(-55 + r() * 10, 18 + r() * 6, -30 + r() * 30);
      const b = torpedo ? new THREE.Vector3(target.x - 12, 2.2, target.z + 6) : new THREE.Vector3(target.x, 3.5 + r() * 1.5, target.z);
      const c = torpedo ? new THREE.Vector3(target.x + 30, 8 + r() * 4, target.z - 20) : new THREE.Vector3(50, 16 + r() * 8, 20 + r() * 20);
      const curve = new THREE.QuadraticBezierCurve3(a, b, c);
      // Treffer: Bombe fällt ab u=0.42, Torpedo läuft ab u=0.35 über das Wasser
      const tDrop = t0 + dur * (torpedo ? .35 : .42);
      const tHit = torpedo ? tDrop + 1.4 : t0 + dur * .5;
      ship.hit = Math.min(ship.hit, tHit);
      const boom = H.fireball(r, { size: p.explosionSize * (torpedo ? 1.2 : 1), duration: 2.6, debris: p.debris, sparks: 120 });
      boom.position.copy(target).setY(torpedo ? .6 : 1.4); scene.add(boom);
      const splash = torpedo ? H.waterColumn(r, { height: p.splashHeight * 1.3, radius: 1.1, duration: 2.8, drops: 160 }) : null;
      if (splash) { splash.position.set(target.x, .25, target.z + 1.2); scene.add(splash); }
      const bomb = torpedo ? null : H.cone(.16, .7, P.black, 6); if (bomb) { bomb.rotation.x = Math.PI; bomb.castShadow = false; scene.add(bomb); }
      let wake = null, torp = null;
      if (torpedo) {
        wake = new THREE.Mesh(new THREE.BoxGeometry(1, .04, .5), new THREE.MeshBasicMaterial({ color: '#dfe9f2', transparent: true, opacity: .6, depthWrite: false })); wake.position.y = .3; scene.add(wake);
        torp = H.cyl(.12, .12, 1.6, '#3a3f46', 8); torp.rotation.z = Math.PI / 2; torp.castShadow = false; scene.add(torp);
      }
      planes.push({ m, curve, t0, dur, boom, splash, bomb, wake, torp, torpedo, tDrop, tHit, target, bank: (r() - .5) * .8, dropPos: new THREE.Vector3() });
    }
    // Abschuss: ein Flugzeug zieht eine Rauchfahne und stürzt ins Wasser
    let crash = null;
    if (p.crashPlane && planes.length > 1) {
      const pl = planes[Math.min(1, planes.length - 1)];
      const uHit = .55, tHitP = pl.t0 + pl.dur * uHit;
      const start = pl.curve.getPoint(uHit), end = new THREE.Vector3(start.x + 16, 0, start.z + 8);
      const fall = new THREE.QuadraticBezierCurve3(start, new THREE.Vector3(start.x + 9, start.y * .9, start.z + 4), end);
      const trail = [];
      for (let k = 0; k < 14; k++) { const puff = H.mesh(new THREE.SphereGeometry(1, 7, 5), new THREE.MeshLambertMaterial({ color: '#3a3a3a', transparent: true, opacity: .8 })); puff.castShadow = false; puff.visible = false; scene.add(puff); trail.push(puff); }
      const burst = H.fireball(r, { size: .7, duration: 1.2, debris: 20, sparks: 50, ring: false }); scene.add(burst);
      const splash = H.waterColumn(r, { height: p.splashHeight * .9, radius: .9, duration: 2.6, drops: 120 }); splash.position.copy(end).setY(.25); scene.add(splash);
      crash = { pl, tHitP, fall, trail, burst, splash, dur: 1.6 };
    }
    // Wassersäulen durch Fehlwürfe
    const splashes = [];
    for (let i = 0; i < p.splashes; i++) {
      const s = H.waterColumn(r, { height: p.splashHeight * (.7 + r() * .6), radius: .7 + r() * .6, duration: 2.6, drops: 140 });
      s.position.set(-26 + r() * 48, .25, -14 + r() * 26); scene.add(s);
      splashes.push({ s, t0: .6 + r() * 6.4 });
    }
    // Flak und Leuchtspur
    const flak = [];
    for (let i = 0; i < p.flak; i++) {
      const f = H.explosion({ size: .7, color: '#9a9a9a', smoke: '#555', duration: 1.4 });
      f.position.set(-40 + r() * 70, 8 + r() * 16, -30 + r() * 40); scene.add(f); flak.push({ f, t0: r() * 7 });
    }
    const tracers = [];
    for (let i = 0; i < p.tracers; i++) {
      const tr = new THREE.Mesh(new THREE.BoxGeometry(.06, .06, 1.2), H.glowMat('#ffd27a', 2.2)); tr.castShadow = false; scene.add(tr);
      const from = ships[i % ships.length].s.position.clone().setY(1.8);
      const dir = new THREE.Vector3((r() - .5) * .8, 1, (r() - .5) * .8).normalize();
      tracers.push({ tr, from, dir, off: r() * 1.1, period: .9 + r() * .4 });
    }
    const fires = [], slicks = [];
    if (p.details) {
      for (let i = 0; i < 3; i++) {
        const pier = H.box(26, .5, 2.4, '#4a4f58'); pier.position.set(-6 + i * 4, .3, -16 - i * 7); scene.add(pier);
        for (let k = 0; k < 9; k++) { const post = H.cyl(.12, .12, 1.4, '#2f3338', 6); post.position.set(-18 + i * 4 + k * 3, -.2, -16 - i * 7 + 1.1); scene.add(post); }
        for (let k = 0; k < 4; k++) { const cr = H.crate(.8, '#4a3f33'); cr.position.set(-16 + i * 4 + k * 5 + r() * 2, .55, -16 - i * 7); cr.rotation.y = r(); scene.add(cr); const bl = H.barrel('#3a3f46'); bl.position.set(-14 + i * 4 + k * 5, .55, -16 - i * 7 - .6); scene.add(bl); }
        const crane = new THREE.Group();
        const tower = H.box(.8, 7, .8, '#3a3f47'); tower.position.y = 3.5; const jib = H.box(7, .4, .5, '#3a3f47'); jib.position.set(2.5, 7, 0);
        const cab = H.box(1.2, 1, 1.2, '#3a3f47'); cab.position.set(0, 6.2, 0); const cable = H.cyl(.02, .02, 3, P.black, 4); cable.position.set(5.5, 5.5, 0);
        const hook = H.box(.3, .4, .3, P.black); hook.position.set(5.5, 3.9, 0);
        crane.add(tower, jib, cab, cable, hook); crane.position.set(-12 + i * 10, .5, -16 - i * 7 + 2.2); crane.rotation.y = .3 * i; scene.add(crane);
      }
      for (let i = 0; i < 4; i++) {
        const hangar = H.mesh(new THREE.CylinderGeometry(3.2, 3.2, 9, 12, 1, false, 0, Math.PI), '#4f555e'); hangar.rotation.z = Math.PI / 2; hangar.rotation.y = Math.PI / 2;
        hangar.position.set(-30 + i * 9, 0, -34); scene.add(hangar);
        const door = H.box(.2, 3.5, 6, '#2b3036'); door.position.set(-30 + i * 9 + 4.5, 1.75, -34); scene.add(door);
      }
      const tower = H.box(1.6, 9, 1.6, '#3a3f47'); tower.position.set(6, 4.5, -36); scene.add(tower);
      const towerTop = H.box(3, 1.6, 3, '#2b3036'); towerTop.position.set(6, 9.8, -36); scene.add(towerTop);
      for (let i = 0; i < 10; i++) { const pm = H.palm(3 + r() * 2); pm.position.set(-44 + i * 9 + r() * 3, 0, -36 - r() * 6); scene.add(pm); }
      // Ölbrände auf dem Wasser mit wachsendem Ölteppich
      for (let i = 0; i < 3; i++) {
        const f = H.fireball(r, { size: 1.0, duration: 1.6, debris: 20, sparks: 60, ring: false }); f.position.set(-10 + r() * 24, .3, -4 + r() * 10); scene.add(f); fires.push({ f, t0: 2.5 + r() * 2 });
        const d = H.disc(1, '#0d1116', 24); d.position.set(f.position.x, .27, f.position.z); d.castShadow = false; d.visible = false; scene.add(d); slicks.push(d);
      }
    }
    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3();
    return {
      update(t, p) {
        water.userData.at(t);
        for (const pl of planes) {
          const u = H.span(t, pl.t0, pl.t0 + pl.dur);
          pl.m.visible = u > 0 && u < 1;
          if (crash && pl === crash.pl && t > crash.tHitP) {
            const cu = H.span(t, crash.tHitP, crash.tHitP + crash.dur);
            pl.m.visible = cu < 1;
            crash.fall.getPoint(cu, pl.m.position); crash.fall.getPoint(Math.min(1, cu + .02), tmp); pl.m.lookAt(tmp); pl.m.rotateZ(cu * 7);
            crash.trail.forEach((puff, k) => { const age = cu - k * .07; puff.visible = age > 0 && cu < 1.2; if (puff.visible) { crash.fall.getPoint(Math.max(0, age), puff.position); puff.position.y += age * 1.5 + k * .1; puff.scale.setScalar(.25 + age * 1.2); puff.material.opacity = .8 * Math.max(0, 1 - age * 1.1); } });
            crash.burst.position.copy(crash.fall.getPoint(0)); crash.burst.userData.at(t - crash.tHitP);
            crash.splash.userData.at(t - (crash.tHitP + crash.dur));
          } else {
            pl.curve.getPoint(u, pl.m.position);
            pl.curve.getPoint(Math.min(1, u + .01), tmp);
            pl.m.lookAt(tmp);
            pl.m.rotateZ(pl.bank * Math.sin(u * Math.PI));
            if (crash && pl === crash.pl) crash.trail.forEach(pf => pf.visible = false);
          }
          // Abwurf von Bombe bzw. Torpedo
          pl.curve.getPoint((pl.tDrop - pl.t0) / pl.dur, pl.dropPos);
          if (pl.bomb) {
            const fu = H.span(t, pl.tDrop, pl.tHit);
            pl.bomb.visible = fu > 0 && fu < 1;
            pl.bomb.position.lerpVectors(pl.dropPos, tmp2.copy(pl.target).setY(1.2), H.easeIn(fu) * .6 + fu * .4);
            pl.bomb.rotation.x = Math.PI - fu * .9;
          }
          if (pl.torp) {
            const ru = H.span(t, pl.tDrop, pl.tHit);
            const sx = pl.dropPos.x, sz = pl.dropPos.z, ex = pl.target.x, ez = pl.target.z + 1.2;
            const x = H.lerp(sx, ex, ru), z = H.lerp(sz, ez, ru);
            const ang = -Math.atan2(ez - sz, ex - sx);
            pl.torp.visible = ru > 0 && ru < 1; pl.torp.position.set(x, .1, z); pl.torp.rotation.y = ang;
            const fade = H.span(t, pl.tHit, pl.tHit + .8);
            pl.wake.visible = ru > 0 && fade < 1;
            pl.wake.scale.set(Math.max(.01, Math.hypot(ex - sx, ez - sz) * ru), 1, 1 + ru); pl.wake.position.set(H.lerp(sx, x, .5), .3, H.lerp(sz, z, .5)); pl.wake.rotation.y = ang;
            pl.wake.material.opacity = .6 * (1 - fade);
          }
          pl.boom.userData.at(t - pl.tHit);
          if (pl.splash) pl.splash.userData.at(t - pl.tHit + .1);
        }
        // Schiffe: Schlagseite, Absinken, Dauerbrand, Matrosen laufen
        for (const sh of ships) {
          const hu = H.easeOut(H.span(t, sh.hit + .3, sh.hit + 4.5));
          sh.s.rotation.z = sh.list * hu * p.listing * Math.PI / 180;
          sh.s.position.y = -hu * .45;
          sh.smoke.visible = t > sh.hit + .4; if (sh.smoke.visible) sh.smoke.userData.at(t - sh.hit - .4, .5);
          for (const fl of sh.flames) { const a = t - sh.hit - .8 + fl.off; fl.fb.userData.at(a > 0 ? a % 1.3 : -1); }
          for (const sa of sh.sailors) {
            const panic = t > sh.hit - .6 ? 1.6 : .9;
            const ph = t * .8 * panic + sa.x0;
            sa.f.position.x = sa.x0 + Math.sin(ph) * sa.len * .28;
            sa.f.rotation.y = Math.cos(ph) * sa.dir > 0 ? 0 : Math.PI;
            sa.f.userData.walk(t * panic + sa.x0, panic > 1 ? 1.3 : 1);
          }
        }
        for (const sp of splashes) sp.s.userData.at(t - sp.t0);
        for (const f of flak) f.f.userData.at(((t - f.t0) % 3.5 + 3.5) % 3.5);
        for (const tr of tracers) {
          const k = ((t + tr.off) % tr.period) / tr.period;
          tr.tr.position.copy(tr.from).addScaledVector(tr.dir, k * 34);
          tr.tr.lookAt(tmp.copy(tr.tr.position).add(tr.dir));
          tr.tr.visible = t > .8 && k < .9;
        }
        fires.forEach((fr, i) => { const a = t - fr.t0; fr.f.userData.at(a > 0 ? a % 1.6 : -1); const sl = slicks[i]; if (sl) { sl.visible = a > 0; sl.scale.setScalar(1 + Math.min(4, a) * 1.2); } });
      }
    };
  }
};
