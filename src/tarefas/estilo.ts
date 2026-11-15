// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Shared cartoon look for the task screens: rounded font, bright colors, thick dark outlines.
import type Phaser from 'phaser';
import { fonte } from '../cenas/sessao';
import { movimentoReduzido } from '../video';
import { chaveIcone, resolverIcone, type IconeJogo } from '../dados/icones';
import { tocarSfx } from '../sfx';

export const CONTORNO = 0x1e293b;
export const CORES_FESTA = [0xfde047, 0x4ade80, 0xf472b6, 0x60a5fa, 0xfb923c];

export const letra = (tamanho: number, cor = '#ffffff', extra: Phaser.Types.GameObjects.Text.TextStyle = {}) =>
  fonte(tamanho, cor, { fontFamily: '"Fredoka", system-ui, "Segoe UI", sans-serif', fontStyle: '600', ...extra });

export type Caixa = { x: number; y: number; w: number; h: number };

// The frame every kid-facing screen shares (task screens, title screen): a metal panel with bolts,
// a bright starry screen, a title pill on the top edge and room for a dark pill at the bottom.
// Draw inside `tela`, then call borda() so the screen's edge stays on top of what was drawn.
export function moldura(cena: Phaser.Scene, painel: Caixa, u: number, titulo: string, fundo = 0x2563eb) {
  const { x: x0, y: y0, w: largura, h: altura } = painel;
  const g = cena.add.graphics();
  g.fillStyle(0x000000, 0.35).fillRoundedRect(x0 + 6 * u, y0 + 8 * u, largura, altura, 26 * u);
  g.fillStyle(0xd5dde6).fillRoundedRect(x0, y0, largura, altura, 26 * u);
  g.lineStyle(5 * u, 0x64748b).strokeRoundedRect(x0, y0, largura, altura, 26 * u);
  g.lineStyle(2 * u, 0xffffff, 0.7).strokeRoundedRect(x0 + 7 * u, y0 + 7 * u, largura - 14 * u, altura - 14 * u, 20 * u);
  for (const [bx, by] of [[x0 + 18 * u, y0 + 18 * u], [x0 + largura - 18 * u, y0 + 18 * u], [x0 + 18 * u, y0 + altura - 18 * u], [x0 + largura - 18 * u, y0 + altura - 18 * u]]) {
    g.fillStyle(0x94a3b8).fillCircle(bx, by, 5 * u).lineStyle(1.5 * u, 0x64748b).strokeCircle(bx, by, 5 * u);
  }

  const tela: Caixa = { x: x0 + 26 * u, y: y0 + 38 * u, w: largura - 52 * u, h: altura - 38 * u - 92 * u };
  g.fillStyle(fundo).fillRoundedRect(tela.x, tela.y, tela.w, tela.h, 18 * u);
  // Slightly darker toward the top, fading out (a hard edge read as a line across the screen).
  // Bands meet on whole pixels: overlapping them would draw thin darker lines.
  const faixas = 24, topo = Math.round(tela.y + 18 * u), alto = Math.round(tela.h * 0.5 - 18 * u);
  for (let k = 0; k < faixas; k++) {
    const a = topo + Math.round((k * alto) / faixas), b = topo + Math.round(((k + 1) * alto) / faixas);
    g.fillStyle(0x000000, 0.12 * (1 - (k + 0.5) / faixas)).fillRect(tela.x, a, tela.w, b - a);
  }
  g.fillStyle(0x000000, 0.12).fillRoundedRect(tela.x, tela.y, tela.w, topo - tela.y, { tl: 18 * u, tr: 18 * u, bl: 0, br: 0 });
  for (let i = 0; i < 45 + Math.round(tela.w * tela.h / (u * u * 9000)); i++) {
    const e = cena.add.circle(tela.x + 10 * u + Math.random() * (tela.w - 20 * u), tela.y + 10 * u + Math.random() * (tela.h - 20 * u),
      (0.8 + Math.random() * 1.4) * u, 0xffffff, 0.4 + Math.random() * 0.5);
    if (i % 3 === 0) cena.tweens.add({ targets: e, alpha: 0.1, duration: 600 + Math.random() * 900, yoyo: true, repeat: -1, delay: Math.random() * 800 });
  }

  const cx = x0 + largura / 2;
  const t = cena.add.text(cx, y0, titulo, letra(21 * u)).setOrigin(0.5).setDepth(2);
  const pw = t.width + 56 * u, ph = 44 * u;
  cena.add.graphics().setDepth(1)
    .fillStyle(0x2563eb).fillRoundedRect(cx - pw / 2, y0 - ph / 2, pw, ph, ph / 2)
    .lineStyle(4 * u, 0xffffff).strokeRoundedRect(cx - pw / 2, y0 - ph / 2, pw, ph, ph / 2)
    .lineStyle(2 * u, CONTORNO).strokeRoundedRect(cx - pw / 2 - 3 * u, y0 - ph / 2 - 3 * u, pw + 6 * u, ph + 6 * u, ph / 2 + 3 * u);

  const rodapeY = tela.y + tela.h + 14 * u;
  return {
    tela,
    rodape: { y: rodapeY, h: y0 + altura - 18 * u - rodapeY },
    borda: () => cena.add.graphics().lineStyle(5 * u, CONTORNO).strokeRoundedRect(tela.x, tela.y, tela.w, tela.h, 18 * u),
  };
}

