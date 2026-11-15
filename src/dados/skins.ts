// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Six rendered suits plus an articulated Explorer 3D skin. All sprite fallback poses
// share the frame size and feet anchor of astronauta.json.
export type Skin = { id: string; nome: string; arquivo: string; cor: string; traje: string; botas: string; animacao?: 'procedural'; base?: string };   // Shared suit colors for walking and seated poses.

export const SKINS: Skin[] = [
  { id: 'comandante', nome: 'Commander', arquivo: 'lua/astronaut.png', cor: '#f97316', traje: '#e2e8f0', botas: '#334155' },
  { id: 'marte', nome: 'Mars Red', arquivo: 'lua/astronaut_marte.png', cor: '#b91c1c', traje: '#fdba74', botas: '#7c2d12' },
  { id: 'floresta', nome: 'Forest Green', arquivo: 'lua/astronaut_floresta.png', cor: '#16a34a', traje: '#bbf7d0', botas: '#14532d' },
  { id: 'nebulosa', nome: 'Nebula Violet', arquivo: 'lua/astronaut_nebulosa.png', cor: '#8b5cf6', traje: '#ddd6fe', botas: '#4c1d95' },
  { id: 'solar', nome: 'Solar Gold', arquivo: 'lua/astronaut_solar.png', cor: '#d97706', traje: '#fef08a', botas: '#78350f' },
  { id: 'oceano', nome: 'Ocean Cyan', arquivo: 'lua/astronaut_oceano.png', cor: '#0e7490', traje: '#a5f3fc', botas: '#164e63' },
  { id: 'procedural', nome: 'Explorer 3D', arquivo: 'lua/astronaut.png', cor: '#67e8f9', traje: '#e2e8f0', botas: '#334155', animacao: 'procedural', base: 'comandante' },
];

export const SKIN_PADRAO = SKINS[0].id;
// Only these six skins have their own sprite assets; procedural reuses Commander as fallback.
export const SKINS_SPRITES = SKINS.filter(s=>s.animacao!=='procedural');
export const skinUsaProcedural = (id: string) => SKINS.some(s=>s.id===id&&s.animacao==='procedural');
export function skinBase(id: string): Skin {
  const skin=SKINS.find(s=>s.id===id)??SKINS[0];
  return skin.base ? SKINS_SPRITES.find(s=>s.id===skin.base)??SKINS[0] : skin;
}
export const chaveSkin = (id: string) => `astronauta_${skinBase(id).id}`;
// The same astronaut seated on the Apollo LRV, legs straight forward (make_astronaut.py SENTADO=1):
// one column, the same 8 directions and frame as the walk sheet, next to it as <file>_sentado.png.
export const chaveSkinSentado = (id: string) => `${chaveSkin(id)}_sentado`;
export const arquivoSentado = (arquivo: string) => arquivo.replace(/\.png$/, '_sentado.png');

// Carrying sheets include both forward arms and the battery, with the same 8 x 9 frames.
export const chaveSkinCarga = (id: string) => `${chaveSkin(id)}_carga`;
export const arquivoSkinCarga = (id: string) => `lua/astronaut_carga_${skinBase(id).id}.png`;
