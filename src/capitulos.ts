// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Everything that changes from one chapter to the next: rules numbers, rooms, look, texts, data.
import lua from './dados/lua.json';
import nave from './dados/nave.json';
import marte from './dados/marte.json';
import { LUA, NAVE, MARTE } from './configs';
import type { Config, Efeito } from './regras';

export type Dia = {
  data: string;
  nivel: number; // real level, revealed at night
  previsao: number[]; // [min, max] forecast shown in the morning
  doseMedia: number;
  dosePico: number;
  aviso: string;
  curto: string; // one short line for the morning card
  fato: string;
  frio?: number;
  minima?: number;
  sol?: number;
};
export type Dados = { nota: string; doseCalma: number; instrumento: string; fontes: { nome: string; url: string }[]; dias: Dia[] };

// Fixed places on the map; the scene knows their geometry.
export type Lugar = 'esquerda' | 'direita' | 'baixo' | 'cima' | 'plataforma';
export type Equipamento = 'tanques' | 'escudo' | 'oficina' | 'motor' | 'aquecedor' | 'cupula';
export type Sala = { efeito: Efeito; nome: string; cor: number; papel: string; curto: string; lugar: Lugar; equipamento: Equipamento };

export type Capitulo = {
  numero: number;
  titulo: string;
  config: Config;
  dados: Dados;
  salas: Sala[];
  nomeMeta: string; // HUD bar and labels: "Rocket", "Trip", "Base"
  tema: 'lua' | 'nave' | 'marte';
  introducao: string[];
  vitoria: [string, string];
  metaIncompleta: string;
  licoes: string[];
  creditos: string; // footer line
  notaDados: string; // last line of the "Real NASA data" panel
};

const oxigenio = (nome: string, por: number, noite: number): Sala => ({
  efeito: 'oxigenio', nome, cor: 0x3b82f6, lugar: 'esquerda', equipamento: 'tanques', curto: 'Makes oxygen',
  papel: `Makes oxygen. Each battery gives +${por} oxygen. The crew breathes ${noite} every night.`,
});
const blindagem = (nome: string): Sala => ({
  efeito: 'blindagem', nome, cor: 0xeab308, lugar: 'direita', equipamento: 'escudo', curto: 'Blocks storm radiation',
  papel: 'Protects the crew from solar storms. It needs as many batteries as the storm level.',
});

const OBRAS = MARTE.obras!;

