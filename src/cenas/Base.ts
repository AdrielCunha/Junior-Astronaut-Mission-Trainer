// Generated with AI assistance (Claude). See README, "Use of AI tools".
// The game scene: isometric base, HUD and the morning / night / end panels, for all three chapters.
// Rules live in ../regras.ts, chapter settings in ../capitulos.ts, real NASA data in ../dados/.
import Phaser from 'phaser';
import { CAPITULOS, type Equipamento, type Lugar } from '../capitulos';
import {
  COMUM, DESCANSO, inicioDoCapitulo, fimDoDia, resultado, bateriasDoDia, naEnfermaria, pontuacao, nenhuma, entregar, pronto, custo,
  type Alocacao, type Estado, type Resultado,
} from '../regras';

type V = Phaser.Math.Vector2;
type Fase = 'inicio' | 'manha' | 'dia' | 'noite' | 'fim' | 'dados';
type Parte = string | { texto: string; cor?: string; tamanho?: number; negrito?: boolean; link?: string };
type Botao = { texto: string; acao: () => void; principal?: boolean };

// All positions are in grid tiles (gx, gy) plus height z, also in tiles.
// p() is the only place that turns tiles into screen pixels.
// The map is a 20 x 20 square: on screen, gx grows down-right and gy grows down-left.
type Ponto = [number, number];
type Modulo = { gx: number; gy: number; paredeEsquerda: boolean };
const SALA_L = 5;
const SALA_A = 3;
const PAREDE = 1.6;
const MUNDO = { gx0: 0, gx1: 20, gy0: 0, gy1: 20 };
// Paths start at the plaza in front of the habitat. Each place: its module, the path from the
// plaza (the last point is where the commander stands inside) and where a crew member works.
// Every path reaches its module from an open side, so it never runs behind a wall.
const PRACA: Ponto = [10, 13];
const LUGARES: Record<Lugar, Modulo & { rota: Ponto[]; posto: Ponto }> = {
  esquerda: { gx: 1, gy: 13, paredeEsquerda: true, rota: [[10, 14.5], [3.5, 14.5]], posto: [1.9, 15] },
  direita: { gx: 14, gy: 3, paredeEsquerda: false, rota: [[13.5, 13], [13.5, 4.6], [16.3, 4.6]], posto: [18.3, 4.3] },
  baixo: { gx: 12, gy: 16, paredeEsquerda: false, rota: [[10, 17.6], [14.3, 17.6]], posto: [16.3, 17.3] },
  cima: { gx: 1, gy: 7, paredeEsquerda: true, rota: [[10, 11.2], [3.5, 11.2], [3.5, 8.6]], posto: [1.9, 8.3] },
  // The launch pad / dome site. Not a module: the commander stands next to it.
  plataforma: { gx: 16.2, gy: 9.6, paredeEsquerda: false, rota: [[15, 13], [15, 11.6]], posto: [15, 11.6] },
};
const HABITAT: Modulo = { gx: 7, gy: 7, paredeEsquerda: true };
const PLATAFORMA = { gx: 18, gy: 11 };
const ALTURA_FOGUETE = 5.2;
const ALTURA_CUPULA = 2.6;
const NIVEIS = [
  { nome: 'CALM', cor: '#4ade80' },
  { nome: 'MEDIUM', cor: '#facc15' },
  { nome: 'HIGH', cor: '#fb923c' },
  { nome: 'EXTREME', cor: '#f87171' },
];
// Index 0 is the commander, the astronaut the player moves.
const CORES_TRIPULACAO = [0xef4444, 0x22c55e, 0xa855f7, 0x38bdf8];
const CRATERAS = [[6.5, 18.6, 0.8], [18.6, 17.2, 0.9], [11, 2, 1.0], [18.6, 1.4, 0.6], [1.4, 18.6, 0.5], [8.6, 4.6, 0.5], [16.5, 7.4, 0.5], [1.2, 11.8, 0.5]];
const TEMAS = {
  lua: { chao: 0x9ca3af, pontos: [0x6b7280, 0xd1d5db, 0x4b5563], borda: 0xd1d5db, fundo: 0x6b7280 },
  marte: { chao: 0xb8673a, pontos: [0x8a4b2a, 0xd9915e, 0x6e3b22], borda: 0xd9915e, fundo: 0x8a4b2a },
  nave: { chao: 0x334155, pontos: [0x1e293b, 0x475569], borda: 0x64748b, fundo: 0x1e293b },
};

const dataBonita = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const corDaBarra = (v: number) => (v > 70 ? 0x22c55e : v >= 30 ? 0xeab308 : 0xef4444);
const escurecer = (cor: number, pct: number) => Phaser.Display.Color.ValueToColor(cor).darken(pct).color;
const baterias = (n: number) => `${n} batter${n === 1 ? 'y' : 'ies'}`;

export class Base extends Phaser.Scene {
  // Game state. Scene fields survive scene.restart(), which redraws everything after a resize.
  private capIdx = 0;
  private fase: Fase = 'inicio';
  private faseAntesDosDados: Fase = 'inicio';
  private estado: Estado = inicioDoCapitulo(CAPITULOS[0].config);
  private doseNoInicio = 0; // dose when the chapter started, to retry it fairly
  private entregas: Alocacao = nenhuma();
  private salaAtual: number | null = null;
  private noite: { antes: Estado; aloc: Alocacao } | null = null;
  private res: Resultado = null;
  private pontos: number[] = []; // score of each finished chapter
  private animouFim = false;
  private inicioDoDia: Estado = this.estado; // state when the day started, for the night summary
  private anuncio: string | null = null; // shown once after the scene redraws, e.g. "Heating is built!"


  // Rebuilt by every create().
  private T = 20;
  private ox = 0;
  private oy = 0;
  private u = 1;
  private andando = false;
  private comandante!: Phaser.GameObjects.Container;
  private tripulantes: Phaser.GameObjects.Container[] = [];
  private rotulos: Phaser.GameObjects.Text[] = [];
  private estrutura: Phaser.GameObjects.Container | null = null; // rocket or dome, revealed as it is built
  private mascara!: Phaser.GameObjects.Graphics;
  private planeta!: Phaser.GameObjects.Graphics; // Mars growing in the sky during the trip
  private cupula!: Phaser.GameObjects.Graphics;
  private brilho: Phaser.GameObjects.Graphics | null = null;
  private calor: Phaser.GameObjects.Graphics | null = null;
  private hud!: Phaser.GameObjects.Graphics;
  private hudDia!: Phaser.GameObjects.Text;
  private hudBarras: Phaser.GameObjects.Text[] = [];
  private hudRadiacao!: Phaser.GameObjects.Text;
  private botaoFim!: Phaser.GameObjects.Text;
  private dica!: Phaser.GameObjects.Text;
  private particulas!: Phaser.GameObjects.Particles.ParticleEmitter;
  private painel: Phaser.GameObjects.GameObject[] = [];
  private acaoPrincipal: (() => void) | null = null;
  private estaticos: Phaser.GameObjects.Graphics[] = [];
  private layout = { topo: 0, base: 0, barras: 0, larguraBarra: 0, baterias: 0, tripulacao: 0 };

  constructor() {
    super('Base');
  }

  private get cap() {
    return CAPITULOS[this.capIdx];
  }

  private get dia() {
    return this.cap.dados.dias[Math.min(this.estado.dia, this.cap.config.dias) - 1];
  }

  // Batteries left today: those that powered rooms plus those that went into construction.
  private get baterias() {
    const soma = (o: Partial<Alocacao>) => Object.values(o).reduce((s, n) => s + (n ?? 0), 0);
    const usadas = soma(this.entregas) + soma(this.estado.obras) - soma(this.inicioDoDia.obras);
    return bateriasDoDia(this.estado, this.cap.config) - usadas;
  }

  private lugar(i: number) {
    return LUGARES[this.cap.salas[i].lugar];
  }

  private p(gx: number, gy: number, z = 0): V {
    return new Phaser.Math.Vector2(this.ox + (gx - gy) * this.T, this.oy + ((gx + gy) / 2 - z) * this.T);
  }

  private texto(x: number, y: number, s: string, tamanho: number, cor = '#e2e8f0', extra: Phaser.Types.GameObjects.Text.TextStyle = {}) {
    return this.add.text(x, y, s, {
      fontFamily: 'system-ui, "Segoe UI", sans-serif',
      fontSize: `${Math.round(tamanho * this.u)}px`,
      color: cor,
      resolution: window.devicePixelRatio || 1,
      ...extra,
    });
  }

