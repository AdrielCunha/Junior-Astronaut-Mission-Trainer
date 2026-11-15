// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Astronaut accessories: overlay sheets drawn on top of any astronaut, same frame and animation
// (tools/lua3d/make_astronaut.py, ACESSORIO=<id> -> public/lua/acessorio_<id>.png). They are prizes of
// side missions (engine/presentes.ts). Three slots so they can be worn together: a hat on the head,
// glasses or a mustache on the face, and a "carinha" drawn on the visor.
// Keep ids in sync with make_astronaut.py (+ acessorios_extra.py). No Phaser.
export type Espaco = 'cabeca' | 'rosto' | 'carinha';
export type Pagina = 'chapeus' | 'carinhas';
// The world (phase) where it is won: a third of each wardrobe page per world, themed to it.
export type MundoItem = 'lua' | 'nave' | 'marte';
export type Acessorio = { id: string; nome: string; arquivo: string; espaco: Espaco; fase: MundoItem };

const a = (id: string, nome: string, espaco: Espaco, fase: MundoItem): Acessorio => ({ id, nome, arquivo: `lua/acessorio_${id}.png`, espaco, fase });

export const ACESSORIOS: Acessorio[] = [
  // Page "Hats & Glasses": 9 hats + 3 face items = a full page of 12.
  a('festa', 'Party Hat', 'cabeca', 'nave'),
  a('orelhas', 'Cat Ears', 'cabeca', 'lua'),
  a('cowboy', 'Cowboy Hat', 'cabeca', 'marte'),
  a('coroa', 'Golden Crown', 'cabeca', 'lua'),
  a('gorro', 'Orange Beanie', 'cabeca', 'lua'),
  a('laco', 'Pink Bow', 'cabeca', 'lua'),
  a('fones', 'Headphones', 'cabeca', 'nave'),
  a('chef', 'Chef Hat', 'cabeca', 'marte'),
  a('mago', 'Wizard Hat', 'cabeca', 'marte'),
  a('oculos', 'Round Shades', 'rosto', 'nave'),
  a('oculos_quadrado', 'Cool Frames', 'rosto', 'nave'),
  a('bigode', 'Mustache', 'rosto', 'marte'),
  // Page "Faces": 12 little faces on the visor.
  a('carinha_feliz', 'Happy', 'carinha', 'lua'),
  a('carinha_piscadinha', 'Winky', 'carinha', 'lua'),
  a('carinha_coracao', 'Heart Eyes', 'carinha', 'nave'),
  a('carinha_estrela', 'Star Eyes', 'carinha', 'nave'),
  a('carinha_gato', 'Kitty', 'carinha', 'marte'),
  a('carinha_surpreso', 'Surprised', 'carinha', 'nave'),
  a('carinha_sono', 'Sleepy', 'carinha', 'lua'),
  a('carinha_lingua', 'Tongue Out', 'carinha', 'marte'),
  a('carinha_bravo', 'Grumpy', 'carinha', 'marte'),
  a('carinha_bobo', 'Goofy', 'carinha', 'marte'),
  a('carinha_calmo', 'Calm', 'carinha', 'lua'),
  a('carinha_robo', 'Robot', 'carinha', 'nave'),
];

export const chaveAcessorio = (id: string) => `acessorio_${id}`;
export const acessorioPorId = (id: string | undefined) => ACESSORIOS.find((x) => x.id === id);
export const doEspaco = (espaco: Espaco) => ACESSORIOS.filter((x) => x.espaco === espaco);
export const daPagina = (p: Pagina) => ACESSORIOS.filter((x) => (p === 'carinhas') === (x.espaco === 'carinha'));
