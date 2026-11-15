// Generated with AI assistance. See README, "Use of AI tools".
// The trip to Mars between chapters, as two short animations over the game:
//   'partida'  after the rocket lifts off the Moon (Superficie.decolar): the solar system, the
//              transfer path from the Earth-Moon system to Mars, and the ship setting out on it.
//   'chegada'  at the end of chapter 2: the ship finishes the path, Mars grows from a dot into
//              a live globe (planetaShader.ts), and the ship fires its engine to enter orbit.
//              Then the landing: the camera dives to Jezero crater and the lander comes down
//              through the air of Mars (heat shield, parachute, rockets), seen from the side.
// Planet positions are real for the dates (engine/astro.ts). The path is a simplified transfer
// arc (it bends out from Earth's orbit to Mars's), not a computed trajectory.
import Phaser from 'phaser';
import viagem from '../dados/viagem.json';
import { PLANETAS, posicao } from '../engine/astro';
import { criarPlaneta, diametroPlaneta, giroOlhando, pontoNoPlaneta } from './planetaShader';
import { COR_MARTE, JEZERO, desenharPaisagemMarte } from './marte';
import { fonte, dataBonita } from './sessao';
import { movimentoReduzido } from '../video';

export type DadosViagem = { etapa: 'partida' | 'chegada'; aoTerminar: () => void };

