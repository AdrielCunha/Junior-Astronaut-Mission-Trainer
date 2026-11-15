// Generated with AI assistance (Claude). See README, "Use of AI tools".
// State shared by the three scenes that run together (Espaco, Superficie, Interface), plus the
// event bus they talk through. One game = one Sessao. See ARCHITECTURE.md.
import Phaser from 'phaser';
import { movimentoReduzido, configuracoesAbertas } from '../video';
import terrenoJson from '../dados/terreno.json';
import terrenoMarteJson from '../dados/terreno_marte.json';
import terrenoNaveJson from '../dados/terreno_nave.json';
import { definirGravidade, G_LUA, G_MARTE, G_TERRA, type Corpo } from '../engine/fisica';
import { Terreno, type DadosTerreno } from '../engine/terreno';
import { EVENTOS, haEventoHoje, esperaDoEvento, esperaDoAlarme, alarmeDoDia, type EventoDef } from '../engine/eventos';
import { lerPartida, gravarPartida } from '../salvamento';
import { Grade, TIPOS, type Construcao, type TipoId } from '../engine/construcao';
import type { Projecao } from '../engine/iso';
import { VOO as voo } from './qualidade';
import { CAPITULOS } from '../capitulos';
import { inicioDoCapitulo, bateriasDoDia, nenhuma, type Alocacao, type Efeito, type Estado } from '../regras';

import { TempestadeSolar } from './tempestadeSolar';
import type { Rover } from '../engine/rover';

// The world the 3D scenes show: the Moon (chapter 1) or Mars (chapter 3, same engine).
// The ship (chapter 2) is a world too: its deck, on the same engine.
export type Mundo = 'lua' | 'marte' | 'nave';
// A pristine copy of the Moon's terrain, to come back to it after Mars (usarMundo).
const TERRENO_LUA = JSON.parse(JSON.stringify(terrenoJson));

export type Fase = 'inicio' | 'manha' | 'dia' | 'noite' | 'fim';
export type RelatorioDia = {
  antes: Estado; entregas: Alocacao; nivel: number; fato: string; frio: number;
  danoTempestade: number; bateriasTempestade: number;
};

// ---------- Zoom ----------
// One scale for the whole game: s = screen px per km (map projection units). Everything, from the
// map to Neptune's orbit, is drawn from s, so nothing jumps. The state is u = ln(S_MAX / s):
// e-folds zoomed out from the closest view.
// Three views. On the ground the wheel / pinch zoom freely; pushing past the edge of a view
// starts a flight that plays to the end (see voar), like a map app.
export type Vista = 'chao' | 'lua' | 'sistema';
export const ZOOM_MAX = 2.4;                // camera zoom on terrain.png, closest
export const ZOOM_MIN = 0.32;               // farthest on the ground
export const S_MAPA = 530.33;               // terrain.png px per km (30 px per 80 m step / sqrt(0.5))
export const S_MAX = S_MAPA * ZOOM_MAX;
export const U_CHAO = Math.log(ZOOM_MAX / ZOOM_MIN);
export const U_INICIAL = Math.log(ZOOM_MAX / 1.1);
export const RAIO_LUA = 1737.4;             // km
const AU = 149597870.7;
export const sDeU = (u: number) => S_MAX * Math.exp(-u);
export const DURACAO_FILME = 4.6;           // s for the film part, ground <-> Moon
// Timing of the flight (its frames are spaced evenly in log distance, so a constant rate looks
// like a steady zoom): a short soft start and stop, and an even speed in between. The old
// cosine ease reached 1.6 times the average speed in the middle; this one only 1.25 times.
const RAMPA = 0.2;
const suaveFilme = (t: number) => {
  const v = 1 / (1 - RAMPA);                       // top speed
  if (t < RAMPA) return (v / (2 * RAMPA)) * t * t;
  if (t > 1 - RAMPA) return 1 - (v / (2 * RAMPA)) * (1 - t) ** 2;
  return v * (t - RAMPA / 2);
};
export const uDeS = (s: number) => Math.log(S_MAX / s);
// iOS-like motion: cubic-bezier(0.7, 0, 0.2, 1): slow start, quick middle, long soft landing.
export function curva(t: number) {
  const x1 = 0.7, y1 = 0, x2 = 0.2, y2 = 1;
  let a = t;
  for (let i = 0; i < 8; i++) {
    const x = 3 * (1 - a) ** 2 * a * x1 + 3 * (1 - a) * a * a * x2 + a ** 3 - t;
    const dx = 3 * (1 - a) ** 2 * x1 + 6 * (1 - a) * a * (x2 - x1) + 3 * a * a * (1 - x2);
    if (Math.abs(dx) < 1e-6) break;
    a = Phaser.Math.Clamp(a - x / dx, 0, 1);
  }
  return 3 * (1 - a) ** 2 * a * y1 + 3 * (1 - a) * a * a * y2 + a ** 3;
}

