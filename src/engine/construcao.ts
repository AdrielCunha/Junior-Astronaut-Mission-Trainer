// Generated with AI assistance (Claude). See README, "Use of AI tools".
// What can be built, where, and the grid that remembers it. No Phaser.
import type { Alocacao } from '../regras.ts';
import type { Caixa } from './fisica.ts';
import type { Terreno } from './terreno.ts';
import type { DecoColocada } from '../dados/decoracao.ts';

export type TipoId = 'habitat' | 'suporte' | 'blindagem' | 'oficina' | 'painel' | 'plataforma'
  | 'antena' | 'estufa' | 'perfuratriz' | 'rover'
  | 'usina' | 'reciclador' | 'eclusa' | 'bateria' | 'impressora' | 'radiotelescopio'
  | 'aquecedor' | 'cupula';

export type Tipo = {
  id: TipoId;
  nome: string;
  w: number; h: number;          // footprint, tiles
  altura: number;                // drawn height, tiles
  cor: number;
  sala?: keyof Alocacao;         // rooms that take batteries (game rules, regras.ts)
  unico: boolean;                // only one allowed
  papel: string;
};

export const TIPOS: Record<TipoId, Tipo> = {
  habitat:    { id: 'habitat', nome: 'Habitat', w: 3, h: 3, altura: 1.4, cor: 0x94a3b8, unico: true,
                papel: 'Where the crew lives. Collect solar-charged batteries at the Battery Bank.' },
  suporte:    { id: 'suporte', nome: 'Life Support', w: 3, h: 2, altura: 1.4, cor: 0x3b82f6, sala: 'oxigenio', unico: true,
                papel: 'Makes oxygen. Each battery gives oxygen for the night.' },
  blindagem:  { id: 'blindagem', nome: 'Radiation Shield', w: 2, h: 2, altura: 1.6, cor: 0xeab308, sala: 'blindagem', unico: true,
                papel: 'A shelter with walls of water. Batteries pump the water up before a storm: water stops radiation.' },
  oficina:    { id: 'oficina', nome: 'Rocket Workshop', w: 3, h: 3, altura: 2.0, cor: 0xf97316, sala: 'meta', unico: true,
                papel: 'Builds the rocket to Mars.' },
  painel:     { id: 'painel', nome: 'Solar Panel', w: 2, h: 2, altura: 1.4, cor: 0x1e3a8a, unico: false,
                papel: 'Catches sunlight and charges the batteries at the nearby Battery Bank.' },
  plataforma: { id: 'plataforma', nome: 'Launch Pad', w: 3, h: 3, altura: 0.25, cor: 0x64748b, unico: true,
                papel: 'Where the rocket will lift off.' },
  // Equipment that arrives by cargo lander during the chapter (engine/suprimentos.ts).
  antena:     { id: 'antena', nome: 'Comms Antenna', w: 2, h: 2, altura: 1.6, cor: 0xe2e8f0, unico: true,
                papel: 'Talks to Mission Control on Earth.' },
  estufa:     { id: 'estufa', nome: 'Greenhouse', w: 3, h: 2, altura: 0.9, cor: 0x22c55e, unico: true,
                papel: 'Plants that turn the crew\'s breath back into oxygen.' },
  perfuratriz: { id: 'perfuratriz', nome: 'Ice Drill', w: 2, h: 2, altura: 1.9, cor: 0xf59e0b, unico: true,
                papel: 'Digs for frozen water in the dark craters.' },
  rover:      { id: 'rover', nome: 'Rover', w: 2, h: 1, altura: 0.6, cor: 0xcbd5e1, unico: true,
                papel: 'Carries astronauts far from the base.' },
  // Real lunar-base structures (ISRU, life support, power, construction, science).
  usina:      { id: 'usina', nome: 'Oxygen Plant', w: 3, h: 2, altura: 1.8, cor: 0xe2e8f0, unico: true,
                papel: 'Splits oxygen out of lunar dust (regolith) with electricity. This is how NASA plans to make air on the Moon.' },
  reciclador: { id: 'reciclador', nome: 'Water & Air Recycler', w: 2, h: 2, altura: 1.5, cor: 0x38bdf8, unico: true,
                papel: "Cleans the crew's water and removes CO2 from the air, so nothing is wasted." },
  eclusa:     { id: 'eclusa', nome: 'Airlock', w: 2, h: 1, altura: 1.0, cor: 0xf97316, unico: true,
                papel: "A double door that lets astronauts go outside without losing the base's air." },
  bateria:    { id: 'bateria', nome: 'Battery Bank', w: 2, h: 5, altura: 1.4, cor: 0xfacc15, unico: true,
                papel: 'Five removable batteries store solar power. Pick up today\'s charged batteries here.' },
  impressora: { id: 'impressora', nome: 'Regolith 3D Printer', w: 3, h: 2, altura: 1.8, cor: 0xe7d3b0, unico: true,
                papel: 'Builds walls and landing pads by melting lunar dust, so we ship less from Earth.' },
  radiotelescopio: { id: 'radiotelescopio', nome: 'Radio Telescope', w: 3, h: 3, altura: 2.2, cor: 0xcbd5e1, unico: true,
                papel: "Listens to the universe. The Moon's far side is shielded from Earth's radio noise." },
  // Mars (chapter 3): built from batteries first (regras.ts, obras), then powered.
  aquecedor:  { id: 'aquecedor', nome: 'Heating', w: 3, h: 3, altura: 2.0, cor: 0xef4444, sala: 'aquecimento', unico: true,
                papel: 'Keeps the machines warm on cold Mars nights.' },
  cupula:     { id: 'cupula', nome: 'Habitat Dome', w: 3, h: 3, altura: 1.4, cor: 0xf97316, sala: 'meta', unico: true,
                papel: "The crew's new home on Mars." },
};

