import Phaser from 'phaser';
import { botaoFechar, botaoVerde, letra, moldura } from '../tarefas/estilo';
import { ROVER_APOLLO, ROVER_APOLLO_MARTE } from '../dados/roverApollo';
import { sessao } from './sessao';
import { tocarSfx } from '../sfx';

// Pause the whole game (including the storm) while the first-time fact is read.
// Same window as the title screen's and the tasks' (task frame, title pill, red X, green footer button).
export class CuriosidadeRover extends Phaser.Scene {
  private pausadas: string[] = [];

  constructor() { super({ key: 'CuriosidadeRover' }); }

  create() {
    if (sessao.mundo === 'marte') sessao.curiosidadeRoverMarteVista = true; else sessao.curiosidadeRoverVista = true;
    this.pausadas = [];
    for (const chave of ['Espaco', 'Superficie', 'Interface']) {
      if (!this.scene.isActive(chave)) continue;
      this.scene.get(chave).input.keyboard?.resetKeys();
      this.pausadas.push(chave);
      this.scene.pause(chave);
    }
    this.scene.bringToTop();
    const resize = () => this.desenhar();
    this.scale.on('resize', resize);
    this.input.keyboard?.on('keydown-ENTER', () => this.fechar());
    this.input.keyboard?.on('keydown-ESC', () => this.fechar());
    this.events.once('shutdown', () => {
      this.scale.off('resize', resize);
      for (const chave of this.pausadas) {
        this.scene.get(chave).input.keyboard?.resetKeys();
        if (this.scene.isPaused(chave)) this.scene.resume(chave);
      }
      this.pausadas = [];
    });
    this.desenhar();
  }

  private fechar() {
    tocarSfx('clique');
    this.scene.stop();
  }

  private desenhar() {
    this.children.removeAll(true);
    const W = this.scale.width, H = this.scale.height;
    const u = Phaser.Math.Clamp(Math.min(W / 1100, H / 650), 0.5, 1.4);
    const largura = Math.min(W - 40 * u, 660 * u), alturaFixa = Math.min(H - 40 * u, 480 * u);
    // The screen inside the frame is the panel minus 26u on each side, 38u on top and 92u for the footer.
    const telaW = largura - 52 * u, pad = 22 * u, util = telaW - 2 * pad;

    // Lay the text out once off-screen to size the window; shrink the letters if it would not fit.
    // On Mars the panel jokes that the Apollo rover never really went there.
    const texto = sessao.mundo === 'marte' ? ROVER_APOLLO_MARTE : ROVER_APOLLO;
    const montar = (k: number, adicionar: boolean) => {
      const make = (s: string, estilo: Phaser.Types.GameObjects.Text.TextStyle) =>
        adicionar ? this.add.text(0, 0, s, estilo) : this.make.text({ text: s, style: estilo }, false);
      const titulo = make(texto.titulo, letra(26 * u * k, '#fde047', { align: 'center', wordWrap: { width: util }, stroke: '#1e293b', strokeThickness: 6 * u * k }));
      const paragrafos = texto.paragrafos.map((p) => make(p, letra(18 * u * k, '#ffffff', { wordWrap: { width: util, useAdvancedWrap: true }, lineSpacing: 4 * u * k })));
      const fonte = make(texto.fonte, letra(12 * u * k, '#bfdbfe', { fontStyle: '500' }));
      const pecas = [titulo, ...paragrafos, fonte];
      const espacos = [18, ...paragrafos.map(() => 12)].map((e) => e * u * k);
      const alto = pad * 2 + pecas.reduce((s, t) => s + t.height, 0) + espacos.slice(0, pecas.length - 1).reduce((s, e) => s + e, 0);
      return { titulo, paragrafos, fonte, pecas, espacos, alto };
    };
    let k = 1, m = montar(k, false);
    while (m.alto + 130 * u > alturaFixa && k > 0.6) { m.pecas.forEach((t) => t.destroy()); k -= 0.05; m = montar(k, false); }
    m.pecas.forEach((t) => t.destroy());

    this.add.rectangle(0, 0, W, H, 0x020617, 0.6).setOrigin(0).setInteractive();
    const altura = alturaFixa;
    const x0 = (W - largura) / 2, y0 = (H - altura) / 2 + 8 * u;
    const { tela, rodape, borda } = moldura(this, { x: x0, y: y0, w: largura, h: altura }, u, sessao.mundo === 'marte' ? ROVER_APOLLO_MARTE.pilula : 'APOLLO LRV · 1971–1972');

    const c = montar(k, true);
    let y = tela.y + Math.max(pad, (tela.h - (m.alto - 2 * pad)) / 2);
    c.pecas.forEach((t, i) => {
      if (t === c.titulo || t === c.fonte) t.setOrigin(0.5, 0).setPosition(tela.x + tela.w / 2, y);
      else t.setOrigin(0, 0).setPosition(tela.x + pad, y);
      y += t.height + (c.espacos[i] ?? 0);
    });
    borda();

    botaoVerde(this, x0 + largura / 2, rodape.y + rodape.h / 2, "LET'S DRIVE!  ▶", 20 * u, Math.min(rodape.h, 50 * u), u, () => this.fechar(),
      { pulsar: false, pararPropagacao: true, animarHover: true }).setData('acao', 'continuar-rover');
    botaoFechar(this, x0 + 4 * u, y0 + 4 * u, u, () => this.fechar());
  }
}