export const CAPITULOS: Capitulo[] = [
  {
    numero: 1,
    titulo: 'The Moon base',
    config: LUA,
    dados: lua,
    tema: 'lua',
    nomeMeta: 'Rocket',
    salas: [
      oxigenio('Life Support', LUA.oxigenioPorBateria, LUA.oxigenioPorNoite),
      blindagem('Radiation Shield'),
      { efeito: 'meta', nome: 'Rocket Workshop', cor: 0xf97316, lugar: 'baixo', equipamento: 'oficina', curto: 'Builds the rocket',
        papel: `Builds the rocket to Mars. Each battery adds ${LUA.metaPorBateria}%. Launch is on day ${LUA.dias}.` },
    ],
    introducao: [
      `Build a rocket to fly to Mars. Launch is on day ${LUA.dias}.`,
      `Every morning you get ${LUA.bateriasPorDia} batteries. Pick them up at the Battery Bank, then carry them to the rooms. Click a building or press E nearby.`,
    ],
    vitoria: ['Launch! The rocket is on its way to Mars.', 'Your crew made it through a real solar storm and launched on time.'],
    metaIncompleta: 'Launch day came and the rocket was not finished. The launch window closed.',
    licoes: [
      'Every battery has a cost: power for the rocket is power not used for oxygen or the shield.',
      'The Moon has no thick air and no magnetic field, so a base needs a radiation shield.',
      'Flares and CMEs are warnings: scientists watch the Sun to know when particles may come.',
      'Space weather forecasts are never sure: protect more when the warning signs are strong.',
    ],
    creditos: 'Storm data: NASA DONKI + LRO/CRaTER via OSDR RadLab. Archived, May 2024.',
    notaDados: 'LRO measures in lunar orbit, not on the ground. Oxygen, batteries and the rocket are simple models for learning, not measurements.',
  },
  {
    numero: 2,
    titulo: 'The trip to Mars',
    config: NAVE,
    dados: nave,
    tema: 'nave',
    nomeMeta: 'Trip',
    salas: [
      oxigenio('Air Recycler', NAVE.oxigenioPorBateria, NAVE.oxigenioPorNoite),
      blindagem('Storm Shelter'),
      { efeito: 'meta', nome: 'Engines', cor: 0x22d3ee, lugar: 'baixo', equipamento: 'motor', curto: 'Flies the ship to Mars',
        papel: `Pushes the ship toward Mars. Each battery adds ${NAVE.metaPorBateria}% of the trip. Arrival is on day ${NAVE.dias}.` },
    ],
    introducao: [
      `Reach Mars in ${NAVE.dias} days. You get ${NAVE.bateriasPorDia} batteries a day.`,
      'Deep space has no air and no magnetic field to block radiation.',
    ],
    vitoria: ['Mars orbit reached!', 'The ship crossed a real solar storm and arrived at Mars.'],
    metaIncompleta: 'The engines did not get enough power. The ship missed Mars.',
    licoes: [
      'In deep space nothing blocks radiation: shelters and water tanks protect the crew.',
      'A closed ship must recycle its air all the time.',
      'Real trips to Mars take about 7 months, so storms are hard to avoid.',
    ],
    creditos: 'Storm data: NASA DONKI + BioSentinel via OSDR RadLab. Archived, May 2024.',
    notaDados: 'BioSentinel was not flying to Mars, but it flies in the same kind of deep space. The trip is shortened from about 7 months to 5 days. Oxygen, batteries and the engines are simple models for learning.',
  },
  {
    numero: 3,
    titulo: 'The Mars base',
    config: MARTE,
    dados: marte,
    tema: 'marte',
    nomeMeta: 'Base',
    salas: [
      { ...oxigenio('Life Support', MARTE.oxigenioPorBateria, MARTE.oxigenioPorNoite),
        papel: `Build it first (${OBRAS.oxigenio} batteries). Then it makes oxygen: +${MARTE.oxigenioPorBateria} per battery. The crew breathes ${MARTE.oxigenioPorNoite} every night.` },
      { ...blindagem('Radiation Shield'),
        papel: `Build it first (${OBRAS.blindagem} batteries). Then it protects the crew: it needs as many batteries as the storm level.` },
      { efeito: 'aquecimento', nome: 'Heating', cor: 0xef4444, lugar: 'cima', equipamento: 'aquecedor', curto: 'Keeps machines warm',
        papel: `Build it first (${OBRAS.aquecimento} batteries). Then it keeps the machines warm at night. Each missing battery of heat costs 10 oxygen.` },
      { efeito: 'meta', nome: 'Habitat Dome', cor: 0xf97316, lugar: 'plataforma', equipamento: 'cupula', curto: "The crew's new home",
        papel: `The crew's new home. It takes ${OBRAS.meta} batteries to build. The whole base must be built by day ${MARTE.dias}.` },
    ],
    introducao: [
      `You landed with only a lander. Build a whole base in ${MARTE.dias} days!`,
      'Click a construction site to build it. Then send it batteries to make it work.',
      'What first? Mars nights are very cold, and a storm is coming.',
    ],
    vitoria: ['Welcome home! The Mars base is ready.', 'Your crew survived the Moon, deep space and Mars.'],
    metaIncompleta: 'The base was not finished in time. Mission Control called the crew back.',
    licoes: [
      'Mars has a thin atmosphere: it protects a little from radiation but cannot keep the heat in.',
      'NASA models like ENLIL predict when solar storms reach other planets.',
      'On a new planet, the weather and the Sun decide what you must build first.',
    ],
    creditos: 'Data: NASA DONKI + Curiosity RAD via OSDR RadLab + Curiosity REMS. Archived, May 2024.',
    notaDados: 'Curiosity measures on the surface of Mars, in Gale Crater. Oxygen, batteries, heating and the base are simple models for learning, not measurements.',
  },
];
