// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Downloads the Blender flight frames in the background, a few at a time, decodes them OFF the
// main thread (createImageBitmap, already premultiplied, the way Phaser draws), and keeps them in
// memory. They become GPU textures only via garantirQuadro: Espaco trickles them up one at a time
// while the player is on the ground, and just in time during the flight.
// Measured with tools/dev/medir_desempenho.mjs: an <img> upload made the browser premultiply and
// convert every 1434 x 806 frame on the main thread (~100 ms each, texImage2D ~90% of the frame);
// a premultiplied ImageBitmap goes to the GPU as a plain copy. Kept outside any scene on purpose: a resize restarts Espaco, and a
// scene-owned loader would either start the same frames twice ("Texture key already in use") or
// drop the ones still in flight. Decoding here, two at a time, also avoids the stutter of decoding
// 120 large images at once while the player walks around the base.
import type Phaser from 'phaser';
import { VOO as voo, quadroVoo } from './qualidade';
import { sessao } from './sessao';

const POR_VEZ = 2;
const TENTATIVAS = 3;
let comecou = false;
type Fonte = HTMLImageElement | ImageBitmap;
const prontas = new Map<number, Fonte>();   // decoded, not yet on the GPU

// Next frame that is decoded but not yet on the GPU (Espaco trickles them up on the ground).
export const proximoPendente = () => (prontas.size ? Math.min(...prontas.keys()) : -1);

// Makes frame i a texture if it has been downloaded. Returns whether it can be drawn.
export function garantirQuadro(texturas: Phaser.Textures.TextureManager, i: number) {
  const chave = `voo${i}`;
  if (texturas.exists(chave)) return true;
  const img = prontas.get(i);
  if (!img) return false;
  texturas.addImage(chave, img as HTMLImageElement);   // Phaser uploads any TexImageSource
  prontas.delete(i);
  return true;
}

export function carregarFilme(texturas: Phaser.Textures.TextureManager) {
  if (comecou) return;
  comecou = true;

  const faltam = Array.from({ length: voo.quadros }, (_, i) => i).filter((i) => !texturas.exists(`voo${i}`) && !prontas.has(i));
  if (!faltam.length) { sessao.filmePronto = true; return; }

  let proximo = 0, ativos = 0;
  const tentativas = new Map<number, number>();
  const terminar = () => { if (proximo >= faltam.length && ativos === 0) sessao.filmePronto = true; };

  // Decode one frame: off the main thread when the browser can (ImageBitmap), else an <img>.
  const decodificar = async (url: string): Promise<Fonte> => {
    if (typeof createImageBitmap === 'function') {
      const r = await fetch(url);
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return createImageBitmap(await r.blob(), { premultiplyAlpha: 'premultiply' });
    }
    const img = new Image();
    img.decoding = 'async';
    img.src = url;
    await img.decode();
    return img;
  };

  const puxar = () => {
    while (ativos < POR_VEZ && proximo < faltam.length) {
      const i = faltam[proximo++];
      ativos++;
      decodificar(quadroVoo(i)).then((fonte) => {
        if (!texturas.exists(`voo${i}`)) prontas.set(i, fonte);
      }, () => {
        const n = (tentativas.get(i) ?? 0) + 1;
        tentativas.set(i, n);
        if (n < TENTATIVAS) {
          faltam.push(i);          // try this frame again after the others
        } else {
          sessao.filmeFalhou = true;
          console.error(`Falha ao baixar o quadro ${i} do voo após ${n} tentativas: ${quadroVoo(i)}`);
        }
      }).finally(() => {
        ativos--;
        terminar();
        puxar();
      });
    }
  };
  puxar();
}
