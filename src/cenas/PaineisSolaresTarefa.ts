// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Energy - Solar panels": wipe the moon dust off 3 panels, then tilt each one toward the Sun to charge the batteries.
// The rules live in ../paineis-solares-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import {
  criarPaineis, limparPoeira, inclinarPainel, potenciaTotal, painelPronto, tarefaConcluida,
  POTENCIA_PRONTA, ANGULO_MAX, type EstadoPaineis,
} from '../paineis-solares-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto, concluirTarefa } from './moldura';

const QUADRO_W = 760;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);
const FOLGA = (QUADRO_H - 500) / 2;
const JANELA_W = 600, JANELA_H = 310;
const PIVO_Y = 232;                                  // where the panel arms stand on the ground
const PLACA_W = 120, PLACA_H = 44, PLACA_Y = -30;    // the plate, centred 30px above its pivot
const COLUNAS = 6, LINHAS = 4, RAIO_ESCOVA = 17;
const XS = [100, 300, 500];
export const PAINEL = { JANELA_W, JANELA_H, PIVO_Y, PLACA_W, PLACA_H, PLACA_Y, QUADRO_W, QUADRO_H, FOLGA };

// Sky, solar plate and Sun textures; shared with the other solar panel tasks (SeguirSolTarefa, ForaDaSombraTarefa).
export function texturasPaineis(cena: Phaser.Scene) {
  // Sky and moon ground.
  canvas(cena, 'paineis_fundo_v1', JANELA_W, JANELA_H, (c) => {
    c.save(); c.beginPath(); c.roundRect(0, 0, JANELA_W, JANELA_H, 18); c.clip();
    const g = c.createLinearGradient(0, 0, 0, JANELA_H);
    g.addColorStop(0, '#0b1230'); g.addColorStop(1, '#1e2a5a');
    c.fillStyle = g; c.fillRect(0, 0, JANELA_W, JANELA_H);
    c.fillStyle = '#ffffff';
    for (let i = 0; i < 40; i++) { const x = (i * 97) % JANELA_W, y = (i * 53) % 190; c.globalAlpha = 0.3 + (i % 4) * 0.15; c.fillRect(x, y, 2, 2); }
    c.globalAlpha = 1;
    c.fillStyle = '#9ca3af'; c.fillRect(0, 240, JANELA_W, JANELA_H - 240);
    c.fillStyle = '#6b7280'; c.fillRect(0, 240, JANELA_W, 5);
    c.fillStyle = '#7b8190';
    for (const [x, y, r] of [[60, 275, 18], [250, 290, 12], [420, 270, 20], [550, 292, 10]]) { c.beginPath(); c.ellipse(x, y, r, r / 3, 0, 0, Math.PI * 2); c.fill(); }
    c.restore();
    c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.beginPath(); c.roundRect(2.5, 2.5, JANELA_W - 5, JANELA_H - 5, 16); c.stroke();
  });
  // The solar plate: white frame, blue cells.
  canvas(cena, 'paineis_placa_v2', PLACA_W + 12, PLACA_H + 12, (c) => {
    c.translate(6, 6);
    // Frame: metallic gradient with a dark outline.
    const fr = c.createLinearGradient(0, 0, 0, PLACA_H);
    fr.addColorStop(0, '#f8fafc'); fr.addColorStop(1, '#94a3b8');
    c.fillStyle = fr; c.beginPath(); c.roundRect(0, 0, PLACA_W, PLACA_H, 7); c.fill();
    c.lineWidth = 4; c.strokeStyle = '#1e293b'; c.stroke();
    // Dark backing behind the cells.
    c.fillStyle = '#0f172a'; c.beginPath(); c.roundRect(4, 4, PLACA_W - 8, PLACA_H - 8, 4); c.fill();
    const cw = (PLACA_W - 10) / COLUNAS, ch = (PLACA_H - 10) / LINHAS;
    for (let i = 0; i < COLUNAS; i++) for (let j = 0; j < LINHAS; j++) {
      const x = 5 + i * cw + 1, y = 5 + j * ch + 1, w = cw - 2, h = ch - 2;
      const g = c.createLinearGradient(x, y, x + w, y + h);
      g.addColorStop(0, '#60a5fa'); g.addColorStop(0.5, '#2563eb'); g.addColorStop(1, '#1e3a8a');
      c.fillStyle = g; c.beginPath(); c.roundRect(x, y, w, h, 1.5); c.fill();
      // Thin silver busbars, like real silicon cells.
      c.fillStyle = 'rgba(226,232,240,0.55)';
      c.fillRect(x + w * 0.33, y, 0.8, h); c.fillRect(x + w * 0.66, y, 0.8, h);
    }
    // Diagonal glare across the glass.
    c.save(); c.beginPath(); c.roundRect(4, 4, PLACA_W - 8, PLACA_H - 8, 4); c.clip();
    const br = c.createLinearGradient(0, 0, PLACA_W, PLACA_H);
    br.addColorStop(0, 'rgba(255,255,255,0.35)'); br.addColorStop(0.35, 'rgba(255,255,255,0.08)'); br.addColorStop(0.36, 'rgba(255,255,255,0)'); br.addColorStop(1, 'rgba(255,255,255,0)');
    c.fillStyle = br; c.fillRect(0, 0, PLACA_W, PLACA_H);
    c.restore();
    // Frame highlight.
    c.lineWidth = 1.5; c.strokeStyle = 'rgba(255,255,255,0.8)'; c.beginPath(); c.roundRect(2, 2, PLACA_W - 4, PLACA_H - 4, 5); c.stroke();
  });
  canvas(cena, 'paineis_sol_v1', 120, 120, (c) => {
    c.lineCap = 'round'; c.strokeStyle = '#fde047'; c.lineWidth = 6;
    for (let i = 0; i < 12; i++) { const a = i * Math.PI / 6; c.beginPath(); c.moveTo(60 + Math.cos(a) * 34, 60 + Math.sin(a) * 34); c.lineTo(60 + Math.cos(a) * 52, 60 + Math.sin(a) * 52); c.stroke(); }
    c.fillStyle = '#facc15'; c.beginPath(); c.arc(60, 60, 28, 0, Math.PI * 2); c.fill();
    c.lineWidth = 5; c.strokeStyle = '#1e293b'; c.stroke();
  });
}

