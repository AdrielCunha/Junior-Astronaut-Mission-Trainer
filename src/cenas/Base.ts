// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Chapter 1, the Moon base: isometric scene, HUD and the morning / night / end panels.
// Game rules live in ../regras.ts; real NASA data in ../dados/lua.json.
import Phaser from 'phaser';
import lua from '../dados/lua.json';
import {
  REGRAS as R, estadoInicial, fimDoDia, resultado, bateriasDoDia, naEnfermaria, pontuacao,
  type Alocacao, type Estado, type Resultado,
} from '../regras';

type V = Phaser.Math.Vector2;
type Chave = keyof Alocacao;
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
// Paths start at the plaza in front of the habitat. Each room: its module, the path from the
// plaza (the last point is where the commander stands inside) and where its crew member works.
// Every path reaches its module from an open side, so it never runs behind a wall.
const PRACA: Ponto = [10, 13];
const SALAS: (Modulo & { chave: Chave; nome: string; cor: number; papel: string; rota: Ponto[]; posto: Ponto })[] = [
  { chave: 'suporte', nome: 'Life Support', cor: 0x3b82f6, gx: 1, gy: 13, paredeEsquerda: true,
    rota: [[10, 14.5], [3.5, 14.5]], posto: [1.9, 15],
    papel: `Makes oxygen. Each battery gives +${R.oxigenioPorBateria} oxygen. The crew breathes ${R.oxigenioPorNoite} every night.` },
  { chave: 'blindagem', nome: 'Radiation Shield', cor: 0xeab308, gx: 14, gy: 3, paredeEsquerda: false,
    rota: [[13.5, 13], [13.5, 4.6], [16.3, 4.6]], posto: [18.3, 4.3],
    papel: 'Protects the crew from solar storms. It needs as many batteries as the storm level.' },
  { chave: 'oficina', nome: 'Rocket Workshop', cor: 0xf97316, gx: 12, gy: 16, paredeEsquerda: false,
    rota: [[10, 17.6], [14.3, 17.6]], posto: [16.3, 17.3],
    papel: `Builds the rocket to Mars. Each battery adds ${R.metaPorBateria}%. Launch is on day ${R.dias}.` },
];
const HABITAT: Modulo = { gx: 7, gy: 7, paredeEsquerda: true };
const PLATAFORMA = { gx: 18, gy: 11 };
const ALTURA_FOGUETE = 5.2;
const NIVEIS = [
  { nome: 'CALM', cor: '#4ade80' },
  { nome: 'RISING', cor: '#facc15' },
  { nome: 'HIGH', cor: '#fb923c' },
  { nome: 'EXTREME', cor: '#f87171' },
];
// Index 0 is the commander, the astronaut the player moves.
const CORES_TRIPULACAO = [0xef4444, 0x22c55e, 0xa855f7, 0x38bdf8];
const CRATERAS = [[3.5, 9, 1.4], [6.5, 18.6, 0.8], [18.6, 17.2, 0.9], [11, 2, 1.0], [18.6, 1.4, 0.6], [1.4, 18.6, 0.5], [8.6, 4.6, 0.5], [16.5, 7.4, 0.5]];
const DOSE_CALMA = lua.dias[0].doseMedia;

const zero = (): Alocacao => ({ suporte: 0, blindagem: 0, oficina: 0 });
const dataBonita = (iso: string) =>
  new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric', timeZone: 'UTC' });
const corDaBarra = (v: number) => (v > 70 ? 0x22c55e : v >= 30 ? 0xeab308 : 0xef4444);
const escurecer = (cor: number, pct: number) => Phaser.Display.Color.ValueToColor(cor).darken(pct).color;

export class Base extends Phaser.Scene {
  // Game state. Scene fields survive scene.restart(), which redraws everything after a resize.
  private fase: Fase = 'inicio';
  private faseAntesDosDados: Fase = 'inicio';
  private estado: Estado = estadoInicial();
  private entregas: Alocacao = zero();
  private salaAtual: number | null = null;
  private noite: { antes: Estado; aloc: Alocacao } | null = null;
  private res: Resultado = null;
  private lancado = false;

  // Rebuilt by every create().
  private T = 20;
  private ox = 0;
  private oy = 0;
  private u = 1;
  private andando = false;
  private comandante!: Phaser.GameObjects.Container;
  private tripulantes: Phaser.GameObjects.Container[] = [];
  private rotulos: Phaser.GameObjects.Text[] = [];
  private foguete!: Phaser.GameObjects.Container;
  private mascara!: Phaser.GameObjects.Graphics;
  private cupula!: Phaser.GameObjects.Graphics;
  private brilho!: Phaser.GameObjects.Graphics;
  private hud!: Phaser.GameObjects.Graphics;
  private hudDia!: Phaser.GameObjects.Text;
  private hudBarras: Phaser.GameObjects.Text[] = [];
  private hudRadiacao!: Phaser.GameObjects.Text;
  private botaoFim!: Phaser.GameObjects.Text;
  private dica!: Phaser.GameObjects.Text;
  private particulas!: Phaser.GameObjects.Particles.ParticleEmitter;
  private painel: Phaser.GameObjects.GameObject[] = [];
  private acaoPrincipal: (() => void) | null = null;
  private layout = { topo: 0, base: 0, barras: 0, larguraBarra: 0, baterias: 0, tripulacao: 0 };

