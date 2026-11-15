// Generated with AI assistance (Claude). See README, "Use of AI tools".
// The ground: real NASA terrain (Blender render), the crew's base (already built), the commander,
// and the cargo landers that bring new equipment. Players run the base, they do not build it:
// walk (or click), pick up the day's batteries at the Habitat, click a room to deliver one.
// Owns the ground camera and its zoom (sessao.u). When the flight to the Moon starts, the camera
// glides to the framing of the flight's first frame and the terrain dissolves into it (Espaco
// plays the frames) while the base stays visible, live.
import Phaser from 'phaser';
import paletaLua from '../dados/paleta_lua.json';
import paletaMarte from '../dados/paleta_marte.json';
// Ground colors for dust, paths and the flag's shadow: set in create() for the current world.
const corDe = (h: string) => Number.parseInt(h.slice(1), 16);
let COR_SOLO_CLARO = corDe(String(paletaLua.solo[2][1]));
let COR_SOLO_MEDIO = corDe(String(paletaLua.solo[1][1]));
let COR_SOLO_SOMBRA = corDe(paletaLua.contorno);
import { Ambiente } from './ambiente';
import { configuracoesAbertas, movimentoReduzido, video } from '../video';
import { paraTela, paraChao, profundidade } from '../engine/iso';
import { passo, novoCorpo, G, G_LUA, G_MARTE, G_TERRA, pulo, type Corpo, type Caixa, type Entrada } from '../engine/fisica';
import { encontrarCaminho, type Ponto } from '../engine/caminho';
import naveProps from '../dados/nave_props.json';
import { TIPOS, montarBasePadrao, BASE_MARTE, BASE_NAVE, SETORES_SUPRIMENTOS, type Construcao, type TipoId } from '../engine/construcao';
import { entregar as entregarRegra, custo, pronto } from '../regras';
import { empuxoDePouso, suprimentoDoDia, SUPRIMENTOS } from '../engine/suprimentos';
import { sortearEvento, DOSE_ALARME } from '../engine/eventos';
import { sessao, dadosTerreno, suave, sDeU, S_MAPA, fonte } from './sessao';
import { fundacao, sombraECarga } from './desenho';
import { VOO as voo } from './qualidade';
import { escolher } from '../tarefas';
import { criarIconeJogo } from '../tarefas/estilo';
import type { DadosTarefa } from './Tarefa';
import modelos from '../dados/modulos.json';
import { origemBaterias, modeloBancoBaterias } from '../engine/estacaoSolar';
import bandeiras from '../dados/bandeiras.json';
import sprite from '../dados/astronauta.json';
import dadosViagem from '../dados/viagem.json';
import { chaveSkin } from '../dados/skins';
import { DECORACAO, comoTipo, type DecoColocada } from '../dados/decoracao';
import { CHAVE_FOGUETE } from './Chegada';
import foguetevoo from '../dados/foguete_voo.json';
import { tocarMotor, tocarSfx, criarAmbienteSonoro } from '../sfx';
import { dirigirRover, estacionarRover, desembarcar, pontoLivre } from '../engine/rover';
import { desenharRover, LINHA_QUADRIL_SENTADO } from './desenharRover';

const P = dadosTerreno.imagem;
// Mars: warm light on the props and modules (they are rendered under the Moon's light), and the props that make sense in Jezero crater, with
// their Mars names. Real: Perseverance's sky crane crashed near its landing site, and it left
// sample tubes on the crater floor for a future mission to bring back.
const TOM_MARTE = 0xffdcc4;
const DECO_MARTE: Record<string, string | null> = {
  modulo_descida: 'Sky Crane Wreck', amostras: 'Sample Tubes', refletor: null, rover_velho: null, sonda: null,
  sismografo: 'Seismometer', bandeira: 'Mission Flag',
};
const ENERGIA = ['PaineisSolaresTarefa', 'DesviarEnergiaTarefa'];   // energy tasks: played when picking up the day's batteries
const BONUS_CONSERTO = 1;     // batteries the crew gives for fixing an event
const ALCANCE = 1.3;          // tiles from a module's edge to use it
const ESCALA_MARCADOR = 0.62; // Compact destination marker; keep the source emblem crisp.
const PROFUNDIDADE_MARCADOR = 900_000; // Above world objects, below room labels and the HUD.
const ALTURA_POUSO = 14;      // tiles at character scale (about 50 m): where the lander appears
type Modelo = keyof typeof modelos;
// Every module picture: the team's (modulos.json) and the ship's (nave_props.json, make_nave.py).
// `pegada` is the footprint a picture was drawn for, when it differs from the module's own.
type Quadro = { w: number; h: number; ancora: number[]; escala: number; pegada?: number[] };
const QUADROS = { ...modelos, ...naveProps } as unknown as Record<string, Quadro>;
const PEGADA_MODELO: Record<string, [number, number]> = { pouso: [2, 2], reciclador: [2, 2] };
// Ship props (chapter 2): offsets in tiles from the grid center, inside the deck, off the corridor.
const DECO_NAVE = [
  { id: 'nave_cockpit', info: 'Where the pilots steer the ship. On the way to Mars the computer does most of the flying.', nome: 'Cockpit', w: 2, h: 1, altura: 1.0, dx: 7, dy: -1.5 },
  { id: 'nave_beliche', info: 'Sleeping bags strapped to the wall. In zero gravity you can sleep standing up!', nome: 'Crew Bunks', w: 2, h: 1, altura: 1.4, dx: -8, dy: 4 },
  { id: 'nave_beliche', info: 'Sleeping bags strapped to the wall. In zero gravity you can sleep standing up!', nome: 'Crew Bunks', w: 2, h: 1, altura: 1.4, dx: -8, dy: 2 },
  { id: 'nave_mesa', info: 'The galley. Food comes in pouches, and drinks are sipped through straws so they do not float away.', nome: 'Galley', w: 2, h: 2, altura: 0.9, dx: 3, dy: 3 },
  { id: 'nave_esteira', info: 'Astronauts run every day, held down by bungee cords, to keep their bones and muscles strong.', nome: 'Treadmill', w: 2, h: 1, altura: 1.1, dx: 6, dy: 4 },
  { id: 'nave_plantas', info: 'A small veggie garden. Astronauts on the Space Station have grown and eaten lettuce in space.', nome: 'Veggie Garden', w: 1, h: 1, altura: 1.1, dx: 8, dy: -5 },
  { id: 'nave_bolsas', info: 'Soft cargo bags hold spare parts, clothes and food for the long trip.', nome: 'Cargo Bags', w: 1, h: 1, altura: 1.0, dx: -5, dy: 4 },
  { id: 'nave_agua', info: 'Water tanks. Water is also a good shield against radiation, so tanks often line the walls.', nome: 'Water Tanks', w: 1, h: 1, altura: 1.0, dx: 6, dy: -5 },
  { id: 'nave_medico', info: 'The medical kit. The crew trains to treat each other, because no doctor is close by.', nome: 'Medical Kit', w: 1, h: 1, altura: 1.1, dx: 8, dy: 5 },
];

// A cargo lander bringing one piece of equipment (see engine/suprimentos.ts).
type Pouso = {
  tipo: TipoId; gx: number; gy: number;        // footprint corner of the equipment it brings
  z: number; vz: number; chao: number;         // lander height, speed (tiles, tiles/s), ground
  fase: 'descendo' | 'pousado' | 'subindo'; t: number; empuxo: number;
  img: Phaser.GameObjects.Image; chama: Phaser.GameObjects.Image; sombra: Phaser.GameObjects.Ellipse;
};

export class Superficie extends Phaser.Scene {
  private setaEmergencia!: Phaser.GameObjects.Container;
  private ponteiroEmergencia!: Phaser.GameObjects.Container;
  private contornoEmergencia!: Phaser.GameObjects.Graphics;
  private larguraPlacaEmergencia = 0;
  private alturaPlacaEmergencia = 0;
  private tempoEfeitos = 0;
  private ambiente!: Ambiente;
  private readonly controlesObservados = new Set<'movimento' | 'pulo'>();
  private corpo!: Corpo;
  private gCaminhos!: Phaser.GameObjects.Graphics;
  private gAstronauta!: Phaser.GameObjects.Graphics;   // shadow + carried batteries
  private comandante!: Phaser.GameObjects.Sprite;
  private sombraBandeira!: Phaser.GameObjects.Graphics;
  private mascaraBandeira!: Phaser.GameObjects.Graphics;
  private bandeira!: Phaser.GameObjects.Image;         // flag marking the chosen destination
  private direcao = 1;                                  // sprite row: map angle / 45 deg
  private desenhos = new Map<number, { g: Phaser.GameObjects.Graphics; img: Phaser.GameObjects.Image; rotulo?: Phaser.GameObjects.Text }>();
  private rota: Ponto[] = [];                            // A* waypoints to walk through
  private alvoUsar: Construcao | null = null;             // module to use when we arrive
  private bloqueadoCont = 0;
  private teclas!: Record<string, Phaser.Input.Keyboard.Key>;
  private passada = 0;
  private sobre: Construcao | null = null;              // module under the cursor
  private seguir = true;             // camera follows the commander until the player pans
  private arrastando = false;
  private apertouNoMapa = false;
  private mapa!: Phaser.GameObjects.Layer;          // terrain + everything on it
  private terreno!: Phaser.GameObjects.Image;
  private inicioVoo: { x: number; y: number } | null = null;
  private pouso: Pouso | null = null;
  private gRover!: Phaser.GameObjects.Graphics;
  private gRoverFrente!: Phaser.GameObjects.Graphics;
  private dicaRover!: Phaser.GameObjects.Text;
  private alvoRover = false;
  private sons!: ReturnType<typeof criarAmbienteSonoro>;
  private progressoAnterior = 0;
  private suprimentosPendentes: TipoId[] = [];
  // Rocket leaving the Moon at the end of chapter 1 (decolar). The pad then shows no rocket.
  private decolagem: { img: Phaser.GameObjects.Image; chama: Phaser.GameObjects.Graphics; cx: number; cy: number; z: number; vz: number; t: number; fim: () => void } | null = null;
  private foguetePartiu = false;
  // The ship (chapter 2): the closed ship, roof on, over everything when zoomed out; the
  // cutaway deck when close. Names on the map fade out under the roof.
  private teto: Phaser.GameObjects.Image | null = null;
  private nomesNoMapa: Phaser.GameObjects.Text[] = [];
  private decoVisuais: { d: DecoColocada; img: Phaser.GameObjects.Image }[] = [];
  private dica?: Phaser.GameObjects.Text;                // shared prop tooltip
  private decoSobre: DecoColocada | null = null;         // prop under the cursor
  private decoFixa: DecoColocada | null = null;          // prop just tapped (touch): tooltip stays a few seconds
  private decoFixaT = 0;

  constructor() {
    super({ key: 'Superficie' });   // started by Carregar
  }

  // The destination flag: the world's own, and on the ship Earth's (the home the crew left).
  private get planetaBandeira(): 'lua' | 'marte' | 'terra' { return sessao.mundo === 'nave' ? 'terra' : sessao.mundo; }

  // A module's name: the chapter names its rooms (capitulos.ts); on Mars the Habitat is the
  // lander, on the ship the Battery Bank is the Power Room.
  private nomeDe(c: Construcao) {
    if (sessao.mundo === 'marte' && c.tipo.id === 'habitat') return 'Lander';
    if (sessao.mundo === 'nave' && c.tipo.id === 'bateria') return 'Power Room';
    return (c.tipo.sala && sessao.cap.salas.find((sl) => sl.efeito === c.tipo.sala)?.nome) || c.tipo.nome;
  }
  // Whether the player already walked / jumped (read by the on-map guide, guia.ts).
  jaUsou(c: 'movimento' | 'pulo') { return this.controlesObservados.has(c); }

  // Map center in world px: the flight's first frame is centered on it.
  private get centroMapa() {
    const h = dadosTerreno.n / 2;
    return paraTela(P, h, h, sessao.terreno.altura(h, h));
  }

