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
    aviso: '📡 Radio static! Mission Control cannot hear us. Go to the Comms Antenna and tune the radio.',
    fato: 'Radio waves travel at the speed of light, so a message takes about 1.3 seconds to reach Earth.' },
  { id: 'dados', modulo: 'antena', cena: 'TransferirDadosTarefa', peso: 2,
    aviso: '📡 Earth is waiting for the science data! Aim the Comms Antenna at Earth to send it.',
    fato: 'The antenna must point right at Earth. The Moon always shows the same face to us, so Earth hardly moves in the sky.' },
  { id: 'fiacao', modulo: 'eclusa', cena: 'FiacaoTarefa', peso: 2,
    aviso: '💡 A lamp went dark at the Airlock! Follow its wire and find the damage.',
    fato: 'Engineers test a wire stretch by stretch to find a fault, just like you did.' },
  // Equipment that arrives by cargo lander.
  { id: 'estufa', modulo: 'estufa', cena: 'EquilibrarValvulasTarefa', peso: 2,
    aviso: '🌱 The Greenhouse air is out of balance! Turn the valves until O₂ and CO₂ are in the green.',
    fato: 'Plants breathe in CO₂ and give back oxygen, but they need the right mix of gases to grow.' },
  { id: 'furadeira', modulo: 'perfuratriz', cena: 'ColapsoReatorTarefa', peso: 2,
    aviso: '🔥 The Ice Drill is overheating! Cool the hot spots before it breaks.',
    fato: 'Drilling makes heat. With no air on the Moon, machines can only lose heat by radiating it away.' },
  { id: 'rover', modulo: 'rover', cena: 'MapearRotaTarefa', peso: 2,
    aviso: '🚙 The Rover lost its way! Map the route by joining the stars in order.',
    fato: 'Explorers have always used the stars to find their way. On the Moon there is no GPS yet!' },
];

// Scripted by the real sky: the day the Sun really did it, the alarm goes off (one per day, always).
const ALARMES: Record<string, Omit<EventoDef, 'id' | 'peso'>> = {
  flare: { modulo: 'blindagem', cena: 'FecharEscotilhasTarefa', alarme: true, efeito: 'radiacao',
    aviso: '☢ RADIATION ALARM! {nasa} Run to the Radiation Shield and close the hatches!',
    fato: 'A flare is a flash of X-rays. It reaches the Moon in about 8 minutes, so there is no time to waste.' },
  cme: { modulo: 'blindagem', cena: 'TaparTempestadeTarefa', alarme: true, efeito: 'radiacao',
    aviso: '☢ RADIATION ALARM! {nasa} Go to the Radiation Shield and block the storm with water bags!',
    fato: 'Water is a good radiation shield. Astronauts on the Space Station use water bags the same way in a storm.' },
  particulas: { modulo: 'blindagem', cena: 'FecharEscotilhasTarefa', alarme: true, efeito: 'radiacao',
    aviso: '☢ RADIATION ALARM! {nasa} Run to the Radiation Shield and close the hatches!',
    fato: 'Solar particles are very fast protons. Thin walls do not stop them, so a base needs shielding.' },
  geomagnetica: { modulo: 'antena', cena: 'ComunicacoesTarefa',
    aviso: '📡 {nasa} The storm is jamming the radio! Go to the Comms Antenna and tune it.',
    fato: 'Solar storms disturb radio. On Earth this one even made auroras far from the poles.' },
  gigante: { modulo: 'blindagem', cena: 'TaparTempestadeTarefa', alarme: true, efeito: 'radiacao',
    aviso: '☢ RADIATION ALARM! {nasa} Block the storm at the Radiation Shield!',
    fato: 'The Moon has no thick air and no magnetic field, so a flare this big hits the base directly.' },
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
