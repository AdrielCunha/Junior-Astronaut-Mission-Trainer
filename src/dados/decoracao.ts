// Small props left on the surface: leftovers of earlier missions and science gear.
// Rendered by tools/lua3d/make_modules.py as `deco_<id>`. Offsets are tiles from the map center;
// each prop goes to the nearest flat, free spot that keeps clear of the center and the buildings (Grade.procurarDeco).
// They are spread over the whole walkable ground; each one has a short fact shown on hover/touch.
import type { Tipo } from '../engine/construcao';

export type Deco = { id: string; nome: string; info: string; w: number; h: number; altura: number; dx: number; dy: number };

export const OBJETOS_CONSTRUCAO:Deco[]=[
  {id:'generator',nome:'Generator',info:'A portable backup generator stored with the base equipment.',w:1,h:1,altura:.85,dx:12,dy:-23},
  {id:'canister',nome:'Canister',info:'A sealed storage canister. Move it with the other base supplies.',w:1,h:1,altura:1,dx:22,dy:5},
  {id:'toolkit',nome:'Tool kit',info:'A portable case of tools for working around the base.',w:1,h:1,altura:.8,dx:-12,dy:21},
];

const ROVER = 'An old rover from an earlier mission. Its batteries died long ago, but the wheels still look ready to roll.';
const DESCIDA = 'The bottom half of a lander. The top half flew back up; the legs and tanks stay on the Moon.';
const SONDA = 'A probe that hit the ground too fast. Early robot missions crashed a lot before engineers got landings right.';
const CAIXAS = 'Spare supplies for the crew: food, tools and filters. Everything here came from Earth.';
const SISMO = 'Measures moonquakes. The Moon rumbles a little, and scientists use it to learn what is inside.';
const REFLETOR = 'Laser reflector. Scientists shoot lasers from Earth at it to measure the Moon distance very precisely.';
const BALIZA = 'A beacon that blinks so rovers and astronauts can find their way home.';
const BARRIS = 'Drums of rocket fuel. Fuel is heavy, so every kilo flown from Earth costs a lot.';
const BANDEIRA = 'A mission flag. With no wind on the Moon, flags need a wire to look like they wave.';
const PEDRAS = 'Boulders thrown out by meteorites. With no air, nothing smooths them: they stay sharp for billions of years.';
const CAMERA = 'A science camera taking photos of the sky. With no air, stars shine without twinkling.';
const AMOSTRAS = 'A case of lunar soil and rock samples. They are sent to labs on Earth to learn how the Moon formed.';
const LANTERNA = 'A solar lamp. It stores sunlight in the day to glow when the long lunar night comes.';
const FERRAMENTAS = 'Tool rack: shovels, rakes and tongs used to collect rocks and fix equipment.';
const CARRETEL = 'A spool of power cable that links solar panels to the base.';
const MOCHILA = 'A lost backpack! Life support packs hold oxygen and cooling water for a moonwalk.';