  create() {
    const W = this.scale.width;
    const H = this.scale.height;
    // Dev server only: lets browser tests read the scene. Removed from the production build.
    if (import.meta.env.DEV) (window as unknown as { cena: Base }).cena = this;
    // Redraw at the new size. Debounced, because resize fires many times while dragging.
    let espera: Phaser.Time.TimerEvent | undefined;
    const aoRedimensionar = () => {
      espera?.remove();
      espera = this.time.delayedCall(150, () => this.scene.restart());
    };
    this.scale.on('resize', aoRedimensionar);
    this.events.once('shutdown', () => this.scale.off('resize', aoRedimensionar));

    // shortcut: a phone held upright is too narrow for the base; a real portrait layout would be the upgrade.
    if (W < 640 && H > W) {
      this.add.text(W / 2, H / 2, 'Lunar Odyssey\n\nTurn your device sideways to play.', {
        fontFamily: 'system-ui, sans-serif', fontSize: '22px', color: '#e2e8f0', align: 'center', resolution: window.devicePixelRatio || 1,
      }).setOrigin(0.5);
      return;
    }

    this.u = Phaser.Math.Clamp(Math.min(W / 1100, H / 650), 0.62, 1.5);
    const topo = 66 * this.u;
    const base = 62 * this.u;
    const { gx0, gx1, gy0, gy1 } = MUNDO;
    const largura = gx1 - gy0 - (gx0 - gy1);
    const altura = (gx1 + gy1 - gx0 - gy0) / 2 + 1;
    this.T = Math.min((W * 0.97) / largura, (H - topo - base) / altura);
    this.ox = W / 2 - ((gx1 - gy0 + gx0 - gy1) / 2) * this.T;
    this.oy = topo + (H - topo - base) / 2 - ((gx0 + gy0 + gx1 + gy1) / 4 + 0.5) * this.T;
    this.layout.topo = topo;
    this.layout.base = base;

    this.andando = false;
    this.tripulantes = [];
    this.rotulos = [];
    this.hudBarras = [];
    this.painel = [];
    this.estrutura = null;
    this.brilho = null;
    this.calor = null;

    this.desenharCeu(W, H);
    this.desenharChao();
    this.desenharPaineisSolares();
    this.desenharCaminhos();
    this.desenharBase();
    this.desenharMeta();
    // Everything that never changes goes into one texture, drawn once.
    this.add.renderTexture(0, 0, W, H).setOrigin(0).setDepth(-1).draw(this.estaticos);
    this.estaticos.forEach((g) => g.destroy());
    this.estaticos = [];
    this.criarTripulacao();
    this.criarRadiacao(W);
    this.criarHud(W, H);

    this.input.keyboard?.on('keydown-ENTER', () => this.acaoPrincipal?.());
    this.input.keyboard?.on('keydown-SPACE', () => this.acaoPrincipal?.());

    this.mostrarFase();
    this.mostrarAnuncio();
  }

  // ---------- Drawing the world ----------

  private estatico() {
    const g = this.add.graphics();
    this.estaticos.push(g);
    return g;
  }

  private retangulo(x0: number, y0: number, x1: number, y1: number, z = 0) {
    return [this.p(x0, y0, z), this.p(x1, y0, z), this.p(x1, y1, z), this.p(x0, y1, z)];
  }

  // Solid box: top face plus the two faces that look at the viewer.
  private caixa(g: Phaser.GameObjects.Graphics, gx: number, gy: number, l: number, a: number, h: number, cor: number, z0 = 0) {
    const z1 = z0 + h;
    g.fillStyle(escurecer(cor, 18)).fillPoints([this.p(gx, gy + a, z0), this.p(gx + l, gy + a, z0), this.p(gx + l, gy + a, z1), this.p(gx, gy + a, z1)], true);
    g.fillStyle(escurecer(cor, 32)).fillPoints([this.p(gx + l, gy + a, z0), this.p(gx + l, gy, z0), this.p(gx + l, gy, z1), this.p(gx + l, gy + a, z1)], true);
    g.fillStyle(cor).fillPoints(this.retangulo(gx, gy, gx + l, gy + a, z1), true);
  }

  private cilindro(g: Phaser.GameObjects.Graphics, gx: number, gy: number, raio: number, h: number, cor: number, z0 = 0) {
    const b = this.p(gx, gy, z0);
    const r = raio * this.T;
    const alto = h * this.T;
    g.fillStyle(escurecer(cor, 25)).fillEllipse(b.x, b.y, r * 2, r);
    g.fillStyle(escurecer(cor, 15)).fillRect(b.x - r, b.y - alto, r * 2, alto);
    g.fillStyle(escurecer(cor, 30)).fillRect(b.x, b.y - alto, r, alto);
    g.fillStyle(cor).fillEllipse(b.x, b.y - alto, r * 2, r);
  }

  private desenharCeu(W: number, H: number) {
    const g = this.estatico();
    const rnd = new Phaser.Math.RandomDataGenerator(['lunar-odyssey']);
    const tema = this.cap.tema;
    if (tema === 'marte') g.fillStyle(0x3b1d12, 0.5).fillRect(0, 0, W, H); // dusty sky
    for (let i = 0; i < (tema === 'marte' ? 120 : 220); i++) {
      g.fillStyle(0xffffff, rnd.realInRange(0.15, 0.9));
      g.fillCircle(rnd.between(0, W), rnd.between(0, H), rnd.realInRange(0.4, 1.5) * this.u);
    }
    const x = (tema === 'marte' ? 90 : 56) * this.u;
    const y = this.layout.topo + 52 * this.u;
    if (tema === 'marte') {
      const r = 9 * this.u;
      g.fillStyle(0x9ca3af).fillEllipse(x, y, r * 2.4, r * 1.8);
      g.fillStyle(0x6b7280).fillCircle(x - r * 0.3, y, r * 0.35);
      this.texto(x, y + r + 6 * this.u, 'Phobos, a moon of Mars', 12, '#e2e8f0').setOrigin(0.5, 0);
      return;
    }
    // Earth: big from the Moon, a small dot from the ship.
    const r = (tema === 'lua' ? 30 : 10) * this.u;
    g.fillStyle(0x60a5fa, 0.18).fillCircle(x, y, r * 1.25);
    g.fillStyle(0x2563eb).fillCircle(x, y, r);
    g.fillStyle(0x16a34a).fillEllipse(x - r * 0.3, y - r * 0.2, r * 0.8, r * 0.55).fillEllipse(x + r * 0.35, y + r * 0.35, r * 0.5, r * 0.6);
    g.fillStyle(0xffffff, 0.75).fillEllipse(x + r * 0.1, y - r * 0.55, r * 1.1, r * 0.22).fillEllipse(x - r * 0.2, y + r * 0.6, r * 0.9, r * 0.18);
    g.fillStyle(0x020617, 0.55).fillEllipse(x + r * 0.45, y, r * 1.1, r * 2);
    this.texto(x, y + r + 6 * this.u, tema === 'lua' ? 'Earth' : 'Earth, far behind', 12, '#93c5fd').setOrigin(0.5, 0);
  }

  private desenharChao() {
    const g = this.estatico();
    const tema = TEMAS[this.cap.tema];
    const { gx0, gx1, gy0, gy1 } = MUNDO;
    this.caixa(g, gx0, gy0, gx1 - gx0, gy1 - gy0, 1, tema.chao, -1);
    if (this.cap.tema === 'nave') {
      // Deck plates and hull lights instead of craters.
      g.lineStyle(1, 0x475569, 0.8);
      for (let k = 2; k < 20; k += 2) {
        const a = this.p(k, 0);
        const b = this.p(k, 20);
        const c = this.p(0, k);
        const d = this.p(20, k);
        g.lineBetween(a.x, a.y, b.x, b.y).lineBetween(c.x, c.y, d.x, d.y);
      }
      for (let k = 1; k < 20; k += 2) {
        for (const q of [this.p(k, 19.6), this.p(19.6, k)]) g.fillStyle(0x38bdf8, 0.9).fillEllipse(q.x, q.y, this.T * 0.25, this.T * 0.12);
      }
      return;
    }
    const rnd = new Phaser.Math.RandomDataGenerator(['regolith']);
    for (let i = 0; i < 260; i++) {
      const q = this.p(rnd.realInRange(gx0 + 0.2, gx1 - 0.2), rnd.realInRange(gy0 + 0.2, gy1 - 0.2));
      g.fillStyle(rnd.pick(tema.pontos), 0.6).fillCircle(q.x, q.y, rnd.realInRange(0.04, 0.12) * this.T);
    }
    for (const [cx, cy, r] of CRATERAS) {
      const c = this.p(cx, cy);
      const w = r * this.T * 2.8;
      g.fillStyle(tema.borda).fillEllipse(c.x, c.y, w, w / 2);
      g.fillStyle(tema.fundo).fillEllipse(c.x, c.y - w * 0.03, w * 0.82, w * 0.38);
      g.fillStyle(tema.chao).fillEllipse(c.x + w * 0.08, c.y + w * 0.04, w * 0.5, w * 0.2);
    }
    if (this.cap.tema === 'marte') {
      for (let i = 0; i < 40; i++) {
        const q = this.p(rnd.realInRange(0.5, 19.5), rnd.realInRange(0.5, 19.5));
        const r = rnd.realInRange(0.1, 0.25) * this.T;
        g.fillStyle(0x6e3b22).fillEllipse(q.x, q.y, r * 2, r * 1.2);
        g.fillStyle(0x9a5532).fillEllipse(q.x - r * 0.2, q.y - r * 0.25, r * 1.2, r * 0.7);
      }
    }
  }

  private desenharPaineisSolares() {
    const g = this.estatico();
    for (const gx of [2.4, 4.6, 6.8]) {
      for (const gy of [1.8, 4.0]) {
        const b = this.p(gx, gy);
        g.lineStyle(Math.max(1, this.T * 0.08), 0x475569).lineBetween(b.x, b.y, b.x, b.y - 0.6 * this.T);
        // Tilted panel facing the viewer.
        const cantos = [this.p(gx - 0.8, gy - 0.6, 0.95), this.p(gx + 0.8, gy - 0.6, 0.95), this.p(gx + 0.8, gy + 0.6, 0.45), this.p(gx - 0.8, gy + 0.6, 0.45)];
        g.fillStyle(0x1e3a8a).fillPoints(cantos, true);
        g.lineStyle(1, 0x60a5fa, 0.7);
        for (let k = 1; k < 4; k++) {
          const t = k / 4;
          g.lineBetween(
            Phaser.Math.Linear(cantos[0].x, cantos[1].x, t), Phaser.Math.Linear(cantos[0].y, cantos[1].y, t),
            Phaser.Math.Linear(cantos[3].x, cantos[2].x, t), Phaser.Math.Linear(cantos[3].y, cantos[2].y, t),
          );
        }
        g.lineBetween((cantos[0].x + cantos[3].x) / 2, (cantos[0].y + cantos[3].y) / 2, (cantos[1].x + cantos[2].x) / 2, (cantos[1].y + cantos[2].y) / 2);
        g.lineStyle(1.5, 0x93c5fd).strokePoints(cantos, true);
      }
    }
    // Cable from the panels to the habitat.
    const a = this.p(7.9, 4.7);
    const b = this.p(7.9, HABITAT.gy);
    g.lineStyle(Math.max(1.5, this.T * 0.08), 0x1f2937).lineBetween(a.x, a.y, b.x, b.y);
    const r = this.p(8.6, 2.6);
    this.texto(r.x, r.y, `Solar panels\n${baterias(this.cap.config.bateriasPorDia)} a day`, 12, '#bfdbfe', { align: 'center', backgroundColor: '#0f172acc', padding: { x: 6, y: 3 } })
      .setOrigin(0, 0.5).setDepth(5e4);
  }

