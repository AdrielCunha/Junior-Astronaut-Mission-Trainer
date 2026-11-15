// Draws the guide of tutorial.ts on the HUD layer: a small pill with the keys to press, and a bobbing
// arrow over the Battery Bank / rooms / END DAY button (at the screen edge, pointing the way, when the
// target is out of view). Nothing here changes mission state.
import Phaser from 'phaser';
import { movimentoReduzido } from '../video';
import { paraTela } from '../engine/iso';
import { dadosTerreno, sessao } from './sessao';
import { origemBaterias } from '../engine/estacaoSolar';
import { CONTORNO, criarPilula, criarTecla, criarIconeJogo, letra } from '../tarefas/estilo';
import { descrever, passoAtual, marcarTutorialVisto, type Descricao } from './tutorial';
import type { Construcao } from '../engine/construcao';
import { linha } from '../engine/expedicao';
import type { calcularLayoutHud } from './layoutHud';

type Layout = ReturnType<typeof calcularLayoutHud>;

export class Guia {
  private readonly g: Phaser.GameObjects.Graphics;
  private pilula?: Phaser.GameObjects.Container;
  private chave = '';
  private t = 0;
  private fim = false;

  constructor(
    private readonly cena: Phaser.Scene, private readonly layout: Layout,
    private readonly usou: (c: 'movimento' | 'pulo') => boolean, private readonly aoTerminar: () => void,
  ) {
    this.g = cena.add.graphics().setDepth(41);
  }

  atualizar(dtMs: number, pausado: boolean) {
    if (this.fim) return;
    this.t += dtMs / 1000;
    const ctx = {
      moveu: this.usou('movimento'), pulou: this.usou('pulo'),
      noHabitat: sessao.noHabitat, carregando: sessao.carregando,
      oxigenio: sessao.entregas.oxigenio, meta: sessao.entregas.meta, fase: sessao.fase,
    };
    const passo = passoAtual(ctx);
    if (passo === 'pronto') { this.terminar(); return; }
    const d = descrever(passo, ctx)!;
    this.g.clear();
    this.pilula?.setVisible(!pausado);
    if (pausado) return;
    const chave = `${d.teclas.join('+')}|${d.texto}`;
    if (chave !== this.chave) { this.chave = chave; this.montar(d); }
    for (const p of this.alvos(d)) this.seta(p.x, p.y, p.fora, p.ang);
  }

  terminar() {
    if (this.fim) return;
    this.fim = true;
    marcarTutorialVisto();
    this.g.destroy();
    this.pilula?.destroy();
    this.aoTerminar();
  }

  // Keys + one short line, under the objective row.
  private montar(d: Descricao) {
    this.pilula?.destroy();
    const { cena, layout: l } = this, u = l.u, px = (n: number) => Math.round(n * u);
    const W = cena.scale.width, pad = px(14), gap = px(6);
    const teclas = d.teclas.map((t) => criarTecla(cena, 0, 0, t, u));
    const wTeclas = teclas.reduce((a, k) => a + k.width + gap, 0);
    const pular = cena.add.text(0, 0, 'Skip ✕', letra(px(12), '#93c5fd')).setOrigin(0, 0.5).setInteractive({ useHandCursor: true });
    const texto = cena.add.text(0, 0, d.texto, letra(px(15))).setOrigin(0, 0.5);
    const maxTexto = W - 2 * l.margem - 2 * pad - wTeclas - pular.width - px(16);
    if (texto.width > maxTexto) texto.setWordWrapWidth(maxTexto);
    const w = Math.round(pad + wTeclas + texto.width + px(16) + pular.width + pad), h = Math.max(px(40), Math.round(texto.height + px(16)));
    const caixa = criarPilula(cena, (W - w) / 2, l.capsula.y + l.capsula.h + px(10), w, h, u).setDepth(40);
    let x = pad;
    teclas.forEach((k) => { k.setPosition(x, h / 2); x += k.width + gap; caixa.add(k); });
    texto.setPosition(x, h / 2); x += texto.width + px(16);
    pular.setPosition(x, h / 2);
    pular.on('pointerdown', () => this.terminar());
    caixa.add([texto, pular]);
    this.pilula = caixa;
    if (!movimentoReduzido()) {
      caixa.setAlpha(0);
      cena.tweens.add({ targets: caixa, alpha: 1, duration: 250 });
    }
  }

