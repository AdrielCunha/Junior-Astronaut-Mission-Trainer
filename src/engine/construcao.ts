// Generated with AI assistance (Claude). See README, "Use of AI tools".
// What can be built, where, and the grid that remembers it. No Phaser.
import type { Efeito } from '../regras.ts';
import type { Caixa } from './fisica.ts';
import type { Terreno } from './terreno.ts';

export type TipoId = 'habitat' | 'suporte' | 'blindagem' | 'oficina' | 'painel' | 'plataforma'
  | 'antena' | 'estufa' | 'perfuratriz' | 'rover';

export type Tipo = {
  id: TipoId;
  nome: string;
  w: number; h: number;          // footprint, tiles
  altura: number;                // drawn height, tiles
  cor: number;
  sala?: Efeito;                 // rooms that take batteries (game rules, regras.ts)
  unico: boolean;                // only one allowed
  papel: string;
};

export const TIPOS: Record<TipoId, Tipo> = {
  habitat:    { id: 'habitat', nome: 'Habitat', w: 3, h: 3, altura: 1.4, cor: 0x94a3b8, unico: true,
                papel: 'Where the crew lives. Batteries charge here every morning.' },
  suporte:    { id: 'suporte', nome: 'Life Support', w: 3, h: 2, altura: 1.1, cor: 0x3b82f6, sala: 'oxigenio', unico: true,
                papel: 'Makes oxygen. Each battery gives oxygen for the night.' },
  blindagem:  { id: 'blindagem', nome: 'Radiation Shield', w: 2, h: 2, altura: 1.3, cor: 0xeab308, sala: 'blindagem', unico: true,
                papel: 'Protects the crew from solar storms.' },
  oficina:    { id: 'oficina', nome: 'Rocket Workshop', w: 3, h: 3, altura: 1.2, cor: 0xf97316, sala: 'meta', unico: true,
                papel: 'Builds the rocket to Mars.' },
  painel:     { id: 'painel', nome: 'Solar Panel', w: 2, h: 1, altura: 0.5, cor: 0x1e3a8a, unico: false,
                papel: 'Catches sunlight. At the pole the Sun is always low, so panels stand tall.' },
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
};

export type Construcao = { id: number; tipo: Tipo; gx: number; gy: number; z: number };

export type Motivo = 'ok' | 'fora' | 'ocupado' | 'ingreme' | 'unico';

export class Grade {
  readonly n: number;
  private readonly ocup: Int32Array;     // 0 = free, else construction id
  readonly lista: Construcao[] = [];
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
    const inc = this.t.inclinacaoMax(gx, gy, tipo.w, tipo.h);
    return { motivo: inc > this.t.maxConstruir ? 'ingreme' : 'ok', inclinacao: inc };
  }

  construir(tipo: Tipo, gx: number, gy: number): Construcao | null {
    if (this.pode(tipo, gx, gy).motivo !== 'ok') return null;
    const c: Construcao = { id: this.proximo++, tipo, gx, gy, z: this.t.alturaMedia(gx, gy, tipo.w, tipo.h) };
    for (let j = gy; j < gy + tipo.h; j++) for (let i = gx; i < gx + tipo.w; i++) this.ocup[j * this.n + i] = c.id;
    this.lista.push(c);
    return c;
  }

  // Solid boxes for the physics. A small inset keeps paths between neighbors walkable.
  caixas(): Caixa[] {
    return this.lista.map((c) => ({
      x0: c.gx + 0.08, y0: c.gy + 0.08, x1: c.gx + c.tipo.w - 0.08, y1: c.gy + c.tipo.h - 0.08,
      topo: c.z + c.tipo.altura,
    }));
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
export const BASE_PADRAO: [TipoId, number, number][] = [
  ['habitat', -1, -1],
  ['suporte', 4, -2],
  ['blindagem', -5, -1],
  ['oficina', -1, 4],
  ['plataforma', 5, 4],
  ['painel', -4, -5],
  ['painel', -1, -6],
  ['painel', 2, -6],
];

export function montarBasePadrao(g: Grade): Construcao[] {
  const c0 = Math.floor(g.n / 2);
  const feitas: Construcao[] = [];
  for (const [id, dx, dy] of BASE_PADRAO) {
    const p = g.procurar(TIPOS[id], c0 + dx, c0 + dy);
    const c = p && g.construir(TIPOS[id], p.gx, p.gy);
    if (c) feitas.push(c);
  }
  return feitas;
}