// Dark pill for instructions and facts.
export const pilulaEscura = (g: Phaser.GameObjects.Graphics, x: number, y: number, w: number, h: number, u: number) =>
  g.clear().fillStyle(CONTORNO, 0.95).fillRoundedRect(x, y, w, h, Math.min(h / 2, 24 * u));

// Round red X on a frame's top-left corner.
export function botaoFechar(cena: Phaser.Scene, x: number, y: number, u: number, acao: () => void) {
  const c = cena.add.container(x, y).setDepth(3);
  c.add(cena.add.graphics()
    .fillStyle(0xef4444).fillCircle(0, 0, 23 * u).lineStyle(4 * u, 0xffffff).strokeCircle(0, 0, 23 * u)
    .lineStyle(2 * u, CONTORNO).strokeCircle(0, 0, 26 * u)
    .lineStyle(5 * u, 0xffffff).lineBetween(-8 * u, -8 * u, 8 * u, 8 * u).lineBetween(8 * u, -8 * u, -8 * u, 8 * u));
  return c.setSize(52 * u, 52 * u).setInteractive({ useHandCursor: true })
    .on('pointerover', () => c.setScale(1.1)).on('pointerout', () => c.setScale(1))
    .on('pointerdown', acao);
}

// Big green pill button that gently pulses, centered on (x, y).
export function botaoVerde(cena: Phaser.Scene, x: number, y: number, texto: string, tamanho: number, alturaMax: number, u: number, acao: () => void, opcoes: { largura?: number; altura?: number; pulsar?: boolean; pararPropagacao?: boolean; animarHover?: boolean; cor?: number; corHover?: number } = {}) {
  const cor = opcoes.cor ?? 0x22c55e, corHover = opcoes.corHover ?? (opcoes.cor === undefined ? 0x4ade80 : 0x64748b);
  const t = cena.add.text(0, 0, texto, letra(tamanho)).setOrigin(0.5);
  const bw = opcoes.largura ?? t.width + 2.2 * tamanho, bh = opcoes.altura ?? Math.min(alturaMax, t.height + 0.9 * tamanho);
  // Same look as the title screen's buttons (shine, white rim, dark outline), centred on (0, 0).
  const g = desenharBotao(cena.add.graphics(), bw, bh, u, cor).setPosition(-bw / 2, -bh / 2);
  const c = cena.add.container(x, y, [g, t]).setSize(bw, bh).setData('texto', t).setInteractive({ useHandCursor: true })
    .on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => { if (opcoes.pararPropagacao) ev.stopPropagation(); acao(); });
  if (opcoes.animarHover) {
    // Animate only the artwork so the button's hit area stays stable under the pointer.
    const brilho = cena.add.graphics().lineStyle(8 * u, 0x86efac, 0.2)
      .strokeRoundedRect(-bw / 2, -bh / 2, bw, bh, bh / 2).setAlpha(0);
    const visual = cena.add.container(0, 0, [brilho, g, t]);
    c.add(visual);
    const animar = (ativo: boolean) => {
      cena.tweens.killTweensOf([visual, brilho]);
      desenharBotao(g, bw, bh, u, ativo ? corHover : cor);
      cena.tweens.add({ targets: visual, scale: ativo && !movimentoReduzido() ? 1.04 : 1, y: ativo && !movimentoReduzido() ? -Math.round(2 * u) : 0,
        duration: movimentoReduzido() ? 0 : ativo ? 180 : 140, ease: 'Sine.easeOut' });
      cena.tweens.add({ targets: brilho, alpha: ativo ? 1 : 0, duration: 160 });
    };
    c.on('pointerover', () => animar(true)).on('pointerout', () => animar(false));
  }
  if (opcoes.pulsar !== false && !movimentoReduzido()) cena.tweens.add({ targets: c, scale: 1.08, duration: 500, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
  return c;
}

// Chunky progress pill with a label on its left, centered on (cx, cy). Returns a setter, 0..1.
export function criarBarra(cena: Phaser.Scene, cx: number, cy: number, largura: number, u: number, rotulo: string, cor = 0x4ade80) {
  const alt = 20 * u, x = cx - largura / 2;
  cena.add.text(x - 10 * u, cy, rotulo, letra(17 * u, '#ffffff', { stroke: '#1e293b', strokeThickness: 5 * u })).setOrigin(1, 0.5);
  cena.add.graphics()
    .fillStyle(0x1e3a8a).fillRoundedRect(x, cy - alt / 2, largura, alt, alt / 2)
    .lineStyle(3 * u, 0xffffff).strokeRoundedRect(x, cy - alt / 2, largura, alt, alt / 2);
  const g = cena.add.graphics();
  return (p: number) => {
    g.clear();
    if (p > 0) g.fillStyle(cor).fillRoundedRect(x + 3 * u, cy - alt / 2 + 3 * u, Math.max(alt - 6 * u, (largura - 6 * u) * Math.min(1, p)), alt - 6 * u, (alt - 6 * u) / 2);
  };
}


// Floating HUD pieces are decorative: only buttons opt into input.
export function criarPilula(cena: Phaser.Scene, x: number, y: number, w: number, h: number, u: number, cor = CONTORNO, borda = 0xffffff, raio?: number, opacidade = 1) {
  x = Math.round(x); y = Math.round(y); w = Math.round(w); h = Math.round(h);
  const canto = raio ?? h / 2;
  const g = cena.add.graphics()
    .fillStyle(0x000000, 0.3 * opacidade).fillRoundedRect(Math.round(2 * u), Math.round(4 * u), w, h, Math.round(canto))
    .fillStyle(cor, opacidade).fillRoundedRect(0, 0, w, h, canto)
    .lineStyle(3 * u, borda).strokeRoundedRect(0, 0, w, h, canto)
    .lineStyle(Math.max(1, 1.5 * u), CONTORNO, opacidade).strokeRoundedRect(-2.5 * u, -2.5 * u, w + 5 * u, h + 5 * u, canto + 2.5 * u);
  return cena.add.container(x, y, [g]).setSize(w, h);
}

// The title screen's button (Radar.botao): solid colour, a soft shine on the upper half, white rim
// and a thin dark outline, over a drop shadow. Drawn in the box (0, 0, w, h).
export const COR_BOTAO = 0x2563eb, COR_BOTAO_HOVER = 0x3b82f6;
export function desenharBotao(g: Phaser.GameObjects.Graphics, w: number, h: number, u: number, cor = COR_BOTAO) {
  const r = Math.min(w, h) / 2, aro = Math.max(2, Math.round((h < 44 * u ? 3 : 4) * u));
  return g.clear()
    .fillStyle(0x000000, 0.3).fillRoundedRect(Math.round(2 * u), Math.round(4 * u), w, h, r)
    .fillStyle(cor).fillRoundedRect(0, 0, w, h, r)
    .fillStyle(0xffffff, 0.18).fillRoundedRect(Math.round(w * 0.16), Math.round(h * 0.12), Math.round(w * 0.68), Math.round(h * 0.34), Math.round(h * 0.17))
    .lineStyle(aro, 0xffffff).strokeRoundedRect(0, 0, w, h, r)
    .lineStyle(Math.max(1, 1.5 * u), CONTORNO).strokeRoundedRect(-aro / 2 - u, -aro / 2 - u, w + aro + 2 * u, h + aro + 2 * u, r + aro / 2 + u);
}

// Dark rounded label behind a text that floats over the map (prop and rover tooltips).
// Redraw it whenever the text changes, moves or is scaled; it follows the text's visibility.
// opacidade: the pill's fill (a little see-through for labels that sit over the map).
export function fundoRotulo(g: Phaser.GameObjects.Graphics, t: Phaser.GameObjects.Text, opacidade = 0.96) {
  const s = t.scaleX, w = t.width * s, h = t.height * s;
  const x = t.x - w * t.originX, y = t.y - h * t.originY, r = Math.min(h / 2, 16 * s);
  g.clear().setDepth(t.depth - 0.001).setVisible(t.visible).setAlpha(t.alpha);
  if (!t.visible || !t.text) return g;
  return g.fillStyle(0x000000, 0.3).fillRoundedRect(x + 2 * s, y + 4 * s, w, h, r)
    .fillStyle(CONTORNO, opacidade).fillRoundedRect(x, y, w, h, r)
    .lineStyle(2.5 * s, 0xffffff).strokeRoundedRect(x, y, w, h, r);
}

// A short label over the map (e.g. "Installing battery..."): text on a dark pill, bottom-centre at (x, y).
export function rotuloMapa(cena: Phaser.Scene, x: number, y: number, s: string, tamanho: number, cor = '#ffffff') {
  const t = cena.add.text(0, 0, s, letra(tamanho, cor, { padding: { x: 10, y: 5 }, align: 'center' })).setOrigin(0.5, 1);
  const g = fundoRotulo(cena.add.graphics(), t);
  return cena.add.container(x, y, [g, t]);
}

export function criarSelo(cena: Phaser.Scene, x: number, y: number, w: number, h: number, u: number, cor = 0x2563eb) {
  const caixa = criarPilula(cena, x, y, w, h, u, cor);
  const texto = cena.add.text(w / 2, h / 2, '', letra(16 * u, '#ffffff', { stroke: '#1e293b', strokeThickness: 3 * u })).setOrigin(0.5);
  caixa.add(texto);
  return { caixa, texto };
}

export function criarChip(cena: Phaser.Scene, x: number, y: number, w: number, u: number, icone: string, rotulo: string, cor: number) {
  const caixa = criarPilula(cena, x, y, w, 48 * u, u);
  const simbolo = criarIconeJogo(cena, 17 * u, 24 * u, icone, 25 * u);
  const label = cena.add.text(34 * u, 12 * u, rotulo, letra(14 * u, '#bfdbfe')).setOrigin(0, 0.5);
  const numero = cena.add.text(34 * u, 32 * u, '0', letra(23 * u, '#' + cor.toString(16).padStart(6, '0'), { stroke: '#0b1a4a', strokeThickness: 3 * u })).setOrigin(0, 0.5);
  const escala = Math.min(1, (w - 40 * u) / label.width);
  label.setScale(escala);
  caixa.add([simbolo, label, numero]);
  return { caixa, atualizar: (n: number) => numero.setText(String(n)) };
}

export const COR_FAIXA_HUD = 0x0b1630;
const OPACIDADE_FAIXA_HUD = 0.35;

// Only a soft shade at the top keeps the floating HUD pieces readable over a bright map.
export function criarFaixaHud(cena: Phaser.Scene, b: Caixa, u: number) {
  const g = cena.add.graphics(), faixas = 12;
  for (let k = 0; k < faixas; k++) {
    const a = Math.round(b.y + (k * b.h) / faixas), z = Math.round(b.y + ((k + 1) * b.h) / faixas);
    g.fillStyle(COR_FAIXA_HUD, OPACIDADE_FAIXA_HUD * (1 - (k + 0.5) / faixas)).fillRect(b.x, a, b.w, z - a);
  }
  return g.setData('u', u);
}

export function criarTituloHud(cena: Phaser.Scene, b: Caixa, u: number) {
  const px = (n: number) => Math.round(n * u);
  const fundo = desenharBotao(cena.add.graphics(), b.w, b.h, u);
  const caixa = cena.add.container(b.x, b.y, [fundo]).setSize(b.w, b.h);
  const estilo = { stroke: '#1e293b', strokeThickness: px(6) };
  // The main text is measured without a shadow. Only its duplicate receives the offset.
  const sombra = cena.add.text(0, 0, 'LUNAR ODYSSEY', letra(px(32.5), '#07102d', { ...estilo, stroke: '#07102d' })).setOrigin(0.5, 0.5);
  const logo = cena.add.text(0, 0, 'LUNAR ODYSSEY', letra(px(32.5), '#fde047', estilo)).setOrigin(0.5, 0.5);
  const fundoData = cena.add.graphics();
  const data = cena.add.text(0, 0, '', letra(px(13), '#ffffff', { fontStyle: '700' })).setOrigin(0.5, 0.5);
  const pilula = cena.add.container(0, 0, [fundoData, data]);
  caixa.add([sombra, logo, pilula]);
  const atualizar = (texto: string) => {
    const margem = px(2), gap = px(3), alturaData = px(20), paddingData = px(10);
    const centroX = Math.round(b.w / 2);
    data.setText(texto).setScale(1);
    const maximo = Math.floor(b.w * 0.85);
    data.setScale(Math.min(1, (maximo - 2 * paddingData) / Math.max(1, data.width)));
    const larguraData = Math.min(maximo, Math.ceil(data.displayWidth) + 2 * paddingData);
    const escala = Math.min(1, (b.w - 2 * margem) / logo.width, (b.h - 2 * margem - gap - alturaData) / logo.height);
    logo.setScale(escala); sombra.setScale(escala);
    const grupoH = logo.displayHeight + gap + alturaData;
    const topo = (b.h - grupoH) / 2;
    logo.setPosition(centroX, Math.round(topo + logo.displayHeight / 2));
    sombra.setPosition(centroX, logo.y + px(4));
    pilula.setPosition(centroX, Math.round(topo + logo.displayHeight + gap + alturaData / 2)).setSize(larguraData, alturaData);
    fundoData.clear().fillStyle(CONTORNO, 0.95).fillRoundedRect(-Math.round(larguraData / 2), -Math.round(alturaData / 2), larguraData, alturaData, Math.round(alturaData / 2));
  };
  return { caixa, data, atualizar };
}

// Places one of the custom Lunar Odyssey icons at a fixed on-screen size.
export function criarIconeJogo(cena: Phaser.Scene, x: number, y: number, id: string, tamanho: number) {
  const t = Math.max(1, Math.round(tamanho));
  return cena.add.image(Math.round(x), Math.round(y), chaveIcone(resolverIcone(id))).setDisplaySize(t, t);
}

export function criarIconeRadiacao(cena: Phaser.Scene, x: number, y: number, tamanho: number) {
  return criarIconeJogo(cena, x, y, 'radiation', tamanho);
}

export function criarIndicador(cena: Phaser.Scene, b: Caixa, u: number, icone: IconeJogo, rotulo: string, cor: number) {
  // Enlarge every inner measurement together, capped by the available column and row.
  const ampliacao = Math.max(1, Math.min(1.2, b.w / (220 * u), b.h / (44 * u)));
  const unidade = u * ampliacao;
  const px = (n: number) => Math.round(n * unidade);
  const caixa = cena.add.container(b.x, b.y).setSize(b.w, b.h);
  // Equal outer columns retain their width; the panel is centred in its column and everything
  // inside keeps the same margin from the panel's rounded border.
  const largura = Math.min(px(250), b.w - px(8));
  const inicio = Math.round((b.w - largura) / 2), alto = b.h, raio = px(16);
  const margem = px(14), iconeW = px(26), gap = px(10);
  const coluna = inicio + margem + iconeW + gap, fim = inicio + largura - margem;
  const cabecalhoY = Math.round(alto * 0.3), seloW = px(40), seloH = px(18);
  const fundo = criarPilula(cena, inicio, 0, largura, alto, unidade, CONTORNO, 0xffffff, raio);
  const simbolo = criarIconeJogo(cena, inicio + margem + Math.round(iconeW / 2), Math.round(alto / 2), icone, iconeW);
  const label = cena.add.text(coluna, cabecalhoY, rotulo, letra(px(14.5), '#ffffff', { stroke: '#1e293b', strokeThickness: px(4) })).setOrigin(0, 0.5);
  const selo = criarSelo(cena, fim - seloW, cabecalhoY - Math.round(seloH / 2), seloW, seloH, unidade, cor);
  selo.texto.setFontSize(px(11));
  label.setScale(Math.min(1, (fim - seloW - px(6) - coluna) / label.width));
  const trilhoH = px(12), trilhoY = Math.round(alto * 0.74), trilhoW = fim - coluna;
  const trilho = cena.add.graphics().fillStyle(0x0b1a4a).fillRoundedRect(coluna, trilhoY - trilhoH / 2, trilhoW, trilhoH, trilhoH / 2)
    .lineStyle(px(2), 0xffffff).strokeRoundedRect(coluna, trilhoY - trilhoH / 2, trilhoW, trilhoH, trilhoH / 2);
  const preenchimento = cena.add.graphics();
  caixa.add([fundo, simbolo, label, selo.caixa, trilho, preenchimento]);
  return { caixa, atualizar: (valor: number) => {
    const fracao = Math.max(0, Math.min(100, valor)) / 100;
    const borda = px(2), a = trilhoH - 2 * borda, util = trilhoW - 2 * borda;
    const cheio = fracao > 0 ? Math.min(util, Math.max(a, Math.round(util * fracao))) : 0;
    preenchimento.clear();
    if (cheio) preenchimento.fillStyle(cor).fillRoundedRect(coluna + borda, trilhoY - a / 2, cheio, a, a / 2)
      .fillStyle(0xffffff, 0.3).fillRoundedRect(coluna + borda + a / 3, trilhoY - a / 2 + 1, Math.max(0, cheio - a * 2 / 3), a * 0.3, a * 0.15);
    selo.texto.setText(`${Math.round(valor)}%`);
  } };
}

export function criarBotaoPilula(cena: Phaser.Scene, b: Caixa, u: number, titulo: string, acao: () => void, cor = COR_BOTAO) {
  const fundo = desenharBotao(cena.add.graphics(), Math.round(b.w), Math.round(b.h), u, cor);
  const caixa = cena.add.container(Math.round(b.x), Math.round(b.y), [fundo]).setSize(Math.round(b.w), Math.round(b.h));
  const texto = cena.add.text(Math.round(b.w / 2), Math.round(b.h / 2), titulo, letra(Math.round(16 * u), '#ffffff', { stroke: '#1e293b', strokeThickness: Math.round(4 * u) })).setOrigin(0.5);
  caixa.add(texto);
  // Container hit areas are centered on its local origin; use explicit top-left geometry.
  const area = cena.add.zone(0, 0, b.w, b.h).setOrigin(0).setInteractive({ useHandCursor: true });
  area.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => { ev.stopPropagation(); acao(); });
  const hover = cor === COR_BOTAO ? COR_BOTAO_HOVER : cor;
  area.on('pointerover', () => { texto.setColor('#FFD93B'); desenharBotao(fundo, Math.round(b.w), Math.round(b.h), u, hover); })
    .on('pointerout', () => { texto.setColor('#ffffff'); desenharBotao(fundo, Math.round(b.w), Math.round(b.h), u, cor); });
  caixa.add(area);
  return { caixa, texto };
}

