// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Start the Reactor": switch on the pump, piping and generator in the right order, then hold the ignition until the charge fills.
// Pure functions (no Phaser), used by the scene and the tests.
export type ModuloReator = { id: string; ligado: boolean };

export type TarefaReator = {
  modulos: ModuloReator[];
  /** Ignition charge, from 0 to 1. Only rises once all 3 modules are on. */
  carga: number;
};

export const SEGUNDOS_PARA_CARREGAR = 2.5;
export const SEGUNDOS_PARA_ESVAZIAR = 6;

export function criarTarefaReator(): TarefaReator {
  return {
    modulos: [
      { id: 'bomba', ligado: false },
      { id: 'tubulacao', ligado: false },
      { id: 'gerador', ligado: false },
    ],
    carga: 0,
  };
}

export function alternarModulo(tarefa: TarefaReator, id: string): TarefaReator {
  return {
    ...tarefa,
    modulos: tarefa.modulos.map((modulo) => modulo.id === id ? { ...modulo, ligado: !modulo.ligado } : modulo),
  };
}

/** All modules are on (the ignition may still be missing). */
export function tarefaConcluida(tarefa: TarefaReator) {
  return tarefa.modulos.every((modulo) => modulo.ligado);
}

/** The next module in the sequence, or null when all are already on. */
export function proximoModulo(tarefa: TarefaReator): string | null {
  return tarefa.modulos.find((m) => !m.ligado)?.id ?? null;
}

/** Switches the module on only if it is its turn; out of order returns the same object (no punishment). */
export function ligarEmOrdem(tarefa: TarefaReator, id: string): TarefaReator {
  if (proximoModulo(tarefa) !== id) return tarefa;
  return alternarModulo(tarefa, id);
}

export function ignicaoLiberada(tarefa: TarefaReator) {
  return tarefaConcluida(tarefa);
}

/** Holding the button raises the charge; releasing it lowers it slowly. With the modules off nothing happens. */
export function carregar(tarefa: TarefaReator, dt: number, segurando: boolean): TarefaReator {
  if (!ignicaoLiberada(tarefa)) return tarefa;
  const delta = segurando ? dt / SEGUNDOS_PARA_CARREGAR : -dt / SEGUNDOS_PARA_ESVAZIAR;
  const carga = Math.max(0, Math.min(1, tarefa.carga + delta));
  return carga === tarefa.carga ? tarefa : { ...tarefa, carga };
}

export function reatorOnline(tarefa: TarefaReator) {
  return tarefaConcluida(tarefa) && tarefa.carga >= 1;
}