  constructor() {
    super('Base');
  }

  private get dia() {
    return lua.dias[Math.min(this.estado.dia, R.dias) - 1];
  }

  private get baterias() {
    const usadas = this.entregas.suporte + this.entregas.blindagem + this.entregas.oficina;
    return bateriasDoDia(this.estado) - usadas;
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

    this.desenharCeu(W, H);
    this.desenharChao();
    this.desenharPaineisSolares();
    this.desenharCaminhos();
    this.desenharBase();
    this.desenharPlataforma();
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
  }

  // ---------- Drawing the world ----------

  private estaticos: Phaser.GameObjects.Graphics[] = [];

  private estatico() {
    const g = this.add.graphics();
    this.estaticos.push(g);
    return g;
  }

  // Solid box: top face plus the two faces that look at the viewer.
  private caixa(g: Phaser.GameObjects.Graphics, gx: number, gy: number, l: number, a: number, h: number, cor: number, z0 = 0) {
    const z1 = z0 + h;
    g.fillStyle(escurecer(cor, 18)).fillPoints([this.p(gx, gy + a, z0), this.p(gx + l, gy + a, z0), this.p(gx + l, gy + a, z1), this.p(gx, gy + a, z1)], true);
    g.fillStyle(escurecer(cor, 32)).fillPoints([this.p(gx + l, gy + a, z0), this.p(gx + l, gy, z0), this.p(gx + l, gy, z1), this.p(gx + l, gy + a, z1)], true);
    g.fillStyle(cor).fillPoints([this.p(gx, gy, z1), this.p(gx + l, gy, z1), this.p(gx + l, gy + a, z1), this.p(gx, gy + a, z1)], true);
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
    for (let i = 0; i < 220; i++) {
      g.fillStyle(0xffffff, rnd.realInRange(0.15, 0.9));
      g.fillCircle(rnd.between(0, W), rnd.between(0, H), rnd.realInRange(0.4, 1.5) * this.u);
    }
    // Earth as seen from the Moon.
    const r = 30 * this.u;
    const x = 26 * this.u + r;
    const y = this.layout.topo + 22 * this.u + r;
    g.fillStyle(0x60a5fa, 0.18).fillCircle(x, y, r * 1.25);
    g.fillStyle(0x2563eb).fillCircle(x, y, r);
    g.fillStyle(0x16a34a).fillEllipse(x - r * 0.3, y - r * 0.2, r * 0.8, r * 0.55).fillEllipse(x + r * 0.35, y + r * 0.35, r * 0.5, r * 0.6);
    g.fillStyle(0xffffff, 0.75).fillEllipse(x + r * 0.1, y - r * 0.55, r * 1.1, r * 0.22).fillEllipse(x - r * 0.2, y + r * 0.6, r * 0.9, r * 0.18);
    g.fillStyle(0x020617, 0.55).fillEllipse(x + r * 0.45, y, r * 1.1, r * 2);
    this.texto(x, y + r + 6 * this.u, 'Earth', 12, '#93c5fd').setOrigin(0.5, 0);
  }

