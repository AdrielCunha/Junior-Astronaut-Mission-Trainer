// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of the "charge the solar panels" task: wipe the moon dust off 3 panels, then tilt each one toward the Sun.
// Pure functions, no Phaser, so node --test can run them. The scene (cenas/PaineisSolaresTarefa.ts) only draws.
export type Painel = { poeira: number; angulo: number };   // dust 0..1; angle in degrees, 0 = facing straight up
export type Fase = 'limpar' | 'inclinar' | 'pronto';
export type EstadoPaineis = { paineis: Painel[]; anguloSol: number; fase: Fase };

export const LIMITE_LIMPO = 0.1;     // at or below this much dust a panel counts as clean
export const POTENCIA_PRONTA = 0.85; // a panel is ready at this power or more
export const ANGULO_MAX = 90;
const NUM_PAINEIS = 3;
const ANGULOS_SOL = [-50, -35, 35, 50];

const aleatorio = (semente: number) => {   // tiny deterministic generator, 0..1
  let x = (Math.imul(semente | 0, 1664525) + 1013904223) >>> 0;
  return () => { x = (Math.imul(x, 1664525) + 1013904223) >>> 0; return x / 4294967296; };
};
const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function criarPaineis(semente = 1): EstadoPaineis {
  const r = aleatorio(semente);
  const anguloSol = ANGULOS_SOL[Math.floor(r() * ANGULOS_SOL.length)];
  const paineis: Painel[] = [];
  for (let i = 0; i < NUM_PAINEIS; i++) {
    // start well away from the Sun so no panel is ready before the player acts
    const lado = anguloSol > 0 ? -1 : 1;
    paineis.push({ poeira: 1, angulo: Math.round(lado * (30 + r() * 40)) });
  }
  return { paineis, anguloSol, fase: 'limpar' };
}

const trocar = (e: EstadoPaineis, i: number, p: Painel): EstadoPaineis =>
  proximaFase({ ...e, paineis: e.paineis.map((x, k) => (k === i ? p : x)) });

// Wipes `quantidade` (0..1) of the dust off panel `i`. Only works in the cleaning phase.
export function limparPoeira(e: EstadoPaineis, i: number, quantidade: number): EstadoPaineis {
  const p = e.paineis[i];
  if (!p || e.fase !== 'limpar' || quantidade <= 0) return e;
  let poeira = limitar(p.poeira - quantidade, 0, 1);
  if (poeira <= LIMITE_LIMPO) poeira = 0;
  return trocar(e, i, { ...p, poeira });
}

// Tilts panel `i`. Only works once every panel is clean.
export function inclinarPainel(e: EstadoPaineis, i: number, angulo: number): EstadoPaineis {
  const p = e.paineis[i];
  if (!p || e.fase === 'limpar') return e;
  return trocar(e, i, { ...p, angulo: limitar(angulo, -ANGULO_MAX, ANGULO_MAX) });
}

// Power of one panel, 0..1: clean glass times how squarely the panel faces the Sun.
export function potenciaPainel(p: Painel, anguloSol: number): number {
  const dif = ((p.angulo - anguloSol) * Math.PI) / 180;
  return (1 - p.poeira) * Math.max(0, Math.cos(dif));
}

export const painelLimpo = (p: Painel) => p.poeira <= LIMITE_LIMPO;
export const painelPronto = (p: Painel, anguloSol: number) => potenciaPainel(p, anguloSol) >= POTENCIA_PRONTA;

export function potenciaTotal(e: EstadoPaineis): number {
  return e.paineis.reduce((s, p) => s + potenciaPainel(p, e.anguloSol), 0) / e.paineis.length;
}

export function proximaFase(e: EstadoPaineis): EstadoPaineis {
  if (!e.paineis.every(painelLimpo)) return { ...e, fase: 'limpar' };
  if (e.paineis.every((p) => painelPronto(p, e.anguloSol))) return { ...e, fase: 'pronto' };
  return { ...e, fase: 'inclinar' };
}

export const tarefaConcluida = (e: EstadoPaineis) => e.fase === 'pronto';