export type Construcao = { id: number; tipo: Tipo; gx: number; gy: number; z: number };

export type Motivo = 'ok' | 'fora' | 'ocupado' | 'ingreme' | 'unico';

export class Grade {
  readonly n: number;
  private readonly ocup: Int32Array;     // 0 = free, else construction id
  readonly lista: Construcao[] = [];
  readonly deco: DecoColocada[] = [];     // surface props: solid and reserved, but not buildings
  private readonly extras: Caixa[] = [];
  private proximo = 1;
  private readonly t: Terreno;

  constructor(t: Terreno) {
    this.t = t;
    this.n = t.n;
    this.ocup = new Int32Array(t.n * t.n);
  }

  em(gx: number, gy: number): Construcao | undefined {
    const i = Math.floor(gx), j = Math.floor(gy);
    if (i < 0 || j < 0 || i >= this.n || j >= this.n) return undefined;
    const id = this.ocup[j * this.n + i];
    return id ? this.lista.find((c) => c.id === id) : undefined;
  }

  // Checks a footprint. The slope test uses the real slope from LOLA, so kids learn why
  // engineers look for flat ground.
  pode(tipo: Tipo, gx: number, gy: number): { motivo: Motivo; inclinacao: number } {
    if (gx < 0 || gy < 0 || gx + tipo.w > this.n || gy + tipo.h > this.n) return { motivo: 'fora', inclinacao: 0 };
    if (tipo.unico && this.lista.some((c) => c.tipo.id === tipo.id)) return { motivo: 'unico', inclinacao: 0 };
    for (let j = gy; j < gy + tipo.h; j++) for (let i = gx; i < gx + tipo.w; i++) {
      if (this.ocup[j * this.n + i]) return { motivo: 'ocupado', inclinacao: 0 };
    }
    if (this.t.bloqueiaConstrucao(gx, gy, tipo.w, tipo.h)) return { motivo: 'ocupado', inclinacao: 0 };
    const inc = this.t.inclinacaoMax(gx, gy, tipo.w, tipo.h);
    return { motivo: inc > this.t.maxConstruir ? 'ingreme' : 'ok', inclinacao: inc };
  }

  construir(tipo: Tipo, gx: number, gy: number): Construcao | null {
    if (this.pode(tipo, gx, gy).motivo !== 'ok') return null;
    const c: Construcao = { id: this.proximo++, tipo, gx, gy, z: this.t.alturaMax(gx, gy, tipo.w, tipo.h) + 0.025 };
    for (let j = gy; j < gy + tipo.h; j++) for (let i = gx; i < gx + tipo.w; i++) this.ocup[j * this.n + i] = c.id;
    this.lista.push(c);
    return c;
  }

