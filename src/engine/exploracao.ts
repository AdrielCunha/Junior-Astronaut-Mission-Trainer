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
export const CHANCE_EXPLORACAO = 0.6;
export const ESPERA_EXPLORACAO_MIN = 25, ESPERA_EXPLORACAO_MAX = 60;   // seconds of play after the morning

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
};

const MARGEM = 4;
// A free spot around `centro`, at an angle (radians) and a distance range, kept inside the map.
export function pontoNoAnel(c: Contexto, angulo: number, rMin: number, rMax: number, sorte: () => number): Ponto | null {
  for (let k = 0; k < 24; k++) {
    const a = angulo + (sorte() - 0.5) * 0.9, r = rMin + sorte() * (rMax - rMin);
    const x = c.centro.x + Math.cos(a) * r, y = c.centro.y + Math.sin(a) * r;
    if (x < MARGEM || y < MARGEM || x > c.n - MARGEM || y > c.n - MARGEM) continue;
    const p = pontoLivrePerto(x, y, c.livre, 3);
    if (p) return p;
  }
  return null;
}

const base = (tipo: TipoExpedicao, pontos: Ponto[], extra: Partial<Expedicao> & Pick<Expedicao, 'id' | 'titulo' | 'destino' | 'fato'>): Expedicao => ({
  tipo, pontos, atual: 0, feitos: pontos.map(() => false), livre: false, raio: 1.8, deRover: false, segurar: 0, espera: 0, escondidoAte: 0, ...extra,
});

export function criarExploracao(tipo: TipoExpedicao, c: Contexto, sorte: () => number = Math.random): Expedicao | null {
  const a0 = sorte() * Math.PI * 2;
  if (tipo === 'amostra') {
    const p = pontoNoAnel(c, a0, 14, 24, sorte);
    return p && base('amostra', [p, { x: c.casa.x, y: c.casa.y }], {
      id: 'amostra', titulo: 'Lost sample', destino: c.casa.nome, escondidoAte: 1,
      fato: 'Apollo crews brought back 382 kg of Moon rock. Scientists still study it today!',
    });
  }
  if (tipo === 'balizas') {
    const pontos = [0, 1, 2].map((i) => pontoNoAnel(c, a0 + (i * 2 * Math.PI) / 3, 9, 16, sorte));
    return pontos.every((p): p is Ponto => !!p) ? base('balizas', pontos, {
      id: 'balizas', titulo: 'Relight beacons', destino: 'the beacons', livre: true, segurar: 1.6,
      fato: 'Apollo left laser mirrors on the Moon. Scientists still bounce lasers off them to measure how far away it is!',
    }) : null;
  }
  if (tipo === 'gelo') {
    // A crater far enough from the base, else a spot far away.
    const longe = c.crateras.filter((k) => Math.hypot(k.x - c.centro.x, k.y - c.centro.y) >= 10 && k.x > MARGEM && k.y > MARGEM && k.x < c.n - MARGEM && k.y < c.n - MARGEM);
    const k = longe.length ? longe[Math.floor(sorte() * longe.length)] : null;
    const p = (k && pontoLivrePerto(k.x, k.y, c.livre, k.raio)) ?? pontoNoAnel(c, a0, 14, 24, sorte);
    return p && base('gelo', [p], {
      id: 'gelo', titulo: 'Ice scout', destino: 'the dark crater', escondidoAte: 1, cena: 'ScannerGeloTarefa',
      fato: 'In 2009 NASA found water ice in a dark crater near the Moon\'s south pole. Ice can become water and oxygen!',
    });
  }
  if (tipo === 'tubos') {
    const pontos: Ponto[] = [];
    for (let i = 0; i < 3; i++) { const p = pontoNoAnel(c, a0 + (i * 2 * Math.PI) / 3, 8, 18, sorte); if (p) pontos.push(p); }
    return pontos.length === 3 ? base('tubos', pontos, {
      id: 'tubos', titulo: 'Sample tubes', destino: 'the tubes',
      fato: 'NASA\'s Perseverance rover leaves sealed rock samples on Mars, for a future mission to bring home.',
    }) : null;
  }
  return null;
}

export const AVISOS: Record<string, string> = {
  amostra: '🧪 A sample case fell off the rover! Walk around and listen: the hint says if you are getting Warm or Cold.',
  balizas: '🔦 Three beacons around the base went dark! Visit each one and stay a moment to relight it.',
  gelo: '❄ Scientists think there is ice in a dark crater far away! Find the spot: Cold means far, Hot means close.',
  tubos: '🧪 Sample tubes are lying on the ground! Pick them up in order: 1, 2, 3.',
};
