// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Astronaut skins: same model and animation, different suit colors (tools/lua3d/make_astronaut.py,
// SKIN=<id>). Every sheet shares the frame size and feet anchor of astronauta.json.
export type Skin = { id: string; nome: string; arquivo: string; cor: string; traje: string; botas: string };   // Shared suit colors for walking and seated poses.

export const SKINS: Skin[] = [
  { id: 'comandante', nome: 'Commander', arquivo: 'lua/astronaut.png', cor: '#f97316', traje: '#e2e8f0', botas: '#334155' },
  { id: 'marte', nome: 'Mars Red', arquivo: 'lua/astronaut_marte.png', cor: '#b91c1c', traje: '#fdba74', botas: '#7c2d12' },
  { id: 'floresta', nome: 'Forest Green', arquivo: 'lua/astronaut_floresta.png', cor: '#16a34a', traje: '#bbf7d0', botas: '#14532d' },
  { id: 'nebulosa', nome: 'Nebula Violet', arquivo: 'lua/astronaut_nebulosa.png', cor: '#8b5cf6', traje: '#ddd6fe', botas: '#4c1d95' },
  { id: 'solar', nome: 'Solar Gold', arquivo: 'lua/astronaut_solar.png', cor: '#d97706', traje: '#fef08a', botas: '#78350f' },
  { id: 'oceano', nome: 'Ocean Cyan', arquivo: 'lua/astronaut_oceano.png', cor: '#0e7490', traje: '#a5f3fc', botas: '#164e63' },
];

export const SKIN_PADRAO = SKINS[0].id;
export const chaveSkin = (id: string) => `astronauta_${SKINS.some((s) => s.id === id) ? id : SKIN_PADRAO}`;