  // Puts a prop on the ground: reserves its tiles and makes it solid.
  colocarDeco(d: Omit<DecoColocada, 'gx' | 'gy' | 'z'>, gx: number, gy: number): DecoColocada {
    const p: DecoColocada = { ...d, gx, gy, z: this.t.alturaMax(gx, gy, d.w, d.h) + 0.01 };
    for (let j = gy; j < gy + d.h; j++) for (let i = gx; i < gx + d.w; i++) this.ocup[j * this.n + i] = -1;
    this.extras.push({ x0: gx + 0.12, y0: gy + 0.12, x1: gx + d.w - 0.12, y1: gy + d.h - 0.12, topo: p.z + d.altura });
    this.deco.push(p);
    return p;
  }

  // Solid boxes for the physics. A small inset keeps paths between neighbors walkable.
  // Called every frame by the physics: kept until the base changes, so no arrays are rebuilt per frame.
  private cacheCaixas: Caixa[] | null = null;
  private cacheModulos = -1;
  caixas(): Caixa[] {
    if (this.cacheCaixas && this.cacheModulos === this.lista.length) return this.cacheCaixas;
    this.cacheModulos = this.lista.length;
    return this.cacheCaixas = [...this.t.pedras, ...this.lista.map((c) => ({
      x0: c.gx + 0.08, y0: c.gy + 0.08, x1: c.gx + c.tipo.w - 0.08, y1: c.gy + c.tipo.h - 0.08,
      topo: c.z + c.tipo.altura,
    }))];
  }

  // Prefer the intended sector while leaving a full tile of circulation around modules.
  procurarComEspaco(tipo: Tipo, gx: number, gy: number): { gx: number; gy: number } | null {
    let best: { gx: number; gy: number } | null = null;
    let score = Infinity;
    for (let y = Math.max(1, gy - 9); y <= Math.min(this.n - tipo.h - 1, gy + 9); y++) {
      for (let x = Math.max(1, gx - 9); x <= Math.min(this.n - tipo.w - 1, gx + 9); x++) {
        if (this.pode(tipo, x, y).motivo !== 'ok') continue;
        if (this.lista.some(c => x < c.gx + c.tipo.w + 1 && x + tipo.w + 1 > c.gx &&
          y < c.gy + c.tipo.h + 1 && y + tipo.h + 1 > c.gy)) continue;
        // Compare projected silhouettes, not just footprints: tall towers can hide neighbors.
        const bounds = (kind: Tipo, px: number, py: number, z: number) => ({
          left: px - py - kind.h, right: px - py + kind.w,
          top: (px + py) / 2 - z * 1.225 - (kind.id === 'plataforma' ? 3.8 : kind.altura * 1.225),
          bottom: (px + py + kind.w + kind.h) / 2 - z * 1.225,
        });
        const b = bounds(tipo,x,y,this.t.alturaMax(x,y,tipo.w,tipo.h));
        let overlap = 0;
        for (const c of this.lista) {
          const a = bounds(c.tipo,c.gx,c.gy,c.z);
          overlap += Math.max(0,Math.min(a.right,b.right)-Math.max(a.left,b.left)+0.3) *
            Math.max(0,Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)+0.3);
        }
        // Keep a central service court clear, even when a supply must move from its sector.
        const center = this.n/2;
        if (x < center+3 && x+tipo.w > center-1 && y < center+5 && y+tipo.h > center) continue;
        const cost = (x - gx) ** 2 + (y - gy) ** 2 + this.t.inclinacaoMax(x, y, tipo.w, tipo.h) * 0.3 + overlap * 16;
        if (cost < score) { score = cost; best = { gx: x, gy: y }; }
      }
    }
    return best ?? this.procurar(tipo, gx, gy);
  }

  // Nearest flat spot for a footprint, searching outward from (gx, gy).
  procurar(tipo: Tipo, gx: number, gy: number): { gx: number; gy: number } | null {
    for (let r = 0; r < this.n; r++) {
      for (let j = gy - r; j <= gy + r; j++) for (let i = gx - r; i <= gx + r; i++) {
        if (Math.max(Math.abs(i - gx), Math.abs(j - gy)) !== r) continue;
        if (this.pode(tipo, i, j).motivo === 'ok') return { gx: i, gy: j };
      }
    }
    return null;
  }
}

