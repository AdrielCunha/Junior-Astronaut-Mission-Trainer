import type Phaser from 'phaser';
import { paraTela, profundidade, type Projecao } from '../engine/iso';
import type { Rover } from '../engine/rover';
import roverLrv from '../dados/rover_lrv.json';

// Original sprite's hip line: keep the helmet, torso, arms and backpack intact.
export const LINHA_QUADRIL_SENTADO = 128;

// The Apollo LRV: pictures rendered from a 3D model in the props' cartoon style
// (tools/lua3d/make_lrv.py), 16 headings, each in two layers: the body (chassis, wheels, seats)
// behind the seated astronaut and the front (hand controller, dish antenna, TV camera) before it.
// Drawn here on top of the body: the battery status light. The driver is the astronaut's own
// seated sheet (make_astronaut.py SENTADO=1), drawn by Superficie between the body and the front.
export type PecasRover = {
  sombra: Phaser.GameObjects.Ellipse;
  corpo: Phaser.GameObjects.Image;
  frente: Phaser.GameObjects.Image;
  poeira?: Phaser.GameObjects.Graphics;      // dust kicked up by the rear wheels
};

type Quadro = { arquivo: string; w: number; h: number; ancora: number[] };
const GIRO = (roverLrv as unknown as { giro?: Quadro[][] }).giro ?? [];
const FASES = GIRO.length + 1;                // wheel phases, 15 degrees apart (make_lrv.py)
const PASSO_FASE = Math.PI / 2 / FASES;       // the wheel's pattern repeats every 90 degrees
const RAIO_RODA = 0.25;                       // tiles

export function carregarRover(load: Phaser.Loader.LoaderPlugin) {
  roverLrv.corpo.forEach((q, k) => load.image(`lrv_${k}`, q.arquivo));
  roverLrv.frente.forEach((q, k) => load.image(`lrv_frente_${k}`, q.arquivo));
  GIRO.forEach((fase, f) => fase.forEach((q, k) => load.image(`lrv_g${f + 1}_${k}`, q.arquivo)));
}

// What the drawing remembers of each rover between frames: the wheels' shown angle (it follows
// the distance rolled, but at most a little under one phase a frame, so fast driving never
// strobes backward) and the dust puffs.
type Puff = { x: number; y: number; z: number; vx: number; vy: number; vz: number; t: number; vida: number; r: number };
const estado = new WeakMap<Rover, { roda: number; rodado: number; puffs: Puff[]; emitir: number }>();
const de = (r: Rover) => {
  let e = estado.get(r);
  if (!e) estado.set(r, (e = { roda: 0, rodado: r.rodado ?? 0, puffs: [], emitir: 0 }));
  return e;
};

// The suspension: a small bounce while rolling (px, upward), from the ground it has rolled over.
// The driver reads it too, so it rides the same bumps (Superficie).
export function saltoRover(r: Rover) {
  const v = Math.hypot(r.corpo.vx, r.corpo.vy), d = r.rodado ?? 0;
  const lomba = 0.5 + 0.5 * (0.6 * Math.sin(d * 9.1) + 0.4 * Math.sin(d * 4.3 + 1.2));
  return 2.2 * Math.min(1, v / 4) * lomba;
}

// Heading picture for a grid angle (0 = +gx, turning toward +gy, like Rover.angulo).
export const direcaoRover = (angulo: number) => {
  const n = roverLrv.direcoes;
  return ((Math.round(angulo / (2 * Math.PI / n)) % n) + n) % n;
};

