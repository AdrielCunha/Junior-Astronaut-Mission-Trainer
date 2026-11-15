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
  inclinacaoMax?: number;        // steeper ground this module still accepts, degrees (default: the map limit)
  cor: number;
  sala?: keyof Alocacao;         // rooms that take batteries (game rules, regras.ts)
  unico: boolean;                // only one allowed
  papel: string;
};

export const TIPOS: Record<TipoId, Tipo> = {
  habitat:    { id: 'habitat', nome: 'Habitat', w: 3, h: 3, altura: 1.4, cor: 0x94a3b8, unico: true,
                papel: 'Where the crew lives and sleeps.' },
  suporte:    { id: 'suporte', nome: 'Life Support', w: 3, h: 2, altura: 1.4, cor: 0x3b82f6, sala: 'oxigenio', unico: true,
                papel: 'Makes oxygen. More batteries, more air!' },
  blindagem:  { id: 'blindagem', nome: 'Radiation Shield', w: 2, h: 2, altura: 1.6, cor: 0xeab308, sala: 'blindagem', unico: true,
                papel: 'Water walls stop storm radiation.' },
  oficina:    { id: 'oficina', nome: 'Rocket Workshop', w: 3, h: 3, altura: 2.0, cor: 0xf97316, sala: 'meta', unico: true,
                papel: 'Builds the rocket to Mars.' },
  // Only the narrow foundation occupies the ground; the tilted panel overhangs its supports.
  // It stands on short piles, so it accepts the 12-15 degree bank behind the Habitat where the
  // pressurised modules cannot go.
  painel:     { id: 'painel', nome: 'Solar Panel', w: 2, h: 1, altura: 1.4, inclinacaoMax: 15, cor: 0x1e3a8a, unico: false,
                papel: 'Turns sunlight into power for the batteries.' },
  plataforma: { id: 'plataforma', nome: 'Launch Pad', w: 3, h: 3, altura: 0.25, cor: 0x64748b, unico: true,
                papel: 'Where the rocket will lift off.' },
  // Equipment that arrives by cargo lander during the chapter (engine/suprimentos.ts).
  antena:     { id: 'antena', nome: 'Comms Antenna', w: 2, h: 2, altura: 1.6, cor: 0xe2e8f0, unico: true,
                papel: 'Talks to Mission Control on Earth.' },
  estufa:     { id: 'estufa', nome: 'Greenhouse', w: 3, h: 2, altura: 0.9, cor: 0x22c55e, unico: true,
                papel: 'Plants that turn the crew\'s breath back into oxygen.' },
  perfuratriz: { id: 'perfuratriz', nome: 'Ice Drill', w: 2, h: 2, altura: 1.9, cor: 0xf59e0b, unico: true,
                papel: 'Digs for ice in dark craters.' },
  rover:      { id: 'rover', nome: 'Rover', w: 2, h: 1, altura: 0.6, cor: 0xcbd5e1, unico: true,
                papel: 'Drives astronauts far from the base.' },
  // Real lunar-base structures (ISRU, life support, power, construction, science).
  usina:      { id: 'usina', nome: 'Oxygen Plant', w: 3, h: 2, altura: 1.8, cor: 0xe2e8f0, unico: true,
                papel: 'Makes oxygen out of Moon dust!' },
  reciclador: { id: 'reciclador', nome: 'Water & Air Recycler', w: 2, h: 2, altura: 1.5, cor: 0x38bdf8, unico: true,
                papel: 'Cleans water and air. Nothing is wasted!' },
  eclusa:     { id: 'eclusa', nome: 'Airlock', w: 2, h: 1, altura: 1.0, cor: 0xf97316, unico: true,
                papel: 'A double door: go out, keep the air in.' },
  bateria:    { id: 'bateria', nome: 'Battery Bank', w: 2, h: 5, altura: 1.4, cor: 0xfacc15, unico: true,
                papel: 'Stores sunlight. Get your batteries here!' },
  impressora: { id: 'impressora', nome: 'Regolith 3D Printer', w: 3, h: 2, altura: 1.8, cor: 0xe7d3b0, unico: true,
                papel: 'Prints walls out of Moon dust!' },
  radiotelescopio: { id: 'radiotelescopio', nome: 'Radio Telescope', w: 3, h: 3, altura: 2.2, cor: 0xcbd5e1, unico: true,
                papel: 'Listens to the stars, far from Earth noise.' },
  // Mars (chapter 3): built from batteries first (regras.ts, obras), then powered.
  aquecedor:  { id: 'aquecedor', nome: 'Heating', w: 3, h: 3, altura: 2.0, cor: 0xef4444, sala: 'aquecimento', unico: true,
                papel: 'Keeps machines warm on cold nights.' },
  cupula:     { id: 'cupula', nome: 'Habitat Dome', w: 3, h: 3, altura: 1.4, cor: 0xf97316, sala: 'meta', unico: true,
                papel: "The crew's new home on Mars." },
};

