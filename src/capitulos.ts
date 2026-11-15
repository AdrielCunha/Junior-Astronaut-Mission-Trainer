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
      `Build a rocket. Launch on day ${LUA.dias}!`,
      `${LUA.bateriasPorDia} batteries every morning at the Battery Bank.`,
    ],
    vitoria: ['Launch! To Mars!', 'You beat a real solar storm and launched on time!'],
    metaIncompleta: 'The rocket was not ready in time.',
    licoes: [
      'Every battery is a choice: air, shield or rocket.',
      'The Moon has no air to block radiation. A shield helps!',
      'Scientists watch the Sun to warn astronauts in time.',
    ],
    creditos: 'Storm data: NASA DONKI + LRO/CRaTER via OSDR RadLab. Archived, May 2024.',
    notaDados: 'Real NASA storm data from May 2024. Batteries, oxygen and the rocket are game rules.',
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
      `Fly to Mars in ${NAVE.dias} days!`,
      'Deep space has no shield. Watch the radiation!',
    ],
    vitoria: ['Mars orbit reached!', 'You crossed a real solar storm and reached Mars!'],
    metaIncompleta: 'The engines needed more power. We missed Mars.',
    licoes: [
      'In deep space, water walls protect the crew.',
      'A closed ship must clean its air all the time.',
      'A real trip to Mars takes about 7 months!',
    ],
    creditos: 'Storm data: NASA DONKI + BioSentinel via OSDR RadLab. Archived, May 2024.',
    notaDados: 'Real deep-space data from NASA BioSentinel, May 2024. The 7-month trip is shortened to 5 days.',
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
      `Build a whole base in ${MARTE.dias} days!`,
      'Give batteries to a building site to build it.',
      'Mars nights are freezing. Build the Heating early!',
    ],
    vitoria: ['The Mars base is ready!', 'Moon, deep space and Mars: you did it all!'],
    metaIncompleta: 'The base was not finished in time.',
    licoes: [
      'Mars air is thin: it cannot keep the heat in.',
      'NASA can predict when storms reach each planet.',
      'On a new planet, the weather says what to build first.',
    ],
    creditos: 'Data: NASA DONKI + Curiosity RAD via OSDR RadLab + Curiosity REMS. Archived, May 2024.',
    notaDados: 'Real Mars data from the Curiosity rover, May 2024. The base is a game model.',
  },
];
