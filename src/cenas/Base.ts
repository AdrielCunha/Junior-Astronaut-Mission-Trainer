// Generated with AI assistance (Claude). See README, "Use of AI tools".
// The game scene: isometric base, HUD and the morning / night / end panels, for all three chapters.
// Rules live in ../regras.ts, chapter settings in ../capitulos.ts, real NASA data in ../dados/.
import Phaser from 'phaser';
import { CAPITULOS, type Dia, type Equipamento, type Lugar } from '../capitulos';
import {
  COMUM, DESCANSO, inicioDoCapitulo, fimDoDia, resultado, bateriasDoDia, naEnfermaria, pontuacao, nenhuma, entregar, pronto, custo,
  type Alocacao, type Efeito, type Estado, type Resultado,
} from '../regras';

type V = Phaser.Math.Vector2;
type Fase = 'inicio' | 'manha' | 'dia' | 'noite' | 'fim' | 'dados';
// A panel part is a line of text, or a block that draws itself (icons, bars) and returns its height.
type Bloco = (x: number, y: number, largura: number) => { itens: Phaser.GameObjects.GameObject[]; altura: number };
type Parte = string | { texto: string; cor?: string; tamanho?: number; negrito?: boolean; link?: string } | Bloco;
type Icone = 'sol' | 'escudo' | 'termometro' | 'bateria' | 'oxigenio' | 'saude' | 'foguete' | 'marte' | 'chama' | 'cupula';
type Cartao = { icone: Icone; cor?: number; grande: string; pequeno: string; corGrande?: string };
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
// The ship is long and thin: frame it on its own so it fills the screen.
const MUNDO_NAVE = { gx0: -3, gx1: 22, gy0: -1, gy1: 13 };
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
// The ship, seen in cutaway: a long hull floating in space. Rooms sit against the far hull
// wall, the corridor runs in front of them, bunks and cockpit are near the open side.
const CASCO = { x0: 0, x1: 17, ponta: 21.5, y0: 4.5, y1: 13 };
const PRACA_NAVE: Ponto = [9, 9.5];
const LUGARES_NAVE: typeof LUGARES = {
  ...LUGARES,
  baixo: { gx: 1, gy: 4.6, paredeEsquerda: false, rota: [[3.5, 9.5], [3.5, 6.8]], posto: [5.3, 6.0] },
  esquerda: { gx: 6.5, gy: 4.6, paredeEsquerda: false, rota: [[9, 9.5], [9, 6.8]], posto: [10.8, 6.0] },
  direita: { gx: 12, gy: 4.6, paredeEsquerda: false, rota: [[14.5, 9.5], [14.5, 6.8]], posto: [16.3, 6.0] },
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
const corNumero = (hex: string) => Phaser.Display.Color.HexStringToColor(hex).color;
const faixa = (p: number[]) => (p[0] === p[1] ? NIVEIS[p[0]].nome : `${NIVEIS[p[0]].nome}–${NIVEIS[p[1]].nome}`);
const v = (x: number, y: number) => new Phaser.Math.Vector2(x, y);

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
  private chama: Phaser.GameObjects.Graphics | null = null; // engine exhaust, bigger with more engine power
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
  private guia: Phaser.GameObjects.Container | null = null;
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

  private get lugares() {
    return this.cap.tema === 'nave' ? LUGARES_NAVE : LUGARES;
  }

  private get praca(): Ponto {
    return this.cap.tema === 'nave' ? PRACA_NAVE : PRACA;
  }

  private lugar(i: number) {
    return this.lugares[this.cap.salas[i].lugar];
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
    const { gx0, gx1, gy0, gy1 } = this.cap.tema === 'nave' ? MUNDO_NAVE : MUNDO;
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
    this.guia = null;
    this.chama = null;

    this.desenharCeu(W, H);
    if (this.cap.tema === 'nave') {
      this.desenharNave();
    } else {
      this.desenharChao();
      this.desenharPaineisSolares();
      this.desenharCaminhos();
    }
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

  // The spaceship for chapter 2, drawn once into the background.
  private desenharNave() {
    const g = this.estatico();
    const { x0, x1, ponta, y0, y1 } = CASCO;
    const meio = (y0 + y1) / 2;
    const ALTO = 2.2;
    const parede = (a: Ponto, b: Ponto, h: number, cor: number, z0 = 0) =>
      g.fillStyle(cor).fillPoints([this.p(a[0], a[1], z0), this.p(b[0], b[1], z0), this.p(b[0], b[1], z0 + h), this.p(a[0], a[1], z0 + h)], true);

    // Solar wings, out in space behind the hull.
    for (const wx of [4.5, 13]) {
      const a = this.p(wx, y0, 1.2);
      const b = this.p(wx, y0 - 4.6, 1.2);
      g.lineStyle(Math.max(2, this.T * 0.12), 0x94a3b8).lineBetween(a.x, a.y, b.x, b.y);
      for (const k of [0, 1]) {
        const cantos = this.retangulo(wx - 1.7, y0 - 1.0 - k * 1.9, wx + 1.7, y0 - 2.6 - k * 1.9, 1.2);
        g.fillStyle(0x1e3a8a).fillPoints(cantos, true);
        g.lineStyle(1, 0x60a5fa, 0.8);
        for (let t = 0.25; t < 1; t += 0.25) {
          const c0 = this.p(Phaser.Math.Linear(wx - 1.7, wx + 1.7, t), y0 - 1.0 - k * 1.9, 1.2);
          const c1 = this.p(Phaser.Math.Linear(wx - 1.7, wx + 1.7, t), y0 - 2.6 - k * 1.9, 1.2);
          g.lineBetween(c0.x, c0.y, c1.x, c1.y);
        }
        g.lineStyle(1.5, 0x93c5fd).strokePoints(cantos, true);
      }
    }
    const asa = this.p(8.75, y0 - 5.2, 1.2);
    this.texto(asa.x, asa.y, `Solar wings\n${baterias(this.cap.config.bateriasPorDia)} a day`, 12, '#bfdbfe', { align: 'center', backgroundColor: '#0f172acc', padding: { x: 6, y: 3 } })
      .setOrigin(0.5, 1).setDepth(5e4);

    // Engine blocks at the back end; the exhaust is drawn live in atualizar().
    for (const ey of [6.5, 11]) {
      this.caixa(g, -1.4, ey - 1.0, 1.4, 2.0, 1.8, 0x475569, 0.1);
      const bocal = this.p(-1.4, ey, 1.0);
      g.fillStyle(0x0e7490).fillEllipse(bocal.x, bocal.y, this.T * 1.0, this.T * 0.8);
    }

    // Hull: underside faces, deck, far walls, back wall.
    const casco: Ponto[] = [[x0, y0], [x1, y0], [ponta, meio], [x1, y1], [x0, y1]];
    g.fillStyle(0x1e293b).fillPoints([this.p(x0, y1, 0), this.p(x1, y1, 0), this.p(x1, y1, -1), this.p(x0, y1, -1)], true);
    g.fillStyle(0x0f172a).fillPoints([this.p(x1, y1, 0), this.p(ponta, meio, 0), this.p(ponta, meio, -1), this.p(x1, y1, -1)], true);
    g.fillStyle(0x334155).fillPoints(casco.map(([x, y]) => this.p(x, y)), true);
    g.lineStyle(1, 0x475569, 0.9);
    for (let k = 1; k < x1; k += 2) {
      const a = this.p(k, y0);
      const b = this.p(k, y1);
      g.lineBetween(a.x, a.y, b.x, b.y);
    }
    parede([x0, y0], [x1, y0], ALTO, 0x94a3b8);
    parede([x1, y0], [ponta, meio], ALTO, 0x7c8ca3);
    parede([x0, y0], [x1, y0], 0.3, 0x38bdf8, ALTO - 0.45);
    // Portholes with stars, and the cockpit windshield in the nose.
    for (let k = 1.5; k < x1; k += 2.6) {
      const c = this.p(k, y0, 1.6);
      g.fillStyle(0x475569).fillEllipse(c.x, c.y, this.T * 0.9, this.T * 0.75);
      g.fillStyle(0x020617).fillEllipse(c.x, c.y, this.T * 0.65, this.T * 0.55);
      g.fillStyle(0xffffff, 0.9).fillCircle(c.x - this.T * 0.12, c.y - this.T * 0.08, 1.2);
    }
    const vidro = [this.p(x1 + 0.6, y0 + 0.57, 0.9), this.p(ponta - 0.8, meio - 0.76, 0.9), this.p(ponta - 0.8, meio - 0.76, 1.9), this.p(x1 + 0.6, y0 + 0.57, 1.9)];
    g.fillStyle(0x0c4a6e).fillPoints(vidro, true).lineStyle(2, 0x38bdf8).strokePoints(vidro, true);
    parede([x0, y1], [x0, y0], ALTO, 0x64748b);
    const porta = [this.p(x0, 9.9, 0), this.p(x0, 9.1, 0), this.p(x0, 9.1, 1.5), this.p(x0, 9.9, 1.5)];
    g.fillStyle(0x334155).fillPoints(porta, true).lineStyle(2, 0xfacc15).strokePoints(porta, true);

    // Corridor with guide lights, and low dividers between the rooms.
    g.fillStyle(0x1e293b).fillPoints(this.retangulo(0.4, 8.6, 18.4, 10.4), true);
    for (let k = 1; k < 18.4; k += 1.2) {
      const q = this.p(k, 10.3, 0.02);
      g.fillStyle(0x7dd3fc).fillEllipse(q.x, q.y, this.T * 0.2, this.T * 0.1);
    }
    for (const dx of [6.25, 11.75]) this.caixa(g, dx - 0.06, 4.6, 0.12, 3.0, 0.4, 0xcbd5e1);

    // Crew bunks, galley table and the cockpit, on the open side.
    for (const k of [0, 1, 2]) {
      this.caixa(g, 1.2 + k * 1.5, 11.0, 1.2, 1.6, 0.35, 0xe2e8f0);
      this.caixa(g, 1.2 + k * 1.5, 11.0, 1.2, 0.5, 0.12, 0x6366f1, 0.35);
    }
    this.caixa(g, 8.0, 11.1, 2.2, 1.2, 0.45, 0xa8a29e);
    for (const [sx, sy] of [[7.6, 11.6], [10.6, 11.6]] as Ponto[]) this.cilindro(g, sx, sy, 0.22, 0.3, 0x64748b);
    for (const sx of [14.6, 16.4]) {
      this.caixa(g, sx, 10.9, 0.8, 0.8, 0.35, 0x334155);
      this.caixa(g, sx, 11.55, 0.8, 0.15, 0.6, 0x475569, 0.35);
    }
    this.caixa(g, 17.4, 9.4, 1.0, 1.6, 0.6, 0x1e293b);
    const tela = this.p(17.9, 10.2, 0.62);
    g.fillStyle(0x22d3ee).fillEllipse(tela.x, tela.y, this.T * 0.6, this.T * 0.3);

    // Cut edge of the hull along the open side, including the nose.
    this.caixa(g, x0, y1 - 0.25, x1 - x0, 0.25, 0.35, 0x64748b);
    g.fillStyle(0xef4444).fillPoints([this.p(x0, y1, 0.12), this.p(x1, y1, 0.12), this.p(x1, y1, 0.22), this.p(x0, y1, 0.22)], true);
    parede([x1, y1], [ponta, meio], 0.35, 0x64748b);
    g.fillStyle(0xef4444).fillPoints([this.p(x1, y1, 0.12), this.p(ponta, meio, 0.12), this.p(ponta, meio, 0.22), this.p(x1, y1, 0.22)], true);
    // Glass canopy over the cockpit, so the nose reads as the front of the ship.
    const cabine = this.p(19.3, meio, 0.9);
    g.fillStyle(0x0c4a6e, 0.85).fillEllipse(cabine.x, cabine.y, this.T * 3.2, this.T * 2.0);
    g.fillStyle(0x38bdf8, 0.35).fillEllipse(cabine.x, cabine.y - this.T * 0.2, this.T * 2.6, this.T * 1.4);
    g.fillStyle(0xffffff, 0.6).fillEllipse(cabine.x - this.T * 0.6, cabine.y - this.T * 0.45, this.T * 0.7, this.T * 0.25);
    g.lineStyle(2, 0x94a3b8).strokeEllipse(cabine.x, cabine.y, this.T * 3.2, this.T * 2.0);

    for (const [x, y, nome] of [[3.6, 12.9, 'Crew bunks'], [9.1, 12.9, 'Galley'], [15.6, 12.9, 'Cockpit']] as [number, number, string][]) {
      const q = this.p(x, y, 0.6);
      this.texto(q.x, q.y, nome, 11, '#cbd5e1').setOrigin(0.5, 0).setDepth(5e4);
    }
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
    const trechos: [Ponto, Ponto][] = [[this.praca, [HABITAT.gx + 2.5, HABITAT.gy + SALA_A]]];
    for (const sala of this.cap.salas) {
      let de = this.praca;
      for (const ate of this.lugares[sala.lugar].rota) {
        trechos.push([de, ate]);
        de = ate;
      }
    }
    for (const [a, b] of trechos) {
      g.fillStyle(cor).fillPoints(this.retangulo(
        Math.min(a[0], b[0]) - meia, Math.min(a[1], b[1]) - meia, Math.max(a[0], b[0]) + meia, Math.max(a[1], b[1]) + meia,
      ), true);
    }
    const c = this.p(...this.praca);
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
    } else if (this.cap.tema === 'lua') {
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
      const { gx, gy } = this.lugares[sala.lugar];
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
        ({ g, piso } = feito ? this.desenharModulo(this.lugares[sala.lugar], sala.cor) : this.desenharObra(this.lugares[sala.lugar], sala.cor));
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
      this.chama = this.add.graphics().setDepth(-0.5);
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
    const inicio = this.salaAtual === null ? this.p(...this.praca) : this.dentro(this.salaAtual);
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
    // During the day only the forecast is known; the real level shows up in the night summary.
    const [prevMin, prevMax] = d.previsao;
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
        efeito = prevMax === 0 ? 'No storm expected' : `forecast ${prevMin} to ${prevMax}`;
        curto = n < prevMin;
      }
      if (sala.efeito === 'aquecimento') {
        efeito = `${Math.min(n, frio)} of ${frio} needed tonight`;
        curto = n < frio;
      }
      this.rotulos[i].setText(`${sala.nome}\nBatteries: ${n}  ·  ${efeito}`).setColor(curto ? '#fca5a5' : '#f8fafc');
    });

    // Shield dome and glow: as strong as the share of the storm the shield covers.
    const cobertura = prevMax === 0 ? (this.entregas.blindagem > 0 ? 1 : 0) : Math.min(1, this.entregas.blindagem / prevMax);
    const centro = this.cap.tema === 'nave' ? this.p(10.5, 8.75, 0) : this.p(10, 10, 0);
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

    if (this.chama) {
      // Engine exhaust: longer with every battery sent to the engines today.
      const g2 = this.chama.clear();
      const comprimento = 1.6 + 1.2 * this.entregas.meta;
      for (const ey of [6.5, 11]) {
        const base = [this.p(-1.4, ey - 0.6, 1), this.p(-1.4, ey + 0.6, 1)];
        const ponta = this.p(-1.4 - comprimento, ey, 1);
        g2.fillStyle(0x22d3ee, 0.45).fillTriangle(base[0].x, base[0].y, base[1].x, base[1].y, ponta.x, ponta.y);
        const meio = this.p(-1.4 - comprimento * 0.55, ey, 1);
        const b2 = [this.p(-1.4, ey - 0.3, 1), this.p(-1.4, ey + 0.3, 1)];
        g2.fillStyle(0xe0f2fe, 0.9).fillTriangle(b2[0].x, b2[0].y, b2[1].x, b2[1].y, meio.x, meio.y);
      }
    }

    // Solar particles: more of them on stronger days.
    const ritmo = [0, 140, 45, 12][prevMax];
    if (ritmo && emJogo) {
      this.particulas.frequency = ritmo;
      if (!this.particulas.emitting) this.particulas.start();
    } else {
      this.particulas.stop();
    }

    if (!this.animouFim) this.mostrarProgresso(e.meta);

    this.hudRadiacao.setText(
      emJogo ? `Storm forecast: ${faixa(d.previsao)}${prevMax ? `  ·  shield ${prevMin} to ${prevMax}` : ''}${frio ? `  ·  heating needs ${frio}` : ''}` : '',
    ).setColor(NIVEIS[prevMax].cor);

    this.atualizarGuia();
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
    const rota = [...volta, this.praca, ...this.lugar(i).rota].map((q) => this.p(...q));
    let de = new Phaser.Math.Vector2(this.comandante.x, this.comandante.y);
    const passos = rota.filter((ate) => ate.distance(de) > 1).map((ate) => {
      const duration = (de.distance(ate) / this.T) * 90;
      de = ate;
      return { x: ate.x, y: ate.y, duration, onUpdate: () => this.comandante.setDepth(this.comandante.y) };
    });
    this.andando = true;
    this.atualizarGuia();
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
      if (typeof parte === 'function') {
        const b = parte(margem, y, largura - 2 * margem);
        itens.push(...b.itens);
        y += b.altura + 12 * u;
        continue;
      }
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

  // ---------- Icons and visual blocks for the panels ----------

  private icone(g: Phaser.GameObjects.Graphics, tipo: Icone, x: number, y: number, s: number, cor = 0xffffff) {
    if (tipo === 'sol') {
      g.fillStyle(cor, 0.22).fillCircle(x, y, s);
      g.lineStyle(s * 0.13, cor);
      for (let k = 0; k < 8; k++) {
        const a = (k * Math.PI) / 4;
        g.lineBetween(x + Math.cos(a) * s * 0.62, y + Math.sin(a) * s * 0.62, x + Math.cos(a) * s * 0.95, y + Math.sin(a) * s * 0.95);
      }
      g.fillStyle(cor).fillCircle(x, y, s * 0.48);
    } else if (tipo === 'escudo') {
      g.fillStyle(0xeab308).fillPoints([v(x - s * 0.65, y - s * 0.75), v(x + s * 0.65, y - s * 0.75), v(x + s * 0.65, y + s * 0.05), v(x, y + s * 0.85), v(x - s * 0.65, y + s * 0.05)], true);
      g.fillStyle(0xfef08a).fillPoints([v(x - s * 0.4, y - s * 0.5), v(x + s * 0.4, y - s * 0.5), v(x + s * 0.4, y), v(x, y + s * 0.5), v(x - s * 0.4, y)], true);
    } else if (tipo === 'termometro') {
      g.fillStyle(0xe2e8f0).fillRoundedRect(x - s * 0.2, y - s * 0.85, s * 0.4, s * 1.3, s * 0.2);
      g.fillStyle(0x60a5fa).fillCircle(x, y + s * 0.5, s * 0.34).fillRect(x - s * 0.08, y - s * 0.2, s * 0.16, s * 0.7);
    } else if (tipo === 'bateria') {
      g.fillStyle(0x14532d).fillRoundedRect(x - s * 0.42, y - s * 0.7, s * 0.84, s * 1.45, s * 0.1).fillRect(x - s * 0.18, y - s * 0.86, s * 0.36, s * 0.18);
      g.fillStyle(cor).fillRect(x - s * 0.3, y - s * 0.55, s * 0.6, s * 1.15);
    } else if (tipo === 'oxigenio') {
      g.fillStyle(0x3b82f6).fillCircle(x - s * 0.25, y + s * 0.2, s * 0.45);
      g.fillStyle(0x60a5fa).fillCircle(x + s * 0.38, y - s * 0.28, s * 0.3);
      g.fillStyle(0xbfdbfe).fillCircle(x + s * 0.05, y - s * 0.72, s * 0.16);
    } else if (tipo === 'saude') {
      g.fillStyle(0xef4444).fillCircle(x - s * 0.28, y - s * 0.2, s * 0.33).fillCircle(x + s * 0.28, y - s * 0.2, s * 0.33);
      g.fillTriangle(x - s * 0.6, y - s * 0.08, x + s * 0.6, y - s * 0.08, x, y + s * 0.68);
    } else if (tipo === 'foguete') {
      g.fillStyle(0xf1f5f9).fillRect(x - s * 0.22, y - s * 0.45, s * 0.44, s * 0.9);
      g.fillStyle(0xef4444).fillTriangle(x - s * 0.22, y - s * 0.45, x + s * 0.22, y - s * 0.45, x, y - s * 0.92);
      g.fillTriangle(x - s * 0.22, y + s * 0.15, x - s * 0.52, y + s * 0.6, x - s * 0.22, y + s * 0.45).fillTriangle(x + s * 0.22, y + s * 0.15, x + s * 0.52, y + s * 0.6, x + s * 0.22, y + s * 0.45);
      g.fillStyle(0x38bdf8).fillCircle(x, y - s * 0.12, s * 0.13);
    } else if (tipo === 'marte') {
      g.fillStyle(0xc2410c).fillCircle(x, y, s * 0.7);
      g.fillStyle(0x9a3412).fillEllipse(x - s * 0.2, y + s * 0.15, s * 0.5, s * 0.25).fillEllipse(x + s * 0.25, y - s * 0.25, s * 0.35, s * 0.18);
    } else if (tipo === 'chama') {
      g.fillStyle(0xf97316).fillEllipse(x, y + s * 0.1, s * 0.9, s * 1.4);
      g.fillStyle(0xfde047).fillEllipse(x, y + s * 0.32, s * 0.45, s * 0.7);
    } else {
      g.fillStyle(0xe7e5e4);
      g.beginPath().arc(x, y + s * 0.45, s * 0.8, Math.PI, 0).closePath().fillPath();
      g.fillStyle(0x38bdf8).fillRect(x - s * 0.15, y + s * 0.05, s * 0.3, s * 0.4);
      g.lineStyle(s * 0.08, 0x78716c).lineBetween(x - s * 0.9, y + s * 0.45, x + s * 0.9, y + s * 0.45);
    }
  }

  private iconeDe(ef: Efeito): Icone {
    if (ef === 'oxigenio') return 'oxigenio';
    if (ef === 'blindagem') return 'escudo';
    if (ef === 'aquecimento') return 'chama';
    return this.cap.tema === 'lua' ? 'foguete' : this.cap.tema === 'nave' ? 'marte' : 'cupula';
  }

  // Mission Control speaking: one short line in a speech bubble.
  private blocoFala(fala: string): Bloco {
    return (x, y, largura) => {
      const u = this.u;
      const g = this.add.graphics();
      const t = this.texto(x + 64 * u, y + 30 * u, fala, 19, '#f8fafc', { fontStyle: 'bold', wordWrap: { width: largura - 80 * u, useAdvancedWrap: true } });
      const nome = this.texto(x + 64 * u, y + 10 * u, 'Mission Control', 12, '#93c5fd');
      const altura = Math.max(64 * u, t.height + 42 * u);
      g.fillStyle(0x1e3a8a, 0.55).fillRoundedRect(x, y, largura, altura, 12 * u);
      // Antenna: Mission Control's face.
      g.fillStyle(0xe2e8f0).fillEllipse(x + 30 * u, y + altura / 2 + 4 * u, 34 * u, 16 * u);
      g.lineStyle(3 * u, 0xe2e8f0).lineBetween(x + 30 * u, y + altura / 2 + 4 * u, x + 30 * u, y + altura / 2 - 16 * u);
      g.fillStyle(0xef4444).fillCircle(x + 30 * u, y + altura / 2 - 18 * u, 4 * u);
      return { itens: [g, nome, t], altura };
    };
  }

  // A row of big cards: icon, big value, small caption.
  private blocoCartoes(cartoes: Cartao[]): Bloco {
    return (x, y, largura) => {
      const u = this.u;
      const g = this.add.graphics();
      const itens: Phaser.GameObjects.GameObject[] = [g];
      const espaco = 10 * u;
      const w = (largura - espaco * (cartoes.length - 1)) / cartoes.length;
      const altura = 132 * u;
      cartoes.forEach((c, k) => {
        const cx = x + k * (w + espaco);
        g.fillStyle(0x1e293b).fillRoundedRect(cx, y, w, altura, 12 * u);
        this.icone(g, c.icone, cx + w / 2, y + 34 * u, 24 * u, c.cor);
        itens.push(this.texto(cx + w / 2, y + 66 * u, c.grande, 22, c.corGrande ?? '#f8fafc', { fontStyle: 'bold' }).setOrigin(0.5, 0));
        itens.push(this.texto(cx + w / 2, y + 96 * u, c.pequeno, 13, '#cbd5e1', { align: 'center', wordWrap: { width: w - 12 * u } }).setOrigin(0.5, 0));
      });
      return { itens, altura };
    };
  }

  // The rooms of the chapter, as small cards with an icon and one line.
  private blocoSalas(): Bloco {
    return (x, y, largura) => {
      const u = this.u;
      const salas = this.cap.salas;
      const g = this.add.graphics();
      const itens: Phaser.GameObjects.GameObject[] = [g];
      const espaco = 8 * u;
      const w = (largura - espaco * (salas.length - 1)) / salas.length;
      const altura = 112 * u;
      salas.forEach((sala, k) => {
        const cx = x + k * (w + espaco);
        g.fillStyle(sala.cor, 0.22).fillRoundedRect(cx, y, w, altura, 10 * u);
        g.lineStyle(2, sala.cor, 0.8).strokeRoundedRect(cx, y, w, altura, 10 * u);
        this.icone(g, this.iconeDe(sala.efeito), cx + w / 2, y + 28 * u, 18 * u);
        itens.push(this.texto(cx + w / 2, y + 52 * u, sala.nome, 14, '#f8fafc', { fontStyle: 'bold', align: 'center', wordWrap: { width: w - 8 * u } }).setOrigin(0.5, 0));
        itens.push(this.texto(cx + w / 2, y + 76 * u, sala.curto, 12, '#cbd5e1', { align: 'center', wordWrap: { width: w - 8 * u } }).setOrigin(0.5, 0));
      });
      return { itens, altura };
    };
  }

  // Bars that slide from the morning value to the night value, with the change in big numbers.
  private blocoBarras(linhas: { icone: Icone; nome: string; de: number; para: number; sufixo?: string; corFixa?: number }[]): Bloco {
    return (x, y, largura) => {
      const u = this.u;
      const fundo = this.add.graphics();
      const itens: Phaser.GameObjects.GameObject[] = [fundo];
      const alturaLinha = 40 * u;
      const xBarra = x + 170 * u;
      const wBarra = largura - 170 * u - 70 * u;
      linhas.forEach((l, k) => {
        const cy = y + k * alturaLinha + alturaLinha / 2;
        this.icone(fundo, l.icone, x + 16 * u, cy, 14 * u);
        itens.push(this.texto(x + 40 * u, cy, l.nome, 15, '#e2e8f0').setOrigin(0, 0.5));
        fundo.fillStyle(0x334155).fillRoundedRect(xBarra, cy - 8 * u, wBarra, 16 * u, 5 * u);
        const barra = this.add.graphics();
        itens.push(barra);
        const diferenca = Math.round(l.para - l.de);
        itens.push(this.texto(x + largura, cy, `${diferenca > 0 ? '+' : ''}${diferenca}${l.sufixo ?? ''}`, 18, diferenca > 0 ? '#86efac' : diferenca < 0 ? '#fca5a5' : '#94a3b8', { fontStyle: 'bold' }).setOrigin(1, 0.5));
        const desenhar = (valor: number) => {
          if (!barra.active) return;
          barra.clear();
          if (valor > 0) barra.fillStyle(l.corFixa ?? corDaBarra(valor)).fillRoundedRect(xBarra, cy - 8 * u, Math.max(8 * u, (wBarra * valor) / 100), 16 * u, 5 * u);
        };
        desenhar(l.de);
        this.tweens.addCounter({ from: l.de, to: l.para, duration: 900, delay: 250 + k * 150, ease: 'Cubic.out', onUpdate: (tw) => desenhar(tw.getValue() ?? l.para) });
      });
      return { itens, altura: linhas.length * alturaLinha };
    };
  }

  // Today's real measurement, as "N times a calm day".
  private blocoMedida(dia: Dia): Bloco {
    return (x, y, largura) => {
      const u = this.u;
      const dados = this.cap.dados;
      const vezes = dia.doseMedia / dados.doseCalma;
      const g = this.add.graphics();
      const altura = 70 * u;
      g.fillStyle(0x14532d, 0.45).fillRoundedRect(x, y, largura, altura, 10 * u);
      this.icone(g, 'sol', x + 34 * u, y + altura / 2, 20 * u, corNumero(NIVEIS[dia.nivel].cor));
      const t1 = this.texto(x + 66 * u, y + altura / 2, NIVEIS[dia.nivel].nome, 26, NIVEIS[dia.nivel].cor, { fontStyle: 'bold' }).setOrigin(0, 0.5);
      const comparacao = vezes < 1.6 ? 'NASA measured a calm day' : `NASA measured ${vezes < 10 ? vezes.toFixed(1) : Math.round(vezes)}× the radiation of a calm day`;
      const t2 = this.texto(t1.x + t1.width + 14 * u, y + 12 * u, comparacao, 14, '#e2e8f0', { wordWrap: { width: largura - t1.width - 100 * u } });
      const t3 = this.texto(t1.x + t1.width + 14 * u, y + altura - 10 * u, `Forecast was ${faixa(dia.previsao)} · ${dia.doseMedia} µGy/h`, 12, '#94a3b8').setOrigin(0, 1);
      return { itens: [g, t1, t2, t3], altura };
    };
  }

  // Day 1: a bouncing arrow shows where to click, until the first battery.
  private atualizarGuia() {
    const alvo = this.capIdx === 0 ? 0 : this.capIdx === 2 ? this.cap.salas.findIndex((s) => s.efeito === 'aquecimento') : -1;
    const usadas = bateriasDoDia(this.estado, this.cap.config) - this.baterias;
    const precisa = alvo >= 0 && this.fase === 'dia' && this.estado.dia === 1 && usadas === 0 && !this.andando;
    if (!precisa) {
      this.guia?.destroy();
      this.guia = null;
      return;
    }
    if (this.guia) return;
    const { gx, gy } = this.lugar(alvo);
    const q = this.p(gx + SALA_L / 2, gy + SALA_A - 0.4, 1.5);
    const g = this.add.graphics();
    g.fillStyle(0xfacc15).fillTriangle(-16 * this.u, 0, 16 * this.u, 0, 0, 22 * this.u).fillRect(-6 * this.u, -24 * this.u, 12 * this.u, 26 * this.u);
    const t = this.texto(0, -30 * this.u, this.capIdx === 0 ? 'Click a room!' : 'Build Heating first!', 16, '#fde047', { fontStyle: 'bold', stroke: '#0f172a', strokeThickness: 5 }).setOrigin(0.5, 1);
    this.guia = this.add.container(q.x, q.y, [g, t]).setDepth(2.1e5);
    this.tweens.add({ targets: this.guia, y: q.y + 12 * this.u, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.inOut' });
  }

  private painelInicio() {
    const cap = this.cap;
    const partes: Parte[] = [
      { texto: `Chapter ${cap.numero} of ${CAPITULOS.length}: ${cap.titulo}`, cor: '#93c5fd', negrito: true, tamanho: 18 },
      ...cap.introducao.map((t) => ({ texto: t, cor: '#e2e8f0', tamanho: 17 })),
      this.blocoSalas(),
      { texto: 'Never enough batteries for everything. Choose well!', cor: '#fde68a', negrito: true, tamanho: 17 },
      { texto: 'The solar storm is real: NASA measured it in May 2024.', cor: '#86efac', tamanho: 14 },
    ];
    this.abrirPainel(cap.numero === 1 ? 'LUNAR ODYSSEY' : `Chapter ${cap.numero}`, partes, [
      { texto: 'Real NASA data', acao: () => this.abrirDados() },
      { texto: cap.numero === 1 ? 'Start mission' : 'Start chapter', acao: () => { this.fase = 'manha'; this.mostrarFase(); }, principal: true },
    ]);
  }

  private painelManha(detalhe = false) {
    const d = this.dia;
    const c = this.cap.config;
    const [pMin, pMax] = d.previsao;
    const doentes = naEnfermaria(this.estado);
    const cartoes: Cartao[] = [
      {
        icone: 'sol', cor: corNumero(NIVEIS[pMax].cor), grande: faixa(d.previsao), corGrande: NIVEIS[pMax].cor,
        pequeno: pMax === 0 ? 'Storm forecast: none' : pMin === pMax ? `Shield needs ${baterias(pMin)}` : `Storm forecast. Shield: ${pMin} to ${pMax}`,
      },
    ];
    if (d.frio) cartoes.push({ icone: 'termometro', grande: `${d.minima} °C`, corGrande: '#93c5fd', pequeno: `Tonight. Heating needs ${baterias(d.frio)}` });
    cartoes.push({ icone: 'bateria', cor: 0x4ade80, grande: `${bateriasDoDia(this.estado, c)}`, corGrande: '#86efac', pequeno: doentes ? `batteries (${doentes} crew sick)` : 'batteries today' });

    const partes: Parte[] = [this.blocoFala(d.curto)];
    if (detalhe) partes.push({ texto: d.aviso, cor: '#cbd5e1', tamanho: 14 });
    partes.push(this.blocoCartoes(cartoes));
    if (pMin !== pMax) partes.push({ texto: 'Forecasts are never sure. More shield is safer, but leaves fewer batteries.', cor: '#94a3b8', tamanho: 13 });
    if (c.obras) {
      if (d.frio && !pronto(this.estado, 'aquecimento', c)) partes.push({ texto: 'Build Heating first: tonight is cold!', cor: '#fca5a5', negrito: true });
      else if (pMax && !pronto(this.estado, 'blindagem', c)) partes.push({ texto: 'Build the Shield: a storm may come!', cor: '#fca5a5', negrito: true });
      const falta = this.cap.salas.filter((s) => !pronto(this.estado, s.efeito, c));
      if (falta.length) partes.push({ texto: `To build: ${falta.map((s) => `${s.nome} ${custo(s.efeito, c) - (this.estado.obras[s.efeito] ?? 0)}`).join(' · ')}`, cor: '#fde68a', tamanho: 14 });
    }
    if (this.estado.dia === c.dias) partes.push({ texto: `Last day! ${this.cap.nomeMeta} must reach 100% tonight.`, cor: '#fde68a', negrito: true });
    this.abrirPainel(`Day ${this.estado.dia} of ${c.dias} · ${dataBonita(d.data)}`, partes, [
      { texto: detalhe ? 'Less' : 'More from NASA', acao: () => this.painelManha(!detalhe) },
      { texto: 'Start the day', acao: () => { this.inicioDoDia = this.estado; this.fase = 'dia'; this.fecharPainel(); this.atualizar(); }, principal: true },
    ]);
  }

  private painelNoite() {
    if (!this.noite) return;
    const { antes, aloc } = this.noite;
    const e = this.estado;
    const c = this.cap.config;
    const d = this.cap.dados.dias[antes.dia - 1];
    const manha = this.inicioDoDia;
    const faltouEscudo = Math.max(0, d.nivel - aloc.blindagem);
    const faltouCalor = Math.max(0, (d.frio ?? 0) - aloc.aquecimento);
    const partes: Parte[] = [
      this.blocoBarras([
        { icone: 'oxigenio', nome: 'Oxygen', de: antes.oxigenio, para: e.oxigenio },
        { icone: 'saude', nome: 'Crew health', de: 100 - antes.dose, para: 100 - e.dose },
        { icone: this.iconeDe('meta'), nome: this.cap.nomeMeta, de: manha.meta, para: e.meta, sufixo: '%', corFixa: 0x60a5fa },
      ]),
    ];
    const sobra = aloc.blindagem - d.nivel;
    if (faltouEscudo) partes.push({ texto: `The shield was ${baterias(faltouEscudo)} short: the crew got radiation.`, cor: '#fca5a5', negrito: true });
    else if (d.nivel && sobra === 0) partes.push({ texto: 'Perfect shield: exactly what the storm needed!', cor: '#86efac', negrito: true });
    else if (d.nivel) partes.push({ texto: `The shield held! ${baterias(sobra)} more than needed.`, cor: '#86efac', negrito: true });
    else if (sobra > 0) partes.push({ texto: `No storm came: ${baterias(sobra)} in the shield ${sobra === 1 ? 'was' : 'were'} not needed.`, cor: '#fde68a', negrito: true });
    if (d.frio) partes.push(faltouCalor ? { texto: `Too cold (${d.minima} °C): frozen machines made less air.`, cor: '#fca5a5', negrito: true } : { texto: `Heating beat the ${d.minima} °C night!`, cor: '#86efac', negrito: true });
    const novos = this.cap.salas.filter((s) => c.obras && pronto(e, s.efeito, c) && !pronto(manha, s.efeito, c)).map((s) => s.nome);
    if (novos.length) partes.push({ texto: `Built today: ${novos.join(', ')}!`, cor: '#86efac', negrito: true });
    if (naEnfermaria(e) > naEnfermaria(antes)) partes.push({ texto: 'An astronaut went to the infirmary: 1 battery less tomorrow.', cor: '#fca5a5', negrito: true });
    if (!this.res && e.oxigenio <= 20) partes.push({ texto: 'Oxygen is low! Power the air room tomorrow.', cor: '#fde68a', negrito: true });
    if (e.meta >= 100 && !this.res) partes.push({ texto: `${this.cap.nomeMeta} is at 100%! Keep the crew safe until the last day.`, cor: '#fde68a' });
    partes.splice(0, 0, this.blocoMedida(d));
    partes.push({ texto: `Did you know? ${d.fato}`, cor: '#bfdbfe', tamanho: 14 });
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
        texto: `${dataBonita(d.data)}: ${d.doseMedia} µGy/h average, highest ${d.dosePico}  →  ${NIVEIS[d.nivel].nome} (forecast ${faixa(d.previsao)})${d.minima !== undefined ? `  ·  night low ${d.minima} °C` : ''}`,
        cor: NIVEIS[d.nivel].cor, tamanho: 14,
      })),
      { texto: 'Sources (click to open):', cor: '#94a3b8', tamanho: 14 },
      ...dados.fontes.map((f) => ({ texto: f.nome, link: f.url, tamanho: 14 })),
      { texto: 'The morning forecast ranges are made by the game from the NASA events known that morning (flares, CMEs, particles, ENLIL). They are not official NASA forecasts.', cor: '#94a3b8', tamanho: 13 },
      { texto: this.cap.notaDados, cor: '#94a3b8', tamanho: 13 },
    ], [
      { texto: 'Back', acao: () => { this.fase = this.faseAntesDosDados; this.mostrarFase(); }, principal: true },
    ]);
  }
}