  // Screen points the arrows go to.
  private alvos(d: Descricao) {
    const { cena, layout: l } = this;
    if (d.alvo === 'fim') return [{ x: l.fimDia.x + l.fimDia.w / 2, y: l.fimDia.y - Math.round(8 * l.u), fora: false, ang: Math.PI / 2 }];
    if (!d.alvo) return [];
    const quais = (c: Construcao) => d.alvo === 'banco' ? c.tipo.id === origemBaterias(sessao.mundo)
      : d.alvo === 'suporte' ? c.tipo.sala === 'oxigenio'
      : d.alvo === 'oficina' ? c.tipo.sala === 'meta'
      : !!c.tipo.sala;
    return sessao.grade.lista.filter(quais).map((c) => pontoDoModulo(cena, l, c));
  }

  private seta(x: number, y: number, fora: boolean, ang: number) {
    desenharSeta(this.g, this.layout.u, this.t, x, y, fora, ang);
  }
}

// Screen point over a module, converted through the ground camera. Out of view, it is held at the screen
// edge with the angle toward the module, so an arrow drawn there points the way.
export function pontoDoModulo(cena: Phaser.Scene, l: Layout, c: Construcao) {
  const cx = c.gx + c.tipo.w / 2, cy = c.gy + c.tipo.h / 2;
  return pontoDoMundo(cena, l, cx, cy, sessao.terreno.altura(cx, cy) + c.tipo.altura);
}

// The same for any ground point (gx, gy) at height z (in tiles).
export function pontoDoMundo(cena: Phaser.Scene, l: Layout, gx: number, gy: number, z: number) {
  const W = cena.scale.width, H = cena.scale.height;
  const cam = cena.scene.get('Superficie').cameras.main;
  const m = Math.round(34 * l.u), topo = l.faixa.h + Math.round(60 * l.u);
  const p = paraTela(dadosTerreno.imagem, gx, gy, z);
  const x = (p.x - cam.worldView.x) * cam.zoom, y = (p.y - cam.worldView.y) * cam.zoom;
  const dentro = x > m && x < W - m && y > topo && y < H - m;
  return dentro ? { x, y: y - Math.round(8 * l.u), fora: false, ang: Math.PI / 2 } : {
    x: Phaser.Math.Clamp(x, m, W - m), y: Phaser.Math.Clamp(y, topo, H - m), fora: true, ang: Math.atan2(y - H / 2, x - W / 2),
  };
}

// Arrow whose tip is at (x, y). Pointing down over a target, or along `ang` at the screen edge.
export function desenharSeta(g: Phaser.GameObjects.Graphics, u: number, t: number, x: number, y: number, fora: boolean, ang: number, cor = 0xfde047) {
  const s = 11 * u, c = fora ? ang : Math.PI / 2;
  const bob = movimentoReduzido() ? 0 : Math.sin(t * 6) * s * 0.35;
  const cos = Math.cos(c), sin = Math.sin(c);
  const tx = x - cos * bob, ty = y - sin * bob;
  const pts = [[0, 0], [-0.9, -0.75], [-0.9, -0.3], [-2.3, -0.3], [-2.3, 0.3], [-0.9, 0.3], [-0.9, 0.75]]
    .map(([a, b]) => new Phaser.Math.Vector2(tx + (a * cos - b * sin) * s, ty + (a * sin + b * cos) * s));
  g.fillStyle(cor).fillPoints(pts, true).lineStyle(Math.max(2, s * 0.22), CONTORNO).strokePoints(pts, true);
}

// The day's random event (engine/eventos.ts): an orange arrow over the module that needs fixing, and a
// short line under the objective saying what and where. Gone when it is fixed.
export class AvisoEvento {
  private readonly g: Phaser.GameObjects.Graphics;
  private pilula?: Phaser.GameObjects.Container;
  private atual: unknown = null;
  private t = 0;

  constructor(private readonly cena: Phaser.Scene, private readonly layout: Layout) {
    this.g = cena.add.graphics().setDepth(41);
  }

  atualizar(dtMs: number, pausado: boolean) {
    this.t += dtMs / 1000;
    this.g.clear();
    const ev = sessao.evento;
    if (ev !== this.atual) { this.atual = ev; this.montar(); }
    this.pilula?.setVisible(!pausado && sessao.fase === 'dia');
    // Radiation alarm: the screen edge pulses red until it is answered.
    if (ev?.def.alarme && !pausado && sessao.fase === 'dia') {
      const W = this.cena.scale.width, H = this.cena.scale.height, b = Math.round(26 * this.layout.u);
      const a = movimentoReduzido() ? 0.3 : 0.2 + 0.2 * (0.5 + 0.5 * Math.sin(this.t * 5));
      this.g.fillStyle(0xef4444, a).fillRect(0, 0, W, b).fillRect(0, H - b, W, b).fillRect(0, b, b, H - 2 * b).fillRect(W - b, b, b, H - 2 * b);
    }
    const c = ev && sessao.grade.lista.find((m) => m.id === ev.construcaoId);
    if (!c || pausado || sessao.fase !== 'dia') return;
    const p = pontoDoModulo(this.cena, this.layout, c);
    desenharSeta(this.g, this.layout.u, this.t, p.x, p.y, p.fora, p.ang, 0xfb923c);
  }

