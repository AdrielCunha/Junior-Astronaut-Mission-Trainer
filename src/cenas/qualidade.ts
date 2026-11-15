// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Light mode for phones and weaker computers: a smaller flight film (640 x 360, 80 frames instead
// of 1280 x 720, 120) and fewer effects. Chosen from the device, or forced with ?leve / ?hd.
import { video } from '../video';
import vooHD from '../dados/voo.json';
import vooLeve from '../dados/voo_leve.json';
import vooHDMarte from '../dados/voo_marte.json';
import vooLeveMarte from '../dados/voo_leve_marte.json';

const q = new URLSearchParams(location.search);
const nav = navigator as Navigator & { deviceMemory?: number };
const fraco = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || matchMedia('(pointer: coarse)').matches;

export const LEVE = q.has('leve') || (!q.has('hd') && (video.qualidade === 'leve' || (video.qualidade === 'auto' && fraco)));

// The flight film of the world being played (see tools/lua3d/make_flight.py and
// make_flight_marte.py, --nome): the Moon's, or Mars's. Both start on the map at the same scale
// and end on the live globe, so the same flight code plays either. These are live bindings:
// usarFilme (called by sessao.usarMundo) switches them for every importer.
export type Filme = Omit<typeof vooHD, 'dia'> & { dia?: number };
export let VOO: Filme = LEVE ? vooLeve : vooHD;
export let CHAVE_VOO = 'voo';               // texture keys: CHAVE_VOO + frame index
let pastaVoo = `lua/${LEVE ? 'voo_leve' : 'voo'}`;
export const quadroVoo = (i: number) => `${pastaVoo}/f${String(i).padStart(2, '0')}.webp`;
export function usarFilme(mundo: string) {
  const marte = mundo === 'marte';
  VOO = marte ? (LEVE ? vooLeveMarte : vooHDMarte) : LEVE ? vooLeve : vooHD;
  CHAVE_VOO = marte ? 'vooMarte' : 'voo';
  pastaVoo = `${marte ? 'marte' : 'lua'}/${LEVE ? 'voo_leve' : 'voo'}`;
}