import { PARTIDA, DIAS_REAIS, caminhoTransferencia } from './transferencia';
const ACHATAR = 0.6;                                  // the solar system is drawn tilted, like Espaco
const AU_TELA = 1.75;                                 // the view fits out to Mars's orbit
const terra = PLANETAS.find((p) => p.nome === 'Earth')!;
const marte = PLANETAS.find((p) => p.nome === 'Mars')!;
const POUSO_S = 12;                                   // the landing, seconds (reduced motion: a third)
const CONTORNO = COR_MARTE.contorno;

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
  private pouso: number | null = null;  // 0..1 once the landing has started
  private descida!: Phaser.GameObjects.Graphics;
  private fogo!: Phaser.GameObjects.Graphics;

  constructor() {
    super({ key: 'Viagem' });
  }

  init(d: DadosViagem) {
    this.d = d;
    this.t = 0;
    this.terminou = false;
    this.pouso = null;
  }

  preload() {
    viagem.nave.direcoes.forEach((n, k) => this.load.image(`nave_d${k}`, n.arquivo));
    this.load.image('planeta_terra', 'lua/planetas/terra.png');
    this.load.image('planeta_marte', 'lua/planetas/marte.png');
    this.load.image('planeta_sol', 'lua/planetas/sol.png');
    this.load.image('ceu_sistema', 'lua/sky_sistema.jpg');   // the real sky seen looking down on the planets (make_ceu.py)
  }

  // Ecliptic AU -> screen px (Sun at the center, tilted like the solar system view).
  private tela(p: Ponto): Ponto {
    const W = this.scale.width, H = this.scale.height;
    const k = (0.46 * Math.min(W, H)) / AU_TELA;
    return { x: W / 2 + p.x * k, y: H / 2 - p.y * k * ACHATAR };
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    const ceu = this.add.image(W / 2, H / 2, 'ceu_sistema');
    ceu.setScale(Math.max(W / ceu.width, H / ceu.height));
    this.add.rectangle(0, 0, W, H, 0x020617, 0.35).setOrigin(0);

    // Earth when the ship leaves, Mars when it arrives (real positions), and a path between them
    // that grows from Earth's orbit radius to Mars's while turning the short way around the Sun.
    this.caminho = caminhoTransferencia();

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
    this.descida = this.add.graphics().setDepth(8).setVisible(false);
    this.fogo = this.add.graphics().setDepth(9).setBlendMode(Phaser.BlendModes.ADD);
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
    if (this.pouso !== null) { this.atualizarPouso(dtMs / 1000 / (lento ? POUSO_S / 3 : POUSO_S)); return; }
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
    this.legenda.setText(`${dataBonita(dia)} · day ${Math.round(s * DIAS_REAIS)} of a real ${Math.round(DIAS_REAIS)}-day trip (the game shortens it to 5 days)\n` +
      (zoom > 0 ? 'No air to slow down in space: the ship turns around and fires its engine against its motion.'
        : 'The ship coasts most of the way: its engine only fires to leave and to arrive.'));

    if (t >= 1 && this.d.etapa === 'chegada') { this.pouso = 0; return; }
    if (t >= 1 && !this.terminou) {
      this.terminou = true;
      this.cameras.main.fadeOut(600, 2, 6, 23);
      this.cameras.main.once('camerafadeoutcomplete', () => { this.d.aoTerminar(); this.scene.stop(); });
    }
  }

  // ---------- The landing ----------

  // A shape given in lander units (x right, y down), turned by `ang` and placed at (x, y).
  private forma(pts: number[][], x: number, y: number, k: number, ang: number) {
    const c = Math.cos(ang), s = Math.sin(ang);
    return pts.map(([a, b]) => ({ x: x + (a * c - b * s) * k, y: y + (a * s + b * c) * k }));
  }

  private atualizarPouso(dp: number) {
    const W = this.scale.width, H = this.scale.height, M = Math.min(W, H);
    const u = Phaser.Math.Clamp(M / 650, 0.7, 1.5);
    this.pouso = Math.min(1, (this.pouso ?? 0) + dp);
    const p = this.pouso;
    this.g.clear();
    this.sol.setVisible(false); this.terraP.setVisible(false);
    this.nomeTerra.setVisible(false); this.nomeMarte.setVisible(false);
    this.nave.setVisible(false); this.chama.clear();

    // 1. From orbit the camera dives to Jezero crater: Mars grows until its ground fills the screen.
    const a = Phaser.Math.Easing.Cubic.In(Phaser.Math.Clamp(p / 0.27, 0, 1));
    const D = Math.exp(Phaser.Math.Linear(Math.log(0.62 * M), Math.log(14 * M), a));
    const giro = Phaser.Math.Linear(60, giroOlhando(JEZERO.lon) - 12, Phaser.Math.Easing.Sine.InOut(Math.min(1, p / 0.15)));
    const pino = pontoNoPlaneta(JEZERO.lat, JEZERO.lon, giro);
    const segue = Math.min(1, p / 0.15);
    this.marteP.setPosition(W / 2 - pino.x * (D / 2) * segue, H / 2 - pino.y * (D / 2) * segue).setScale(D / diametroPlaneta(1));
    this.marteP.setGiro(giro);
    this.marteP.setSolTela(-1, Phaser.Math.Linear(-0.3, 0.5, segue));
    const g = this.descida;
    const f = this.fogo.clear();
    if (p < 0.25) {
      g.setVisible(false);
      const bx = W / 2 + pino.x * (D / 2) * (1 - segue), by = H / 2 + pino.y * (D / 2) * (1 - segue);
      this.g.fillStyle(0xf97316).fillCircle(bx, by - 18, 6).fillTriangle(bx - 4, by - 14, bx + 4, by - 14, bx, by);
      this.g.lineStyle(2, CONTORNO).strokeCircle(bx, by - 18, 6);
      this.titulo.setText('Heading down to Jezero crater');
      this.legenda.setText(`The lander leaves the ship in orbit and aims for ${JEZERO.nome}, an old lake bed where NASA's Perseverance rover landed in 2021.`);
      return;
    }

    // 2. Seen from the side: the lander falls through the sky of Mars as the ground comes up.
    g.setVisible(true).setAlpha(Phaser.Math.Clamp((p - 0.25) / 0.05, 0, 1)).clear();
    const q = (p - 0.25) / 0.75;                                   // 0..1 of the descent
    const hz = H * Phaser.Math.Linear(1.35, 0.5, Phaser.Math.Easing.Sine.Out(Math.min(1, q / 0.75)));
    desenharPaisagemMarte(g, W, H, hz, u, { x: 0.82, y: 0.3 });
    const solo = hz + 30 * u + (H - hz - 30 * u) * 0.45;           // where the lander touches down
    const k = 34 * u;                                              // lander size
    const t = this.time.now / 1000;
    const x = W * Phaser.Math.Linear(0.3, 0.5, Math.min(1, q / 0.6));
    const altura = q < 0.62 ? H * 0.38 : Phaser.Math.Linear(H * 0.38, solo - 0.45 * k, Phaser.Math.Easing.Sine.InOut(Math.min(1, (q - 0.62) / 0.3)));
    const y = q < 0.62 ? altura + Math.sin(t * 3) * 3 * u : altura;
    const balanco = q > 0.3 && q < 0.62 ? Math.sin(t * 2.2) * 0.12 : 0;
    const inclina = q < 0.3 ? -0.35 : balanco;

    // Entry: the heat shield glows, hot air streams behind.
    const chamas = (fx: number, fy: number, comp: number) => {
      const l = comp * Phaser.Math.FloatBetween(0.85, 1.15);
      f.fillStyle(0xfb923c, 0.85).fillTriangle(fx - 6 * u, fy, fx + 6 * u, fy, fx, fy + l);
      f.fillStyle(0xfde68a, 0.95).fillTriangle(fx - 3 * u, fy, fx + 3 * u, fy, fx, fy + l * 0.55);
    };
    if (q < 0.32) {
      const brasa = Math.sin(Math.min(1, q / 0.3) * Math.PI);
      f.fillStyle(0xf97316, 0.55 * brasa).fillPoints(this.forma([[-1.3, 0.1], [1.3, 0.1], [0, 1.0]], x, y, k, inclina), true);
      f.fillStyle(0xfde68a, 0.6 * brasa).fillPoints(this.forma([[-1.1, 0.15], [1.1, 0.15], [0, 0.6]], x, y, k, inclina), true);
      for (let i = 0; i < 7; i++) {
        const o = ((t * 3 + i * 0.37) % 1);
        const px = x + (i - 3) * 0.32 * k - o * 3.5 * k, py = y - 0.2 * k - o * 5 * k;   // the wake trails behind, up and left
        f.lineStyle(3 * u, 0xfdba74, 0.6 * brasa * (1 - o)).lineBetween(px, py, px - 0.9 * k, py - 1.3 * k);
      }
    }
    // Parachute (red and white, like Perseverance's), from opening until the lander lets go.
    const corte = Phaser.Math.Clamp((q - 0.62) / 0.2, 0, 1);       // chute and backshell fly off
    if (q > 0.3 && corte < 1) {
      const abre = Phaser.Math.Easing.Back.Out(Math.min(1, (q - 0.3) / 0.06));
      const cx = x + corte * -3 * k, cy = y - 3.6 * k - corte * 4 * k;
      const R = 1.9 * k * abre;
      for (let i = 0; i < 8; i++) {
        const a0 = Math.PI + (i / 8) * Math.PI, a1 = Math.PI + ((i + 1) / 8) * Math.PI;
        g.fillStyle(i % 2 ? 0xffffff : 0xdc2626, 1 - corte).slice(cx, cy, R, a0, a1, false).fillPath();
      }
      g.lineStyle(2 * u, CONTORNO, 1 - corte).beginPath().arc(cx, cy, R, Math.PI, 0).strokePath();
      const topo = this.forma([[-0.45, -0.75], [0.45, -0.75]], x + corte * -3 * k, y - corte * 4 * k, k, inclina);
      g.lineStyle(1.2 * u, 0xf8fafc, 0.8 * (1 - corte)).lineBetween(cx - R, cy, topo[0].x, topo[0].y).lineBetween(cx + R, cy, topo[1].x, topo[1].y);
      // The backshell rides with the chute.
      g.fillStyle(0xe5e7eb, 1 - corte).fillPoints(this.forma([[-0.95, 0], [-0.45, -0.75], [0.45, -0.75], [0.95, 0]], x + corte * -3 * k, y - corte * 4 * k, k, inclina), true);
    }
    if (q <= 0.3) g.fillStyle(0xe5e7eb).fillPoints(this.forma([[-0.95, 0], [-0.45, -0.75], [0.45, -0.75], [0.95, 0]], x, y, k, inclina), true);
    // Heat shield: on until the chute has slowed the lander, then it drops away.
    const solta = Phaser.Math.Clamp((q - 0.42) / 0.15, 0, 1);
    if (solta < 1) {
      g.fillStyle(0x7c2d12, 1 - solta).fillPoints(this.forma([[-1, 0], [1, 0], [0, 0.35]], x, y + solta * solta * 4 * k, k, inclina), true);
      g.lineStyle(2 * u, CONTORNO, 1 - solta).strokePoints(this.forma([[-1, 0], [1, 0], [0, 0.35]], x, y + solta * solta * 4 * k, k, inclina), true);
    }
    // The lander itself (gold foil, legs out), seen once the heat shield is gone.
    if (q > 0.42) {
      g.fillStyle(0xfbbf24).fillPoints(this.forma([[-0.6, -0.55], [0.6, -0.55], [0.7, 0], [-0.7, 0]], x, y, k, inclina), true);
      g.lineStyle(2 * u, CONTORNO).strokePoints(this.forma([[-0.6, -0.55], [0.6, -0.55], [0.7, 0], [-0.7, 0]], x, y, k, inclina), true);
      const pernas = this.forma([[-0.5, 0], [-0.95, 0.45], [0.5, 0], [0.95, 0.45]], x, y, k, inclina);
      g.lineStyle(3 * u, CONTORNO).lineBetween(pernas[0].x, pernas[0].y, pernas[1].x, pernas[1].y).lineBetween(pernas[2].x, pernas[2].y, pernas[3].x, pernas[3].y);
      g.fillStyle(0x334155).fillRect(x - 0.15 * k, y - 0.4 * k, 0.3 * k, 0.2 * k);
    }
    // Rockets for the last part, and the dust they blow up near the ground.
    const queima = q > 0.6 && q < 0.93;
    if (queima) {
      chamas(x - 0.35 * k, y + 0.05 * k, 1.1 * k);
      chamas(x + 0.35 * k, y + 0.05 * k, 1.1 * k);
      const perto = Phaser.Math.Clamp(1 - (solo - y) / (2.5 * k), 0, 1);
      for (let i = 0; i < 10; i++) {
        const o = (t * 1.6 + i * 0.1) % 1;
        const lado = i % 2 ? 1 : -1;
        g.fillStyle(0xc98a5e, 0.55 * perto * (1 - o)).fillCircle(x + lado * (0.4 + o * 2.4) * k, solo - o * 0.5 * k, (0.25 + o * 0.6) * k);
      }
    }

    const fase = q < 0.3 ? 0 : q < 0.6 ? 1 : q < 0.93 ? 2 : 3;
    this.titulo.setText(['Entry: through the air of Mars', 'Parachute out!', 'Rockets for the last part', 'Touchdown! Welcome to Jezero crater'][fase]);
    this.legenda.setText([
      'Mars has air, thin (about 1% of Earth\'s). Rushing through it at 20,000 km/h heats the shield to about 1,300 °C and does most of the braking.',
      'A parachute is useless on the Moon, where there is no air. On Mars it slows the lander from about 1,500 km/h to about 300 km/h.',
      'The air is too thin to land on a parachute alone, so the last part is rocket power, just like on the Moon.',
      'Seven minutes from the top of the air to the ground. A radio signal from Earth takes longer than that to arrive, so the lander does it all by itself.',
    ][fase]);

    if (p >= 1 && !this.terminou) {
      this.terminou = true;
      this.time.delayedCall(movimentoReduzido() ? 300 : 1400, () => {
        this.cameras.main.fadeOut(600, 2, 6, 23);
        this.cameras.main.once('camerafadeoutcomplete', () => { this.d.aoTerminar(); this.scene.stop(); });
      });
    }
  }
}
