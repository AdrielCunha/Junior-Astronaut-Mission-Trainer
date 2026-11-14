// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Downloads the Blender flight frames in the background, a few at a time, and hands them to the
// shared texture manager. Kept outside any scene on purpose: a resize restarts Espaco, and a
// scene-owned loader would either start the same frames twice ("Texture key already in use") or
// drop the ones still in flight. Decoding here, two at a time, also avoids the stutter of decoding
// 120 large images at once while the player walks around the base.
import type Phaser from 'phaser';
import { VOO as voo, quadroVoo } from './qualidade';
import { sessao } from './sessao';

const POR_VEZ = 2;
const TENTATIVAS = 3;
let comecou = false;

export function carregarFilme(texturas: Phaser.Textures.TextureManager) {
  if (comecou) return;
  comecou = true;

  const faltam = Array.from({ length: voo.quadros }, (_, i) => i).filter((i) => !texturas.exists(`voo${i}`));
  if (!faltam.length) { sessao.filmePronto = true; return; }

  let proximo = 0, ativos = 0;
  const tentativas = new Map<number, number>();
  const terminar = () => { if (proximo >= faltam.length && ativos === 0) sessao.filmePronto = true; };

  const puxar = () => {
    while (ativos < POR_VEZ && proximo < faltam.length) {
      const i = faltam[proximo++];
      ativos++;
      const img = new Image();
      img.decoding = 'async';
      let feito = false;
      const entregar = () => {
        if (feito) return;
        feito = true;
        if (!texturas.exists(`voo${i}`)) texturas.addImage(`voo${i}`, img);
        ativos--;
        terminar();
        puxar();
      };
      img.onload = () => {
        const d = img.decode?.();
        if (d) d.then(entregar, entregar); else entregar();
      };
      img.onerror = () => {
        if (feito) return;
        feito = true;
        console.error(`Failed to load flight frame ${i}: ${quadroVoo(i)}`);
        ativos--;
        const n = (tentativas.get(i) ?? 0) + 1;
        tentativas.set(i, n);
        if (n < TENTATIVAS) {
          faltam.push(i);          // try this frame again after the others
        } else {
          sessao.filmeFalhou = true;
          console.error(`Falha ao baixar o quadro ${i} do voo após ${n} tentativas: ${quadroVoo(i)}`);
        }
        terminar();
        puxar();
      };
      img.src = quadroVoo(i);
    }
  };
  puxar();
}
