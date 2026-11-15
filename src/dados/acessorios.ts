// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Astronaut accessories: overlay sheets drawn on top of any astronaut, same frame and animation
// (tools/lua3d/make_astronaut.py, ACESSORIO=<id> -> public/lua/acessorio_<id>.png). They are prizes of
// side missions (engine/presentes.ts). Three slots so they can be worn together: a hat on the head,
// glasses or a mustache on the face, and a "carinha" drawn on the visor.
// Keep ids in sync with make_astronaut.py (+ acessorios_extra.py). No Phaser.
export type Espaco = 'cabeca' | 'rosto' | 'carinha';
export type Pagina = 'chapeus' | 'carinhas';
export type Acessorio = { id: string; nome: string; arquivo: string; espaco: Espaco };

const a = (id: string, nome: string, espaco: Espaco): Acessorio => ({ id, nome, arquivo: `lua/acessorio_${id}.png`, espaco });

export const ACESSORIOS: Acessorio[] = [
  // Page "Hats & Glasses": 9 hats + 3 face items = a full page of 12.
  a('festa', 'Party Hat', 'cabeca'),
  a('orelhas', 'Cat Ears', 'cabeca'),
  a('cowboy', 'Cowboy Hat', 'cabeca'),
  a('coroa', 'Golden Crown', 'cabeca'),
  a('gorro', 'Orange Beanie', 'cabeca'),
  a('laco', 'Pink Bow', 'cabeca'),
  a('fones', 'Headphones', 'cabeca'),
  a('chef', 'Chef Hat', 'cabeca'),
  a('mago', 'Wizard Hat', 'cabeca'),
  a('oculos', 'Round Shades', 'rosto'),
  a('oculos_quadrado', 'Cool Frames', 'rosto'),
  a('bigode', 'Mustache', 'rosto'),
  // Page "Faces": 12 little faces on the visor.
  a('carinha_feliz', 'Happy', 'carinha'),
  a('carinha_piscadinha', 'Winky', 'carinha'),
  a('carinha_coracao', 'Heart Eyes', 'carinha'),
  a('carinha_estrela', 'Star Eyes', 'carinha'),
  a('carinha_gato', 'Kitty', 'carinha'),
  a('carinha_surpreso', 'Surprised', 'carinha'),
  a('carinha_sono', 'Sleepy', 'carinha'),
  a('carinha_lingua', 'Tongue Out', 'carinha'),
  a('carinha_bravo', 'Grumpy', 'carinha'),
  a('carinha_bobo', 'Goofy', 'carinha'),
  a('carinha_calmo', 'Calm', 'carinha'),
  a('carinha_robo', 'Robot', 'carinha'),
];

export const chaveAcessorio = (id: string) => `acessorio_${id}`;
export const acessorioPorId = (id: string | undefined) => ACESSORIOS.find((x) => x.id === id);
export const doEspaco = (espaco: Espaco) => ACESSORIOS.filter((x) => x.espaco === espaco);
export const daPagina = (p: Pagina) => ACESSORIOS.filter((x) => (p === 'carinhas') === (x.espaco === 'carinha'));
