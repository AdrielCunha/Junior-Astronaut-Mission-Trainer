// Generated with AI assistance. See README, "Use of AI tools".
// Zooming out from the Mars base (chapter 3), like the zoom out from the Moon base in chapter 1:
//   ground -> the Blender film of Mars (make_flight_marte.py: the map, Jezero crater, Isidis, the
//   globe; frames in public/marte/voo) -> Mars from orbit (live globe, planetaShader.ts, the same
//   picture as the film's last frame) with the base pin and the two moons going round -> the inner
//   solar system with Mars where it really is that day.
// Like the Moon's zoom, it moves between three stops (the ground, the globe, the solar system)
// and each push of the wheel or the buttons plays the whole flight to the next stop by itself
// (the film takes as long as the Moon's). Opening it flies from the ground to the globe.
// Opened over the map (paused); zooming back in to the ground, or Back, returns to it.
import Phaser from 'phaser';
import { PLANETAS, posicao } from '../engine/astro';
import { criarPlaneta, diametroPlaneta, giroOlhando, pontoNoPlaneta } from './planetaShader';
import { COR_MARTE, DIA_MARTE_MS, JEZERO } from './marte';
import { fonte, dataBonita, suave, DURACAO_FILME } from './sessao';
import { movimentoReduzido } from '../video';
import vooHD from '../dados/voo_marte.json';
import vooLeve from '../dados/voo_leve_marte.json';
import { LEVE } from './qualidade';

// The film (same layout as the Moon's voo.json): frame i was rendered at p[i] along the zoom.
const VOO = LEVE ? vooLeve : vooHD;
const quadroMarte = (i: number) => `marte/${LEVE ? 'voo_leve' : 'voo'}/f${String(i).padStart(2, '0')}.webp`;
const CEU_MARTE: [number, number][] = [[0, 0xd9ab80], [0.35, 0xc08d68], [0.7, 0x6e4c48], [1, 0x0b0f1e]];   // paleta_marte.json "ceu"

export type DadosMarteVista = { data: number; aoVoltar: () => void };

const ACHATAR = 0.6;                       // the solar system is drawn tilted, like Espaco
const terra = PLANETAS.find((p) => p.nome === 'Earth')!;
const marte = PLANETAS.find((p) => p.nome === 'Mars')!;
// Moons of Mars: orbit radius in Mars radii, period in hours (NASA fact sheets).
const LUAS = [
  { nome: 'Phobos', raio: 2.76, horas: 7.65, cor: 0xd6c3b0 },
  { nome: 'Deimos', raio: 6.92, horas: 30.3, cor: 0xe7d8c9 },
];
const LUZ_SEGUNDOS_AU = 499;               // light (and radio) takes 499 s to cross 1 AU

export class MarteVista extends Phaser.Scene {
  private d!: DadosMarteVista;
  private z = 0;                           // 0 ground, 1 Mars filling a third of the screen, 2 solar system
  private parada = 1;                      // the stop the view is at or flying to
  private voo: { de: number; para: number; t: number; dur: number } | null = null;
  private empurrao = 0;                    // wheel pushes add up, like sessao.zoom
  private horas = 0;                       // simulated hours since the view opened
  private giroExtra = 0;
  private saindo = false;
  private conteudo: Phaser.GameObjects.GameObject[] = [];
  private ceu!: Phaser.GameObjects.Image;
  private marteP!: ReturnType<typeof criarPlaneta>;
  private terraP!: ReturnType<typeof criarPlaneta>;
  private sol!: Phaser.GameObjects.Image;
  private atras!: Phaser.GameObjects.Graphics;   // under Mars: orbits, moons on the far side
  private frente!: Phaser.GameObjects.Graphics;  // over Mars: moons on the near side, the pin
  private rotulos = new Map<string, Phaser.GameObjects.Text>();
  private legenda!: Phaser.GameObjects.Text;
  private cobertura!: Phaser.GameObjects.Rectangle;
  private quadro!: Phaser.GameObjects.Image;          // current film frame
  private quadro2!: Phaser.GameObjects.Image;         // the next one, fading in over it (as on the Moon)
  private ceuMarte!: Phaser.GameObjects.Rectangle;   // the sky of Mars behind the film, darker higher up

  constructor() {
    super({ key: 'MarteVista' });
  }

  init(d: DadosMarteVista) {
    this.d = d;
    this.z = 0; this.parada = 0; this.voo = null; this.empurrao = 0; this.horas = 0; this.giroExtra = 0; this.saindo = false;
    this.conteudo = [];
    this.rotulos.clear();
  }

