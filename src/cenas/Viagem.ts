// Generated with AI assistance. See README, "Use of AI tools".
// The trip to Mars between chapters, as two short animations over the game:
//   'partida'  after the rocket lifts off the Moon (Superficie.decolar): the solar system, the
//              transfer path from the Earth-Moon system to Mars, and the ship setting out on it.
//   'chegada'  at the end of chapter 2: the ship finishes the path, Mars grows from a dot into
//              a live globe (planetaShader.ts), and the ship fires its engine to enter orbit.
// Planet positions are real for the dates (engine/astro.ts). The path is a simplified transfer
// arc (it bends out from Earth's orbit to Mars's), not a computed trajectory.
import Phaser from 'phaser';
import viagem from '../dados/viagem.json';
import { PLANETAS, posicao } from '../engine/astro';
import { criarPlaneta, diametroPlaneta } from './planetaShader';
import { fonte, dataBonita } from './sessao';
import { movimentoReduzido } from '../video';

export type DadosViagem = { etapa: 'partida' | 'chegada'; aoTerminar: () => void };

const PARTIDA = Date.parse('2024-05-13T12:00:00Z');   // chapter 2 starts (capitulos.ts)
const DIAS_REAIS = 259;                               // a typical Earth-Mars transfer, ~8.5 months
const ACHATAR = 0.6;                                  // the solar system is drawn tilted, like Espaco
const AU_TELA = 1.75;                                 // the view fits out to Mars's orbit
const terra = PLANETAS.find((p) => p.nome === 'Earth')!;
const marte = PLANETAS.find((p) => p.nome === 'Mars')!;

type Ponto = { x: number; y: number };

export class Viagem extends Phaser.Scene {
  private d!: DadosViagem;
  private t = 0;
  private g!: Phaser.GameObjects.Graphics;
  private chama!: Phaser.GameObjects.Graphics;
  private nave!: Phaser.GameObjects.Image;
  private terraP!: ReturnType<typeof criarPlaneta>;
  private marteP!: ReturnType<typeof criarPlaneta>;
  private sol!: Phaser.GameObjects.Image;
  private titulo!: Phaser.GameObjects.Text;
  private nomeTerra!: Phaser.GameObjects.Text;
  private nomeMarte!: Phaser.GameObjects.Text;
  private legenda!: Phaser.GameObjects.Text;
  private caminho: Ponto[] = [];      // transfer arc in AU, from Earth (0) to Mars (1)
  private terminou = false;

  constructor() {
    super({ key: 'Viagem' });
  }

  init(d: DadosViagem) {
    this.d = d;
    this.t = 0;
    this.terminou = false;
  }

  preload() {
    viagem.nave.direcoes.forEach((n, k) => this.load.image(`nave_d${k}`, n.arquivo));
    this.load.image('planeta_terra', 'lua/planetas/terra.png');
    this.load.image('planeta_marte', 'lua/planetas/marte.png');
    this.load.image('planeta_sol', 'lua/planetas/sol.png');
    this.load.image('ceu', 'lua/sky.jpg');
  }

  // Ecliptic AU -> screen px (Sun at the center, tilted like the solar system view).
  private tela(p: Ponto): Ponto {
    const W = this.scale.width, H = this.scale.height;
    const k = (0.46 * Math.min(W, H)) / AU_TELA;
    return { x: W / 2 + p.x * k, y: H / 2 - p.y * k * ACHATAR };
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const ceu = this.add.image(W / 2, H / 2, 'ceu');
    ceu.setScale(Math.max(W / ceu.width, H / ceu.height));
    this.add.rectangle(0, 0, W, H, 0x020617, 0.35).setOrigin(0);

    // Earth when the ship leaves, Mars when it arrives (real positions), and a path between them
    // that grows from Earth's orbit radius to Mars's while turning the short way around the Sun.
    const e0 = posicao(terra, PARTIDA), m1 = posicao(marte, PARTIDA + DIAS_REAIS * 86400000);
    const a0 = Math.atan2(e0.y, e0.x);
    let da = Math.atan2(m1.y, m1.x) - a0;
    while (da <= 0) da += 2 * Math.PI;
    if (da > 1.6 * Math.PI) da -= 2 * Math.PI;
    this.caminho = Array.from({ length: 121 }, (_, i) => {
      const s = i / 120;
      const r = e0.r + (m1.r - e0.r) * (0.5 - 0.5 * Math.cos(Math.PI * s));
      const a = a0 + da * s;
      return { x: r * Math.cos(a), y: r * Math.sin(a) };
    });

    this.g = this.add.graphics();
    const sp = this.tela({ x: 0, y: 0 });
    this.sol = this.add.image(sp.x, sp.y, 'planeta_sol').setScale((22 * 4) / 512);
    this.terraP = criarPlaneta(this, 0, 0, { textura: 'planeta_terra', atmos: 0x93c5fd, atmosForca: 0.55 });
    this.marteP = criarPlaneta(this, 0, 0, { textura: 'planeta_marte', atmos: 0xfdba74, atmosForca: 0.35 });
    // Layers: sky 0, path 1, Sun and planets 2..5, ship 6 (or 3, behind Mars at the far side
    // of its orbit), labels 10.
    this.g.setDepth(1);
    this.sol.setDepth(2); this.terraP.setDepth(5); this.marteP.setDepth(4);
    this.chama = this.add.graphics().setBlendMode(Phaser.BlendModes.ADD).setDepth(6);
    this.nave = this.add.image(0, 0, 'nave_d0').setDepth(6);
    const rotulo = (s: string, cor: string) => this.add.text(0, 0, s, fonte(13, cor, { fontStyle: 'bold', stroke: '#020617', strokeThickness: 4 })).setOrigin(0.5, 0).setDepth(10);
    this.nomeTerra = rotulo('Earth + Moon', '#93c5fd');
    this.nomeMarte = rotulo('Mars', '#fdba74');

    this.titulo = this.add.text(W / 2, 28, '', fonte(22, '#f8fafc', { fontStyle: 'bold', stroke: '#020617', strokeThickness: 5 })).setOrigin(0.5, 0).setDepth(10);
    this.legenda = this.add.text(W / 2, H - 22, '', fonte(14, '#cbd5e1', { align: 'center', stroke: '#020617', strokeThickness: 4, wordWrap: { width: W - 40 } })).setOrigin(0.5, 1).setDepth(10);
    this.cameras.main.fadeIn(500, 2, 6, 23);
  }

