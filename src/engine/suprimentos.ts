// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Equipment unlocked during chapter 1: on these mornings a cargo lander brings it to the base.
// Facts are real; the equipment does not change the rules yet (regras.ts), it is the hook for
// that when the team decides the numbers. No Phaser.
import type { TipoId } from './construcao.ts';

export type Suprimento = { dia: number; tipo: TipoId; aviso: string; fato: string };

export const SUPRIMENTOS: Suprimento[] = [
  { dia: 2, tipo: 'antena',
    aviso: 'A Comms Antenna lands today!',
    fato: 'A radio message takes just 1.3 seconds to reach Earth!' },
  { dia: 4, tipo: 'estufa',
    aviso: 'A Greenhouse lands today!',
    fato: 'Astronauts already grow lettuce on the Space Station!' },
  { dia: 5, tipo: 'perfuratriz',
    aviso: 'An Ice Drill lands today!',
    fato: 'Moon ice can become water, air and rocket fuel!' },
  { dia: 6, tipo: 'rover',
    aviso: 'A Rover lands today!',
    fato: 'NASA is building a new Moon car for Artemis astronauts!' },
];

export const suprimentoDoDia = (dia: number) => SUPRIMENTOS.find((s) => s.dia === dia);
// Cargo landers only bring equipment to the Moon base: not to the ship (nothing to land on in deep space)
// and not to Mars (its own equipment is part of the chapter).
export const suprimentoDoMundo = (mundo: string, dia: number) => mundo === 'lua' ? suprimentoDoDia(dia) : undefined;

// Retro-rocket landing at character scale (tiles, s): no air, so the only brake is the engine.
// Falls freely, then burns just hard enough to touch down at `toque` speed ("suicide burn").
export function empuxoDePouso(altura: number, vz: number, g: number, toque = 0.15, maximo = 4) {
  if (vz >= -toque || altura <= 0) return 0;
  const precisa = (vz * vz - toque * toque) / (2 * Math.max(altura, 0.01));   // deceleration needed
  if (precisa < g * 0.9 && altura > 1) return 0;                             // still falling free
  return Math.min(maximo * g, g + precisa);
}