export const dadosTerreno = terrenoJson as unknown as DadosTerreno & {
  imagem: Projecao & { arquivo: string; w: number; h: number };
  centro: { lat: number; lon: number };
  fonte: { nome: string; url: string };
};

export type Eventos = {
  fase: [Fase];
  estado: [];
  mensagem: [string, string?];        // text, color
  suprimento: [TipoId];               // a cargo lander is bringing this today
  desbloqueado: [Construcao];         // it landed and is part of the base
  pulo: [];
  zoomMarte: [];                      // on Mars, zooming out past the ground opens MarteVista
  controleUsado: ['movimento' | 'pulo'];
  pousoFoguete: [() => void];        // after the launch film: the rocket lands on the pad, then calls back
};

class Sessao {
  posicaoAstronauta: Corpo | null = null;
  partidaRestaurada = false;
  abastecendoRover = false;
  editandoBase = false;
  ultimoDia: RelatorioDia | null = null;
  danoTempestade = 0;
  bateriasTempestade = 0;
  desfechoPendente: {tipo: 'protegida' | 'atingida'; baterias: number} | null = null;
  private tempoSalvar = 0;
  get progressoFoguete() {
    return Math.min(100,this.estado.meta+(this.mundo==='lua' && this.fase==='dia' ? this.entregas.meta*this.C.metaPorBateria : 0));
  }

  salvar() {
    if (!this.grade.lista.length || this.partida || this.abastecendoRover) return false;
    return gravarPartida({versao:1,salvoEm:Date.now(),mundo:this.mundo,capIdx:this.capIdx,fase:this.fase,
      estado:this.estado,entregas:this.entregas,pontos:this.pontos,carregando:this.carregando,noHabitat:this.noHabitat,
      tarefasHoje:[...this.tarefasHoje],ultimaTarefa:this.ultimaTarefa,energiaHoje:this.energiaHoje,
      curiosidadeRoverVista:this.curiosidadeRoverVista,diaCargaRover:this.diaCargaRover,rover:this.rover,astronauta:this.posicaoAstronauta,
      modulos:this.grade.lista.map(c=>({id:c.id,tipo:c.tipo.id,gx:c.gx,gy:c.gy,rotacao:c.rotacao??0,copia:c.copia||undefined})),decoracao:this.grade.deco,
      tempestade:{restante:this.tempestade.restante,status:this.tempestade.status},danoTempestade:this.danoTempestade,
      bateriasTempestade:this.bateriasTempestade,desfechoPendente:this.desfechoPendente,ultimoDia:this.ultimoDia,
      evento:this.evento ? {id:this.evento.def.id,construcaoId:this.evento.construcaoId}:null,
      eventoEm:this.eventoEm,ultimoEvento:this.ultimoEvento,diasCalmos:this.diasCalmos,pulou:this.pulou});
  }

  atualizarSalvamento(dt: number) {
    this.tempoSalvar += dt;
    if (this.tempoSalvar < 2000) return;
    this.tempoSalvar = 0;
    this.salvar();
  }

