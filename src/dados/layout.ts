// Where every module and prop goes in each world, drawn in the layout editor (the team's mockup
// page) and copied to layout.json. Props are listed in the same order as their world's list
// (DECORACAO, DECO_NAVE in Superficie.ts, DECORACAO_MARTE); each entry is [id, gx, gy, turned].
import layoutJson from './layout.json';
import type { LayoutModulo } from '../engine/construcao';

export type LayoutMundo = { modulos: LayoutModulo[]; itens: [string, number, number, number][] };
export const LAYOUT = layoutJson as unknown as Record<'lua' | 'nave' | 'marte', LayoutMundo>;

// A short fingerprint of the layout. Saved games keep it: when the layout changes, a saved base is
// moved to the new spots on load (sessao.restaurarPartida), so nobody keeps the old arrangement.
export const LAYOUT_VERSAO = (() => {
  // "r3": turned spots became three quarter turns; saves made before are placed again.
  const s = JSON.stringify(layoutJson) + 'r3';
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
  return (h >>> 0).toString(36);
})();
