// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Exploration events: once in a while the day sends the child out of the base to look for something.
// Each one is an Expedicao (engine/expedicao.ts) built here, with its own texts. They come on top of the
// module events (engine/eventos.ts) and never at the same time as another expedition. No Phaser.
import type { Expedicao, Ponto, TipoExpedicao } from './expedicao.ts';
import { pontoLivrePerto } from './expedicao.ts';

export type MundoExp = 'lua' | 'marte' | 'nave';
export const TIPOS_POR_MUNDO: Record<MundoExp, TipoExpedicao[]> = {
  lua: ['amostra', 'balizas', 'gelo'],
  marte: ['tubos'],
  nave: [],
};

export const PRIMEIRO_DIA_EXPLORACAO = 2;   // day 1 is for learning the basics
export const CHANCE_EXPLORACAO = 0.75;
// Right as the new day starts: a few seconds of play after the morning report closes.
export const ESPERA_EXPLORACAO_MIN = 2, ESPERA_EXPLORACAO_MAX = 8;

export const haExploracaoHoje = (dia: number, mundo: MundoExp, sorte: () => number = Math.random) =>
  dia >= PRIMEIRO_DIA_EXPLORACAO && TIPOS_POR_MUNDO[mundo].length > 0 && sorte() < CHANCE_EXPLORACAO;
export const esperaDaExploracao = (sorte: () => number = Math.random) =>
  ESPERA_EXPLORACAO_MIN + sorte() * (ESPERA_EXPLORACAO_MAX - ESPERA_EXPLORACAO_MIN);

// Not the same kind twice in a row when there is a choice.
export function sortearTipo(mundo: MundoExp, ultimo?: string, sorte: () => number = Math.random): TipoExpedicao | undefined {
  const todos = TIPOS_POR_MUNDO[mundo];
  const opcoes = todos.length > 1 ? todos.filter((t) => t !== ultimo) : todos;
  return opcoes[Math.floor(sorte() * opcoes.length)];
}

export type Contexto = {
  centro: Ponto;                               // middle of the base
  n: number;                                   // the ground is n x n tiles
  livre: (x: number, y: number) => boolean;    // a free spot to stand on
  crateras: { x: number; y: number; raio: number }[];
  casa: Ponto & { nome: string };              // where the sample goes back to (the Habitat)
  evitar?: Ponto[];                            // module centres: spots stay away from the buildings
};

const MARGEM = 4;
export const LONGE_DOS_MODULOS = 6;   // tiles: a spot is out on the open ground, not inside the base
export const SEPARACAO = 12;          // tiles between the spots of one expedition, so they spread over the map
const dentro = (c: Contexto, p: Ponto) => p.x >= MARGEM && p.y >= MARGEM && p.x <= c.n - MARGEM && p.y <= c.n - MARGEM;
const afastado = (p: Ponto, outros: Ponto[], d: number) => outros.every((o) => Math.hypot(o.x - p.x, o.y - p.y) >= d);

// A free spot around `centro`, at an angle (radians) and a distance range, kept inside the map, away from the
// buildings and from the spots already chosen. Out at the map's edge there may be no room in that direction:
// then the range comes closer, a little at a time, and the angle opens up.
export function pontoNoAnel(c: Contexto, angulo: number, rMin: number, rMax: number, sorte: () => number, ja: Ponto[] = []): Ponto | null {
  for (let recuo = 0; recuo <= 3; recuo++) {
    const r0 = Math.max(6, rMin - recuo * 3), r1 = Math.max(r0 + 1, rMax - recuo * 3), abre = 0.9 + recuo * 0.8;
    for (let k = 0; k < 30; k++) {
      const a = angulo + (sorte() - 0.5) * abre, r = r0 + sorte() * (r1 - r0);
      const alvo = { x: c.centro.x + Math.cos(a) * r, y: c.centro.y + Math.sin(a) * r };
      if (!dentro(c, alvo)) continue;
      const p = pontoLivrePerto(alvo.x, alvo.y, c.livre, 3);
      if (p && dentro(c, p) && afastado(p, c.evitar ?? [], LONGE_DOS_MODULOS) && afastado(p, ja, SEPARACAO)) return p;
    }
  }
  return null;
}

