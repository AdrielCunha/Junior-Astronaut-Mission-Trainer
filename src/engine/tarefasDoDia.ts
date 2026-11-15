// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Which rooms have a task today. The standard (room) tasks do not come every day for every room: from day 2
// on only some of the rooms ask for one, and a different set each day. Day 1 teaches the basics, so every
// room has a task then. The choice depends only on the day and the world, so it needs no saving and the
// same day always gives the same rooms (after a reload too). No Phaser, so node --test can run it.
import type { Efeito } from '../regras.ts';

export const PRIMEIRO_DIA_COM_SORTEIO = 2;

// A small seeded generator (mulberry32): same seed, same sequence.
function gerador(semente: number) {
  let s = semente >>> 0;
  return () => {
    s = (s + 0x6D2B79F5) >>> 0;
    let t = s;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function salasComTarefaHoje(dia: number, mundo: string, salas: readonly Efeito[]): Efeito[] {
  const lista = [...new Set(salas)].sort();
  if (lista.length <= 1 || dia < PRIMEIRO_DIA_COM_SORTEIO) return lista;
  const rnd = gerador(Math.imul(dia, 2654435761) ^ [...mundo].reduce((a, ch) => Math.imul(a, 31) + ch.charCodeAt(0), 7));
  for (let i = lista.length - 1; i > 0; i--) {
    const j = Math.floor(rnd() * (i + 1));
    [lista[i], lista[j]] = [lista[j], lista[i]];
  }
  const quantas = Math.min(lista.length - 1, 1 + (rnd() < 0.5 ? 1 : 0));   // one or two rooms, never all of them
  return lista.slice(0, quantas);
}