  // Position and heading of the ship at s (0 = Earth, 1 = Mars) along the path, on screen.
  private naveEm(s: number) {
    const i = Phaser.Math.Clamp(s * 120, 0, 119.999);
    const a = this.caminho[Math.floor(i)], b = this.caminho[Math.floor(i) + 1];
    const f = i - Math.floor(i);
    const p = this.tela({ x: a.x + (b.x - a.x) * f, y: a.y + (b.y - a.y) * f });
    const pa = this.tela(a), pb = this.tela(b);
    return { ...p, rumo: Math.atan2(-(pb.y - pa.y), pb.x - pa.x) };   // counterclockwise from screen right
  }

  // The ship picture for a heading, centered, with its engine flame behind it.
  private desenharNave(x: number, y: number, rumo: number, escala: number, empuxo: number) {
    const k = ((Math.round(rumo / (Math.PI / 8)) % 16) + 16) % 16;
    const n = viagem.nave.direcoes[k];
    this.nave.setTexture(`nave_d${k}`).setOrigin(n.centro[0] / n.w, n.centro[1] / n.h).setPosition(x, y).setScale(escala);
    const c = this.chama.clear();
    if (empuxo <= 0) return;
    // Flame out of the engine, behind the ship (squashed like the view), flickering.
    const ux = -Math.cos(rumo), uy = Math.sin(rumo) * ACHATAR;
    const L = Math.hypot(ux, uy) || 1;
    const bx = x + (ux / L) * viagem.nave.motorUnidades * viagem.nave.pxPorUnidade * escala;
    const by = y + (uy / L) * viagem.nave.motorUnidades * viagem.nave.pxPorUnidade * escala;
    const comp = (26 + 16 * empuxo) * escala * Phaser.Math.FloatBetween(0.85, 1.15);
    const lx = -uy / L, ly = ux / L, w = 9 * escala;
    c.fillStyle(0xfb923c, 0.85).fillTriangle(bx + lx * w, by + ly * w, bx - lx * w, by - ly * w, bx + (ux / L) * comp, by + (uy / L) * comp);
    c.fillStyle(0xfde68a, 0.95).fillTriangle(bx + lx * w * 0.5, by + ly * w * 0.5, bx - lx * w * 0.5, by - ly * w * 0.5, bx + (ux / L) * comp * 0.55, by + (uy / L) * comp * 0.55);
  }

