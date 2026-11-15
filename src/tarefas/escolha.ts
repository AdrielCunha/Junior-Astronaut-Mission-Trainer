// Which task a room plays: the bank's own tasks plus the ready-made task scenes (src/cenas/*Tarefa.ts)
// that match what the room does, so the battery you give a room is spent on something it would really do.
// Pure (no Phaser) so it can be tested; index.ts wraps it with the real bank.
import type { Efeito } from '../regras';

export const CENAS_DA_SALA: Partial<Record<Efeito, string[]>> = {
  oxigenio: ['TrocarFiltroCo2Tarefa', 'EquilibrarValvulasTarefa', 'FiltroO2Tarefa', 'OxigenioFaixaTarefa'],   // air: filters, valves, oxygen level
  blindagem: ['TaparTempestadeTarefa', 'FecharEscotilhasTarefa'],                                          // storm: water bags, hatches
  meta: ['PotenciaMotorTarefa', 'DirecaoTarefa'],                                                           // rocket: engine power, steering
};

// Extra scenes only on the ship (chapter 2): the Engines room also looks out of the window to find Earth.
export const CENAS_DA_NAVE: Partial<Record<Efeito, string[]>> = {
  meta: ['LimparJanelaTarefa', 'ManobraNaveTarefa'],
};

export type Opcao = { id: string; cena?: string };

// Not the same as last time when there is a choice.
export function escolherEntre(sala: Efeito, ultima: string | undefined, banco: { id: string; sala: Efeito }[], sorte: () => number, mundo?: string): Opcao | undefined {
  const todas: Opcao[] = [
    ...banco.filter((t) => t.sala === sala).map((t) => ({ id: t.id })),
    ...(CENAS_DA_SALA[sala] ?? []).map((cena) => ({ id: cena, cena })),
    ...(mundo === 'nave' ? CENAS_DA_NAVE[sala] ?? [] : []).map((cena) => ({ id: cena, cena })),
  ];
  const opcoes = todas.length > 1 ? todas.filter((t) => t.id !== ultima) : todas;
  return opcoes[Math.floor(sorte() * opcoes.length)];
}
