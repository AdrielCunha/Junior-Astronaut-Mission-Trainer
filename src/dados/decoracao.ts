// Small props left on the surface: leftovers of earlier missions and science gear.
// Rendered by tools/lua3d/make_modules.py as `deco_<id>`. Offsets are tiles from the map center;
// each prop goes to the nearest flat, free spot (engine/construcao.ts, Grade.procurar).
import type { Tipo } from '../engine/construcao';

export type Deco = { id: string; nome: string; w: number; h: number; altura: number; dx: number; dy: number };

export const DECORACAO: Deco[] = [
  { id: 'rover_velho', nome: 'Abandoned Rover', w: 2, h: 1, altura: 1.1, dx: -15, dy: 9 },
  { id: 'modulo_descida', nome: 'Old Lander Stage', w: 2, h: 2, altura: 1.1, dx: 16, dy: -12 },
  { id: 'sonda', nome: 'Crashed Probe', w: 1, h: 1, altura: 0.9, dx: 11, dy: 12 },
  { id: 'caixas', nome: 'Supply Crates', w: 1, h: 1, altura: 0.8, dx: -5, dy: 10 },
  { id: 'sismografo', nome: 'Seismometer', w: 1, h: 1, altura: 1.0, dx: -17, dy: -3 },
  { id: 'refletor', nome: 'Laser Reflector', w: 1, h: 1, altura: 0.7, dx: 18, dy: 3 },
  { id: 'baliza', nome: 'Beacon', w: 1, h: 1, altura: 1.3, dx: 3, dy: -14 },
  { id: 'barris', nome: 'Fuel Drums', w: 1, h: 1, altura: 0.55, dx: 8, dy: -10 },
  { id: 'bandeira', nome: 'Mission Flag', w: 1, h: 1, altura: 1.2, dx: -9, dy: -12 },
  { id: 'pedras', nome: 'Boulders', w: 1, h: 1, altura: 0.35, dx: 12, dy: 5 },
  { id: 'pedras', nome: 'Boulders', w: 1, h: 1, altura: 0.35, dx: -12, dy: 14 },
  { id: 'camera', nome: 'Science Camera', w: 1, h: 1, altura: 1.0, dx: 15, dy: 9 },
  { id: 'amostras', nome: 'Sample Case', w: 1, h: 1, altura: 0.3, dx: -3, dy: 14 },
  { id: 'lanterna', nome: 'Solar Lamp', w: 1, h: 1, altura: 1.1, dx: 1, dy: 8 },
  { id: 'lanterna', nome: 'Solar Lamp', w: 1, h: 1, altura: 1.1, dx: -1, dy: -13 },
  { id: 'ferramentas', nome: 'Tool Rack', w: 1, h: 1, altura: 0.75, dx: 11, dy: -4 },
  { id: 'carretel', nome: 'Cable Spool', w: 1, h: 1, altura: 0.7, dx: -14, dy: 3 },
  { id: 'mochila', nome: 'Lost Backpack', w: 1, h: 1, altura: 0.3, dx: 5, dy: 14 },
];

// The grid only needs a footprint to find a free spot; props never count as buildings.
export const comoTipo = (d: Deco): Tipo => ({
  id: 'habitat', nome: d.nome, w: d.w, h: d.h, altura: d.altura, cor: 0, unico: false, papel: '',
});

export type DecoColocada = { id: string; nome: string; w: number; h: number; altura: number; gx: number; gy: number; z: number };