  update(_t: number, dtMs: number) {
    const W = this.scale.width, H = this.scale.height;
    const lento = movimentoReduzido();
    const dur = this.d.etapa === 'partida' ? 6 : 8;
    this.t = Math.min(1, this.t + dtMs / 1000 / (lento ? dur / 3 : dur));
    const t = this.t;

    // Path: dashed ahead, solid behind the ship.
    const s = this.d.etapa === 'partida' ? 0.35 * (0.5 - 0.5 * Math.cos(Math.PI * t))
      : 0.35 + 0.65 * Math.min(1, t / 0.55) ** 0.8;
    const zoom = this.d.etapa === 'chegada' ? Phaser.Math.Easing.Cubic.InOut(Phaser.Math.Clamp((t - 0.5) / 0.4, 0, 1)) : 0;
    const g = this.g.clear();
    const vis = 1 - Math.min(1, zoom * 2.5);       // the wide view fades early as Mars closes in
    g.lineStyle(1, 0x94a3b8, 0.3 * vis);
    for (const p of [terra, marte]) {
      const pts = Array.from({ length: 97 }, (_, i) => {
        const a = (i / 96) * Math.PI * 2;
        return this.tela({ x: Math.cos(a) * p.a, y: Math.sin(a) * p.a });
      });
      g.strokePoints(pts, false);
    }
    for (let i = 0; i < 120; i++) {
      const a = this.tela(this.caminho[i]), b = this.tela(this.caminho[i + 1]);
      if (i / 120 < s) g.lineStyle(2, 0xfbbf24, 0.9 * vis).lineBetween(a.x, a.y, b.x, b.y);
      else if (i % 2 === 0) g.lineStyle(1.5, 0xfbbf24, 0.45 * vis).lineBetween(a.x, a.y, b.x, b.y);
    }

    // Planets where they are on today's date along the trip (real positions).
    const dia = PARTIDA + s * DIAS_REAIS * 86400000;
    const te = posicao(terra, dia), tm = posicao(marte, dia);
    const pe = this.tela(te), pm = this.tela(tm), sp = this.tela({ x: 0, y: 0 });
    this.sol.setPosition(sp.x, sp.y).setAlpha(vis);
    this.terraP.setSolTela(sp.x - pe.x, sp.y - pe.y);
    this.terraP.setGiro(t * 360);
    this.terraP.setPosition(pe.x, pe.y).setScale(22 / diametroPlaneta(1)).setVisible(vis > 0.05);
    this.nomeTerra.setPosition(pe.x, pe.y + 14).setAlpha(vis);
    // Mars: a dot on its orbit, then the camera closes in until it fills the middle of the screen.
    const grande = { x: W / 2, y: H * 0.5 }, dGrande = 0.62 * Math.min(W, H);
    const dm = Phaser.Math.Linear(15, dGrande, zoom);
    this.marteP.setSolTela(Phaser.Math.Linear(sp.x - pm.x, -1, zoom), Phaser.Math.Linear(sp.y - pm.y, -0.3, zoom));
    this.marteP.setGiro(20 + t * 40);
    this.marteP.setPosition(Phaser.Math.Linear(pm.x, grande.x, zoom), Phaser.Math.Linear(pm.y, grande.y, zoom))
      .setScale(dm / diametroPlaneta(1));
    this.nomeMarte.setPosition(pm.x, pm.y + 12).setAlpha(vis);

    // Ship: rides the path; at Mars it swings in front of the globe and brakes into orbit.
    const n = this.naveEm(Math.min(s, 0.999));
    if (zoom <= 0) {
      this.desenharNave(n.x, n.y, n.rumo, 0.3, this.d.etapa === 'partida' ? 1 : 0.4);
    } else {
      const k = Phaser.Math.Clamp((t - 0.5) / 0.5, 0, 1);
      const a = Math.PI * (1.15 - 0.55 * k);                    // part of an orbit around Mars
      const r = dm * (0.62 + 0.08 * (1 - k));
      const x = grande.x + Math.cos(a) * r, y = grande.y - Math.sin(a) * r * ACHATAR;
      const rumo = Math.atan2(Math.cos(a) * ACHATAR, Math.sin(a));   // tangent, moving clockwise
      // Orbit insertion: the ship turns around and fires its engine against its motion.
      const queima = t > 0.7 && t < 0.92;
      this.desenharNave(x, y, queima ? rumo + Math.PI : rumo, Phaser.Math.Linear(0.3, 0.55, zoom), queima ? 1.2 : 0);
      // Behind the globe on the far side of the orbit (Mars is at depth 4).
      const atras = Math.sin(a) > 0.35;
      this.nave.setDepth(atras ? 3 : 6); this.chama.setDepth(atras ? 3 : 6);
    }

    // Words: where we are, the date, and what is real.
    this.titulo.setText(this.d.etapa === 'partida' ? 'Off to Mars!' : t < 0.55 ? 'Almost there...' : t < 0.92 ? 'Braking into orbit around Mars' : 'Welcome to Mars');
    this.legenda.setText(`${dataBonita(dia)} · day ${Math.round(s * DIAS_REAIS)} of a real ${DIAS_REAIS}-day trip (the game shortens it to 5 days)\n` +
      (zoom > 0 ? 'No air to slow down in space: the ship turns around and fires its engine against its motion.'
        : 'The ship coasts most of the way: its engine only fires to leave and to arrive.'));

    if (t >= 1 && !this.terminou) {
      this.terminou = true;
      this.cameras.main.fadeOut(600, 2, 6, 23);
      this.cameras.main.once('camerafadeoutcomplete', () => { this.d.aoTerminar(); this.scene.stop(); });
    }
  }
}
