// Generated with AI assistance (Claude). See README, "Use of AI tools".
// State shared by the three scenes that run together (Espaco, Superficie, Interface), plus the
// event bus they talk through. One game = one Sessao. See ARCHITECTURE.md.
import Phaser from 'phaser';
import { movimentoReduzido, configuracoesAbertas } from '../video';
import terrenoJson from '../dados/terreno.json';
import terrenoMarteJson from '../dados/terreno_marte.json';
import { definirGravidade, G_LUA, G_MARTE } from '../engine/fisica';
import { Terreno, type DadosTerreno } from '../engine/terreno';
import { Grade, TIPOS, type Construcao, type TipoId } from '../engine/construcao';
import type { Projecao } from '../engine/iso';
import { VOO as voo } from './qualidade';
import { CAPITULOS } from '../capitulos';
import { inicioDoCapitulo, bateriasDoDia, nenhuma, type Alocacao, type Efeito, type Estado } from '../regras';

// The world the 3D scenes show: the Moon (chapter 1) or Mars (chapter 3, same engine).
export type Mundo = 'lua' | 'marte';
// A pristine copy of the Moon's terrain, to come back to it after Mars (usarMundo).
const TERRENO_LUA = JSON.parse(JSON.stringify(terrenoJson));

export type Fase = 'inicio' | 'manha' | 'dia' | 'noite' | 'fim';

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
export const DURACAO_FILME = 3.8;           // s, ground <-> Moon
// Timing of the flight frames (they are spaced evenly in log distance): ease in and out.
const suaveFilme = (t: number) => 0.5 - 0.5 * Math.cos(Math.PI * t);
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
};

class Sessao {
  mundo: Mundo = 'lua';
  capIdx = 0;                         // CAPITULOS index: 0 the Moon, 2 Mars (1, the ship, is the Base prototype)
  pontos: number[] = [];              // score of each finished chapter
  terreno = new Terreno(dadosTerreno);
  grade = new Grade(this.terreno);
  readonly sinais = new Phaser.Events.EventEmitter();

  fase: Fase = 'inicio';
  estado: Estado = inicioDoCapitulo(CAPITULOS[0].config);
  entregas: Alocacao = nenhuma();
  carregando = 0;           // batteries in the commander's hands
  noHabitat = 0;            // batteries still waiting at the habitat today
  tarefasHoje = new Set<Efeito>();                    // rooms that already had their task today
  ultimaTarefa: Partial<Record<Efeito, string>> = {}; // so the bank does not repeat itself
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
  voo: { tipo: 'zoom' | 'filme'; fase: 'prep' | 'filme'; de: number; para: number; t: number; dur: number; destino: Vista; sentido: 1 | -1 } | null = null;
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
    const fonte = m === 'marte' ? terrenoMarteJson : TERRENO_LUA;
    const d = dadosTerreno as unknown as Record<string, unknown>;
    const img = dadosTerreno.imagem;
    for (const k of Object.keys(d)) if (k !== 'imagem') delete d[k];
    Object.assign(d, JSON.parse(JSON.stringify(fonte)), { imagem: img });
    Object.assign(img, JSON.parse(JSON.stringify(fonte.imagem)));
    this.terreno = new Terreno(dadosTerreno);
    definirGravidade(m === 'marte' ? G_MARTE : G_LUA);
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
    this.grade = new Grade(this.terreno);
    this.fase = 'inicio';
    this.estado = inicioDoCapitulo(this.C);
    this.entregas = nenhuma();
    this.carregando = 0;
    this.noHabitat = 0;
    this.tarefasHoje.clear();
    this.ultimaTarefa = {};
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
    const k = suaveFilme(v.t);
    return v.sentido > 0 ? k : 1 - k;
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
      const ida = destino === 'lua';
      this.voo = { tipo: 'filme', fase: 'prep', de: this.u, para: ida ? this.uFilme : this.u, t: 0,
        dur: ida ? 0.35 : 0.7, destino, sentido: ida ? 1 : -1 };
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
      if (v.tipo === 'filme' && v.fase === 'filme' && !this.filmePronto) return;   // frames still loading
      v.t = Math.min(1, v.t + dt / v.dur);
      if (v.tipo === 'zoom') this.u = v.de + (v.para - v.de) * curva(v.t);
      else if (v.fase === 'prep') this.u = v.de + (v.para - v.de) * curva(v.t);
      if (v.t < 1) return;
      if (v.tipo === 'filme' && v.fase === 'prep') { v.fase = 'filme'; v.t = 0; v.dur = DURACAO_FILME; return; }
      this.vista = v.destino;
      this.u = this.alvo = v.tipo === 'zoom' ? v.para : v.destino === 'lua' ? this.uGlobo : this.uFilme;
      // Back on the ground the film leaves the camera at its widest; glide in to the usual view.
      if (this.vista === 'chao') this.alvo = U_INICIAL;
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
    return dias[Math.min(this.estado.dia, dias.length) - 1];
  }

  // Noon of the current chapter day, as a timestamp: drives the Sun, Moon and planets.
  get data() {
    return Date.parse(`${this.dia.data}T12:00:00Z`);
  }

  novoDia() {
    this.entregas = nenhuma();
    this.carregando = 0;
    this.noHabitat = bateriasDoDia(this.estado, this.C);
    this.tarefasHoje.clear();
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
  fontFamily: 'system-ui, "Segoe UI", sans-serif',
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
