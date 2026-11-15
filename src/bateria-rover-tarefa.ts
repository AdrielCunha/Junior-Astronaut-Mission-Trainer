// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Rules of "Swap the rover battery": pull the empty battery out, turn the new one until its + matches the
// slot, slide it in, then close the latch. A wrong-way battery does not go in (only a hint, no penalty).
// Pure functions, no Phaser, so node --test can run them. The scene (cenas/BateriaRoverTarefa.ts) only draws.
export type EtapaBateria = 'tirar' | 'encaixar' | 'travar' | 'pronto';
export type EstadoBateria = { etapa: EtapaBateria; giro: number };   // giro: quarter turns of the new battery, 0 = right way

export function criarBateria(semente = 1): EstadoBateria {
  return { etapa: 'tirar', giro: 1 + (Math.abs(semente) % 3) };   // never starts the right way
}

export function tirarVazia(e: EstadoBateria): EstadoBateria {
  return e.etapa === 'tirar' ? { ...e, etapa: 'encaixar' } : e;
}

// A quarter turn clockwise (only while the new battery is still out).
export function girar(e: EstadoBateria): EstadoBateria {
  return e.etapa === 'encaixar' ? { ...e, giro: (e.giro + 1) % 4 } : e;
}

export const posicaoCerta = (e: EstadoBateria) => e.giro === 0;

// Tries to slide the battery into the slot: it only fits the right way.
export function encaixar(e: EstadoBateria): EstadoBateria {
  return e.etapa === 'encaixar' && posicaoCerta(e) ? { ...e, etapa: 'travar' } : e;
}

export function travar(e: EstadoBateria): EstadoBateria {
  return e.etapa === 'travar' ? { ...e, etapa: 'pronto' } : e;
}

export const tarefaConcluida = (e: EstadoBateria) => e.etapa === 'pronto';