export function desenharRover(g: Phaser.GameObjects.Graphics, p: Projecao, r: Rover, pecas: PecasRover, carregado = true, instalando = false,
  dt = 0, corPoeira = 0xc8ccd6, lento = false) {
  const k = r.corpo, co = Math.cos(r.angulo), si = Math.sin(r.angulo);
  const q = (x: number, y: number, z: number) => paraTela(p, k.x + x * co - y * si, k.y + x * si + y * co, k.z + z);
  const prof = profundidade(k.x + 0.7, k.y + 0.7);
  const solo = q(0, 0, 0), d = direcaoRover(r.angulo);
  const e = de(r);
  // Wheels: the shown angle catches up with the distance rolled, at most 0.8 phase a frame.
  const rodado = r.rodado ?? 0;
  if (!lento) e.roda += Math.min((rodado - e.rodado) / RAIO_RODA, 0.8 * PASSO_FASE);
  e.rodado = rodado;
  const fase = ((Math.floor(e.roda / PASSO_FASE) % FASES) + FASES) % FASES;
  const salto = lento ? 0 : saltoRover(r);
  pecas.sombra.setPosition(solo.x, solo.y + 3).setDepth(prof - 0.02).setVisible(true).setScale(1 - salto * 0.03);
  for (const [img, parte, chave, dz] of [[pecas.corpo, roverLrv.corpo, 'lrv_', 0], [pecas.frente, roverLrv.frente, 'lrv_frente_', 0.2]] as const) {
    const giro = img === pecas.corpo && fase > 0 ? GIRO[fase - 1]?.[d] : undefined;
    const quadro = giro ?? parte[d], chaveQuadro = giro ? `lrv_g${fase}_${d}` : `${chave}${d}`;
    // Only touch the texture when the picture changes (main: fewer uploads on long drives).
    if (!img.visible || img.texture.key !== chaveQuadro) {
      img.setTexture(chaveQuadro).setOrigin(quadro.ancora[0] / quadro.w, quadro.ancora[1] / quadro.h)
        .setScale(roverLrv.escala);
    }
    img.setPosition(solo.x, solo.y - salto).setDepth(prof + dz).setVisible(true);
  }
  g.clear().setDepth(prof + 0.05);
  poeira(pecas.poeira, p, r, e, dt, corPoeira, prof, lento);
  // Battery status light on the front blankets: green charged, yellow installing, grey empty.
  const led = q(0.66, 0.14, 0.45 + salto / Math.abs(p.ez[1] || 36));
  g.fillStyle(instalando ? 0xfddd45 : carregado ? 0x4ade80 : 0x475569).fillCircle(led.x, led.y, 3.2)
    .lineStyle(1.2, 0x14243e).strokeCircle(led.x, led.y, 3.2);
}

// Dust from the rear wheels: soft puffs thrown back and up that drift down slowly (low gravity)
// as they grow and fade. Only while rolling at a good pace; none with reduced motion.
function poeira(gr: Phaser.GameObjects.Graphics | undefined, p: Projecao, r: Rover, e: { puffs: Puff[]; emitir: number }, dt: number,
  cor: number, prof: number, lento: boolean) {
  if (!gr) return;
  gr.clear().setDepth(prof - 0.015);
  const k = r.corpo, v = Math.hypot(k.vx, k.vy);
  if (!lento && v > 1.2 && dt > 0) {
    e.emitir += dt * v * 3.2;
    const co = Math.cos(r.angulo), si = Math.sin(r.angulo);
    while (e.emitir >= 1) {
      e.emitir -= 1;
      const lado = Math.random() < 0.5 ? -0.5 : 0.5;
      e.puffs.push({ x: k.x - 0.62 * co - lado * si, y: k.y - 0.62 * si + lado * co, z: k.z + 0.04,
        vx: -k.vx * 0.12 + (Math.random() - 0.5) * 0.4, vy: -k.vy * 0.12 + (Math.random() - 0.5) * 0.4, vz: 0.35 + Math.random() * 0.35,
        t: 0, vida: 0.9 + Math.random() * 0.5, r: 1.6 + Math.random() * 1.4 });
    }
  }
  if (e.puffs.length > 60) e.puffs.splice(0, e.puffs.length - 60);
  e.puffs = e.puffs.filter((f) => (f.t += dt) < f.vida);
  for (const f of e.puffs) {
    f.x += f.vx * dt; f.y += f.vy * dt; f.vz -= 0.55 * dt; f.z = Math.max(k.z - 0.05, f.z + f.vz * dt);
    const s = f.t / f.vida, c = paraTela(p, f.x, f.y, f.z);
    gr.fillStyle(cor, 0.42 * (1 - s) * Math.min(1, f.t * 8)).fillCircle(c.x, c.y, f.r + 5 * s);
  }
}

export function esconderRover(g: Phaser.GameObjects.Graphics, pecas: PecasRover) {
  g.clear(); pecas.poeira?.clear();
  pecas.sombra.setVisible(false); pecas.corpo.setVisible(false); pecas.frente.setVisible(false);
}
