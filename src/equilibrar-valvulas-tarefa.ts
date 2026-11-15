// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of the "balance the valves" task: two wheels (O2 and CO2) move two needles; both must stay in the green band for a while.
// Pure functions, no Phaser, so node --test can run them. The scene (cenas/EquilibrarValvulasTarefa.ts) only draws.
export type Valvula = 'o2' | 'co2';

export type TarefaValvulas = {
  o2: number;            // how open the O2 valve is, 0 to 1
  co2: number;           // how open the CO2 valve is, 0 to 1
  alvoO2: number;        // centre of the green band of the O2 gauge
  alvoCo2: number;       // centre of the green band of the CO2 gauge
  tolerancia: number;    // half width of the green band
  acoplamento: number;   // the O2 valve pushes the CO2 needle a little (the two gases share the same air)
  estavel: number;       // seconds both needles have been in the green
  necessario: number;    // seconds of stable air needed to finish
};

export function criarTarefaValvulas(): TarefaValvulas {
  return { o2: 0.12, co2: 0.88, alvoO2: 0.7, alvoCo2: 0.35, tolerancia: 0.07, acoplamento: 0.2, estavel: 0, necessario: 2 };
}

const limitar = (v: number) => Math.min(1, Math.max(0, v));

// Where each needle points, 0 to 1. The CO2 needle also feels the O2 valve.
export function leituras(t: TarefaValvulas) {
  return { o2: limitar(t.o2), co2: limitar(t.co2 + t.acoplamento * (t.o2 - 0.5)) };
}

export function naFaixa(t: TarefaValvulas, qual: Valvula) {
  const l = leituras(t);
  const alvo = qual === 'o2' ? t.alvoO2 : t.alvoCo2;
  return Math.abs(l[qual] - alvo) <= t.tolerancia + 1e-9;
}

export function tudoNaFaixa(t: TarefaValvulas) {
  return naFaixa(t, 'o2') && naFaixa(t, 'co2');
}

// Turn a valve to `nivel` (0 to 1). Returns the new state; the old one is untouched.
export function girarValvula(t: TarefaValvulas, qual: Valvula, nivel: number): TarefaValvulas {
  const n = limitar(nivel);
  return t[qual] === n ? t : { ...t, [qual]: n };
}

// Angle of the pointer around the wheel, in degrees clockwise from "up", to the valve level.
// The wheel turns 270 degrees (from -135 to +135); the gap at the bottom sticks to the nearest end.
export function nivelDoAngulo(graus: number) {
  let a = ((graus + 180) % 360 + 360) % 360 - 180;   // (-180, 180]
  if (a <= -180) a = 180;
  if (Math.abs(a) <= 135) return (a + 135) / 270;
  return a > 0 ? 1 : 0;
}

// `dt` seconds go by. Both needles in the green fill the stable time; leaving the green drains it twice as fast (no hard reset).
export function avancar(t: TarefaValvulas, dt: number): TarefaValvulas {
  if (tarefaConcluida(t)) return t;
  const estavel = tudoNaFaixa(t) ? Math.min(t.necessario, t.estavel + dt) : Math.max(0, t.estavel - 2 * dt);
  return estavel === t.estavel ? t : { ...t, estavel };
}

// 0 to 1: how much of the stable time is done.
export function progresso(t: TarefaValvulas) {
  return Math.min(1, Math.max(0, t.estavel / t.necessario));
}

export function tarefaConcluida(t: TarefaValvulas) {
  return t.estavel >= t.necessario;
}
