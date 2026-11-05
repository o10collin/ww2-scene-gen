// VHS-Filter: läuft als letzter Schritt über das fertige 2D-Bild (inkl. Texte, Vignette, Blenden),
// damit Vorschau und Export identisch aussehen. Deterministisch aus der Szenenzeit t (bildgenauer Export).
// Nachgebildet: geringe Luma-Auflösung mit Kantenüberschwingen, verschmierte und versetzte Farbe (Chroma-Delay),
// Zeilenzittern, Kopfumschalt-Störung am unteren Rand, wandernder Tracking-Streifen, Dropouts, Zeilenstruktur, Rauschen.
import * as THREE from 'three';

const FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform vec2 res;
uniform float time, frame, strength;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(float x) { float i = floor(x), f = fract(x); return mix(hash(vec2(i, 1.3)), hash(vec2(i + 1., 1.3)), f * f * (3. - 2. * f)); }
vec3 toYIQ(vec3 c) { return vec3(dot(c, vec3(.299, .587, .114)), dot(c, vec3(.596, -.274, -.322)), dot(c, vec3(.211, -.523, .312))); }
vec3 toRGB(vec3 c) { return vec3(c.x + .956 * c.y + .621 * c.z, c.x - .272 * c.y - .647 * c.z, c.x - 1.106 * c.y + 1.703 * c.z); }
void main() {
  float s = strength, s1 = min(s, 1.);
  float sc = res.y / 1080.;                 // 1 px bei 1080p
  float pxu = sc / res.x;                   // dieser Pixel in UV (horizontal)
  float top = 1. - vUv.y;                   // 0 = oberer Rand
  float line = floor(top * 540.);           // 540 Halbbildzeilen
  // Zeilenzittern und langsames Wabern
  float jit = (hash(vec2(line, frame)) - .5) * 1.4 * s;
  jit += sin(top * 11. + time * 1.7) * .7 * s + (vnoise(time * 2.3) - .5) * 2. * s;
  // Kopfumschaltung: unterste Zeilen stark nach rechts verzogen
  float hs = smoothstep(.03, 0., vUv.y) * s1;
  jit += hs * (14. + 26. * hash(vec2(line, frame + 3.)));
  // Tracking-Streifen, wandert langsam von unten nach oben
  float bandY = fract(time * .045 + .15);
  float band = smoothstep(.018, 0., abs(top - bandY)) * s1;
  jit += band * (hash(vec2(line, frame + 7.)) - .5) * 26.;
  vec2 u = vec2(vUv.x - jit * pxu, vUv.y);
  // Luma: schmale Unschärfe + Überschwingen an Kanten
  float sp = .6 + .7 * s;
  float Y = 0., Yb = 0.;
  for (int i = -2; i <= 2; i++) Y += toYIQ(texture2D(tDiffuse, u + vec2(float(i) * sp * pxu, 0.)).rgb).x;
  Y /= 5.;
  for (int i = -4; i <= 4; i++) Yb += toYIQ(texture2D(tDiffuse, u + vec2(float(i) * 2.6 * pxu, 0.)).rgb).x;
  Yb /= 9.;
  Y += (Y - Yb) * .7 * s;
  // Chroma: breit verschmiert, nach rechts versetzt, entsättigt
  vec2 IQ = vec2(0.);
  vec2 cu = u - vec2(5. * s * pxu, 0.);
  for (int i = -6; i <= 6; i++) IQ += toYIQ(texture2D(tDiffuse, cu + vec2(float(i) * 2.2 * s * pxu, 0.)).rgb).yz;
  IQ /= 13.;
  IQ *= 1. - .22 * s1;
  vec3 c = toRGB(vec3(Y, IQ));
  // Bandmaterial: angehobene Schwärzen, weniger Kontrast, leicht warm
  c = mix(c, c * vec3(1.03, 1., .93) * .9 + .04, s1);
  // Zeilenstruktur
  c *= 1. - .07 * s1 * (.5 + .5 * cos(top * 1080. * 3.14159265));
  // Rauschen
  c += (hash(vUv * res + frame * 17.3) - .5) * .07 * s;
  // Schnee im Tracking-Streifen und an der Kopfumschaltung
  float sn = hash(vec2(floor(vUv.x * res.x / (3. * sc)), line + frame * 13.));
  c = mix(c, vec3(sn * 1.1), clamp((band * .35 + hs * .6) * step(.78, sn), 0., 1.));
  // Dropouts: kurze helle Striche
  if (hash(vec2(line, frame)) > 1. - .0018 * s) {
    float x0 = hash(vec2(line, frame + 1.)), len = .015 + .07 * hash(vec2(line, frame + 2.));
    c = mix(c, vec3(.92), smoothstep(len, 0., abs(vUv.x - x0)) * .85);
  }
  gl_FragColor = vec4(clamp(c, 0., 1.), 1.);
}`;

export function createVHS(renderer) {
  let tex = null;
  const mat = new THREE.ShaderMaterial({
    uniforms: { tDiffuse: { value: null }, res: { value: new THREE.Vector2(1, 1) }, time: { value: 0 }, frame: { value: 0 }, strength: { value: 1 } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = vec4(position.xy, 0., 1.); }',
    fragmentShader: FRAG, depthTest: false, depthWrite: false
  });
  const scene = new THREE.Scene(), cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), mat); quad.frustumCulled = false; scene.add(quad);
  // Quelle: das 2D-Ausgabebild; Ergebnis landet im WebGL-Canvas des Renderers und wird zurückkopiert
  return function apply(src, ctx, t, strength) {
    if (!tex || tex.image !== src) { tex?.dispose(); tex = new THREE.CanvasTexture(src); tex.colorSpace = THREE.NoColorSpace; tex.minFilter = tex.magFilter = THREE.LinearFilter; tex.generateMipmaps = false; }
    tex.needsUpdate = true;
    const u = mat.uniforms;
    u.tDiffuse.value = tex; u.res.value.set(src.width, src.height);
    u.time.value = t; u.frame.value = Math.floor(t * 30); u.strength.value = strength;
    const tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping;
    renderer.setRenderTarget(null); renderer.render(scene, cam);
    renderer.toneMapping = tm;
    ctx.globalCompositeOperation = 'source-over'; ctx.globalAlpha = 1;
    ctx.drawImage(renderer.domElement, 0, 0, src.width, src.height);
  };
}

// Bildschirmeinblendung wie bei einem Videorekorder: „PLAY ▶“ in den ersten Sekunden, Bandzählwerk unten rechts
let fontRequested = false;
export function drawOSD(ctx, W, Hh, t) {
  if (!fontRequested && typeof document !== 'undefined' && document.fonts) { fontRequested = true; document.fonts.load('58px "VT323"').catch(() => {}); }
  const s = Hh / 1080, size = Math.round(58 * s);
  ctx.save();
  ctx.font = `${size}px "VT323", "Courier New", monospace`; ctx.textBaseline = 'top';
  ctx.shadowColor = 'rgba(0,0,0,.6)'; ctx.shadowOffsetX = 3 * s; ctx.shadowOffsetY = 3 * s; ctx.shadowBlur = 0;
  ctx.fillStyle = '#f2f2f2';
  if (t < 4 && (t < 3 || Math.floor(t * 2) % 2 === 0)) { ctx.textAlign = 'left'; ctx.fillText('PLAY ▶', 90 * s, 70 * s); }
  const sec = Math.floor(t), c = `${Math.floor(sec / 3600)}:${String(Math.floor(sec / 60) % 60).padStart(2, '0')}:${String(sec % 60).padStart(2, '0')}`;
  ctx.textAlign = 'right'; ctx.fillText('SP  ' + c, W - 90 * s, Hh - 70 * s - size);
  ctx.restore();
}