export class PaineisSolaresTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('PaineisSolaresTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  create() {
    let estado: EstadoPaineis = criarPaineis(Math.floor(Math.random() * 100000));
    texturasPaineis(this);
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Charge the panels');
    const msg = barraStatus(this, raiz, QUADRO_H, 'Wipe the dust off the panels.');
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    const JX = -JANELA_W / 2, JY = -QUADRO_H / 2 + 40 + FOLGA;
    const janela = this.add.container(JX, JY);
    raiz.add(janela);
    janela.add(this.add.image(0, 0, 'paineis_fundo_v1').setOrigin(0));

    // ---- The Sun: its place in the sky follows the Sun angle.
    const rad = (g: number) => (g * Math.PI) / 180;
    const dirSol = { x: Math.sin(rad(estado.anguloSol)), y: -Math.cos(rad(estado.anguloSol)) };
    const sol = this.add.image(JANELA_W / 2 + dirSol.x * 250, 52, 'paineis_sol_v1');
    janela.add(sol);
    this.tweens.add({ targets: sol, angle: 360, duration: 24000, repeat: -1 });

    // ---- Panels.
    const N = estado.paineis.length;
    const celulas = Array.from({ length: N }, () => new Set<number>(Array.from({ length: COLUNAS * LINHAS }, (_, k) => k)));
    const postes = this.add.graphics();
    janela.add(postes);
    const paineis = estado.paineis.map((p, i) => {
      postes.fillStyle(0x000000, 0.25).fillEllipse(XS[i], 258, 70, 10);   // ground shadow
      postes.fillStyle(0x1e293b, 1).fillRect(XS[i] - 6, PIVO_Y, 12, 26);
      postes.fillStyle(0x94a3b8, 1).fillRect(XS[i] - 3, PIVO_Y, 6, 26);
      postes.fillStyle(0x1e293b, 1).fillRoundedRect(XS[i] - 24, 252, 48, 10, 4);
      postes.fillStyle(0x64748b, 1).fillRoundedRect(XS[i] - 22, 253, 44, 6, 3);
      const placa = this.add.image(0, PLACA_Y, 'paineis_placa_v2');
      const poeira = this.add.graphics();
      const c = this.add.container(XS[i], PIVO_Y, [placa, poeira]).setAngle(p.angulo);
      const eixo = this.add.circle(XS[i], PIVO_Y, 8, 0xcbd5e1).setStrokeStyle(3, 0x1e293b);
      const cubo = this.add.circle(XS[i], PIVO_Y, 3, 0xfacc15).setStrokeStyle(1.5, 0x1e293b);
      const raio = this.add.graphics();
      const icone = texto(this, XS[i], 120, '⚡', 30, '#fde047', 0x1e293b).setAlpha(0);
      const zona = this.add.zone(XS[i], PIVO_Y - 30, 150, 150).setInteractive();
      janela.add([c, eixo, cubo, raio, icone, zona]);
      return { c, poeira, raio, icone, zona };
    });

    const desenharPoeira = (i: number) => {
      const g = paineis[i].poeira.clear();
      if (estado.paineis[i].poeira === 0) return;
      const cw = (PLACA_W - 10) / COLUNAS, ch = (PLACA_H - 10) / LINHAS;
      for (const k of celulas[i]) {
        const cx = -PLACA_W / 2 + 5 + (k % COLUNAS) * cw, cy = PLACA_Y - PLACA_H / 2 + 5 + Math.floor(k / COLUNAS) * ch;
        g.fillStyle(0x8b7d6b, 0.88).fillRect(cx, cy, cw, ch);
        g.fillStyle(0x6b5f50, 0.9).fillCircle(cx + cw * 0.3, cy + ch * 0.35, 1.8).fillCircle(cx + cw * 0.7, cy + ch * 0.7, 1.4);
      }
    };
    const desenharRaios = () => {
      paineis.forEach((p, i) => {
        const pronto = painelPronto(estado.paineis[i], estado.anguloSol);
        p.raio.clear();
        if (estado.fase !== 'limpar') {   // sunbeam from the Sun toward the plate; bright when the plate squares up to it
          const x = XS[i], y = PIVO_Y - 30;
          p.raio.lineStyle(pronto ? 5 : 3, pronto ? 0xfde047 : 0xfef08a, pronto ? 0.9 : 0.4)
            .lineBetween(x + dirSol.x * 90, y + dirSol.y * 90, x + dirSol.x * 50, y + dirSol.y * 50);
        }
        p.icone.setAlpha(pronto ? 1 : 0);
      });
    };

    // ---- Power bar, with a green line at the "ready" level.
    const medidor = this.add.graphics();
    raiz.add(medidor);
    raiz.add(texto(this, -232, 133, 'Power', 18, '#ffffff', 0x1e293b));
    const pct = texto(this, 222, 133, '0%', 18, '#ffffff', 0x1e293b);
    raiz.add(pct);
    const desenharMedidor = () => {
      const q = potenciaTotal(estado);
      const cor = q < 0.5
        ? Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(239, 68, 68), new Phaser.Display.Color(250, 204, 21), 100, q * 200)
        : Phaser.Display.Color.Interpolate.ColorWithColor(new Phaser.Display.Color(250, 204, 21), new Phaser.Display.Color(34, 197, 94), 100, (q - 0.5) * 200);
      medidor.clear();
      medidor.fillStyle(0xffffff, 1).fillRoundedRect(-160, 120, 340, 26, 13).lineStyle(4, 0x1e293b, 1).strokeRoundedRect(-160, 120, 340, 26, 13);
      if (q > 0.01) medidor.fillStyle(Phaser.Display.Color.GetColor(cor.r, cor.g, cor.b), 1).fillRoundedRect(-157, 123, Math.max(20, 334 * q), 20, 10);
      const lx = -157 + 334 * POTENCIA_PRONTA;
      medidor.lineStyle(4, 0x16a34a, 1).lineBetween(lx, 115, lx, 151);
      pct.setText(`${Math.round(q * 100)}%`);
    };
    const redesenhar = () => { estado.paineis.forEach((_p, i) => desenharPoeira(i)); desenharRaios(); desenharMedidor(); };
    redesenhar();

    // ---- Brush cursor (cleaning phase).
    const escova = this.add.circle(0, 0, RAIO_ESCOVA, 0xffffff, 0.25).setStrokeStyle(3, 0xffffff, 0.9).setVisible(false);
    janela.add(escova);

    let acabou = false;
    let arrastando = -1;
    const aoLocal = (p: Phaser.Input.Pointer) => ({ x: (p.x - raiz.x) / s - JX, y: (p.y - raiz.y) / s - JY });

    const vencer = () => {
      acabou = true;
      escova.setVisible(false);
      msg('Batteries charging!', '#86efac');
      const brilho = this.add.rectangle(0, 0, JANELA_W, JANELA_H, 0xffffff, 0.5).setOrigin(0);
      janela.add(brilho);
      this.tweens.add({ targets: brilho, alpha: 0, duration: 900 });
      rajada(this, janela, JANELA_W / 2, JANELA_H / 2, [0xfde047, 0x86efac, 0x7dd3fc, 0xf9a8d4], 26, 190);
      const faixa = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-270, -58, 540, 116, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-270, -58, 540, 116, 40);
      const bloco = this.add.container(JANELA_W / 2, JANELA_H / 2, [
        faixa,
        texto(this, 0, -16, 'Batteries charging!', 38, '#ffffff', 0x14532d),
        texto(this, 0, 28, 'Panels make the most power when they face the Sun.', 15, '#dcfce7', 0x14532d),
      ]).setScale(0).setDepth(40);
      janela.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 200, delay: 50, ease: 'Back.easeOut' });
      concluirTarefa(this, this.aoConcluir);
    };

    // Phase 1: the pointer is taken into each panel's own (rotated) space to find the dust cells under the brush.
    const limpar = (l: { x: number; y: number }) => {
      let mudou = false;
      paineis.forEach((_p, i) => {
        if (estado.paineis[i].poeira === 0) return;
        const a = -rad(estado.paineis[i].angulo);
        const dx = l.x - XS[i], dy = l.y - PIVO_Y;
        const lx = dx * Math.cos(a) - dy * Math.sin(a), ly = dx * Math.sin(a) + dy * Math.cos(a) - PLACA_Y;
        if (Math.abs(lx) > PLACA_W / 2 + RAIO_ESCOVA || Math.abs(ly) > PLACA_H / 2 + RAIO_ESCOVA) return;
        const cw = (PLACA_W - 10) / COLUNAS, ch = (PLACA_H - 10) / LINHAS;
        let tirou = 0;
        for (const k of [...celulas[i]]) {
          const cx = -PLACA_W / 2 + 5 + (k % COLUNAS) * cw + cw / 2, cy = -PLACA_H / 2 + 5 + Math.floor(k / COLUNAS) * ch + ch / 2;
          if (Math.hypot(lx - cx, ly - cy) <= RAIO_ESCOVA) { celulas[i].delete(k); tirou++; }
        }
        if (!tirou) return;
        estado = limparPoeira(estado, i, tirou / (COLUNAS * LINHAS));
        if (estado.paineis[i].poeira === 0) celulas[i].clear();   // the last specks wipe off by themselves
        mudou = true;
      });
      if (!mudou) return;
      tocarSfx('suave');
      const eraLimpar = estado.fase === 'limpar';
      redesenhar();
      if (!eraLimpar) {
        tocarSfx('ok');
        msg('Clean! Now turn each panel to the Sun.', '#86efac');
        escova.setVisible(false);
      }
    };

    // Phase 2: drag a panel; its plate points toward the pointer, like turning a dish.
    const inclinar = (i: number, l: { x: number; y: number }) => {
      const ang = Phaser.Math.Clamp((Math.atan2(l.x - XS[i], PIVO_Y - l.y) * 180) / Math.PI, -ANGULO_MAX, ANGULO_MAX);
      estado = inclinarPainel(estado, i, ang);
      paineis[i].c.setAngle(estado.paineis[i].angulo);
      desenharRaios(); desenharMedidor();
    };

    paineis.forEach((p, i) => {
      p.zona.on('pointerdown', () => { if (!acabou && estado.fase !== 'limpar') { arrastando = i; tocarSfx('pegar'); } });
    });
    this.input.on('pointerdown', (p: Phaser.Input.Pointer) => { if (!acabou && estado.fase === 'limpar') limpar(aoLocal(p)); });
    this.input.on('pointermove', (p: Phaser.Input.Pointer) => {
      if (acabou) return;
      const l = aoLocal(p);
      if (estado.fase === 'limpar') {
        escova.setVisible(l.x >= 0 && l.x <= JANELA_W && l.y >= 0 && l.y <= JANELA_H).setPosition(l.x, l.y);
        if (p.isDown) limpar(l);
      } else if (arrastando >= 0 && p.isDown) {
        inclinar(arrastando, l);
      }
    });
    this.input.on('pointerup', () => {
      if (arrastando < 0 || acabou) { arrastando = -1; return; }
      arrastando = -1;
      if (tarefaConcluida(estado)) { tocarSfx('sucesso'); vencer(); return; }
      const prontos = estado.paineis.filter((p) => painelPronto(p, estado.anguloSol)).length;
      if (prontos > 0) { tocarSfx('encaixe'); msg(`${prontos} of ${N} panels ready. Keep going!`, '#86efac'); }
      else { tocarSfx('soltar'); msg('Not enough light yet.', '#fde68a'); }
    });

    this.events.once('shutdown', () => { this.input.off('pointerdown'); this.input.off('pointermove'); this.input.off('pointerup'); });
  }
}
