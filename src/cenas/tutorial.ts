// First-run guide, played on the real map (guia.ts): arrows point at what to do next and each step
// ends when the player does it. This file holds the rules (which step, what to say); it never changes
// mission state. ?tutorial in the address plays it again.
export const CHAVE_TUTORIAL = 'lunar-odyssey-tutorial-visto';

// Day 1 on the Moon: walk, jump, pick up the batteries at the Battery Bank (charged by an energy task),
// power Life Support and the Rocket Workshop (each room's first battery comes with a task), share the
// rest, end the day. The same order as the objective row (Interface.ts, 1/4 to 4/4).
export type Passo = 'mover' | 'pular' | 'banco' | 'suporte' | 'oficina' | 'resto' | 'fim' | 'pronto';
export type AlvoGuia = 'banco' | 'suporte' | 'oficina' | 'salas' | 'fim' | null;
export type ContextoGuia = {
  moveu: boolean; pulou: boolean;
  noHabitat: number; carregando: number;   // batteries waiting at the Battery Bank / in hand
  oxigenio: number; meta: number;          // batteries given today to Life Support / the Rocket Workshop
  fase: string;
};
export type Descricao = { teclas: string[]; texto: string; alvo: AlvoGuia };

// The step is always derived from what the player has done, so a rebuilt HUD picks up where it was.
export function passoAtual(c: ContextoGuia): Passo {
  if (c.fase !== 'dia') return 'pronto';
  if (!c.moveu) return 'mover';
  if (!c.pulou) return 'pular';
  if (c.noHabitat > 0) return 'banco';
  if (c.carregando > 0 && !c.oxigenio) return 'suporte';
  if (c.carregando > 0 && !c.meta) return 'oficina';
  if (c.carregando > 0) return 'resto';
  return 'fim';
}

export function descrever(passo: Passo, _c?: ContextoGuia, movel = false): Descricao | null {
  // Touch screens: the joystick and the USE / JUMP buttons instead of the keys.
  if (movel) {
    switch (passo) {
      case 'mover': return { teclas: ['MOVE'], texto: 'Move with the joystick', alvo: null };
      case 'pular': return { teclas: ['JUMP'], texto: 'Tap JUMP! Moon gravity is weak', alvo: null };
      case 'banco': return { teclas: ['USE'], texto: 'Get batteries at the Battery Bank', alvo: 'banco' };
      case 'suporte': return { teclas: ['USE'], texto: 'Give 1 battery to Life Support', alvo: 'suporte' };
      case 'oficina': return { teclas: ['USE'], texto: 'Now 1 to the Rocket Workshop', alvo: 'oficina' };
      case 'resto': return { teclas: ['USE'], texto: 'Give the rest to any room', alvo: 'salas' };
      case 'fim': return { teclas: ['END DAY'], texto: 'All used! Tap END DAY', alvo: 'fim' };
      default: return null;
    }
  }
  switch (passo) {
    case 'mover': return { teclas: ['W', 'A', 'S', 'D'], texto: 'Walk! Or click the ground', alvo: null };
    case 'pular': return { teclas: ['SPACE'], texto: 'Jump! Moon gravity is weak', alvo: null };
    case 'banco': return { teclas: ['E'], texto: 'Get batteries at the Battery Bank', alvo: 'banco' };
    case 'suporte': return { teclas: ['E'], texto: 'Give 1 battery to Life Support', alvo: 'suporte' };
    case 'oficina': return { teclas: ['E'], texto: 'Now 1 to the Rocket Workshop', alvo: 'oficina' };
    case 'resto': return { teclas: ['E'], texto: 'Give the rest to any room', alvo: 'salas' };
    case 'fim': return { teclas: ['ENTER'], texto: 'All used! End the day', alvo: 'fim' };
    default: return null;
  }
}

type Armazenamento = { getItem(chave: string): string | null; setItem(chave: string, valor: string): void };
function armazenamentoSeguro(): Armazenamento | null {
  try { return typeof localStorage === 'undefined' ? null : localStorage; } catch { return null; }
}
export function tutorialJaVisto(armazenamento: Armazenamento | null = armazenamentoSeguro()) {
  try { return armazenamento?.getItem(CHAVE_TUTORIAL) === '1'; } catch { return false; }
}
export function marcarTutorialVisto(armazenamento: Armazenamento | null = armazenamentoSeguro()) {
  try { armazenamento?.setItem(CHAVE_TUTORIAL, '1'); } catch { /* optional persistence */ }
}
