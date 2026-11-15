// Generated with AI assistance (Claude). See README, "Use of AI tools".
// "Map the Route": join the stars of a constellation in numbered order, dragging a line from star to star.
// The rules live in ../mapear-rota-tarefa.ts (pure functions, tested); this scene only draws and reads the mouse.
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { criarConstelacao, ligarEstrela, estrelaNoPonto, proximaEstrela, constelacaoConcluida, type Constelacao } from '../mapear-rota-tarefa';
import { abrirPainel, moldura, faixaTitulo, barraStatus, botaoFechar, rajada, canvas, texto, concluirTarefa } from './moldura';

const QUADRO_W = 704;
const QUADRO_H = Math.round(QUADRO_W * 480 / 660);   // same shape as the Life Support panel
const FOLGA = (QUADRO_H - 456) / 2;   // the frame is taller than the layout was drawn for: centre the content
const INSTRUCAO = 'Join the stars: 1, 2, 3...';

export class MapearRotaTarefa extends Phaser.Scene {
  private aoConcluir?: () => void;

  constructor() { super('MapearRotaTarefa'); }

  init(dados?: { aoConcluir?: () => void }) { this.aoConcluir = dados?.aoConcluir; }

  private criarTexturas(c: Constelacao) {
    // Flat blue screen with a slightly darker top band and a few stars.
    canvas(this, 'constel_fundo_v2', c.largura, c.altura, (x) => {
      x.fillStyle = '#2563eb'; x.fillRect(0, 0, c.largura, c.altura);
      x.fillStyle = 'rgba(0,0,0,0.12)'; x.fillRect(0, 0, c.largura, c.altura * 0.2);
      for (let i = 0; i < 70; i++) {
        const px = (Math.sin(i * 12.9898) * 43758.5453 % 1 + 1) % 1 * c.largura;
        const py = (Math.sin(i * 78.233) * 24634.6345 % 1 + 1) % 1 * c.altura;
        x.fillStyle = 'rgba(255,255,255,0.8)';
        x.beginPath(); x.arc(px, py, i % 7 === 0 ? 2.2 : 1.4, 0, Math.PI * 2); x.fill();
      }
    });
    // A flat star (2x) with a thick outline; two colours (gold when joined, pale blue when not).
    const estrela = (chave: string, cor: string) => canvas(this, chave, 160, 160, (x) => {
      x.translate(80, 80);
      const pontas = 5, ro = 54, ri = 30;
      x.beginPath();
      for (let i = 0; i < pontas * 2; i++) {
        const r = i % 2 === 0 ? ro : ri, a = -Math.PI / 2 + (i * Math.PI) / pontas;
        x.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      x.closePath();
      x.fillStyle = cor; x.fill();
      x.lineJoin = 'round'; x.lineWidth = 9; x.strokeStyle = '#1e293b'; x.stroke();
    });
    estrela('constel_estrela_apagada_v2', '#bfdbfe');
    estrela('constel_estrela_acesa_v2', '#fde047');
  }

  create() {
    let estado: Constelacao = criarConstelacao();
    this.criarTexturas(estado);
    const { raiz, s } = abrirPainel(this, QUADRO_W + 60, QUADRO_H + 80);
    moldura(this, raiz, QUADRO_W, QUADRO_H);
    faixaTitulo(this, raiz, QUADRO_H, 'Navigation - Map the Route');
    const msg = barraStatus(this, raiz, QUADRO_H, INSTRUCAO);
    botaoFechar(this, raiz, QUADRO_W, QUADRO_H);

    // ---- The sky window.
    const JX = -estado.largura / 2, JY = -QUADRO_H / 2 + 36 + FOLGA;
    const rim = this.add.graphics();
    rim.lineStyle(5, 0x1e293b, 1).strokeRoundedRect(JX, JY, estado.largura, estado.altura, 18);
    const janela = this.add.container(JX, JY);
    raiz.add(janela);
    raiz.add(rim);
    const mascara = this.make.graphics({}, false);
    mascara.fillStyle(0xffffff).fillRoundedRect(raiz.x + JX * s, raiz.y + JY * s, estado.largura * s, estado.altura * s, 18 * s);
    janela.setMask(mascara.createGeometryMask());
    this.events.once('shutdown', () => mascara.destroy());
    janela.add(this.add.image(0, 0, 'constel_fundo_v2').setOrigin(0));

    const linhas = this.add.graphics();
    janela.add(linhas);

    // ---- The stars: shadow, body, number, and a pulsing ring on the next one.
    const corpos = estado.estrelas.map((e) => {
      const corpo = this.add.image(e.x, e.y, e.ligada ? 'constel_estrela_acesa_v2' : 'constel_estrela_apagada_v2').setScale(0.5);
      const num = texto(this, e.x, e.y + 3, String(e.numero), 20, '#ffffff', 0x1e293b);
      janela.add([corpo, num]);
      return { corpo, num };
    });
    const anel = this.add.graphics();
    janela.add(anel);
    const anelAlvo = { r: 30, a: 0.9 };
    this.tweens.add({ targets: anelAlvo, r: 42, a: 0.15, duration: 700, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });

    let arrastando = false;
    let acabou = false;
    let ponteiro = { x: 0, y: 0 };
    let ultimoErro = 0;

    const desenhar = () => {
      linhas.clear();
      const ligadas = estado.estrelas.filter((e) => e.ligada);
      const trilha = (larg: number, cor: number, alfa: number) => {
        linhas.lineStyle(larg, cor, alfa).beginPath();
        ligadas.forEach((e, i) => (i === 0 ? linhas.moveTo(e.x, e.y) : linhas.lineTo(e.x, e.y)));
        if (arrastando && !acabou && ligadas.length) linhas.lineTo(ponteiro.x, ponteiro.y);
        linhas.strokePath();
      };
      trilha(9, 0x1e293b, 1); trilha(4.5, 0xfde047, 1);
      anel.clear();
      const prox = estado.estrelas.find((e) => e.numero === proximaEstrela(estado));
      if (prox && !acabou) anel.lineStyle(4, 0xffffff, Math.max(0.5, anelAlvo.a)).strokeCircle(prox.x, prox.y, anelAlvo.r);
    };

    const local = (p: Phaser.Input.Pointer) => ({
      x: Phaser.Math.Clamp((p.x - raiz.x) / s - JX, 0, estado.largura),
      y: Phaser.Math.Clamp((p.y - raiz.y) / s - JY, 0, estado.altura),
    });
    const dentro = (p: Phaser.Input.Pointer) => {
      const x = (p.x - raiz.x) / s - JX, y = (p.y - raiz.y) / s - JY;
      return x >= 0 && y >= 0 && x <= estado.largura && y <= estado.altura;
    };

    const vencer = () => {
      acabou = true; arrastando = false;
      msg('Constellation complete!', '#86efac');
      const brilho = this.add.rectangle(0, 0, estado.largura, estado.altura, 0xffffff, 0.5).setOrigin(0);
      janela.add(brilho);
      this.tweens.add({ targets: brilho, alpha: 0, duration: 900 });
      rajada(this, janela, estado.largura / 2, estado.altura / 2, [0xfde047, 0xfbcfe8, 0x7dd3fc, 0xc4b5fd], 30, 200);
      corpos.forEach((o, i) => this.tweens.add({ targets: o.corpo, scale: 0.62, yoyo: true, duration: 260, delay: i * 90 }));
      const faixa = this.add.graphics()
        .fillStyle(0x16a34a, 1).fillRoundedRect(-270, -58, 540, 116, 40)
        .lineStyle(5, 0x1e293b, 1).strokeRoundedRect(-270, -58, 540, 116, 40);
      const bloco = this.add.container(estado.largura / 2, estado.altura - 72, [
        faixa,
        texto(this, 0, -16, 'Route drawn!', 38, '#ffffff', 0x14532d),
        texto(this, 0, 28, 'Sailors found their way by the stars!', 15, '#dcfce7', 0x14532d),
      ]).setScale(0).setDepth(40);
      janela.add(bloco);
      this.tweens.add({ targets: bloco, scale: 1, duration: 200, delay: 50, ease: 'Back.easeOut' });
      concluirTarefa(this, this.aoConcluir);
    };

    const tentar = (p: Phaser.Input.Pointer) => {
      const l = local(p);
      ponteiro = l;
      if (acabou) return;
      const n = estrelaNoPonto(estado, l);
      if (n) {
        const novo = ligarEstrela(estado, n);
        if (novo !== estado) {
          estado = novo;
          tocarSfx('bip');
          const e = estado.estrelas[n - 1];
          corpos[n - 1].corpo.setTexture('constel_estrela_acesa_v2');
          this.tweens.add({ targets: corpos[n - 1].corpo, scale: 0.72, yoyo: true, duration: 170, ease: 'Sine.easeOut' });
          rajada(this, janela, e.x, e.y, [0xfde047, 0xfff7c2, 0x7dd3fc], 9, 60);
          if (constelacaoConcluida(estado)) { vencer(); } else { msg(`Great job! Now star ${proximaEstrela(estado)}.`, '#fde68a'); }
        } else if (!estado.estrelas[n - 1].ligada && this.time.now - ultimoErro > 700) {
          // A star out of order: a gentle shake and a hint, nothing is lost.
          ultimoErro = this.time.now;
          tocarSfx('erro');
          msg(`Follow the numbers: now it is star ${proximaEstrela(estado)}.`, '#fca5a5');
          const c = corpos[n - 1].corpo, x0 = c.x;
          this.tweens.add({ targets: c, x: x0 + 5, yoyo: true, repeat: 3, duration: 55, onComplete: () => c.setX(x0) });
        }
      }
    };

    const aoPressionar = (p: Phaser.Input.Pointer) => { if (dentro(p) && !acabou) { arrastando = true; tentar(p); } };
    const aoMover = (p: Phaser.Input.Pointer) => { if (arrastando) tentar(p); };
    const aoSoltar = () => { arrastando = false; };
    this.input.on('pointerdown', aoPressionar);
    this.input.on('pointermove', aoMover);
    this.input.on('pointerup', aoSoltar);
    this.input.on('gameout', aoSoltar);
    this.events.on('update', desenhar);
    this.events.once('shutdown', () => {
      this.events.off('update', desenhar);
      this.input.off('pointerdown', aoPressionar);
      this.input.off('pointermove', aoMover);
      this.input.off('pointerup', aoSoltar);
      this.input.off('gameout', aoSoltar);
    });
  }
}
