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
};

export function carregarRover(load: Phaser.Loader.LoaderPlugin) {
  roverLrv.corpo.forEach((q, k) => load.image(`lrv_${k}`, q.arquivo));
  roverLrv.frente.forEach((q, k) => load.image(`lrv_frente_${k}`, q.arquivo));
}

// Heading picture for a grid angle (0 = +gx, turning toward +gy, like Rover.angulo).
export const direcaoRover = (angulo: number) => {
  const n = roverLrv.direcoes;
  return ((Math.round(angulo / (2 * Math.PI / n)) % n) + n) % n;
};

export function desenharRover(g: Phaser.GameObjects.Graphics, p: Projecao, r: Rover, pecas: PecasRover, carregado = true, instalando = false) {
  const k = r.corpo, co = Math.cos(r.angulo), si = Math.sin(r.angulo);
  const q = (x: number, y: number, z: number) => paraTela(p, k.x + x * co - y * si, k.y + x * si + y * co, k.z + z);
  const prof = profundidade(k.x + 0.7, k.y + 0.7);
  const solo = q(0, 0, 0), d = direcaoRover(r.angulo);
  pecas.sombra.setPosition(solo.x, solo.y + 3).setDepth(prof - 0.02).setVisible(true);
  for (const [img, parte, chave, dz] of [[pecas.corpo, roverLrv.corpo, 'lrv_', 0], [pecas.frente, roverLrv.frente, 'lrv_frente_', 0.2]] as const) {
    const quadro = parte[d];
    if (!img.visible || img.texture.key !== `${chave}${d}`) {
      img.setTexture(`${chave}${d}`).setOrigin(quadro.ancora[0] / quadro.w, quadro.ancora[1] / quadro.h)
        .setScale(roverLrv.escala);
    }
    img.setPosition(solo.x, solo.y).setDepth(prof + dz).setVisible(true);
  }
  g.clear().setDepth(prof + 0.05);
  // Battery status light on the front blankets: green charged, yellow installing, grey empty.
  const led = q(0.66, 0.14, 0.45);
  g.fillStyle(instalando ? 0xfddd45 : carregado ? 0x4ade80 : 0x475569).fillCircle(led.x, led.y, 3.2)
    .lineStyle(1.2, 0x14243e).strokeCircle(led.x, led.y, 3.2);
}

export function esconderRover(g: Phaser.GameObjects.Graphics, pecas: PecasRover) {
  g.clear();
  pecas.sombra.setVisible(false); pecas.corpo.setVisible(false); pecas.frente.setVisible(false);
}
