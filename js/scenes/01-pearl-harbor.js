import * as THREE from 'three';
import * as H from '../common.js';
const { P } = H;

const G = 9.81;

export default {
  id: 'pearl-harbor', title: 'Pearl Harbor', seed: 11, duration: 10,
  script: 'Wir schreiben das Jahr 1941. Japan greift den US-Stützpunkt Pearl Harbor an.',
  caption: { title: 'Pearl Harbor', sub: '7. Dezember 1941' },
  params: {
    ships: { type: 'number', min: 1, max: 10, step: 1, value: 6, label: 'Schiffe' },
    planes: { type: 'number', min: 1, max: 14, step: 1, value: 6, label: 'Flugzeuge' },
    torpedoPlanes: { type: 'number', min: 0, max: 8, step: 1, value: 2, label: 'davon Torpedoflugzeuge' },
    bombsPer: { type: 'number', min: 1, max: 4, step: 1, value: 2, label: 'Bomben je Bomber (Rest fällt ins Wasser)' },
    attackSpeed: { type: 'number', min: .5, max: 2, step: .05, value: 1, label: 'Angriffstempo' },
    explosionSize: { type: 'number', min: .5, max: 5, step: .1, value: 1.5, label: 'Explosionsgröße' },
    debris: { type: 'number', min: 0, max: 200, step: 10, value: 30, label: 'Trümmer je Explosion' },
    listing: { type: 'number', min: 0, max: 3, step: .1, value: 1, label: 'Stärke des Untergangs (Schlagseite, Kentern)' },
    splashHeight: { type: 'number', min: 3, max: 20, step: .5, value: 7, label: 'Höhe Wassersäulen' },
    fireSize: { type: 'number', min: .3, max: 3, step: .1, value: .9, label: 'Brände auf den Schiffen' },
    flak: { type: 'number', min: 0, max: 40, step: 1, value: 5, label: 'Flak-Wolken' },
    tracers: { type: 'number', min: 0, max: 60, step: 1, value: 4, label: 'Leuchtspur-Geschütze' },
    tracerSpeed: { type: 'number', min: 20, max: 300, step: 5, value: 110, label: 'Geschossgeschwindigkeit (m/s)', live: true },
    burst: { type: 'number', min: 1, max: 8, step: 1, value: 3, label: 'Schüsse je Feuerstoß' },
    sailorsPer: { type: 'number', min: 0, max: 6, step: 1, value: 2, label: 'Matrosen je Schiff' },
    shootDown: { type: 'boolean', value: false, label: 'Ein Flugzeug wird abgeschossen (aus)' },
    skyColor: { type: 'color', value: '#101722', label: 'Himmel' },
    waterColor: { type: 'color', value: '#1c2d3e', label: 'Wasser' },
    details: { type: 'boolean', value: true, label: 'Hafendetails (Piers, Kräne, Hangars)' },
    ...H.cameraParams([-20, 7, 24], [-10, 6, 17], [2, 1, -2], 38)
  },
  build({ scene, params: p, rng: r, shadows }) {
    H.sky(scene, p.skyColor, 50, 140);
    H.lights(scene, { sun: [-10, 14, 8], shadows, intensity: 1.1, hemi: .6, skyColor: '#9fb3c8', groundColor: '#111', shadowSize: 40 });
    H.lightPool(scene, { x: 0, z: -2, radius: 22, height: 40, intensity: 220 });
    const water = H.wavePlane(160, 160, 110, p.waterColor, { amp: .07, env: H.envGradient(p.skyColor, '#56677a', '#06080c') });
    scene.add(water);
    for (let i = 0; i < 7; i++) {
      const hill = H.sphere(6 + r() * 8, i % 2 ? '#2a3038' : '#232930', 14);
      hill.position.set(-40 + i * 14 + r() * 6, -3, -40 - r() * 12); hill.scale.y = .45; scene.add(hill);
    }
    // ---------- Schiffe ("Battleship Row") mit Matrosen, Brandherden und Rauch ----------
    const ships = [];
    const kinds = ['battleship', 'cruiser', 'destroyer', 'battleship', 'cruiser', 'destroyer'];
    for (let i = 0; i < p.ships; i++) {
      const kind = kinds[i % kinds.length];
      const len = kind === 'battleship' ? 12.5 + r() * 2 : kind === 'cruiser' ? 10.5 + r() * 1.5 : 8.5 + r() * 1.2;
      const beam = len * (kind === 'destroyer' ? .17 : .19);
      const s = H.ship(P.steel, { length: len, beam, guns: kind === 'destroyer' ? 1 : 2, funnels: kind === 'cruiser' ? 2 : 1 + (r() < .4 ? 1 : 0), seed: 100 + i, tint: .85 + r() * .3 });
      const yaw = new THREE.Group(); yaw.add(s);                                        // Gieren außen, Rollen/Stampfen innen
      yaw.position.set(-16 + i * 8.5, 0, -6 + (i % 2) * 6.5 + r() * 2);
      yaw.rotation.y = (r() - .5) * .3;
      scene.add(yaw);
      const sailors = [];
      const lanes = s.userData.lanes;
      for (let k = 0; k < p.sailorsPer; k++) {
        const f = H.figure({ color: P.white, glow: H.ROLE.west, strength: 1.4, scale: .5, model: 'civil', seed: i * 7 + k + 1 });
        const lane = lanes[k % lanes.length];
        f.position.set(0, s.userData.deckY, lane.z); s.add(f);                            // freies Seitendeck neben dem Aufbau
        sailors.push({ f, lane, L: (lane.x1 - lane.x0) * (.7 + r() * .3), ph: r() * 8, pause: .3 + r() * .4, flip: k % 2, fallDelay: r() * .35 });
      }
      // ein Hauptbrand am Trefferpunkt (Position wird nach der Flugzeugplanung gesetzt) und ein kleiner Nebenbrand
      const fires = [];
      for (let k = 0; k < 2; k++) {
        const fb = H.flame(r, { size: p.fireSize * (k ? .5 : 1), tongues: k ? 3 : 5, embers: k ? 6 : 14, spread: k ? .8 : 1.5 });
        fb.position.set(0, s.userData.deckY + .25, (r() - .5) * .6); fb.visible = false; s.add(fb);
        fires.push({ fb, off: k * .9 + r() * .3, k: 1 });
      }
      const smoke = H.smokeColumn(r, { color: '#1c1c20', height: 11, n: 8, width: .7 }); smoke.position.set(0, 2, 0); smoke.visible = false; s.add(smoke);
      // Untergangsart: Torpedotreffer kentern zur Trefferseite, Bombentreffer sacken über Heck oder Bug weg oder krängen
      const sinkMode = kind === 'destroyer' ? (r() < .5 ? 'stern' : 'list') : (r() < .5 ? 'capsize' : 'list');
      ships.push({ s, yaw, len, hit: Infinity, hitX: 0, hitSide: 1, sinkMode, sinkDir: r() < .5 ? 1 : -1, sailors, fires, smoke });
    }
    // ---------- Flugzeuge: fliegen von außerhalb des Bildes über das Ziel und wieder hinaus ----------
    const planes = [], bombs = [];
    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3();
    // Lage eines Schiffs nach dem Treffer: Rollen (rx), Stampfen (rz), Absinken (y), je nach Untergangsart
    const shipPose = (sh, t, k) => {
      const hu = sh.hit === Infinity ? 0 : H.easeOut(H.span(t, sh.hit + .3, sh.hit + (sh.sinkMode === 'capsize' ? 6.5 : 4.5)));
      if (sh.sinkMode === 'capsize') return { rx: sh.hitSide * hu * 1.1 * k, rz: sh.sinkDir * hu * .08 * k, y: -hu * .9 * k };
      if (sh.sinkMode === 'stern') return { rx: sh.hitSide * hu * .12 * k, rz: sh.sinkDir * hu * .22 * k, y: -hu * .7 * k };
      return { rx: sh.hitSide * hu * .3 * k, rz: sh.sinkDir * hu * .04 * k, y: -hu * .45 * k };
    };
    // Laufweg eines Matrosen: auf und ab auf dem Seitendeck mit kurzen Pausen an den Enden, nach dem Alarm schneller
    const sailorWalk = (sa, t, tA) => {
      const fast = t > tA, v0 = .7, fac = fast ? 2.3 : 1;
      const tv = (t < tA ? t : tA + (t - tA) * fac) + sa.ph;
      const T1 = sa.L / v0, C = 2 * (T1 + sa.pause), tau = tv % C, cyc = Math.floor(tv / C);
      const mid = (sa.lane.x0 + sa.lane.x1) / 2;
      let x, dir, moving, S = 0;
      if (tau < T1) { x = -sa.L / 2 + v0 * tau; dir = 1; moving = true; S = cyc * 2 * sa.L + v0 * tau; }
      else if (tau < T1 + sa.pause) { x = sa.L / 2; dir = 1; moving = false; }
      else if (tau < 2 * T1 + sa.pause) { x = sa.L / 2 - v0 * (tau - T1 - sa.pause); dir = -1; moving = true; S = cyc * 2 * sa.L + sa.L + v0 * (tau - T1 - sa.pause); }
      else { x = -sa.L / 2; dir = -1; moving = false; }
      if (sa.flip) { x = -x; dir = -dir; }
      return { x: mid + x, dir, moving, S, fast };
    };
    const velAt = (curve, u, dur, out) => { curve.getPoint(Math.min(1, u + .002), out); curve.getPoint(Math.max(0, u - .002), tmp3); return out.sub(tmp3).divideScalar(.004 * dur); };
    for (let i = 0; i < p.planes; i++) {
      const ship = ships[i % ships.length];
      const target = ship.yaw.position.clone();
      const torpedo = i < p.torpedoPlanes;
      const m = H.faceZ(H.aircraft(H.glowMat(H.ROLE.axis)));
      m.visible = false; scene.add(m);
      const t0 = i * (0.9 / p.attackSpeed) + r() * .2, dur = 5.3 / p.attackSpeed;
      let curve;
      if (torpedo) {
        const rel = new THREE.Vector3(target.x - 4, 2.6, target.z + 17);
        // nach dem Abwurf steil hochziehen und mit Abstand über die Masten des Zielschiffs hinweg
        const climb = new THREE.Vector3(target.x + 1, 11 + r() * 2, target.z + 2);
        curve = new THREE.CatmullRomCurve3([new THREE.Vector3(target.x - 50, 7 + r() * 3, target.z + 62), rel, climb, new THREE.Vector3(target.x + 55, 20 + r() * 6, target.z - 50)], false, 'catmullrom', .3);
        curve.userData = { rel };
      } else {
        const over = new THREE.Vector3(target.x, 6 + r() * 2, target.z);
        curve = new THREE.CatmullRomCurve3([new THREE.Vector3(-95, 24 + r() * 6, 6 + r() * 30), over, new THREE.Vector3(75, 16 + r() * 8, 62 + r() * 20)], false, 'catmullrom', .3);
      }
      const pl = { m, curve, t0, dur, torpedo, target, ship, bank: (r() - .5) * .8, bombs: [], torp: null };
      planes.push(pl);
      if (torpedo) {
        // Torpedo: fällt nach dem Abwurf ins Wasser und läuft auf das Schiff zu
        let uDrop = .3, best = 1e9;                                                    // Kurvenparameter am Abwurfpunkt
        for (let u = 0; u <= 1; u += .002) { const d = curve.getPoint(u).distanceTo(curve.userData.rel); if (d < best) { best = d; uDrop = u; } }
        const tDrop = t0 + dur * uDrop;
        const rel = curve.getPoint(uDrop), v = velAt(curve, uDrop, dur, new THREE.Vector3());
        const tSplash = tDrop + Math.sqrt(2 * (rel.y - .2) / G);
        const splashPos = new THREE.Vector3(rel.x + v.x * (tSplash - tDrop), .2, rel.z + v.z * (tSplash - tDrop));
        const end = new THREE.Vector3(target.x, .1, target.z + 1.2);
        const run = splashPos.distanceTo(end), tHit = tSplash + run / 11;
        if (tHit < ship.hit) { ship.hit = tHit; ship.hitX = 0; ship.hitSide = 1; ship.sinkMode = ship.sinkMode === 'stern' ? 'list' : 'capsize'; }
        const torp = H.cyl(.13, .13, 1.9, '#3a3f46', 10); torp.rotation.x = Math.PI / 2; torp.castShadow = false;
        const torpG = new THREE.Group(); torpG.add(torp); torpG.visible = false; scene.add(torpG);
        const wake = new THREE.Mesh(new THREE.BoxGeometry(.3, .04, 1), new THREE.MeshBasicMaterial({ color: '#dfe9f2', transparent: true, opacity: .3, depthWrite: false })); wake.visible = false; scene.add(wake);
        const entry = H.waterColumn(r, { height: 2.5, radius: .35, duration: 1.4, drops: 40 }); entry.position.copy(splashPos); scene.add(entry);
        const boom = H.fireball(r, { size: p.explosionSize * 1.1, duration: 3.0, debris: p.debris, sparks: 60 }); boom.position.copy(target).setY(.6); scene.add(boom);
        const splash = H.waterColumn(r, { height: p.splashHeight * 1.05, radius: .5, duration: 2.8, drops: 120 }); splash.position.copy(end).setY(.25); scene.add(splash);
        pl.torp = { torp: torpG, wake, entry, boom, splash, tDrop, tSplash, tHit, rel, v, splashPos, end };
      } else {
        // Bomben: werden mit der Fluggeschwindigkeit ausgeklinkt und fallen ballistisch. Abwurfpunkt so gewählt,
        // dass die erste Bombe das Ziel trifft; weitere Bomben fallen in kurzem Abstand dahinter ins Wasser.
        let best = .25, bestD = 1e9;
        for (let u = .15; u <= .5; u += .005) {
          curve.getPoint(u, tmp); velAt(curve, u, dur, tmp2);
          const tf = Math.sqrt(2 * Math.max(0, tmp.y - 1.2) / G);
          const d = Math.hypot(tmp.x + tmp2.x * tf - target.x, tmp.z + tmp2.z * tf - target.z);
          if (d < bestD) { bestD = d; best = u; }
        }
        for (let k = 0; k < p.bombsPer; k++) {
          const u = best + k * (.09 / dur) * p.attackSpeed;          // nächste Bombe ~0,09 s später
          const tDrop = t0 + u * dur;
          const rel = curve.getPoint(u).sub(new THREE.Vector3(0, .35, 0)), v = velAt(curve, u, dur, new THREE.Vector3());
          const tf = Math.sqrt(2 * Math.max(0, rel.y - 1.2) / G), tHit = tDrop + tf;
          if (k === 0) { v.x = (target.x - rel.x) / tf; v.z = (target.z - rel.z) / tf; }   // erste Bombe sitzt
          const land = new THREE.Vector3(rel.x + v.x * tf, 1.2, rel.z + v.z * tf);
          const onShip = Math.hypot(land.x - target.x, land.z - target.z) < ship.len * .5 + .8;
          const model = H.bomb(2.1, H.glowMat(H.ROLE.axis, 1.2), .21); model.visible = false; scene.add(model);
          let boom = null, splash = null;
          if (onShip) {
            boom = H.fireball(r, { size: p.explosionSize, duration: 3.0, debris: p.debris, sparks: 60 }); boom.position.copy(land).setY(1.4); scene.add(boom);
            if (tHit < ship.hit) { ship.hit = tHit; ship.hitX = land.x - target.x; ship.hitSide = land.z > target.z ? 1 : -1; }
          } else {
            splash = H.waterColumn(r, { height: p.splashHeight * (.8 + r() * .5), radius: .55 + r() * .3, duration: 2.8, drops: 140 }); splash.position.copy(land).setY(.25); scene.add(splash);
            boom = H.fireball(r, { size: p.explosionSize * .45, duration: 1.2, debris: 0, sparks: 30, ring: false }); boom.position.copy(land).setY(.4); scene.add(boom);
          }
          const b = { model, rel, v, tDrop, tHit, boom, splash, pl };
          bombs.push(b); pl.bombs.push(b);
        }
      }
    }
    for (const sh of ships) { const x = Math.max(-sh.len * .4, Math.min(sh.len * .4, sh.hitX)); sh.fires[0].fb.position.x = x; sh.fires[1].fb.position.x = x + (x < 0 ? 2.6 : -2.6); sh.smoke.position.x = x; }
    scene.userData.planes = planes;
    // ---------- Abschuss: ein Bomber wird nach dem Abwurf von Flak und Leuchtspur getroffen, brennt und stürzt ab ----------
    let crash = null;
    if (p.shootDown && planes.some(q => !q.torpedo)) {
      const bombers = planes.filter(q => !q.torpedo);
      const pl = bombers[0];
      const uHit = .47, tHitP = pl.t0 + pl.dur * uHit;              // direkt über den Schiffen, kurz nach dem Abwurf
      const start = pl.curve.getPoint(uHit), v0 = velAt(pl.curve, uHit, pl.dur, new THREE.Vector3());
      const fallDur = 2.0;
      const dirH = new THREE.Vector3(v0.x, 0, v0.z).normalize();
      const end = new THREE.Vector3(start.x + dirH.x * 16, .2, start.z + dirH.z * 16);   // bremst ab und schlägt im Bild ein
      const fall = new THREE.QuadraticBezierCurve3(start, new THREE.Vector3(start.x + dirH.x * 10, start.y * .85, start.z + dirH.z * 10), end);
      const fire = H.flame(r, { size: .9, tongues: 6, embers: 12, spread: .8 }); pl.m.add(fire); fire.position.set(0, -.1, .3);
      const smokeTrail = H.trail(r, (u, out) => fall.getPoint(u, out), { duration: fallDur, n: 70, size: .7 });
      scene.add(smokeTrail);
      const burst = H.fireball(r, { size: .9, duration: 1.4, debris: 15, sparks: 60, ring: false }); burst.position.copy(start); scene.add(burst);
      const hitPuff = H.explosion({ size: 1.3, color: '#ffb060', smoke: '#444', duration: 1.6 }); hitPuff.position.copy(start); scene.add(hitPuff);
      const impact = H.fireball(r, { size: 1.3, duration: 2.2, debris: 25, sparks: 70, ring: false }); impact.position.copy(end).setY(.5); scene.add(impact);
      const splash = H.waterColumn(r, { height: p.splashHeight * .9, radius: .7, duration: 2.6, drops: 120 }); splash.position.copy(end).setY(.25); scene.add(splash);
      crash = { pl, tHitP, fall, fallDur, fire, smokeTrail, burst, hitPuff, impact, splash };
    }
    // ---------- Alarm, Flak und Leuchtspur ----------
    const tAlarm = Math.min(...planes.map(q => q.t0)) + 1.0;
    const flak = [];
    for (let i = 0; i < p.flak; i++) {
      const pl = planes[i % planes.length];
      const t0 = Math.max(tAlarm, pl.t0 + pl.dur * (.2 + r() * .55));
      if (crash && pl === crash.pl && t0 > crash.tHitP) continue;
      const f = H.explosion({ size: .7, color: '#9a9a9a', smoke: '#555', duration: 1.4 });
      pl.curve.getPoint(H.span(t0, pl.t0, pl.t0 + pl.dur), f.position);
      f.position.add(new THREE.Vector3((r() - .5) * 6, (r() - .5) * 4, (r() - .5) * 6)); scene.add(f); flak.push({ f, t0 });
    }
    const tracers = [];
    for (let i = 0; i < p.tracers; i++) {
      const ship = ships[i % ships.length];
      ship.yaw.updateMatrixWorld(true);
      const from = ship.s.userData.aa[i % ship.s.userData.aa.length].clone().applyMatrix4(ship.yaw.matrixWorld);
      const pl = planes[(i * 7 + 3) % planes.length];
      const shots = [];
      for (let m = 0; m < p.burst; m++) { const sh = H.tracerShot(r() < .5 ? '#ffd27a' : '#ff9a5a', 2.2 + r() * .8); sh.visible = false; scene.add(sh); shots.push({ sh, jit: new THREE.Vector3((r() - .5) * .9, (r() - .5) * .5, (r() - .5) * .9) }); }
      const flash = H.glowSprite('#ffd080', 1.4); flash.position.copy(from); flash.visible = false; scene.add(flash);
      tracers.push({ shots, flash, from, pl, scatter: new THREE.Vector3((r() - .5) * 6, (r() - .5) * 3, (r() - .5) * 6), off: r() * .8, period: 1.6 + r() * .8, gap: .09 + r() * .03, aim: new THREE.Vector3(), up: .35 + r() * .4, dir: new THREE.Vector3() });
    }
    // ---------- Abschuss-Garbe: zwei Flak-Geschütze der nächsten intakten Schiffe schießen mit Vorhalt auf den Bomber.
    // Die ersten Geschosse liegen knapp daneben, die letzten treffen genau im Abschussmoment (Trefferfunken am Flugzeug).
    const killGuns = [], hitSparks = [];
    if (crash) {
      const P0 = crash.pl.curve.getPoint(crash.tHitP > 0 ? H.span(crash.tHitP, crash.pl.t0, crash.pl.t0 + crash.pl.dur) : 0);
      const cand = ships.slice().sort((a, b) => ((a.hit > crash.tHitP ? 0 : 1e4) + a.yaw.position.distanceTo(P0)) - ((b.hit > crash.tHitP ? 0 : 1e4) + b.yaw.position.distanceTo(P0)));
      for (let g = 0; g < Math.min(2, cand.length); g++) {
        const ship = cand[g], aa = ship.s.userData.aa;
        const local = aa.reduce((best, v) => (v.z * Math.sign(P0.z - ship.yaw.position.z) > best.z * Math.sign(P0.z - ship.yaw.position.z) ? v : best), aa[0]).clone();   // Lafette auf der Seite zum Flugzeug
        const shots = [];
        for (let k = 0; k < 9; k++) {
          const sh = H.tracerShot(k % 2 ? '#ffd27a' : '#ff9a5a', 2.4); sh.visible = false; scene.add(sh);
          const miss = k < 3 ? .12 : .6 + k * .45;                                        // spätere Indizes = frühere Schüsse = weiter daneben
          const a = r() * 6.283;
          shots.push({ sh, k, off: new THREE.Vector3(Math.cos(a) * miss, (r() - .3) * miss * .6, Math.sin(a) * miss), arr: crash.tHitP - k * .1 - g * .04 });
        }
        const flash = H.glowSprite('#ffd080', 1.5); flash.visible = false; scene.add(flash);
        killGuns.push({ ship, local, shots, flash, from: new THREE.Vector3(), aim: new THREE.Vector3() });
      }
      for (let k = 0; k < 3; k++) {
        const tA = crash.tHitP - k * .1;
        const e = H.explosion({ size: .45, color: '#ffcf70', smoke: '#4a4a4a', duration: .7 });
        crash.pl.curve.getPoint(H.span(tA, crash.pl.t0, crash.pl.t0 + crash.pl.dur), e.position); scene.add(e);
        hitSparks.push({ e, t0: tA });
      }
    }
    // ---------- Ölbrände auf dem Wasser neben getroffenen Schiffen ----------
    const fires = [], slicks = [];
    for (const sh of ships.slice().sort((a, b) => a.hit - b.hit).slice(0, 0)) {
      if (sh.hit === Infinity) continue;
      const f = H.flame(r, { size: .8, tongues: 5, spread: 2.0 }); f.position.set(sh.s.position.x + (r() - .5) * 4, .3, sh.s.position.z + 2.8 + r() * 2); scene.add(f); fires.push({ f, t0: sh.hit + 1.2 + r() * .8 });
      const d = H.disc(1, '#0d1116', 24); d.position.set(f.position.x, .27, f.position.z); d.castShadow = false; d.visible = false; scene.add(d); slicks.push(d);
    }
    // ---------- Hafenkulisse ----------
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
    }

    return {
      update(t, p) {
        water.userData.at(t);
        // Flugzeuge
        for (const pl of planes) {
          const u = H.span(t, pl.t0, pl.t0 + pl.dur);
          const crashing = crash && pl === crash.pl && t > crash.tHitP;
          if (crashing) {
            const cu = H.span(t, crash.tHitP, crash.tHitP + crash.fallDur);
            pl.m.visible = cu < 1;
            crash.fall.getPoint(cu, pl.m.position); crash.fall.getPoint(Math.min(1, cu + .01), tmp); pl.m.lookAt(tmp); pl.m.rotateZ(cu * cu * 9);
            crash.fire.userData.at(t - crash.tHitP, cu < 1 ? 1 : 0);
            crash.smokeTrail.userData.at(t - crash.tHitP);
            crash.burst.userData.at(t - crash.tHitP); crash.hitPuff.userData.at(t - crash.tHitP + .05);
            crash.impact.userData.at(t - crash.tHitP - crash.fallDur); crash.splash.userData.at(t - crash.tHitP - crash.fallDur + .05);
          } else {
            pl.m.visible = u > 0 && u < 1;
            pl.curve.getPoint(u, pl.m.position);
            pl.curve.getPoint(Math.min(1, u + .004), tmp);
            pl.m.lookAt(tmp);
            pl.m.rotateZ(pl.bank * Math.sin(u * Math.PI));
            if (crash && pl === crash.pl) { crash.fire.userData.at(-1); crash.smokeTrail.userData.at(-1); crash.burst.userData.at(-1); crash.hitPuff.userData.at(-1); crash.impact.userData.at(-1); crash.splash.userData.at(-1); }
          }
          if (pl.torp) {
            const T = pl.torp;
            const fallT = t - T.tDrop;
            if (fallT > 0 && t < T.tSplash) {          // Torpedo fällt
              T.torp.visible = true;
              T.torp.position.set(T.rel.x + T.v.x * fallT, T.rel.y + T.v.y * fallT - .5 * G * fallT * fallT, T.rel.z + T.v.z * fallT);
              tmp.set(T.v.x, T.v.y - G * fallT, T.v.z).add(T.torp.position); T.torp.lookAt(tmp);
              T.wake.visible = false;
            } else if (t >= T.tSplash && t < T.tHit) { // Torpedo läuft
              const ru = H.span(t, T.tSplash, T.tHit);
              T.torp.visible = true; T.torp.position.lerpVectors(T.splashPos, T.end, ru).setY(.05);
              tmp.copy(T.end).setY(.05); T.torp.lookAt(tmp);
              T.wake.visible = true;
              const dist = T.splashPos.distanceTo(T.end) * ru;
              T.wake.scale.set(1, 1, Math.max(.01, dist)); T.wake.position.lerpVectors(T.splashPos, T.torp.position, .5).setY(.3); T.wake.lookAt(tmp.copy(T.end).setY(.3)); T.wake.material.opacity = .3;
            } else { T.torp.visible = false; const fade = H.span(t, T.tHit, T.tHit + .8); T.wake.visible = t >= T.tHit && fade < 1; T.wake.material.opacity = .3 * (1 - fade); }
            T.entry.userData.at(t - T.tSplash); T.boom.userData.at(t - T.tHit); T.splash.userData.at(t - T.tHit + .1);
          }
        }
        // Bomben
        for (const b of bombs) {
          const ft = t - b.tDrop;
          b.model.visible = ft > 0 && t < b.tHit;
          if (b.model.visible) {
            b.model.position.set(b.rel.x + b.v.x * ft, b.rel.y + b.v.y * ft - .5 * G * ft * ft, b.rel.z + b.v.z * ft);
            tmp.set(b.v.x, b.v.y - G * ft, b.v.z).add(b.model.position); b.model.lookAt(tmp);
          }
          b.boom.userData.at(t - b.tHit);
          if (b.splash) b.splash.userData.at(t - b.tHit);
        }
        // Schiffe: Schlagseite, Absinken, Brände, Rauch, Matrosen
        for (const sh of ships) {
          const ps = shipPose(sh, t, p.listing);
          sh.s.rotation.x = ps.rx; sh.s.rotation.z = ps.rz; sh.s.position.y = ps.y;
          if (sh.tFall === undefined) {                                                   // erster Zeitpunkt mit zu starker Neigung
            sh.tFall = Infinity;
            if (sh.hit !== Infinity) for (let tt = sh.hit; tt < sh.hit + 8; tt += .02) { const q = shipPose(sh, tt, p.listing); if (Math.max(Math.abs(q.rx), Math.abs(q.rz)) > .17) { sh.tFall = tt; break; } }
          }
          sh.smoke.visible = t > sh.hit + .5; if (sh.smoke.visible) sh.smoke.userData.at(t - sh.hit - .5, .5);
          for (const fl of sh.fires) {
            const near = 1 - Math.min(1, Math.abs(fl.fb.position.x - sh.hitX) / (sh.len * .5)) * .6;   // nahe am Treffer größer
            const a = sh.hit === Infinity ? -1 : t - sh.hit - .4 - fl.off;
            fl.fb.visible = a > 0; if (a > 0) fl.fb.userData.at(a, near * fl.k);
          }
          // Matrosen: gehen das Deck ab, halten an den Enden kurz an und drehen um; nach dem Alarm rennen sie
          const tA = Math.min(tAlarm + .6, sh.hit - .6);
          const roll = sh.s.rotation.x, B2 = sh.s.userData.beam * .5, deckY = sh.s.userData.deckY;
          for (const sa of sh.sailors) {
            const tF = sh.tFall + sa.fallDelay;
            if (t > tF) {
              // Sturz entlang des Laufwegs (zur Wegmitte, weg von Türmen und Davits), danach rutschen mit der Schlagseite:
              // auf der tiefen Seite über Bord, auf der hohen Seite bis an den Aufbau
              const fx = sailorWalk(sa, tF, tA).x, fdir = Math.sign((sa.lane.x0 + sa.lane.x1) / 2 - fx) || 1;   // deterministisch aus dem Sturzzeitpunkt
              const f = t - tF;
              sa.f.position.x = fx;
              sa.f.rotation.y = fdir > 0 ? 0 : Math.PI;
              sa.f.userData.pose('Dying_Falling_Forward', f);
              const low = Math.sign(roll) || 1, side = Math.sign(sa.lane.z) || 1;
              const acc = 2.2 * Math.max(0, Math.abs(Math.sin(roll)) - .15), sl = .5 * acc * Math.max(0, f - .7) ** 2;
              let z = sa.lane.z, y = deckY;
              if (side === low) {                                                          // tiefe Seite: zur Kante und hinunter
                z = sa.lane.z + low * sl;
                const over = Math.abs(z) - (B2 + .05);
                if (over > 0) y = deckY - over * 2.2;
                sa.f.visible = y > deckY - 2.5;
              } else {                                                                     // hohe Seite: bis an die Aufbauwand
                const wall = sh.s.userData.beam * .31 + .22;
                z = side * Math.max(wall, Math.abs(sa.lane.z) - sl);
                sa.f.visible = true;
              }
              sa.f.position.z = z; sa.f.position.y = y;
              continue;
            }
            const w = sailorWalk(sa, t, tA);
            sa.f.visible = true; sa.f.position.set(w.x, deckY, sa.lane.z);
            sa.f.rotation.y = w.dir > 0 ? 0 : Math.PI;
            const fast = w.fast, moving = w.moving, S = w.S;
            if (moving) sa.f.userData.walkDist(S, fast ? 1.3 : 1); else sa.f.userData.idle(t);
          }
        }
        for (const f of flak) f.f.userData.at(t - f.t0);
        // Flak-Geschütze: Feuerstöße aus mehreren Leuchtspurgeschossen mit Mündungsblitz, leicht gekrümmte Bahn
        for (const tr of tracers) {
          const tf = Math.floor((t - tr.off) / tr.period) * tr.period + tr.off;   // Beginn dieses Feuerstoßes
          const pl = tr.pl, u = H.span(tf, pl.t0, pl.t0 + pl.dur);
          const alive = !(crash && pl === crash.pl && tf > crash.tHitP);
          const firing = tf >= tAlarm && u > .08 && u < .92 && alive;
          tr.flash.visible = false;
          if (!firing) { for (const s of tr.shots) s.sh.visible = false; continue; }
          // Salven auf das später getroffene Flugzeug ziehen sich bis zum Treffer zusammen
          const conv = crash && pl === crash.pl ? Math.min(1, Math.max(0, (crash.tHitP - tf) / 1.2)) : 1;
          pl.curve.getPoint(H.span(tf + .4, pl.t0, pl.t0 + pl.dur), tr.aim); tr.aim.addScaledVector(tr.scatter, conv);
          tr.dir.subVectors(tr.aim, tr.from); const dist = tr.dir.length(); tr.dir.divideScalar(dist);
          tr.dir.y += tr.up; tr.dir.normalize();                                          // Abwehrfeuer geht steil nach oben
          const maxFly = Math.min(dist * 1.15, 70);
          tr.shots.forEach((s, m) => {
            const k = t - tf - m * tr.gap;                                                // Flugzeit dieses Schusses
            const flown = k * p.tracerSpeed;
            s.sh.visible = k >= 0 && flown < maxFly;
            if (k >= 0 && k < .05) tr.flash.visible = true;
            if (!s.sh.visible) return;
            tmp2.copy(tr.dir).addScaledVector(s.jit, .04 * (1 - conv * .6)).normalize();
            s.sh.position.copy(tr.from).addScaledVector(tmp2, flown); s.sh.position.y -= 2.5 * k * k;   // leichte Krümmung
            tmp.copy(tmp2); tmp.y -= 5 * k / p.tracerSpeed * 10; s.sh.lookAt(tmp.add(s.sh.position));
          });
          tr.flash.scale.setScalar(1.0 + .6 * Math.abs(Math.sin(t * 57 + tr.off * 10)));   // deterministisch flackern
        }
        for (const kg of killGuns) {
          kg.ship.yaw.updateMatrixWorld(true);
          kg.ship.s.localToWorld(kg.from.copy(kg.local));
          kg.flash.position.copy(kg.from); kg.flash.visible = false;
          const pl = crash.pl;
          for (const s of kg.shots) {
            pl.curve.getPoint(H.span(s.arr, pl.t0, pl.t0 + pl.dur), kg.aim).add(s.off);   // Position des Bombers bei Ankunft (Vorhalt)
            tmp2.subVectors(kg.aim, kg.from); const dist = tmp2.length(); tmp2.divideScalar(dist);
            const tFire = s.arr - dist / p.tracerSpeed, fl = t - tFire;
            const over = s.k < 3 ? 0 : 6;                                                  // Fehlschüsse fliegen weiter
            s.sh.visible = fl >= 0 && fl * p.tracerSpeed < dist + over;
            if (fl >= 0 && fl < .05) { kg.flash.visible = true; kg.flash.scale.setScalar(1.1 + .5 * Math.abs(Math.sin(t * 61 + s.k))); }
            if (!s.sh.visible) continue;
            s.sh.position.copy(kg.from).addScaledVector(tmp2, fl * p.tracerSpeed);
            s.sh.lookAt(tmp.copy(s.sh.position).add(tmp2));
          }
        }
        for (const hs of hitSparks) hs.e.userData.at(t - hs.t0);
        fires.forEach((fr, i) => { const a = t - fr.t0; fr.f.userData.at(a); const sl = slicks[i]; if (sl) { sl.visible = a > 0; sl.scale.setScalar(1 + Math.min(3, a) * .6); } });
      }
    };
  }
};