// `rotulos` swaps the tooltips and icons (Mars: the lander, and heating instead of rocket parts).
// A box taller than wide stacks the five counters in a column (the side HUD); otherwise they sit in a row.
export function criarCapsulaRecursos(cena: Phaser.Scene, b: Caixa, u: number, rotulos?: { nomes: string[]; icones: string[] }) {
  const vertical = b.h > b.w;
  const caixa = criarPilula(cena, b.x, b.y, b.w, b.h, u, CONTORNO, 0xffffff, vertical ? Math.round(Math.min(22 * u, b.w / 2)) : undefined);
  const nomes = rotulos?.nomes ?? ['Batteries at the Battery Bank', 'Carrying batteries', 'Life support: batteries delivered today', 'Shield: batteries delivered today', 'Parts: batteries delivered to the rocket workshop today'];
  const icones = rotulos?.icones ?? ['energy', 'backpack', 'heart', 'shield', 'wrench'];
  const cores = ['#fde047', '#fde047', '#4ade80', '#fde047', '#60a5fa'];
  const numeros: Phaser.GameObjects.Text[] = [];
  const divisores = cena.add.graphics().lineStyle(Math.max(1, Math.round(u)), 0xffffff, 0.3);
  caixa.add(divisores);
  const tooltip = cena.add.container(0, 0).setDepth(30).setVisible(false);
  const fundo = cena.add.graphics();
  const texto = cena.add.text(0, 0, '', letra(Math.round(14 * u))).setOrigin(0, 0.5);
  tooltip.add([fundo, texto]);
  const fatia = (vertical ? b.h : b.w) / 5;
  for (let i = 0; i < 5; i++) {
    const inicio = Math.round(i * fatia);
    const x = vertical ? Math.round(b.w / 2 - 20 * u) : inicio;
    const centro = vertical ? Math.round(inicio + fatia / 2) : Math.round(b.h / 2);
    if (i && vertical) divisores.lineBetween(Math.round(8 * u), inicio, b.w - Math.round(8 * u), inicio);
    else if (i) divisores.lineBetween(inicio, Math.round(8 * u), inicio, b.h - Math.round(8 * u));
    const simbolo = criarIconeJogo(cena, x + Math.round(14 * u), centro, icones[i], Math.round(23 * u));
    const numero = cena.add.text(x + Math.round(29 * u), centro, '0', letra(Math.round(19 * u), cores[i])).setOrigin(0, 0.5);
    numeros.push(numero);
    caixa.add([simbolo, numero]);
  }
  // Observe pointer movement without hit areas, so tooltips never consume map clicks.
  const mover = (p: Phaser.Input.Pointer) => {
    if (!caixa.visible || p.x < b.x || p.x >= b.x + b.w || p.y < b.y || p.y >= b.y + b.h) { tooltip.setVisible(false); return; }
    const i = Math.min(4, Math.floor((vertical ? p.y - b.y : p.x - b.x) / fatia));
    texto.setText(nomes[i]);
    const pad = Math.round(10 * u), h = Math.round(30 * u), w = texto.width + 2 * pad;
    if (vertical) {
      // Beside the row it explains, to the right of the column.
      const x = Math.round(Math.min(b.x + b.w + 8 * u, cena.scale.width - w - 2));
      tooltip.setPosition(x, Math.round(b.y + i * fatia + fatia / 2 - h / 2)).setVisible(true);
    } else {
      const x = Math.round(Math.max(2, Math.min(b.x + i * fatia, cena.scale.width - w - 2)));
      tooltip.setPosition(x, b.y + b.h + Math.round(8 * u)).setVisible(true);
    }
    texto.setPosition(pad, Math.round(h / 2));
    fundo.clear().fillStyle(CONTORNO).fillRoundedRect(0, 0, w, h, h / 2).lineStyle(Math.max(1, Math.round(u)), 0xffffff).strokeRoundedRect(0, 0, w, h, h / 2);
  };
  const ocultar = () => tooltip.setVisible(false);
  cena.input.on('pointermove', mover).on('gameout', ocultar);
  caixa.once('destroy', () => { cena.input.off('pointermove', mover).off('gameout', ocultar); tooltip.destroy(); });
  return { caixa, atualizar: (valores: number[]) => { if (!caixa.visible) tooltip.setVisible(false); numeros.forEach((t, i) => t.setText(String(valores[i]))); } };
}