  // Walkways from the plaza to every module, with small guide lights.
  private desenharCaminhos() {
    const g = this.estatico();
    const meia = 0.55;
    const cor = this.cap.tema === 'nave' ? 0x1e293b : 0x52525b;
    const trechos: [Ponto, Ponto][] = [[PRACA, [HABITAT.gx + 2.5, HABITAT.gy + SALA_A]]];
    for (const sala of this.cap.salas) {
      let de = PRACA;
      for (const ate of LUGARES[sala.lugar].rota) {
        trechos.push([de, ate]);
        de = ate;
      }
    }
    for (const [a, b] of trechos) {
      g.fillStyle(cor).fillPoints(this.retangulo(
        Math.min(a[0], b[0]) - meia, Math.min(a[1], b[1]) - meia, Math.max(a[0], b[0]) + meia, Math.max(a[1], b[1]) + meia,
      ), true);
    }
    const c = this.p(...PRACA);
    g.fillStyle(cor).fillEllipse(c.x, c.y, this.T * 5.2, this.T * 2.6);
    g.fillStyle(escurecer(cor, 15)).fillEllipse(c.x, c.y, this.T * 3.6, this.T * 1.8);
    g.lineStyle(2, 0xfacc15, 0.8).strokeEllipse(c.x, c.y, this.T * 3.6, this.T * 1.8);
    for (const [a, b] of trechos) {
      const passos = Math.floor(Phaser.Math.Distance.Between(a[0], a[1], b[0], b[1]) / 1.2);
      for (let k = 1; k < passos; k++) {
        const t = k / passos;
        const q = this.p(Phaser.Math.Linear(a[0], b[0], t), Phaser.Math.Linear(a[1], b[1], t));
        g.fillStyle(0x7dd3fc, 0.9).fillEllipse(q.x, q.y, this.T * 0.2, this.T * 0.1);
      }
    }
  }

  // Module: floor, back wall with a window, optional left wall. The two sides that face
  // the viewer stay open, so the inside is visible. Its depth is its back corner: anything
  // standing inside or in front of it is drawn on top, anything behind it is hidden.
  private desenharModulo(m: Modulo, cor: number) {
    const g = this.add.graphics().setDepth(this.p(m.gx, m.gy).y);
    const { gx, gy } = m;
    const gx1 = gx + SALA_L;
    const gy1 = gy + SALA_A;
    const piso = this.retangulo(gx, gy, gx1, gy1);
    g.fillStyle(0x475569).fillPoints(this.retangulo(gx - 0.2, gy - 0.2, gx1 + 0.2, gy1 + 0.2), true);
    g.fillStyle(0x334155).fillPoints(piso, true);
    g.fillStyle(cor, 0.45).fillPoints(this.retangulo(gx + 0.3, gy + 0.3, gx1 - 0.3, gy1 - 0.3), true);
    if (m.paredeEsquerda) {
      g.fillStyle(0x94a3b8).fillPoints([this.p(gx, gy1), this.p(gx, gy), this.p(gx, gy, PAREDE), this.p(gx, gy1, PAREDE)], true);
      g.fillStyle(0x64748b).fillPoints([this.p(gx, gy1, PAREDE - 0.18), this.p(gx, gy, PAREDE - 0.18), this.p(gx, gy, PAREDE), this.p(gx, gy1, PAREDE)], true);
    }
    g.fillStyle(0xcbd5e1).fillPoints([this.p(gx, gy), this.p(gx1, gy), this.p(gx1, gy, PAREDE), this.p(gx, gy, PAREDE)], true);
    g.fillStyle(cor).fillPoints([this.p(gx, gy, PAREDE - 0.28), this.p(gx1, gy, PAREDE - 0.28), this.p(gx1, gy, PAREDE), this.p(gx, gy, PAREDE)], true);
    const jan = [this.p(gx + 1.4, gy, 0.55), this.p(gx + 3.6, gy, 0.55), this.p(gx + 3.6, gy, 1.15), this.p(gx + 1.4, gy, 1.15)];
    g.fillStyle(0x0b1020).fillPoints(jan, true).lineStyle(2, 0x475569).strokePoints(jan, true);
    const e = this.p(gx + 2.2, gy, 0.9);
    g.fillStyle(0xffffff, 0.8).fillCircle(e.x, e.y, 1.2).fillCircle(e.x + this.T * 0.6, e.y - this.T * 0.15, 1);
    return { g, piso };
  }

  // Mars: the crew arrives in a lander, not a habitat.
  private desenharModuloDePouso() {
    const g = this.add.graphics().setDepth(this.p(HABITAT.gx, HABITAT.gy).y);
    const c = this.p(HABITAT.gx + 2.5, HABITAT.gy + 1.5);
    for (const [dx, dy] of [[-1.6, 0], [1.6, 0], [0, -1.2], [0, 1.2]]) {
      const pe = this.p(HABITAT.gx + 2.5 + dx, HABITAT.gy + 1.5 + dy);
      g.lineStyle(this.T * 0.1, 0x94a3b8).lineBetween(pe.x, pe.y, c.x + (pe.x - c.x) * 0.4, c.y - this.T * 0.9);
      g.fillStyle(0x64748b).fillEllipse(pe.x, pe.y, this.T * 0.5, this.T * 0.25);
    }
    this.cilindro(g, HABITAT.gx + 2.5, HABITAT.gy + 1.5, 1.3, 1.4, 0xe2e8f0, 0.6);
    const topo = this.p(HABITAT.gx + 2.5, HABITAT.gy + 1.5, 2.0);
    g.fillStyle(0xcbd5e1).fillTriangle(topo.x - this.T * 1.3, topo.y, topo.x + this.T * 1.3, topo.y, topo.x, topo.y - this.T * 1.3);
    g.fillStyle(0x38bdf8).fillEllipse(topo.x, topo.y + this.T * 0.5, this.T * 0.7, this.T * 0.4);
    g.fillStyle(0xef4444).fillRect(topo.x - this.T * 1.3, topo.y + this.T * 0.95, this.T * 2.6, this.T * 0.14);
    const r = this.p(HABITAT.gx + 2.5, HABITAT.gy + 1.5, 3.6);
    this.texto(r.x, r.y, 'Lander', 12, '#cbd5e1', { backgroundColor: '#0f172acc', padding: { x: 6, y: 3 } }).setOrigin(0.5, 1).setDepth(5e4);
  }