  restaurarPartida() {
    const d=lerPartida();
    if (!d) return false;
    try {
      this.capIdx=d.capIdx; this.usarMundo(d.mundo);
      this.grade.restaurar(d.modulos,d.decoracao);
      this.estado=d.estado; this.entregas=d.entregas; this.pontos=d.pontos;
      this.fase=d.fase; this.carregando=d.carregando; this.noHabitat=d.noHabitat;
      this.tarefasHoje=new Set(d.tarefasHoje); this.ultimaTarefa=d.ultimaTarefa; this.energiaHoje=d.energiaHoje;
      this.curiosidadeRoverVista=d.curiosidadeRoverVista; this.diaCargaRover=d.diaCargaRover;
      this.rover=d.mundo==='lua'?d.rover:null; this.posicaoAstronauta=d.astronauta;
      for (const k of [this.posicaoAstronauta,this.rover?.corpo]) if (k) {k.vx=0;k.vy=0;k.vz=0;}
      this.tempestade.restante=d.tempestade.restante; this.tempestade.status=d.tempestade.status;
      this.danoTempestade=d.danoTempestade; this.bateriasTempestade=d.bateriasTempestade;
      this.desfechoPendente=d.desfechoPendente; this.ultimoDia=d.ultimoDia;
      this.alarmeHoje=d.mundo==='lua'?alarmeDoDia(d.estado.dia)??null:null;
      const def=d.evento ? EVENTOS.find(e=>e.id===d.evento!.id) ?? (this.alarmeHoje?.id===d.evento.id?this.alarmeHoje:null) : null;
      this.evento=def && d.evento && this.grade.lista.some(c=>c.id===d.evento!.construcaoId) ? {def,construcaoId:d.evento.construcaoId}:null;
      this.eventoEm=d.eventoEm; this.ultimoEvento=d.ultimoEvento; this.diasCalmos=d.diasCalmos; this.pulou=d.pulou;
      this.partidaRestaurada=true;
      return true;
    } catch {
      this.capIdx=0;this.usarMundo('lua');return false;
    }
  }
  mundo: Mundo = 'lua';
  capIdx = 0;                         // CAPITULOS index: 0 the Moon, 1 the ship, 2 Mars
  pontos: number[] = [];              // score of each finished chapter
  terreno = new Terreno(dadosTerreno);
  grade = new Grade(this.terreno);
  readonly sinais = new Phaser.Events.EventEmitter();

  readonly tempestade = new TempestadeSolar();
  rover: Rover | null = null;
  diaCargaRover: number | null = null;
  get roverCarregado() { return this.fase === 'inicio' || this.diaCargaRover === this.estado.dia; }
  curiosidadeRoverVista = false;
  nivelTeste: number | null = null;
  fase: Fase = 'inicio';
  estado: Estado = inicioDoCapitulo(CAPITULOS[0].config);
  entregas: Alocacao = nenhuma();
  carregando = 0;           // batteries in the commander's hands
  noHabitat = 0;            // daily batteries waiting at the Moon bank or Mars lander (legacy field name)
  tarefasHoje = new Set<Efeito>();                    // rooms that already had their task today
  ultimaTarefa: Partial<Record<Efeito, string>> = {}; // so the bank does not repeat itself
  // Random event of the day (engine/eventos.ts): a module needs fixing with one task.
  evento: { def: EventoDef; construcaoId: number } | null = null;
  eventoEm: number | null = null;   // seconds of play until today's event happens (null: none today)
  alarmeHoje: EventoDef | null = null;   // today's real NASA event, if the Sun did something
  energiaHoje = false;      // the energy task of picking up the batteries was already played today
  ultimoEvento?: string;
  diasCalmos = 0;
  emTarefa = false;         // a task overlay is open: the map and zoom wait
  parado = true;            // the commander is standing still (Espaco uploads flight frames then)
  transicao: { t: number; destino: Vista; mudou: boolean } | null = null;
  vista: Vista = 'chao';
  u = U_INICIAL;            // zoom shown this frame
  alvo = U_INICIAL;         // zoom asked for on the ground; u glides to it
  ancora: { x: number; y: number } | null = null;   // screen point that stays put while zooming
  // A flight between views. 'zoom': u eases from one view to the next (Moon <-> planets).
  // 'filme': the Blender flight (public/lua/voo) plays between the ground and the Moon:
  //   'prep' glides the ground camera to the frame-0 framing, 'filme' plays the frames.
  // The film flight is ONE motion with one start and one stop (it used to glide, stop, then play
  // the film, and on the way back stop and glide in again: a lurch that made players queasy).
  // Its path is measured in zoom (u, log scale, the axis the frames are spaced on): Lg the ground
  // glide (out: to the first frame's framing; back: in to the usual view), Lf the film. T runs
  // 0..1 over the whole; fase and t are where it is now ('pouso' = the glide in after the film).
  voo: { tipo: 'zoom' | 'filme'; fase: 'prep' | 'filme' | 'pouso'; de: number; para: number; t: number; dur: number; destino: Vista; sentido: 1 | -1;
    T?: number; Lg?: number; Lf?: number } | null = null;
  filmePronto = false;      // Espaco sets it when every frame is loaded
  filmeFalhou = false;      // a frame failed after every retry: hold the last good one
  tela = { w: 1280, h: 720 };
  private empurrao = 0;     // wheel / pinch pushing past the edge of a view
  private pendente: Vista | null = null;   // next flight once the current one lands
  pulou = false;
  // Leaving for Mars after liftoff, played on the zoom itself (Espaco draws it): 'filme' the
  // zoom out from the base to the Moon, 'saida' the ship climbs straight off the Moon toward Mars
  // (no stop in orbit), 'zoom' out to the planets, 'cruzeiro' the crossing. The player only watches.
  partida: { fase: 'filme' | 'saida' | 'zoom' | 'cruzeiro'; t: number; fim: () => void; acabou: boolean } | null = null;

