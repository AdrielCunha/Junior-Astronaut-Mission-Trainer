// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Astronaut skins: same model and animation, different suit colors (tools/lua3d/make_astronaut.py,
// SKIN=<id>). Every sheet shares the frame size and feet anchor of astronauta.json.
export type Skin = { id: string; nome: string; arquivo: string; cor: string; traje: string; botas: string; premio?: boolean; fase?: 'lua' | 'nave' | 'marte' };   // premio: won in side missions (acessorios.ts), not free   // Shared suit colors for walking and seated poses.

export const SKINS: Skin[] = [
  // Page "Astronauts": 12 different characters (same skeleton and walk, own look: ears, tails, horns...).
  // The commander is free; the others are prizes of side missions (engine/presentes.ts). The sheets come
  // from tools/lua3d/make_astronaut.py (SKIN=<id>) and personagens_extra.py.
  { id: 'comandante', nome: 'Commander', arquivo: 'lua/astronaut.png', cor: '#f97316', traje: '#e2e8f0', botas: '#334155' },
  { id: 'robo', nome: 'Robo-Bot', arquivo: 'lua/astronaut_robo.png', cor: '#38bdf8', traje: '#cbd5e1', botas: '#475569', premio: true, fase: 'nave' },
  { id: 'alien', nome: 'Little Green', arquivo: 'lua/astronaut_alien.png', cor: '#a855f7', traje: '#bbf7d0', botas: '#166534', premio: true, fase: 'lua' },
  { id: 'gato', nome: 'Space Kitty', arquivo: 'lua/astronaut_gato.png', cor: '#ea580c', traje: '#fed7aa', botas: '#7c2d12', premio: true, fase: 'nave' },
  { id: 'urso', nome: 'Teddy Bear', arquivo: 'lua/astronaut_urso.png', cor: '#92400e', traje: '#d6b48a', botas: '#78350f', premio: true, fase: 'lua' },
  { id: 'coelho', nome: 'Bunny', arquivo: 'lua/astronaut_coelho.png', cor: '#ec4899', traje: '#fce7f3', botas: '#9d174d', premio: true, fase: 'nave' },
  { id: 'cachorro', nome: 'Puppy', arquivo: 'lua/astronaut_cachorro.png', cor: '#b45309', traje: '#fde68a', botas: '#78350f', premio: true, fase: 'marte' },
  { id: 'pinguim', nome: 'Penguin', arquivo: 'lua/astronaut_pinguim.png', cor: '#f97316', traje: '#bfdbfe', botas: '#1e3a8a', premio: true, fase: 'lua' },
  { id: 'dino', nome: 'Dino', arquivo: 'lua/astronaut_dino.png', cor: '#facc15', traje: '#bbf7d0', botas: '#14532d', premio: true, fase: 'marte' },
  { id: 'raposa', nome: 'Fox', arquivo: 'lua/astronaut_raposa.png', cor: '#fb923c', traje: '#fdba74', botas: '#7c2d12', premio: true, fase: 'marte' },
  { id: 'unicornio', nome: 'Unicorn', arquivo: 'lua/astronaut_unicornio.png', cor: '#e879f9', traje: '#f5d0fe', botas: '#6b21a8', premio: true, fase: 'nave' },
  { id: 'panda', nome: 'Panda', arquivo: 'lua/astronaut_panda.png', cor: '#64748b', traje: '#f1f5f9', botas: '#475569', premio: true, fase: 'lua' },
];

export const SKIN_PADRAO = SKINS[0].id;
export const chaveSkin = (id: string) => `astronauta_${SKINS.some((s) => s.id === id) ? id : SKIN_PADRAO}`;
// The same astronaut seated on the Apollo LRV, legs straight forward (make_astronaut.py SENTADO=1):
// one column, the same 8 directions and frame as the walk sheet, next to it as <file>_sentado.png.
export const chaveSkinSentado = (id: string) => `${chaveSkin(id)}_sentado`;
export const arquivoSentado = (arquivo: string) => arquivo.replace(/\.png$/, '_sentado.png');

// Carrying sheets include both forward arms and the battery, with the same 8 x 9 frames.
export const chaveSkinCarga = (id: string) => `${chaveSkin(id)}_carga`;
export const arquivoSkinCarga = (id: string) => `lua/astronaut_carga_${SKINS.some(s => s.id === id) ? id : SKIN_PADRAO}.png`;
