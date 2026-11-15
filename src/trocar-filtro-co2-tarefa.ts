// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of the "swap the CO2 filter" task: open the latches, drag the old filter to the bin,
// drag the new filter into the slot and watch the CO2 meter fall to the safe zone.
// Pure functions, no Phaser, so node --test can run them. The scene (cenas/TrocarFiltroCo2Tarefa.ts) only draws.
export type FaseCo2 = 'travas' | 'remover' | 'instalar' | 'respirando' | 'concluida';

export type Ponto = { x: number; y: number };

export type TarefaFiltroCo2 = {
  fase: FaseCo2;
  travas: boolean[];        // true = latch open
  co2: number;              // 0 (clean air) to 1 (very high)
  limiteSeguro: number;     // CO2 at or under this is the safe zone
  velocidade: number;       // CO2 drop per second once the new filter is in
  erros: number;            // wrong drops (only a hint, never a punishment)
  encaixe: Ponto & { raio: number };   // slot of the filter (panel coordinates, centre of the panel is 0,0)
  lixo: Ponto & { raio: number };      // bin for the old filter
  prateleira: Ponto;                   // where the new filter waits
};

export function criarTarefaFiltroCo2(): TarefaFiltroCo2 {
  return {
    fase: 'travas', travas: [false, false], co2: 0.85, limiteSeguro: 0.3, velocidade: 0.2, erros: 0,
    encaixe: { x: 0, y: -30, raio: 55 }, lixo: { x: -255, y: -30, raio: 80 }, prateleira: { x: 255, y: -30 },
  };
}

export const distancia = (a: Ponto, b: Ponto) => Math.hypot(a.x - b.x, a.y - b.y);

// Clicking a latch opens it. When both are open, the old filter can be pulled out.
export function abrirTrava(t: TarefaFiltroCo2, i: number): TarefaFiltroCo2 {
  if (t.fase !== 'travas' || i < 0 || i >= t.travas.length || t.travas[i]) return t;
  const travas = t.travas.map((a, k) => (k === i ? true : a));
  return { ...t, travas, fase: travas.every(Boolean) ? 'remover' : 'travas' };
}

// The old filter was dropped at `p`. Over the bin it leaves; anywhere else it springs back (no error counted).
export function soltarFiltroVelho(t: TarefaFiltroCo2, p: Ponto): TarefaFiltroCo2 {
  if (t.fase !== 'remover') return t;
  return distancia(p, t.lixo) <= t.lixo.raio ? { ...t, fase: 'instalar' } : t;
}

// The new filter was dropped at `p`. Inside the slot it clicks in and the latches close; elsewhere it goes back.
export function soltarFiltroNovo(t: TarefaFiltroCo2, p: Ponto): TarefaFiltroCo2 {
  if (t.fase !== 'instalar') return t;
  if (distancia(p, t.encaixe) <= t.encaixe.raio) return { ...t, fase: 'respirando', travas: t.travas.map(() => false) };
  return { ...t, erros: t.erros + 1 };
}

// Time passes (seconds). Only after the new filter is in does the CO2 fall.
export function passarTempo(t: TarefaFiltroCo2, dt: number): TarefaFiltroCo2 {
  if (t.fase !== 'respirando') return t;
  const co2 = Math.max(0, t.co2 - t.velocidade * dt);
  return { ...t, co2, fase: co2 <= t.limiteSeguro ? 'concluida' : 'respirando' };
}

// 0 (alert) to 1 (air ready): how far the CO2 went from its start to the safe limit.
export function arSeguro(t: TarefaFiltroCo2) {
  if (t.fase === 'concluida') return 1;
  const inicio = criarTarefaFiltroCo2().co2;
  return Math.min(1, Math.max(0, (inicio - t.co2) / (inicio - t.limiteSeguro)));
}

export const tarefaConcluida = (t: TarefaFiltroCo2) => t.fase === 'concluida';