// Decorative keycaps and hints deliberately have no input zones.
export function criarTecla(cena: Phaser.Scene, x: number, cy: number, tecla: string, u: number) {
  const px = (n: number) => Math.round(n * u);
  const texto = cena.add.text(px(6), 0, tecla, letra(px(12), '#0b1a4a')).setOrigin(0, 0.5);
  const w = Math.round(texto.width) + px(12), h = px(22);
  const g = cena.add.graphics().fillStyle(0x94a3b8).fillRoundedRect(0, -Math.round(h / 2) + px(2), w, h, px(5))
    .fillStyle(0xffffff).fillRoundedRect(0, -Math.round(h / 2), w, h - px(1), px(5))
    .lineStyle(Math.max(1, px(1.5)), CONTORNO).strokeRoundedRect(0, -Math.round(h / 2), w, h + px(2), px(5));
  return cena.add.container(Math.round(x), Math.round(cy), [g, texto]).setSize(w, h);
}

export function criarPilulaDicas(cena: Phaser.Scene, b: Caixa, u: number, vertical = false, reservaDireita = 0) {
  const px = (n: number) => Math.round(n * u);
  const caixa = criarPilula(cena, b.x, b.y, b.w, b.h, u, CONTORNO, 0xffffff, vertical ? px(16) : undefined);
  const grupos = [['WASD', 'Walk'], ['Space', 'Jump'], ['E', 'Use room'], ['Scroll', 'Zoom']];
  const g = cena.add.graphics().lineStyle(Math.max(1, px(1)), 0xffffff, 0.3);
  caixa.add(g);
  const pad = px(12), util = (vertical ? b.h : b.w - reservaDireita) - 2 * pad;
  grupos.forEach(([tecla, descricao], i) => {
    const inicio = Math.round(i * util / 4), fim = Math.round((i + 1) * util / 4);
    const x = vertical ? pad : pad + inicio;
    const cy = vertical ? pad + Math.round((inicio + fim) / 2) : Math.round(b.h / 2);
    if (i) {
      if (vertical) g.lineBetween(pad, pad + inicio, b.w - pad, pad + inicio);
      else g.lineBetween(x - px(5), px(9), x - px(5), b.h - px(9));
    }
    const key = criarTecla(cena, x, cy, tecla, u);
    const label = cena.add.text(x + key.width + px(6), cy, descricao, letra(px(13))).setOrigin(0, 0.5);
    caixa.add([key, label]);
  });
  return caixa;
}