  // Starts the departure; `fim` runs when the ship reaches Mars's orbit on the map.
  partir(fim: () => void) {
    this.partida = { fase: 'filme', t: 0, fim, acabou: false };
    this.emitir('mensagem', 'Liftoff! Next stop: Mars.', '#fde68a');
    if (this.vista === 'lua') this.partida.fase = 'saida';
    else this.voar('lua');
  }

  get cap() { return CAPITULOS[this.capIdx]; }
  get C() { return this.cap.config; }

  // Switches the terrain, the base layout and gravity to another world. The terrain data is
  // changed IN PLACE: scenes keep references to dadosTerreno and its projection (Superficie's P).
  usarMundo(m: Mundo) {
    this.mundo = m;
    const fonte = m === 'marte' ? terrenoMarteJson : m === 'nave' ? terrenoNaveJson : TERRENO_LUA;
    const d = dadosTerreno as unknown as Record<string, unknown>;
    const img = dadosTerreno.imagem;
    for (const k of Object.keys(d)) if (k !== 'imagem') delete d[k];
    Object.assign(d, JSON.parse(JSON.stringify(fonte)), { imagem: img });
    Object.assign(img, JSON.parse(JSON.stringify(fonte.imagem)));
    this.terreno = new Terreno(dadosTerreno);
    // On the ship there is no gravity in deep space: magnetic boots hold the crew to the metal
    // deck, so walking feels like on Earth and a jump barely leaves the floor.
    definirGravidade(m === 'marte' ? G_MARTE : m === 'nave' ? G_TERRA : G_LUA);
    this.reiniciar();
  }

  // Starts a chapter on the current world, keeping the crew's radiation dose and the scores.
  comecarCapitulo(idx: number, dose = 0, pontos: number[] = []) {
    this.capIdx = idx;
    this.pontos = [...pontos];
    this.reiniciar();
    this.estado = inicioDoCapitulo(this.C, dose);
  }