  private desenharChao() {
    const g = this.estatico();
    const { gx0, gx1, gy0, gy1 } = MUNDO;
    this.caixa(g, gx0, gy0, gx1 - gx0, gy1 - gy0, 1, 0x9ca3af, -1);
    const rnd = new Phaser.Math.RandomDataGenerator(['regolith']);
    for (let i = 0; i < 260; i++) {
      const q = this.p(rnd.realInRange(gx0 + 0.2, gx1 - 0.2), rnd.realInRange(gy0 + 0.2, gy1 - 0.2));
      g.fillStyle(rnd.pick([0x6b7280, 0xd1d5db, 0x4b5563]), 0.6).fillCircle(q.x, q.y, rnd.realInRange(0.04, 0.12) * this.T);
    }
    for (const [cx, cy, r] of CRATERAS) {
      const c = this.p(cx, cy);
      const w = r * this.T * 2.8;
      g.fillStyle(0xd1d5db).fillEllipse(c.x, c.y, w, w / 2);
      g.fillStyle(0x6b7280).fillEllipse(c.x, c.y - w * 0.03, w * 0.82, w * 0.38);
      g.fillStyle(0x9ca3af).fillEllipse(c.x + w * 0.08, c.y + w * 0.04, w * 0.5, w * 0.2);
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
    this.texto(r.x, r.y, `Solar panels\n${R.bateriasPorDia} batteries a day`, 12, '#bfdbfe', { align: 'center', backgroundColor: '#0f172acc', padding: { x: 6, y: 3 } })
      .setOrigin(0, 0.5).setDepth(5e4);
  }

  private retangulo(x0: number, y0: number, x1: number, y1: number, z = 0) {
    return [this.p(x0, y0, z), this.p(x1, y0, z), this.p(x1, y1, z), this.p(x0, y1, z)];
  }

  // Walkways from the plaza to every module, with small guide lights.
  private desenharCaminhos() {
    const g = this.estatico();
    const meia = 0.55;
    const trechos: [Ponto, Ponto][] = [[PRACA, [HABITAT.gx + 2.5, HABITAT.gy + SALA_A]]];
    for (const sala of SALAS) {
      let de = PRACA;
      for (const ate of sala.rota) {
        trechos.push([de, ate]);
        de = ate;
      }
    }
    for (const [a, b] of trechos) {
      g.fillStyle(0x52525b).fillPoints(this.retangulo(
        Math.min(a[0], b[0]) - meia, Math.min(a[1], b[1]) - meia, Math.max(a[0], b[0]) + meia, Math.max(a[1], b[1]) + meia,
      ), true);
    }
    const c = this.p(...PRACA);
    g.fillStyle(0x52525b).fillEllipse(c.x, c.y, this.T * 5.2, this.T * 2.6);
    g.fillStyle(0x3f3f46).fillEllipse(c.x, c.y, this.T * 3.6, this.T * 1.8);
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

  private desenharBase() {
    // Habitat: where the crew sleeps. Not a battery room.
    const hab = this.desenharModulo(HABITAT, 0x94a3b8).g;
    for (const k of [0, 1]) {
      this.caixa(hab, HABITAT.gx + 0.5 + k * 1.6, HABITAT.gy + 0.4, 1.2, 0.9, 0.35, 0xe2e8f0);
      this.caixa(hab, HABITAT.gx + 0.5 + k * 1.6, HABITAT.gy + 0.4, 1.2, 0.6, 0.12, 0x6366f1, 0.35);
    }
    this.cilindro(hab, HABITAT.gx + 4.0, HABITAT.gy + 1.0, 0.45, 0.4, 0xa8a29e);
    const th = this.p(HABITAT.gx + SALA_L / 2, HABITAT.gy, PAREDE + 0.2);
    this.texto(th.x, th.y, 'Habitat', 12, '#cbd5e1', { backgroundColor: '#0f172acc', padding: { x: 6, y: 3 } }).setOrigin(0.5, 1).setDepth(5e4);

    SALAS.forEach((sala, i) => {
      const { gx, gy } = sala;
      const { g, piso } = this.desenharModulo(sala, sala.cor);
      this.desenharEquipamento(g, sala.chave, gx, gy);

      // Click target: floor plus back wall.
      const alvo = this.add.graphics().setDepth(g.depth + 0.5);
      const area = [this.p(gx, gy + SALA_A), this.p(gx, gy, PAREDE), this.p(gx + SALA_L, gy, PAREDE), this.p(gx + SALA_L, gy), this.p(gx + SALA_L, gy + SALA_A)];
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

      const topo = this.p(gx + SALA_L / 2, gy, PAREDE + 0.2);
      this.rotulos.push(
        this.texto(topo.x, topo.y, '', 13, '#f8fafc', { align: 'center', backgroundColor: '#0f172add', padding: { x: 7, y: 4 } })
          .setOrigin(0.5, 1).setDepth(5e4),
      );
    });

    // Shield dome over the whole base, visible when the shield is powered.
    this.cupula = this.add.graphics().setDepth(4e4);
  }

  private desenharEquipamento(g: Phaser.GameObjects.Graphics, chave: Chave, gx: number, gy: number) {
    if (chave === 'suporte') {
      this.cilindro(g, gx + 0.9, gy + 1.0, 0.32, 1.1, 0xe0f2fe);
      this.cilindro(g, gx + 1.7, gy + 1.0, 0.32, 1.1, 0xe0f2fe);
      this.caixa(g, gx + 2.6, gy + 0.5, 1.9, 1.0, 0.35, 0x92400e);
      const rnd = new Phaser.Math.RandomDataGenerator(['plantas']);
      for (let k = 0; k < 7; k++) {
        const q = this.p(gx + 2.8 + rnd.realInRange(0, 1.5), gy + 0.6 + rnd.realInRange(0, 0.8), 0.45);
        g.fillStyle(rnd.pick([0x16a34a, 0x22c55e, 0x4ade80])).fillCircle(q.x, q.y, this.T * rnd.realInRange(0.14, 0.22));
      }
    } else if (chave === 'blindagem') {
      this.caixa(g, gx + 1.8, gy + 0.6, 1.4, 1.2, 0.6, 0x64748b);
      this.cilindro(g, gx + 2.5, gy + 1.2, 0.35, 0.8, 0xfacc15, 0.6);
      const topo = this.p(gx + 2.5, gy + 1.2, 1.5);
      this.brilho = this.add.graphics().setDepth(g.depth + 0.4);
      this.brilho.setPosition(topo.x, topo.y);
      // Antenna dish next to the generator.
      const base = this.p(gx + 4.3, gy + 0.7, 0);
      const prato = this.p(gx + 4.3, gy + 0.7, 1.5);
      g.lineStyle(this.T * 0.08, 0x94a3b8).lineBetween(base.x, base.y, prato.x, prato.y);
      g.fillStyle(0xe2e8f0).fillEllipse(prato.x, prato.y, this.T * 1.1, this.T * 0.6);
      g.fillStyle(0x94a3b8).fillEllipse(prato.x + this.T * 0.08, prato.y + this.T * 0.04, this.T * 0.7, this.T * 0.35);
    } else {
      this.caixa(g, gx + 0.6, gy + 0.5, 2.0, 0.9, 0.5, 0x78716c);
      this.caixa(g, gx + 0.9, gy + 0.6, 0.5, 0.4, 0.25, 0xf97316, 0.5);
      this.caixa(g, gx + 1.7, gy + 0.7, 0.4, 0.4, 0.4, 0x94a3b8, 0.5);
      // Robot arm.
      const a = this.p(gx + 3.6, gy + 0.8, 0);
      const b = this.p(gx + 3.6, gy + 0.8, 1.3);
      const c = this.p(gx + 2.6, gy + 1.0, 1.1);
      g.lineStyle(this.T * 0.16, 0xfbbf24).lineBetween(a.x, a.y, b.x, b.y).lineBetween(b.x, b.y, c.x, c.y);
      g.fillStyle(0x1f2937).fillCircle(b.x, b.y, this.T * 0.12).fillCircle(c.x, c.y, this.T * 0.1);
    }
  }

  private desenharPlataforma() {
    const g = this.estatico();
    const { gx, gy } = PLATAFORMA;
    this.caixa(g, gx - 1.8, gy - 1.4, 3.6, 2.8, 0.25, 0x6b7280);
    for (let k = 0; k < 5; k++) {
      const a = this.p(gx - 1.6 + k * 0.7, gy + 1.4, 0.13);
      g.fillStyle(k % 2 ? 0x111827 : 0xfacc15).fillRect(a.x, a.y - this.T * 0.12, this.T * 0.7, this.T * 0.12);
    }
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

    // Rocket: a faint outline of the finished rocket, and the solid rocket revealed from the bottom as it is built.
    const c = this.p(gx, gy, 0.25);
    const h = ALTURA_FOGUETE * this.T;
    const w = this.T * 1.1;
    const contorno = this.add.graphics().setDepth(c.y);
    contorno.lineStyle(1.5, 0xffffff, 0.35);
    contorno.strokeRect(c.x - w / 2, c.y - h * 0.78, w, h * 0.66);
    contorno.strokeTriangle(c.x - w / 2, c.y - h * 0.78, c.x + w / 2, c.y - h * 0.78, c.x, c.y - h);

    const corpo = this.add.graphics();
    corpo.fillStyle(0x374151).fillTriangle(-w * 0.35, 0, w * 0.35, 0, 0, -h * 0.14);
    corpo.fillStyle(0xef4444).fillTriangle(-w / 2, -h * 0.12, -w * 0.95, 0, -w / 2, -h * 0.3).fillTriangle(w / 2, -h * 0.12, w * 0.95, 0, w / 2, -h * 0.3);
    corpo.fillStyle(0xf1f5f9).fillRect(-w / 2, -h * 0.78, w, h * 0.66);
    corpo.fillStyle(0xcbd5e1).fillRect(w * 0.1, -h * 0.78, w * 0.4, h * 0.66);
    corpo.fillStyle(0xf97316).fillRect(-w / 2, -h * 0.36, w, h * 0.05);
    corpo.fillStyle(0x334155).fillCircle(0, -h * 0.6, w * 0.24);
    corpo.fillStyle(0x38bdf8).fillCircle(0, -h * 0.6, w * 0.17);
    corpo.fillStyle(0xef4444).fillTriangle(-w / 2, -h * 0.78, w / 2, -h * 0.78, 0, -h);
    this.foguete = this.add.container(c.x, c.y, [corpo]).setDepth(c.y + 1);
    this.mascara = this.make.graphics({}, false);
    this.foguete.setMask(this.mascara.createGeometryMask());
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
    for (let i = 1; i < CORES_TRIPULACAO.length; i++) {
      const q = this.p(...SALAS[i - 1].posto);
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

    this.hudDia = this.texto(16 * u, topo / 2, '', 17, '#f8fafc', { fontStyle: 'bold' }).setOrigin(0, 0.5).setDepth(1e5 + 1);
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
    this.texto(16 * u, H - 10 * u, 'Storm data: NASA DONKI + LRO/CRaTER via OSDR RadLab. Archived, May 2024.', 11, '#94a3b8')
      .setOrigin(0, 1).setDepth(1e5 + 1);

    const estiloBotao = { backgroundColor: '#1e293b', padding: { x: 12 * u, y: 8 * u } };
    // Widest label it will show, so the button next to it is placed right.
    this.botaoFim = this.texto(W - 16 * u, H - base / 2, `End day (${R.bateriasPorDia} unused)`, 16, '#ffffff', { ...estiloBotao, backgroundColor: '#2563eb', fontStyle: 'bold' })
      .setOrigin(1, 0.5).setDepth(1e5 + 1).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.terminarDia());
    this.texto(this.botaoFim.x - this.botaoFim.width - 12 * u, H - base / 2, 'Real NASA data', 14, '#bfdbfe', estiloBotao)
      .setOrigin(1, 0.5).setDepth(1e5 + 1).setInteractive({ useHandCursor: true })
      .on('pointerdown', () => this.abrirDados());

    this.dica = this.texto(0, 0, '', 13, '#f8fafc', { backgroundColor: '#020617ee', padding: { x: 8, y: 6 }, wordWrap: { width: 260 * u } })
      .setDepth(2e5).setVisible(false);
  }

  private mostrarDica(i: number) {
    const sala = SALAS[i];
    const topo = this.p(sala.gx + SALA_L / 2, sala.gy + SALA_A, 0);
    this.dica.setText(`${sala.nome}\n${sala.papel}`).setOrigin(0.5, 0).setPosition(topo.x, topo.y + 10 * this.u).setVisible(true);
    this.dica.x = Phaser.Math.Clamp(this.dica.x, this.dica.width / 2 + 8, this.scale.width - this.dica.width / 2 - 8);
  }

  private atualizar() {
    const u = this.u;
    const e = this.estado;
    const g = this.hud.clear();
    const nivel = this.dia.nivel;
    const emJogo = this.fase === 'manha' || this.fase === 'dia' || this.fase === 'noite';

    this.hudDia.setText(`Day ${Math.min(e.dia, R.dias)} of ${R.dias}\n${dataBonita(this.dia.data)}`);

    const barras: [string, number, number | null][] = [
      ['Oxygen', e.oxigenio, corDaBarra(e.oxigenio)],
      ['Crew health', 100 - e.dose, corDaBarra(100 - e.dose)],
      ['Rocket', e.meta, null],
    ];
    barras.forEach(([nome, valor, cor], k) => {
      const x = this.layout.barras + k * (this.layout.larguraBarra + 18 * u);
      const y = 32 * u;
      this.hudBarras[k].setText(`${nome}  ${Math.round(valor)}${nome === 'Rocket' ? '%' : ''}`);
      g.fillStyle(0x334155).fillRoundedRect(x, y, this.layout.larguraBarra, 14 * u, 4 * u);
      if (valor > 0) g.fillStyle(cor ?? 0x60a5fa).fillRoundedRect(x, y, Math.max(8 * u, (this.layout.larguraBarra * valor) / 100), 14 * u, 4 * u);
    });

    const total = bateriasDoDia(e);
    for (let k = 0; k < R.bateriasPorDia; k++) {
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
    // Astronauts in the infirmary leave their room.
    this.tripulantes.forEach((t, k) => t.setVisible(k < this.tripulantes.length - doentes));

    SALAS.forEach((sala, i) => {
      const n = this.entregas[sala.chave];
      let efeito = '';
      if (sala.chave === 'suporte') efeito = `+${n * R.oxigenioPorBateria} oxygen tonight`;
      if (sala.chave === 'blindagem') efeito = nivel === 0 ? 'No storm today' : `${Math.min(n, nivel)} of ${nivel} needed`;
      if (sala.chave === 'oficina') efeito = `+${n * R.metaPorBateria}% rocket tonight`;
      this.rotulos[i].setText(`${sala.nome}\nBatteries: ${n}  ·  ${efeito}`);
      const curto = sala.chave === 'blindagem' && n < nivel;
      this.rotulos[i].setColor(curto ? '#fca5a5' : '#f8fafc');
    });

    // Shield dome and glow: as strong as the share of the storm the shield covers.
    const cobertura = nivel === 0 ? (this.entregas.blindagem > 0 ? 1 : 0) : Math.min(1, this.entregas.blindagem / nivel);
    const centro = this.p(10, 10, 0);
    this.cupula.clear();
    if (cobertura > 0 && emJogo) {
      this.cupula.fillStyle(0xfde047, 0.05 + 0.07 * cobertura).fillEllipse(centro.x, centro.y - this.T * 1.5, this.T * 38, this.T * 18);
      this.cupula.lineStyle(2, 0xfde047, 0.25 + 0.45 * cobertura).strokeEllipse(centro.x, centro.y - this.T * 1.5, this.T * 38, this.T * 18);
    }
    this.brilho.clear();
    if (this.entregas.blindagem > 0) {
      this.brilho.fillStyle(0xfde047, 0.25).fillCircle(0, 0, this.T * (0.5 + 0.25 * this.entregas.blindagem));
      this.brilho.fillStyle(0xfef9c3, 0.8).fillCircle(0, 0, this.T * 0.25);
    }

    // Solar particles: more of them on stronger days.
    const ritmo = [0, 140, 45, 12][nivel];
    if (ritmo && emJogo) {
      this.particulas.frequency = ritmo;
      if (!this.particulas.emitting) this.particulas.start();
    } else {
      this.particulas.stop();
    }

    this.desenharFoguete(e.meta);

    const nomeNivel = NIVEIS[nivel];
    this.hudRadiacao.setText(
      emJogo ? `Radiation today: ${nomeNivel.nome}${nivel ? `  ·  the shield needs ${nivel} batter${nivel > 1 ? 'ies' : 'y'}` : ''}` : '',
    ).setColor(nomeNivel.cor);

    this.botaoFim.setText(this.baterias > 0 ? `End day (${this.baterias} unused)` : 'End day  ▶');
    this.botaoFim.setAlpha(this.fase === 'dia' ? 1 : 0.4);
  }

  private desenharFoguete(meta: number) {
    const fracao = meta / 100;
    const c = new Phaser.Math.Vector2(this.foguete.x, this.foguete.y);
    const h = ALTURA_FOGUETE * this.T;
    this.mascara.clear().fillStyle(0xffffff).fillRect(c.x - this.T * 2, c.y - h * fracao, this.T * 4, h * fracao + this.T * 0.5);
  }

  // ---------- Playing a day ----------

  private dentro(i: number) {
    const rota = SALAS[i].rota;
    return this.p(...rota[rota.length - 1]);
  }

  private clicarSala(i: number) {
    if (this.fase !== 'dia' || this.andando) return;
    if (this.baterias === 0) {
      this.tweens.add({ targets: this.botaoFim, scale: 1.12, duration: 120, yoyo: true, repeat: 1 });
      return;
    }
    const entregar = () => {
      this.entregas[SALAS[i].chave]++;
      this.salaAtual = i;
      this.andando = false;
      (this.comandante.list[1] as Phaser.GameObjects.Graphics).setVisible(false);
      this.efeitoEntrega(i);
      this.atualizar();
    };
    (this.comandante.list[1] as Phaser.GameObjects.Graphics).setVisible(true);
    if (this.salaAtual === i) return entregar();

    // Back along the current room's path to the plaza, then out along the new room's path.
    const volta = this.salaAtual === null ? [] : [...SALAS[this.salaAtual].rota].reverse().slice(1);
    const rota = [...volta, PRACA, ...SALAS[i].rota].map((q) => this.p(...q));
    let de = new Phaser.Math.Vector2(this.comandante.x, this.comandante.y);
    const passos = rota.filter((ate) => ate.distance(de) > 1).map((ate) => {
      const duration = (de.distance(ate) / this.T) * 90;
      de = ate;
      return { x: ate.x, y: ate.y, duration, onUpdate: () => this.comandante.setDepth(this.comandante.y) };
    });
    this.andando = true;
    this.tweens.chain({ targets: this.comandante, tweens: passos, onComplete: entregar });
  }

  private efeitoEntrega(i: number) {
    const sala = SALAS[i];
    const de = this.p(sala.gx + SALA_L / 2, sala.gy + 1.5, 1);
    const t = this.texto(de.x, de.y, '+1 battery', 15, '#4ade80', { fontStyle: 'bold', stroke: '#052e16', strokeThickness: 4 })
      .setOrigin(0.5).setDepth(7e4);
    this.tweens.add({ targets: t, y: de.y - this.T * 1.5, alpha: 0, duration: 900, onComplete: () => t.destroy() });
  }

  private terminarDia() {
    if (this.fase !== 'dia' || this.andando) return;
    const antes = this.estado;
    this.noite = { antes, aloc: { ...this.entregas } };
    this.estado = fimDoDia(antes, this.entregas, { nivel: this.dia.nivel });
    this.res = resultado(this.estado);
    this.fase = 'noite';
    this.atualizar();
    this.mostrarFase();
  }

  private dormir() {
    if (this.res) {
      this.fase = 'fim';
    } else {
      this.fase = 'manha';
      this.entregas = zero();
    }
    this.atualizar();
    this.mostrarFase();
  }

  private reiniciar() {
    this.estado = estadoInicial();
    this.entregas = zero();
    this.salaAtual = null;
    this.noite = null;
    this.res = null;
    this.lancado = false;
    this.fase = 'manha';
    this.scene.restart();
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
    this.abrirPainel('LUNAR ODYSSEY', [
      { texto: 'Chapter 1: the Moon base', cor: '#93c5fd', negrito: true },
      `Your crew of four lives on the Moon. Your mission: build a rocket to fly to Mars. Launch day is ${dataBonita(lua.dias[R.dias - 1].data)}, in ${R.dias} days.`,
      `Every morning the solar panels charge ${R.bateriasPorDia} batteries. Click a room and your commander carries a battery there.`,
      ...SALAS.map((s) => ({ texto: `${s.nome}: ${s.papel}`, cor: '#e2e8f0' })),
      { texto: 'There are never enough batteries for everything. Choose well!', cor: '#fde68a', negrito: true },
      { texto: 'The solar storm in this game really happened. NASA spacecraft measured it in May 2024.', cor: '#86efac' },
    ], [
      { texto: 'Real NASA data', acao: () => this.abrirDados() },
      { texto: 'Start mission', acao: () => { this.fase = 'manha'; this.atualizar(); this.mostrarFase(); }, principal: true },
    ]);
  }

  private painelManha() {
    const d = this.dia;
    const nivel = NIVEIS[d.nivel];
    const doentes = naEnfermaria(this.estado);
    const partes: Parte[] = [
      { texto: 'Mission Control says:', cor: '#94a3b8', tamanho: 14 },
      { texto: d.aviso, cor: '#f8fafc' },
      {
        texto: `Radiation today: ${nivel.nome}${d.nivel ? `. The shield needs ${d.nivel} batter${d.nivel > 1 ? 'ies' : 'y'}.` : '. The shield can rest.'}`,
        cor: nivel.cor, negrito: true,
      },
      { texto: `Batteries today: ${bateriasDoDia(this.estado)}`, cor: '#86efac', negrito: true },
    ];
    if (doentes) partes.push({ texto: `${doentes} astronaut${doentes > 1 ? 's are' : ' is'} in the infirmary, so you have ${doentes} batter${doentes > 1 ? 'ies' : 'y'} less.`, cor: '#fca5a5' });
    if (this.estado.dia === R.dias) partes.push({ texto: 'Launch is tonight: the rocket must reach 100%!', cor: '#fde68a', negrito: true });
    this.abrirPainel(`Day ${this.estado.dia} of ${R.dias} · ${dataBonita(d.data)}`, partes, [
      { texto: 'Start the day', acao: () => { this.fase = 'dia'; this.fecharPainel(); this.atualizar(); }, principal: true },
    ]);
  }

  private painelNoite() {
    if (!this.noite) return;
    const { antes, aloc } = this.noite;
    const e = this.estado;
    const d = lua.dias[antes.dia - 1];
    const faltou = Math.max(0, d.nivel - aloc.blindagem);
    const partes: Parte[] = [
      `Oxygen: ${antes.oxigenio} → ${e.oxigenio}   (+${aloc.suporte * R.oxigenioPorBateria} from Life Support, −${R.oxigenioPorNoite} breathing)`,
      d.nivel === 0
        ? `Radiation was calm. Crew health −${R.dosePorNoite}: a little radiation is always there.`
        : faltou === 0
          ? `The shield held against the storm! Crew health −${R.dosePorNoite} only.`
          : `The shield was ${faltou} batter${faltou > 1 ? 'ies' : 'y'} short. Crew health ${100 - antes.dose} → ${100 - e.dose}.`,
      `Rocket: ${antes.meta}% → ${e.meta}%`,
    ];
    if (naEnfermaria(e) > naEnfermaria(antes)) {
      partes.push({ texto: 'An astronaut got too much radiation and went to the infirmary. Tomorrow you have one battery less.', cor: '#fca5a5', negrito: true });
    }
    if (e.meta >= 100 && !this.res) partes.push({ texto: 'The rocket is ready! Now keep the crew safe until launch day.', cor: '#fde68a' });
    partes.push(
      { texto: `Real NASA data: on ${dataBonita(d.data)}, the LRO spacecraft measured ${d.doseMedia} µGy/h on average near the Moon (highest: ${d.dosePico}). A calm day was about ${DOSE_CALMA}.`, cor: '#86efac', tamanho: 15 },
      { texto: `Did you know? ${d.fato}`, cor: '#bfdbfe', tamanho: 15 },
    );
    this.abrirPainel(`Night ${antes.dia}`, partes, [
      { texto: this.res ? 'See result' : 'Sleep until morning', acao: () => this.dormir(), principal: true },
    ]);
  }

  private painelFim() {
    const e = this.estado;
    const textos: Record<Exclude<Resultado, null>, [string, string, string]> = {
      vitoria: ['Launch! The rocket is on its way to Mars.', 'Your crew made it through a real solar storm and launched on time.', '#86efac'],
      'sem-oxigenio': ['Out of oxygen', 'The base ran out of oxygen. Mission Control called the crew back to Earth.', '#fca5a5'],
      radiacao: ['Too much radiation', 'The crew got too much radiation. Mission Control called them back to Earth.', '#fca5a5'],
      'foguete-incompleto': ['The rocket was not ready', `Launch day came and the rocket was ${e.meta}% built. The launch window closed.`, '#fca5a5'],
    };
    const [titulo, texto, cor] = textos[this.res ?? 'foguete-incompleto'];
    const mostrar = () => this.abrirPainel(titulo, [
      texto,
      { texto: `Score: ${pontuacao(e)} of 300  (oxygen ${e.oxigenio} + crew health ${100 - e.dose} + rocket ${e.meta})`, cor: '#f8fafc', negrito: true },
      { texto: 'What you learned', cor: '#93c5fd', negrito: true },
      '• Every battery has a cost: power for the rocket is power not used for oxygen or the shield.',
      '• Solar storms send fast particles. The Moon has no thick air and no magnetic field, so a base needs a shield.',
      '• Flares and CMEs are warnings: scientists watch the Sun to know when particles may come.',
      ...(this.res === 'vitoria' ? [{ texto: 'Chapter 2, the trip to Mars, is coming next.', cor: '#94a3b8', tamanho: 14 }] : []),
    ], [
      { texto: 'Real NASA data', acao: () => this.abrirDados() },
      { texto: 'Play again', acao: () => this.reiniciar(), principal: true },
    ], cor);

    if (this.res === 'vitoria' && !this.lancado) {
      this.lancado = true;
      this.particulas.stop();
      const chama = this.add.graphics().setDepth(this.foguete.depth - 1);
      this.tweens.add({
        targets: this.foguete,
        y: -this.T * ALTURA_FOGUETE * 1.2,
        duration: 2600,
        ease: 'Quad.in',
        onUpdate: () => {
          this.desenharFoguete(100);
          this.mascara.clear().fillStyle(0xffffff).fillRect(0, this.foguete.y - this.T * ALTURA_FOGUETE, this.scale.width, this.T * (ALTURA_FOGUETE + 1));
          chama.clear().fillStyle(0xfb923c, 0.9).fillTriangle(this.foguete.x - this.T * 0.4, this.foguete.y, this.foguete.x + this.T * 0.4, this.foguete.y, this.foguete.x, this.foguete.y + this.T * 1.6);
          chama.fillStyle(0xfde047).fillTriangle(this.foguete.x - this.T * 0.2, this.foguete.y, this.foguete.x + this.T * 0.2, this.foguete.y, this.foguete.x, this.foguete.y + this.T * 0.9);
        },
        onComplete: () => {
          chama.destroy();
          if (this.fase === 'fim') mostrar();
        },
      });
      return;
    }
    if (this.res === 'vitoria') this.foguete.setVisible(false);
    mostrar();
  }

  private painelDados() {
    this.abrirPainel('Real NASA data in this game', [
      'Each day of the Moon chapter is a real day from May 2024. The radiation level comes from the dose measured by the CRaTER instrument on NASA\'s Lunar Reconnaissance Orbiter (LRO), in orbit around the Moon.',
      ...lua.dias.map((d) => ({
        texto: `${dataBonita(d.data)}: ${d.doseMedia} µGy/h average, highest ${d.dosePico}  →  ${NIVEIS[d.nivel].nome}`,
        cor: NIVEIS[d.nivel].cor, tamanho: 14,
      })),
      { texto: 'Sources (click to open):', cor: '#94a3b8', tamanho: 14 },
      ...lua.fontes.map((f) => ({ texto: f.nome, link: f.url, tamanho: 14 })),
      { texto: 'LRO measures in lunar orbit, not on the ground. Oxygen, batteries and the rocket are simple models for learning, not measurements.', cor: '#94a3b8', tamanho: 13 },
    ], [
      { texto: 'Back', acao: () => { this.fase = this.faseAntesDosDados; this.mostrarFase(); }, principal: true },
    ]);
  }
}