// The base the crew already has when the game starts (players do not build; they run it).
// Offsets in tiles from the map center; each module goes to the nearest flat, free spot, so the
// layout follows the real ground. The rooms ring the habitat: short walks with the batteries.
// Habitation at the center, the solar station in front, fabrication behind and to the right.
// Relative offsets preserve two straight rows and the adjacent bank on uneven ground.
export const ESTACAO_SOLAR: [TipoId, number, number][] = [
  ['painel', 0, 0], ['painel', 3, 0], ['painel', 6, 0],
  ['painel', 0, 3], ['painel', 3, 3], ['painel', 6, 3],
  ['bateria', 9, 0],
];

export const BASE_PADRAO: [TipoId, number, number][] = [
  ['habitat', -2, -4],
  ['suporte', 4, -3],
  ['blindagem', -6, -1],
  ['oficina', 7, 0],
  ['plataforma', 13, 6],
  ['usina', -12, -3],
  ['reciclador', -11, 3],
  ['eclusa', -2, 3],
  ['impressora', 9, -18],
  ['radiotelescopio', -10, -9],
  ...ESTACAO_SOLAR.map(([id, x, y]): [TipoId, number, number] => [id, x + 6, y - 7]),
];

export const SETORES_SUPRIMENTOS: Partial<Record<TipoId, [number, number]>> = {
  antena: [-7, -6], estufa: [-6, 4], perfuratriz: [7, -7], rover: [5, 6],
};

// Mars, chapter 3: the crew landed with only its lander (it plays the Habitat: batteries charge
// there), solar panels, and four construction sites (regras.ts obras).
export const BASE_MARTE: [TipoId, number, number][] = [
  ['habitat', -2, -2],
  ['suporte', 4, -3],
  ['blindagem', -6, 1],
  ['aquecedor', 4, 3],
  ['cupula', -3, 5],
  ['painel', -6, -6],
  ['painel', -3, -6],
];

export function montarBasePadrao(g: Grade, base: [TipoId, number, number][] = BASE_PADRAO): Construcao[] {
  const c0 = Math.floor(g.n / 2);
  const feitas: Construcao[] = [];
  for (const [id, dx, dy] of base) {
    if (base === BASE_PADRAO && (id === 'painel' || id === 'bateria')) continue;
    const p = g.procurarComEspaco(TIPOS[id], c0 + dx, c0 + dy);
    const c = p && g.construir(TIPOS[id], p.gx, p.gy);
    if (c) feitas.push(c);
  }
  if (base === BASE_PADRAO) feitas.push(...montarEstacaoSolar(g, c0 + 6, c0 - 7));
  return feitas;
}

function montarEstacaoSolar(g: Grade, desejadoX: number, desejadoY: number): Construcao[] {
  let melhor: { x: number; y: number; custo: number } | undefined;
  for (let y = 1; y < g.n - 5; y++) for (let x = 1; x < g.n - 11; x++) {
    const custo = (x - desejadoX) ** 2 + (y - desejadoY) ** 2;
    if (melhor && custo >= melhor.custo) continue;
    const cabe = ESTACAO_SOLAR.every(([id, dx, dy]) => {
      const t = TIPOS[id], px = x + dx, py = y + dy;
      if (g.pode(t, px, py).motivo !== 'ok') return false;
      // Same circulation margin as the rest of the colony; keep the service court free.
      const centro = g.n / 2;
      if (px < centro + 3 && px + t.w > centro - 1 && py < centro + 5 && py + t.h > centro) return false;
      return !g.lista.some(c => px < c.gx + c.tipo.w + 1 && px + t.w + 1 > c.gx &&
        py < c.gy + c.tipo.h + 1 && py + t.h + 1 > c.gy);
    });
    if (cabe) melhor = { x, y, custo };
  }
  if (!melhor) throw new Error('No walkable location for the complete solar station.');
  return ESTACAO_SOLAR.map(([id, dx, dy]) => g.construir(TIPOS[id], melhor.x + dx, melhor.y + dy)!);
}
