// Generated with AI assistance (Claude). See README, "Use of AI tools".
// The Moon drawn live by the GPU: every pixel of a square finds the point of the sphere under it,
// reads NASA's color (already reduced to the toon palette) and height there, lights it with the
// real Sun in hard bands, and draws the dark outline. Crisp at any size, turns smoothly at any
// angle. Camera, Sun and bands match tools/lua3d/make_moon.py, so it matches the Blender renders.
import Phaser from 'phaser';
import tex from '../dados/lua_tex.json';
import { VISTA } from './globo';

const FRAG = `
precision highp float;
uniform vec2 resolution;
uniform sampler2D iChannel0;   // toon albedo, equirectangular, top = north
uniform sampler2D iChannel1;   // height 0..1 -> uFaixa km
uniform vec3 uRight;
uniform vec3 uUp;
uniform vec3 uCam;
uniform vec3 uSol;
uniform float uGiro;           // radians the Moon has turned (moon-fixed -> world)
uniform float uEscala;         // the square spans 2 * uEscala Moon radii
uniform float uFaixa;          // km between height 0 and 1
uniform float uRelevo;         // relief exaggeration for the shading
varying vec2 fragCoord;

const float PI = 3.14159265;
vec3 lin(vec3 c) { return pow(c, vec3(2.2)); }
vec3 srgb(vec3 c) { return pow(c, vec3(1.0 / 2.2)); }

void main() {
  vec2 p = (fragCoord / resolution * 2.0 - 1.0) * uEscala;
  float px = 2.0 * uEscala / resolution.x;          // one pixel, in Moon radii
  float r = length(p);
  float linha = 0.022;                              // outline width (make_moon.py)
  vec3 contorno = vec3(0.090, 0.075, 0.059);
  if (r > 1.0 + linha) { gl_FragColor = vec4(0.0); return; }
  if (r > 1.0) {
    float a = clamp((1.0 + linha - r) / px, 0.0, 1.0);
    gl_FragColor = vec4(contorno * a, a);
    return;
  }
  float z = sqrt(max(0.0, 1.0 - r * r));
  vec3 nw = normalize(uRight * p.x + uUp * p.y + uCam * z);
  float c = cos(uGiro), s = sin(uGiro);
  vec3 nm = vec3(c * nw.x + s * nw.y, -s * nw.x + c * nw.y, nw.z);
  float lat = asin(clamp(nm.z, -1.0, 1.0));
  float lon = atan(nm.y, nm.x);
  vec2 uv = vec2(0.5 + lon / (2.0 * PI), 0.5 - lat / PI);
  uv.x = clamp(uv.x, 0.0005, 0.9995);
  vec3 alb = texture2D(iChannel0, uv).rgb;

  // Relief: tilt the normal by the height slope, east and north.
  vec2 dx = vec2(1.0 / 1440.0, 0.0), dy = vec2(0.0, 1.0 / 720.0);
  float hE = texture2D(iChannel1, uv + dx).r - texture2D(iChannel1, uv - dx).r;
  float hN = texture2D(iChannel1, uv - dy).r - texture2D(iChannel1, uv + dy).r;
  float arcE = 2.0 * 2.0 * PI * 1737.4 / 1440.0 * max(cos(lat), 0.05);
  float arcN = 2.0 * PI * 1737.4 / 720.0;
  float gE = hE * uFaixa / arcE * uRelevo, gN = hN * uFaixa / arcN * uRelevo;
  vec3 e = vec3(-sin(lon), cos(lon), 0.0);
  vec3 nn = vec3(-sin(lat) * cos(lon), -sin(lat) * sin(lon), cos(lat));
  vec3 m2 = normalize(nm - gE * e - gN * nn);
  vec3 n2 = vec3(c * m2.x - s * m2.y, s * m2.x + c * m2.y, m2.z);

  // Hard light bands (EEVEE sun strength 4 on a white diffuse: 4 cos / pi), same colors.
  float l = 4.0 / PI * max(dot(n2, uSol), 0.0);
  vec3 banda = l < 0.05 ? vec3(0.227, 0.208, 0.314) : l < 0.25 ? vec3(0.604, 0.561, 0.612)
             : l < 0.60 ? vec3(0.949, 0.925, 0.902) : vec3(1.0, 0.980, 0.941);
  vec3 cor = srgb(lin(alb) * lin(banda));
  // Thin dark rim inside the outline, antialiased.
  float k = clamp((1.0 - r) / px, 0.0, 1.0);
  gl_FragColor = vec4(mix(contorno, cor, k), 1.0);
}
`;

const v3 = (a: number[]) => ({ x: a[0], y: a[1], z: a[2] });
export const LADO = 512;

// Call once in preload.
export function carregarLua(cena: Phaser.Scene) {
  cena.load.image('luaAlbedo', 'lua/moon_albedo.png');
  cena.load.image('luaAltura', 'lua/moon_height.png');
}

// The live Moon: a square of LADO px covering 2 * halfExtent radii (same framing as the old
// sprite frames). setScale(width / LADO) sizes it; setGiro turns it.
export function criarLua(cena: Phaser.Scene, x: number, y: number) {
  const base = new Phaser.Display.BaseShader('luaToon', FRAG, undefined, {
    uRight: { type: '3f', value: v3(VISTA.right) },
    uUp: { type: '3f', value: v3(VISTA.up) },
    uCam: { type: '3f', value: v3(VISTA.toCamera) },
    uSol: { type: '3f', value: v3(VISTA.toSun) },
    uGiro: { type: '1f', value: 0 },
    uEscala: { type: '1f', value: VISTA.halfExtent },
    uFaixa: { type: '1f', value: tex.alturaMaxKm - tex.alturaMinKm },
    uRelevo: { type: '1f', value: 3 },
  });
  const s = cena.add.shader(base, x, y, LADO, LADO, ['luaAlbedo', 'luaAltura']);
  return Object.assign(s, {
    setGiro(graus: number) { s.setUniform('uGiro.value', (graus * Math.PI) / 180); return s; },
  });
}
