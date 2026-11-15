import type { Vista } from './sessao';

// Hide the mobile surface HUD as soon as the flight leaves; restore it after landing,
// including reduced-motion transitions. Desktop and the ship keep their usual HUD.
export function mostrarHudNaSuperficie(movel: boolean, mundo: string, vista: Vista,
  voo: { destino: Vista } | null, transicao: { destino: Vista } | null): boolean {
  if (!movel || mundo === 'nave') return true;
  return vista === 'chao' && (!voo || voo.destino === 'chao') && (!transicao || transicao.destino === 'chao');
}

export function mostrarContadoresHud(movel: boolean, mundo: string, fase: string, vista: Vista,
  voo: { destino: Vista } | null, transicao: { destino: Vista } | null): boolean {
  return fase === 'dia' && mostrarHudNaSuperficie(movel, mundo, vista, voo, transicao);
}