  reiniciar() {
    this.posicaoAstronauta=null; this.ultimoDia=null; this.danoTempestade=0; this.bateriasTempestade=0;
    this.desfechoPendente=null; this.abastecendoRover=false; this.editandoBase=false; this.partidaRestaurada=false; this.tempoSalvar=0;
    this.grade = new Grade(this.terreno);
    this.fase = 'inicio';
    this.tempestade.iniciar(0);
    this.rover = null;
    this.diaCargaRover = null;
    this.curiosidadeRoverVista = false;
    this.nivelTeste = null;
    this.estado = inicioDoCapitulo(this.C);
    this.entregas = nenhuma();
    this.carregando = 0;
    this.noHabitat = 0;
    this.tarefasHoje.clear();
    this.ultimaTarefa = {};
    this.evento = null; this.eventoEm = null; this.alarmeHoje = null; this.energiaHoje = false; this.ultimoEvento = undefined; this.diasCalmos = 0;
    this.emTarefa = false;
    this.vista = 'chao';
    this.u = this.alvo = U_INICIAL;
    this.ancora = null;
    this.voo = null;
    this.transicao = null;
    this.pendente = null;
    this.pulou = false;
    this.partida = null;
  }

  // Where each view sits on the zoom scale (depends on the screen size).
  // The flight frames cover the screen; this is their scale. Their first frame is the map at
  // voo.sInicio px/km, their last the globe at voo.diametroFim px: both views follow from it.
  get escalaFilme() { return Math.max(this.tela.w / voo.w, this.tela.h / voo.h); }
  get uFilme() { return uDeS(voo.sInicio * this.escalaFilme); }
  get uGlobo() { return uDeS((voo.diametroFim * this.escalaFilme) / (2 * RAIO_LUA)); }
  // Where the flight is now, p = 0 (the map) .. 1 (the Moon view), or null when not flying it.
  // p is the camera's log distance, the axis the frames were rendered on (voo.p).
  get quadroFilme(): number | null {
    const v = this.voo;
    if (!v || v.tipo !== 'filme') return null;
    if (v.fase === 'prep') return v.sentido > 0 ? null : 1;
    if (v.fase === 'pouso') return null;
    return v.sentido > 0 ? v.t : 1 - v.t;           // the easing is on the whole flight (passo)
  }
  // Farthest view: out to Mars's orbit, the next chapter's destination (the rest is for later).
  get uSistema() { return uDeS((0.46 * Math.min(this.tela.w, this.tela.h)) / (1.75 * AU)); }
  // 0..1 ground, 1..2 flying to the globe, 2..3 out to the planets (for fades and labels).
  get nivel() {
    const u = this.u, g = this.uGlobo;
    if (this.voo?.tipo === 'filme') return 1 + (this.quadroFilme ?? 0);
    if (u <= U_CHAO) return u / U_CHAO;
    if (u <= g) return 1 + (u - U_CHAO) / (g - U_CHAO);
    return 2 + Math.min(1, (u - g) / (this.uSistema - g));
  }

  // Wheel / pinch: d e-folds (positive = out) around a screen point.
  zoom(d: number, ancora: { x: number; y: number } | null = null) {
    if (this.partida || this.voo || this.transicao || this.emTarefa || configuracoesAbertas) return;
    if (this.vista === 'chao') {
      const borda = Math.max(U_CHAO, this.uFilme);
      const novo = this.alvo + d;
      if (novo > borda) this.empurrao += novo - borda; else this.empurrao = 0;
      this.alvo = Phaser.Math.Clamp(novo, 0, borda);
      this.ancora = ancora;
      if (this.empurrao > 0.35) this.voar('lua');
      return;
    }
    this.empurrao += d;
    if (this.empurrao > 0.3) this.voar('sistema');
    else if (this.empurrao < -0.3) this.voar(this.vista === 'sistema' ? 'lua' : 'chao');
  }

