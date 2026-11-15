// Generated with AI assistance (Claude). See README, "Use of AI tools".
// The paint colors the player has won and the color chosen for each module. Kept in the browser apart from
// the save, like the hats (acessorios.ts); storage is optional. A module is identified by world and type, so
// the choice survives layout changes and new games.
import { CORES_BASE } from './dados/cores';

const CHAVE = 'lunar-odyssey-cores-v1';
type Dados = { ganhas: string[]; escolhas: Record<string, string> };

let cache: Dados | null = null;   // read often (every module redraw), so parse the storage only once
function ler(): Dados {
  if (cache) return cache;
  try {
    const v = JSON.parse(localStorage.getItem(CHAVE) ?? '{}');
    const ganhas = Array.isArray(v.ganhas) ? CORES_BASE.map((c) => c.id).filter((id) => v.ganhas.includes(id)) : [];
    const escolhas: Record<string, string> = {};
    if (v.escolhas && typeof v.escolhas === 'object') for (const [k, id] of Object.entries(v.escolhas)) if (typeof id === 'string' && ganhas.includes(id)) escolhas[k] = id;
    return (cache = { ganhas, escolhas });
  } catch { return (cache = { ganhas: [], escolhas: {} }); }
}
const gravar = (d: Dados) => { cache = d; try { localStorage.setItem(CHAVE, JSON.stringify(d)); } catch { /* Storage is optional. */ } };

export const coresGanhas = () => ler().ganhas;
export const corDoModulo = (mundo: string, tipo: string): string => ler().escolhas[`${mundo}:${tipo}`] ?? '';

// True when it is new to the player.
export function ganharCor(id: string): boolean {
  if (!CORES_BASE.some((c) => c.id === id)) return false;
  const d = ler();
  if (d.ganhas.includes(id)) return false;
  gravar({ ...d, ganhas: [...d.ganhas, id] });
  return true;
}

export function pintarModulo(mundo: string, tipo: string, cor: string) {
  const d = ler(), k = `${mundo}:${tipo}`;
  if (cor) d.escolhas[k] = cor; else delete d.escolhas[k];
  gravar(d);
}

// The first color won also teaches how to paint; shown only once.
const CHAVE_DICA = 'lunar-odyssey-dica-tinta-v1';
export function dicaDeTintaVista(): boolean {
  try { return localStorage.getItem(CHAVE_DICA) === '1'; } catch { return true; }
}
export function marcarDicaDeTinta() {
  try { localStorage.setItem(CHAVE_DICA, '1'); } catch { /* Storage is optional. */ }
}
