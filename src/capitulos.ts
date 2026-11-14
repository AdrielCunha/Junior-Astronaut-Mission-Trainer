// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Everything that changes from one chapter to the next: rules numbers, rooms, look, texts, data.
import lua from './dados/lua.json';
import nave from './dados/nave.json';
import marte from './dados/marte.json';
import type { Config, Efeito } from './regras';

export type Dia = {
  data: string;
  nivel: number;
  doseMedia: number;
  dosePico: number;
  aviso: string;
  fato: string;
  frio?: number;
  minima?: number;
  sol?: number;
};
export type Dados = { nota: string; doseCalma: number; instrumento: string; fontes: { nome: string; url: string }[]; dias: Dia[] };

// Fixed places on the map; the scene knows their geometry.
export type Lugar = 'esquerda' | 'direita' | 'baixo' | 'cima';
export type Equipamento = 'tanques' | 'escudo' | 'oficina' | 'motor' | 'construcao' | 'aquecedor';
export type Sala = { efeito: Efeito; nome: string; cor: number; papel: string; lugar: Lugar; equipamento: Equipamento };

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
  efeito: 'oxigenio', nome, cor: 0x3b82f6, lugar: 'esquerda', equipamento: 'tanques',
  papel: `Makes oxygen. Each battery gives +${por} oxygen. The crew breathes ${noite} every night.`,
});
const blindagem = (nome: string): Sala => ({
  efeito: 'blindagem', nome, cor: 0xeab308, lugar: 'direita', equipamento: 'escudo',
  papel: 'Protects the crew from solar storms. It needs as many batteries as the storm level.',
});

const LUA: Config = { dias: 8, bateriasPorDia: 5, oxigenioInicial: 60, oxigenioPorBateria: 10, oxigenioPorNoite: 10, metaPorBateria: 4 };
const NAVE: Config = { dias: 5, bateriasPorDia: 4, oxigenioInicial: 60, oxigenioPorBateria: 10, oxigenioPorNoite: 15, metaPorBateria: 15 };
const MARTE: Config = { dias: 8, bateriasPorDia: 5, oxigenioInicial: 60, oxigenioPorBateria: 10, oxigenioPorNoite: 10, metaPorBateria: 6 };

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
      { efeito: 'meta', nome: 'Rocket Workshop', cor: 0xf97316, lugar: 'baixo', equipamento: 'oficina',
        papel: `Builds the rocket to Mars. Each battery adds ${LUA.metaPorBateria}%. Launch is on day ${LUA.dias}.` },
    ],
    introducao: [
      `Your crew of four lives on the Moon. Your mission: build a rocket to fly to Mars. Launch day is May 12, 2024, in ${LUA.dias} days.`,
      `Every morning the solar panels charge ${LUA.bateriasPorDia} batteries. Click a room and your commander carries a battery there.`,
    ],
    vitoria: ['Launch! The rocket is on its way to Mars.', 'Your crew made it through a real solar storm and launched on time.'],
    metaIncompleta: 'Launch day came and the rocket was not finished. The launch window closed.',
    licoes: [
      'Every battery has a cost: power for the rocket is power not used for oxygen or the shield.',
      'The Moon has no thick air and no magnetic field, so a base needs a radiation shield.',
      'Flares and CMEs are warnings: scientists watch the Sun to know when particles may come.',
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
      { efeito: 'meta', nome: 'Engines', cor: 0x22d3ee, lugar: 'baixo', equipamento: 'motor',
        papel: `Pushes the ship toward Mars. Each battery adds ${NAVE.metaPorBateria}% of the trip. Arrival is on day ${NAVE.dias}.` },
    ],
    introducao: [
      `The rocket is now a spaceship. In ${NAVE.dias} days it must reach Mars.`,
      `The ship has ${NAVE.bateriasPorDia} batteries a day. In a closed ship the crew uses more air: ${NAVE.oxigenioPorNoite} every night.`,
      'Out here there is no magnetic field and no air to block radiation. The crew carries the radiation dose from the Moon.',
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
      oxigenio('Life Support', MARTE.oxigenioPorBateria, MARTE.oxigenioPorNoite),
      blindagem('Radiation Shield'),
      { efeito: 'meta', nome: 'Base Builder', cor: 0xf97316, lugar: 'baixo', equipamento: 'construcao',
        papel: `Builds the new Mars base. Each battery adds ${MARTE.metaPorBateria}%. It must be ready on day ${MARTE.dias}.` },
      { efeito: 'aquecimento', nome: 'Heating', cor: 0xef4444, lugar: 'cima', equipamento: 'aquecedor',
        papel: `Keeps the machines warm at night. Without enough heat, oxygen drops 10 more per missing battery.` },
    ],
    introducao: [
      `The crew landed on Mars. In ${MARTE.dias} days they must build a base to live in.`,
      `Mars nights are very cold. The night temperatures come from NASA's Curiosity rover. Heating needs batteries every night.`,
      'The thin Martian air blocks a little radiation, but not all of it.',
    ],
    vitoria: ['Welcome home! The Mars base is ready.', 'Your crew survived the Moon, deep space and Mars.'],
    metaIncompleta: 'The base was not finished in time. Mission Control called the crew back.',
    licoes: [
      'Mars has a thin atmosphere: it protects a little from radiation but cannot keep the heat in.',
      'NASA models like ENLIL predict when solar storms reach other planets.',
      'Living on Mars means balancing air, heat, protection and building.',
    ],
    creditos: 'Data: NASA DONKI + Curiosity RAD via OSDR RadLab + Curiosity REMS. Archived, May 2024.',
    notaDados: 'Curiosity measures on the surface of Mars, in Gale Crater. Oxygen, batteries, heating and the base are simple models for learning, not measurements.',
  },
];
