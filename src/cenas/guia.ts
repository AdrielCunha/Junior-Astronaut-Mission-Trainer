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
import { linha, OBJETIVOS, COMO } from '../engine/expedicao';
import type { calcularLayoutHud } from './layoutHud';
import { dispositivoMovel } from '../mobile';

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
    const d = descrever(passo, ctx, dispositivoMovel())!;
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
    const caixa = criarPilula(cena, (W - w) / 2, l.avisoY, w, h, u).setDepth(40);
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
    const lista = sessao.grade.lista.filter(quais);
    // 'salas' (any room): only the room nearest to the commander, so the arrows do not cover every room at once.
    const ap = sessao.posicaoAstronauta;
    const perto = (c: Construcao) => ap ? Math.hypot(c.gx + c.tipo.w / 2 - ap.x, c.gy + c.tipo.h / 2 - ap.y) : 0;
    const escolhidos = d.alvo === 'salas' && lista.length ? [lista.reduce((a, b) => (perto(b) < perto(a) ? b : a))] : lista;
    return escolhidos.map((c) => pontoDoModulo(cena, l, c));
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
  // Out of view: held inside the free middle of the screen, clear of the counters (left), the bars and
  // zoom buttons (right) and END DAY (bottom), so the arrow is never hidden under the HUD.
  // Computer HUD: counters in a left column, END DAY at the bottom. Phone HUD (wider than tall
  // counters): counters along the bottom, END DAY at the top, round meters in the header.
  const telefone = l.capsula.w > l.capsula.h;
  const x0 = telefone ? m : l.capsula.x + l.capsula.w + m / 2, x1 = l.zoom[0].x - m / 2;
  const y0 = telefone ? l.faixa.h + m / 2 : l.recursos[2].y + l.recursos[2].h + m / 2;
  const y1 = (telefone ? l.capsula.y : l.fimDia.y) - m / 2;
  return dentro ? { x, y: y - Math.round(8 * l.u), fora: false, ang: Math.PI / 2 } : {
    x: Phaser.Math.Clamp(x, x0, x1), y: Phaser.Math.Clamp(y, y0, y1), fora: true, ang: Math.atan2(y - H / 2, x - W / 2),
  };
}