  // Plays the whole flight to another view; input waits until it lands.
  voar(destino: Vista) {
    // Mars has no globe or film in Espaco: its zoom out is MarteVista (the Mars film, live globe
    // and solar system), opened by Interface.
    if (this.mundo === 'marte' && destino !== 'chao') { this.empurrao = 0; this.emitir('zoomMarte'); return; }
    if (this.mundo === 'nave' && destino !== 'chao') {
      this.empurrao = 0;
      this.emitir('mensagem', 'You are inside the ship, on the way to Mars. Look out of the portholes: only stars, for months.', '#93c5fd');
      return;
    }
    if (configuracoesAbertas || this.transicao) return;
    this.empurrao = 0;
    if (destino === this.vista) return;
    this.ancora = null;
    if (movimentoReduzido()) {
      this.pendente = null;
      this.voo = null;
      this.transicao = { t: 0, destino, mudou: false };
      return;
    }
    // From the solar system straight back to the ground, stop at the Moon first: the ground
    // and the Moon are joined by the rendered film, the solar system is not.
    if (destino === 'chao' && this.vista === 'sistema') { this.pendente = 'chao'; destino = 'lua'; }
    const filme = (this.vista === 'chao' && destino === 'lua') || (this.vista === 'lua' && destino === 'chao');
    if (filme) {
      // Both ways start with a short 'prep': going out, the ground camera glides to the first
      // frame's framing; coming back, the live Moon turns to the angle the film was rendered at.
      // Out: the glide to the first frame's framing and the film are one motion. Back: the live
      // Moon first turns to the film's angle (0.7 s), then the film and the glide in are one motion.
      const ida = destino === 'lua';
      const Lf = Math.log(voo.razao);
      const Lg = ida ? Math.abs(this.uFilme - this.u) : Math.abs(this.uFilme - U_INICIAL);
      this.voo = { tipo: 'filme', fase: 'prep', de: this.u, para: ida ? this.uFilme : this.u, t: 0,
        dur: ida ? (DURACAO_FILME * (Lg + Lf)) / Lf : 0.7, destino, sentido: ida ? 1 : -1, T: 0, Lg, Lf };
      return;
    }
    const para = destino === 'lua' ? this.uGlobo : this.uSistema;
    const longe = Math.abs(para - this.u);
    this.voo = { tipo: 'zoom', fase: 'filme', de: this.u, para, t: 0, dur: Phaser.Math.Clamp(0.9 + longe * 0.12, 1.4, 2.8), destino, sentido: 1 };
  }

  irPara(u: number) {
    if (this.partida || configuracoesAbertas || this.transicao) return;
    if (this.vista !== 'chao') { this.voar('chao'); return; }
    this.alvo = u;
    this.ancora = null;
  }

  // Called once per frame by Espaco (the first scene), so every layer sees the same zoom.
  passo(dt: number) {
    if (configuracoesAbertas) return;
    if (movimentoReduzido() && this.voo) {
      const destino = this.pendente ?? this.voo.destino;
      this.pendente = null;
      this.voo = null;
      this.transicao = { t: 0, destino, mudou: false };
    }
    if (this.transicao) {
      const v = this.transicao;
      v.t = Math.min(1,v.t+dt/0.28);
      if (v.t >= 0.5 && !v.mudou) {
        this.vista = v.destino;
        this.u = this.alvo = v.destino === 'chao' ? U_INICIAL : v.destino === 'lua' ? this.uGlobo : this.uSistema;
        v.mudou = true;
      }
      if (v.t >= 1) this.transicao = null;
      return;
    }
    if (this.voo) {
      const v = this.voo;
      if (v.tipo === 'zoom') {
        v.t = Math.min(1, v.t + dt / v.dur);
        this.u = v.de + (v.para - v.de) * curva(v.t);
        if (v.t < 1) return;
      } else {
        if (!this.filmePronto) return;                                          // frames still loading
        const Lg = v.Lg ?? 0, Lf = v.Lf ?? 1;
        if (v.sentido < 0 && v.fase === 'prep') {                               // the Moon turns first
          v.t = Math.min(1, v.t + dt / v.dur);
          if (v.t < 1) return;
          v.fase = 'filme'; v.t = 0; v.T = 0; v.dur = (DURACAO_FILME * (Lg + Lf)) / Lf;
          return;
        }
        v.T = Math.min(1, (v.T ?? 0) + dt / v.dur);
        const X = suaveFilme(v.T) * (Lg + Lf);                                  // distance along the path
        if (v.sentido > 0) {
          if (Lg > 1e-6 && X < Lg) { v.fase = 'prep'; v.t = X / Lg; this.u = v.de + (v.para - v.de) * v.t; }
          else { v.fase = 'filme'; v.t = Math.min(1, (X - Lg) / Lf); }
        } else if (X < Lf) { v.fase = 'filme'; v.t = X / Lf; }
        else { v.fase = 'pouso'; v.t = Lg > 1e-6 ? Math.min(1, (X - Lf) / Lg) : 1; this.u = this.uFilme + (U_INICIAL - this.uFilme) * v.t; }
        if (v.T < 1) return;
      }
      this.vista = v.destino;
      // Back on the ground the glide in is already part of the flight: it ends at the usual view.
      this.u = this.alvo = v.tipo === 'zoom' ? v.para : v.destino === 'lua' ? this.uGlobo : U_INICIAL;
      this.voo = null;
      const proximo = this.pendente;
      this.pendente = null;
      if (proximo) this.voar(proximo);   // the Moon halfway: continue to the ground
      return;
    }
    if (this.vista === 'chao') {
      this.u += (this.alvo - this.u) * (1 - Math.exp(-dt * 10));
      if (Math.abs(this.alvo - this.u) < 1e-4) this.u = this.alvo;
    } else {
      this.u = this.vista === 'lua' ? this.uGlobo : this.uSistema;   // follow screen size
    }
    this.empurrao *= Math.exp(-dt * 3);                                // a slow nudge does not fly
  }