  private montar() {
    this.pilula?.destroy();
    this.pilula = undefined;
    const ev = sessao.evento;
    if (!ev) return;
    const { cena, layout: l } = this, u = l.u, px = (n: number) => Math.round(n * u);
    const W = cena.scale.width, pad = px(14);
    const nome = sessao.grade.lista.find((m) => m.id === ev.construcaoId)?.tipo.nome ?? '';
    const tecla = criarTecla(cena, 0, 0, 'E', u);
    const texto = cena.add.text(0, 0, `Fix the ${nome}`, letra(px(15), '#fed7aa')).setOrigin(0, 0.5);
    const w = Math.round(pad + px(30) + tecla.width + px(8) + texto.width + pad), h = px(40);
    const caixa = criarPilula(cena, (W - w) / 2, l.capsula.y + l.capsula.h + px(10), w, h, u, CONTORNO, 0xfb923c).setDepth(40);
    const icone = criarIconeJogo(cena,pad+px(12),h/2,'warning',px(27));
    tecla.setPosition(pad+px(30), h / 2);
    texto.setPosition(pad + px(30) + tecla.width + px(8), h / 2);
    caixa.add([icone, tecla, texto]);
    this.pilula = caixa;
    if (!movimentoReduzido()) {
      caixa.setScale(0.7).setAlpha(0);
      cena.tweens.add({ targets: caixa, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    }
  }
}

// The current expedition (engine/expedicao.ts): a blue arrow over the next spot (or at the screen edge pointing
// to it) and a short line saying what is going on. Spots with no arrow show a hot/cold hint in the line instead.
// Hidden while a fix-it event is shown.
const CORES_QUENTE = ['#bae6fd', '#93c5fd', '#fde68a', '#fdba74', '#fca5a5'];
const ICONES_EXP: Record<string, string> = { corrida: 'rover', amostra: 'cargo', balizas: 'idea', gelo: 'cold', tubos: 'goal' };

export class AvisoExpedicao {
  private readonly g: Phaser.GameObjects.Graphics;
  private pilula?: Phaser.GameObjects.Container;
  private chave = '';
  private t = 0;

  constructor(private readonly cena: Phaser.Scene, private readonly layout: Layout) {
    this.g = cena.add.graphics().setDepth(41);
  }

  atualizar(dtMs: number, pausado: boolean) {
    this.t += dtMs / 1000;
    this.g.clear();
    const exp = sessao.expedicao;
    const texto = exp ? linha(exp, sessao.pistaExpedicao, sessao.progressoExpedicao) : '';
    const nivel = sessao.pistaExpedicao?.nivel ?? -1;
    const chave = exp ? `${exp.id}|${texto}|${nivel}` : '';
    if (chave !== this.chave) { this.chave = chave; this.montar(texto, nivel); }
    const visivel = !!exp && !pausado && sessao.fase === 'dia' && sessao.vista === 'chao';
    this.pilula?.setVisible(visivel && !sessao.evento);
    const p = sessao.alvoExpedicao;
    if (!visivel || !p) return;
    const q = pontoDoMundo(this.cena, this.layout, p.x, p.y, sessao.terreno.altura(p.x, p.y) + 1.4);
    desenharSeta(this.g, this.layout.u, this.t, q.x, q.y, q.fora, q.ang, 0x38bdf8);
  }

  private montar(linhaTexto: string, nivel: number) {
    this.pilula?.destroy();
    this.pilula = undefined;
    const exp = sessao.expedicao;
    if (!exp) return;
    const { cena, layout: l } = this, u = l.u, px = (n: number) => Math.round(n * u);
    const W = cena.scale.width, pad = px(14);
    const cor = nivel >= 0 ? CORES_QUENTE[nivel] : '#bae6fd';
    const texto = cena.add.text(0, 0, linhaTexto, letra(px(15), cor)).setOrigin(0, 0.5);
    const w = Math.round(pad + px(30) + texto.width + pad), h = px(40);
    const caixa = criarPilula(cena, (W - w) / 2, l.capsula.y + l.capsula.h + px(10), w, h, u, CONTORNO, 0x38bdf8).setDepth(40);
    const icone = criarIconeJogo(cena, pad + px(12), h / 2, ICONES_EXP[exp.tipo] ?? 'goal', px(27));
    texto.setPosition(pad + px(30), h / 2);
    caixa.add([icone, texto]);
    this.pilula = caixa;
  }
}