export const DECORACAO: Deco[] = [
  ...OBJETOS_CONSTRUCAO,
  // Spread over the open ground, away from the center and the main buildings (Grade.procurarDeco)
  { id: 'caixas', nome: 'Supply Crates', info: CAIXAS, w: 1, h: 1, altura: 0.8, dx: 16, dy: 11 },
  { id: 'lanterna', nome: 'Solar Lamp', info: LANTERNA, w: 1, h: 1, altura: 1.1, dx: -24, dy: 3 },
  { id: 'ferramentas', nome: 'Tool Rack', info: FERRAMENTAS, w: 1, h: 1, altura: 0.75, dx: 13, dy: -16 },
  { id: 'amostras', nome: 'Sample Case', info: AMOSTRAS, w: 1, h: 1, altura: 0.3, dx: 1, dy: 26 },
  { id: 'mochila', nome: 'Lost Backpack', info: MOCHILA, w: 1, h: 1, altura: 0.3, dx: -16, dy: -15 },
  { id: 'baliza', nome: 'Beacon', info: BALIZA, w: 1, h: 1, altura: 1.3, dx: 19, dy: 1 },
  { id: 'barris', nome: 'Fuel Drums', info: BARRIS, w: 1, h: 1, altura: 0.55, dx: -18, dy: 16 },
  { id: 'bandeira', nome: 'Mission Flag', info: BANDEIRA, w: 1, h: 1, altura: 1.2, dx: 3, dy: -21 },
  { id: 'carretel', nome: 'Cable Spool', info: CARRETEL, w: 1, h: 1, altura: 0.7, dx: 15, dy: 21 },
  { id: 'camera', nome: 'Science Camera', info: CAMERA, w: 1, h: 1, altura: 1.0, dx: -22, dy: -5 },
  { id: 'lanterna', nome: 'Solar Lamp', info: LANTERNA, w: 1, h: 1, altura: 1.1, dx: 16, dy: -10 },
  { id: 'pedras', nome: 'Boulders', info: PEDRAS, w: 1, h: 1, altura: 0.35, dx: -7, dy: 23 },
  { id: 'pedras', nome: 'Boulders', info: PEDRAS, w: 1, h: 1, altura: 0.35, dx: -9, dy: -19 },
  { id: 'rover_velho', nome: 'Abandoned Rover', info: ROVER, w: 2, h: 1, altura: 1.1, dx: 24, dy: 10 },
  { id: 'modulo_descida', nome: 'Old Lander Stage', info: DESCIDA, w: 2, h: 2, altura: 1.1, dx: -21, dy: 8 },
  { id: 'sonda', nome: 'Crashed Probe', info: SONDA, w: 1, h: 1, altura: 0.9, dx: 9, dy: -17 },
  { id: 'sismografo', nome: 'Seismometer', info: SISMO, w: 1, h: 1, altura: 1.0, dx: 6, dy: 23 },
  { id: 'refletor', nome: 'Laser Reflector', info: REFLETOR, w: 1, h: 1, altura: 0.7, dx: -18, dy: -11 },
  { id: 'caixas', nome: 'Supply Crates', info: CAIXAS, w: 1, h: 1, altura: 0.8, dx: 26, dy: -5 },
  { id: 'barris', nome: 'Fuel Drums', info: BARRIS, w: 1, h: 1, altura: 0.55, dx: -13, dy: 18 },
  { id: 'bandeira', nome: 'Mission Flag', info: BANDEIRA, w: 1, h: 1, altura: 1.2, dx: -2, dy: -19 },
  { id: 'pedras', nome: 'Boulders', info: PEDRAS, w: 1, h: 1, altura: 0.35, dx: 18, dy: 16 },
  { id: 'pedras', nome: 'Boulders', info: PEDRAS, w: 1, h: 1, altura: 0.35, dx: -21, dy: 0 },
  { id: 'camera', nome: 'Science Camera', info: CAMERA, w: 1, h: 1, altura: 1.0, dx: 19, dy: -18 },
  { id: 'baliza', nome: 'Beacon', info: BALIZA, w: 1, h: 1, altura: 1.3, dx: -2, dy: 22 },
  { id: 'amostras', nome: 'Sample Case', info: AMOSTRAS, w: 1, h: 1, altura: 0.3, dx: -12, dy: -15 },
  { id: 'ferramentas', nome: 'Tool Rack', info: FERRAMENTAS, w: 1, h: 1, altura: 0.75, dx: 24, dy: 4 },
  { id: 'carretel', nome: 'Cable Spool', info: CARRETEL, w: 1, h: 1, altura: 0.7, dx: -18, dy: 11 },
  { id: 'mochila', nome: 'Lost Backpack', info: MOCHILA, w: 1, h: 1, altura: 0.3, dx: 7, dy: -25 },
];

// The grid only needs a footprint to find a free spot; props never count as buildings.
export const comoTipo = (d: Deco): Tipo => ({
  id: 'habitat', nome: d.nome, w: d.w, h: d.h, altura: d.altura, cor: 0, unico: false, papel: '',
});

export type DecoColocada = { id: string; nome: string; info: string; w: number; h: number; altura: number; gx: number; gy: number; z: number; rotacao?: number };

export function dimensoesDeco(d: DecoColocada,rotacao=d.rotacao??0) {
  return (rotacao%2)!==((d.rotacao??0)%2)?{w:d.h,h:d.w}:{w:d.w,h:d.h};
}