  get dia() {
    const dias = this.cap.dados.dias;
    const dia = dias[Math.min(this.estado.dia, dias.length) - 1];
    return this.nivelTeste === null ? dia : { ...dia, nivel: this.nivelTeste };
  }

  // Noon of the current chapter day, as a timestamp: drives the Sun, Moon and planets.
  get data() {
    return Date.parse(`${this.dia.data}T12:00:00Z`);
  }

  novoDia() {
    this.nivelTeste = null;
    this.tempestade.iniciar(this.mundo === 'lua' ? this.dia.nivel : 0);
    this.entregas = nenhuma();
    this.carregando = 0;
    this.noHabitat = bateriasDoDia(this.estado, this.C);
    this.tarefasHoje.clear();
    // Maybe something breaks today; it happens a little while after the morning.
    this.evento = null;
    this.energiaHoje = false;
    // Events and alarms are the Moon's (real May 2024 space weather, the lunar base modules).
    const lua = this.mundo === 'lua';
    this.alarmeHoje = lua ? alarmeDoDia(this.estado.dia) ?? null : null;
    const hoje = lua && (!!this.alarmeHoje || haEventoHoje(this.estado.dia, this.diasCalmos));
    this.eventoEm = this.alarmeHoje ? esperaDoAlarme() : hoje ? esperaDoEvento() : null;
    if (!hoje) this.diasCalmos++;
  }

  emitir<K extends keyof Eventos>(nome: K, ...args: Eventos[K]) {
    this.sinais.emit(nome, ...args);
  }

  ouvir<K extends keyof Eventos>(cena: Phaser.Scene, nome: K, fn: (...args: Eventos[K]) => void) {
    this.sinais.on(nome, fn as (...a: unknown[]) => void);
    cena.events.once('shutdown', () => this.sinais.off(nome, fn as (...a: unknown[]) => void));
  }
}

export const sessao = new Sessao();
export { TIPOS };

// Shared look, same palette as the Blender renders.
export const COR = {
  contorno: 0x17130f,
  texto: '#e2e8f0',
  fundoPainel: 0x0f172a,
  borda: 0x334155,
  azul: '#2563eb',
};

export const fonte = (tamanho: number, cor = COR.texto, extra: Phaser.Types.GameObjects.Text.TextStyle = {}): Phaser.Types.GameObjects.Text.TextStyle => ({
  fontFamily: '"Fredoka", system-ui, "Segoe UI", sans-serif',   // the rounded font of the title screen and tasks
  fontSize: `${Math.round(tamanho)}px`,
  color: cor,
  resolution: window.devicePixelRatio || 1,
  ...extra,
});

// One formatter for the whole game: toLocaleDateString builds a new one on every call, which
// cost ~7% of each frame in the solar system view (it runs every frame for the caption).
const FORMATO_DATA = new Intl.DateTimeFormat('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
export const dataBonita = (t: number) => FORMATO_DATA.format(t);

export const suave = (a: number, b: number, x: number) => {
  const t = Phaser.Math.Clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