// n spots spread around the base, one per direction (an even share of the circle), far out.
function espalhar(c: Contexto, n: number, a0: number, rMin: number, rMax: number, sorte: () => number): Ponto[] | null {
  const pontos: Ponto[] = [];
  for (let i = 0; i < n; i++) {
    const p = pontoNoAnel(c, a0 + (i * 2 * Math.PI) / n, rMin, rMax, sorte, pontos);
    if (!p) return null;
    pontos.push(p);
  }
  return pontos;
}

const base = (tipo: TipoExpedicao, pontos: Ponto[], extra: Partial<Expedicao> & Pick<Expedicao, 'id' | 'titulo' | 'destino' | 'fato'>): Expedicao => ({
  tipo, pontos, atual: 0, feitos: pontos.map(() => false), livre: false, raio: 1.8, deRover: false, segurar: 0, espera: 0, escondidoAte: 0, ...extra,
});

export function criarExploracao(tipo: TipoExpedicao, c: Contexto, sorte: () => number = Math.random): Expedicao | null {
  const a0 = sorte() * Math.PI * 2;
  if (tipo === 'amostra') {
    const p = pontoNoAnel(c, a0, 20, 28, sorte);
    return p && base('amostra', [p, { x: c.casa.x, y: c.casa.y }], {
      id: 'amostra', titulo: 'Lost sample', destino: c.casa.nome, escondidoAte: 1,
      fato: 'Apollo crews brought back 382 kg of Moon rock. Scientists still study it today!',
    });
  }
  if (tipo === 'balizas') {
    const pontos = espalhar(c, 3 + Math.floor(sorte() * 2), a0, 17, 27, sorte);   // 3 or 4 beacons
    return pontos ? base('balizas', pontos, {
      id: 'balizas', titulo: 'Relight beacons', destino: 'the beacons', livre: true, segurar: 1.6,
      fato: 'Apollo left laser mirrors on the Moon. Scientists still bounce lasers off them to measure how far away it is!',
    }) : null;
  }
  if (tipo === 'gelo') {
    // One of the craters far out from the base (the farther half), else a spot far away.
    const dist = (k: Ponto) => Math.hypot(k.x - c.centro.x, k.y - c.centro.y);
    const longe = c.crateras.filter((k) => dist(k) >= 16 && dentro(c, k) && afastado(k, c.evitar ?? [], LONGE_DOS_MODULOS))
      .sort((a, b) => dist(b) - dist(a));
    const opcoes = longe.slice(0, Math.max(1, Math.ceil(longe.length / 2)));
    const k = opcoes.length ? opcoes[Math.floor(sorte() * opcoes.length)] : null;
    const p = (k && pontoLivrePerto(k.x, k.y, c.livre, k.raio)) ?? pontoNoAnel(c, a0, 20, 28, sorte);
    return p && base('gelo', [p], {
      id: 'gelo', titulo: 'Ice scout', destino: 'the dark crater', escondidoAte: 1, cena: 'ScannerGeloTarefa',
      fato: 'In 2009 NASA found water ice in a dark crater near the Moon\'s south pole. Ice can become water and oxygen!',
    });
  }
  if (tipo === 'tubos') {
    const pontos = espalhar(c, 3 + Math.floor(sorte() * 2), a0, 16, 27, sorte);   // 3 or 4 tubes
    return pontos ? base('tubos', pontos, {
      id: 'tubos', titulo: 'Sample tubes', destino: 'the tubes',
      fato: 'NASA\'s Perseverance rover leaves sealed rock samples on Mars, for a future mission to bring home.',
    }) : null;
  }
  return null;
}

export const AVISOS: Record<string, string> = {
  amostra: '🧪 A sample case fell off the rover far from the base! Search the map: the hint says if you are getting Warm or Cold.',
  balizas: '🔦 Some beacons far out on the map went dark! Take the rover, visit each one and stay a moment to relight it.',
  gelo: '❄ Scientists think there is ice in a dark crater far away! Take the rover: Cold means far, Hot means close.',
  tubos: '🧪 Sample tubes are lying far out on the ground! Take the rover and pick them up in order, number 1 first.',
};
