// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Equipment unlocked during chapter 1: on these mornings a cargo lander brings it to the base.
// Facts are real; the equipment does not change the rules yet (regras.ts), it is the hook for
// that when the team decides the numbers. No Phaser.
import type { TipoId } from './construcao.ts';

export type Suprimento = { dia: number; tipo: TipoId; aviso: string; fato: string };

export const SUPRIMENTOS: Suprimento[] = [
  { dia: 2, tipo: 'antena',
    aviso: 'A cargo lander is bringing a big Comms Antenna today.',
    fato: 'Radio waves travel at the speed of light: a message takes about 1.3 seconds from the Moon to Earth.' },
  { dia: 4, tipo: 'estufa',
    aviso: 'A cargo lander is bringing a Greenhouse today.',
    fato: 'Plants breathe in carbon dioxide and give back oxygen. Astronauts already grow lettuce in the Veggie garden on the Space Station.' },
  { dia: 5, tipo: 'perfuratriz',
    aviso: 'A cargo lander is bringing an Ice Drill today.',
    fato: 'Some craters near the south pole never see the Sun and hold water ice. Ice can become drinking water, oxygen and rocket fuel.' },
  { dia: 6, tipo: 'rover',
    aviso: 'A cargo lander is bringing a Rover today.',
    fato: 'NASA is designing a Lunar Terrain Vehicle so Artemis astronauts can drive far from where they land.' },
];

export const suprimentoDoDia = (dia: number) => SUPRIMENTOS.find((s) => s.dia === dia);

// Retro-rocket landing at character scale (tiles, s): no air, so the only brake is the engine.
// Falls freely, then burns just hard enough to touch down at `toque` speed ("suicide burn").
export function empuxoDePouso(altura: number, vz: number, g: number, toque = 0.15, maximo = 4) {
  if (vz >= -toque || altura <= 0) return 0;
  const precisa = (vz * vz - toque * toque) / (2 * Math.max(altura, 0.01));   // deceleration needed
  if (precisa < g * 0.9 && altura > 1) return 0;                             // still falling free
  return Math.min(maximo * g, g + precisa);
}
