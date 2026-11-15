// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Astronaut skins: same model and animation, different looks (tools/lua3d/make_astronaut.py,
// SKIN=<id>). Every sheet shares the frame size and feet anchor of astronauta.json. Explorer 3D is an
// articulated procedural model (src/astronauta) drawn over the commander's sheets as fallback.
export type Skin = { id: string; nome: string; arquivo: string; cor: string; traje: string; botas: string; premio?: boolean; animacao?: 'procedural'; base?: string };   // premio: won in side missions (acessorios.ts), not free

export const SKINS: Skin[] = [
  // Page "Astronauts": 12 different characters (same skeleton and walk, own look: ears, tails, horns...).
  // The commander is free; the others are prizes of side missions (engine/presentes.ts). The sheets come
  // from tools/lua3d/make_astronaut.py (SKIN=<id>) and personagens_extra.py.
  { id: 'comandante', nome: 'Commander', arquivo: 'lua/astronaut.png', cor: '#f97316', traje: '#e2e8f0', botas: '#334155' },
  { id: 'robo', nome: 'Robo-Bot', arquivo: 'lua/astronaut_robo.png', cor: '#38bdf8', traje: '#cbd5e1', botas: '#475569', premio: true },
  { id: 'alien', nome: 'Little Green', arquivo: 'lua/astronaut_alien.png', cor: '#a855f7', traje: '#bbf7d0', botas: '#166534', premio: true },
  { id: 'gato', nome: 'Space Kitty', arquivo: 'lua/astronaut_gato.png', cor: '#ea580c', traje: '#fed7aa', botas: '#7c2d12', premio: true },
  { id: 'urso', nome: 'Teddy Bear', arquivo: 'lua/astronaut_urso.png', cor: '#92400e', traje: '#d6b48a', botas: '#78350f', premio: true },
  { id: 'coelho', nome: 'Bunny', arquivo: 'lua/astronaut_coelho.png', cor: '#ec4899', traje: '#fce7f3', botas: '#9d174d', premio: true },
  { id: 'cachorro', nome: 'Puppy', arquivo: 'lua/astronaut_cachorro.png', cor: '#b45309', traje: '#fde68a', botas: '#78350f', premio: true },
  { id: 'pinguim', nome: 'Penguin', arquivo: 'lua/astronaut_pinguim.png', cor: '#f97316', traje: '#bfdbfe', botas: '#1e3a8a', premio: true },
  { id: 'dino', nome: 'Dino', arquivo: 'lua/astronaut_dino.png', cor: '#facc15', traje: '#bbf7d0', botas: '#14532d', premio: true },
  { id: 'raposa', nome: 'Fox', arquivo: 'lua/astronaut_raposa.png', cor: '#fb923c', traje: '#fdba74', botas: '#7c2d12', premio: true },
  { id: 'unicornio', nome: 'Unicorn', arquivo: 'lua/astronaut_unicornio.png', cor: '#e879f9', traje: '#f5d0fe', botas: '#6b21a8', premio: true },
  { id: 'panda', nome: 'Panda', arquivo: 'lua/astronaut_panda.png', cor: '#64748b', traje: '#f1f5f9', botas: '#475569', premio: true },
  { id: 'procedural', nome: 'Explorer 3D', arquivo: 'lua/astronaut.png', cor: '#67e8f9', traje: '#e2e8f0', botas: '#334155', animacao: 'procedural', base: 'comandante' },
];

export const SKIN_PADRAO = SKINS[0].id;
// Skins with their own sprite sheets; the procedural one reuses the commander's as fallback.
export const SKINS_SPRITES = SKINS.filter(s=>s.animacao!=='procedural');
export const skinUsaProcedural = (id: string) => SKINS.some(s=>s.id===id&&s.animacao==='procedural');
export function skinBase(id: string): Skin {
  const skin=SKINS.find(s=>s.id===id)??SKINS[0];
  return skin.base ? SKINS_SPRITES.find(s=>s.id===skin.base)??SKINS[0] : skin;
}
export const chaveSkin = (id: string) => `astronauta_${skinBase(id).id}`;
// The same astronaut seated on the Apollo LRV, legs straight forward (make_astronaut.py SENTADO=1):
// one column, 16 directions (like the rover's headings), the walk sheet's frame, as <file>_sentado.png.
export const chaveSkinSentado = (id: string) => `${chaveSkin(id)}_sentado`;
export const arquivoSentado = (arquivo: string) => arquivo.replace(/\.png$/, '_sentado.png');

// Carrying sheets include both forward arms and the battery, with the same 8 x 9 frames.
export const chaveSkinCarga = (id: string) => `${chaveSkin(id)}_carga`;
export const arquivoSkinCarga = (id: string) => `lua/astronaut_carga_${skinBase(id).id}.png`;
