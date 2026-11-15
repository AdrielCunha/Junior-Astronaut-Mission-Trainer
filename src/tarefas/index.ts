// Generated with AI assistance (Claude). See README, "Use of AI tools".
// The task bank. A task is a short hands-on moment (a few seconds) the first time a room gets a
// battery each day. Tasks are visual and teach one real fact; they never change the game rules.
// To add a task: write one file like poeiraDuto.ts and put it in BANCO.
import type Phaser from 'phaser';
import type { Efeito } from '../regras';
import { poeiraDuto } from './poeiraDuto';
import { escudoSol } from './escudoSol';
import { escolherEntre } from './escolha';

// Screen box the task draws in; u is the UI scale (1 at 1100x650).
export type Area = { x: number; y: number; w: number; h: number; u: number };

export type Tarefa = {
  id: string;
  sala: Efeito;          // which room's bank it belongs to
  titulo: string;
  instrucao: string;     // one short line: what to do
  fato: string;          // shown when it is done
  fundo?: number;        // screen color, blue by default
  // Draws the task inside area and calls feito() once when the child finishes.
  // Use the scene's tweens, timers and input: they are cleared when the overlay closes.
  montar: (cena: Phaser.Scene, area: Area, feito: () => void) => void;
};

export const BANCO: Tarefa[] = [poeiraDuto, escudoSol];

export { CENAS_DA_SALA } from './escolha';
export type Escolha = { id: string; tarefa: Tarefa } | { id: string; cena: string };

// A random task for this room (bank or ready scene), not the same as last time when there is a choice.
export function escolher(sala: Efeito, ultima?: string, sorte: () => number = Math.random, mundo?: string): Escolha | undefined {
  const e = escolherEntre(sala, ultima, BANCO, sorte, mundo);
  if (!e) return undefined;
  return e.cena ? { id: e.id, cena: e.cena } : { id: e.id, tarefa: BANCO.find((t) => t.id === e.id)! };
}