  create() {
    // Scene inspection is available in development or explicitly opted-in benchmark builds.
    if (import.meta.env.DEV || import.meta.env.VITE_MEDIR === '1') Object.assign(window, { superficie: this, sessao });
    this.cameras.main.setBackgroundColor('rgba(0,0,0,0)');
    this.desenhos.clear();
    this.pouso = null;
    this.tempoEfeitos = 0;
    this.mapa = this.add.layer().setDepth(0);
    // A warning sign (badge + big arrow). The whole sign bounces and the red outline blinks.
    const rotuloEmergencia = this.add.text(0, 0, 'RADIATION SHIELD', {
      fontFamily: 'Fredoka, sans-serif', fontSize: '19px', fontStyle: 'bold',
      color: '#ffd93b', stroke: '#14243e', strokeThickness: 4, align: 'center',
    }).setOrigin(0, 0.5);
    const tamanhoIcone = 26, gapIcone = 9, padX = 15, padY = 8;
    const larguraPlaca = padX * 2 + tamanhoIcone + gapIcone + rotuloEmergencia.width;
    const alturaPlaca = Math.max(rotuloEmergencia.height, tamanhoIcone) + padY * 2;
    this.larguraPlacaEmergencia = larguraPlaca;
    this.alturaPlacaEmergencia = alturaPlaca;
    const cyPlaca = -Math.round(alturaPlaca / 2);
    const placa = this.add.graphics()
      .fillStyle(0x14243e, 0.98).fillRoundedRect(-larguraPlaca / 2, -alturaPlaca, larguraPlaca, alturaPlaca, Math.round(alturaPlaca / 2))
      .lineStyle(3, 0xffd93b, 1).strokeRoundedRect(-larguraPlaca / 2, -alturaPlaca, larguraPlaca, alturaPlaca, Math.round(alturaPlaca / 2));
    const iconeEmergencia = criarIconeJogo(this, -larguraPlaca / 2 + padX + tamanhoIcone / 2, cyPlaca, 'radiation', tamanhoIcone);
    rotuloEmergencia.setPosition(-larguraPlaca / 2 + padX + tamanhoIcone + gapIcone, cyPlaca);
    const pontosSeta = [{ x: -9, y: 0 }, { x: 9, y: 0 }, { x: 9, y: 17 },
      { x: 22, y: 17 }, { x: 0, y: 40 }, { x: -22, y: 17 }, { x: -9, y: 17 }];
    const sombraSeta = this.add.graphics().fillStyle(0x0b1a4a, 0.3)
      .fillPoints(pontosSeta.map((p) => ({ x: p.x + 2, y: p.y + 3 })), true);
    // Soft red halo behind the arrow (it pulses like a warning light instead of a hard red outline).
    this.contornoEmergencia = this.add.graphics().lineStyle(9, 0xff2020, 1)
      .strokePoints(pontosSeta, true).setScale(1.05).setAlpha(0.35);
    const miolo = this.add.graphics().fillStyle(0xffd93b).fillPoints(pontosSeta, true);
    const realce = this.add.graphics().fillStyle(0xfff4b0, 0.95).fillTriangle(-7, 4, 7, 4, 0, 30);
    const bordaSeta = this.add.graphics().lineStyle(4, 0x14243e, 1).strokePoints(pontosSeta, true);
    this.ponteiroEmergencia = this.add.container(0, 12, [this.contornoEmergencia, sombraSeta, miolo, realce, bordaSeta]);
    this.setaEmergencia = this.add.container(0, 0, [placa, iconeEmergencia, rotuloEmergencia, this.ponteiroEmergencia])
      .setDepth(2_000_000).setVisible(false);
    this.mapa.add(this.setaEmergencia);
    const marte = sessao.mundo === 'marte';
    const pal = marte ? paletaMarte : paletaLua;
    COR_SOLO_CLARO = corDe(String(pal.solo[2][1])); COR_SOLO_MEDIO = corDe(String(pal.solo[1][1])); COR_SOLO_SOMBRA = corDe(pal.contorno);
    const nave = sessao.mundo === 'nave';
    this.terreno = this.add.image(0, 0, marte ? 'terreno_marte' : nave ? 'terreno_nave' : 'terreno').setOrigin(0).setDepth(-1e6);
    this.nomesNoMapa = [];
    this.teto = nave && this.textures.exists('terreno_nave_teto')
      ? this.add.image(0, 0, 'terreno_nave_teto').setOrigin(0).setDepth(1.5e6).setAlpha(0) : null;
    this.mapa.add(this.terreno);
    if (this.teto) this.mapa.add(this.teto);
    this.gCaminhos = this.add.graphics().setDepth(-900_000);
    this.mapa.add(this.gCaminhos);
    this.ambiente = new Ambiente(this,this.mapa,P,sessao.terreno,sessao.mundo);

    // The crew's base is already there (engine/construcao.ts, BASE_PADRAO). On Mars only the
    // lander and the panels are; the rooms are construction sites (BASE_MARTE).
    if (!sessao.grade.lista.length) montarBasePadrao(sessao.grade, marte ? BASE_MARTE : nave ? BASE_NAVE : undefined);
    // Labels and construction sites follow the rules state.
    sessao.ouvir(this, 'estado', () => { for (const c of sessao.grade.lista) if (c.tipo.sala || c.tipo.id === 'bateria') this.desenharModulo(c); });
    // The commander starts by the Habitat, or by the Power Room on the ship.
    const hab = sessao.grade.lista.find((c) => c.tipo.id === 'habitat') ?? sessao.grade.lista.find((c) => c.tipo.id === origemBaterias(sessao.mundo))!;
    const sx = hab.gx + hab.tipo.w + 0.7, sy = hab.gy + hab.tipo.h / 2;
    this.corpo = novoCorpo(sx, sy, sessao.terreno.altura(sx, sy));
    this.corpo.noChao = true;

    this.gAstronauta = this.add.graphics();
    this.comandante = this.add.sprite(0, 0, chaveSkin(video.skin), 0).setOrigin(sprite.pe[0] / sprite.frame, sprite.pe[1] / sprite.frame)
      .setScale(sprite.escala);
    const bInfo = bandeiras[this.planetaBandeira];
    this.bandeira = this.add.image(0, 0, `bandeira_${this.planetaBandeira}`)
      .setOrigin(bInfo.ancora[0] / bInfo.w, bInfo.ancora[1] / bInfo.h)
      .setScale(bInfo.escala * ESCALA_MARCADOR)
      .setVisible(false);
    this.sombraBandeira = this.add.graphics().setDepth(PROFUNDIDADE_MARCADOR-1).setVisible(false);
    this.mascaraBandeira = this.make.graphics({},false);
    this.bandeira.setMask(this.mascaraBandeira.createGeometryMask());
    this.events.once('shutdown',()=>{this.bandeira.clearMask(true);this.mascaraBandeira.destroy();});
    this.mapa.add([this.gAstronauta, this.comandante, this.sombraBandeira, this.bandeira]);
    for (const c of sessao.grade.lista) this.desenharModulo(c);
    this.montarDeco();
    this.desenharCaminhos();
    if (sessao.posicaoAstronauta && sessao.posicaoAstronauta.x<sessao.terreno.n && sessao.posicaoAstronauta.y<sessao.terreno.n) this.corpo={...sessao.posicaoAstronauta};
    this.rota = []; this.alvoUsar = null; this.alvoRover = false;
    if (sessao.mundo === 'lua') sessao.rover ??= estacionarRover(sessao.terreno, sessao.grade.caixas(), sx + 1, sy + 1);
    if (sessao.rover?.dirigindo) this.corpo = sessao.rover.corpo;
    sessao.posicaoAstronauta=this.corpo;
    this.progressoAnterior=sessao.progressoFoguete;
    this.suprimentosPendentes=sessao.mundo==='lua' && sessao.fase==='dia'
      ? SUPRIMENTOS.filter(s=>s.dia<=sessao.estado.dia && !sessao.grade.lista.some(c=>c.tipo.id===s.tipo)).map(s=>s.tipo):[];
    this.sons=criarAmbienteSonoro();
    const silenciar=()=>this.sons.silenciar();
    const visibilidade=()=>{if(document.hidden)silenciar();};
    this.events.on('pause',silenciar);
    document.addEventListener('visibilitychange',visibilidade);
    this.events.once('shutdown',()=>{
      this.sons.parar();this.events.off('pause',silenciar);document.removeEventListener('visibilitychange',visibilidade);
      sessao.abastecendoRover=false;
    });
    this.gRover = this.add.graphics();
    this.gRoverFrente = this.add.graphics();
    this.dicaRover = this.add.text(0, 0, '', fonte(13, '#ffffff', {
      backgroundColor: '#14243e', padding: { x: 9, y: 6 }, align: 'center',
    })).setOrigin(0.5, 1).setDepth(1_000_001).setInteractive({ useHandCursor: true });
    this.dicaRover.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
      ev.stopPropagation();
      if (!this.podeUsarRover()) return;
      if (sessao.rover?.dirigindo || this.pertoRover()) this.alternarRover();
      else this.caminharAoRover();
    });
    this.mapa.add([this.gRover, this.gRoverFrente, this.dicaRover]);

    const pe = paraTela(P, this.corpo.x, this.corpo.y, this.corpo.z);
    this.cameras.main.centerOn(pe.x, pe.y);

    // ---- input: keys walk; drag pans; a tap walks there, or to a room and uses it ----
    const kb = this.input.keyboard!;
    this.teclas = kb.addKeys('W,A,S,D,UP,DOWN,LEFT,RIGHT,SPACE,E') as Record<string, Phaser.Input.Keyboard.Key>;
    kb.on('keydown-E', (ev: KeyboardEvent) => { if (!ev.repeat) this.usarPerto(); });
    this.arrastando = false;
    this.apertouNoMapa = false;
    this.input.on('pointermove', (ptr: Phaser.Input.Pointer) => {
      const q = paraChao(P, sessao.terreno, ptr.worldX, ptr.worldY);
      this.destacar(q ? sessao.grade.em(q.gx, q.gy) ?? null : null);
      this.decoSobre = this.decoEm(ptr.worldX, ptr.worldY);
      if (!ptr.isDown || !this.apertouNoMapa || this.input.pointer2.isDown) return;
      if (!this.arrastando && Phaser.Math.Distance.Between(ptr.downX, ptr.downY, ptr.x, ptr.y) < 8) return;
      this.arrastando = true;
      this.seguir = false;
      const cam = this.cameras.main;
      cam.scrollX -= (ptr.x - ptr.prevPosition.x) / cam.zoom;
      cam.scrollY -= (ptr.y - ptr.prevPosition.y) / cam.zoom;
    });
    // A press on a panel button (Interface, Tarefa) never reaches this scene, but the panel closes on
    // that press, so the release does. Only a release whose press was on the map is a click.
    this.input.on('pointerdown', () => { this.arrastando = false; this.apertouNoMapa = true; });
    this.input.on('pointerup', (ptr: Phaser.Input.Pointer) => {
      if (this.apertouNoMapa && !this.arrastando && !this.input.pointer2.isDown && ptr.button === 0) this.clicar(ptr);
      this.arrastando = false;
      this.apertouNoMapa = false;
    });
    this.input.mouse?.disableContextMenu();

    sessao.ouvir(this, 'estado', () => { for (const c of sessao.grade.lista) this.desenharModulo(c); this.animarMontagem(); });
    // A new phase can change a picture too: the shield's water walls drain for the next morning.
    sessao.ouvir(this, 'fase', () => { for (const c of sessao.grade.lista) this.desenharModulo(c); });
    sessao.ouvir(this, 'suprimento', (tipo) => this.chegar(tipo));
    sessao.ouvir(this, 'pousoFoguete', (fim) => this.pousarFoguete(fim));
  }

  // ---------- zoom ----------
  private aplicarZoom() {
    const s = sDeU(sessao.u);
    const cam = this.cameras.main;

    // Ground: keep the point under the cursor / pinch still (Clash of Clans style).
    const a = sessao.ancora;
    const antes = a && !sessao.voo && sessao.vista === 'chao' ? cam.getWorldPoint(a.x, a.y) : null;
    cam.setZoom(s / S_MAPA);
    if (antes && a) {
      cam.preRender();
      const depois = cam.getWorldPoint(a.x, a.y);
      cam.scrollX += antes.x - depois.x; cam.scrollY += antes.y - depois.y;
      this.seguir = false;
    }

    // Flight: glide to the map center (the first frame's center). Then the terrain picture
    // dissolves into the flight frames, but the base (modules, commander, lander) stays, live,
    // shrinking with the frames while the camera only backs away (p < 0.3, same view angle);
    // past that the planet turns and Espaco marks the base with a light instead.
    const v = sessao.voo;
    const mc = this.centroMapa;
    this.terreno.setAlpha(1);
    if (v?.tipo === 'filme') {
      if (!this.inicioVoo) this.inicioVoo = { x: cam.midPoint.x, y: cam.midPoint.y };
      const k = v.fase === 'prep' && v.sentido > 0 ? suave(0, 1, v.t) : 1;
      cam.centerOn(Phaser.Math.Linear(this.inicioVoo.x, mc.x, k), Phaser.Math.Linear(this.inicioVoo.y, mc.y, k));
      const q = sessao.quadroFilme;
      if (q !== null) {
        cam.setZoom((sDeU(sessao.uFilme) * Math.pow(voo.razao, -q)) / S_MAPA);
        this.terreno.setAlpha(1 - suave(0.05, 0.1, q));   // gone only once the film covers the screen
      }
      this.mapa.setAlpha(q === null ? 1 : 1 - suave(0.22, 0.32, q));
    } else {
      this.inicioVoo = null;
      this.mapa.setAlpha(sessao.vista === 'chao' ? 1 : 0);
    }
    if (sessao.vista !== 'chao' || sessao.voo) this.recolherBandeira();
    this.mapa.setVisible(this.mapa.alpha > 0.001);
    this.input.enabled = sessao.vista === 'chao' && !sessao.voo && !sessao.emTarefa && !sessao.abastecendoRover && !configuracoesAbertas && !sessao.transicao;
  }

  // ---------- input ----------
  private clicar(ptr: Phaser.Input.Pointer) {
    if (!this.podeUsarRover()) return;
    const r = sessao.rover;
    if (r) {
      const p = paraTela(P, r.corpo.x, r.corpo.y, r.corpo.z);
      if (Math.abs(ptr.worldX - p.x) < 42 && Math.abs(ptr.worldY - (p.y - 15)) < 32) {
        if (r.dirigindo || this.pertoRover()) this.alternarRover();
        else this.caminharAoRover();
        return;
      }
    }
    this.alvoRover = false;
    // Tapping a prop (touch has no hover) shows what it is for a few seconds.
    const deco = this.decoEm(ptr.worldX, ptr.worldY);
    if (deco) { this.decoFixa = deco; this.decoFixaT = 4; return; }
    const q = paraChao(P, sessao.terreno, ptr.worldX, ptr.worldY);
    if (!q) return;
    this.seguir = true;
    const c = r?.dirigindo ? undefined : sessao.grade.em(q.gx, q.gy);
    // If clicking a module we are already standing next to, use it immediately.
    if (c && this.perto(c)) {
      this.rota = [];
      this.alvoUsar = null;
      this.usar(c);
      return;
    }
    let destGx: number, destGy: number;
    if (c) {
      const ap = this.pontoDeAcesso(c);
      destGx = ap.gx; destGy = ap.gy;
      this.alvoUsar = c;
    } else {
      destGx = q.gx; destGy = q.gy;
      this.alvoUsar = null;
    }
    const caixas = sessao.grade.caixas();
    const caminho = encontrarCaminho(sessao.terreno, caixas, this.corpo.raio, this.corpo.x, this.corpo.y, destGx, destGy);
    this.rota = caminho ?? [];
    this.bloqueadoCont = 0;
    if (this.rota.length > 0) {
      this.plantarBandeira(destGx, destGy, this.planetaBandeira);
    } else {
      this.recolherBandeira();
    }
  }

  /** Plants the flag marking the chosen destination spot on the terrain. */
  private plantarBandeira(gx: number, gy: number, planeta = 'lua') {
    const bInfo = (bandeiras as Record<string, typeof bandeiras.lua>)[planeta] ?? bandeiras.lua;
    const z = sessao.terreno.altura(gx, gy);
    const pe = paraTela(P, gx, gy, z);
    this.bandeira.setTexture(`bandeira_${planeta}`);
    this.bandeira.setOrigin(bInfo.ancora[0] / bInfo.w, bInfo.ancora[1] / bInfo.h);
    this.bandeira.setPosition(pe.x, pe.y);
    this.bandeira.setDepth(PROFUNDIDADE_MARCADOR);
    this.bandeira.setVisible(true).setAlpha(1);

    this.encaixarBandeira(gx,gy,bInfo.w*bInfo.escala*ESCALA_MARCADOR,bInfo.h*bInfo.escala*ESCALA_MARCADOR);
    const cr = sessao.terreno.crateras.find(c=>Math.hypot(gx-c.x,gy-c.y)<c.raio*0.86);
    const t = cr ? Math.hypot(gx-cr.x,gy-cr.y)/cr.raio : 1;
    const descida = cr ? cr.profundidade*(1-(t/0.86)**2)**1.3*Math.abs(P.ez[1]) : 0;

    // Settle into the crater floor rather than appearing at rim height.
    this.tweens.killTweensOf(this.bandeira);
    const escala = bInfo.escala * ESCALA_MARCADOR;
    if(movimentoReduzido()) {this.bandeira.setScale(escala);return;}
    this.bandeira.setScale(escala * 0.8).setY(pe.y-descida);
    this.tweens.add({
      targets: this.bandeira,
      y: pe.y,
      scaleX: escala,
      scaleY: escala,
      duration: 250,
      ease: 'Sine.easeOut',
    });
  }

  private encaixarBandeira(gx: number,gy: number,width: number,height: number) {
    const t=sessao.terreno;
    const foot=paraTela(P,gx,gy,t.altura(gx,gy));
    // A terrain horizon for each sprite column. Foreground rim can hide the mast base,
    // while the marker's foreground depth still keeps it readable near buildings.
    const left=foot.x-12,right=foot.x+width+12,top=foot.y-height*2-24;
    const edge: {x:number;y:number}[]=[];
    const inside=t.crateras.find(c=>Math.hypot(gx-c.x,gy-c.y)<c.raio*1.25);
    for(let x=left;x<=right+2;x+=2) {
      const offset=(x-foot.x)/(P.ex[0]-P.ey[0]);
      let horizon=Infinity;
      const reach=inside?inside.raio*2.5:0.12;
      for(let d=0;d<=reach;d+=0.06) {
        const xx=gx+offset+d,yy=gy-offset+d;
        if(!t.dentro(xx,yy))continue;
        horizon=Math.min(horizon,paraTela(P,xx,yy,t.altura(xx,yy)-0.025).y);
      }
      edge.push({x,y:Number.isFinite(horizon)?horizon:foot.y+height});
    }
    this.mascaraBandeira.clear().fillStyle(0xffffff).fillPoints([{x:left,y:top},{x:right+2,y:top},...edge.reverse()],true);
    const shadow=[];
    for(let i=0;i<24;i++) {
      const a=i*Math.PI*2/24,x=gx+Math.cos(a)*0.15,y=gy+Math.sin(a)*0.11;
      shadow.push(paraTela(P,x,y,t.altura(x,y)+0.006));
    }
    this.sombraBandeira.clear().fillStyle(COR_SOLO_SOMBRA,0.35).fillPoints(shadow,true).setVisible(true);
  }

  /** Smoothly folds and hides the destination flag when arriving or changing path. */
  private recolherBandeira() {
    if (!this.bandeira || !this.bandeira.visible) return;
    this.tweens.killTweensOf(this.bandeira);
    this.tweens.add({
      targets: this.bandeira,
      alpha: 0,
      scaleY: 0,
      duration: 200,
      ease: 'Quad.easeIn',
      onComplete: () => this.bandeira.setVisible(false),
    });
  }

  /** Picks the best approach point for a module: the nearest edge midpoint that is accessible. */
  private pontoDeAcesso(c: Construcao): { gx: number; gy: number } {
    const k = this.corpo;
    const caixas = sessao.grade.caixas();
    const mx = c.gx + c.tipo.w / 2, my = c.gy + c.tipo.h / 2;
    const margem = 0.7;
    // Four edge midpoints (N, S, E, W), sorted by distance to the commander.
    const candidatos = [
      { gx: mx, gy: c.gy - margem },                       // north
      { gx: mx, gy: c.gy + c.tipo.h + margem },            // south
      { gx: c.gx - margem, gy: my },                       // west
      { gx: c.gx + c.tipo.w + margem, gy: my },            // east
    ].sort((a, b) => Math.hypot(a.gx - k.x, a.gy - k.y) - Math.hypot(b.gx - k.x, b.gy - k.y));

    // Exclude module c itself when checking if the spot is blocked by another module
    const outrasCaixas = caixas.filter((b) =>
      Math.abs(b.x0 - (c.gx + 0.08)) > 0.05 || Math.abs(b.y0 - (c.gy + 0.08)) > 0.05
    );

    for (const p of candidatos) {
      if (p.gx >= 1 && p.gy >= 1 && p.gx < sessao.terreno.n - 1 && p.gy < sessao.terreno.n - 1) {
        if (sessao.terreno.inclinacaoEm(p.gx, p.gy) <= sessao.terreno.maxAndar) {
          const colide = outrasCaixas.some((b) => {
            const px = Math.max(b.x0, Math.min(p.gx, b.x1));
            const py = Math.max(b.y0, Math.min(p.gy, b.y1));
            return (p.gx - px) ** 2 + (p.gy - py) ** 2 < (k.raio + 0.08) ** 2;
          });
          if (!colide) return p;
        }
      }
    }
    return candidatos[0];
  }

  // Rooms you can use light up under the cursor, like buttons.
  // The resting tint of a module picture: none on the Moon, Mars's warm light on Mars.
  private tingir(img?: Phaser.GameObjects.Image) {
    if (!img) return;
    if (sessao.mundo === 'marte') img.setTint(TOM_MARTE); else img.clearTint();
  }

  private destacar(c: Construcao | null) {
    const usavel = c && this.usavel(c) ? c : null;
    if (usavel === this.sobre) return;
    if (this.sobre) this.tingir(this.desenhos.get(this.sobre.id)?.img);
    this.sobre = usavel;
    if (usavel) this.desenhos.get(usavel.id)?.img.setTint(0xfff3c4);
    this.input.setDefaultCursor(usavel ? 'pointer' : 'default');
  }

  private entrada(): Entrada {
    const t = this.teclas;
    // Screen directions to map axes: up-screen = -gx -gy, right-screen = +gx -gy.
    let sx = 0, sy = 0;
    if (t.W.isDown || t.UP.isDown) sy -= 1;
    if (t.S.isDown || t.DOWN.isDown) sy += 1;
    if (t.A.isDown || t.LEFT.isDown) sx -= 1;
    if (t.D.isDown || t.RIGHT.isDown) sx += 1;
    let dx = sx + sy, dy = sy - sx;
    if (sx || sy) { this.rota = []; this.alvoUsar = null; this.alvoRover = false; this.seguir = true; this.recolherBandeira(); }
    else if (this.alvoRover && this.pertoRover()) {
      this.alternarRover();
    }
    else if (this.rota.length) {
      // Follow the A* waypoint list: steer toward the first remaining waypoint, pop it
      // when close enough, and repeat until the route is done.
      const wp = this.rota[0];
      dx = wp.gx - this.corpo.x; dy = wp.gy - this.corpo.y;
      const d = Math.hypot(dx, dy);

      // Check if we should interact with the target module (close enough to any edge).
      if (this.alvoUsar && this.perto(this.alvoUsar)) {
        const u = this.alvoUsar;
        this.rota = []; this.alvoUsar = null; dx = dy = 0;
        this.recolherBandeira();
        this.usar(u);
      } else if (d < 0.35) {
        // Reached this waypoint, advance to the next.
        this.rota.shift();
        if (!this.rota.length) {
          dx = dy = 0;
          this.recolherBandeira();
          if (this.alvoUsar && this.perto(this.alvoUsar)) {
            const u = this.alvoUsar;
            this.alvoUsar = null;
            this.usar(u);
          } else {
            this.alvoUsar = null;
          }
        }
      }
    }
    return { dx, dy, pular: Phaser.Input.Keyboard.JustDown(t.SPACE) };
  }

  // ---------- batteries ----------
  private perto(c: Construcao) {
    const k = this.corpo;
    const px = Phaser.Math.Clamp(k.x, c.gx, c.gx + c.tipo.w), py = Phaser.Math.Clamp(k.y, c.gy, c.gy + c.tipo.h);
    return Math.hypot(k.x - px, k.y - py) <= ALCANCE;
  }

  // Things you can use: where the batteries are, the rooms, and the module that needs fixing today.
  private usavel(c: Construcao) {
    return c.tipo.id === origemBaterias(sessao.mundo) || !!c.tipo.sala || sessao.evento?.construcaoId === c.id;
  }

  private usarPerto() {
    if (!this.podeUsarRover()) return;
    if (sessao.rover?.dirigindo || this.pertoRover()) { this.alternarRover(); return; }
    const c = sessao.grade.lista.find((m) => this.perto(m) && this.usavel(m));
    if (c) this.usar(c);
  }

  private usar(c: Construcao) {
    if (sessao.rover?.dirigindo) return;
    if (sessao.emTarefa) return;
    if (sessao.evento?.construcaoId === c.id && sessao.fase === 'dia') { this.consertar(); return; }
    if (!c.tipo.sala && c.tipo.id !== origemBaterias(sessao.mundo)) {
      sessao.emitir('mensagem', `${c.tipo.nome}: ${c.tipo.papel}`);
      return;
    }
    if (sessao.fase !== 'dia') {
      sessao.emitir('mensagem', sessao.fase === 'inicio' ? '🚀 Press ◀ MENU, then LAUNCH MISSION!' : '🌙 Wait for the morning report.');
      return;
    }
    if (c.tipo.id === origemBaterias(sessao.mundo)) {
      if (!sessao.noHabitat) { sessao.emitir('mensagem', '🔋 No batteries left here today.'); return; }
      const pegar = () => {
        sessao.carregando += sessao.noHabitat;
        sessao.noHabitat = 0;
        sessao.emitir('mensagem', `🔋 You picked up ${sessao.carregando} batteries! Take them to the rooms.`, '#86efac');
        sessao.emitir('estado');
      };
      // Batteries come from the Sun: the first pickup of the day charges them with an energy task.
      if (!sessao.energiaHoje) {
        sessao.energiaHoje = true;
        const cena = ENERGIA[Math.floor(Math.random() * ENERGIA.length)];
        sessao.emTarefa = true;
        let feito = false;
        const uma = () => { if (feito) return; feito = true; sessao.emTarefa = false; pegar(); };
        this.scene.get(cena).events.once('shutdown', () => this.time.delayedCall(0, uma));
        this.scene.launch(cena, { aoConcluir: uma });
        this.scene.bringToTop(cena);
        return;
      }
      pegar();
    } else if (c.tipo.sala) {
      if (!sessao.carregando) { sessao.emitir('mensagem', `✋ Your hands are empty! Pick up 🔋 at the ${sessao.mundo === 'lua' ? 'Battery Bank' : 'Lander'}.`); return; }
      // The first battery a room gets each day comes with a task from the bank (../tarefas).
      const sala = c.tipo.sala;
      const escolha = sessao.tarefasHoje.has(sala) ? undefined : escolher(sala, sessao.ultimaTarefa[sala]);
      sessao.tarefasHoje.add(sala);
      if (escolha) {
        sessao.ultimaTarefa[sala] = escolha.id;
        sessao.emTarefa = true;
        const terminar = () => { sessao.emTarefa = false; this.entregar(c); };
        if ('tarefa' in escolha) {
          const dados: DadosTarefa = { tarefa: escolha.tarefa, aoTerminar: terminar };
          this.scene.launch('Tarefa', dados);
        } else {
          // A ready scene: the battery goes in when it ends, or when it is closed (the red X / Esc).
          let entregue = false;
          const uma = () => { if (entregue) return; entregue = true; terminar(); };
          const cena = this.scene.get(escolha.cena);
          cena.events.once('shutdown', () => this.time.delayedCall(0, uma));
          this.scene.launch(escolha.cena, { aoConcluir: uma });
          this.scene.bringToTop(escolha.cena);
        }
        return;
      }
      this.entregar(c);
      return;
    }
    sessao.emitir('estado');
  }

  private podeUsarRover() {
    return this.input.enabled && !sessao.emTarefa && !sessao.abastecendoRover && !configuracoesAbertas && !sessao.transicao && !sessao.voo
      && sessao.vista === 'chao' && (sessao.fase === 'inicio' || sessao.fase === 'dia');
  }

  private pertoRover() {
    const r = sessao.rover;
    return !!r && this.corpo.noChao && Math.hypot(this.corpo.x - r.corpo.x, this.corpo.y - r.corpo.y) <= 2
      && Math.abs(this.corpo.z - r.corpo.z) < 0.4;
  }

  private caminharAoRover() {
    const r = sessao.rover;
    if (!r) return;
    const caixas = sessao.grade.caixas();
    for (let i = 0; i < 8; i++) {
      const a = i * Math.PI / 4;
      const gx = r.corpo.x + Math.cos(a) * 1.4, gy = r.corpo.y + Math.sin(a) * 1.4;
      if (!pontoLivre(sessao.terreno, caixas, gx, gy, this.corpo.raio)) continue;
      const caminho = encontrarCaminho(sessao.terreno, caixas, this.corpo.raio, this.corpo.x, this.corpo.y, gx, gy);
      if (!caminho?.length) continue;
      this.rota = caminho; this.alvoUsar = null; this.alvoRover = true; this.seguir = true;
      this.plantarBandeira(gx, gy);
      return;
    }
    sessao.emitir('mensagem', 'Walk closer to the rover and press E to drive.', '#fde68a');
  }

  private alternarRover() {
    const r = sessao.rover;
    if (!r || !this.podeUsarRover()) return;
    if (r.dirigindo) {
      const astronauta = desembarcar(r, sessao.terreno, sessao.grade.caixas());
      if (!astronauta) { sessao.emitir('mensagem', 'No room to get out. Move the rover to an open spot.', '#fde68a'); return; }
      this.corpo = astronauta;
    } else {
      if (!this.pertoRover()) return;
      if (!sessao.roverCarregado) {
        this.rota = []; this.alvoRover = false; this.alvoUsar = null; this.recolherBandeira();
        if (sessao.carregando < 1) {
          sessao.emitir('mensagem', 'Rover battery empty. Bring 1 battery from the Battery Bank, then press E or click the rover to install it. One battery lasts all day.', '#fde68a');
          return;
        }
        this.abastecerRover();
        return;
      }
      r.dirigindo = true;
      this.corpo = r.corpo;
      this.corpo.vx = this.corpo.vy = 0;
    }
    this.rota = []; this.alvoUsar = null; this.alvoRover = false;
    this.recolherBandeira(); this.seguir = true;
    sessao.emitir('mensagem', r.dirigindo ? 'Rover: WASD / arrows to drive, E or click the rover to get out. Click the ground to drive there.' : 'Back on foot! Press E near the rover to drive again.', '#93c5fd');
    sessao.emitir('estado');
    if (r.dirigindo && !sessao.curiosidadeRoverVista) this.scene.launch('CuriosidadeRover');
  }

  private abastecerRover() {
    const r=sessao.rover;if(!r || sessao.abastecendoRover || sessao.carregando<1)return;
    const dia=sessao.estado.dia;
    sessao.salvar();
    sessao.abastecendoRover=true;
    this.rota=[];this.alvoRover=false;this.alvoUsar=null;this.recolherBandeira();
    this.corpo.vx=this.corpo.vy=0;this.input.keyboard?.resetKeys();
    const inicio=paraTela(P,this.corpo.x,this.corpo.y,this.corpo.z+0.8);
    const fim=paraTela(P,r.corpo.x+0.56*Math.cos(r.angulo),r.corpo.y+0.56*Math.sin(r.angulo),r.corpo.z+0.51);
    const bateria=criarIconeJogo(this,inicio.x,inicio.y,'energy',24).setDepth(1_000_003);
    const aviso=this.add.text(fim.x,fim.y-27,'Installing battery...',fonte(12,'#fde047',{
      backgroundColor:'#14243e',padding:{x:9,y:5},
    })).setOrigin(0.5,1).setDepth(1_000_003);
    this.mapa.add([bateria,aviso]);tocarSfx('bateria');
    this.tweens.add({targets:bateria,x:fim.x,y:fim.y,displayWidth:10,displayHeight:10,
      duration:movimentoReduzido()?350:1100,ease:'Sine.easeInOut',onComplete:()=>{
        bateria.destroy();aviso.destroy();sessao.abastecendoRover=false;
        if(sessao.rover!==r || sessao.fase!=='dia' || sessao.estado.dia!==dia || sessao.carregando<1)return;
        sessao.carregando--;sessao.diaCargaRover=dia;
        tocarSfx('ligar');this.aplicarZoom();this.alternarRover();
        sessao.emitir('mensagem','Battery installed. Rover charged for today!','#86efac');
        sessao.posicaoAstronauta=this.corpo;sessao.salvar();
      }});
  }

  private animarMontagem() {
    const progresso=sessao.progressoFoguete,antes=this.progressoAnterior;
    this.progressoAnterior=progresso;
    if(sessao.mundo!=='lua' || progresso<=antes)return;
    const pad=sessao.grade.lista.find(c=>c.tipo.id==='plataforma');
    const oficina=sessao.grade.lista.find(c=>c.tipo.id==='oficina');
    if(!pad || !oficina)return;
    const etapa=Math.min(4,Math.floor(progresso/25));
    const mudou=etapa>Math.floor(antes/25);
    const nomes=['Launch pad ready','Engine installed','Fuel tanks installed','Crew capsule installed','Rocket ready for launch!'];
    const fim=paraTela(P,pad.gx+pad.tipo.w/2,pad.gy+pad.tipo.h/2,pad.z+0.9+etapa*0.4);
    const inicio=paraTela(P,oficina.gx+oficina.tipo.w/2,oficina.gy+oficina.tipo.h/2,oficina.z+oficina.tipo.altura);
    const peca=criarIconeJogo(this,inicio.x,inicio.y,'wrench',22).setDepth(1_000_002);
    const texto=this.add.text(fim.x,fim.y-12,mudou?nomes[etapa]:`Parts delivered · ${Math.round(progresso)}%`,fonte(13,mudou?'#86efac':'#fde047',{
      backgroundColor:'#14243e',padding:{x:9,y:6},
    })).setOrigin(0.5,1).setDepth(1_000_002).setAlpha(0);
    this.mapa.add([peca,texto]);
    tocarSfx('montagem');
    this.tweens.add({targets:peca,x:fim.x,y:fim.y,angle:movimentoReduzido()?0:180,
      duration:movimentoReduzido()?1:750,ease:'Sine.easeInOut',onComplete:()=>{
        peca.destroy();texto.setAlpha(1);
        this.tweens.add({targets:texto,alpha:0,y:fim.y-(movimentoReduzido()?12:32),delay:1800,duration:500,onComplete:()=>texto.destroy()});
      }});
    if(mudou)sessao.emitir('mensagem',`${nomes[etapa]} Rocket progress: ${Math.round(progresso)}%.`,'#86efac');
  }

  // ---------- random events (engine/eventos.ts) ----------
  // The countdown only runs while the day is being played (no task, no settings, no film).
  private passarEventos(dt: number) {
    if (sessao.eventoEm === null || sessao.fase !== 'dia' || sessao.emTarefa || sessao.transicao || this.pouso) return;
    sessao.eventoEm -= dt;
    if (sessao.eventoEm > 0) return;
    sessao.eventoEm = null;
    const presentes = sessao.grade.lista.map((c) => c.tipo.id);
    const alarme = sessao.alarmeHoje && presentes.includes(sessao.alarmeHoje.modulo) ? sessao.alarmeHoje : null;
    sessao.alarmeHoje = null;
    const def = alarme ?? sortearEvento(presentes, sessao.ultimoEvento);
    const modulos = def ? sessao.grade.lista.filter((c) => c.tipo.id === def.modulo) : [];
    if (!def || !modulos.length) return;
    sessao.evento = { def, construcaoId: modulos[Math.floor(Math.random() * modulos.length)].id };
    sessao.ultimoEvento = def.id;
    sessao.diasCalmos = 0;
    sessao.emitir('mensagem', def.aviso.replace('{nasa}', sessao.dia.curto), def.alarme ? '#fca5a5' : '#fde68a');
    if (def.alarme) for (let k = 0; k < 3; k++) this.time.delayedCall(k * 380, () => tocarSfx('aviso'));
  }

  // Walk up to the module and press E (or click it): the task plays, and fixing it gives a bonus battery.
  // Closing the task early leaves the problem there.
  private consertar() {
    const ev = sessao.evento;
    if (!ev) return;
    sessao.emTarefa = true;
    let feito = false;
    this.scene.get(ev.def.cena).events.once('shutdown', () => this.time.delayedCall(0, () => { if (!feito) sessao.emTarefa = false; }));
    this.scene.launch(ev.def.cena, { aoConcluir: () => {
      feito = true;
      sessao.emTarefa = false;
      sessao.evento = null;
      if (ev.def.efeito === 'radiacao') {
        sessao.estado = { ...sessao.estado, dose: Math.max(0, sessao.estado.dose - DOSE_ALARME) };
        sessao.emitir('mensagem', `🛡 Safe! Radiation dropped by ${DOSE_ALARME}.  💡 ${ev.def.fato}`, '#86efac');
      } else {
        sessao.carregando += BONUS_CONSERTO;
        sessao.emitir('mensagem', `🔧 Fixed! The crew shares ${BONUS_CONSERTO} extra 🔋.  💡 ${ev.def.fato}`, '#86efac');
      }
      sessao.emitir('estado');
    } });
    this.scene.bringToTop(ev.def.cena);
  }

  // One battery to a room, through the rules (regras.entregar): on Mars it first builds the
  // module (its construction cost), then powers it.
  private entregar(c: Construcao) {
    const sala = c.tipo.sala!;
    const C = sessao.C;
    const obra = this.emObra(c);
    sessao.carregando--;
    [sessao.estado, sessao.entregas] = entregarRegra(sessao.estado, sessao.entregas, sala, C);
    const n = sessao.entregas[sala];
    if (!obra) sessao.emitir('mensagem', sala === 'blindagem'
      ? `🔋 +1 battery: the pump fills the water walls${n >= 3 ? ' to the top!' : '.'} Water stops radiation.`
      : `🔋 +1 battery to the ${this.nomeDe(c)}!`, '#86efac');
    else if (pronto(sessao.estado, sala, C)) sessao.emitir('mensagem', `🏗 ${this.nomeDe(c)} is built! From now on its batteries make it work.`, '#86efac');
    else sessao.emitir('mensagem', `🔋 +1 battery to build the ${this.nomeDe(c)}: ${sessao.estado.obras[sala] ?? 0} of ${custo(sala, C)}.`, '#fde68a');
    sessao.emitir('estado');
  }

  // A room still being built (Mars): its batteries go into construction.
  private emObra(c: Construcao) {
    const sala = c.tipo.sala;
    return !!sala && custo(sala, sessao.C) > 0 && !pronto(sessao.estado, sala, sessao.C);
  }

  // ---------- cargo lander ----------
  // Picks a flat, free spot near the base, then the lander comes down on it with its engine.
  private chegar(tipo: TipoId) {
    if (this.pouso || sessao.grade.lista.some((c) => c.tipo.id === tipo)) return;
    const hab = sessao.grade.lista.find((c) => c.tipo.id === 'habitat')!;
    const t = TIPOS[tipo];
    const [dx, dy] = SETORES_SUPRIMENTOS[tipo] ?? [6, -6];
    const center = Math.floor(sessao.terreno.n / 2);
    const p = sessao.grade.procurarComEspaco(t, center + dx, center + dy);
    if (!p) return;
    const chao = sessao.terreno.alturaMax(p.gx, p.gy, t.w, t.h) + 0.025;
    const img = this.add.image(0, 0, 'mod_pouso');
    const chama = this.add.image(0, 0, 'mod_chama').setBlendMode(Phaser.BlendModes.ADD);
    const sombra = this.add.ellipse(0, 0, 60, 26, 0x000000, 0.25);
    this.mapa.add([sombra, chama, img]);
    this.pouso = { tipo, gx: p.gx, gy: p.gy, z: chao + ALTURA_POUSO, vz: -3, chao, fase: 'descendo', t: 0, empuxo: 0, img, chama, sombra };
    this.seguir = false;
    sessao.emitir('mensagem', `📦 A cargo lander brings the ${t.nome}! No air on the Moon means no parachute: it brakes with its rockets.`, '#fde68a');
  }

  // Liftoff at the end of chapter 1 ("Board the ship"): the rocket leaves the pad on its engine,
  // against the Moon's gravity, the camera follows, and `fim` runs once it is out of sight.
  // With reduced motion it just calls `fim`.
  decolar(fim: () => void) {
    const pad = sessao.grade.lista.find((c) => c.tipo.id === 'plataforma');
    if (!pad || movimentoReduzido() || !this.textures.exists('viagem_foguete')) { fim(); return; }
    this.foguetePartiu = true;
    this.desenharModulo(pad);
    const f = dadosViagem.foguete;
    const img = this.add.image(0, 0, 'viagem_foguete').setOrigin(f.ancora[0] / f.w, f.ancora[1] / f.h).setScale(f.escala);
    const chama = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD);
    this.mapa.add([chama, img]);
    const cx = pad.gx + pad.tipo.w / 2, cy = pad.gy + pad.tipo.h / 2;
    this.decolagem = { img, chama, cx, cy, z: pad.z + pad.tipo.altura, vz: 0, t: 0, fim };
    this.seguir = false;
    this.poeira(cx, cy, pad.z + pad.tipo.altura);
    sessao.emitir('mensagem', 'Liftoff! On the Moon a rocket only has to beat one sixth of Earth\'s gravity, and there is no air to push through.', '#fde68a');
  }

  private animarDecolagem(dt: number) {
    const D = this.decolagem;
    if (!D) return;
    D.t += dt;
    // Engine thrust grows as the propellant burns off: acceleration G * (2 + 6 t), lunar gravity included.
    D.vz += G * (2 + 6 * D.t) * dt;
    D.z += D.vz * dt;
    const p = paraTela(P, D.cx, D.cy, D.z);
    const prof = 1e6 - 5;
    D.img.setPosition(p.x, p.y).setDepth(prof);
    const s = Math.abs(P.ez[1]) / 36;
    const comp = (34 + 18 * Math.min(1, D.t)) * s * Phaser.Math.FloatBetween(0.85, 1.15);
    D.chama.clear().setDepth(prof - 1)
      .fillStyle(0xfb923c, 0.85).fillTriangle(p.x - 9 * s, p.y, p.x + 9 * s, p.y, p.x, p.y + comp)
      .fillStyle(0xfde68a, 0.95).fillTriangle(p.x - 5 * s, p.y, p.x + 5 * s, p.y, p.x, p.y + comp * 0.55);
    const cam = this.cameras.main;
    cam.centerOn(Phaser.Math.Linear(cam.midPoint.x, p.x, 0.04), Phaser.Math.Linear(cam.midPoint.y, p.y + 60, 0.04));
    if (D.t < 3.2) return;
    D.img.destroy(); D.chama.destroy();
    this.decolagem = null;
    D.fim();
  }

  private animarPouso(dt: number) {
    const L = this.pouso;
    if (!L) return;
    const t = TIPOS[L.tipo];
    L.t += dt;
    if (L.fase === 'descendo') {
      L.empuxo = empuxoDePouso(L.z - L.chao, L.vz, G);
      L.vz += (L.empuxo - G) * dt;
      L.z += L.vz * dt;
      if (L.z <= L.chao) {
        L.z = L.chao; L.vz = 0; L.empuxo = 0; L.fase = 'pousado'; L.t = 0;
        this.poeira(L.gx + t.w / 2, L.gy + t.h / 2, L.chao);
      }
    } else if (L.fase === 'pousado' && L.t > 1.2) {
      // Unload: the equipment joins the base, the lander lifts off for its next trip.
      const c = sessao.grade.construir(t, L.gx, L.gy);
      if (c) {
        this.desenharModulo(c);
        this.desenharCaminhos();
        const d = this.desenhos.get(c.id)!;
        d.img.setAlpha(0); d.rotulo?.setAlpha(0);
        this.tweens.add({ targets: [d.img, d.rotulo].filter(Boolean), alpha: 1, duration: 600 });
        const s = suprimentoDoDia(sessao.estado.dia);
        sessao.emitir('mensagem', s?.tipo === t.id ? `🔓 ${t.nome}!  💡 ${s.fato}` : `🔓 ${t.nome} unlocked!`, '#86efac');
        sessao.emitir('desbloqueado', c);
      }
      L.fase = 'subindo'; L.t = 0;
    } else if (L.fase === 'subindo') {
      L.empuxo = 2.5 * G;
      L.vz += (L.empuxo - G) * dt;
      L.z += L.vz * dt;
      if (L.z > L.chao + ALTURA_POUSO * 1.4) {
        L.img.destroy(); L.chama.destroy(); L.sombra.destroy();
        this.pouso = null;
        this.seguir = true;
        return;
      }
    }
    // Lander centered on the equipment's footprint (its own is 2 x 2).
    const cx = L.gx + t.w / 2, cy = L.gy + t.h / 2;
    const m = modelos.pouso, mc = modelos.chama;
    const p = paraTela(P, cx - 1, cy - 1, L.z);
    L.img.setOrigin(m.ancora[0] / m.w, m.ancora[1] / m.h).setScale(m.escala).setPosition(p.x, p.y);
    const forca = Phaser.Math.Clamp(L.empuxo / (2 * G), 0, 1.4);
    L.chama.setOrigin(mc.ancora[0] / mc.w, mc.ancora[1] / mc.h).setPosition(p.x, p.y)
      .setScale(mc.escala * (0.6 + 0.4 * forca), mc.escala * (0.4 + 0.8 * forca) * Phaser.Math.FloatBetween(0.85, 1.15))
      .setAlpha(forca > 0.05 ? 0.95 : 0);
    const solo = paraTela(P, cx, cy, L.chao);
    const alto = L.z - L.chao;
    L.sombra.setPosition(solo.x, solo.y).setScale(1 / (1 + alto * 0.08)).setAlpha(Phaser.Math.Clamp(0.35 - alto * 0.015, 0.08, 0.35));
    const prof = profundidade(cx + 1, cy + 1);
    L.sombra.setDepth(prof - 2); L.chama.setDepth(prof + 0.5); L.img.setDepth(prof + 1);
    // Watch it land, then hand the camera back.
    if (sessao.vista === 'chao' && !sessao.voo) {
      const cam = this.cameras.main;
      cam.centerOn(Phaser.Math.Linear(cam.midPoint.x, solo.x, 0.05), Phaser.Math.Linear(cam.midPoint.y, solo.y - 30, 0.05));
    }
  }

  // ---------- the crew's rocket arriving (after the launch film, Chegada.ts) ----------
  // The rocket comes down on the launch pad braking with its engine, lands, then vanishes in a
  // puff of smoke and leaves the empty pad: the crew has to build a new one to reach Mars.
  private pousarFoguete(fim: () => void) {
    const c = sessao.grade.lista.find((k) => k.tipo.id === 'plataforma');
    const d = c && this.desenhos.get(c.id);
    if (!c || !d || !this.textures.exists(CHAVE_FOGUETE)) { fim(); return; }
    sessao.emTarefa = true;
    this.seguir = false;
    const cam = this.cameras.main;
    const m4 = modelos.foguete4, mc = modelos.chama;
    const base = paraTela(P, c.gx, c.gy, c.z);
    // Base of the rocket where it stands in the finished pad picture (foguete4), so it lands on
    // exactly the pixels it will occupy once the picture swaps.
    const pe = { x: base.x + (foguetevoo.peNoPad[0] - m4.ancora[0]) * m4.escala, y: base.y + (foguetevoo.peNoPad[1] - m4.ancora[1]) * m4.escala };
    const cx = c.gx + c.tipo.w / 2, cy = c.gy + c.tipo.h / 2;
    const altura = paraTela(P, cx, cy, c.z).y - paraTela(P, cx, cy, c.z + ALTURA_POUSO).y;
    const alturaFoguete = foguetevoo.h * m4.escala;
    const prof = d.img.depth;

    const sombra = this.add.ellipse(pe.x, pe.y - 6, 70, 26, 0x000000, 0.1).setDepth(prof - 0.5);
    const chama = this.add.image(pe.x, pe.y, 'mod_chama').setOrigin(0.5, 0.05).setTint(0xfb923c, 0xfb923c, 0xfde047, 0xfde047).setDepth(prof - 0.4);
    const foguete = this.add.image(pe.x, pe.y - altura, CHAVE_FOGUETE).setOrigin(foguetevoo.pe[0] / foguetevoo.w, 1).setScale(m4.escala).setDepth(prof + 1);
    this.mapa.add([sombra, chama, foguete]);
    sessao.emitir('mensagem', '🚀 Your crew is landing! No air means no parachute: the rocket brakes with its engine.', '#fde68a');

    tocarMotor(3.5, 1, 0.3);
    const voo = { h: 1 };
    const desenhar = () => {
      const y = pe.y - voo.h * altura;
      foguete.setY(y);
      // full burn up high, the flame shortens over the last metres so it never pokes through the pad
      const forca = (0.75 + 0.5 * voo.h) * Phaser.Math.Clamp(voo.h / 0.12, 0, 1);
      chama.setPosition(pe.x, y - 22 * m4.escala).setScale(mc.escala * 1.3 * forca, mc.escala * 1.6 * forca * Phaser.Math.FloatBetween(0.85, 1.15));
      sombra.setScale(1 / (1 + voo.h * 1.5)).setAlpha(0.32 - voo.h * 0.22);
      cam.centerOn(pe.x, Phaser.Math.Linear(pe.y - alturaFoguete * 0.5, y - alturaFoguete * 0.5, 0.6));
    };
    desenhar();
    this.tweens.add({
      targets: voo, h: 0, duration: 3400, ease: 'Cubic.easeOut', onUpdate: desenhar,
      onComplete: () => {
        chama.destroy(); sombra.destroy(); foguete.destroy();
        this.posicionar(d.img, c, 'foguete4');          // the rocket now stands on the pad
        this.poeira(cx, cy, c.z);
        this.cameras.main.shake(260, 0.004);
        tocarSfx('pouso');
        this.time.delayedCall(450, () => tocarSfx('sucesso'));
        sessao.emitir('mensagem', '🎉 Touchdown! The crew is safe on the Moon.', '#86efac');
        this.time.delayedCall(1300, () => this.fumacaFoguete(pe, alturaFoguete, prof, () => {
          this.posicionar(d.img, c, this.modelo(c));       // back to the empty pad
        }, () => {
          tocarSfx('aviso');
          sessao.emitir('mensagem', '💨 The rocket was used up on the trip. Build a new one on the Launch Pad to fly to Mars! 🛠', '#fde047');
          // Time to read it before the morning chat opens (the chat repeats it on day 1).
          this.time.delayedCall(4500, () => { sessao.emTarefa = false; this.seguir = true; fim(); });
        }));
      },
    });
  }

  // A cartoon "poof" over the rocket, in little pieces: small puffs (each with the game's dark
  // outline) pop up one after another until they hide it, the picture swaps behind them, then each
  // puff drifts away and shrinks, with a few sparkles.
  private fumacaFoguete(pe: { x: number; y: number }, alto: number, prof: number, trocar: () => void, fim: () => void) {
    tocarSfx('fumaca');
    const cx = pe.x, cy = pe.y - alto * 0.5;
    const L = Math.max(46, alto * 0.42);   // size of the whole poof, follows the rocket on screen

    // Where the pieces sit, (dx, dy, r) in units of L: a column with a wide base, like the rocket.
    const pecas: [number, number, number][] = [
      [0, -1.0, 0.26], [-0.3, -0.78, 0.24], [0.32, -0.8, 0.25],
      [-0.12, -0.52, 0.27], [0.36, -0.42, 0.24], [-0.44, -0.3, 0.26],
      [0.12, -0.18, 0.28], [-0.2, 0.06, 0.27], [0.5, 0.08, 0.26],
      [-0.56, 0.26, 0.25], [0.2, 0.32, 0.29], [-0.24, 0.52, 0.28],
      [0.58, 0.56, 0.26], [-0.7, 0.72, 0.24], [0.06, 0.74, 0.3],
      [0.4, 0.92, 0.24], [-0.4, 0.94, 0.25], [0.86, 0.9, 0.18], [-0.92, 0.94, 0.17],
    ];
    const ordem = pecas.map((p, i) => ({ p, i })).sort((a, b) => b.p[1] - a.p[1]);   // from the ground up
    const bolas: Phaser.GameObjects.Graphics[] = [];
    ordem.forEach(({ p: [dx, dy, r] }, k) => {
      const x = cx + (dx + Phaser.Math.FloatBetween(-0.05, 0.05)) * L, y = cy + (dy + Phaser.Math.FloatBetween(-0.04, 0.04)) * L;
      const raio = r * L * Phaser.Math.FloatBetween(0.85, 1.15);
      const bola = this.add.graphics().setPosition(x, y).setDepth(prof + 2 + (dy + 2) * 0.01).setScale(0);
      // one to three bubbles per piece, so no two look the same
      const extra: [number, number, number][] = [[0, 0, raio]];
      if (k % 2 === 0) extra.push([raio * 0.62, raio * 0.28, raio * 0.6]);
      if (k % 3 === 0) extra.push([-raio * 0.58, raio * 0.3, raio * 0.55]);
      this.desenharNuvem(bola, extra);
      this.mapa.add(bola);
      bolas.push(bola);
      const atraso = k * 22;
      this.tweens.add({ targets: bola, scale: 1, duration: 260, delay: atraso, ease: 'Back.easeOut' });
      // a little bob while it hangs there
      this.tweens.add({ targets: bola, y: y - raio * 0.15, duration: 300, delay: atraso + 260, yoyo: true, repeat: 1, ease: 'Sine.easeInOut' });
    });
    this.time.delayedCall(ordem.length * 22 + 260, trocar);

    this.time.delayedCall(1350, () => {
      tocarSfx('bolha');
      // each piece drifts away from the middle and shrinks, the top ones first
      bolas.forEach((bola, k) => {
        const dx = bola.x - cx, dy = bola.y - cy;
        const d = Math.hypot(dx, dy) || 1;
        this.tweens.add({
          targets: bola, x: bola.x + (dx / d) * L * 0.7, y: bola.y + (dy / d) * L * 0.5 - L * 0.35, scale: 0, angle: Phaser.Math.Between(-25, 25),
          duration: 520, delay: (bolas.length - 1 - k) * 18, ease: 'Back.easeIn', onComplete: () => bola.destroy(),
        });
      });
      // sparkles
      for (let i = 0; i < 5; i++) {
        const a = -Math.PI / 2 + (i - 2) * 0.7;
        const est = this.add.graphics().setPosition(cx, cy).setDepth(prof + 2.2).setScale(0);
        this.desenharEstrela(est, L * 0.16);
        this.mapa.add(est);
        this.tweens.add({ targets: est, x: cx + Math.cos(a) * L * 1.3, y: cy + Math.sin(a) * L * 1.5, scale: 1, angle: 90, duration: 380, delay: 250 + i * 40, ease: 'Back.easeOut' });
        this.tweens.add({ targets: est, scale: 0, duration: 260, delay: 750 + i * 40, onComplete: () => est.destroy() });
      }
    });
    this.time.delayedCall(2500, fim);
  }

  // Cartoon puff: one dark outline around its bubbles, a soft shadow, a light top and a shine.
  private desenharNuvem(g: Phaser.GameObjects.Graphics, bolhas: [number, number, number][]) {
    const contorno = 0x1e293b, linha = Math.max(3, bolhas[0][2] * 0.12);
    g.fillStyle(contorno);
    for (const [x, y, r] of bolhas) g.fillCircle(x, y, r + linha);
    g.fillStyle(0xb8c4d6);
    for (const [x, y, r] of bolhas) g.fillCircle(x, y, r);
    g.fillStyle(0xf1f5f9);
    for (const [x, y, r] of bolhas) g.fillCircle(x - r * 0.1, y - r * 0.16, r * 0.8);
    g.fillStyle(0xffffff, 0.95);
    for (const [x, y, r] of bolhas) g.fillEllipse(x - r * 0.34, y - r * 0.42, r * 0.42, r * 0.26);
  }

  // A four-point yellow star with the game's outline.
  private desenharEstrela(g: Phaser.GameObjects.Graphics, r: number) {
    const pontos = (k: number) => {
      const p: Phaser.Math.Vector2[] = [];
      for (let i = 0; i < 8; i++) {
        const a = (i / 8) * Math.PI * 2 - Math.PI / 2;
        const d = (i % 2 ? r * 0.38 : r) * k;
        p.push(new Phaser.Math.Vector2(Math.cos(a) * d, Math.sin(a) * d));
      }
      return p;
    };
    g.fillStyle(0x1e293b).fillPoints(pontos(1.35), true);
    g.fillStyle(0xfde047).fillPoints(pontos(1), true);
  }

  // ---------- loop ----------
  update(_t: number, dtMs: number) {
    const dt = Math.min(0.05, dtMs / 1000);
    this.aplicarZoom();
    const escudo = sessao.grade.lista.find(c => c.tipo.id === 'blindagem');
    const emergencia = sessao.fase === 'dia' && sessao.tempestade.status === 'alerta';
    const mostrarSeta = emergencia && !!escudo && sessao.vista === 'chao';
    this.setaEmergencia.setVisible(mostrarSeta);
    if (mostrarSeta && escudo) {
      // Anchor on the shield module even if its picture is not on screen yet.
      const imagem = this.desenhos.get(escudo.id)?.img;
      const topo = imagem
        ? imagem.getTopCenter()
        : paraTela(P, escudo.gx + escudo.tipo.w / 2, escudo.gy + escudo.tipo.h / 2, escudo.z + escudo.tipo.altura);
      const cam = this.cameras.main;
      // Keep the sign on screen and clear of the fixed HUD strip at the top.
      let baseX = topo.x, baseY = topo.y;
      const paraTelaX = (wx: number) => (wx - cam.scrollX - cam.width / 2) * cam.zoom + cam.x + cam.width / 2;
      const paraTelaY = (wy: number) => (wy - cam.scrollY - cam.height / 2) * cam.zoom + cam.y + cam.height / 2;
      const paraMundoX = (sx: number) => (sx - cam.x - cam.width / 2) / cam.zoom + cam.scrollX + cam.width / 2;
      const paraMundoY = (sy: number) => (sy - cam.y - cam.height / 2) / cam.zoom + cam.scrollY + cam.height / 2;
      const meiaPlaca = (this.larguraPlacaEmergencia / 2) * cam.zoom;
      const topoPlaca = 90 + this.alturaPlacaEmergencia * cam.zoom;
      const telaX = paraTelaX(baseX), telaY = paraTelaY(baseY);
      if (telaY < topoPlaca) baseY = paraMundoY(topoPlaca);
      if (telaX - meiaPlaca < 12) baseX = paraMundoX(12 + meiaPlaca);
      else if (telaX + meiaPlaca > this.scale.width - 12) baseX = paraMundoX(this.scale.width - 12 - meiaPlaca);
      const reduz = movimentoReduzido();
      // Bounce the whole sign (badge and arrow) so both clearly call for attention.
      const onda = Math.sin(_t * Math.PI * 2 / 720);
      const amplitude = reduz ? 5 : 18;
      this.setaEmergencia.setPosition(Math.round(baseX), Math.round(baseY + onda * amplitude));
      this.ponteiroEmergencia.setY(Math.round(12 + (onda + 1) * (reduz ? 0 : 3)));
      this.ponteiroEmergencia.setScale(1 + (reduz ? 0 : 0.08) * (0.5 + 0.5 * onda));
      // The red halo pulses smoothly, like a warning light (steady in comfort mode).
      const pulso = 0.5 + 0.5 * Math.sin(_t * Math.PI * 2 / 520);
      this.contornoEmergencia.setAlpha(reduz ? 0.3 : 0.16 + 0.3 * pulso);
    }
    this.sombraBandeira.setVisible(this.bandeira.visible).setAlpha(this.bandeira.alpha);
    if(configuracoesAbertas || sessao.transicao) {this.input.keyboard?.resetKeys();this.sons.silenciar();return;}
    const caixas = sessao.grade.caixas();
    const e = this.input.enabled && (sessao.fase === 'dia' || sessao.fase === 'inicio') ? this.entrada() : null;
    const antesNoChao = this.corpo.noChao;
    const antesX = this.corpo.x, antesY = this.corpo.y;
    if (sessao.rover?.dirigindo && !sessao.roverCarregado) {
      this.corpo.vx = this.corpo.vy = 0;
      this.rota = []; this.alvoUsar = null; this.recolherBandeira();
    }
    const { bloqueado } = sessao.rover?.dirigindo
      ? dirigirRover(sessao.rover, sessao.roverCarregado ? e : null, sessao.terreno, caixas, dt)
      : passo(this.corpo, e, sessao.terreno, caixas, dt);
    // Observe successful controls for the tutorial, without changing movement or physics.
    if (e && (e.dx || e.dy) && Math.hypot(this.corpo.x - antesX, this.corpo.y - antesY) > 0.001 && !this.controlesObservados.has('movimento')) {
      this.controlesObservados.add('movimento'); sessao.emitir('controleUsado', 'movimento');
    }
    if (e?.pular && antesNoChao && !this.corpo.noChao && this.corpo.vz > 0 && !this.controlesObservados.has('pulo')) {
      this.controlesObservados.add('pulo'); sessao.emitir('controleUsado', 'pulo');
    }
    if (this.rota.length > 0 && bloqueado) {
      if (++this.bloqueadoCont > 20) {
        this.rota = [];
        this.alvoUsar = null;
        this.bloqueadoCont = 0;
        this.recolherBandeira();
      }
    } else {
      this.bloqueadoCont = 0;
    }
    if (antesNoChao && !this.corpo.noChao && this.corpo.vz > 0 && !sessao.pulou) {
      sessao.pulou = true;
      const terra = pulo(G_TERRA);
      if (sessao.mundo === 'nave') {
        sessao.emitir('mensagem',
          'Deep space has no up or down: without gravity you would float away. Magnetic boots hold you to the metal deck, so a jump barely leaves it.', '#93c5fd');
      } else {
        const mundo = sessao.mundo === 'marte' ? { nome: 'Mars', g: G_MARTE, cor: '#fdba74' } : { nome: 'Moon', g: G_LUA, cor: '#93c5fd' };
        const vezes = pulo(mundo.g).altura / terra.altura;
        sessao.emitir('mensagem',
          `🦘 ${mundo.nome} jump! Gravity is weaker here, so you jump ${vezes >= 4 ? Math.round(vezes) : vezes.toFixed(1)}× higher than on Earth!`, mundo.cor);
      }
    }
    // Gait: the Moon's slow bunny hop; on Mars, with more than twice the gravity, quicker steps.
    if (Math.hypot(this.corpo.vx, this.corpo.vy) > 0.3 && this.corpo.noChao) this.passada += dt * (sessao.mundo === 'marte' ? 18 : 12);
    this.animarPouso(dt);
    this.animarDecolagem(dt);
    this.passarEventos(dt);
    this.desenharComandante();
    if (sessao.rover) {
      const r = sessao.rover;
      desenharRover(this.gRover, P, r, _t, this.gRoverFrente, sessao.roverCarregado, sessao.abastecendoRover);
      const p = paraTela(P, r.corpo.x, r.corpo.y, r.corpo.z + 1.25);
      const carregado = sessao.roverCarregado;
      const acao = r.dirigindo
        ? carregado ? 'E / click: Exit  |  WASD / arrows: Drive' : 'E / click: Exit to pick up a battery'
        : this.pertoRover()
          ? carregado ? 'E / click: Drive Apollo LRV' : sessao.carregando ? 'E / click: Install 1 battery & drive' : 'Bring 1 battery from the Battery Bank'
          : 'APOLLO LRV · Click to approach';
      this.dicaRover.setPosition(p.x, p.y).setVisible(this.podeUsarRover())
        .setText(`Battery: ${carregado ? 'charged' : 'empty'}\n${acao}`);
    }
    sessao.parado = Math.hypot(this.corpo.vx, this.corpo.vy) < 0.05 && this.corpo.noChao;
    this.atualizarOclusao(dt);
    if (this.teto) {
      // Zooming out puts the roof on: the whole closed ship; zooming in shows the deck inside.
      const a = suave(1.3, 1.75, sessao.u);
      this.teto.setAlpha(a).setVisible(a > 0.01);
      for (const t of this.nomesNoMapa) t.setAlpha(1 - a);
    }
    if(this.mapa.visible) this.ambiente.update(dt,this.corpo,sessao.grade.lista,sessao.rover);
    const ativo=this.scene.isVisible() && !document.hidden && this.input.enabled && (sessao.fase==='dia'||sessao.fase==='inicio');
    const proximidade=sessao.grade.lista.filter(c=>c.tipo.sala || c.tipo.id==='habitat')
      .reduce((v,c)=>Math.max(v,1/(1+Math.hypot(c.gx+c.tipo.w/2-this.corpo.x,c.gy+c.tipo.h/2-this.corpo.y)**2*0.2)),0);
    this.sons.atualizar(sessao.rover?.dirigindo?Math.hypot(this.corpo.vx,this.corpo.vy)/6.4:0,proximidade,ativo);
    sessao.posicaoAstronauta=this.corpo;
    sessao.atualizarSalvamento(dtMs);
    if(!this.pouso && this.suprimentosPendentes.length && sessao.fase==='dia') this.chegar(this.suprimentosPendentes.shift()!);
    this.animarModulos(dt);
    this.atualizarDica(dt);

    // Camera follows the commander on the ground.
    if (sessao.vista === 'chao' && !sessao.voo && this.seguir && !this.pouso) {
      const pe = paraTela(P, this.corpo.x, this.corpo.y, this.corpo.z);
      const cam = this.cameras.main;
      cam.centerOn(Phaser.Math.Linear(cam.midPoint.x, pe.x, 0.12), Phaser.Math.Linear(cam.midPoint.y, pe.y, 0.12));
    }
  }

  // Dust kicked up by the engine: it flies in clean arcs and drops straight back (no air).
  private poeira(gx: number, gy: number, z: number) {
    const p = paraTela(P, gx, gy, z);
    for (let i = 0; i < 18; i++) {
      const a = (i / 18) * Math.PI * 2;
      const d = this.add.circle(p.x, p.y, Phaser.Math.Between(2, 4), COR_SOLO_CLARO).setDepth(profundidade(gx, gy) + 5);
      this.mapa.add(d);
      this.tweens.add({ targets: d, x: p.x + Math.cos(a) * 55, y: p.y + Math.sin(a) * 24, alpha: 0, duration: 900, ease: 'Quad.easeOut', onComplete: () => d.destroy() });
    }
  }

  // ---------- drawing ----------
  // Which Blender picture a module shows: the launch pad carries the rocket in 5 build stages, and
  // the shield tower's water walls fill with each battery given to it today (the pump runs on
  // them). While just exploring, the walls are shown full.
  private modelo(c: Construcao): Modelo {
    // Mars: the lander is the crew's home until the dome is built. The heater and the dome
    // borrow the workshop and habitat pictures until they get their own models.
    if (sessao.mundo === 'marte') {
      if (c.tipo.id === 'habitat') return 'pouso';
      if (c.tipo.id === 'aquecedor') return 'oficina';
      if (c.tipo.id === 'cupula') return 'habitat';
    }
    // The ship: the team's air recycler for Life Support, the ship's engine room for the Engines.
    if (sessao.mundo === 'nave') {
      if (c.tipo.id === 'suporte') return 'reciclador';
      if (c.tipo.id === 'oficina') return 'nave_motores' as Modelo;
    }
    if (c.tipo.id === 'aquecedor') return 'oficina';
    if (c.tipo.id === 'cupula') return 'habitat';
    if (c.tipo.id === 'bateria') return modeloBancoBaterias(sessao.noHabitat, sessao.fase === 'inicio') as Modelo;
    const meta = sessao.estado.meta;
    if (c.tipo.id === 'plataforma' && this.foguetePartiu) return 'plataforma';
    if (c.tipo.id === 'plataforma') return `foguete${Math.min(4, Math.floor(sessao.progressoFoguete / 25))}` as Modelo;
    if (c.tipo.id === 'blindagem' && sessao.fase !== 'inicio') return `blindagem_agua${Math.min(3, sessao.entregas.blindagem)}` as Modelo;
    return c.tipo.id as Modelo;
  }

  // Puts a module picture on the map: its anchor pixel is the footprint corner (gx, gy) at floor height.
  private posicionar(img: Phaser.GameObjects.Image, c: Construcao, id: Modelo) {
    const m = QUADROS[id];
    // A picture drawn for a smaller footprint (the lander, the air recycler) is centered on the module's.
    const pg = m.pegada ?? PEGADA_MODELO[id];
    const kx = pg ? (c.tipo.w - pg[0]) / 2 : 0, ky = pg ? (c.tipo.h - pg[1]) / 2 : 0;
    const p = paraTela(P, c.gx + kx, c.gy + ky, c.z);
    img.setTexture(`mod_${id}`).setOrigin(m.ancora[0] / m.w, m.ancora[1] / m.h).setScale(m.escala).setPosition(p.x, p.y);
  }

  // Surface props (old rover, probe, beacon...): placed once on free flat ground, solid, each with its name.
  private montarDeco() {
    const g = sessao.grade, c0 = Math.floor(g.n / 2);
    const marte = sessao.mundo === 'marte';
    this.decoVisuais = []; this.decoSobre = null; this.decoFixa = null; this.decoFixaT = 0;
    if (!g.deco.length) {
      // On Mars, only the props that fit there, under their Mars names (DECO_MARTE).
      for (const d of sessao.mundo === 'nave' ? DECO_NAVE : DECORACAO) {
        const nome = marte && d.id in DECO_MARTE ? DECO_MARTE[d.id] : d.nome;
        if (!nome) continue;
        // On the ship the props stay inside the deck; on the ground they spread away from the base.
        const p = sessao.mundo === 'nave' ? g.procurarComEspaco(comoTipo(d), c0 + d.dx, c0 + d.dy) : g.procurarDeco(comoTipo(d), c0 + d.dx, c0 + d.dy);
        if (p) g.colocarDeco({ id: d.id, nome, info: d.info, w: d.w, h: d.h, altura: d.altura }, p.gx, p.gy);
      }
    }
    for (const d of g.deco) {
      const chave = d.id.startsWith('nave_') ? d.id : `deco_${d.id}`;   // the ship's props have their own pictures
      const m = QUADROS[chave];
      const p = paraTela(P, d.gx, d.gy, d.z);
      const img = this.add.image(p.x, p.y, `mod_${chave}`)
        .setOrigin(m.ancora[0] / m.w, m.ancora[1] / m.h).setScale(m.escala)
        .setDepth(profundidade(d.gx + d.w, d.gy + d.h));
      if (sessao.mundo === 'marte') img.setTint(TOM_MARTE);
      this.mapa.add(img);
      this.decoVisuais.push({ d, img });
    }
    // One shared tooltip: names are hidden until the cursor or the commander is on the prop.
    this.dica = this.add.text(0, 0, '', fonte(13, '#f8fafc', {
      align: 'center', wordWrap: { width: 230 }, backgroundColor: 'rgba(15,23,42,0.92)', padding: { x: 10, y: 7 },
    })).setOrigin(0.5, 1).setDepth(1e6 + 1).setVisible(false);
    this.mapa.add(this.dica);
  }

  // Prop under a screen point (its picture's box), the closest to the viewer if several overlap.
  private decoEm(wx: number, wy: number) {
    let melhor: (typeof this.decoVisuais)[number] | null = null;
    for (const v of this.decoVisuais) {
      if (v.img.getBounds().contains(wx, wy) && (!melhor || v.img.depth > melhor.img.depth)) melhor = v;
    }
    return melhor?.d ?? null;
  }

  // Which prop shows its tooltip: a tapped one, else the hovered one, else the one the commander touches.
  private atualizarDica(dt: number) {
    if (!this.dica) return;
    this.decoFixaT = Math.max(0, this.decoFixaT - dt);
    let alvo = this.decoFixaT > 0 ? this.decoFixa : this.decoSobre;
    if (!alvo) {
      let melhor = 0.9;   // tiles from the prop's edge
      for (const { d } of this.decoVisuais) {
        const dx = Math.max(d.gx - this.corpo.x, 0, this.corpo.x - (d.gx + d.w));
        const dy = Math.max(d.gy - this.corpo.y, 0, this.corpo.y - (d.gy + d.h));
        const dist = Math.hypot(dx, dy);
        if (dist < melhor) { melhor = dist; alvo = d; }
      }
    }
    if (!alvo || !this.mapa.visible) { this.dica.setVisible(false); return; }
    const topo = paraTela(P, alvo.gx + alvo.w / 2, alvo.gy + alvo.h / 2, alvo.z + alvo.altura + 0.5);
    this.dica.setText(`${alvo.nome}\n${alvo.info}`).setPosition(topo.x, topo.y)
      .setScale(1 / Math.max(0.5, this.cameras.main.zoom)).setVisible(true);
  }

  private desenharModulo(c: Construcao) {
    let d = this.desenhos.get(c.id);
    if (!d) {
      d = { g: this.add.graphics(), img: this.add.image(0, 0, 'mod_habitat') };
      // Rooms you use carry their name, like the first prototype.
      if (c.tipo.id !== 'painel') {
        d.rotulo = this.add.text(0, 0, this.nomeDe(c), fonte(13, '#f8fafc', { fontStyle: 'bold', stroke: '#17130f', strokeThickness: 4 }))
          .setOrigin(0.5, 1);
      }
      this.mapa.add([d.g, d.img, ...(d.rotulo ? [d.rotulo] : [])]);
      if (d.rotulo) this.nomesNoMapa.push(d.rotulo);
      this.desenhos.set(c.id, d);
    }
    d.g.clear();
    fundacao(d.g, P, c, (x, y) => sessao.terreno.altura(x, y));
    this.posicionar(d.img, c, this.modelo(c));
    if (this.sobre !== c) this.tingir(d.img);
    // Sort by the module's back corner (where its picture is anchored), not its front corner:
    // using the front corner pushed every module in front of the commander, so the astronaut
    // disappeared under it whenever walking next to a wall.
    const prof = profundidade(c.gx, c.gy);
    d.g.setDepth(prof - 1); d.img.setDepth(prof);
    if (d.rotulo && c.tipo.sala) {
      const sala = c.tipo.sala;
      d.rotulo.setText(this.emObra(c) ? `${this.nomeDe(c)}\nto build: ${sessao.estado.obras[sala] ?? 0} of ${custo(sala, sessao.C)}` : this.nomeDe(c))
        .setColor(this.emObra(c) ? '#fde68a' : '#f8fafc').setAlign('center');
    }
    if (d.rotulo) {
      if(c.tipo.id==='plataforma' && sessao.mundo==='lua') d.rotulo.setText(`Rocket · ${Math.round(sessao.progressoFoguete)}%`);
      const topo = paraTela(P, c.gx + c.tipo.w / 2, c.gy + c.tipo.h / 2, c.z + c.tipo.altura + 0.6);
      d.rotulo.setPosition(topo.x, topo.y).setDepth(1e6);
    }
  }

  // Subtle surface tracks follow actual walkable routes and terrain height.
  private desenharCaminhos() {
    const g = this.gCaminhos.clear();
    if (sessao.mundo === 'nave') return;          // the ship has its corridor, not worn tracks
    const hab = sessao.grade.lista.find(c => c.tipo.id === 'habitat');
    if (!hab) return;
    const start = { gx: hab.gx+hab.tipo.w/2, gy: hab.gy+hab.tipo.h+0.65 };
    const boxes = sessao.grade.caixas();
    for (const c of sessao.grade.lista) {
      if (c === hab || c.tipo.id === 'painel') continue;
      const candidates = [
        {gx:c.gx+c.tipo.w/2,gy:c.gy+c.tipo.h+0.65},
        {gx:c.gx+c.tipo.w+0.65,gy:c.gy+c.tipo.h/2},
        {gx:c.gx-0.65,gy:c.gy+c.tipo.h/2},
        {gx:c.gx+c.tipo.w/2,gy:c.gy-0.65},
      ];
      let best: Ponto[] | null = null, shortest = Infinity;
      for (const end of candidates) {
        const path = encontrarCaminho(sessao.terreno,boxes,0.22,start.gx,start.gy,end.gx,end.gy);
        if (!path) continue;
        const full = [start,...path];
        let length = 0;
        for(let i=1;i<full.length;i++) length += Math.hypot(full[i].gx-full[i-1].gx,full[i].gy-full[i-1].gy);
        if(length < shortest) {shortest=length;best=full;}
      }
      if (!best) continue;
      const points: {x:number;y:number}[] = [];
      for(let i=1;i<best.length;i++) {
        const a=best[i-1],b=best[i],steps=Math.max(1,Math.ceil(Math.hypot(b.gx-a.gx,b.gy-a.gy)*4));
        for(let j=0;j<=steps;j++) {
          const x=a.gx+(b.gx-a.gx)*j/steps,y=a.gy+(b.gy-a.gy)*j/steps;
          points.push(paraTela(P,x,y,sessao.terreno.altura(x,y)+0.01));
        }
      }
      g.lineStyle(9,COR_SOLO_MEDIO,0.20).strokePoints(points,false);
      g.lineStyle(2,COR_SOLO_CLARO,0.22).strokePoints(points,false);
    }
  }

  private animarModulos(dt: number) {
    const animate=video.efeitos && !movimentoReduzido();
    if(animate) this.tempoEfeitos=this.time.now/1000;
    for(const c of sessao.grade.lista) {
      if(c.tipo.id!=='suporte' && c.tipo.id!=='oficina') continue;
      if(this.modelo(c)!==c.tipo.id) continue;   // another world's picture (the ship's recycler and engines) has no animation frames
      const d=this.desenhos.get(c.id);if(!d) continue;
      // Only the instrument display changes, using actual Blender renders. The model stays still.
      const frame=animate ? Math.floor(this.tempoEfeitos/(video.qualidade==='leve'?1.3:0.85)+c.id)%3 : 0;
      const key=(frame ? `${c.tipo.id}_anim${frame}` : c.tipo.id) as Modelo;
      if(d.img.texture.key!==`mod_${key}` && this.textures.exists(`mod_${key}`)) this.posicionar(d.img,c,key);
    }
  }

  private atualizarOclusao(dt: number) {
    const k = this.corpo;
    const depth = profundidade(k.x + 0.3, k.y + 0.3);
    const feet = paraTela(P, k.x, k.y, k.z);
    for (const c of sessao.grade.lista) {
      const d = this.desenhos.get(c.id);
      if (!d) continue;
      const bounds = d.img.getBounds();
      const overlaps = bounds.contains(feet.x, feet.y - 15) || bounds.contains(feet.x, feet.y - 26);
      const behind = k.x < c.gx + c.tipo.w && k.y < c.gy + c.tipo.h && k.z < c.z + c.tipo.altura - 0.1;
      const normal = profundidade(c.gx + c.tipo.w, c.gy + c.tipo.h);
      const order = overlaps ? (behind ? Math.max(normal, depth + 0.5) : Math.min(normal, depth - 0.5)) : normal;
      // setDepth re-sorts the layer: only when the order really changes.
      if (d.img.depth !== order) { d.img.setDepth(order); d.g.setDepth(order - 0.1); }
      const alpha = overlaps && behind ? 0.38 : this.emObra(c) ? 0.35 : 1;   // construction sites are ghosts
      const next = Phaser.Math.Linear(d.img.alpha, alpha, 1 - Math.exp(-dt * 12));
      d.img.setAlpha(next); d.g.setAlpha(next);
    }
  }

  private desenharComandante() {
    const dirigindo = sessao.rover?.dirigindo ?? false;
    this.comandante.setVisible(true);
    this.gAstronauta.setVisible(!dirigindo);
    const textura = chaveSkin(video.skin);
    if (this.comandante.texture.key !== textura) this.comandante.setTexture(textura);
    if (dirigindo) {
      const r = sessao.rover!;
      this.direcao = ((Math.round(-r.angulo/(Math.PI/4))%8)+8)%8;
      const assento = paraTela(P,
        r.corpo.x-0.21*Math.cos(r.angulo)+0.19*Math.sin(r.angulo),
        r.corpo.y-0.21*Math.sin(r.angulo)-0.19*Math.cos(r.angulo),r.corpo.z+0.47);
      this.comandante.setFrame(this.direcao*sprite.colunas)
        .setCrop(0,0,sprite.frame,LINHA_QUADRIL_SENTADO)
        .setPosition(assento.x,assento.y+(sprite.pe[1]-LINHA_QUADRIL_SENTADO)*sprite.escala)
        .setDepth(profundidade(r.corpo.x+0.7,r.corpo.y+0.7)+0.1);
      return;
    }
    this.comandante.setCrop();
    const k = this.corpo;
    const escala = Math.abs(P.ez[1]) / 36;
    const pe = paraTela(P, k.x, k.y, k.z);
    const g = this.gAstronauta.clear();
    sombraECarga(g, pe, paraTela(P, k.x, k.y, sessao.terreno.altura(k.x, k.y)), escala, sessao.carregando);
    // Sprite: row = facing (8 directions), column 0 = standing, 1.. = Moon hop cycle.
    const v = Math.hypot(k.vx, k.vy);
    if (v > 0.3) this.direcao = (Math.round(Math.atan2(-k.vy, k.vx) / (Math.PI / 4)) + 8) % 8;
    const col = v > 0.3 && k.noChao ? 1 + (Math.floor(this.passada) % sprite.andar) : k.noChao ? 0 : 3;
    this.comandante.setPosition(pe.x, pe.y).setFrame(this.direcao * sprite.colunas + col);
    const d = profundidade(k.x + 0.3, k.y + 0.3);
    g.setDepth(d - 1); this.comandante.setDepth(d);
  }
}
