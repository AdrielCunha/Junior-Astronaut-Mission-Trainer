// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of "Clean the window": wipe the fog and the dust off the ship's window (dust needs two passes),
// then find Earth among the things outside and tap it. A wrong tap only shows a hint.
// Pure functions, no Phaser, so node --test can run them. The scene (cenas/LimparJanelaTarefa.ts) only draws.
export type FaseJanela = 'limpar' | 'achar' | 'pronto';
export type Alvo = 'terra' | 'lua' | 'marte' | 'estrela';
export type EstadoJanela = { sujeira: number[]; fase: FaseJanela; erros: number };

export const COLUNAS = 8, LINHAS = 5;
export const LIMPO_SUFICIENTE = 0.9;   // at 90% clean the last specks wipe off by themselves

const aleatorio = (semente: number) => {   // tiny deterministic generator, 0..1
  let x = (Math.imul(semente | 0, 1664525) + 1013904223) >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
};

// Every cell starts with fog (1 pass); about a third also has dust (2 passes in total).
export function criarJanela(semente = 1): EstadoJanela {
  const r = aleatorio(semente);
  const sujeira = Array.from({ length: COLUNAS * LINHAS }, () => (r() < 0.35 ? 2 : 1));
  return { sujeira, fase: 'limpar', erros: 0 };
}

// Fraction of the cells with nothing left on them (what the progress bar shows).
export const fracaoLimpa = (e: EstadoJanela) => e.sujeira.filter((v) => v === 0).length / e.sujeira.length;

// One wipe over these cells: each loses one layer.
export function limpar(e: EstadoJanela, celulas: number[]): EstadoJanela {
  if (e.fase !== 'limpar' || !celulas.length) return e;
  const sujeira = [...e.sujeira];
  for (const k of new Set(celulas)) if (k >= 0 && k < sujeira.length && sujeira[k] > 0) sujeira[k]--;
  const prox = { ...e, sujeira };
  if (fracaoLimpa(prox) >= LIMPO_SUFICIENTE) return { ...prox, sujeira: sujeira.map(() => 0), fase: 'achar' };
  return prox;
}

// Taps something outside the window. Only Earth finishes; anything else counts a hint.
export function tocar(e: EstadoJanela, alvo: Alvo): EstadoJanela {
  if (e.fase !== 'achar') return e;
  return alvo === 'terra' ? { ...e, fase: 'pronto' } : { ...e, erros: e.erros + 1 };
}

export const DICAS: Record<Exclude<Alvo, 'terra'>, string> = {
  lua: 'That is the Moon! Earth is the blue one.',
  marte: 'That is Mars, the red planet! Find the blue one.',
  estrela: 'That is a star, very far away. Find the blue planet!',
};

export const tarefaConcluida = (e: EstadoJanela) => e.fase === 'pronto';