// Round blue button of the title screen (blue disc, white ring, dark outline) drawn around (0, 0).
// k = 1 is the title screen size: 52 px across.
export const discoAzul = (g: Phaser.GameObjects.Graphics, k: number, cor = 0x2563eb) =>
  g.fillStyle(cor).fillCircle(0, 0, 23 * k).lineStyle(4 * k, 0xffffff).strokeCircle(0, 0, 23 * k).lineStyle(2 * k, CONTORNO).strokeCircle(0, 0, 26 * k);

// The settings gear on the blue disc (title screen and game HUD).
export function desenharEngrenagem(g: Phaser.GameObjects.Graphics, k: number) {
  discoAzul(g, k);
  const dentes: { x: number; y: number }[] = [];
  for (let i = 0; i < 32; i++) {
    const angulo = -Math.PI / 2 + i * Math.PI / 16;
    const raio = (i % 4 === 1 || i % 4 === 2 ? 20 : 15) * k;
    dentes.push({ x: Math.cos(angulo) * raio, y: Math.sin(angulo) * raio });
  }
  g.fillStyle(0xffffff).fillPoints(dentes, true).lineStyle(1.5 * k, CONTORNO).strokePoints(dentes, true);
  g.fillStyle(0x2563eb).fillCircle(0, 0, 7 * k).lineStyle(2 * k, CONTORNO).strokeCircle(0, 0, 7 * k);
  return g;
}

