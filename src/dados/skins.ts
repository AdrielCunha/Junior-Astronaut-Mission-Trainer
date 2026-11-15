// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Astronaut skins: same model and animation, different suit colors (tools/lua3d/make_astronaut.py,
// SKIN=<id>). Every sheet shares the frame size and feet anchor of astronauta.json.
export type Skin = { id: string; nome: string; arquivo: string; cor: string; traje: string };   // cor = accent, traje = suit (for swatches)

export const SKINS: Skin[] = [
  { id: 'comandante', nome: 'Commander', arquivo: 'lua/astronaut.png', cor: '#f97316', traje: '#e2e8f0' },
  { id: 'marte', nome: 'Mars Red', arquivo: 'lua/astronaut_marte.png', cor: '#b91c1c', traje: '#fdba74' },
  { id: 'floresta', nome: 'Forest Green', arquivo: 'lua/astronaut_floresta.png', cor: '#16a34a', traje: '#bbf7d0' },
  { id: 'nebulosa', nome: 'Nebula Violet', arquivo: 'lua/astronaut_nebulosa.png', cor: '#8b5cf6', traje: '#ddd6fe' },
  { id: 'solar', nome: 'Solar Gold', arquivo: 'lua/astronaut_solar.png', cor: '#d97706', traje: '#fef08a' },
  { id: 'oceano', nome: 'Ocean Cyan', arquivo: 'lua/astronaut_oceano.png', cor: '#0e7490', traje: '#a5f3fc' },
];

export const SKIN_PADRAO = SKINS[0].id;
export const chaveSkin = (id: string) => `astronauta_${SKINS.some((s) => s.id === id) ? id : SKIN_PADRAO}`;
