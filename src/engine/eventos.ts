// Random events of the day: something on the base breaks and one ready-made task (src/cenas/*Tarefa.ts)
// fixes it, at the module that task belongs to (the radio task at the Comms Antenna, ...).
// Modules that arrive by cargo lander can break too, once they have landed. No Phaser; the chances live here.
import type { TipoId } from './construcao.ts';

export type EventoDef = {
  id: string;
  modulo: TipoId;       // where the player goes to fix it
  cena: string;         // the task scene that fixes it
  peso: number;         // how likely it is, compared with the other events that can happen
  aviso: string;        // the notice when it happens
  fato: string;         // shown when it is fixed
  alarme?: boolean;     // radiation alarm: red screen edge and a siren
  efeito?: 'radiacao';  // fixed: radiation dose goes down; ignored: it goes up (else a bonus battery)
};

// Radiation alarms are tied to the real NASA space-weather days of the chapter (dados/lua.json, NASA DONKI
// and LRO/CRaTER). {nasa} is replaced by that day's short real headline.
export const DOSE_ALARME = 5;

export const EVENTOS: EventoDef[] = [
  { id: 'radio', modulo: 'antena', cena: 'ComunicacoesTarefa', peso: 3,
    aviso: '📡 Radio static! Fix the Comms Antenna.',
    fato: 'Radio is as fast as light: 1.3 seconds to Earth!' },
  { id: 'dados', modulo: 'antena', cena: 'TransferirDadosTarefa', peso: 2,
    aviso: '📡 Send our data to Earth! Go to the Comms Antenna.',
    fato: 'From the Moon, Earth hardly moves in the sky!' },
  { id: 'fiacao', modulo: 'eclusa', cena: 'FiacaoTarefa', peso: 2,
    aviso: '🔧 A lamp went dark! Fix the Airlock wires.',
    fato: 'Engineers find faults step by step, just like you!' },
  // Equipment that arrives by cargo lander.
  { id: 'estufa', modulo: 'estufa', cena: 'EquilibrarValvulasTarefa', peso: 2,
    aviso: '🌱 The Greenhouse air is wrong! Fix the valves.',
    fato: 'Plants breathe in CO₂ and give back oxygen!' },
  { id: 'furadeira', modulo: 'perfuratriz', cena: 'ColapsoReatorTarefa', peso: 2,
    aviso: '🔥 The Ice Drill is too hot! Cool it down.',
    fato: 'No air on the Moon means no wind to cool machines!' },
  { id: 'rover', modulo: 'rover', cena: 'MapearRotaTarefa', peso: 2,
    aviso: '🚙 The Rover is lost! Map a route with the stars.',
    fato: 'There is no GPS on the Moon yet. Stars help!' },
];

// Scripted by the real sky: the day the Sun really did it, the alarm goes off (one per day, always).
const ALARMES: Record<string, Omit<EventoDef, 'id' | 'peso'>> = {
  // Day 2: lock the Shield's door with its code, painted in a corner of the map (engine/senha.ts).
  flare: { modulo: 'blindagem', cena: 'SenhaEscudoTarefa', alarme: true, efeito: 'radiacao',
    aviso: '☢ RADIATION ALARM! {nasa} Run to the Radiation Shield! Its door code is painted in a corner of the map.',
    fato: 'A flare reaches the Moon in just 8 minutes!' },
  cme: { modulo: 'blindagem', cena: 'TaparTempestadeTarefa', alarme: true, efeito: 'radiacao',
    aviso: '☢ RADIATION ALARM! {nasa} Run to the Radiation Shield!',
    fato: 'Water is a great radiation shield!' },
  particulas: { modulo: 'blindagem', cena: 'FecharEscotilhasTarefa', alarme: true, efeito: 'radiacao',
    aviso: '☢ RADIATION ALARM! {nasa} Run to the Radiation Shield!',
    fato: 'Solar particles are super fast. Thin walls cannot stop them!' },
  geomagnetica: { modulo: 'antena', cena: 'ComunicacoesTarefa',
    aviso: '📡 {nasa} The radio is jammed! Fix the Comms Antenna.',
    fato: 'This storm even made auroras on Earth!' },
  gigante: { modulo: 'blindagem', cena: 'TaparTempestadeTarefa', alarme: true, efeito: 'radiacao',
    aviso: '☢ RADIATION ALARM! {nasa} Run to the Radiation Shield!',
    fato: 'With no air, big flares hit the Moon directly!' },
};
// Chapter day (May 5-12, 2024) -> the real event of that day.
const DIA_DO_ALARME: Record<number, keyof typeof ALARMES> = { 2: 'flare', 4: 'cme', 5: 'particulas', 6: 'geomagnetica', 7: 'gigante' };

export function alarmeDoDia(dia: number): EventoDef | undefined {
  const k = DIA_DO_ALARME[dia];
  return k ? { id: `nasa-${k}`, peso: 0, ...ALARMES[k] } : undefined;
}

export const PRIMEIRO_DIA_COM_EVENTO = 2;   // day 1 is for learning the basics
export const CHANCE_BASE = 0.6;             // chance that today has an event
export const CHANCE_POR_DIA_CALMO = 0.2;    // more likely after each calm day, so it is never dull for long
export const ESPERA_MIN = 20, ESPERA_MAX = 45;   // seconds of play after the morning before it happens

export function chanceDoDia(dia: number, diasCalmos: number) {
  if (dia < PRIMEIRO_DIA_COM_EVENTO) return 0;
  return Math.min(1, CHANCE_BASE + CHANCE_POR_DIA_CALMO * Math.max(0, diasCalmos));
}

export const haEventoHoje = (dia: number, diasCalmos: number, sorte: () => number = Math.random) =>
  sorte() < chanceDoDia(dia, diasCalmos);

// Lingering on the same day: with no event waiting or open, the longer the day goes on the more likely
// something breaks. Checked every DEMORA_PASSO seconds of play; the chance of each check grows from 0
// (DEMORA_MIN seconds calm) to certain (DEMORA_MAX), so a long day always ends up with something to fix.
export const DEMORA_MIN = 60, DEMORA_MAX = 240, DEMORA_PASSO = 10;

export function chanceDaDemora(dia: number, segundosCalmos: number) {
  if (dia < PRIMEIRO_DIA_COM_EVENTO || segundosCalmos < DEMORA_MIN) return 0;
  return Math.min(1, (segundosCalmos - DEMORA_MIN) / (DEMORA_MAX - DEMORA_MIN));
}

export const eventoPorDemora = (dia: number, segundosCalmos: number, sorte: () => number = Math.random) =>
  sorte() < chanceDaDemora(dia, segundosCalmos);

export const esperaDoEvento = (sorte: () => number = Math.random) => ESPERA_MIN + sorte() * (ESPERA_MAX - ESPERA_MIN);
export const esperaDoAlarme = (sorte: () => number = Math.random) => 8 + sorte() * 7;   // alarms come sooner

// Weighted draw among the events whose module exists on the base, not the same as the last one when there is a choice.
export function sortearEvento(presentes: TipoId[], ultimo?: string, sorte: () => number = Math.random): EventoDef | undefined {
  const possiveis = EVENTOS.filter((e) => presentes.includes(e.modulo));
  const opcoes = possiveis.length > 1 ? possiveis.filter((e) => e.id !== ultimo) : possiveis;
  const total = opcoes.reduce((a, e) => a + e.peso, 0);
  let x = sorte() * total;
  for (const e of opcoes) { x -= e.peso; if (x < 0) return e; }
  return opcoes[opcoes.length - 1];
}