  preload() {
    this.load.image('planeta_marte', 'lua/planetas/marte.png');
    this.load.image('planeta_terra', 'lua/planetas/terra.png');
    this.load.image('planeta_sol', 'lua/planetas/sol.png');
    this.load.image('ceu_sistema', 'lua/sky_sistema.jpg');   // the real sky seen looking down on the planets (make_ceu.py)
    for (let i = 0; i < VOO.quadros; i++) if (!this.textures.exists(`mv${i}`)) this.load.image(`mv${i}`, quadroMarte(i));
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.ceu = this.add.image(W / 2, H / 2, 'ceu_sistema');
    this.ceu.setScale(Math.max(W / this.ceu.width, H / this.ceu.height));
    this.ceuMarte = this.add.rectangle(0, 0, W, H, CEU_MARTE[0][1]).setOrigin(0);
    const veu = this.add.rectangle(0, 0, W, H, 0x020617, 0.3).setOrigin(0);
    this.atras = this.add.graphics();
    this.sol = this.add.image(0, 0, 'planeta_sol');
    this.terraP = criarPlaneta(this, 0, 0, { textura: 'planeta_terra', atmos: 0x93c5fd, atmosForca: 0.55 });
    this.marteP = criarPlaneta(this, 0, 0, { textura: 'planeta_marte', atmos: 0xfdba74, atmosForca: 0.35 });
    this.quadro = this.add.image(W / 2, H / 2, 'mv0');
    this.quadro2 = this.add.image(W / 2, H / 2, 'mv0').setVisible(false);
    this.frente = this.add.graphics();
    this.legenda = this.add.text(W / 2, H - 16, '', fonte(14, '#e2e8f0', { align: 'center', stroke: '#020617', strokeThickness: 4, wordWrap: { width: W - 260 } }))
      .setOrigin(0.5, 1);
    this.conteudo.push(this.ceu, this.ceuMarte, veu, this.atras, this.sol, this.terraP, this.marteP, this.quadro, this.quadro2, this.frente, this.legenda);

    // Controls, like the zoom buttons on the Moon.
    const botao = (x: number, y: number, s: string, acao: () => void, larga = false) => {
      const t = this.add.text(x, y, s, fonte(larga ? 15 : 22, '#ffffff', { fontStyle: 'bold', backgroundColor: larga ? '#2563eb' : '#334155', padding: { x: larga ? 14 : 12, y: larga ? 9 : 4 } }))
        .setOrigin(1, 0.5).setInteractive({ useHandCursor: true }).on('pointerdown', acao);
      this.conteudo.push(t);
      return t;
    };
    botao(W - 16, H / 2 - 30, '+', () => this.mudar(-1));
    botao(W - 16, H / 2 + 30, '−', () => this.mudar(1));
    botao(W - 16, H - 30, 'Back to base', () => this.voltar(), true);
    this.input.on('wheel', (_p: unknown, _o: unknown, _dx: number, dy: number) => {
      this.empurrao += dy * 0.0015;
      if (Math.abs(this.empurrao) > 0.3) { this.mudar(Math.sign(this.empurrao)); this.empurrao = 0; }
    });
    this.input.keyboard?.on('keydown-ESC', () => this.voltar());
    this.input.keyboard?.on('keydown-MINUS', () => this.mudar(1));
    this.input.keyboard?.on('keydown-PLUS', () => this.mudar(-1));
    this.voar(1);                                      // from the ground to the globe, by itself

    // In: the Mars ground color covers the base, then opens on Mars seen from just above.
    this.conteudo.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false));
    this.cobertura = this.add.rectangle(0, 0, W, H, COR_MARTE.chao, 0).setOrigin(0).setDepth(100);
    this.tweens.add({
      targets: this.cobertura, alpha: 1, duration: movimentoReduzido() ? 1 : 220,
      onComplete: () => {
        this.conteudo.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(true));
        this.tweens.add({ targets: this.cobertura, alpha: 0, duration: movimentoReduzido() ? 1 : 450 });
      },
    });
  }

  // One step out (+1) or in (-1). A flight in progress plays to its end first.
  private mudar(sentido: number) {
    if (this.saindo || this.voo) return;
    const proxima = this.parada + sentido;
    if (proxima < 0) { this.voltar(); return; }
    if (proxima > 2) return;
    this.voar(proxima);
  }

  // The whole flight to a stop: the film (ground <-> globe) takes as long as the Moon's.
  private voar(para: number) {
    const longe = Math.abs(para - this.z);
    const dur = movimentoReduzido() ? 0.3 : (Math.max(para, this.z) <= 1 ? DURACAO_FILME : 2.4) * Math.max(0.4, longe);
    this.parada = para;
    this.voo = { de: this.z, para, t: 0, dur };
  }

  // Out: the same cover, then the base again.
  private voltar() {
    if (this.saindo) return;
    this.saindo = true;
    this.voo = null;
    this.tweens.add({
      targets: this.cobertura, alpha: 1, duration: movimentoReduzido() ? 1 : 300,
      onComplete: () => {
        this.conteudo.forEach((o) => (o as unknown as Phaser.GameObjects.Components.Visible).setVisible(false));
        this.rotulos.forEach((t) => t.setVisible(false));
        this.tweens.add({
          targets: this.cobertura, alpha: 0, duration: movimentoReduzido() ? 1 : 300,
          onComplete: () => { this.d.aoVoltar(); this.scene.stop(); },
        });
      },
    });
  }

  private rotulo(id: string, x: number, y: number, s: string, cor: string, a: number) {
    let t = this.rotulos.get(id);
    if (!t) { t = this.add.text(0, 0, s, fonte(13, cor, { fontStyle: 'bold', stroke: '#020617', strokeThickness: 4 })).setOrigin(0.5, 0); this.rotulos.set(id, t); }
    t.setText(s).setPosition(x, y).setAlpha(a).setVisible(a > 0.01 && !this.saindo && this.cobertura.alpha < 1);
  }

  update(_t: number, dtMs: number) {
    const W = this.scale.width, H = this.scale.height, M = Math.min(W, H);
    const dt = dtMs / 1000;
    const lento = movimentoReduzido();
    this.empurrao *= Math.exp(-dt * 3);
    if (this.voo) {
      const v = this.voo;
      v.t = Math.min(1, v.t + dt / v.dur);
      this.z = v.de + (v.para - v.de) * (0.5 - 0.5 * Math.cos(Math.PI * v.t));   // ease in and out, like the Moon's film
      if (v.t >= 1) { this.voo = null; if (v.para === 0) this.voltar(); }
    }
    const z = Phaser.Math.Clamp(this.z, 0, 2);
    if (!lento) this.horas += dt;                       // one hour per second: the moons go round
    const w = Phaser.Math.Easing.Sine.InOut(Phaser.Math.Clamp(z - 1, 0, 1));   // 0 Mars, 1 solar system

    // Planets on the day of the chapter (real positions, AU).
    const t = this.d.data + this.horas * 3600000;
    const pm = posicao(marte, t), pe = posicao(terra, t);
    const kF = (0.44 * M) / 1.65;                           // px per AU when the whole view fits
    const k = Math.exp(Phaser.Math.Linear(Math.log(kF * 30), Math.log(kF), w));
    // Mars glides on screen from the middle to its place in the full view (Sun in the middle);
    // the map center follows from that, so Mars never runs off the screen while the scale changes.
    const fim = { x: W / 2 + pm.x * kF, y: H / 2 - pm.y * kF * ACHATAR };
    const ms = { x: W / 2 + (fim.x - W / 2) * w, y: H / 2 + (fim.y - H / 2) * w };
    const C = { x: pm.x - (ms.x - W / 2) / k, y: pm.y + (ms.y - H / 2) / (k * ACHATAR) };
    const tela = (p: { x: number; y: number }) => ({ x: W / 2 + (p.x - C.x) * k, y: H / 2 - (p.y - C.y) * k * ACHATAR });

    // Mars: from filling the screen (ground) to a globe, then a dot in the solar system.
    const zg = Phaser.Math.Clamp(z, 0, 1);
    const D = z <= 1 ? M * Math.exp(Phaser.Math.Linear(Math.log(9), Math.log(0.55), zg))
      : Math.exp(Phaser.Math.Linear(Math.log(0.55 * M), Math.log(26), w));
    if (!lento) this.giroExtra += dt * 6 * 15 * w;          // it turns in the wide view (6 h per second)
    const giro = giroOlhando(JEZERO.lon) - 12 + this.giroExtra;
    const pino = pontoNoPlaneta(JEZERO.lat, JEZERO.lon, giro);
    const segue = 1 - suave(0, 0.7, z);                     // near the ground the base stays centered
    const mc = tela(pm);
    const cx = mc.x - pino.x * (D / 2) * segue, cy = mc.y - pino.y * (D / 2) * segue;
    const sp = tela({ x: 0, y: 0 });
    // Light: from the front left over the globe, so the base is in daylight; from the real Sun
    // in the wide view.
    this.marteP.setPosition(cx, cy).setScale(D / diametroPlaneta(1));
    this.marteP.setGiro(giro);
    this.marteP.setSolTela(Phaser.Math.Linear(-1, sp.x - cx, w), Phaser.Math.Linear(0.5, sp.y - cy, w));

    // The film from the ground to the globe (z 0..1 is its p): show the frame rendered just
    // before p, shrunk to the current distance (never blend two frames: that ghosts). Near the
    // end it fades into the live globe, drawn underneath at the same size.
    let bf: { x: number; y: number } | null = null;
    const noFilme = z < 1;
    if (noFilme) {
      let i = 0;
      while (i < VOO.p.length - 1 && VOO.p[i + 1] <= z) i++;
      const esc = Math.max(W / VOO.w, H / VOO.h);
      // Never smaller than the screen (no dark rim at the edges), as on the Moon.
      const k = Math.max(Math.max(W / (VOO.w * VOO.margem), H / (VOO.h * VOO.margem)), esc * Math.pow(VOO.razao, -(z - VOO.p[i])));
      const fade = 1 - suave(0.975, 1, z);
      this.quadro.setTexture(`mv${i}`).setScale(k).setPosition(W / 2, H / 2).setAlpha(fade);
      const n = i + 1, cobre = Math.max(W / (VOO.w * VOO.margem), H / (VOO.h * VOO.margem));
      const f = n < VOO.quadros && z > VOO.p[i] ? Phaser.Math.Clamp((z - VOO.p[i]) / (VOO.p[n] - VOO.p[i]), 0, 1) : 0;
      if (f > 0) this.quadro2.setTexture(`mv${n}`).setScale(Math.max(cobre, esc * Math.pow(VOO.razao, -(z - VOO.p[n])))).setPosition(W / 2, H / 2).setAlpha(fade * f);
      this.quadro2.setData('f', f);
      const fw = VOO.w * VOO.margem, fh = VOO.h * VOO.margem;
      bf = { x: W / 2 + (VOO.base[i][0] - fw / 2) * k, y: H / 2 + (VOO.base[i][1] - fh / 2) * k };
    }
    this.quadro.setVisible(noFilme && this.cobertura.alpha < 1 && !this.saindo);
    this.quadro2.setVisible(this.quadro.visible && (this.quadro2.getData('f') ?? 0) > 0.01);
    this.marteP.setVisible(!noFilme || z > 0.96);
    // Sky: the butterscotch sky of Mars near the ground, darker with height, then space.
    let c0 = CEU_MARTE[0], c1 = CEU_MARTE[1];
    for (let j = 0; j < CEU_MARTE.length - 1; j++) if (z >= CEU_MARTE[j][0]) { c0 = CEU_MARTE[j]; c1 = CEU_MARTE[j + 1]; }
    const f = Phaser.Math.Clamp((z - c0[0]) / (c1[0] - c0[0]), 0, 1);
    const cc = Phaser.Display.Color.Interpolate.ColorWithColor(Phaser.Display.Color.ValueToColor(c0[1]), Phaser.Display.Color.ValueToColor(c1[1]), 1, f);
    this.ceuMarte.setFillStyle(Phaser.Display.Color.GetColor(cc.r, cc.g, cc.b), 1 - suave(0.85, 1, z));

    // Sky, Sun, Earth and orbits fade in as you leave Mars.
    this.ceu.setAlpha(0.5 + 0.5 * suave(0.2, 0.8, z));
    const a = suave(1.1, 1.6, z);
    this.sol.setPosition(sp.x, sp.y).setScale((26 * 4) / 512).setAlpha(a).setVisible(a > 0.01 && this.marteP.visible);
    const ep = tela(pe);
    this.terraP.setPosition(ep.x, ep.y).setScale(18 / diametroPlaneta(1)).setVisible(a > 0.05 && this.marteP.visible);
    this.terraP.setGiro(this.horas * 15);
    this.terraP.setSolTela(sp.x - ep.x, sp.y - ep.y);
    const g0 = this.atras.clear(), g1 = this.frente.clear();
    for (const [p, cor, al] of [[terra, 0x94a3b8, 0.35], [marte, 0xfb923c, 0.6]] as const) {
      if (a <= 0.01) break;
      const pts = Array.from({ length: 129 }, (_, i) => { const ang = (i / 128) * Math.PI * 2; return tela({ x: Math.cos(ang) * p.a, y: Math.sin(ang) * p.a }); });
      g0.lineStyle(1.5, cor, al * a).strokePoints(pts, false);
    }
    // Radio link Earth - Mars, dashed.
    if (a > 0.01) {
      const n = 40;
      for (let i = 0; i < n; i += 2) {
        const s0 = i / n, s1 = (i + 1) / n;
        g0.lineStyle(1.5, 0x67e8f9, 0.7 * a).lineBetween(ep.x + (mc.x - ep.x) * s0, ep.y + (mc.y - ep.y) * s0, ep.x + (mc.x - ep.x) * s1, ep.y + (mc.y - ep.y) * s1);
      }
    }
    this.rotulo('sol', sp.x, sp.y + 18, 'Sun', '#fde68a', a);
    this.rotulo('terra', ep.x, ep.y + 12, 'Earth', '#93c5fd', a);
    this.rotulo('marteSis', mc.x, mc.y + D / 2 + 6, 'Mars\nyou are here', '#fdba74', a);

    // Phobos and Deimos round Mars's equator (the planet's z = 0 plane in the tilted view).
    const al = suave(0.95, 1.05, z) * (1 - suave(1.15, 1.45, z));      // once the live globe shows
    LUAS.forEach((l, i) => {
      if (al <= 0.01) { this.rotulo(l.nome, 0, 0, l.nome, '#e2e8f0', 0); return; }
      const ang = (this.horas / l.horas) * Math.PI * 2 + i * 2.1;
      const rr = l.raio * (D / 2);
      const x = cx + Math.cos(ang) * rr, y = cy - Math.sin(ang) * rr * ACHATAR;
      const naFrente = Math.sin(ang) < 0;
      const escondida = !naFrente && Math.hypot(x - cx, y - cy) < D / 2;
      const r = Math.max(3, D * 0.012 * (i === 0 ? 1 : 0.7));
      // Orbit ring, a thin ellipse.
      g0.lineStyle(1, 0xe2e8f0, 0.25 * al).strokeEllipse(cx, cy, rr * 2, rr * 2 * ACHATAR);
      if (escondida) { this.rotulo(l.nome, 0, 0, l.nome, '#e2e8f0', 0); return; }
      const g = naFrente ? g1 : g0;
      g.fillStyle(l.cor, al).fillEllipse(x, y, r * 2.4, r * 1.8).lineStyle(1.5, COR_MARTE.contorno, al).strokeEllipse(x, y, r * 2.4, r * 1.8);
      this.rotulo(l.nome, x, y + r + 3, l.nome, '#e2e8f0', al);
    });

    // The base pin on Jezero crater.
    // During the film the base is where Blender says it is in that frame.
    const ap = bf ? suave(0.15, 0.3, z) : pino.frente ? 1 - suave(1.0, 1.25, z) : 0;
    const bx = bf ? bf.x : cx + pino.x * (D / 2), by = bf ? bf.y : cy + pino.y * (D / 2);
    if (ap > 0.01) {
      g1.fillStyle(0xf97316, ap).fillCircle(bx, by - 20, 7).fillTriangle(bx - 5, by - 16, bx + 5, by - 16, bx, by);
      g1.lineStyle(2, COR_MARTE.contorno, ap).strokeCircle(bx, by - 20, 7);
    }
    this.rotulo('base', bx, by + 4, 'Your base\nJezero crater', '#fed7aa', ap);

    // Caption.
    const dist = Math.hypot(pm.x - pe.x, pm.y - pe.y);
    const minutos = (dist * LUZ_SEGUNDOS_AU) / 60;
    this.legenda.setText(z < 1.2
      ? `Your base: ${JEZERO.nome}, where NASA's Perseverance landed in 2021\n` +
        `Mars is half as wide as Earth. A day (a sol) lasts ${Math.floor(DIA_MARTE_MS / 3600000)} h ${Math.round((DIA_MARTE_MS % 3600000) / 60000)} min.`
      : `${dataBonita(t)} · real planet positions from NASA JPL\n` +
        `Earth is ${(dist * 149.6).toFixed(0)} million km away. A message takes ${minutos.toFixed(0)} minutes to get there!`);
  }
}
