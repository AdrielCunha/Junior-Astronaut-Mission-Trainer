// Small props left on the surface: leftovers of earlier missions and science gear.
// Rendered by tools/lua3d/make_modules.py as `deco_<id>`. Offsets are tiles from the map center;
// each prop goes to the nearest flat, free spot that keeps clear of the center and the buildings (Grade.procurarDeco).
// They are spread over the whole walkable ground; each one has a short fact shown on hover/touch.
import type { Tipo } from '../engine/construcao';

export type Deco = { id: string; nome: string; info: string; w: number; h: number; altura: number; dx: number; dy: number };

const ROVER = 'An old rover from an earlier mission. Its batteries died long ago, but the wheels still look ready to roll.';
const DESCIDA = 'The bottom half of a lander. The top half flew back up; the legs and tanks stay on the Moon.';
const SONDA = 'A probe that hit the ground too fast. Early robot missions crashed a lot before engineers got landings right.';
const CAIXAS = 'Spare supplies for the crew: food, tools and filters. Everything here came from Earth.';
const SISMO = 'Measures moonquakes. The Moon rumbles a little, and scientists use it to learn what is inside.';
const REFLETOR = 'Laser reflector. Scientists shoot lasers from Earth at it to measure the Moon distance very precisely.';
const BALIZA = 'A beacon that blinks so rovers and astronauts can find their way home.';
const BARRIS = 'Drums of rocket fuel. Fuel is heavy, so every kilo flown from Earth costs a lot.';
const BANDEIRA = 'A mission flag. With no wind on the Moon, flags need a wire to look like they wave.';
const PEDRAS = 'Boulders thrown out by meteorites. With no air, nothing smooths them: they stay sharp for billions of years.';
const CAMERA = 'A science camera taking photos of the sky. With no air, stars shine without twinkling.';
const AMOSTRAS = 'A case of lunar soil and rock samples. They are sent to labs on Earth to learn how the Moon formed.';
const LANTERNA = 'A solar lamp. It stores sunlight in the day to glow when the long lunar night comes.';
const FERRAMENTAS = 'Tool rack: shovels, rakes and tongs used to collect rocks and fix equipment.';
const CARRETEL = 'A spool of power cable that links solar panels to the base.';
const MOCHILA = 'A lost backpack! Life support packs hold oxygen and cooling water for a moonwalk.';

export const DECORACAO: Deco[] = [
  // Spread over the open ground, away from the center and the main buildings (Grade.procurarDeco)
  { id: 'caixas', nome: 'Supply Crates', info: CAIXAS, w: 1, h: 1, altura: 0.8, dx: 16, dy: 11 },
  { id: 'lanterna', nome: 'Solar Lamp', info: LANTERNA, w: 1, h: 1, altura: 1.1, dx: -24, dy: 3 },
  { id: 'ferramentas', nome: 'Tool Rack', info: FERRAMENTAS, w: 1, h: 1, altura: 0.75, dx: 13, dy: -16 },
  { id: 'amostras', nome: 'Sample Case', info: AMOSTRAS, w: 1, h: 1, altura: 0.3, dx: 1, dy: 26 },
  { id: 'mochila', nome: 'Lost Backpack', info: MOCHILA, w: 1, h: 1, altura: 0.3, dx: -16, dy: -15 },
  { id: 'baliza', nome: 'Beacon', info: BALIZA, w: 1, h: 1, altura: 1.3, dx: 19, dy: 1 },
  { id: 'barris', nome: 'Fuel Drums', info: BARRIS, w: 1, h: 1, altura: 0.55, dx: -18, dy: 16 },
  { id: 'bandeira', nome: 'Mission Flag', info: BANDEIRA, w: 1, h: 1, altura: 1.2, dx: 3, dy: -21 },
  { id: 'carretel', nome: 'Cable Spool', info: CARRETEL, w: 1, h: 1, altura: 0.7, dx: 15, dy: 21 },
  { id: 'camera', nome: 'Science Camera', info: CAMERA, w: 1, h: 1, altura: 1.0, dx: -22, dy: -5 },
  { id: 'lanterna', nome: 'Solar Lamp', info: LANTERNA, w: 1, h: 1, altura: 1.1, dx: 16, dy: -10 },
  { id: 'pedras', nome: 'Boulders', info: PEDRAS, w: 1, h: 1, altura: 0.35, dx: -7, dy: 23 },
  { id: 'pedras', nome: 'Boulders', info: PEDRAS, w: 1, h: 1, altura: 0.35, dx: -9, dy: -19 },
  { id: 'rover_velho', nome: 'Abandoned Rover', info: ROVER, w: 2, h: 1, altura: 1.1, dx: 24, dy: 10 },
  { id: 'modulo_descida', nome: 'Old Lander Stage', info: DESCIDA, w: 2, h: 2, altura: 1.1, dx: -21, dy: 8 },
  { id: 'sonda', nome: 'Crashed Probe', info: SONDA, w: 1, h: 1, altura: 0.9, dx: 9, dy: -17 },
  { id: 'sismografo', nome: 'Seismometer', info: SISMO, w: 1, h: 1, altura: 1.0, dx: 6, dy: 23 },
  { id: 'refletor', nome: 'Laser Reflector', info: REFLETOR, w: 1, h: 1, altura: 0.7, dx: -18, dy: -11 },
  { id: 'caixas', nome: 'Supply Crates', info: CAIXAS, w: 1, h: 1, altura: 0.8, dx: 26, dy: -5 },
  { id: 'barris', nome: 'Fuel Drums', info: BARRIS, w: 1, h: 1, altura: 0.55, dx: -13, dy: 18 },
  { id: 'bandeira', nome: 'Mission Flag', info: BANDEIRA, w: 1, h: 1, altura: 1.2, dx: -2, dy: -19 },
  { id: 'pedras', nome: 'Boulders', info: PEDRAS, w: 1, h: 1, altura: 0.35, dx: 18, dy: 16 },
  { id: 'pedras', nome: 'Boulders', info: PEDRAS, w: 1, h: 1, altura: 0.35, dx: -21, dy: 0 },
  { id: 'camera', nome: 'Science Camera', info: CAMERA, w: 1, h: 1, altura: 1.0, dx: 19, dy: -18 },
  { id: 'baliza', nome: 'Beacon', info: BALIZA, w: 1, h: 1, altura: 1.3, dx: -2, dy: 22 },
  { id: 'amostras', nome: 'Sample Case', info: AMOSTRAS, w: 1, h: 1, altura: 0.3, dx: -12, dy: -15 },
  { id: 'ferramentas', nome: 'Tool Rack', info: FERRAMENTAS, w: 1, h: 1, altura: 0.75, dx: 24, dy: 4 },
  { id: 'carretel', nome: 'Cable Spool', info: CARRETEL, w: 1, h: 1, altura: 0.7, dx: -18, dy: 11 },
  { id: 'mochila', nome: 'Lost Backpack', info: MOCHILA, w: 1, h: 1, altura: 0.3, dx: 7, dy: -25 },
];

