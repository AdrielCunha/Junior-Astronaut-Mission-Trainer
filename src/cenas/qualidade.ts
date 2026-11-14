// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Light mode for phones and weaker computers: a smaller flight film (640 x 360, 80 frames instead
// of 1280 x 720, 120) and fewer effects. Chosen from the device, or forced with ?leve / ?hd.
import vooHD from '../dados/voo.json';
import vooLeve from '../dados/voo_leve.json';

const q = new URLSearchParams(location.search);
const nav = navigator as Navigator & { deviceMemory?: number };
const fraco = (nav.hardwareConcurrency ?? 8) <= 4 || (nav.deviceMemory ?? 8) <= 4 || matchMedia('(pointer: coarse)').matches;

export const LEVE = q.has('leve') || (!q.has('hd') && fraco);

// The flight film to use (see tools/lua3d/make_flight.py --nome).
export const VOO = LEVE ? vooLeve : vooHD;
export const PASTA_VOO = LEVE ? 'voo_leve' : 'voo';
export const quadroVoo = (i: number) => `lua/${PASTA_VOO}/f${String(i).padStart(2, '0')}.webp`;
