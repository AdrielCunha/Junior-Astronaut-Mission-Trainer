// Generated with AI assistance (Claude). See README, "Use of AI tools".
// What the player has won: astronauts (skins) and accessories (hats, glasses, faces). Kept in the browser
// apart from the save, like the unlocked bases (salvamento.ts), so losing or starting over does not take
// them away. Storage is optional. Open the game with ?liberar to see everything unlocked (preview).
import { ACESSORIOS } from './dados/acessorios.ts';
import { SKINS } from './dados/skins.ts';

const CHAVE = 'lunar-odyssey-acessorios-v1';
const CHAVE_SKINS = 'lunar-odyssey-astronautas-v1';
const liberarTudo = () => { try { return new URLSearchParams(location.search).has('liberar'); } catch { return false; } };

function lerLista(chave: string, validos: string[]): string[] {
  try {
    const v: unknown = JSON.parse(localStorage.getItem(chave) ?? '[]');
    return Array.isArray(v) ? validos.filter((id) => v.includes(id)) : [];
  } catch { return []; }
}
function ganhar(chave: string, validos: string[], id: string): boolean {
  if (!validos.includes(id)) return false;
  const ja = lerLista(chave, validos);
  if (ja.includes(id)) return false;
  try { localStorage.setItem(chave, JSON.stringify([...ja, id])); } catch { /* Storage is optional. */ }
  return true;
}

const idsAcessorios = ACESSORIOS.map((a) => a.id);
const idsSkins = SKINS.map((s) => s.id);
const livres = SKINS.filter((s) => !s.premio).map((s) => s.id);

export const acessoriosGanhos = (): string[] => liberarTudo() ? idsAcessorios : lerLista(CHAVE, idsAcessorios);
export const ganharAcessorio = (id: string) => ganhar(CHAVE, idsAcessorios, id);

// Astronauts you can wear: the free ones and the ones won.
export const skinsGanhas = (): string[] => liberarTudo() ? idsSkins : [...livres, ...lerLista(CHAVE_SKINS, idsSkins)].filter((id, i, l) => l.indexOf(id) === i);
export const ganharSkin = (id: string) => ganhar(CHAVE_SKINS, idsSkins.filter((x) => !livres.includes(x)), id);
export const skinsDisponiveis = () => SKINS.filter((s) => skinsGanhas().includes(s.id));

// The first cosmetic prize also teaches how to change clothes; shown only once.
const CHAVE_DICA = 'lunar-odyssey-dica-chapeu-v1';
export function dicaDeTrocaVista(): boolean {
  try { return localStorage.getItem(CHAVE_DICA) === '1'; } catch { return true; }
}
export function marcarDicaDeTroca() {
  try { localStorage.setItem(CHAVE_DICA, '1'); } catch { /* Storage is optional. */ }
}

// A new item is waiting in the wardrobe: an icon shows over the Habitat until the wardrobe is opened.
const CHAVE_NOVIDADE = 'lunar-odyssey-guardaroupa-novo-v1';
let novidade: boolean | null = null;   // read every frame by the map, so the storage is read once
export function temNovidade(): boolean {
  if (novidade === null) { try { novidade = localStorage.getItem(CHAVE_NOVIDADE) === '1'; } catch { novidade = false; } }
  return novidade;
}
export function marcarNovidade(v: boolean) {
  novidade = v;
  try { if (v) localStorage.setItem(CHAVE_NOVIDADE, '1'); else localStorage.removeItem(CHAVE_NOVIDADE); } catch { /* Storage is optional. */ }
}
