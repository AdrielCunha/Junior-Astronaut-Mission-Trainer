// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of "Keep the habitat warm": a thermal camera shows the habitat wall; heat is escaping through a few
// cold spots (blue). The child drags gold insulation blankets onto the cold spots. A blanket on a warm spot
// only gives a hint and goes back. When every cold spot is covered, the inside warms up to 20 °C.
// Pure functions, no Phaser, so node --test can run them. The scene (cenas/AquecimentoTarefa.ts) only draws.
export const COLUNAS = 6, LINHAS = 4, NUM_FRIOS = 4;
export const TEMP_FRIA = -60, TEMP_BOA = 20;   // °C inside, from no blanket to every cold spot covered
export type EstadoAquecimento = { frios: number[]; cobertos: number[] };

const aleatorio = (semente: number) => {
  let x = (Math.imul(semente | 0, 1664525) + 1013904223) >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
};

export function criarAquecimento(semente = 1): EstadoAquecimento {
  const r = aleatorio(semente), frios: number[] = [];
  while (frios.length < NUM_FRIOS) {
    const i = Math.floor(r() * COLUNAS * LINHAS);
    if (!frios.includes(i)) frios.push(i);
  }
  return { frios: frios.sort((a, b) => a - b), cobertos: [] };
}

export type Resultado = 'coberto' | 'quente' | 'ja';
// Puts a blanket on spot i.
export function cobrir(e: EstadoAquecimento, i: number): { e: EstadoAquecimento; r: Resultado } {
  if (e.cobertos.includes(i)) return { e, r: 'ja' };
  if (!e.frios.includes(i)) return { e, r: 'quente' };
  return { e: { ...e, cobertos: [...e.cobertos, i] }, r: 'coberto' };
}

export const frioRestante = (e: EstadoAquecimento) => e.frios.filter((i) => !e.cobertos.includes(i)).length;
// The inside temperature: from TEMP_FRIA with no blanket to TEMP_BOA with all cold spots covered.
export const temperaturaDentro = (e: EstadoAquecimento) =>
  Math.round(TEMP_FRIA + (TEMP_BOA - TEMP_FRIA) * (e.cobertos.length / e.frios.length));
export const tarefaConcluida = (e: EstadoAquecimento) => frioRestante(e) === 0;
