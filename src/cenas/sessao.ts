// Generated with AI assistance (Claude). See README, "Use of AI tools".
// State shared by the three scenes that run together (Espaco, Superficie, Interface), plus the
// event bus they talk through. One game = one Sessao. See ARCHITECTURE.md.
import Phaser from 'phaser';
import lua from '../dados/lua.json';
import terrenoJson from '../dados/terreno.json';
import { Terreno, type DadosTerreno } from '../engine/terreno';
import { Grade, TIPOS, type Construcao, type TipoId } from '../engine/construcao';
import type { Projecao } from '../engine/iso';
import { VOO as voo } from './qualidade';
import { CAPITULOS } from '../capitulos';
import { inicioDoCapitulo, bateriasDoDia, nenhuma, type Alocacao, type Efeito, type Estado } from '../regras';

const C = CAPITULOS[0].config;

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
};

class Sessao {
  readonly terreno = new Terreno(dadosTerreno);
  grade = new Grade(this.terreno);
  readonly sinais = new Phaser.Events.EventEmitter();

  fase: Fase = 'inicio';
  estado: Estado = inicioDoCapitulo(C);
  entregas: Alocacao = nenhuma();
  carregando = 0;           // batteries in the commander's hands
  noHabitat = 0;            // batteries still waiting at the habitat today
  tarefasHoje = new Set<Efeito>();                    // rooms that already had their task today
  ultimaTarefa: Partial<Record<Efeito, string>> = {}; // so the bank does not repeat itself
  emTarefa = false;         // a task overlay is open: the map and zoom wait
  vista: Vista = 'chao';
  u = U_INICIAL;            // zoom shown this frame
  alvo = U_INICIAL;         // zoom asked for on the ground; u glides to it
  ancora: { x: number; y: number } | null = null;   // screen point that stays put while zooming
  // A flight between views. 'zoom': u eases from one view to the next (Moon <-> planets).
  // 'filme': the Blender flight (public/lua/voo) plays between the ground and the Moon:
  //   'prep' glides the ground camera to the frame-0 framing, 'filme' plays the frames.
  voo: { tipo: 'zoom' | 'filme'; fase: 'prep' | 'filme'; de: number; para: number; t: number; dur: number; destino: Vista; sentido: 1 | -1 } | null = null;
  filmePronto = false;      // Espaco sets it when every frame is loaded
  tela = { w: 1280, h: 720 };
  private empurrao = 0;     // wheel / pinch pushing past the edge of a view
  pulou = false;

  reiniciar() {
    this.grade = new Grade(this.terreno);
    this.fase = 'inicio';
    this.estado = inicioDoCapitulo(C);
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
    this.pulou = false;
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
    if (this.voo || this.emTarefa) return;
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
    if (this.empurrao > 0.3) this.voar(this.vista === 'lua' ? 'sistema' : 'sistema');
    else if (this.empurrao < -0.3) this.voar(this.vista === 'sistema' ? 'lua' : 'chao');
  }

  // Plays the whole flight to another view; input waits until it lands.
  voar(destino: Vista) {
    this.empurrao = 0;
    if (destino === this.vista) return;
    this.ancora = null;
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
    if (this.vista !== 'chao') { this.voar('chao'); return; }
    this.alvo = u;
    this.ancora = null;
  }

  // Called once per frame by Espaco (the first scene), so every layer sees the same zoom.
  passo(dt: number) {
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
      this.voo = null;
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
    return lua.dias[Math.min(this.estado.dia, lua.dias.length) - 1];
  }

  // Noon of the current chapter day, as a timestamp: drives the Sun, Moon and planets.
  get data() {
    return Date.parse(`${this.dia.data}T12:00:00Z`);
  }

  novoDia() {
    this.entregas = nenhuma();
    this.carregando = 0;
    this.noHabitat = bateriasDoDia(this.estado, C);
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

export const dataBonita = (t: number) =>
  new Date(t).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });

export const suave = (a: number, b: number, x: number) => {
  const t = Phaser.Math.Clamp((x - a) / (b - a), 0, 1);
  return t * t * (3 - 2 * t);
};
