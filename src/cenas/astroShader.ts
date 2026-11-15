// Generated with AI assistance. See README, "Use of AI tools".
// A body of the solar system drawn live by the GPU, for the full-screen view (Astro): every pixel
// finds the point of the sphere under it and reads the body's surface map, baked in Blender
// (make_planetas_3d.py, equirectangular, top = north). Like the live Moon (luaShader.ts) it is
// crisp at any size and turns smoothly at any angle. Seen from a little above the equator, the
// spin axis leaning by the body's real tilt; soft day/night line and a thin atmosphere glow for
// Venus, Earth and Mars, and Saturn's rings (real radii, with the planet's shadow on them).
// The Sun is its own light: no shading, a darker and redder limb (limb
// darkening is real). Earth wears clouds: made here (3D noise in the bands where Earth's clouds
// really gather: the equator's thunderstorms, the storm tracks at mid latitudes, the dry belts at
// 25 degrees in between), drifting with the winds, slowly changing shape, casting their shadows.
import Phaser from 'phaser';

const FRAG = `
precision highp float;
uniform vec2 resolution;
uniform sampler2D iChannel0;   // surface map, equirectangular, top = north
uniform float uGiro;           // radians turned about the spin axis (signed: Venus goes backward)
uniform float uIncl;           // spin axis lean on screen, radians (clockwise)
uniform float uElev;           // the camera this far above the equator, radians
uniform vec3 uSol;             // light direction, view space (x right, y up, z toward the viewer)
uniform vec3 uAtmos;
uniform float uAtmosForca;     // 0 = no atmosphere
uniform float uEstrela;        // 1 = the Sun
uniform float uAneis;          // 1 = Saturn's rings
uniform float uEscala;         // the square spans 2 * uEscala radii (room for the glow, or the rings)
uniform float uNuvens;         // 1 = Earth's clouds
uniform float uTempo;          // simulated hours: the clouds drift and change
varying vec2 fragCoord;
const float PI = 3.14159265;

float hash(vec3 p) { p = fract(p * 0.3183099 + 0.1); p *= 17.0; return fract(p.x * p.y * p.z * (p.x + p.y + p.z)); }
float ruido(vec3 x) {
  vec3 i = floor(x), f = fract(x);
  f = f * f * (3.0 - 2.0 * f);
  return mix(mix(mix(hash(i), hash(i + vec3(1, 0, 0)), f.x), mix(hash(i + vec3(0, 1, 0)), hash(i + vec3(1, 1, 0)), f.x), f.y),
             mix(mix(hash(i + vec3(0, 0, 1)), hash(i + vec3(1, 0, 1)), f.x), mix(hash(i + vec3(0, 1, 1)), hash(i + vec3(1, 1, 1)), f.x), f.y), f.z);
}
float fbm(vec3 p) {
  float v = 0.0, a = 0.5;
  for (int i = 0; i < 5; i++) { v += a * ruido(p); p = p * 2.03 + vec3(1.7, 9.2, 3.1); a *= 0.5; }
  return v;
}
// Cloud cover (0..1) at latitude lat, longitude lon on the ground (radians), uTempo hours.
float nuvem(float lat, float lon) {
  // Winds: the trade winds blow west near the equator, the westerlies east at mid latitudes.
  float vento = abs(lat) < 0.52 ? -1.0 : 1.0;
  float l = lon + vento * uTempo * 0.006;
  vec3 q = vec3(cos(lat) * sin(l), sin(lat), cos(lat) * cos(l)) * 2.6;
  vec3 torce = vec3(fbm(q + vec3(0.0, 0.0, uTempo * 0.01)), fbm(q + vec3(5.2, 1.3, uTempo * 0.01)), 0.0);
  float c = fbm(q * 1.6 + torce * 1.8 + vec3(0.0, uTempo * 0.004, 0.0));
  // Where clouds gather: a band at the equator, storm belts at 40-65 degrees, dry at 20-30.
  float a = abs(lat);
  float faixa = 0.30 * exp(-pow(a / 0.16, 2.0)) + 0.34 * exp(-pow((a - 0.95) / 0.28, 2.0)) - 0.16 * exp(-pow((a - 0.44) / 0.12, 2.0));
  return smoothstep(0.52, 0.78, c + faixa);
}

// Saturn's rings at distance x (Saturn radii): color in rgb, opacity in a. NASA ring fact sheet:
// C 1.24-1.53 faint, B 1.53-1.95 bright, Cassini division, A 2.03-2.27 (Encke gap at 2.21).
vec4 anel(float x) {
  if (x < 1.24 || x > 2.27) return vec4(0.0);
  float fio = 0.85 + 0.15 * sin(x * 190.0) * sin(x * 47.0);   // fine ringlets
  if (x < 1.53) return vec4(vec3(0.55, 0.50, 0.42), 0.22 * fio);
  if (x < 1.95) return vec4(vec3(0.90, 0.82, 0.66) * fio, 0.88);
  if (x < 2.03) return vec4(vec3(0.45, 0.40, 0.35), 0.06);
  if (abs(x - 2.214) < 0.006) return vec4(0.0);
  return vec4(vec3(0.78, 0.71, 0.57) * fio, 0.6);
}

void main() {
  vec2 p = (fragCoord / resolution * 2.0 - 1.0) * uEscala;
  float px = 2.0 * uEscala / resolution.x;
  float ci = cos(uIncl), si = sin(uIncl), ce = cos(uElev), se = sin(uElev);
  // The ring plane: through the center, square to the spin axis (k, in view space). Where this
  // pixel's line of sight crosses it, and how far from the center that is.
  vec4 cAnel = vec4(0.0);
  float zAnel = -10.0;
  if (uAneis > 0.5) {
    vec3 k = vec3(si * ce, ci * ce, se);
    zAnel = -(k.x * p.x + k.y * p.y) / k.z;
    vec3 q = vec3(p, zAnel);
    cAnel = anel(length(q));
    // The planet's shadow: does the way from this bit of ring to the Sun cross the ball?
    float b = dot(q, uSol), c = dot(q, q) - 1.0;
    float sombra = (b * b - c > 0.0 && -b - sqrt(max(b * b - c, 0.0)) > 0.0) ? 0.15 : 1.0;
    cAnel.rgb *= (0.35 + 0.65 * abs(dot(k, uSol))) * sombra;
  }
  float r = length(p);
  // The glow of the atmosphere just outside the edge, on the sunlit side.
  float dirSol = dot(normalize(vec3(p, 0.0001)), uSol);
  float halo = uAtmosForca * pow(clamp(1.0 - (r - 1.0) / 0.07, 0.0, 1.0), 2.0) * smoothstep(-0.35, 0.5, dirSol) * 0.8;
  if (r > 1.0 + px) {
    // Outside the ball: the rings (if any) over the glow.
    vec3 fundo = uAtmos * halo;
    gl_FragColor = vec4(cAnel.rgb * cAnel.a + fundo * (1.0 - cAnel.a), cAnel.a + halo * (1.0 - cAnel.a));
    return;
  }

  float z = sqrt(max(0.0, 1.0 - r * r));
  vec3 n = vec3(p, z);
  // View -> body: undo the lean (about the view axis), then the camera height (about screen x).
  vec3 a = vec3(ci * n.x - si * n.y, si * n.x + ci * n.y, n.z);
  vec3 m = vec3(a.x, ce * a.y + se * a.z, -se * a.y + ce * a.z);
  float lat = asin(clamp(m.y, -1.0, 1.0));
  float lon = atan(m.x, m.z) - uGiro;
  vec2 uv = vec2(fract(0.5 + lon / (2.0 * PI)), clamp(0.5 - lat / PI, 0.001, 0.999));
  vec3 alb = texture2D(iChannel0, uv).rgb;

  vec3 cor;
  if (uEstrela > 0.5) {
    // The Sun: richer color, dimmer and redder toward the limb.
    vec3 c = pow(alb, vec3(1.7)) * 1.3;
    float limbo = 0.35 + 0.65 * pow(z, 0.6);
    cor = mix(c * limbo, c * limbo * vec3(1.0, 0.5, 0.2), pow(1.0 - z, 2.0) * 0.8);
  } else {
    float d = dot(n, uSol);
    float dia = smoothstep(-0.1, 0.3, d);                       // soft day/night line
    float luz = 0.025 + 0.975 * mix(dia, clamp(d, 0.0, 1.0), 0.55);
    cor = alb * luz * 1.12;
    if (uNuvens > 0.5) {
      float lonC = atan(m.x, m.z) - uGiro;
      float cob = nuvem(lat, lonC);
      // Their shadow: the cover a little toward the Sun (seen from the ground), darker ground.
      float somb = nuvem(lat + 0.012, lonC - 0.012) * smoothstep(-0.1, 0.3, d);
      cor *= 1.0 - 0.35 * somb * (1.0 - cob);
      vec3 branco = vec3(0.96, 0.97, 1.0) * (0.03 + 0.97 * mix(dia, clamp(d, 0.0, 1.0), 0.4));
      cor = mix(cor, branco, cob * 0.92);
    }
    // Atmosphere: a haze over the day side, thicker toward the edge.
    float borda = pow(1.0 - z, 2.2) * smoothstep(-0.25, 0.45, d);
    cor = mix(cor, uAtmos, clamp(borda * uAtmosForca * 1.1, 0.0, 0.85));
    cor += uAtmos * 0.05 * uAtmosForca * dia;
  }
  float k = clamp((1.0 - r) / px, 0.0, 1.0);                     // smooth edge
  float alfa = k + (1.0 - k) * halo;
  vec3 res = cor * k + uAtmos * halo * (1.0 - k);
  // The rings in front of the ball cover it; behind it, the ball covers them.
  if (zAnel > z) { res = cAnel.rgb * cAnel.a + res * (1.0 - cAnel.a); alfa = cAnel.a + alfa * (1.0 - cAnel.a); }
  else if (k < 1.0) { res = res + cAnel.rgb * cAnel.a * (1.0 - k); alfa = alfa + cAnel.a * (1.0 - k) * (1.0 - alfa); }
  gl_FragColor = vec4(res, alfa);
}
`;