// Mars (chapter 3, Jezero crater): its own props, each with a real fact told simply for young kids.
// Sizes are compared with things kids know (elephants, cartoons, birthdays), not kilometers.
const marte = (id: string, nome: string, info: string, dx: number, dy: number, altura = 0.6, w = 1, h = 1): Deco =>
  ({ id, nome, info, w, h, altura, dx, dy });

export const DECORACAO_MARTE: Deco[] = [
  marte('rocha_vulcao', 'Volcano Rock', 'The biggest volcano in the solar system is on Mars! It is as tall as 7,000 elephants standing on top of each other.', 16, 11, 0.7),
  marte('ingenuity', 'Ingenuity Helicopter', 'A tiny helicopter flew here! It was the first to fly on another planet. It was meant to fly 5 times and flew 72!', -24, 3, 0.9),
  marte('seixos', 'Round Pebbles', 'These rocks are round like marbles. Long ago a river rolled them. This crater was once a lake!', 13, -16, 0.35),
  marte('meteorito', 'Mars Meteorite', 'Some rocks from Mars fell on Earth! A big crash threw them into space.', 1, 26, 0.4),
  marte('gelo', 'Dry Ice Frost', 'It snows on Mars! But the snow is frozen air, called dry ice.', -16, -15, 0.5),
  marte('estacao_tempo', 'Weather Station', 'Brrr! Most of the time, Mars is colder than your freezer.', 19, 1, 1.1),
  marte('pedras', 'Rusty Rocks', 'Why is Mars red? Its dust is rusty, like an old bike!', -18, 16, 0.35),
  marte('camera', 'Sky Camera', 'On Mars, sunsets are blue! On Earth they are orange.', 3, -21, 1.0),
  marte('rover_velho', 'Old Rover', 'This rover was built to work for 3 months. It kept going for almost 15 years!', 24, 10, 1.1, 2, 1),
  marte('modulo_descida', 'Sky Crane Wreck', 'A robot landed here all by itself. Mars is too far for anyone on Earth to steer it in time.', -21, 8, 1.1, 2, 2),
  marte('amostras', 'Sample Tubes', 'Rocks sealed in tubes. One day a rocket may carry them to Earth!', 15, 21, 0.3),
  marte('sismografo', 'Seismometer', 'Mars shakes too! This listened to more than 1,000 marsquakes.', -22, -5, 1.0),
  marte('barris', 'Oxygen Maker', 'A robot here made oxygen out of Mars air. Astronauts need it to breathe!', -7, 23, 0.55),
  marte('mochila', 'Lost Backpack', 'Mars pulls you down less than Earth. You could jump 2 times higher here!', -9, -19, 0.3),
  marte('caixas', 'Supply Crates', 'A year on Mars is almost 2 Earth years. You would wait twice as long for your birthday!', 26, -5, 0.8),
  marte('bandeira', 'Mission Flag', 'A day on Mars is 40 minutes longer than yours. Just enough for two cartoons!', -2, -19, 1.2),
  marte('lanterna', 'Solar Lamp', 'Mars is far from the Sun, so sunlight here is weaker. Solar panels work extra hard!', 16, -10, 1.1),
  marte('carretel', 'Cable Spool', 'Dust storms on Mars can cover the whole planet for months!', -13, 18, 0.7),
  marte('baliza', 'Beacon', 'Mars has two little moons shaped like potatoes: Phobos and Deimos!', -2, 22, 1.3),
  marte('sonda', 'Crashed Probe', 'Landing on Mars is very hard. About half of the robots sent here did not make it.', 9, -17, 0.9),
];

// The grid only needs a footprint to find a free spot; props never count as buildings.
export const comoTipo = (d: Deco): Tipo => ({
  id: 'habitat', nome: d.nome, w: d.w, h: d.h, altura: d.altura, cor: 0, unico: false, papel: '',
});

// `girado`: turned a quarter (w and h already swapped; the picture is drawn mirrored).
export type DecoColocada = { id: string; nome: string; info: string; w: number; h: number; altura: number; gx: number; gy: number; z: number; girado?: boolean };
