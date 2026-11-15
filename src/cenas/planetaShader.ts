// Generated with AI assistance. See README, "Use of AI tools".
// Any planet drawn live by the GPU, in the toon look of the Moon (luaShader.ts): every pixel finds
// the point of the sphere under it, reads the planet's toon color map (NASA data reduced to a few
// flat colors, tools/lua3d/make_planet_textures.py), lights it with the Sun in hard bands and draws
// the dark outline. A thin atmosphere glow can be added on the lit edge (Mars's dusty haze).
//
// Frame: the planet's spin axis is +Z. The camera looks from uCam (unit vector, planet frame);
// uRight / uUp are the screen axes. The square spans 2 * ESCALA radii.
import Phaser from 'phaser';
import paleta from '../dados/paleta_lua.json';

// Same outline and light bands as the Moon (luaShader.ts), from the shared palette.
const rgbGLSL = (hex: string) => `vec3(${[1, 3, 5].map((i) => (parseInt(hex.slice(i, i + 2), 16) / 255).toFixed(6)).join(',')})`;

const FRAG = `
precision highp float;
uniform vec2 resolution;
uniform sampler2D iChannel0;   // toon color map, equirectangular, top = north
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uCam;
uniform vec3 uSol;
uniform float uGiro;           // radians the planet has turned about +Z
uniform vec3 uAtmos;           // haze color
uniform float uAtmosForca;     // 0 = no atmosphere
varying vec2 fragCoord;
const float PI = 3.14159265;
const float ESCALA = 1.12;
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 srgb(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }

void main() {
  vec2 p = (fragCoord / resolution * 2.0 - 1.0) * ESCALA;
  float px = 2.0 * ESCALA / resolution.x;
  float r = length(p);
  float linha = 0.025;
  vec3 contorno = ${rgbGLSL(paleta.contorno)};
  if (r > 1.0 + linha) { gl_FragColor = vec4(0.0); return; }
  if (r > 1.0) {
    float a = clamp((1.0 + linha - r) / px, 0.0, 1.0);
    gl_FragColor = vec4(contorno * a, a);
    return;
  }
  float z = sqrt(max(0.0, 1.0 - r * r));
  vec3 n = normalize(uRight * p.x + uUp * p.y + uCam * z);
  float c = cos(uGiro), s = sin(uGiro);
  vec3 m = vec3(c * n.x + s * n.y, -s * n.x + c * n.y, n.z);
  float lat = asin(clamp(m.z, -1.0, 1.0));
  float lon = atan(m.y, m.x);
  vec2 uv = vec2(clamp(0.5 + lon / (2.0 * PI), 0.0005, 0.9995), 0.5 - lat / PI);
  vec3 alb = texture2D(iChannel0, uv).rgb;
  float l = 4.0 / PI * max(dot(n, uSol), 0.0);
  vec3 banda = l < 0.05 ? ${rgbGLSL(paleta.luzLua[0][1] as string)} : l < 0.25 ? ${rgbGLSL(paleta.luzLua[1][1] as string)}
             : l < 0.60 ? ${rgbGLSL(paleta.luzLua[2][1] as string)} : ${rgbGLSL(paleta.luzLua[3][1] as string)};
  vec3 cor = srgb(lin(alb) * lin(banda));
  // Haze: a band along the edge, only where the Sun reaches.
  float borda = smoothstep(0.82, 1.0, r) * step(0.05, l);
  cor = mix(cor, uAtmos, borda * uAtmosForca);
  float k = clamp((1.0 - r) / px, 0.0, 1.0);
  gl_FragColor = vec4(mix(contorno, cor, k), 1.0);
}
`;

export const LADO_PLANETA = 512;
// Diameter on screen of a planet drawn at scale `escala`: the square covers 2 * 1.12 radii.
export const diametroPlaneta = (escala: number) => (LADO_PLANETA * escala) / 1.12;

type V3 = { x: number; y: number; z: number };
export type OpcoesPlaneta = { textura: string; atmos?: number; atmosForca?: number };

// The tilted solar-system camera: asin(0.6) above the ecliptic, looking from -Y (Espaco ACHATAR).
const VISTA_INCLINADA = { right: { x: 1, y: 0, z: 0 }, up: { x: 0, y: 0.6, z: 0.8 }, cam: { x: 0, y: -0.8, z: 0.6 } };

export function criarPlaneta(cena: Phaser.Scene, x: number, y: number, o: OpcoesPlaneta) {
  const a = o.atmos ?? 0xffffff;
  const base = new Phaser.Display.BaseShader(`planeta_${o.textura}`, FRAG, undefined, {
    uRight: { type: '3f', value: VISTA_INCLINADA.right },
    uUp: { type: '3f', value: VISTA_INCLINADA.up },
    uCam: { type: '3f', value: VISTA_INCLINADA.cam },
    uSol: { type: '3f', value: { x: -1, y: 0, z: 0 } },
    uGiro: { type: '1f', value: 0 },
    uAtmos: { type: '3f', value: { x: ((a >> 16) & 255) / 255, y: ((a >> 8) & 255) / 255, z: (a & 255) / 255 } },
    uAtmosForca: { type: '1f', value: o.atmosForca ?? 0 },
  });
  const s = cena.add.shader(base, x, y, LADO_PLANETA, LADO_PLANETA, [o.textura]);
  return Object.assign(s, {
    setGiro(graus: number) { s.setUniform('uGiro.value', (graus * Math.PI) / 180); return s; },
    // Sun direction on screen: (dx, dy) in screen pixels from the planet toward the Sun
    // (y down), turned into the planet frame of the tilted view.
    setSolTela(dx: number, dy: number) {
      const ex = dx, ey = -dy / 0.6;                 // undo the 0.6 squash: ecliptic x, y
      const l = Math.hypot(ex, ey) || 1;
      const v: V3 = { x: ex / l, y: ey / l, z: 0 };
      s.setUniform('uSol.value', v);
      return s;
    },
  });
}
