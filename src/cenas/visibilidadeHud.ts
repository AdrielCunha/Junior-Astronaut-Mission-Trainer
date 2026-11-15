import type { Vista } from './sessao';

// Hide the mobile bottom counters as soon as the flight leaves the surface;
// restore them only after landing, including reduced-motion transitions.
export function mostrarContadoresHud(movel: boolean, mundo: string, fase: string, vista: Vista,
  voo: { destino: Vista } | null, transicao: { destino: Vista } | null): boolean {
  if (fase !== 'dia') return false;
  if (!movel || mundo === 'nave') return true;
  return vista === 'chao' && (!voo || voo.destino === 'chao') && (!transicao || transicao.destino === 'chao');
}