export const ESCALA_ASTRO = 1.12;
export const ESCALA_ANEIS = 2.35;
export type OpcoesAstro = { textura: string; inclinacao: number; atmos: number[] | null; atmosForca: number; sol: boolean; aneis?: boolean; nuvens?: boolean };

// A square of `lado` px whose disc has radius lado / (2 * ESCALA_ASTRO), or ESCALA_ANEIS with rings.
export function criarAstro(cena: Phaser.Scene, x: number, y: number, lado: number, o: OpcoesAstro) {
  const a = o.atmos ?? [1, 1, 1];
  const luz = { x: -0.62, y: 0.42, z: 0.66 };                  // from the front left, a little above
  const l = Math.hypot(luz.x, luz.y, luz.z);
  const base = new Phaser.Display.BaseShader(`astro_${o.textura}`, FRAG, undefined, {
    uGiro: { type: '1f', value: 0 },
    uIncl: { type: '1f', value: (Math.min(o.inclinacao, 180 - o.inclinacao) * Math.PI) / 180 },
    uElev: { type: '1f', value: ((o.aneis ? 24 : 12) * Math.PI) / 180 },   // higher for Saturn: the rings open up
    uSol: { type: '3f', value: { x: luz.x / l, y: luz.y / l, z: luz.z / l } },
    uAtmos: { type: '3f', value: { x: a[0], y: a[1], z: a[2] } },
    uAtmosForca: { type: '1f', value: o.atmos ? o.atmosForca : 0 },
    uEstrela: { type: '1f', value: o.sol ? 1 : 0 },
    uAneis: { type: '1f', value: o.aneis ? 1 : 0 },
    uEscala: { type: '1f', value: o.aneis ? ESCALA_ANEIS : ESCALA_ASTRO },
    uNuvens: { type: '1f', value: o.nuvens ? 1 : 0 },
    uTempo: { type: '1f', value: 0 },
  });
  const s = cena.add.shader(base, x, y, lado, lado, [o.textura]);
  return Object.assign(s, {
    setGiro(rad: number) { s.setUniform('uGiro.value', rad); return s; },
    setTempo(horas: number) { s.setUniform('uTempo.value', horas); return s; },
  });
}
