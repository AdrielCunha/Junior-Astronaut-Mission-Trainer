// Generated with AI assistance. See README, "Use of AI tools".
// A body of the solar system drawn live by the GPU, for the full-screen view (Astro): every pixel
// finds the point of the sphere under it and reads the body's surface map, baked in Blender
// (make_planetas_3d.py, equirectangular, top = north). Like the live Moon (luaShader.ts) it is
// crisp at any size and turns smoothly at any angle. Seen from a little above the equator, the
// spin axis leaning by the body's real tilt; soft day/night line and a thin atmosphere glow for
// Venus, Earth and Mars. The Sun is its own light: no shading, a darker and redder limb (limb
// darkening is real).
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
varying vec2 fragCoord;
const float PI = 3.14159265;
const float ESCALA = 1.12;     // the square spans 2 * ESCALA radii (room for the glow)

void main() {
  vec2 p = (fragCoord / resolution * 2.0 - 1.0) * ESCALA;
  float px = 2.0 * ESCALA / resolution.x;
  float r = length(p);
  // The glow of the atmosphere just outside the edge, on the sunlit side.
  float dirSol = dot(normalize(vec3(p, 0.0001)), uSol);
  float halo = uAtmosForca * pow(clamp(1.0 - (r - 1.0) / 0.07, 0.0, 1.0), 2.0) * smoothstep(-0.35, 0.5, dirSol) * 0.8;
  if (r > 1.0 + px) { gl_FragColor = vec4(uAtmos * halo, halo); return; }

  float z = sqrt(max(0.0, 1.0 - r * r));
  vec3 n = vec3(p, z);
  // View -> body: undo the lean (about the view axis), then the camera height (about screen x).
  float ci = cos(uIncl), si = sin(uIncl), ce = cos(uElev), se = sin(uElev);
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
    // Atmosphere: a haze over the day side, thicker toward the edge.
    float borda = pow(1.0 - z, 2.2) * smoothstep(-0.25, 0.45, d);
    cor = mix(cor, uAtmos, clamp(borda * uAtmosForca * 1.1, 0.0, 0.85));
    cor += uAtmos * 0.05 * uAtmosForca * dia;
  }
  float k = clamp((1.0 - r) / px, 0.0, 1.0);                     // smooth edge
  float alfa = k + (1.0 - k) * halo;
  gl_FragColor = vec4(cor * k + uAtmos * halo * (1.0 - k), alfa);
}
`;

export const ESCALA_ASTRO = 1.12;
export type OpcoesAstro = { textura: string; inclinacao: number; atmos: number[] | null; atmosForca: number; sol: boolean };

// A square of `lado` px whose disc has radius lado / (2 * ESCALA_ASTRO).
export function criarAstro(cena: Phaser.Scene, x: number, y: number, lado: number, o: OpcoesAstro) {
  const a = o.atmos ?? [1, 1, 1];
  const luz = { x: -0.62, y: 0.42, z: 0.66 };                  // from the front left, a little above
  const l = Math.hypot(luz.x, luz.y, luz.z);
  const base = new Phaser.Display.BaseShader(`astro_${o.textura}`, FRAG, undefined, {
    uGiro: { type: '1f', value: 0 },
    uIncl: { type: '1f', value: (Math.min(o.inclinacao, 180 - o.inclinacao) * Math.PI) / 180 },
    uElev: { type: '1f', value: (12 * Math.PI) / 180 },
    uSol: { type: '3f', value: { x: luz.x / l, y: luz.y / l, z: luz.z / l } },
    uAtmos: { type: '3f', value: { x: a[0], y: a[1], z: a[2] } },
    uAtmosForca: { type: '1f', value: o.atmos ? o.atmosForca : 0 },
    uEstrela: { type: '1f', value: o.sol ? 1 : 0 },
  });
  const s = cena.add.shader(base, x, y, lado, lado, [o.textura]);
  return Object.assign(s, {
    setGiro(rad: number) { s.setUniform('uGiro.value', rad); return s; },
  });
}