// Arrow whose tip is at (x, y). Pointing down over a target, or along `ang` at the screen edge.
export function desenharSeta(g: Phaser.GameObjects.Graphics, u: number, t: number, x: number, y: number, fora: boolean, ang: number, cor = 0xfde047) {
  const s = 15 * u, c = fora ? ang : Math.PI / 2;
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
    // The alarm is the real main event; a breakdown is an optional side mission.
    const texto = cena.add.text(0, 0, ev.def.alarme ? `Fix the ${nome} now!` : `Side mission (optional): fix the ${nome}`, letra(px(15), '#fed7aa')).setOrigin(0, 0.5);
    const maxTexto = W - 2 * l.margem - 2 * pad - px(30) - tecla.width - px(8);
    if (texto.width > maxTexto) texto.setWordWrapWidth(maxTexto);
    const w = Math.round(pad + px(30) + tecla.width + px(8) + texto.width + pad), h = Math.max(px(40), Math.round(texto.height + px(16)));
    const caixa = criarPilula(cena, (W - w) / 2, l.avisoY, w, h, u, CONTORNO, 0xfb923c).setDepth(40);
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

// The current expedition (engine/expedicao.ts), made impossible to miss for a child who does not read fast:
// - when it starts, a big "SIDE MISSION · optional" card in the middle of the screen with the item's picture, what to find
//   and how (it shrinks away after a few seconds, or on a tap);
// - then a box under the top bar: the goal on top (a verb + the thing) and how it is going below. Hot/cold
//   searches show a 5-step thermometer (blue to red) next to the word, so it can be followed without reading;
// - a blue arrow over the next spot (or at the screen edge pointing to it) when the spot has an arrow.
// Hidden while a fix-it event is shown.
const CORES_QUENTE = [0x38bdf8, 0x60a5fa, 0xfacc15, 0xfb923c, 0xef4444];
const ICONES_EXP: Record<string, string> = { corrida: 'rover', amostra: 'cargo', balizas: 'idea', gelo: 'cold', tubos: 'goal', vazamentos: 'oxygen', ferramenta: 'wrench', meteorito: 'star', redemoinho: 'mars' };
const TEMPO_CARTAO = 5.5;   // seconds the start card stays

export class AvisoExpedicao {
  private readonly g: Phaser.GameObjects.Graphics;
  private caixa?: Phaser.GameObjects.Container;
  private cartao?: Phaser.GameObjects.Container;
  private cartaoT = 0;
  private atual: unknown = null;   // what identifies the expedition on screen (a new one = a new expedition)
  private chave = '';
  private t = 0;
  private abaixo = false;   // the tutorial pill is on screen: the box goes under it

  constructor(private readonly cena: Phaser.Scene, private readonly layout: Layout, private readonly tutorialNaTela: () => boolean = () => false) {
    this.g = cena.add.graphics().setDepth(41);
  }

  atualizar(dtMs: number, pausado: boolean) {
    this.t += dtMs / 1000;
    this.g.clear();
    const exp = sessao.expedicao;
    if (this.tutorialNaTela() !== this.abaixo) { this.abaixo = !this.abaixo; this.chave = ''; }
    // A new expedition = a new spots array; a wandering one (dust devil) gets new spots every frame, so its
    // own `movel` object is what stays the same.
    const id = exp ? (exp.movel ?? exp.pontos) : null;
    if (id !== this.atual) {
      this.atual = id;
      this.fecharCartao(true);
      if (exp) { this.cartaoT = 0; this.abrirCartao(); }
    }
    const visivel = !!exp && !pausado && sessao.fase === 'dia' && sessao.vista === 'chao';
    // The start card waits while a task is open, then counts down.
    if (this.cartao) {
      this.cartao.setVisible(visivel);
      if (visivel) { this.cartaoT += dtMs / 1000; if (this.cartaoT > TEMPO_CARTAO) this.fecharCartao(false); }
    }
    const l = exp ? linha(exp, sessao.pistaExpedicao, sessao.progressoExpedicao) : null;
    const nivel = sessao.pistaExpedicao?.nivel ?? -1;
    const chave = exp && l ? `${exp.id}|${l.titulo}|${l.detalhe}|${nivel}` : '';
    if (chave !== this.chave) { this.chave = chave; this.montar(l, nivel); }
    this.caixa?.setVisible(visivel && !sessao.evento && !this.cartao);
    const p = sessao.alvoExpedicao;
    if (!visivel || !p) return;
    const q = pontoDoMundo(this.cena, this.layout, p.x, p.y, sessao.terreno.altura(p.x, p.y) + 1.4);
    desenharSeta(this.g, this.layout.u, this.t, q.x, q.y, q.fora, q.ang, 0x38bdf8);
  }

  // Box under the top bar: icon, goal (big), detail (small) and, for hot/cold, the thermometer.
  private montar(l: { titulo: string; detalhe: string } | null, nivel: number) {
    this.caixa?.destroy();
    this.caixa = undefined;
    const exp = sessao.expedicao;
    if (!exp || !l) return;
    const { cena, layout: lay } = this, u = lay.u, px = (n: number) => Math.round(n * u);
    const W = cena.scale.width, pad = px(14), icone = px(40), termo = nivel >= 0 ? px(84) : 0;
    const titulo = cena.add.text(0, 0, l.titulo, letra(px(18), '#ffffff', { stroke: '#1e293b', strokeThickness: px(4) })).setOrigin(0, 0.5);
    const corDet = nivel >= 0 ? `#${CORES_QUENTE[nivel].toString(16).padStart(6, '0')}` : '#bae6fd';
    const detalhe = cena.add.text(0, 0, l.detalhe, letra(px(14), corDet)).setOrigin(0, 0.5);
    const w = Math.round(pad + icone + px(10) + Math.max(titulo.width, detalhe.width + (termo ? termo + px(8) : 0)) + pad), h = px(62);
    const y = lay.avisoY + (this.abaixo ? px(56) : 0);
    const caixa = criarPilula(cena, (W - w) / 2, y, w, h, u, CONTORNO, 0x38bdf8, px(20)).setDepth(40);
    const img = criarIconeJogo(cena, pad + icone / 2, h / 2, ICONES_EXP[exp.tipo] ?? 'goal', icone);
    const x = pad + icone + px(10);
    titulo.setPosition(x, px(21));
    const itens: Phaser.GameObjects.GameObject[] = [img, titulo];
    if (termo) {
      // Thermometer: 5 bars from blue (far) to red (close); the ones up to the current level are lit.
      const tg = cena.add.graphics();
      const bw = px(14), bh = px(14), gap = px(3);
      for (let i = 0; i < 5; i++) {
        const bx = x + i * (bw + gap), by = px(44) - bh / 2;
        tg.fillStyle(i <= nivel ? CORES_QUENTE[i] : 0x334155, 1).fillRoundedRect(bx, by, bw, bh, px(4))
          .lineStyle(Math.max(1, px(2)), 0xffffff, i <= nivel ? 0.9 : 0.25).strokeRoundedRect(bx, by, bw, bh, px(4));
      }
      itens.push(tg);
      detalhe.setPosition(x + termo + px(8), px(44));
    } else detalhe.setPosition(x, px(44));
    itens.push(detalhe);
    caixa.add(itens);
    this.caixa = caixa;
  }

  // Side-mission card in the middle: big picture, what to find, how to find it. Tap to close.
  private abrirCartao() {
    const exp = sessao.expedicao;
    if (!exp) return;
    const { cena, layout: lay } = this, u = lay.u, px = (n: number) => Math.round(n * u);
    const W = cena.scale.width, H = cena.scale.height;
    const w = Math.min(W - px(40), px(560)), h = px(178);
    const x0 = (W - w) / 2, y0 = Math.round(H * 0.3 - h / 2);
    const c = criarPilula(cena, x0, y0, w, h, u, CONTORNO, 0xfde047, px(28)).setDepth(45);
    const icone = px(92);
    const img = criarIconeJogo(cena, px(26) + icone / 2, h / 2, ICONES_EXP[exp.tipo] ?? 'goal', icone);
    const tx = px(26) + icone + px(18), largura = w - tx - px(22);
    const novo = cena.add.text(tx, px(30), 'SIDE MISSION · optional', letra(px(16), '#fde047')).setOrigin(0, 0.5);
    const objetivo = cena.add.text(tx, px(72), OBJETIVOS[exp.tipo] + '!', letra(px(30), '#ffffff', { stroke: '#1e293b', strokeThickness: px(6), wordWrap: { width: largura } })).setOrigin(0, 0.5);
    const como = cena.add.text(tx, px(128), COMO[exp.tipo], letra(px(17), '#bae6fd', { wordWrap: { width: largura } })).setOrigin(0, 0.5);
    const toque = cena.add.text(w - px(18), h - px(14), 'tap to close', letra(px(11), '#94a3b8')).setOrigin(1, 1);
    c.add([img, novo, objetivo, como, toque]);
    c.setSize(w, h).setInteractive(new Phaser.Geom.Rectangle(0, 0, w, h), Phaser.Geom.Rectangle.Contains)
      .on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => { ev.stopPropagation(); this.fecharCartao(false); });
    if (!movimentoReduzido()) {
      c.setAlpha(0).setY(y0 + px(20));
      cena.tweens.add({ targets: c, alpha: 1, y: y0, duration: 320, ease: 'Back.easeOut' });
      cena.tweens.add({ targets: img, scale: img.scale * 1.12, yoyo: true, repeat: -1, duration: 520, ease: 'Sine.easeInOut' });
    }
    this.cartao = c;
  }

  private fecharCartao(agora: boolean) {
    const c = this.cartao;
    if (!c) return;
    this.cartao = undefined;
    if (agora || movimentoReduzido()) { c.destroy(); return; }
    // Shrinks up toward the notice under the objective, so the child sees where the goal went.
    const lay = this.layout;
    this.cena.tweens.add({ targets: c, alpha: 0, scale: 0.4, x: c.x + c.width * 0.3, y: lay.avisoY, duration: 380, ease: 'Quad.easeIn', onComplete: () => c.destroy() });
  }
}
