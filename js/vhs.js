// VHS-Filter: läuft als letzter Schritt über das fertige 2D-Bild (inkl. Texte, Vignette, Blenden),
// damit Vorschau und Export identisch aussehen. Deterministisch aus der Szenenzeit t (bildgenauer Export).
// Nachgebildet: weiches Bild (geringe Bandauflösung), RGB-Versatz zum Rand hin stärker, Geisterbild, entsättigte kühle
// dunkle Farben, horizontale Rauschstreifen, leichtes Zeilenzittern, Zeilenstruktur, Randabdunklung, seltene Dropouts.
import * as THREE from 'three';

const FRAG = /* glsl */`
uniform sampler2D tDiffuse;
uniform vec2 res;
uniform float time, frame, strength;
varying vec2 vUv;
float hash(vec2 p) { p = fract(p * vec2(123.34, 456.21)); p += dot(p, p + 45.32); return fract(p.x * p.y); }
float vnoise(float x) { float i = floor(x), f = fract(x); return mix(hash(vec2(i, 1.3)), hash(vec2(i + 1., 1.3)), f * f * (3. - 2. * f)); }
// weiche Unschärfe: 7 Abtastungen horizontal × 3 vertikal (Band-Auflösung ist horizontal deutlich geringer)
vec3 soft(vec2 p, vec2 px) {
  vec3 c = vec3(0.);
  for (int j = -1; j <= 1; j++) for (int i = -3; i <= 3; i++) {
    float w = (4. - abs(float(i))) * (2. - abs(float(j)));
    c += texture2D(tDiffuse, p + vec2(float(i) * px.x, float(j) * px.y)).rgb * w;
  }
  return c / 64.;
}
void main() {
  float s = strength, s1 = min(s, 1.);
  float sc = res.y / 1080.;
  vec2 px = vec2(sc / res.x, sc / res.y);           // 1 px bei 1080p in UV
  float top = 1. - vUv.y;
  float row = floor(top * 1080.);
  // leichtes Zeilenzittern und Wabern
  float jit = (hash(vec2(floor(top * 540.), frame)) - .5) * .9 * s + sin(top * 9. + time * 1.4) * .5 * s + (vnoise(time * 2.1) - .5) * 1.2 * s;
  vec2 u = vec2(vUv.x - jit * px.x, vUv.y);
  vec2 bp = vec2((.55 + .45 * s) * px.x, .45 * px.y);
  // RGB-Versatz, zum Rand hin stärker
  float edge = length((vUv - .5) * vec2(1.6, 1.));
  float ca = (4. + 3. * edge) * s * px.x;
  vec3 c = vec3(soft(u + vec2(ca, 0.), bp).r, soft(u, bp).g, soft(u - vec2(ca, 0.), bp).b);
  // Geisterbild leicht rechts versetzt
  c = mix(c, texture2D(tDiffuse, u - vec2(11. * px.x, 0.)).rgb, .12 * s1);
  // Farbe: entsättigt, kühl, flacher Kontrast, dunkler
  float Y = dot(c, vec3(.299, .587, .114));
  c = mix(c, mix(vec3(Y), c, .72) * vec3(.9, .96, 1.06), s1);
  c = mix(c, ((c - .5) * .82 + .5) * .82 - .025, s1);
  // horizontale Rauschstreifen (kurze helle/dunkle Striche, leicht farbig)
  float xs = vUv.x * res.x / (sc * 46.), fx = fract(xs), ix = floor(xs), sm = fx * fx * (3. - 2. * fx);
  vec3 st;
  for (int k = 0; k < 3; k++) {
    float o = float(k) * 17.1 + frame * 3.7;
    st[k] = mix(hash(vec2(ix, row + o)), hash(vec2(ix + 1., row + o)), sm);
  }
  float stY = (st.r + st.g + st.b) / 3.;
  c += ((stY - .5) * .05 + (st - .5) * .025) * s;
  // feines Rauschen und Zeilenstruktur
  c += (hash(vUv * res + frame * 17.3) - .5) * .035 * s;
  c *= 1. - .05 * s1 * (.5 + .5 * cos(top * 1080. * 3.14159265));
  // zusätzliche Randabdunklung wie bei einem Röhrenbild
  c *= 1. - .4 * s1 * smoothstep(.35, 1.05, edge);
  // seltene Dropouts
  if (hash(vec2(row, frame)) > 1. - .0006 * s) {
    float x0 = hash(vec2(row, frame + 1.)), len = .01 + .04 * hash(vec2(row, frame + 2.));
    c = mix(c, vec3(.6), smoothstep(len, 0., abs(vUv.x - x0)) * .6);
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