// Surface props stay this far (tiles) from every building and from the map center.
export const MARGEM_DECO = 4;
export const RAIO_LIVRE_DECO = 13;

// `girado`: turned a quarter (the picture is mirrored, which in the isometric view reads as a
// 90-degree turn): its `tipo` is a copy with w and h swapped (see girar).
export type Construcao = { id: number; tipo: Tipo; gx: number; gy: number; z: number; girado?: boolean };

// A footprint turned a quarter: w x h becomes h x w (the picture is drawn mirrored).
export const girar = (t: Tipo): Tipo => ({ ...t, w: t.h, h: t.w });

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
    const teto = tipo.inclinacaoMax ?? this.t.maxConstruir;
    return { motivo: inc > teto ? 'ingreme' : 'ok', inclinacao: inc };
  }

  construir(tipo: Tipo, gx: number, gy: number): Construcao | null {
    if (this.pode(tipo, gx, gy).motivo !== 'ok') return null;
    const c: Construcao = { id: this.proximo++, tipo, gx, gy, z: this.t.alturaMax(gx, gy, tipo.w, tipo.h) + 0.025 };
    for (let j = gy; j < gy + tipo.h; j++) for (let i = gx; i < gx + tipo.w; i++) this.ocup[j * this.n + i] = c.id;
    this.lista.push(c);
    return c;
  }

  // `tolerante`: a module whose saved spot is taken goes to the nearest free one instead of
  // failing (used when a save is moved to a new layout).
  restaurar(modulos: {id: number; tipo: TipoId; gx: number; gy: number; girado?: boolean}[], decoracao: DecoColocada[], tolerante = false) {
    for (const m of modulos) {
      if (!Object.prototype.hasOwnProperty.call(TIPOS,m.tipo) || !Number.isInteger(m.id)
        || this.lista.some(c=>c.id===m.id) || !Number.isInteger(m.gx) || !Number.isInteger(m.gy)) throw new Error('Invalid saved module');
      const t = m.girado ? girar(TIPOS[m.tipo]) : TIPOS[m.tipo];
      let c = this.construir(t,m.gx,m.gy);
      if (!c && tolerante) { const p = this.procurarComEspaco(t,m.gx,m.gy); c = p && this.construir(t,p.gx,p.gy); }
      if (!c) throw new Error('Invalid saved module position');
      if (m.girado) c.girado = true;
      c.id = m.id;
      for (let y=c.gy;y<c.gy+c.tipo.h;y++) for (let x=c.gx;x<c.gx+c.tipo.w;x++) this.ocup[y*this.n+x]=m.id;
      this.proximo=Math.max(this.proximo,m.id+1);
    }
    for (const d of decoracao) {
      if (d.gx+d.w>this.n || d.gy+d.h>this.n) throw new Error('Invalid saved prop');
      this.colocarDeco(d,d.gx,d.gy);
    }
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
    const chave = this.lista.length * 10_000 + this.extras.length;
    if (this.cacheCaixas && this.cacheModulos === chave) return this.cacheCaixas;
    this.cacheModulos = chave;
    // Props are solid too: the commander walks around them, never through.
    return this.cacheCaixas = [...this.t.pedras, ...this.extras, ...this.lista.map((c) => ({
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
        // Props keep two free tiles between them so they read as spread out, not piled up.
        if (this.deco.some(d => x < d.gx + d.w + 2 && x + tipo.w + 2 > d.gx && y < d.gy + d.h + 2 && y + tipo.h + 2 > d.gy)) continue;
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

  // A spot for a surface prop: flat and free like any other, but far from the map center and at least
  // MARGEM_DECO tiles from every building, so props fill the open ground instead of crowding the base.
  // Returns null when there is no such spot near the wanted one (the prop is simply left out).
  procurarDeco(tipo: Tipo, gx: number, gy: number): { gx: number; gy: number } | null {
    const centro = this.n / 2;
    let best: { gx: number; gy: number } | null = null;
    let score = Infinity;
    for (let y = Math.max(1, gy - 12); y <= Math.min(this.n - tipo.h - 1, gy + 12); y++) {
      for (let x = Math.max(1, gx - 12); x <= Math.min(this.n - tipo.w - 1, gx + 12); x++) {
        if (this.pode(tipo, x, y).motivo !== 'ok') continue;
        if (Math.hypot(x + tipo.w / 2 - centro, y + tipo.h / 2 - centro) < RAIO_LIVRE_DECO) continue;
        if (this.lista.some(c => x < c.gx + c.tipo.w + MARGEM_DECO && x + tipo.w + MARGEM_DECO > c.gx &&
          y < c.gy + c.tipo.h + MARGEM_DECO && y + tipo.h + MARGEM_DECO > c.gy)) continue;
        if (this.deco.some(d => x < d.gx + d.w + 2 && x + tipo.w + 2 > d.gx && y < d.gy + d.h + 2 && y + tipo.h + 2 > d.gy)) continue;
        const cost = (x - gx) ** 2 + (y - gy) ** 2 + this.t.inclinacaoMax(x, y, tipo.w, tipo.h) * 0.3;
        if (cost < score) { score = cost; best = { gx: x, gy: y }; }
      }
    }
    return best;
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

// The solar field: two columns of three panels, standing on the bank behind the Habitat. A column
// runs along +gy (up-right to down-left on screen, the iso diagonal); the second column, +3 gx,
// sits down-right of it. One free tile between neighbours, to walk between them. The slope tolerance of the panel
// (TIPOS.painel) is what makes this bank buildable. montarEstacaoSolar centres it.
export const ESTACAO_SOLAR: [TipoId, number, number][] = [
  ['painel', 0, 0], ['painel', 0, 2], ['painel', 0, 4],
  ['painel', 3, 0], ['painel', 3, 2], ['painel', 3, 4],
];

// The base the crew already has when the game starts (players do not build; they run it).
// Offsets in tiles from the map center; each module goes to the nearest flat, free spot, so the
// layout follows the real ground. The rooms ring the habitat: short walks with the batteries.
// Habitation at the center, fabrication farther back/right.
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
  // The field and the Battery Bank are placed last, by montarEstacaoSolar, so no other module
  // takes the ground behind the Habitat first. These offsets are only a hint of where they land:
  // the field is positioned from the Habitat, not from the map center.
  ...ESTACAO_SOLAR.map(([id, x, y]): [TipoId, number, number] => [id, x - 8, y - 14]),
  ['bateria', 2, -12],
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

// The ship (chapter 2): the four rooms of the chapter on both sides of the central corridor,
// which stays free (the deck is 18 x 12 tiles around the grid center). The Battery Bank is the
// Power Room where the batteries charge (estacaoSolar.ts); the workshop is the Engines.
export const BASE_NAVE: [TipoId, number, number][] = [
  ['oficina', -7, -5],
  ['suporte', -2, -5],
  ['blindagem', 3, -5],
  ['bateria', -2, 2],
];

// The base drawn in the layout editor (src/dados/layout.json): each module at its own tile, turned
// or not. A spot that does not fit any more (the ground changed) falls back to the nearest free one.
export type LayoutModulo = [TipoId, number, number, number];
export function montarLayout(g: Grade, modulos: LayoutModulo[]): Construcao[] {
  const feitas: Construcao[] = [];
  for (const [id, gx, gy, rot] of modulos) {
    if (!Object.prototype.hasOwnProperty.call(TIPOS, id)) continue;
    const t = rot ? girar(TIPOS[id]) : TIPOS[id];
    const p = g.pode(t, gx, gy).motivo === 'ok' ? { gx, gy } : g.procurarComEspaco(t, gx, gy);
    const c = p && g.construir(t, p.gx, p.gy);
    if (!c) continue;
    if (rot) c.girado = true;
    feitas.push(c);
  }
  return feitas;
}

export function montarBasePadrao(g: Grade, base: [TipoId, number, number][] = BASE_PADRAO): Construcao[] {
  const c0 = Math.floor(g.n / 2);
  const feitas: Construcao[] = [];
  for (const [id, dx, dy] of base) {
    if (base === BASE_PADRAO && (id === 'painel' || id === 'bateria' || id === 'impressora')) continue;
    const p = g.procurarComEspaco(TIPOS[id], c0 + dx, c0 + dy);
    const c = p && g.construir(TIPOS[id], p.gx, p.gy);
    if (c) feitas.push(c);
  }
  if (base === BASE_PADRAO) {
    // Reserve the solar field first: nothing may push it off the ground behind the Habitat.
    feitas.push(...montarEstacaoSolar(g));
    const [, dx, dy] = base.find(([id]) => id === 'impressora')!;
    const p = g.procurarComEspaco(TIPOS.impressora, c0 + dx, c0 + dy);
    const c = p && g.construir(TIPOS.impressora, p.gx, p.gy);
    if (c) feitas.push(c);
  }
  return feitas;
}

function montarEstacaoSolar(g: Grade): Construcao[] {
  const hab = g.lista.find(c => c.tipo.id === 'habitat');
  if (!hab) throw new Error('The solar field must sit behind the Habitat.');
  const minX = Math.min(...ESTACAO_SOLAR.map(([, x]) => x));
  const minY = Math.min(...ESTACAO_SOLAR.map(([, , y]) => y));
  const maxX = Math.max(...ESTACAO_SOLAR.map(([id, x]) => x + TIPOS[id].w));
  const maxY = Math.max(...ESTACAO_SOLAR.map(([id, , y]) => y + TIPOS[id].h));
  const centroX = (minX + maxX) / 2, centroY = (minY + maxY) / 2;
  // Wanted: the field centre a little up-screen of the Habitat (-gx -gy is straight up) and a bit
  // to its right (+gx -gy), like the strokes of the layout sketch. Screen offset = (dx - dy, dx + dy).
  const desejadoX = hab.gx + hab.tipo.w / 2 - 4 - centroX;
  const desejadoY = hab.gy + hab.tipo.h / 2 - 8 - centroY;
  // Isometric depth grows with gx + gy: the front corner of the field stays behind the Habitat's
  // back corner, with a small gap.
  const frente = Math.max(...ESTACAO_SOLAR.map(([id, x, y]) => x + y + TIPOS[id].w + TIPOS[id].h));
  const atrasDoHabitat = hab.gx + hab.gy - 2;
  let melhor: { x: number; y: number; custo: number } | undefined;
  for (let y = 1 - minY; y < g.n - maxY; y++) for (let x = 1 - minX; x < g.n - maxX; x++) {
    if (x + y + frente > atrasDoHabitat) continue;
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
  const campo = ESTACAO_SOLAR.map(([id, dx, dy]) => g.construir(TIPOS[id], melhor.x + dx, melhor.y + dy)!);
  // The bank charges from the field and is picked up on the way out of the Habitat: on the field's
  // right (+gx), parallel to the columns and level with them: the first free flat spot stepping
  // away from the field, else the general search.
  const direita = Math.max(...campo.map(c => c.gx + c.tipo.w)) + 2;   // its sprite overhangs the panels at +1
  const topo = Math.min(...campo.map(c => c.gy));
  const livre = (x: number, y: number) => g.pode(TIPOS.bateria, x, y).motivo === 'ok' &&
    !g.lista.some(c => x < c.gx + c.tipo.w + 1 && x + TIPOS.bateria.w + 1 > c.gx &&
      y < c.gy + c.tipo.h + 1 && y + TIPOS.bateria.h + 1 > c.gy);
  let banco: { gx: number; gy: number } | null = null;
  for (let d = 0; d < 4 && !banco; d++) for (const dy of [0, 1, -1]) {
    if (livre(direita + d, topo + dy)) { banco = { gx: direita + d, gy: topo + dy }; break; }
  }
  banco ??= g.procurarComEspaco(TIPOS.bateria, direita, topo);
  const c = banco && g.construir(TIPOS.bateria, banco.gx, banco.gy);
  if (c) campo.push(c);
  return campo;
}
