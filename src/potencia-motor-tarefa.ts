// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of the "adjust the engine power" task. The first part (levels 0 to 3) is the old model, kept because
// task-batch.test.ts uses it. The second part is the one the scene plays: three levers dragged into green zones.
// Pure functions, no Phaser, so node --test can run them.
export type BarraMotor = { id: string; nivel: number };

export type TarefaPotenciaMotor = {
  barras: BarraMotor[];
};

export function criarTarefaPotenciaMotor(): TarefaPotenciaMotor {
  return {
    barras: [
      { id: 'turbo', nivel: 0 },
      { id: 'combustao', nivel: 0 },
      { id: 'sustentacao', nivel: 0 },
    ],
  };
}

export function ajustarNivel(tarefa: TarefaPotenciaMotor, id: string, nivel: number): TarefaPotenciaMotor {
  return {
    ...tarefa,
    barras: tarefa.barras.map((barra) => barra.id === id ? { ...barra, nivel: Math.max(0, Math.min(3, nivel)) } : barra),
  };
}

export function tarefaConcluida(tarefa: TarefaPotenciaMotor) {
  return tarefa.barras.every((barra) => barra.nivel >= 2);
}

// ---- Levers dragged into their green zones, held for a moment.
export type ControleMotor = { id: string; valor: number; zonaMin: number; zonaMax: number };   // valor: 0 (bottom) to 1 (top)

export type MotorAjuste = {
  controles: ControleMotor[];
  estavel: number;      // seconds with every lever inside its zone (falls slowly when one leaves)
  necessario: number;   // seconds needed to finish
};

export function criarMotorAjuste(): MotorAjuste {
  return {
    controles: [
      { id: 'turbo', valor: 0.1, zonaMin: 0.62, zonaMax: 0.8 },
      { id: 'combustao', valor: 0.92, zonaMin: 0.34, zonaMax: 0.52 },
      { id: 'sustentacao', valor: 0.6, zonaMin: 0.12, zonaMax: 0.3 },
    ],
    estavel: 0,
    necessario: 1.5,
  };
}

export function moverControle(t: MotorAjuste, id: string, valor: number): MotorAjuste {
  const v = Math.max(0, Math.min(1, valor));
  return { ...t, controles: t.controles.map((c) => c.id === id ? { ...c, valor: v } : c) };
}

export const controleNaZona = (c: ControleMotor) => c.valor >= c.zonaMin && c.valor <= c.zonaMax;
export const controlesNaZona = (t: MotorAjuste) => t.controles.filter(controleNaZona).length;
export const todosNaZona = (t: MotorAjuste) => t.controles.every(controleNaZona);

// `dt` seconds pass. Holding every lever in its zone fills the stability; leaving only drains it at half speed.
export function avancarEstabilidade(t: MotorAjuste, dt: number): MotorAjuste {
  const estavel = todosNaZona(t) ? Math.min(t.necessario, t.estavel + dt) : Math.max(0, t.estavel - dt / 2);
  return estavel === t.estavel ? t : { ...t, estavel };
}

export const estabilidade = (t: MotorAjuste) => Math.min(1, t.estavel / t.necessario);
export const motorAjustado = (t: MotorAjuste) => t.estavel >= t.necessario;
// Average of the levers, 0 to 1: how big the engine flame is.
export const potenciaMedia = (t: MotorAjuste) => t.controles.reduce((a, c) => a + c.valor, 0) / t.controles.length;
