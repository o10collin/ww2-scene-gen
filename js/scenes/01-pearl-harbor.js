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
    planes: { type: 'number', min: 1, max: 14, step: 1, value: 6, label: 'Flugzeuge (je eine Bombe/ein Torpedo, je Schiff ein Treffer)' },
    torpedoPlanes: { type: 'number', min: 0, max: 8, step: 1, value: 2, label: 'davon Torpedoflugzeuge' },
    attackSpeed: { type: 'number', min: .5, max: 2, step: .05, value: 1, label: 'Angriffstempo' },
    explosionSize: { type: 'number', min: .5, max: 5, step: .1, value: 1.5, label: 'Explosionsgröße' },
    debris: { type: 'number', min: 0, max: 200, step: 10, value: 30, label: 'Trümmer je Explosion' },
    listing: { type: 'number', min: 0, max: 3, step: .1, value: 1, label: 'Stärke des Untergangs (Schlagseite, Kentern)' },
    splashHeight: { type: 'number', min: 3, max: 20, step: .5, value: 7, label: 'Höhe Wassersäulen' },
    fireSize: { type: 'number', min: .3, max: 3, step: .1, value: .9, label: 'Brände auf den Schiffen' },
    sailorsPer: { type: 'number', min: 0, max: 6, step: 1, value: 2, label: 'Matrosen je Schiff' },
    weaponColor: { type: 'color', value: '#ff8a1e', label: 'Bomben und Torpedos' },
    skyColor: { type: 'color', value: '#101722', label: 'Himmel' },
    waterColor: { type: 'color', value: '#1c2d3e', label: 'Wasser' },
    details: { type: 'boolean', value: true, label: 'Hafendetails (Piers, Kräne, Hangars)' },
    ...H.cameraParams([-3, 11, 45], [2, 10, 39], [5, 2.6, -2], 40)
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
      const smoke = H.smokeColumn(r, { color: '#48474d', height: 11, n: 8, width: .7 }); smoke.position.set(0, 2, 0); smoke.visible = false; s.add(smoke);
      // Untergangsart: Torpedotreffer kentern zur Trefferseite, Bombentreffer sacken über Heck oder Bug weg oder krängen
      const sinkMode = kind === 'destroyer' ? (r() < .5 ? 'stern' : 'list') : (r() < .5 ? 'capsize' : 'list');
      ships.push({ s, yaw, len, hit: Infinity, hitX: 0, hitSide: 1, sinkMode, sinkDir: r() < .5 ? 1 : -1, sailors, fires, smoke, blasts: [] });
    }
    // ---------- Flugzeuge: fliegen von außerhalb des Bildes über das Ziel und wieder hinaus ----------
    const planes = [], bombs = [];
    // Explosion für ein Schiff vormerken (Schiffskoordinaten); Figuren im Radius werden von der Druckwelle umgeworfen
    const addBlast = (ship, worldPos, t, R) => { ship.yaw.updateMatrixWorld(true); const l = ship.yaw.worldToLocal(worldPos.clone()); ship.blasts.push({ t, x: l.x, z: l.z, R }); };
    const tmp = new THREE.Vector3(), tmp2 = new THREE.Vector3(), tmp3 = new THREE.Vector3(), qUpright = new THREE.Quaternion();
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
    // Fallzeit einer Bombe bis zur Höhe yT, mit Abwurfgeschwindigkeit (im Sturzflug fällt sie schon schnell nach unten)
    const fallTime = (p0, v, yT) => (v.y + Math.sqrt(Math.max(0, v.y * v.y + 2 * G * (p0.y - yT)))) / G;
    // Schiff, auf dessen Deck ein Punkt liegt (Schiffsraum), sonst null
    const shipAt = (x, z) => ships.find(sh => { sh.yaw.updateMatrixWorld(true); const l = sh.yaw.worldToLocal(new THREE.Vector3(x, 0, z)); return Math.abs(l.x) < sh.len * .55 && Math.abs(l.z) < sh.s.userData.beam * .55; }) || null;
    const velAt = (curve, u, dur, out) => { curve.getPointAt(Math.min(1, u + .002), out); curve.getPointAt(Math.max(0, u - .002), tmp3); return out.sub(tmp3).divideScalar(.004 * dur); };
    // Torpedos nur auf Schiffe der vorderen Reihe (sonst müsste der Flieger tief durch die vordere Reihe), von rechts her
    // Zielverteilung: jedes Schiff wird getroffen. Torpedos nur auf die vordere Reihe (sonst müsste der Flieger tief
    // durch die vordere Reihe), abwechselnd von den Enden her; die Bomber nehmen die übrigen Schiffe, mittleres zuerst.
    const nT = Math.min(p.torpedoPlanes, p.planes);
    const frontAll = ships.map((sh, k) => k).filter(k => k % 2 === 1);
    const mid = (ships.length - 1) / 2, front = frontAll.slice().sort((a, b) => (a < mid) - (b < mid) || a - b);   // Mitte und rechts zuerst, links zuletzt (Abwurf im Bild)
    const torpTargets = front.slice(0, Math.min(nT, front.length));
    const pref = [2, 4, 0, 3, 1, 5, ...ships.map((sh, k) => k)].filter((k, j, a) => k < ships.length && a.indexOf(k) === j);
    const bombTargets = pref.filter(k => !torpTargets.includes(k));
    if (!bombTargets.length) bombTargets.push(...pref);
    for (let i = 0; i < p.planes; i++) {
      const torpedo = i >= p.planes - p.torpedoPlanes;                             // erst die Bomber, danach die Torpedoflieger
      const kT = i - (p.planes - p.torpedoPlanes);
      const ship = torpedo && torpTargets.length ? ships[torpTargets[kT % torpTargets.length]] : ships[bombTargets[i % bombTargets.length]];
      const target = ship.yaw.position.clone();
      const m = H.faceZ(H.aircraft(H.glowMat(H.ROLE.axis)));
      m.visible = false; scene.add(m);
      const t0 = i * (0.8 / p.attackSpeed) + r() * .2, dur = (torpedo ? 6.6 : 5.8) / p.attackSpeed;
      let curve;
      if (torpedo) {
        // Geradliniger Angriff schräg auf die Bordwand: Anflug, Abwurf, Fall und Torpedolauf liegen auf einer Linie,
        // danach zieht der Flieger über das Zielschiff hoch. Kein Abknicken des Torpedos.
        const d = new THREE.Vector3(1, 0, -.42).normalize();
        const impact = new THREE.Vector3(target.x + (r() - .5) * ship.len * .25, 0, target.z + ship.s.userData.beam * .5);
        const splash0 = impact.clone().addScaledVector(d, -5);                         // kurzer Lauf, Abwurf nah am Schiff
        const yA = 5 + r(), yC = 8.5 + r(), yE = 18 + r() * 3;
        let fallDist = 13, rel;
        for (let pass = 0; pass < 3; pass++) {                                          // Abwurfpunkt aus der tatsächlichen Fluggeschwindigkeit
          rel = splash0.clone().addScaledVector(d, -fallDist).setY(2.3);
          curve = new THREE.CatmullRomCurve3([rel.clone().addScaledVector(d, -55).setY(yA), rel, impact.clone().addScaledVector(d, 5).setY(yC), impact.clone().addScaledVector(d, 60).setY(yE)], false, 'catmullrom', .3);
          fallDist = curve.getLength() / dur * Math.sqrt(2 * (2.3 - .2) / G);
        }
        curve.userData = { rel, impact };
      } else {
        // Sturzkampfbomber: hoch anfliegen, steil auf das Ziel herabstoßen, kurz davor ausklinken, abfangen und steigen
        const lane = (r() - .5) * 2;                                                    // parallel zur Schiffsreihe, nicht auf die Kamera zu
        curve = new THREE.CatmullRomCurve3([                                           // steiler Sturz: Abwurf fast senkrecht über dem Ziel
          new THREE.Vector3(target.x - 50, 36 + r() * 3, target.z - 1 + lane),
          new THREE.Vector3(target.x - 8, 29 + r(), target.z + lane * .5),
          new THREE.Vector3(target.x - 2.5, 15, target.z),
          new THREE.Vector3(target.x + 7, 7.6, target.z),
          new THREE.Vector3(target.x + 60, 22 + r() * 3, target.z - 2 + lane)], false, 'catmullrom', .3);
      }
      const pl = { m, curve, t0, dur, torpedo, target, ship, bank: (r() - .5) * .25, bombs: [], torp: null };
      planes.push(pl);
      if (torpedo) {
        // Torpedo: fällt nach dem Abwurf ins Wasser und läuft auf das Schiff zu
        let uDrop = .3, best = 1e9;                                                    // Kurvenparameter am Abwurfpunkt
        for (let u = 0; u <= 1; u += .002) { const d = curve.getPointAt(u).distanceTo(curve.userData.rel); if (d < best) { best = d; uDrop = u; } }
        const tDrop = t0 + dur * uDrop;
        const rel = curve.getPointAt(uDrop), v = velAt(curve, uDrop, dur, new THREE.Vector3());
        const tSplash = tDrop + fallTime(rel, v, .2);
        const splashPos = new THREE.Vector3(rel.x + v.x * (tSplash - tDrop), .2, rel.z + v.z * (tSplash - tDrop));
        // Lauf geradeaus in Flugrichtung bis zur Bordwand (Schnitt mit der Schiffsseite)
        const dirH = new THREE.Vector3(v.x, 0, v.z).normalize();
        const sRun = dirH.z < -.05 ? (curve.userData.impact.z - splashPos.z) / dirH.z : splashPos.distanceTo(curve.userData.impact);
        const end = splashPos.clone().addScaledVector(dirH, Math.max(2, sRun)).setY(.1);
        const run = splashPos.distanceTo(end), tHit = tSplash + run / 11;
        if (tHit < ship.hit) { ship.hit = tHit; ship.hitX = 0; ship.hitSide = 1; ship.sinkMode = ship.sinkMode === 'stern' ? 'list' : 'capsize'; }
        addBlast(ship, end, tHit, 1.4 + p.explosionSize);
        const torp = H.cyl(.17, .17, 2.3, H.glowMat(p.weaponColor, 1.25), 8); torp.rotation.x = Math.PI / 2; torp.castShadow = false;   // leuchtet wie die Bomben
        const torpG = new THREE.Group(); torpG.add(torp); torpG.visible = false; scene.add(torpG);
        const wake = new THREE.Mesh(new THREE.BoxGeometry(.45, .04, 1), new THREE.MeshBasicMaterial({ color: '#e6eef5', transparent: true, opacity: .5, depthWrite: false })); wake.visible = false; scene.add(wake);
        const entry = H.waterColumn(r, { height: 2.5, radius: .35, duration: 1.4, drops: 40 }); entry.position.copy(splashPos); scene.add(entry);
        const boom = H.fireball(r, { size: p.explosionSize * 1.1, duration: 3.0, debris: p.debris, sparks: 60 }); boom.position.copy(end).setY(.6); scene.add(boom);   // genau am Einschlag an der Bordwand
        const splash = H.waterColumn(r, { height: p.splashHeight * 1.05, radius: .5, duration: 2.8, drops: 120 }); splash.position.copy(end).setY(.25); scene.add(splash);
        pl.torp = { torp: torpG, wake, entry, boom, splash, tDrop, tSplash, tHit, rel, v, splashPos, end };
      } else {
        // Bomben: werden mit der Fluggeschwindigkeit ausgeklinkt und fallen ballistisch. Abwurfpunkt so gewählt,
        // dass die erste Bombe das Ziel trifft; weitere Bomben fallen in kurzem Abstand dahinter ins Wasser.
        // Abwurf im Sturzflug auf etwa 10 m Höhe. Die Bombe übernimmt Tempo und Richtung des Flugzeugs; die ganze
        // Flugbahn wird so verschoben, dass ihre natürliche Landestelle genau auf dem Zielschiff liegt.
        let best = .4, bestE = 1e9;
        for (let u = .15; u <= .6; u += .0025) {
          curve.getPointAt(u, tmp); velAt(curve, u, dur, tmp2);
          if (tmp2.y >= 0) continue;                                                      // nur im Sinkflug
          const e = Math.abs(tmp.y - 13); if (e < bestE) { bestE = e; best = u; }     // Abwurf im steilen Teil des Sturzes
        }
        for (let pass = 0; pass < 2; pass++) {
          const rp = curve.getPointAt(best).sub(new THREE.Vector3(0, .35, 0)), rv = velAt(curve, best, dur, new THREE.Vector3());
          const tf = fallTime(rp, rv, 1.2);
          const off = new THREE.Vector3(target.x - (rp.x + rv.x * tf), 0, target.z - (rp.z + rv.z * tf));
          for (const q of curve.points) q.add(off);
          curve.updateArcLengths();
        }
        for (let k = 0; k < 1; k++) {                                                // eine Bombe pro Flieger
          const u = best + k * (.09 / dur) * p.attackSpeed;          // nächste Bombe ~0,09 s später
          const tDrop = t0 + u * dur;
          const rel = curve.getPointAt(u).sub(new THREE.Vector3(0, .35, 0)), v = velAt(curve, u, dur, new THREE.Vector3());
          const tf = fallTime(rel, v, 1.2), tHit = tDrop + tf;
          if (k === 0) { v.x = (target.x - rel.x) / tf; v.z = (target.z - rel.z) / tf; }   // erste Bombe sitzt
          let land = new THREE.Vector3(rel.x + v.x * tf, 1.2, rel.z + v.z * tf), tHitB = tHit;
          const hitShip = shipAt(land.x, land.z);                                        // auch ein Nachbarschiff kann getroffen werden
          const onShip = !!hitShip;
          if (!onShip) { const tw = fallTime(rel, v, .25); land = new THREE.Vector3(rel.x + v.x * tw, .25, rel.z + v.z * tw); tHitB = tDrop + tw; }   // Fehlwurf fällt bis aufs Wasser
          const model = H.bomb(2.1, H.glowMat(p.weaponColor, 1.25), .21); model.visible = false; scene.add(model);
          let boom = null, splash = null;
          if (onShip) {
            boom = H.fireball(r, { size: p.explosionSize, duration: 3.0, debris: p.debris, sparks: 60 }); boom.position.copy(land).setY(1.4); scene.add(boom);
            const hs = hitShip, hp = hs.yaw.position;
            if (tHit < hs.hit) { hs.hit = tHit; hs.hitX = land.x - hp.x; hs.hitSide = land.z > hp.z ? 1 : -1; }
            addBlast(hs, land, tHit, 1.6 + p.explosionSize);
          } else {
            splash = H.waterColumn(r, { height: p.splashHeight * (.8 + r() * .5), radius: .55 + r() * .3, duration: 2.8, drops: 140 }); splash.position.copy(land).setY(.25); scene.add(splash);
            boom = H.fireball(r, { size: p.explosionSize * .45, duration: 1.2, debris: 0, sparks: 30, ring: false }); boom.position.copy(land).setY(.4); scene.add(boom);
            addBlast(ship, land, tHitB, .8 + p.explosionSize * .4);                 // Nahtreffer im Wasser: kleiner Radius
          }
          const b = { model, rel, v, vPlane: velAt(curve, u, dur, new THREE.Vector3()), uDrop: u, tDrop, tHit: tHitB, boom, splash, pl };
          bombs.push(b); pl.bombs.push(b);
        }
      }
    }
    scene.userData.planes = planes; scene.userData.bombs = bombs; scene.userData.ships = ships;
    for (const sh of ships) { const x = Math.max(-sh.len * .4, Math.min(sh.len * .4, sh.hitX)); sh.fires[0].fb.position.x = x; sh.fires[1].fb.position.x = x + (x < 0 ? 2.6 : -2.6); sh.smoke.position.x = x; }
    // ---------- Alarm: sobald das erste Flugzeug im Anflug sichtbar ist, rennen die Matrosen ----------
    const tAlarm = Math.min(...planes.map(q => q.t0)) + 1.0;
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
          pl.m.visible = u > 0 && u < 1;
          pl.curve.getPointAt(u, pl.m.position);
          pl.curve.getPointAt(Math.min(1, u + .004), tmp);
          pl.m.lookAt(tmp);
          pl.m.rotateZ(pl.bank * Math.sin(u * Math.PI));
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
          qUpright.copy(sh.s.quaternion).invert();                                        // Rauch und Flammen steigen immer senkrecht auf
          sh.smoke.quaternion.copy(qUpright); for (const fl of sh.fires) fl.fb.quaternion.copy(qUpright);
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
            if (sa.tKnock === undefined) {                                                 // erste Explosion in Reichweite (deterministisch)
              sa.tKnock = Infinity;
              for (const b of sh.blasts) {
                if (b.t >= sa.tKnock) continue;
                const w = sailorWalk(sa, b.t, tA);
                if (Math.hypot(w.x - b.x, sa.lane.z - b.z) < b.R) { sa.tKnock = b.t; sa.knockX = b.x; }
              }
            }
            const knocked = sa.tKnock + .03 < sh.tFall + sa.fallDelay;
            const tF = knocked ? sa.tKnock + .03 : sh.tFall + sa.fallDelay;
            if (t > tF) {
              // Sturz entlang des Laufwegs: von der Druckwelle weg, sonst zur Wegmitte (weg von Türmen und Davits).
              // Danach liegen bleiben und mit der Schlagseite rutschen: tiefe Seite über Bord, hohe Seite bis an den Aufbau
              const fx0 = sailorWalk(sa, tF, tA).x;
              let fdir = knocked ? (Math.sign(fx0 - sa.knockX) || 1) : (Math.sign((sa.lane.x0 + sa.lane.x1) / 2 - fx0) || 1);
              if (fx0 + fdir * .9 > sa.lane.x1 || fx0 + fdir * .9 < sa.lane.x0) fdir = -fdir;   // kein Sturz in Türme oder Davits
              const f = t - tF;
              const throwX = knocked ? fdir * .45 * H.easeOut(Math.min(1, f / .3)) : 0;        // von der Druckwelle weggeschleudert
              sa.f.position.x = fx0 + throwX;
              sa.f.rotation.y = fdir > 0 ? 0 : Math.PI;
              sa.f.userData.pose('Dying_Falling_Forward', f + (knocked ? .35 : 0));        // Druckwelle: Stolperphase überspringen
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
        fires.forEach((fr, i) => { const a = t - fr.t0; fr.f.userData.at(a); const sl = slicks[i]; if (sl) { sl.visible = a > 0; sl.scale.setScalar(1 + Math.min(3, a) * .6); } });
      }
    };
  }
};