// Round button in box b: grows a little under the pointer, clicks, and shows a small label below.
// The hit area is a fixed zone, so the growing picture never changes what is under the pointer.
export function criarBotaoRedondo(cena: Phaser.Scene, b: Caixa, desenhar: (g: Phaser.GameObjects.Graphics, k: number) => void, dica: string, acao: () => void) {
  const px = (n: number) => Math.round(n * b.w / 52 * 1.35);
  const k = b.w / 52;
  const g = cena.add.graphics();
  desenhar(g, k);
  const visual = cena.add.container(Math.round(b.w / 2), Math.round(b.h / 2), [g]);
  const caixa = cena.add.container(b.x, b.y, [visual]).setSize(b.w, b.h);
  const tooltipH = px(26);
  const tooltip = criarPilula(cena, 0, b.y + b.h + px(8), 10, tooltipH, b.w / 38).setDepth(30).setVisible(false);
  const texto = cena.add.text(0, Math.round(tooltipH / 2), '', letra(px(13))).setOrigin(0.5);
  tooltip.add(texto);
  const definirDica = (s: string) => {
    texto.setText(s);
    const w = Math.round(texto.width + px(24));
    tooltip.removeAt(0, true);
    tooltip.addAt(criarPilula(cena, 0, 0, w, tooltipH, b.w / 38), 0);
    texto.setX(Math.round(w / 2));
    tooltip.setX(Math.round(Math.min(cena.scale.width - w - 4, b.x + b.w / 2 - w / 2)));
  };
  definirDica(dica);
  const area = cena.add.zone(0, 0, b.w, b.h).setOrigin(0).setInteractive({ useHandCursor: true });
  area.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => { ev.stopPropagation(); tocarSfx('clique'); acao(); });
  area.on('pointerover', () => { visual.setScale(1.1); tooltip.setVisible(true); tocarSfx('suave'); })
    .on('pointerout', () => { visual.setScale(1); tooltip.setVisible(false); });
  caixa.add(area);
  caixa.once('destroy', () => tooltip.destroy());
  return { caixa, visual, definirDica };
}

