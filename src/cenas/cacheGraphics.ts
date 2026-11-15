// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Phaser 3 re-triangulates every Graphics object on every frame (earcut + new vertex buffers),
// even when its drawing never changes. The HUD is built from dozens of such static shapes
// (rounded pills, rings, bars), and that alone took most of the frame on weak devices.
//
// This cache turns a Graphics that stays the same for a few frames into a texture, drawn once
// with the canvas renderer, and renders it as a plain image (one quad) from then on. As soon as
// it is cleared or drawn on again it goes back to live drawing, and it is baked again once it
// settles. Shapes redrawn every frame (bars, timers) are never baked.
//
// Only for screen-space scenes (camera zoom 1): a baked texture would blur under a map zoom.
// Turn it on per scene with ativarCacheGraphics(scene).
import Phaser from 'phaser';

// Phaser's Graphics command codes (src/gameobjects/graphics/Commands.js) and argument counts.
const ARC = 0, BEGIN_PATH = 1, CLOSE_PATH = 2, FILL_RECT = 3, LINE_TO = 4, MOVE_TO = 5, LINE_STYLE = 6,
  FILL_STYLE = 7, FILL_PATH = 8, STROKE_PATH = 9, FILL_TRIANGLE = 10, STROKE_TRIANGLE = 11,
  SAVE = 14, RESTORE = 15, TRANSLATE = 16;

const ESTAVEL = 3;          // frames unchanged before baking
const MIN_COMANDOS = 12;    // tiny drawings are cheap live: not worth a texture
const MAX_LADO = 2048;
// Baked at twice the screen size: the canvas renderer's antialiasing softened thin 1-2 px
// outlines at 1x (white rims came out grey). The image is drawn at half scale.
const RES = 2;
const MAX_REFEITOS = 3;     // re-bakes less than 1 s apart before giving up on an object

type Cache = {
  tamanho: number; estavel: number;
  img: Phaser.GameObjects.Image | null; chave: string;
  refeitos: number; ultimoAssado: number;
  desistiu: boolean; ouvindo: boolean;
};
type GraphicsCache = Phaser.GameObjects.Graphics & { __cache?: Cache };
type CenaCache = Phaser.Scene & { __cacheGraphics?: boolean };

let instalado = false;
let seq = 0;

// ?semcache turns it off, to compare frame times and looks (tools/dev/medir_nave.mjs).
const DESLIGADO = typeof location !== 'undefined' && new URLSearchParams(location.search).has('semcache');

export function ativarCacheGraphics(cena: Phaser.Scene) {
  if (DESLIGADO) return;
  (cena as CenaCache).__cacheGraphics = true;
  if (instalado) return;
  instalado = true;
  const P = Phaser.GameObjects.Graphics.prototype as unknown as {
    renderWebGL: (this: GraphicsCache, renderer: unknown, src: GraphicsCache, camera: Phaser.Cameras.Scene2D.Camera, matriz: unknown) => void;
    clear: (this: GraphicsCache) => Phaser.GameObjects.Graphics;
  };
  const desenhar = P.renderWebGL;
  const limpar = P.clear;

  P.renderWebGL = function (this: GraphicsCache, renderer: unknown, src: GraphicsCache, camera: Phaser.Cameras.Scene2D.Camera, matriz: unknown) {
    const cena = src.scene as CenaCache | undefined;
    if (!cena?.__cacheGraphics || camera.zoom !== 1) {
      if (src.__cache?.img) descartar(src.__cache);
      desenhar.call(this, renderer, src, camera, matriz);
      return;
    }
    const c = src.__cache ??= { tamanho: -1, estavel: 0, img: null, chave: '', refeitos: 0, ultimoAssado: 0, desistiu: false, ouvindo: false };
    const n = src.commandBuffer.length;
    if (c.img && n !== c.tamanho) descartar(c);           // drawn on without a clear
    if (!c.img && !c.desistiu) {
      if (n === c.tamanho) c.estavel++; else { c.tamanho = n; c.estavel = 0; }
      if (c.estavel >= ESTAVEL && n >= MIN_COMANDOS) assar(src, c);
    }
    if (c.img) {
      const img = c.img;
      img.x = src.x; img.y = src.y;
      img.rotation = src.rotation; img.scaleX = src.scaleX / RES; img.scaleY = src.scaleY / RES;
      img.alpha = src.alpha; img.blendMode = src.blendMode;
      img.scrollFactorX = src.scrollFactorX; img.scrollFactorY = src.scrollFactorY;
      (img as unknown as { renderWebGL: (...a: unknown[]) => void }).renderWebGL(renderer, img, camera, matriz);
      return;
    }
    desenhar.call(this, renderer, src, camera, matriz);
  };

  // A clear means the drawing is about to change: back to live drawing until it settles.
  P.clear = function (this: GraphicsCache) {
    const c = this.__cache;
    if (c) {
      if (c.img) descartar(c);
      c.tamanho = -1; c.estavel = 0;
    }
    return limpar.call(this);
  };
}

