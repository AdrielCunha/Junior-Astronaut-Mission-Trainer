import Phaser from 'phaser';
import { botaoVerde, letra } from '../tarefas/estilo';
import { ROVER_APOLLO } from '../dados/roverApollo';
import { sessao } from './sessao';
import { tocarSfx } from '../sfx';

// Pause the whole game (including the storm) while the first-time fact is read.
export class CuriosidadeRover extends Phaser.Scene {
  private pausadas: string[] = [];

  constructor() { super({ key: 'CuriosidadeRover' }); }

  create() {
    sessao.curiosidadeRoverVista = true;
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
    const u = Math.min(1.15, (W - 28) / 560), px = (n: number) => Math.round(n * u);
    const w = px(560), margem = px(26), util = w - margem * 2;
    this.add.rectangle(0,0,W,H,0x050e25,0.78).setOrigin(0).setInteractive();
    const fundo = this.add.graphics();
    const itens: Phaser.GameObjects.GameObject[] = [fundo];
    let y = margem;
    const legenda = this.add.text(w/2,y,'APOLLO LRV · 1971–1972',letra(px(14),'#93c5fd',{fontStyle:'bold'})).setOrigin(0.5,0);
    itens.push(legenda); y += legenda.height + px(12);
    const titulo = this.add.text(w/2,y,ROVER_APOLLO.titulo,letra(px(28),'#fde047',{
      align:'center',wordWrap:{width:util},stroke:'#07142f',strokeThickness:px(3),
    })).setOrigin(0.5,0);
    itens.push(titulo); y += titulo.height + px(22);
    for (const paragrafo of ROVER_APOLLO.paragrafos) {
      const texto = this.add.text(margem,y,paragrafo,letra(px(19),'#e2e8f0',{
        wordWrap:{width:util,useAdvancedWrap:true},lineSpacing:px(5),
      }));
      itens.push(texto); y += texto.height + px(16);
    }
    const fonte = this.add.text(w/2,y,ROVER_APOLLO.fonte,letra(px(12),'#93a9c4')).setOrigin(0.5,0);
    itens.push(fonte); y += fonte.height + px(20);
    itens.push(botaoVerde(this,w/2,y+px(24),"Let's drive!",px(20),px(48),u,()=>this.fechar(),{
      largura:util,altura:px(48),pulsar:false,pararPropagacao:true,
    }).setData('acao','continuar-rover'));
    y += px(48) + margem;
    fundo.fillStyle(0x14243e).fillRoundedRect(0,0,w,y,px(24))
      .lineStyle(px(3),0x7dd3fc).strokeRoundedRect(0,0,w,y,px(24));
    const escala = Math.min(1,(H-28)/y);
    this.add.container(Math.round((W-w*escala)/2),Math.round((H-y*escala)/2),itens).setScale(escala);
  }
}
