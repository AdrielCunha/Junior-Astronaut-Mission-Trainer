// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Ship stations: some of the ship's props are places where the commander can do a job (press E next to
// them). Each one plays its task once a day, so walking around the ship always has something to do.
// No Phaser, so node --test can run it.
export type Estacao = { cena: string; acao: string };

export const ESTACOES: Record<string, Estacao> = {
  nave_cockpit: { cena: 'ManobraNaveTarefa', acao: 'Steer the ship' },
  nave_janela: { cena: 'LimparJanelaTarefa', acao: 'Clean the window' },
  nave_radio: { cena: 'ComunicacoesTarefa', acao: 'Tune the radio' },
  nave_plantas: { cena: 'HortaTarefa', acao: 'Water the garden' },
};

// A station can be used while playing the day, once per day.
export const estacaoDisponivel = (id: string, feitasHoje: ReadonlySet<string>, fase: string) =>
  !!ESTACOES[id] && fase === 'dia' && !feitasHoje.has(id);

// The extra line under the prop's name and fact.
export function textoEstacao(id: string, feitasHoje: ReadonlySet<string>, fase: string): string {
  const e = ESTACOES[id];
  if (!e) return '';
  if (feitasHoje.has(id)) return '✓ Done today';
  return fase === 'dia' ? `Press E: ${e.acao}` : '';
}
