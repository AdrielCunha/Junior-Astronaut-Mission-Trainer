// First-run guide, played on the real map (guia.ts): arrows point at what to do next and each step
// ends when the player does it. This file holds the rules (which step, what to say); it never changes
// mission state. ?tutorial in the address plays it again.
export const CHAVE_TUTORIAL = 'lunar-odyssey-tutorial-visto';

export type Passo = 'mover' | 'pular' | 'habitat' | 'salas' | 'fim' | 'pronto';
export type AlvoGuia = 'habitat' | 'salas' | 'fim' | null;
export type ContextoGuia = {
  moveu: boolean; pulou: boolean;
  noHabitat: number; carregando: number; entregas: number;   // batteries waiting / in hand / given today
  fase: string;
};
export type Descricao = { teclas: string[]; texto: string; alvo: AlvoGuia };

// The step is always derived from what the player has done, so a rebuilt HUD picks up where it was.
export function passoAtual(c: ContextoGuia): Passo {
  if (c.fase !== 'dia') return 'pronto';
  if (!c.moveu) return 'mover';
  if (!c.pulou) return 'pular';
  if (c.entregas === 0 && c.noHabitat > 0) return 'habitat';
  if (c.entregas === 0) return 'salas';
  return 'fim';
}

export function descrever(passo: Passo, c: ContextoGuia, movel = false): Descricao | null {
  if (movel) {
    switch (passo) {
      case 'mover': return { teclas: ['MOVE'], texto: 'Move with the joystick', alvo: null };
      case 'pular': return { teclas: ['JUMP'], texto: 'Tap JUMP to leap on the Moon', alvo: null };
      case 'habitat': return { teclas: ['USE'], texto: 'Reach the Battery Bank and tap USE', alvo: 'habitat' };
      case 'salas': return { teclas: ['USE'], texto: 'Reach a room and tap USE to deliver a battery', alvo: 'salas' };
      case 'fim': return c.carregando > 0 || c.noHabitat > 0
        ? { teclas: ['USE'], texto: 'Deliver the remaining batteries', alvo: 'salas' }
        : { teclas: ['END DAY'], texto: 'All used! Tap END DAY', alvo: 'fim' };
      default: return null;
    }
  }
  switch (passo) {
    case 'mover': return { teclas: ['W', 'A', 'S', 'D'], texto: 'Walk around, or click the ground', alvo: null };
    case 'pular': return { teclas: ['SPACE'], texto: 'Jump! Gravity is weak on the Moon', alvo: null };
    case 'habitat': return { teclas: ['E'], texto: 'Go to the Habitat and pick up the batteries', alvo: 'habitat' };
    case 'salas': return { teclas: ['E'], texto: 'Take them to a room and give it a battery', alvo: 'salas' };
    case 'fim':
      return c.carregando > 0 || c.noHabitat > 0
        ? { teclas: ['E'], texto: 'Share all the batteries between the rooms', alvo: 'salas' }
        : { teclas: ['ENTER'], texto: 'All used! End the day', alvo: 'fim' };
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
