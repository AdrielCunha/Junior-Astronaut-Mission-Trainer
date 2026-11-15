// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Ship stations: some of the ship's props are places where the commander can do a job (press E next to
// them). Each one plays its task once a day, so walking around the ship always has something to do.
// No Phaser, so node --test can run it.
export type Estacao = { cena: string; acao: string; recompensaOxigenio?: number };

export const ESTACOES: Record<string, Estacao> = {
  nave_cockpit: { cena: 'ManobraNaveTarefa', acao: 'Steer the ship' },
  nave_janela: { cena: 'LimparJanelaTarefa', acao: 'Clean the window' },
  nave_radio: { cena: 'ComunicacoesTarefa', acao: 'Tune the radio' },
  nave_plantas: { cena: 'HortaTarefa', acao: 'Water the garden', recompensaOxigenio: 1 },
};

// Equipment that lands on the Moon by cargo lander (engine/suprimentos.ts): each one is a station too, keyed
// by `mod_<type>`. Its task is a different one from its fix-it event (engine/eventos.ts), so both feel new.
export const ESTACOES_MODULO: Record<string, Estacao> = {
  antena: { cena: 'FiacaoTarefa', acao: 'Check the antenna cables' },
  estufa: { cena: 'HortaTarefa', acao: 'Water the lettuce', recompensaOxigenio: 1 },
  perfuratriz: { cena: 'ScannerGeloTarefa', acao: 'Find the best spot to drill' },
  rover: { cena: 'BateriaRoverTarefa', acao: 'Charge the cargo rover' },
};
export const chaveModulo = (tipo: string) => `mod_${tipo}`;
export const estacaoDoModulo = (tipo: string): Estacao | undefined => ESTACOES_MODULO[tipo];

// A station can be used while playing the day, once per day.
export const estacaoDisponivel = (id: string, feitasHoje: ReadonlySet<string>, fase: string) =>
  !!(ESTACOES[id] ?? ESTACOES_MODULO[id.replace(/^mod_/, '')]) && fase === 'dia' && !feitasHoje.has(id);

// The extra line under the prop's name and fact.
export function textoEstacao(id: string, feitasHoje: ReadonlySet<string>, fase: string): string {
  const e = ESTACOES[id];
  if (!e) return '';
  if (feitasHoje.has(id)) return '✓ Done today';
  return fase === 'dia' ? `Press E: ${e.acao}` : '';
}