export function criarBotaoConfiguracoes(cena: Phaser.Scene, b: Caixa, acao: () => void) {
  return criarBotaoRedondo(cena, b, desenharEngrenagem, 'Settings', acao).caixa;
}


// Vector controls avoid font-dependent glyph baselines and share the same visual center.
export function criarBotaoZoom(cena: Phaser.Scene, b: Caixa, u: number, icone: 'mais' | 'menos' | 'casa', acao: () => void) {
  const botao = criarBotaoPilula(cena, b, u, '', acao);
  botao.texto.setVisible(false);
  const g = cena.add.graphics();
  const cx = Math.round(b.w / 2), cy = Math.round(b.h / 2);
  const x = (v: number) => cx + Math.round(v * u), y = (v: number) => cy + Math.round(v * u);
  const desenhar = (cor: number) => {
    g.clear().lineStyle(Math.max(2, Math.round(2.5 * u)), cor);
    if (icone === 'casa') {
      g.beginPath().moveTo(x(-9), y(-1)).lineTo(x(0), y(-8)).lineTo(x(9), y(-1)).strokePath();
      g.beginPath().moveTo(x(-6), y(-1)).lineTo(x(-6), y(8)).lineTo(x(6), y(8)).lineTo(x(6), y(-1)).strokePath();
      g.beginPath().moveTo(x(-2), y(8)).lineTo(x(-2), y(2)).lineTo(x(2), y(2)).lineTo(x(2), y(8)).strokePath();
    } else {
      g.lineBetween(x(-6), y(0), x(6), y(0));
      if (icone === 'mais') g.lineBetween(x(0), y(-6), x(0), y(6));
    }
  };
  desenhar(0xffffff);
  botao.caixa.add(g);
  const area = botao.caixa.list.find(o => o.type === 'Zone')!;
  area.on('pointerover', () => desenhar(0xffd93b)).on('pointerout', () => desenhar(0xffffff));
  return botao.caixa;
}