function descartar(c: Cache) {
  const img = c.img!;
  c.img = null;
  const tex = img.scene?.sys.textures;
  img.destroy();
  if (tex?.exists(c.chave)) tex.remove(c.chave);
}

// The drawing's extent in its own coordinates, or null when it uses something we cannot bake
// (scale/rotate commands, gradients, which the canvas renderer does not draw).
function limites(cmd: number[]) {
  let x0 = Infinity, y0 = Infinity, x1 = -Infinity, y1 = -Infinity;
  let meia = 0, tx = 0, ty = 0;
  const pilha: [number, number][] = [];
  const ponto = (x: number, y: number, r = 0) => {
    const m = r + meia;
    x += tx; y += ty;
    if (x - m < x0) x0 = x - m; if (y - m < y0) y0 = y - m;
    if (x + m > x1) x1 = x + m; if (y + m > y1) y1 = y + m;
  };
  for (let i = 0; i < cmd.length;) {
    switch (cmd[i]) {
      case ARC: ponto(cmd[i + 1], cmd[i + 2], cmd[i + 3]); i += 8; break;
      case FILL_RECT: ponto(cmd[i + 1], cmd[i + 2]); ponto(cmd[i + 1] + cmd[i + 3], cmd[i + 2] + cmd[i + 4]); i += 5; break;
      case LINE_TO: case MOVE_TO: ponto(cmd[i + 1], cmd[i + 2]); i += 3; break;
      case LINE_STYLE: meia = cmd[i + 1] / 2; i += 4; break;
      case FILL_STYLE: i += 3; break;
      case FILL_TRIANGLE: case STROKE_TRIANGLE:
        ponto(cmd[i + 1], cmd[i + 2]); ponto(cmd[i + 3], cmd[i + 4]); ponto(cmd[i + 5], cmd[i + 6]); i += 7; break;
      case BEGIN_PATH: case CLOSE_PATH: case FILL_PATH: case STROKE_PATH: i += 1; break;
      case SAVE: pilha.push([tx, ty]); i += 1; break;
      case RESTORE: [tx, ty] = pilha.pop() ?? [0, 0]; i += 1; break;
      case TRANSLATE: tx += cmd[i + 1]; ty += cmd[i + 2]; i += 3; break;
      default: return null;
    }
  }
  if (!Number.isFinite(x0)) return null;
  // A pixel of margin for the canvas antialiasing.
  return { x: Math.floor(x0) - 1, y: Math.floor(y0) - 1, w: Math.ceil(x1 - x0) + 3, h: Math.ceil(y1 - y0) + 3 };
}

function assar(src: GraphicsCache, c: Cache) {
  const agora = performance.now();
  if (agora - c.ultimoAssado < 1000) { if (++c.refeitos > MAX_REFEITOS) { c.desistiu = true; return; } } else c.refeitos = 0;
  const b = limites(src.commandBuffer as number[]);
  if (!b || b.w * RES > MAX_LADO || b.h * RES > MAX_LADO) { c.desistiu = true; return; }
  const cena = src.scene;
  c.chave = `__gcache_${seq++}`;
  // A clean copy at the origin (generateTexture would also apply the object's own transform),
  // shifted so the drawing's top-left corner lands at the texture's (0, 0).
  const tmp = cena.make.graphics({}, false).scaleCanvas(RES, RES).translateCanvas(-b.x, -b.y);
  const destino = (tmp as unknown as { commandBuffer: number[] }).commandBuffer;
  for (const v of src.commandBuffer as number[]) destino.push(v);
  tmp.generateTexture(c.chave, b.w * RES, b.h * RES);
  tmp.destroy();
  // The image's origin sits where the Graphics' origin is, so position, scale and rotation match.
  c.img = cena.make.image({ key: c.chave }, false).setOrigin(-b.x / b.w, -b.y / b.h);
  c.ultimoAssado = agora;
  if (!c.ouvindo) { c.ouvindo = true; src.once('destroy', () => { if (c.img) descartar(c); }); }
}
