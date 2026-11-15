// Generated with AI assistance (Claude). See README, "Use of AI tools".
// The prize for finishing a side mission (the optional expeditions of engine/exploracao.ts): exactly ONE
// prize per mission, drawn at random. Most prizes are customization (a new astronaut, a hat or glasses, a
// face on the visor, a paint color for the base); resources are the minority and the battery is rare.
// Harder missions make the customization prizes likelier. Something already owned is never drawn again,
// and a prize that would do nothing (oxygen already full, no radiation to take off) is left out. No Phaser.
import type { TipoExpedicao } from './expedicao.ts';
import { ACESSORIOS, acessorioPorId, doEspaco } from '../dados/acessorios.ts';
import { CORES_BASE, corPorId } from '../dados/cores.ts';
import { SKINS } from '../dados/skins.ts';

export type Premio =
  | { tipo: 'bateria'; qtd: number }
  | { tipo: 'oxigenio'; qtd: number }
  | { tipo: 'radiacao'; qtd: number }
  | { tipo: 'cor'; id: string }
  | { tipo: 'acessorio'; id: string }   // a hat, glasses or a face (dados/acessorios.ts)
  | { tipo: 'skin'; id: string };       // a different astronaut

// What the player has now. `indisponiveis` are items whose picture is not ready (they are never drawn).
export type Posse = { oxigenio: number; dose: number; acessorios: string[]; cores: string[]; skins: string[] };

// What a prize is for: a side mission (an expedition) or a standard room task ('sala').
export type TipoPremio = TipoExpedicao | 'sala';
// A standard room task gives a prize only sometimes: 70% of the times it is finished.
export const CHANCE_PREMIO_SALA = 0.7;

// How hard the mission is, 1 to 3.
export const NIVEL: Record<TipoPremio, 1 | 2 | 3> = {
  sala: 1,                                                             // a short room task
  ferramenta: 1,                                                       // one spot, bring it back
  corrida: 2, amostra: 2, meteorito: 2, redemoinho: 2, vazamentos: 2,
  balizas: 3, tubos: 3, gelo: 3,                                       // three far spots, or a task to play
};

// Base chances. Customization is 80+ of 105 (about 78%); the battery is 3 (under 3%).
export const PESOS = { skin: 22, chapeu: 26, carinha: 22, cor: 8, oxigenio: 10, radiacao: 10, bateria: 3 } as const;

export const skinsDePremio = () => SKINS.filter((s) => s.premio).map((s) => s.id);
const ehCarinha = (id: string) => doEspaco('carinha').some((a) => a.id === id);

export function sortearPremio(tipo: TipoPremio, posse: Posse, sorte: () => number = Math.random): Premio {
  const nivel = NIVEL[tipo] ?? 1;
  const mais = 1 + (nivel - 1) * 0.5;                      // customization: x1, x1.5, x2
  const faltaChapeu = ACESSORIOS.filter((a) => !ehCarinha(a.id) && !posse.acessorios.includes(a.id)).map((a) => a.id);
  const faltaCarinha = ACESSORIOS.filter((a) => ehCarinha(a.id) && !posse.acessorios.includes(a.id)).map((a) => a.id);
  const faltaCor = CORES_BASE.filter((c) => !posse.cores.includes(c.id)).map((c) => c.id);
  const faltaSkin = skinsDePremio().filter((id) => !posse.skins.includes(id));
  const opcoes: { p: (i: number) => Premio; peso: number }[] = [];
  const escolher = (lista: string[], i: number) => lista[Math.min(lista.length - 1, Math.floor(i * lista.length))];
  if (faltaSkin.length) opcoes.push({ peso: PESOS.skin * mais, p: (i) => ({ tipo: 'skin', id: escolher(faltaSkin, i) }) });
  if (faltaChapeu.length) opcoes.push({ peso: PESOS.chapeu * mais, p: (i) => ({ tipo: 'acessorio', id: escolher(faltaChapeu, i) }) });
  if (faltaCarinha.length) opcoes.push({ peso: PESOS.carinha * mais, p: (i) => ({ tipo: 'acessorio', id: escolher(faltaCarinha, i) }) });
  if (faltaCor.length) opcoes.push({ peso: PESOS.cor * mais, p: (i) => ({ tipo: 'cor', id: escolher(faltaCor, i) }) });
  if (posse.oxigenio < 100) opcoes.push({ peso: PESOS.oxigenio, p: () => ({ tipo: 'oxigenio', qtd: Math.min(2 + nivel, 100 - posse.oxigenio) }) });
  if (posse.dose > 0) opcoes.push({ peso: PESOS.radiacao, p: () => ({ tipo: 'radiacao', qtd: Math.min(1 + nivel, posse.dose) }) });
  opcoes.push({ peso: PESOS.bateria, p: () => ({ tipo: 'bateria', qtd: nivel === 3 ? 2 : 1 }) });
  const total = opcoes.reduce((a, o) => a + o.peso, 0);
  let x = sorte() * total;
  for (const o of opcoes) {
    if (x < o.peso) return o.p(sorte());                   // a second draw picks which one of the kind
    x -= o.peso;
  }
  return opcoes[opcoes.length - 1].p(sorte());
}

export function textoDoPremio(p: Premio): string {
  switch (p.tipo) {
    case 'bateria': return `🎁 Rare prize: +${p.qtd} batter${p.qtd === 1 ? 'y' : 'ies'}!`;
    case 'oxigenio': return `🎁 Prize: +${p.qtd} oxygen!`;
    case 'radiacao': return `🎁 Prize: -${p.qtd} radiation!`;
    case 'cor': return `🎁 Prize: ${corPorId(p.id)?.nome ?? p.id} paint for your base!`;
    case 'acessorio': return `🎁 Prize: ${acessorioPorId(p.id)?.nome ?? p.id}!`;
    case 'skin': return `🎁 Prize: a new astronaut, ${SKINS.find((s) => s.id === p.id)?.nome ?? p.id}!`;
  }
}