export function criarDicasRecolhiveis(cena: Phaser.Scene, b: Caixa, abaB: Caixa, fechadoX: number, u: number, compacto: boolean, recolhido: boolean, aoAlternar: (valor: boolean) => void) {
  const px = (n: number) => Math.round(n * u);
  const caixa = cena.add.container(b.x, b.y);
  const painel = criarPilulaDicas(cena, { x: 0, y: 0, w: b.w, h: b.h }, u, compacto, compacto ? 0 : px(30));
  const aba = cena.add.container(abaB.x, abaB.y);
  const fundo = cena.add.graphics();
  const cx = Math.round(abaB.w / 2), cy = Math.round(abaB.h / 2);
  const setaX = cx - Math.max(1, px(2));
  const seta = cena.add.graphics().setPosition(setaX, cy);
  const teclado = cena.add.graphics();
  teclado.lineStyle(Math.max(1, px(1.2)), 0xffffff).strokeRoundedRect(-px(7), -px(5), px(14), px(10), px(2));
  for (let j = 0; j < 2; j++) for (let i = 0; i < 4; i++) teclado.fillStyle(0xffffff).fillRect(-px(5) + px(3) * i, -px(3) + px(3) * j, Math.max(1, px(1.5)), Math.max(1, px(1)));
  teclado.lineStyle(Math.max(1, px(1)), 0xffffff).lineBetween(-px(3), px(3), px(3), px(3));
  teclado.setPosition(cx, cy);
  const areaPainel = cena.add.zone(0, 0, b.w, b.h).setOrigin(0).setInteractive({ useHandCursor: true });
  const areaAba = cena.add.zone(0, 0, abaB.w, abaB.h).setOrigin(0).setInteractive({ useHandCursor: true });
  aba.add([fundo, seta, teclado, areaAba]);
  caixa.add([painel, areaPainel, aba]);
  // Clip the sliding drawer to the left HUD margin, including its stroke.
  const recorte = cena.make.graphics({}, false).fillStyle(0xffffff).fillRect(b.x - px(3), b.y - px(6), cena.scale.width - b.x + px(6), b.h + px(12));
  const mascara = recorte.createGeometryMask();
  caixa.setMask(mascara);
  const tooltip = criarPilula(cena, b.x, b.y + abaB.y - px(34), px(94), px(26), u).setDepth(30).setVisible(false);
  tooltip.add(cena.add.text(px(47), px(13), 'Controls', letra(px(13))).setOrigin(0.5));
  let estado = recolhido, animando = false, hover = false;
  const pintar = () => {
    fundo.clear();
    const soIcone = estado && !animando;
    // Expanded: just the arrow inside the panel, with no independent border or background.
    if (soIcone) fundo.fillStyle(0x000000, 0.3).fillRoundedRect(px(2), px(4), abaB.w, abaB.h, px(8))
      .fillStyle(hover ? COR_BOTAO_HOVER : COR_BOTAO).fillRoundedRect(0, 0, abaB.w, abaB.h, px(8))
      .lineStyle(Math.max(1, px(2.5)), 0xffffff).strokeRoundedRect(0, 0, abaB.w, abaB.h, px(8))
      .lineStyle(Math.max(1, px(1.5)), CONTORNO).strokeRoundedRect(-px(2), -px(2), abaB.w + px(4), abaB.h + px(4), px(10));
    const sentido = estado ? 1 : -1;
    seta.clear().lineStyle(Math.max(2, px(2.5)), hover ? 0xfde047 : 0xffffff)
      .beginPath().moveTo(-sentido * px(3), -px(5)).lineTo(sentido * px(3), 0).lineTo(-sentido * px(3), px(5)).strokePath();
    teclado.setVisible(soIcone); seta.setVisible(!soIcone);
  };
  const definir = (valor: boolean, animar = true) => {
    animar = animar && !movimentoReduzido();
    estado = valor;
    tooltip.setVisible(false);
    cena.tweens.killTweensOf(caixa);
    animando = animar;
    painel.setVisible(true);
    if (valor) areaPainel.disableInteractive(); else areaPainel.setInteractive({ useHandCursor: true });
    pintar();
    const concluir = () => { animando = false; caixa.x = Math.round(valor ? fechadoX : b.x); painel.setVisible(!valor); pintar(); };
    if (!animar) { concluir(); return; }
    cena.tweens.add({ targets: caixa, x: valor ? fechadoX : b.x, duration: 250, ease: 'Sine.easeInOut',
      onUpdate: () => { caixa.x = Math.round(caixa.x); }, onComplete: concluir });
  };
  const alternar = (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => {
    ev.stopPropagation();
    const valor = !estado;
    aoAlternar(valor);
    definir(valor);
  };
  areaAba.on('pointerdown', alternar); areaPainel.on('pointerdown', alternar);
  areaAba.on('pointerover', () => {
    hover = true; pintar();
    cena.tweens.killTweensOf([seta, teclado]);
    cena.tweens.add({ targets: seta, x: setaX + (movimentoReduzido() ? 0 : estado ? px(2) : -px(2)), duration: 120, ease: 'Sine.easeOut' });
    cena.tweens.add({ targets: teclado, x: cx + (movimentoReduzido() ? 0 : estado ? px(2) : -px(2)), duration: 120, ease: 'Sine.easeOut' });
    tooltip.setVisible(estado && !animando);
  }).on('pointerout', () => {
    hover = false; pintar(); tooltip.setVisible(false);
    cena.tweens.killTweensOf([seta, teclado]);
    cena.tweens.add({ targets: seta, x: setaX, duration: 120, ease: 'Sine.easeOut' });
    cena.tweens.add({ targets: teclado, x: cx, duration: 120, ease: 'Sine.easeOut' });
  });
  caixa.once('destroy', () => { tooltip.destroy(); mascara.destroy(); recorte.destroy(); });
  definir(recolhido, false);
  return { caixa, painel, aba, areaPainel, areaAba, definir, get recolhida() { return estado; } };
}
