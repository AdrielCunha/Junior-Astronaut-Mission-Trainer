// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Paint colors for the base modules, won as gifts in side missions (engine/presentes.ts). A color is a tint
// multiplied over the module's picture, so they are pale on purpose: dark tints turn the module to mud.
// The original look is the "no color" choice. No Phaser, so node --test can run it.
export type CorBase = { id: string; nome: string; tom: number };

export const CORES_BASE: CorBase[] = [
  { id: 'amarelo', nome: 'Sunny Yellow', tom: 0xfff0a0 },
  { id: 'azul', nome: 'Sky Blue', tom: 0xa8d0ff },
  { id: 'laranja', nome: 'Rocket Orange', tom: 0xffcf9c },
  { id: 'rosa', nome: 'Bubblegum Pink', tom: 0xffb8e0 },
  { id: 'vermelho', nome: 'Mars Red', tom: 0xffb0a8 },
  { id: 'roxo', nome: 'Nebula Purple', tom: 0xd0b8ff },
  { id: 'verde', nome: 'Garden Green', tom: 0xb0f0b8 },
];

export const corPorId = (id: string | undefined) => CORES_BASE.find((c) => c.id === id);

// Next choice when the player clicks a module: "no color" ('') first, then the colors won, in palette order.
export function proximaCor(atual: string, ganhas: string[]): string {
  const lista = ['', ...CORES_BASE.map((c) => c.id).filter((id) => ganhas.includes(id))];
  return lista[(Math.max(0, lista.indexOf(atual)) + 1) % lista.length];
}

// Two tints on top of each other (Mars's warm light and the paint): channel by channel.
export function multiplicarTom(a: number, b: number): number {
  const c = (s: number) => Math.round((((a >> s) & 255) * ((b >> s) & 255)) / 255);
  return (c(16) << 16) | (c(8) << 8) | c(0);
}
