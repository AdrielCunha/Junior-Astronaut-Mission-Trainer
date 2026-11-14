// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Tune the radio": a message from Earth arrives as a target wave. The child turns two knobs
// (frequency and volume/gain) until their own wave matches the target for a while. Pure rules, no Phaser.

export type TarefaComunicacoes = {
  /** Frequency knob, 0 to 1 (how many wiggles the wave has). */
  frequencia: number;
  /** Volume (gain) knob, 0 to 1 (how tall the wave is). */
  ganho: number;
  /** Where the Earth message is on the frequency knob. */
  frequenciaAlvo: number;
  /** Where the Earth message is on the volume knob. */
  ganhoAlvo: number;
  /** Seconds of aligned waves accumulated. */
  travado: number;
};

export const LIMITE_ALINHAMENTO = 0.85;
export const TEMPO_TRAVA = 1.5;
const TOLERANCIA_ESCALA = 0.35;
const CICLOS_MIN = 1, CICLOS_MAX = 5;

const limitar = (v: number, a: number, b: number) => Math.min(b, Math.max(a, v));

export function criarTarefaComunicacoes(): TarefaComunicacoes {
  return { frequencia: 0.12, ganho: 0.9, frequenciaAlvo: 0.65, ganhoAlvo: 0.4, travado: 0 };
}

export function ajustarFrequencia(t: TarefaComunicacoes, frequencia: number): TarefaComunicacoes {
  return { ...t, frequencia: limitar(frequencia, 0, 1) };
}

export function ajustarGanho(t: TarefaComunicacoes, ganho: number): TarefaComunicacoes {
  return { ...t, ganho: limitar(ganho, 0, 1) };
}

/** Number of wiggles across the screen for a frequency knob position. */
export function ciclosDaOnda(frequencia: number): number {
  return CICLOS_MIN + limitar(frequencia, 0, 1) * (CICLOS_MAX - CICLOS_MIN);
}

/** Wave height from 0.15 to 1 (never flat) for a volume knob position. */
export function amplitudeDaOnda(ganho: number): number {
  return 0.15 + 0.85 * limitar(ganho, 0, 1);
}

/** How well the child's wave matches the target, from 0 to 1 (1 = identical). */
export function alinhamento(t: TarefaComunicacoes): number {
  const erro = Math.max(Math.abs(t.frequencia - t.frequenciaAlvo), Math.abs(t.ganho - t.ganhoAlvo));
  return Math.max(0, 1 - erro / TOLERANCIA_ESCALA);
}

export function ondasAlinhadas(t: TarefaComunicacoes): boolean {
  return alinhamento(t) >= LIMITE_ALINHAMENTO;
}

/** Advances time by dt seconds: aligned waves build the lock, otherwise it fades slowly (never below 0). */
export function passar(t: TarefaComunicacoes, dt: number): TarefaComunicacoes {
  if (t.travado >= TEMPO_TRAVA) return t;
  const travado = ondasAlinhadas(t) ? Math.min(TEMPO_TRAVA, t.travado + dt) : Math.max(0, t.travado - dt * 0.5);
  return travado === t.travado ? t : { ...t, travado };
}

export function progressoDaTrava(t: TarefaComunicacoes): number {
  return limitar(t.travado / TEMPO_TRAVA, 0, 1);
}

export function tarefaConcluida(t: TarefaComunicacoes): boolean {
  return t.travado >= TEMPO_TRAVA;
}