  // A module not built yet: a marked plot with scaffolding and crates.
  private desenharObra(m: Modulo, cor: number) {
    const g = this.add.graphics().setDepth(this.p(m.gx, m.gy).y);
    const { gx, gy } = m;
    const piso = this.retangulo(gx, gy, gx + SALA_L, gy + SALA_A);
    g.fillStyle(cor, 0.15).fillPoints(piso, true);
    g.lineStyle(2, 0xfacc15, 0.9);
    for (let k = 0; k < 4; k++) {
      const a = piso[k];
      const b = piso[(k + 1) % 4];
      for (let t = 0; t < 1; t += 0.1) {
        g.lineBetween(Phaser.Math.Linear(a.x, b.x, t), Phaser.Math.Linear(a.y, b.y, t), Phaser.Math.Linear(a.x, b.x, t + 0.05), Phaser.Math.Linear(a.y, b.y, t + 0.05));
      }
    }
    const postes: Ponto[] = [[gx, gy], [gx + SALA_L, gy], [gx, gy + SALA_A]];
    g.lineStyle(Math.max(1.5, this.T * 0.07), 0x9ca3af);
    for (const [x, y] of postes) {
      const a = this.p(x, y);
      const b = this.p(x, y, 1.2);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    const t0 = this.p(gx, gy + SALA_A, 1.2);
    const t1 = this.p(gx, gy, 1.2);
    const t2 = this.p(gx + SALA_L, gy, 1.2);
    g.lineBetween(t0.x, t0.y, t1.x, t1.y).lineBetween(t1.x, t1.y, t2.x, t2.y);
    this.caixa(g, gx + 1.0, gy + 0.8, 0.7, 0.7, 0.45, 0xa16207);
    this.caixa(g, gx + 1.9, gy + 0.9, 0.6, 0.6, 0.35, 0x854d0e);
    this.caixa(g, gx + 3.2, gy + 0.7, 1.0, 0.5, 0.2, 0x78716c);
    return { g, piso };
  }

  private desenharBase() {
    if (this.cap.tema === 'marte') {
      this.desenharModuloDePouso();
    } else {
      // Habitat: where the crew sleeps. Not a battery room.
      const hab = this.desenharModulo(HABITAT, 0x94a3b8).g;
      for (const k of [0, 1]) {
        this.caixa(hab, HABITAT.gx + 0.5 + k * 1.6, HABITAT.gy + 0.4, 1.2, 0.9, 0.35, 0xe2e8f0);
        this.caixa(hab, HABITAT.gx + 0.5 + k * 1.6, HABITAT.gy + 0.4, 1.2, 0.6, 0.12, 0x6366f1, 0.35);
      }
      this.cilindro(hab, HABITAT.gx + 4.0, HABITAT.gy + 1.0, 0.45, 0.4, 0xa8a29e);
      const th = this.p(HABITAT.gx + SALA_L / 2, HABITAT.gy, PAREDE + 0.2);
      this.texto(th.x, th.y, 'Habitat', 12, '#cbd5e1', { backgroundColor: '#0f172acc', padding: { x: 6, y: 3 } }).setOrigin(0.5, 1).setDepth(5e4);
    }

    this.cap.salas.forEach((sala, i) => {
      const { gx, gy } = LUGARES[sala.lugar];
      let g: Phaser.GameObjects.Graphics;
      let piso: V[];
      let area: V[];
      let topo: V;
      if (sala.lugar === 'plataforma') {
        // The dome site: click the pad. The dome itself is drawn by desenharMeta.
        const { gx: px, gy: py } = PLATAFORMA;
        g = this.add.graphics().setDepth(this.p(px - 1.8, py - 1.4).y);
        piso = this.retangulo(px - 1.8, py - 1.4, px + 1.8, py + 1.4);
        area = [this.p(px - 1.8, py + 1.4), this.p(px - 1.8, py - 1.4, 2.8), this.p(px + 1.8, py - 1.4, 2.8), this.p(px + 1.8, py - 1.4), this.p(px + 1.8, py + 1.4)];
        topo = this.p(px, py, ALTURA_CUPULA + 0.6);
      } else {
        const feito = pronto(this.estado, sala.efeito, this.cap.config);
        ({ g, piso } = feito ? this.desenharModulo(LUGARES[sala.lugar], sala.cor) : this.desenharObra(LUGARES[sala.lugar], sala.cor));
        if (feito) this.desenharEquipamento(g, sala.equipamento, gx, gy);
        area = [this.p(gx, gy + SALA_A), this.p(gx, gy, PAREDE), this.p(gx + SALA_L, gy, PAREDE), this.p(gx + SALA_L, gy), this.p(gx + SALA_L, gy + SALA_A)];
        topo = this.p(gx + SALA_L / 2, gy, PAREDE + 0.2);
      }

      // Click target: floor plus back wall.
      const alvo = this.add.graphics().setDepth(g.depth + 0.5);
      // Phaser skips input on an empty Graphics, so it always holds an almost invisible fill.
      const invisivel = () => alvo.clear().fillStyle(0xffffff, 0.001).fillPoints(area, true);
      invisivel();
      alvo
        .setInteractive({ hitArea: new Phaser.Geom.Polygon(area), hitAreaCallback: Phaser.Geom.Polygon.Contains, useHandCursor: true })
        .on('pointerover', () => {
          invisivel().lineStyle(3, 0xffffff, 0.9).strokePoints(piso, true);
          this.mostrarDica(i);
        })
        .on('pointerout', () => {
          invisivel();
          this.dica.setVisible(false);
        })
        .on('pointerdown', () => this.clicarSala(i));

      this.rotulos.push(
        this.texto(topo.x, topo.y, '', 13, '#f8fafc', { align: 'center', backgroundColor: '#0f172add', padding: { x: 7, y: 4 } })
          .setOrigin(0.5, 1).setDepth(5e4),
      );
    });

    // Shield dome over the whole base, visible when the shield is powered.
    this.cupula = this.add.graphics().setDepth(4e4);
  }

  private desenharEquipamento(g: Phaser.GameObjects.Graphics, tipo: Equipamento, gx: number, gy: number) {
    if (tipo === 'tanques') {
      this.cilindro(g, gx + 0.9, gy + 1.0, 0.32, 1.1, 0xe0f2fe);
      this.cilindro(g, gx + 1.7, gy + 1.0, 0.32, 1.1, 0xe0f2fe);
      this.caixa(g, gx + 2.6, gy + 0.5, 1.9, 1.0, 0.35, 0x92400e);
      const rnd = new Phaser.Math.RandomDataGenerator(['plantas']);
      for (let k = 0; k < 7; k++) {
        const q = this.p(gx + 2.8 + rnd.realInRange(0, 1.5), gy + 0.6 + rnd.realInRange(0, 0.8), 0.45);
        g.fillStyle(rnd.pick([0x16a34a, 0x22c55e, 0x4ade80])).fillCircle(q.x, q.y, this.T * rnd.realInRange(0.14, 0.22));
      }
    } else if (tipo === 'escudo') {
      this.caixa(g, gx + 1.8, gy + 0.6, 1.4, 1.2, 0.6, 0x64748b);
      this.cilindro(g, gx + 2.5, gy + 1.2, 0.35, 0.8, 0xfacc15, 0.6);
      const topo = this.p(gx + 2.5, gy + 1.2, 1.5);
      this.brilho = this.add.graphics().setDepth(g.depth + 0.4).setPosition(topo.x, topo.y);
      const base = this.p(gx + 4.3, gy + 0.7, 0);
      const prato = this.p(gx + 4.3, gy + 0.7, 1.5);
      g.lineStyle(this.T * 0.08, 0x94a3b8).lineBetween(base.x, base.y, prato.x, prato.y);
      g.fillStyle(0xe2e8f0).fillEllipse(prato.x, prato.y, this.T * 1.1, this.T * 0.6);
      g.fillStyle(0x94a3b8).fillEllipse(prato.x + this.T * 0.08, prato.y + this.T * 0.04, this.T * 0.7, this.T * 0.35);
    } else if (tipo === 'oficina') {
      this.caixa(g, gx + 0.6, gy + 0.5, 2.0, 0.9, 0.5, 0x78716c);
      this.caixa(g, gx + 0.9, gy + 0.6, 0.5, 0.4, 0.25, 0xf97316, 0.5);
      this.caixa(g, gx + 1.7, gy + 0.7, 0.4, 0.4, 0.4, 0x94a3b8, 0.5);
      this.bracoRobo(g, gx, gy);
    } else if (tipo === 'motor') {
      // Two engine nozzles with a blue glow, and a control desk.
      for (const k of [0, 1]) {
        const c = this.p(gx + 1.2 + k * 1.5, gy + 0.9, 0.7);
        g.fillStyle(0x475569).fillEllipse(c.x, c.y, this.T * 1.3, this.T * 1.3);
        g.fillStyle(0x0e7490).fillEllipse(c.x, c.y, this.T * 0.9, this.T * 0.9);
        g.fillStyle(0x67e8f9, 0.9).fillEllipse(c.x, c.y, this.T * 0.45, this.T * 0.45);
      }
      this.caixa(g, gx + 3.5, gy + 0.6, 1.0, 1.0, 0.6, 0x334155);
      const tela = this.p(gx + 4.0, gy + 1.1, 0.6);
      g.fillStyle(0x22d3ee).fillEllipse(tela.x, tela.y, this.T * 0.6, this.T * 0.3);
    } else if (tipo === 'aquecedor') {
      // Heater: a box with glowing coils; the glow shows how warm the base is tonight.
      this.caixa(g, gx + 1.5, gy + 0.5, 2.0, 1.0, 0.9, 0x44403c);
      for (let k = 0; k < 4; k++) {
        const a = this.p(gx + 1.7 + k * 0.45, gy + 1.5, 0.2);
        g.lineStyle(this.T * 0.08, 0x7f1d1d).lineBetween(a.x, a.y, a.x, a.y - this.T * 0.6);
      }
      this.cilindro(g, gx + 4.2, gy + 0.9, 0.25, 1.2, 0x9ca3af);
      const c = this.p(gx + 2.5, gy + 1.5, 0.5);
      this.calor = this.add.graphics().setDepth(g.depth + 0.4).setPosition(c.x, c.y);
    }
  }

  private bracoRobo(g: Phaser.GameObjects.Graphics, gx: number, gy: number) {
    const a = this.p(gx + 3.6, gy + 0.8, 0);
    const b = this.p(gx + 3.6, gy + 0.8, 1.3);
    const c = this.p(gx + 2.6, gy + 1.0, 1.1);
    g.lineStyle(this.T * 0.16, 0xfbbf24).lineBetween(a.x, a.y, b.x, b.y).lineBetween(b.x, b.y, c.x, c.y);
    g.fillStyle(0x1f2937).fillCircle(b.x, b.y, this.T * 0.12).fillCircle(c.x, c.y, this.T * 0.1);
  }

  // The chapter goal you can see: the rocket on the Moon, Mars growing in the sky during
  // the trip, the new base dome on Mars.
  private desenharMeta() {
    this.planeta = this.add.graphics().setDepth(0);
    const { gx, gy } = PLATAFORMA;
    if (this.cap.tema === 'nave') {
      const g = this.estatico();
      for (const [x, y, h, cor] of [[17, 10, 0.8, 0x78716c], [18.2, 10.2, 0.6, 0x57534e], [17.4, 11.4, 0.5, 0x92400e]] as const) {
        this.caixa(g, x, y, 1, 1, h, cor);
      }
      const t = this.p(17.8, 12.6);
      this.texto(t.x, t.y, 'Cargo', 11, '#cbd5e1').setOrigin(0.5, 0).setDepth(5e4);
      return;
    }

    const g = this.estatico();
    this.caixa(g, gx - 1.8, gy - 1.4, 3.6, 2.8, 0.25, 0x6b7280);
    for (let k = 0; k < 5; k++) {
      const a = this.p(gx - 1.6 + k * 0.7, gy + 1.4, 0.13);
      g.fillStyle(k % 2 ? 0x111827 : 0xfacc15).fillRect(a.x, a.y - this.T * 0.12, this.T * 0.7, this.T * 0.12);
    }
    const c = this.p(gx, gy, 0.25);
    const contorno = this.add.graphics().setDepth(c.y);
    contorno.lineStyle(1.5, 0xffffff, 0.35);
    const corpo = this.add.graphics();

    if (this.cap.tema === 'lua') {
      // Service tower behind the rocket. Not baked: astronauts can walk behind it.
      const t0 = this.p(gx + 1.2, gy - 1.1, 0.25);
      const torre = this.add.graphics().setDepth(t0.y);
      const altura = (ALTURA_FOGUETE + 0.6) * this.T;
      torre.lineStyle(Math.max(1.5, this.T * 0.1), 0x9ca3af);
      torre.lineBetween(t0.x, t0.y, t0.x, t0.y - altura).lineBetween(t0.x + this.T * 0.5, t0.y + this.T * 0.25, t0.x + this.T * 0.5, t0.y + this.T * 0.25 - altura);
      for (let k = 1; k < 7; k++) {
        const y = t0.y - (altura * k) / 7;
        torre.lineBetween(t0.x, y, t0.x + this.T * 0.5, y + this.T * 0.25 - altura / 7);
      }
      const h = ALTURA_FOGUETE * this.T;
      const w = this.T * 1.1;
      contorno.strokeRect(c.x - w / 2, c.y - h * 0.78, w, h * 0.66);
      contorno.strokeTriangle(c.x - w / 2, c.y - h * 0.78, c.x + w / 2, c.y - h * 0.78, c.x, c.y - h);
      corpo.fillStyle(0x374151).fillTriangle(-w * 0.35, 0, w * 0.35, 0, 0, -h * 0.14);
      corpo.fillStyle(0xef4444).fillTriangle(-w / 2, -h * 0.12, -w * 0.95, 0, -w / 2, -h * 0.3).fillTriangle(w / 2, -h * 0.12, w * 0.95, 0, w / 2, -h * 0.3);
      corpo.fillStyle(0xf1f5f9).fillRect(-w / 2, -h * 0.78, w, h * 0.66);
      corpo.fillStyle(0xcbd5e1).fillRect(w * 0.1, -h * 0.78, w * 0.4, h * 0.66);
      corpo.fillStyle(0xf97316).fillRect(-w / 2, -h * 0.36, w, h * 0.05);
      corpo.fillStyle(0x334155).fillCircle(0, -h * 0.6, w * 0.24);
      corpo.fillStyle(0x38bdf8).fillCircle(0, -h * 0.6, w * 0.17);
      corpo.fillStyle(0xef4444).fillTriangle(-w / 2, -h * 0.78, w / 2, -h * 0.78, 0, -h);
    } else {
      // Mars: a habitat dome, built from the ground up.
      const h = ALTURA_CUPULA * this.T;
      const w = this.T * 4.6;
      contorno.strokeEllipse(c.x, c.y, w, h * 2);
      corpo.fillStyle(0xe7e5e4).fillEllipse(0, 0, w, h * 2);
      corpo.fillStyle(0xd6d3d1).fillEllipse(w * 0.15, 0, w * 0.7, h * 2);
      corpo.lineStyle(2, 0x78716c);
      for (const f of [-0.3, 0, 0.3]) corpo.lineBetween(w * f, -h * Math.sqrt(1 - (2 * f) ** 2), w * f, 0);
      corpo.lineBetween(-w * 0.45, -h * 0.45, w * 0.45, -h * 0.45);
      corpo.fillStyle(0x38bdf8).fillRect(-w * 0.1, -h * 0.35, w * 0.2, h * 0.35);
    }
    this.estrutura = this.add.container(c.x, c.y, [corpo]).setDepth(c.y + 1);
    this.mascara = this.make.graphics({}, false);
    this.estrutura.setMask(this.mascara.createGeometryMask());
  }

  private alturaEstrutura() {
    return (this.cap.tema === 'lua' ? ALTURA_FOGUETE : ALTURA_CUPULA) * this.T;
  }

  private mostrarProgresso(meta: number) {
    const c = this.cap.config;
    // On Mars the dome shows its own construction; elsewhere the chapter goal.
    const fracao = c.obras ? Math.min(1, (this.estado.obras.meta ?? 0) / custo('meta', c)) : meta / 100;
    if (this.estrutura) {
      const h = this.alturaEstrutura();
      const { x, y } = this.estrutura;
      // The rocket's engine bell hangs a little below its base; the dome stops at the ground.
      const abaixo = this.cap.tema === 'lua' && fracao > 0 ? this.T * 0.5 : 0;
      this.mascara.clear().fillStyle(0xffffff).fillRect(x - this.T * 3, y - h * fracao, this.T * 6, h * fracao + abaixo);
    }
    if (this.cap.tema === 'nave') {
      // Mars gets bigger as the ship gets closer.
      const r = (12 + 48 * fracao) * this.u;
      const x = this.scale.width - 30 * this.u - r;
      const y = this.layout.topo + 20 * this.u + r;
      this.planeta.clear();
      this.planeta.fillStyle(0xf97316, 0.15).fillCircle(x, y, r * 1.2);
      this.planeta.fillStyle(0xc2410c).fillCircle(x, y, r);
      this.planeta.fillStyle(0x9a3412).fillEllipse(x - r * 0.3, y + r * 0.2, r * 0.7, r * 0.35).fillEllipse(x + r * 0.35, y - r * 0.3, r * 0.5, r * 0.25);
      this.planeta.fillStyle(0xffffff, 0.8).fillEllipse(x, y - r * 0.85, r * 0.5, r * 0.2);
      this.planeta.fillStyle(0x020617, 0.4).fillEllipse(x + r * 0.5, y, r, r * 2);
    }
  }

  // Drawn once into a texture: a Graphics is re-drawn every frame, an image is not.
  private astronauta(x: number, y: number, cor: number, escala: number) {
    const s = (this.T / 22) * escala;
    const chave = `astronauta-${cor}-${escala}`;
    if (this.textures.exists(chave)) this.textures.remove(chave);
    const ox = 20 * s;
    const oy = 56 * s;
    const g = this.make.graphics({}, false);
    g.fillStyle(0x000000, 0.3).fillEllipse(ox, oy, 26 * s, 9 * s);
    g.fillStyle(0xe2e8f0).fillRoundedRect(ox - 8 * s, oy - 14 * s, 6 * s, 14 * s, 2 * s).fillRoundedRect(ox + 2 * s, oy - 14 * s, 6 * s, 14 * s, 2 * s);
    g.fillStyle(0x94a3b8).fillRoundedRect(ox - 13 * s, oy - 34 * s, 8 * s, 18 * s, 3 * s);
    g.fillStyle(0xf8fafc).fillRoundedRect(ox - 10 * s, oy - 36 * s, 20 * s, 26 * s, 7 * s);
    g.fillStyle(cor).fillRect(ox - 10 * s, oy - 22 * s, 20 * s, 4 * s);
    g.fillStyle(0xf8fafc).fillCircle(ox, oy - 42 * s, 11 * s);
    g.fillStyle(0xf59e0b).fillEllipse(ox + 3 * s, oy - 42 * s, 15 * s, 11 * s);
    g.fillStyle(0xffffff, 0.6).fillEllipse(ox + 6 * s, oy - 45 * s, 4 * s, 3 * s);
    g.generateTexture(chave, Math.ceil(40 * s), Math.ceil(62 * s)).destroy();
    const imagem = this.add.image(0, 0, chave).setOrigin(ox / Math.ceil(40 * s), oy / Math.ceil(62 * s));
    const bateria = this.add.graphics().setVisible(false);
    bateria.fillStyle(0x14532d).fillRect(9 * s, -28 * s, 9 * s, 13 * s).fillStyle(0x4ade80).fillRect(10 * s, -24 * s, 7 * s, 8 * s).fillStyle(0x14532d).fillRect(11.5 * s, -30 * s, 4 * s, 2 * s);
    return this.add.container(x, y, [imagem, bateria]).setDepth(y);
  }

  private criarTripulacao() {
    // One crew member works in each of the first three rooms; the commander walks.
    for (let i = 1; i < CORES_TRIPULACAO.length && i - 1 < this.cap.salas.length; i++) {
      const q = this.p(...this.lugar(i - 1).posto);
      const a = this.astronauta(q.x, q.y, CORES_TRIPULACAO[i], 0.85);
      this.tweens.add({ targets: a, y: q.y - this.T * 0.08, duration: 900 + i * 130, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
      this.tripulantes.push(a);
    }
    const inicio = this.salaAtual === null ? this.p(...PRACA) : this.dentro(this.salaAtual);
    this.comandante = this.astronauta(inicio.x, inicio.y, CORES_TRIPULACAO[0], 1);
  }

  private criarRadiacao(W: number) {
    if (!this.textures.exists('particula')) {
      this.make.graphics({}, false).fillStyle(0xffffff).fillCircle(3, 3, 3).generateTexture('particula', 6, 6).destroy();
    }
    this.particulas = this.add.particles(0, 0, 'particula', {
      x: { min: -W * 0.3, max: W },
      y: this.layout.topo - 10,
      speedX: { min: 120, max: 220 },
      speedY: { min: 260, max: 420 },
      lifespan: 2600,
      scale: { min: 0.4 * this.u, max: 1.1 * this.u },
      alpha: { start: 0.9, end: 0 },
      tint: [0xfde047, 0xfb923c, 0xf87171],
      blendMode: 'ADD',
      emitting: false,
    }).setDepth(6e4);
  }

  // ---------- HUD ----------

  private criarHud(W: number, H: number) {
    const u = this.u;
    const { topo, base } = this.layout;
    this.add.rectangle(0, 0, W, topo, 0x0f172a, 0.92).setOrigin(0).setDepth(1e5);
    this.add.rectangle(0, H - base, W, base, 0x0f172a, 0.92).setOrigin(0).setDepth(1e5);
    this.hud = this.add.graphics().setDepth(1e5 + 1);

    this.hudDia = this.texto(16 * u, topo / 2, '', 16, '#f8fafc', { fontStyle: 'bold' }).setOrigin(0, 0.5).setDepth(1e5 + 1);
    this.layout.barras = 16 * u + 215 * u;
    this.layout.larguraBarra = Math.min(130 * u, (W - this.layout.barras - 330 * u) / 3 - 18 * u);
    for (let k = 0; k < 3; k++) {
      const x = this.layout.barras + k * (this.layout.larguraBarra + 18 * u);
      this.hudBarras.push(this.texto(x, 12 * u, '', 12, '#cbd5e1').setDepth(1e5 + 1));
    }
    this.layout.baterias = this.layout.barras + 3 * (this.layout.larguraBarra + 18 * u) + 8 * u;
    this.layout.tripulacao = W - 16 * u - 4 * 26 * u;
    this.texto(this.layout.baterias, 12 * u, 'Batteries', 12, '#cbd5e1').setDepth(1e5 + 1);
    this.texto(this.layout.tripulacao, 12 * u, 'Crew', 12, '#cbd5e1').setDepth(1e5 + 1);

    this.hudRadiacao = this.texto(16 * u, H - base + 10 * u, '', 15, '#f8fafc', { fontStyle: 'bold' }).setDepth(1e5 + 1);
    this.texto(16 * u, H - 10 * u, this.cap.creditos, 11, '#94a3b8').setOrigin(0, 1).setDepth(1e5 + 1);

    const estiloBotao = { backgroundColor: '#1e293b', padding: { x: 12 * u, y: 8 * u } };
    // Widest label it will show, so the button next to it is placed right.
    this.botaoFim = this.texto(W - 16 * u, H - base / 2, `End day (${this.cap.config.bateriasPorDia} unused)`, 16, '#ffffff', { ...estiloBotao, backgroundColor: '#2563eb', fontStyle: 'bold' })
      .setOrigin(1, 0.5).setDepth(1e5 + 1).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.terminarDia());
    this.texto(this.botaoFim.x - this.botaoFim.width - 12 * u, H - base / 2, 'Real NASA data', 14, '#bfdbfe', estiloBotao)
      .setOrigin(1, 0.5).setDepth(1e5 + 1).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.abrirDados());

    this.dica = this.texto(0, 0, '', 13, '#f8fafc', { backgroundColor: '#020617ee', padding: { x: 8, y: 6 }, wordWrap: { width: 260 * u } })
      .setDepth(2e5).setVisible(false);
  }

  private mostrarDica(i: number) {
    const sala = this.cap.salas[i];
    const topo = sala.lugar === 'plataforma' ? this.p(PLATAFORMA.gx + 1.8, PLATAFORMA.gy + 1.4) : this.p(this.lugar(i).gx + SALA_L / 2, this.lugar(i).gy + SALA_A);
    this.dica.setText(`${sala.nome}\n${sala.papel}`).setOrigin(0.5, 0).setPosition(topo.x, topo.y + 10 * this.u).setVisible(true);
    this.dica.x = Phaser.Math.Clamp(this.dica.x, this.dica.width / 2 + 8, this.scale.width - this.dica.width / 2 - 8);
  }

  private atualizar() {
    const u = this.u;
    const e = this.estado;
    const c = this.cap.config;
    const g = this.hud.clear();
    const d = this.dia;
    const nivel = d.nivel;
    const frio = d.frio ?? 0;
    const emJogo = this.fase === 'manha' || this.fase === 'dia' || this.fase === 'noite';

    this.hudDia.setText(`Chapter ${this.cap.numero} · Day ${Math.min(e.dia, c.dias)} of ${c.dias}\n${dataBonita(d.data)}`);

    const barras: [string, number, number | null, string][] = [
      ['Oxygen', e.oxigenio, corDaBarra(e.oxigenio), ''],
      ['Crew health', 100 - e.dose, corDaBarra(100 - e.dose), ''],
      [this.cap.nomeMeta, e.meta, null, '%'],
    ];
    barras.forEach(([nome, valor, cor, sufixo], k) => {
      const x = this.layout.barras + k * (this.layout.larguraBarra + 18 * u);
      const y = 32 * u;
      this.hudBarras[k].setText(`${nome}  ${Math.round(valor)}${sufixo}`);
      g.fillStyle(0x334155).fillRoundedRect(x, y, this.layout.larguraBarra, 14 * u, 4 * u);
      if (valor > 0) g.fillStyle(cor ?? 0x60a5fa).fillRoundedRect(x, y, Math.max(8 * u, (this.layout.larguraBarra * valor) / 100), 14 * u, 4 * u);
    });

    const total = bateriasDoDia(e, c);
    for (let k = 0; k < c.bateriasPorDia; k++) {
      const x = this.layout.baterias + k * 21 * u;
      const y = 32 * u;
      const cheia = k < this.baterias && this.fase !== 'noite';
      g.fillStyle(k < total ? 0x14532d : 0x450a0a).fillRect(x, y, 15 * u, 20 * u).fillRect(x + 4 * u, y - 3 * u, 7 * u, 3 * u);
      if (cheia) g.fillStyle(0x4ade80).fillRect(x + 2 * u, y + 2 * u, 11 * u, 16 * u);
    }

    const doentes = naEnfermaria(e);
    CORES_TRIPULACAO.forEach((cor, k) => {
      const x = this.layout.tripulacao + 11 * u + k * 26 * u;
      const y = 42 * u;
      const doente = k >= CORES_TRIPULACAO.length - doentes;
      g.fillStyle(doente ? 0x475569 : 0xf8fafc).fillCircle(x, y, 10 * u);
      g.fillStyle(doente ? 0x1e293b : 0xf59e0b).fillEllipse(x + 2 * u, y, 13 * u, 9 * u);
      g.fillStyle(cor).fillRect(x - 10 * u, y + 8 * u, 20 * u, 4 * u);
      if (doente) g.fillStyle(0xef4444).fillRect(x - 2 * u, y - 7 * u, 4 * u, 14 * u).fillRect(x - 7 * u, y - 2 * u, 14 * u, 4 * u);
    });
    // Astronauts in the infirmary leave their room (the last crew colors go first, as in the HUD).
    this.tripulantes.forEach((t, k) => t.setVisible(k + 1 < CORES_TRIPULACAO.length - doentes));

    this.cap.salas.forEach((sala, i) => {
      const n = this.entregas[sala.efeito];
      if (!pronto(e, sala.efeito, c)) {
        this.rotulos[i].setText(`${sala.nome}  ·  to build\nConstruction: ${e.obras[sala.efeito] ?? 0} of ${custo(sala.efeito, c)} batteries`).setColor('#fde68a');
        return;
      }
      if (sala.efeito === 'meta' && c.obras) {
        this.rotulos[i].setText(`${sala.nome}\nBuilt!`).setColor('#86efac');
        return;
      }
      let efeito = '';
      let curto = false;
      if (sala.efeito === 'oxigenio') efeito = `+${n * c.oxigenioPorBateria} oxygen tonight`;
      if (sala.efeito === 'meta') efeito = `+${n * c.metaPorBateria}% ${this.cap.nomeMeta.toLowerCase()} tonight`;
      if (sala.efeito === 'blindagem') {
        efeito = nivel === 0 ? 'No storm today' : `${Math.min(n, nivel)} of ${nivel} needed`;
        curto = n < nivel;
      }
      if (sala.efeito === 'aquecimento') {
        efeito = `${Math.min(n, frio)} of ${frio} needed tonight`;
        curto = n < frio;
      }
      this.rotulos[i].setText(`${sala.nome}\nBatteries: ${n}  ·  ${efeito}`).setColor(curto ? '#fca5a5' : '#f8fafc');
    });

    // Shield dome and glow: as strong as the share of the storm the shield covers.
    const cobertura = nivel === 0 ? (this.entregas.blindagem > 0 ? 1 : 0) : Math.min(1, this.entregas.blindagem / nivel);
    const centro = this.p(10, 10, 0);
    this.cupula.clear();
    if (cobertura > 0 && emJogo) {
      this.cupula.fillStyle(0xfde047, 0.05 + 0.07 * cobertura).fillEllipse(centro.x, centro.y - this.T * 1.5, this.T * 38, this.T * 18);
      this.cupula.lineStyle(2, 0xfde047, 0.25 + 0.45 * cobertura).strokeEllipse(centro.x, centro.y - this.T * 1.5, this.T * 38, this.T * 18);
    }
    this.brilho?.clear();
    if (this.brilho && this.entregas.blindagem > 0) {
      this.brilho.fillStyle(0xfde047, 0.25).fillCircle(0, 0, this.T * (0.5 + 0.25 * this.entregas.blindagem));
      this.brilho.fillStyle(0xfef9c3, 0.8).fillCircle(0, 0, this.T * 0.25);
    }
    this.calor?.clear();
    if (this.calor && this.entregas.aquecimento > 0) {
      this.calor.fillStyle(0xf97316, 0.3).fillCircle(0, 0, this.T * (0.6 + 0.3 * this.entregas.aquecimento));
      this.calor.fillStyle(0xfdba74, 0.8).fillCircle(0, 0, this.T * 0.3);
    }

    // Solar particles: more of them on stronger days.
    const ritmo = [0, 140, 45, 12][nivel];
    if (ritmo && emJogo) {
      this.particulas.frequency = ritmo;
      if (!this.particulas.emitting) this.particulas.start();
    } else {
      this.particulas.stop();
    }

    if (!this.animouFim) this.mostrarProgresso(e.meta);

    const nomeNivel = NIVEIS[nivel];
    this.hudRadiacao.setText(
      emJogo ? `Radiation today: ${nomeNivel.nome}${nivel ? `  ·  the shield needs ${baterias(nivel)}` : ''}${frio ? `  ·  heating needs ${frio}` : ''}` : '',
    ).setColor(nomeNivel.cor);

    this.botaoFim.setText(this.baterias > 0 ? `End day (${this.baterias} unused)` : 'End day  ▶');
    this.botaoFim.setAlpha(this.fase === 'dia' ? 1 : 0.4);
  }

  // ---------- Playing a day ----------

  private dentro(i: number) {
    const rota = this.lugar(i).rota;
    return this.p(...rota[rota.length - 1]);
  }

  private clicarSala(i: number) {
    if (this.fase !== 'dia' || this.andando) return;
    if (this.baterias === 0) {
      this.tweens.add({ targets: this.botaoFim, scale: 1.12, duration: 120, yoyo: true, repeat: 1 });
      return;
    }
    const sala = this.cap.salas[i];
    const c = this.cap.config;
    if (sala.efeito === 'meta' && c.obras && pronto(this.estado, 'meta', c)) {
      this.efeitoEntrega(i, 'Already built', '#fde68a');
      return;
    }
    const aoChegar = () => {
      const obra = !pronto(this.estado, sala.efeito, c);
      [this.estado, this.entregas] = entregar(this.estado, this.entregas, sala.efeito, c);
      this.salaAtual = i;
      this.andando = false;
      (this.comandante.list[1] as Phaser.GameObjects.Graphics).setVisible(false);
      if (obra && pronto(this.estado, sala.efeito, c)) {
        this.anuncio = `${sala.nome} is built!`;
        // Redraw so the finished module replaces the construction site.
        if (sala.lugar !== 'plataforma') return this.scene.restart();
      }
      this.efeitoEntrega(i, obra ? '+1 construction' : '+1 battery');
      this.atualizar();
      this.mostrarAnuncio();
    };
    (this.comandante.list[1] as Phaser.GameObjects.Graphics).setVisible(true);
    if (this.salaAtual === i) return aoChegar();

    // Back along the current room's path to the plaza, then out along the new room's path.
    const volta = this.salaAtual === null ? [] : [...this.lugar(this.salaAtual).rota].reverse().slice(1);
    const rota = [...volta, PRACA, ...this.lugar(i).rota].map((q) => this.p(...q));
    let de = new Phaser.Math.Vector2(this.comandante.x, this.comandante.y);
    const passos = rota.filter((ate) => ate.distance(de) > 1).map((ate) => {
      const duration = (de.distance(ate) / this.T) * 90;
      de = ate;
      return { x: ate.x, y: ate.y, duration, onUpdate: () => this.comandante.setDepth(this.comandante.y) };
    });
    this.andando = true;
    this.tweens.chain({ targets: this.comandante, tweens: passos, onComplete: aoChegar });
  }

  private efeitoEntrega(i: number, texto: string, cor = '#4ade80') {
    const { gx, gy } = this.cap.salas[i].lugar === 'plataforma' ? { gx: PLATAFORMA.gx - SALA_L / 2, gy: PLATAFORMA.gy - 1.5 } : this.lugar(i);
    const de = this.p(gx + SALA_L / 2, gy + 1.5, 1);
    const t = this.texto(de.x, de.y, texto, 15, cor, { fontStyle: 'bold', stroke: '#052e16', strokeThickness: 4 })
      .setOrigin(0.5).setDepth(7e4);
    this.tweens.add({ targets: t, y: de.y - this.T * 1.5, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  private mostrarAnuncio() {
    if (!this.anuncio) return;
    const t = this.texto(this.scale.width / 2, this.layout.topo + 40 * this.u, this.anuncio, 26, '#86efac', {
      fontStyle: 'bold', stroke: '#052e16', strokeThickness: 6,
    }).setOrigin(0.5).setDepth(2.5e5);
    this.anuncio = null;
    this.tweens.add({ targets: t, alpha: 0, delay: 1400, duration: 600, onComplete: () => t.destroy() });
  }

  private terminarDia() {
    if (this.fase !== 'dia' || this.andando) return;
    const antes = this.estado;
    this.noite = { antes, aloc: { ...this.entregas } };
    this.estado = fimDoDia(antes, this.entregas, this.dia, this.cap.config);
    this.res = resultado(this.estado, this.cap.config);
    if (this.res === 'vitoria') this.pontos[this.capIdx] = pontuacao(this.estado);
    this.fase = 'noite';
    this.mostrarFase();
  }

  private dormir() {
    if (this.res) {
      this.fase = 'fim';
    } else {
      this.fase = 'manha';
      this.entregas = nenhuma();
    }
    this.mostrarFase();
  }

  private comecarCapitulo(idx: number, dose: number) {
    this.capIdx = idx;
    this.pontos = this.pontos.slice(0, idx);
    this.doseNoInicio = dose;
    this.estado = inicioDoCapitulo(this.cap.config, dose);
    this.inicioDoDia = this.estado;
    this.entregas = nenhuma();
    this.salaAtual = null;
    this.noite = null;
    this.res = null;
    this.animouFim = false;
    this.fase = 'inicio';
    this.scene.restart();
  }

  private tentarDeNovo() {
    const descansou = this.doseNoInicio > DESCANSO;
    this.comecarCapitulo(this.capIdx, Math.min(this.doseNoInicio, DESCANSO));
    if (descansou) this.anuncio = 'The crew rested before trying again';
  }

  private abrirDados() {
    if (this.fase === 'dados' || this.andando) return;
    this.faseAntesDosDados = this.fase;
    this.fase = 'dados';
    this.mostrarFase();
  }

  // ---------- Panels ----------

  private mostrarFase() {
    this.fecharPainel();
    this.atualizar();
    if (this.fase === 'inicio') this.painelInicio();
    if (this.fase === 'manha') this.painelManha();
    if (this.fase === 'noite') this.painelNoite();
    if (this.fase === 'fim') this.painelFim();
    if (this.fase === 'dados') this.painelDados();
  }

  private fecharPainel() {
    this.painel.forEach((o) => o.destroy());
    this.painel = [];
    this.acaoPrincipal = null;
  }

  private abrirPainel(titulo: string, partes: Parte[], botoes: Botao[], cor = '#f8fafc') {
    this.fecharPainel();
    const u = this.u;
    const W = this.scale.width;
    const H = this.scale.height;
    const largura = Math.min(W - 24, 640 * u);
    const margem = 24 * u;

    const fundo = this.add.rectangle(0, 0, W, H, 0x020617, 0.55).setOrigin(0).setDepth(3e5).setInteractive();
    const caixa = this.add.graphics();
    const itens: Phaser.GameObjects.GameObject[] = [caixa];
    let y = margem;
    const t = this.texto(margem, y, titulo, 24, cor, { fontStyle: 'bold', wordWrap: { width: largura - 2 * margem } });
    itens.push(t);
    y += t.height + 12 * u;
    for (const parte of partes) {
      const p = typeof parte === 'string' ? { texto: parte } : parte;
      const linha = this.texto(margem, y, p.texto, p.tamanho ?? 16, p.cor ?? (p.link ? '#93c5fd' : '#cbd5e1'), {
        wordWrap: { width: largura - 2 * margem, useAdvancedWrap: true },
        fontStyle: p.negrito ? 'bold' : 'normal',
        lineSpacing: 3 * u,
      });
      if (p.link) {
        const url = p.link;
        linha.setInteractive({ useHandCursor: true }).on('pointerdown', () => window.open(url, '_blank', 'noopener'));
      }
      itens.push(linha);
      y += linha.height + 9 * u;
    }
    y += 6 * u;
    let x = largura - margem;
    for (const b of [...botoes].reverse()) {
      const bt = this.texto(x, y, b.texto, 17, '#ffffff', {
        backgroundColor: b.principal ? '#2563eb' : '#334155',
        padding: { x: 16 * u, y: 9 * u },
        fontStyle: 'bold',
      }).setOrigin(1, 0).setInteractive({ useHandCursor: true }).on('pointerdown', b.acao);
      if (b.principal) this.acaoPrincipal = b.acao;
      itens.push(bt);
      x -= bt.width + 10 * u;
    }
    const altura = y + 46 * u + margem / 2;
    caixa.fillStyle(0x0f172a, 0.97).fillRoundedRect(0, 0, largura, altura, 14 * u);
    caixa.lineStyle(2, 0x334155).strokeRoundedRect(0, 0, largura, altura, 14 * u);

    // Panels taller than the screen shrink to fit.
    const escala = Math.min(1, (H - 24) / altura);
    const c = this.add.container((W - largura * escala) / 2, (H - altura * escala) / 2, itens).setScale(escala).setDepth(3e5 + 1);
    this.painel = [fundo, c];
  }

  private painelInicio() {
    const cap = this.cap;
    const partes: Parte[] = [
      { texto: `Chapter ${cap.numero} of ${CAPITULOS.length}: ${cap.titulo}`, cor: '#93c5fd', negrito: true },
      ...cap.introducao,
      ...cap.salas.map((s) => ({ texto: `${s.nome}: ${s.papel}`, cor: '#e2e8f0' })),
      { texto: 'There are never enough batteries for everything. Choose well!', cor: '#fde68a', negrito: true },
      { texto: 'The solar storm in this game really happened. NASA spacecraft measured it in May 2024.', cor: '#86efac' },
    ];
    this.abrirPainel(cap.numero === 1 ? 'LUNAR ODYSSEY' : `Chapter ${cap.numero}`, partes, [
      { texto: 'Real NASA data', acao: () => this.abrirDados() },
      { texto: cap.numero === 1 ? 'Start mission' : 'Start chapter', acao: () => { this.fase = 'manha'; this.mostrarFase(); }, principal: true },
    ]);
  }

  private painelManha() {
    const d = this.dia;
    const c = this.cap.config;
    const nivel = NIVEIS[d.nivel];
    const doentes = naEnfermaria(this.estado);
    const partes: Parte[] = [
      { texto: 'Mission Control says:', cor: '#94a3b8', tamanho: 14 },
      { texto: d.aviso, cor: '#f8fafc' },
      {
        texto: `Radiation today: ${nivel.nome}${d.nivel ? `. The shield needs ${baterias(d.nivel)}.` : '. The shield can rest.'}`,
        cor: nivel.cor, negrito: true,
      },
    ];
    if (d.frio) {
      partes.push({ texto: `Tonight's low: ${d.minima} °C (measured by Curiosity on sol ${d.sol}). Heating needs ${baterias(d.frio)}.`, cor: '#fdba74', negrito: true });
    }
    if (c.obras) {
      const falta = this.cap.salas.filter((s) => !pronto(this.estado, s.efeito, c));
      if (falta.length) {
        partes.push({ texto: `Still to build: ${falta.map((s) => `${s.nome} (${custo(s.efeito, c) - (this.estado.obras[s.efeito] ?? 0)} more)`).join(', ')}.`, cor: '#fde68a' });
      }
      if (d.frio && !pronto(this.estado, 'aquecimento', c)) partes.push({ texto: 'Heating is not built yet: build it today, or the cold will cost oxygen tonight.', cor: '#fca5a5' });
      if (d.nivel && !pronto(this.estado, 'blindagem', c)) partes.push({ texto: 'The shield is not built yet: build it today to protect the crew.', cor: '#fca5a5' });
    }
    partes.push({ texto: `Batteries today: ${bateriasDoDia(this.estado, c)}`, cor: '#86efac', negrito: true });
    if (doentes) partes.push({ texto: `${doentes} astronaut${doentes > 1 ? 's are' : ' is'} in the infirmary, so you have ${baterias(doentes)} less.`, cor: '#fca5a5' });
    if (this.estado.dia === c.dias) partes.push({ texto: `Last day: ${this.cap.nomeMeta} must reach 100% tonight!`, cor: '#fde68a', negrito: true });
    this.abrirPainel(`Day ${this.estado.dia} of ${c.dias} · ${dataBonita(d.data)}`, partes, [
      { texto: 'Start the day', acao: () => { this.inicioDoDia = this.estado; this.fase = 'dia'; this.fecharPainel(); this.atualizar(); }, principal: true },
    ]);
  }

  private painelNoite() {
    if (!this.noite) return;
    const { antes, aloc } = this.noite;
    const e = this.estado;
    const c = this.cap.config;
    const dados = this.cap.dados;
    const d = dados.dias[antes.dia - 1];
    const faltouEscudo = Math.max(0, d.nivel - aloc.blindagem);
    const faltouCalor = Math.max(0, (d.frio ?? 0) - aloc.aquecimento);
    const nomeAr = this.cap.salas.find((s) => s.efeito === 'oxigenio')?.nome ?? 'Life Support';
    const partes: Parte[] = [
      `Oxygen: ${antes.oxigenio} → ${e.oxigenio}   (+${aloc.oxigenio * c.oxigenioPorBateria} from ${nomeAr}, −${c.oxigenioPorNoite} breathing${faltouCalor ? `, −${faltouCalor * COMUM.oxigenioPorFrioSemAquecimento} cold machines` : ''})`,
      d.nivel === 0
        ? `Radiation was calm. Crew health −${COMUM.dosePorNoite}: a little radiation is always there.`
        : faltouEscudo === 0
          ? `The shield held against the storm! Crew health −${COMUM.dosePorNoite} only.`
          : `The shield was ${baterias(faltouEscudo)} short. Crew health ${100 - antes.dose} → ${100 - e.dose}.`,
    ];
    if (d.frio) {
      partes.push(faltouCalor
        ? { texto: `Heating was ${baterias(faltouCalor)} short in the ${d.minima} °C night. Frozen machines made less air.`, cor: '#fdba74' }
        : `Heating kept the base warm in the ${d.minima} °C night.`);
    }
    const manha = this.inicioDoDia;
    const novos = this.cap.salas.filter((s) => c.obras && pronto(e, s.efeito, c) && !pronto(manha, s.efeito, c)).map((s) => s.nome);
    if (novos.length) partes.push({ texto: `Built today: ${novos.join(', ')}.`, cor: '#86efac', negrito: true });
    partes.push(`${this.cap.nomeMeta}: ${manha.meta}% → ${e.meta}%`);
    if (naEnfermaria(e) > naEnfermaria(antes)) {
      partes.push({ texto: 'An astronaut got too much radiation and went to the infirmary. Tomorrow you have one battery less.', cor: '#fca5a5', negrito: true });
    }
    if (e.meta >= 100 && !this.res) partes.push({ texto: `${this.cap.nomeMeta} is at 100%! Now keep the crew safe until the last day.`, cor: '#fde68a' });
    partes.push(
      { texto: `Real NASA data: on ${dataBonita(d.data)}, ${dados.instrumento} measured ${d.doseMedia} µGy/h on average (highest: ${d.dosePico}). A calm day is about ${dados.doseCalma}.`, cor: '#86efac', tamanho: 15 },
      { texto: `Did you know? ${d.fato}`, cor: '#bfdbfe', tamanho: 15 },
    );
    this.abrirPainel(`Night ${antes.dia}`, partes, [
      { texto: this.res ? 'See result' : 'Sleep until morning', acao: () => this.dormir(), principal: true },
    ]);
  }

  private painelFim() {
    const e = this.estado;
    const cap = this.cap;
    const ultimo = this.capIdx === CAPITULOS.length - 1;
    const placar = { texto: `Chapter score: ${pontuacao(e)} of 300  (oxygen ${e.oxigenio} + crew health ${100 - e.dose} + ${cap.nomeMeta.toLowerCase()} ${e.meta})`, cor: '#f8fafc', negrito: true };
    const licoes = (lista: string[]): Parte[] => [{ texto: 'What you learned', cor: '#93c5fd', negrito: true }, ...lista.map((l) => `• ${l}`)];
    const dados: Botao = { texto: 'Real NASA data', acao: () => this.abrirDados() };

    let mostrar: () => void;
    if (this.res === 'vitoria' && ultimo) {
      const total = this.pontos.reduce((s, x) => s + (x ?? 0), 0);
      mostrar = () => this.abrirPainel('Mission complete!', [
        cap.vitoria[0],
        cap.vitoria[1],
        { texto: `Total score: ${total} of ${300 * CAPITULOS.length}`, cor: '#f8fafc', negrito: true },
        ...licoes(CAPITULOS.flatMap((k) => k.licoes)),
      ], [dados, { texto: 'Play again', acao: () => this.comecarCapitulo(0, 0), principal: true }], '#86efac');
    } else if (this.res === 'vitoria') {
      mostrar = () => this.abrirPainel(cap.vitoria[0], [
        cap.vitoria[1],
        placar,
        ...licoes(cap.licoes),
        { texto: `Next: chapter ${cap.numero + 1}, ${CAPITULOS[this.capIdx + 1].titulo.toLowerCase()}. The crew keeps its radiation dose.`, cor: '#94a3b8', tamanho: 14 },
      ], [dados, { texto: 'Next chapter', acao: () => this.comecarCapitulo(this.capIdx + 1, e.dose), principal: true }], '#86efac');
    } else {
      const motivo: Record<Exclude<Resultado, 'vitoria' | null>, [string, string]> = {
        'sem-oxigenio': ['Out of oxygen', 'The crew ran out of oxygen. Mission Control called them back to Earth.'],
        radiacao: ['Too much radiation', 'The crew got too much radiation. Mission Control called them back to Earth.'],
        'meta-incompleta': [`${cap.nomeMeta} not ready`, `${cap.metaIncompleta} It was ${e.meta}% done.`],
      };
      const [titulo, texto] = motivo[this.res ?? 'meta-incompleta'];
      mostrar = () => this.abrirPainel(titulo, [texto, placar, ...licoes(cap.licoes)], [
        dados,
        { texto: 'Start over', acao: () => this.comecarCapitulo(0, 0) },
        { texto: 'Try this chapter again', acao: () => this.tentarDeNovo(), principal: true },
      ], '#fca5a5');
    }

    // The rocket takes off at the end of the Moon chapter.
    if (this.res === 'vitoria' && cap.tema === 'lua' && this.estrutura && !this.animouFim) {
      this.animouFim = true;
      this.particulas.stop();
      const foguete = this.estrutura;
      const chama = this.add.graphics().setDepth(foguete.depth - 1);
      const h = ALTURA_FOGUETE * this.T;
      this.tweens.add({
        targets: foguete,
        y: -h * 1.2,
        duration: 2600,
        ease: 'Quad.in',
        onUpdate: () => {
          this.mascara.clear().fillStyle(0xffffff).fillRect(0, foguete.y - h, this.scale.width, h + this.T);
          chama.clear().fillStyle(0xfb923c, 0.9).fillTriangle(foguete.x - this.T * 0.4, foguete.y, foguete.x + this.T * 0.4, foguete.y, foguete.x, foguete.y + this.T * 1.6);
          chama.fillStyle(0xfde047).fillTriangle(foguete.x - this.T * 0.2, foguete.y, foguete.x + this.T * 0.2, foguete.y, foguete.x, foguete.y + this.T * 0.9);
        },
        onComplete: () => {
          chama.destroy();
          if (this.fase === 'fim') mostrar();
        },
      });
      return;
    }
    if (this.animouFim && this.estrutura) this.estrutura.setVisible(false);
    mostrar();
  }

  private painelDados() {
    const dados = this.cap.dados;
    this.abrirPainel('Real NASA data in this chapter', [
      `Each day of this chapter is a real day from May 2024. The radiation level comes from the dose measured by ${dados.instrumento}.`,
      ...dados.dias.map((d) => ({
        texto: `${dataBonita(d.data)}: ${d.doseMedia} µGy/h average, highest ${d.dosePico}  →  ${NIVEIS[d.nivel].nome}${d.minima !== undefined ? `  ·  night low ${d.minima} °C` : ''}`,
        cor: NIVEIS[d.nivel].cor, tamanho: 14,
      })),
      { texto: 'Sources (click to open):', cor: '#94a3b8', tamanho: 14 },
      ...dados.fontes.map((f) => ({ texto: f.nome, link: f.url, tamanho: 14 })),
      { texto: this.cap.notaDados, cor: '#94a3b8', tamanho: 13 },
    ], [
      { texto: 'Back', acao: () => { this.fase = this.faseAntesDosDados; this.mostrarFase(); }, principal: true },
    ]);
  }
}
