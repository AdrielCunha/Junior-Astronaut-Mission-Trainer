// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Screen-space layer on top of everything: resource bars, build bar, zoom controls, messages,
// and the morning / night / end panels that run the chapter rules (../regras.ts).
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { PRAZO_TEMPESTADE_MS, BATERIAS_TEMPESTADE_EXTREMA, danoDaTempestade } from './tempestadeSolar';
import { configuracoesAbertas, movimentoReduzido } from '../video';
import { CAPITULOS } from '../capitulos';
import { calcularLayoutHud } from './layoutHud';
import { PreferenciaDicas } from './dicasControles';
import { Guia, AvisoEvento, AvisoExpedicao } from './guia';
import { tutorialJaVisto } from './tutorial';
import type { DadosRadar } from './Radar';
import { fimDoDia, resultado, pontuacao, bateriasDoDia, naEnfermaria, DESCANSO, type Estado } from '../regras';
import { iniciarNave3D, iniciarMarte3D, explorarMundo3D } from './irParaMarte';
import { suprimentoDoDia } from '../engine/suprimentos';
import { DOSE_ALARME } from '../engine/eventos';
import { TIPOS } from '../engine/construcao';
import { sessao, fonte, dataBonita, U_INICIAL, COR, type Fase, type RelatorioDia } from './sessao';
import { apagarPartida } from '../salvamento';
import { alternarMudo } from '../audio';
import { letra, criarPilula, criarCapsulaRecursos, criarBotaoPilula, criarIndicador, criarIconeJogo, botaoVerde, criarDicasRecolhiveis, criarTituloHud, criarBotaoZoom, moldura, discoAzul, CONTORNO } from '../tarefas/estilo';
import { resolverIcone, textoDoJogo, type IconeJogo } from '../dados/icones';

type Botao = { texto: string; acao: () => void; principal?: boolean };
// A chat message: a custom equipment icon on the left and a short line.
type Parte = string | { texto: string; icone?: string; cor?: string; negrito?: boolean; tamanho?: number };
// Who is talking in a panel's chat: name over the first bubble, initials on the round avatar.
type Remetente = { nome: string; sigla: string; cor: number };
const CONTROLE: Remetente = { nome: 'Mission Control', sigla: 'MC', cor: 0x2563eb };
const COMPUTADOR: Remetente = { nome: 'Base computer', sigla: 'AI', cor: 0x7c3aed };
const NIVEIS = ['CALM', 'RISING', 'HIGH', 'EXTREME'];
const CORES_NIVEL = ['#4ade80', '#facc15', '#fb923c', '#f87171'];
// The on-map guide (guia.ts) plays on the first day on the Moon, once; ?tutorial plays it again even if already seen.
let tutorialExibido = false;
// NEW GAME always plays the guide again, even if it was seen before.
let tutorialNovoJogo = false;
const forcarTutorial = new URLSearchParams(location.search).has('tutorial');
// The rules of the chapter being played (the Moon, or Mars on the same engine).
const C_ = () => sessao.C;

export class Interface extends Phaser.Scene {
  private u = 1;
  private tituloHud!: ReturnType<typeof criarTituloHud>;
  private recursos: ReturnType<typeof criarIndicador>[] = [];
  private capsula!: ReturnType<typeof criarCapsulaRecursos>;
  private layout!: ReturnType<typeof calcularLayoutHud>;
  private objetivo!: Phaser.GameObjects.Container;
  private textos: Record<string, Phaser.GameObjects.Text> = {};
  private painel: Phaser.GameObjects.GameObject[] = [];
  private acaoPrincipal?: () => void;
  private aviso?: Phaser.GameObjects.Container;
  private alertaSolar!: Phaser.GameObjects.Container;
  private iconeSolar!: Phaser.GameObjects.Image;
  private tituloSolar!: Phaser.GameObjects.Text;
  private anelSolar!: Phaser.GameObjects.Graphics;
  private anelSolarRaio = 0;
  private tempoSolar!: Phaser.GameObjects.Text;
  private contagemSolar!: Phaser.GameObjects.Text;
  private danoSolar!: Phaser.GameObjects.Text;
  private bateriasSolar: Phaser.GameObjects.Image[] = [];
  private readonly totalBateriasSolar = BATERIAS_TEMPESTADE_EXTREMA;
  private flashSolar!: Phaser.GameObjects.Graphics;
  private get desfechoPendente() { return sessao.desfechoPendente; }
  private set desfechoPendente(v: typeof sessao.desfechoPendente) { sessao.desfechoPendente=v; }
  private get danoTempestade() { return sessao.danoTempestade; }
  private set danoTempestade(v: number) { sessao.danoTempestade=v; }
  private get bateriasTempestade() { return sessao.bateriasTempestade; }
  private set bateriasTempestade(v: number) { sessao.bateriasTempestade=v; }
  private proximoAlarme = 0;
  private animacaoSolar = 0;
  private alertaSolarX = 0;
  private alertaSolarY = 0;
  private entregaPendente?: Phaser.Time.TimerEvent;
  private btFim!: Phaser.GameObjects.Container;
  private textoFim!: Phaser.GameObjects.Text;
  private dicas!: ReturnType<typeof criarDicasRecolhiveis>;
  private readonly preferenciaDicas = new PreferenciaDicas();
  private btMenu!: Phaser.GameObjects.Container;
  private btEditarBase!: Phaser.GameObjects.Container;
  private dicaEditarBase!: Phaser.GameObjects.Text;
  private timersChat: Phaser.Time.TimerEvent[] = [];
  private guia?: Guia;
  private avisoEvento?: AvisoEvento;
  private avisoExpedicao?: AvisoExpedicao;
  private cortina!: Phaser.GameObjects.Rectangle;

  constructor() {
    super({ key: 'Interface' });   // started by Carregar
  }

  private texto(x: number, y: number, s: string, tamanho: number, cor = COR.texto, extra: Phaser.Types.GameObjects.Text.TextStyle = {}) {
    return this.add.text(x, y, s, fonte(tamanho * this.u, cor, extra));
  }

  private botao(x: number, y: number, s: string, acao: () => void, cor = '#334155', tamanho = 15) {
    return this.texto(x, y, s, tamanho, '#ffffff', { backgroundColor: cor, padding: { x: 12 * this.u, y: 7 * this.u }, fontStyle: 'bold' })
      .setInteractive({ useHandCursor: true }).on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => { ev.stopPropagation(); acao(); });
  }

  create() {
    const W = this.scale.width, H = this.scale.height;
    this.u = Phaser.Math.Clamp(Math.min(W / 1100, H / 650), 0.62, 1.4);
    sessao.tela = { w: W, h: H };
    this.textos = {};
    this.painel = [];
    // A restart (resize, new game) destroys every object: the notices are made again on the next update.
    this.avisoEvento = undefined;
    this.avisoExpedicao = undefined;

    // Redraw every layer at the new size. The first resize event Phaser emits often repeats the
    // size create() already used; restarting for it would only throw away and rebuild everything.
    let telaAtual = { w: W, h: H };
    let espera: Phaser.Time.TimerEvent | undefined;
    const redimensionar = () => {
      const w = this.scale.width, h = this.scale.height;
      if (w === telaAtual.w && h === telaAtual.h) return;
      telaAtual = { w, h };
      espera?.remove();
      espera = this.time.delayedCall(150, () => {
        this.scene.get('Superficie').cameras.main.setSize(this.scale.width, this.scale.height);
        this.scene.get('Espaco').scene.restart();
        this.scene.restart();
      });
    };
    this.scale.on('resize', redimensionar);
    this.events.once('shutdown', () => this.scale.off('resize', redimensionar));

    this.criarHUD(W, H);
    this.criarAlertaSolar();

    const l = this.layout, fim = l.fimDia;
    this.btFim = botaoVerde(this, Math.round(fim.x + fim.w / 2), Math.round(fim.y + fim.h / 2), 'END DAY  \u25b6', Math.round(17 * l.u), fim.h, l.u,
      () => this.terminarDia(), { largura: fim.w, altura: fim.h, pulsar: false, pararPropagacao: true, animarHover: true });
    this.textoFim = this.btFim.getData('texto');
    this.cortina = this.add.rectangle(0, 0, W, H, 0x05070f).setOrigin(0).setDepth(10_000_000).setAlpha(0);
    this.dicas = criarDicasRecolhiveis(this, l.dicasPainel, l.dicasAba, l.dicasFechadasX, l.u, l.dicasCompactas,
      this.preferenciaDicas.inicial(l.dicasCompactas), (recolhido) => this.preferenciaDicas.definir(recolhido));
    sessao.ouvir(this, 'controleUsado', (controle) => {
      if (this.preferenciaDicas.usar(controle)) this.dicas.definir(true);
    });

    // ----- input that must work at any zoom -----
    // Mouse wheel / touchpad: zoom around the cursor.
    this.input.on('wheel', (p: Phaser.Input.Pointer, _o: unknown, _dx: number, dy: number) =>
      sessao.zoom(Phaser.Math.Clamp(dy, -150, 150) * 0.0025, { x: p.x, y: p.y }));
    // Two fingers: pinch to zoom around the point between them (one finger is handled by
    // Superficie: drag pans, tap walks).
    this.input.addPointer(1);
    let antes = 0;
    this.input.on('pointermove', () => {
      const a = this.input.pointer1, b = this.input.pointer2;
      if (!a.isDown || !b.isDown) { antes = 0; return; }
      const d = Phaser.Math.Distance.Between(a.x, a.y, b.x, b.y);
      // The ground under the fingers scales exactly with the fingers.
      if (antes) sessao.zoom(-Math.log(d / antes), { x: (a.x + b.x) / 2, y: (a.y + b.y) / 2 });
      antes = d;
    });
    this.input.on('pointerup', () => { antes = 0; });
    const kb = this.input.keyboard!;
    kb.on('keydown-PLUS', () => sessao.zoom(-0.4));
    kb.on('keydown-NUMPAD_ADD', () => sessao.zoom(-0.4));
    kb.on('keydown-MINUS', () => sessao.zoom(0.4));
    kb.on('keydown-NUMPAD_SUBTRACT', () => sessao.zoom(0.4));
    kb.on('keydown-H', () => sessao.irPara(U_INICIAL));
    kb.on('keydown-M', () => { if (!configuracoesAbertas) alternarMudo(); });
    kb.on('keydown-ESC', () => this.abrirMenu());
    kb.on('keydown-B', () => this.abrirEditor());
    kb.on('keydown-ENTER', () => { if (!configuracoesAbertas) this.acaoPrincipal?.(); });

    sessao.ouvir(this, 'mensagem', (s, cor) => this.mensagem(s, cor));
    sessao.ouvir(this, 'desbloqueado', () => this.atualizar());
    sessao.ouvir(this, 'estado', () => this.atualizar());

    this.atualizar();
    if (sessao.partidaRestaurada) {
      sessao.partidaRestaurada=false;
      this.abrirTelaInicial();
    } else this.mostrarFase();
  }

  private abrirMenu() {
    if (sessao.emTarefa || sessao.abastecendoRover || sessao.transicao || configuracoesAbertas || this.scene.isActive('MenuJogo')) return;
    this.scene.launch('MenuJogo', { aoSairTitulo: () => this.abrirTelaInicial() });
  }

  abrirEditor(): boolean {
    if(sessao.emTarefa || sessao.abastecendoRover || sessao.editandoBase || sessao.partida || sessao.voo || sessao.transicao
      || configuracoesAbertas || this.scene.isActive('MenuJogo') || this.scene.isActive('EditorBase'))return false;
    if(sessao.mundo==='nave' || sessao.vista!=='chao' || (sessao.fase!=='dia' && sessao.fase!=='inicio'))return false;
    this.scene.launch('EditorBase');
    return true;
  }

  private abrirTelaInicial() {
    // Exploring another base: reloading brings the real game back from the save.
    if (sessao.explorando) { location.reload(); return; }
    const retomar = () => { this.atualizar(); if (sessao.fase !== 'inicio') this.mostrarFase(); };
    // A lost game is not continued: LAUNCH starts a new one.
    const perdeu = sessao.perdeu;
    const dados: DadosRadar = {
      continuar: sessao.fase !== 'inicio' && !perdeu,
      aoNovoJogo: () => {
        this.entregaPendente?.remove();
        this.entregaPendente = undefined;
        this.aviso?.destroy();
        apagarPartida();
        this.guia?.terminar(); this.guia = undefined;
        tutorialExibido = false; tutorialNovoJogo = true;
        sessao.capIdx=0;sessao.pontos=[];sessao.usarMundo('lua');
        this.ultimoDia = undefined;
        this.scene.get('Espaco').scene.restart();
        this.scene.get('Superficie').scene.restart();
        // The title screen now plays the countdown and the flight, then calls aoComecar (the first morning).
      },
      aoComecar: () => { if (perdeu) dados.aoNovoJogo!(); else if (sessao.fase === 'inicio') this.irPara('manha'); else retomar(); },
      aoExplorar: (mundo) => { if (mundo === sessao.mundo && !perdeu) retomar(); else explorarMundo3D(this, mundo); },
    };
    this.scene.launch('Radar', dados);
  }

  update(_tempo: number, dt: number) {
    this.btEditarBase.setVisible((sessao.fase==='inicio' || sessao.fase==='dia') && sessao.mundo!=='nave' && sessao.vista==='chao'
      && !sessao.emTarefa && !sessao.abastecendoRover && !sessao.partida && !sessao.voo && !sessao.transicao
      && !configuracoesAbertas && !this.scene.isActive('Radar') && !this.scene.isActive('MenuJogo') && !sessao.editandoBase);
    if(!this.btEditarBase.visible)this.dicaEditarBase.setVisible(false);
    this.cortina.setAlpha(sessao.transicao ? Math.sin(Math.PI * sessao.transicao.t) : 0);
    if (this.scene.isVisible() && !sessao.emTarefa && !configuracoesAbertas && !sessao.transicao && this.preferenciaDicas.passo(dt)) this.dicas.definir(true);
    this.atualizarTempestade(dt);
    this.textos.altitude.setText(sessao.vista === 'chao' ? 'Ground' : 'Space');
    // The guide starts on the first day on the Moon (after "Go!") and follows what the player does.
    if (!this.guia && !tutorialExibido && sessao.mundo === 'lua' && sessao.fase === 'dia' && sessao.estado.dia === 1 && (forcarTutorial || tutorialNovoJogo || !tutorialJaVisto())) {
      const sup = this.scene.get('Superficie') as unknown as { jaUsou(c: 'movimento' | 'pulo'): boolean };
      this.guia = new Guia(this, this.layout, (c) => sup.jaUsou(c), () => { tutorialExibido = true; tutorialNovoJogo = false; this.guia = undefined; });
    }
    const pausado = sessao.emTarefa || configuracoesAbertas || !!sessao.transicao || this.scene.isActive('MenuJogo');
    this.guia?.atualizar(dt, pausado);
    (this.avisoEvento ??= new AvisoEvento(this, this.layout)).atualizar(dt, pausado);
    (this.avisoExpedicao ??= new AvisoExpedicao(this, this.layout, () => !!this.guia)).atualizar(dt, pausado);
  }

  private criarAlertaSolar() {
    const l = this.layout, px = (v: number) => Math.round(v * l.u);
    const w = Math.min(this.scale.width - 2 * l.margem, px(560)), h = px(116);
    const x = Math.round((this.scale.width - w) / 2), y = l.avisoY;
    const canto = px(16);
    // Translucent red rectangle: the map shows through it while the message stays readable.
    const fundo = this.add.graphics()
      .fillStyle(0x450a0a, 0.28).fillRoundedRect(px(2), px(6), w, h, canto)
      .fillStyle(0xc81e1e, 0.74).fillRoundedRect(0, 0, w, h, canto)
      .lineStyle(px(3), 0xfecaca, 0.85).strokeRoundedRect(px(1.5), px(1.5), w - px(3), h - px(3), Math.max(2, canto - px(1.5)));
    // Left: the yellow radiation medallion.
    const medalha = this.add.graphics().fillStyle(0x0b1a4a, 1).fillCircle(px(45), Math.round(h / 2), px(33));
    this.iconeSolar = criarIconeJogo(this, px(45), Math.round(h / 2), 'radiation', px(60));
    // Right: countdown ring.
    const rx = w - px(45), ry = Math.round(h / 2), raio = px(29);
    this.anelSolarRaio = raio - px(6);
    const anelFundo = this.add.graphics()
      .fillStyle(0x0b1a4a, 1).fillCircle(rx, ry, raio)
      .lineStyle(px(6), 0x6b1414, 1).strokeCircle(rx, ry, raio - px(6))
      .lineStyle(px(3), 0xffd93b, 1).strokeCircle(rx, ry, raio);
    this.anelSolar = this.add.graphics().setPosition(rx, ry);
    this.tempoSolar = this.add.text(rx, ry + px(1), '', letra(px(21), '#ffffff', {
      fontStyle: 'bold', stroke: '#0b1a4a', strokeThickness: px(3),
    })).setOrigin(0.5);
    // Title.
    this.tituloSolar = this.add.text(Math.round(w / 2), Math.round(h * 0.26), 'SOLAR STORM!', letra(px(23), '#ffd93b', {
      stroke: '#0b1a4a', strokeThickness: px(5), align: 'center',
    })).setOrigin(0.5);
    // This banner represents an extreme storm, independent of the chapter's forecast range.
    // Use the same requirement as the protection rule, including developer-triggered storms.
    const n = this.totalBateriasSolar;
    const rowY = Math.round(h * 0.60), slotW = px(22), slotH = px(30), espacoSlot = px(6);
    this.contagemSolar = this.add.text(0, rowY, `0/${n}`, letra(px(19), '#ffffff', {
      fontStyle: 'bold', stroke: '#0b1a4a', strokeThickness: px(4),
    })).setOrigin(0, 0.5);
    this.danoSolar = this.add.text(0, rowY, 'Radiation +45', letra(px(15), '#fecaca', {
      fontStyle: 'bold', stroke: '#0b1a4a', strokeThickness: px(3),
    })).setOrigin(0, 0.5);
    const grupoW = n * slotW + (n - 1) * espacoSlot + px(9) + this.contagemSolar.width + px(7) + this.danoSolar.width;
    const inicio = Math.round((w - grupoW) / 2);
    const slots = this.add.graphics();
    const tracejado = (sx: number, sy: number) => {
      const t = Math.max(1, px(2)), d = px(3), g = px(3), c = px(5);
      slots.lineStyle(t, 0xf87171, 1);
      for (let dx = c; dx < slotW - c; dx += d + g) {
        const seg = Math.min(d, slotW - c - dx), ex = sx + dx;
        slots.lineBetween(ex, sy, ex + seg, sy);
        slots.lineBetween(ex, sy + slotH, ex + seg, sy + slotH);
      }
      for (let dy = c; dy < slotH - c; dy += d + g) {
        const seg = Math.min(d, slotH - c - dy), ey = sy + dy;
        slots.lineBetween(sx, ey, sx, ey + seg);
        slots.lineBetween(sx + slotW, ey, sx + slotW, ey + seg);
      }
    };
    this.bateriasSolar = [];
    for (let i = 0; i < n; i++) {
      const sx = inicio + i * (slotW + espacoSlot), sy = rowY - Math.round(slotH / 2);
      slots.fillStyle(0x7f1d1d, 0.55).fillRoundedRect(sx, sy, slotW, slotH, px(5));
      tracejado(sx, sy);
      const bateria = criarIconeJogo(this, sx + Math.round(slotW / 2), rowY, 'energy', px(18)).setVisible(false);
      this.bateriasSolar.push(bateria);
    }
    this.contagemSolar.setX(inicio + n * slotW + (n - 1) * espacoSlot + px(9));
    this.danoSolar.setX(this.contagemSolar.x + this.contagemSolar.width + px(7));
    const instrucao = this.add.text(Math.round(w / 2), Math.round(h * 0.88), 'Batteries to the Shield, fast!', letra(px(12), '#ffffff', {
      fontStyle: 'bold',
    })).setOrigin(0.5);
    // A soft white overlay above everything: it flashes with the heartbeat animation below.
    this.flashSolar = this.add.graphics().fillStyle(0xffffff, 1)
      .fillRoundedRect(0, 0, w, h, canto).setAlpha(0);
    this.alertaSolar = this.add.container(x, y, [fundo, medalha, this.iconeSolar, anelFundo, this.anelSolar, this.tempoSolar,
      this.tituloSolar, slots, ...this.bateriasSolar, this.contagemSolar, this.danoSolar, instrucao, this.flashSolar])
      .setDepth(30).setVisible(false);
    this.proximoAlarme = 0;
    this.animacaoSolar = 0;
    this.alertaSolarX = x;
    this.alertaSolarY = y;
  }

  private resolverDesfecho(desfecho: 'protegida' | 'atingida', baterias: number) {
    const bruto = NIVEIS[Math.max(0, Math.min(NIVEIS.length - 1, sessao.dia.nivel))];
    const nome = bruto.charAt(0) + bruto.slice(1).toLowerCase();
    if (desfecho === 'atingida') {
      const dano = danoDaTempestade(baterias);
      this.danoTempestade = dano;
      this.bateriasTempestade = baterias;
      sessao.estado = { ...sessao.estado, dose: Math.min(100, sessao.estado.dose + dano) };
      sessao.emitir('estado');
      sessao.emitir('mensagem', `☢ The storm hit! Radiation +${dano}. Next time: ${this.totalBateriasSolar} batteries in the Shield.`, '#fca5a5');
      tocarSfx('erro');
    } else {
      this.danoTempestade = 0;
      this.bateriasTempestade = baterias;
      sessao.emitir('mensagem', `🛡 The Shield held the ${nome.toLowerCase()} storm!`, '#86efac');
      tocarSfx('sucesso');
    }
    this.atualizar();
  }

  private atualizarTempestade(dt: number) {
    // Radar hides the game while showing the title screen. Its emTarefa flag also
    // covers real tasks, where the storm must keep running, so use visibility.
    if (!this.scene.isVisible()) return;
    const t = sessao.tempestade;
    const jogando = sessao.fase === 'dia';
    // Tasks do not pause the storm: the deadline keeps running while the battery task is open.
    // If it expires there, the outcome waits until the player is back on the map so the report is seen.
    if (jogando && !configuracoesAbertas) {
      const desfecho = t.passo(dt, sessao.entregas.blindagem, sessao.dia.nivel);
      if (desfecho) {
        // Freeze the battery count at the instant the storm resolves; a task may finish later.
        const baterias = sessao.entregas.blindagem;
        if (sessao.emTarefa) this.desfechoPendente = { tipo: desfecho, baterias };
        else this.resolverDesfecho(desfecho, baterias);
      }
    }
    if (this.desfechoPendente && !sessao.emTarefa) {
      const pendente = this.desfechoPendente;
      this.desfechoPendente = null;
      this.resolverDesfecho(pendente.tipo, pendente.baterias);
    }
    const ativo = jogando && (t.status === 'alerta' || (t.status === 'atingida' && this.desfechoPendente !== null));
    this.alertaSolar.setVisible(ativo);
    if (!ativo) return;
    const entregues = Math.max(0, Math.min(this.totalBateriasSolar, sessao.entregas.blindagem));
    this.tempoSolar.setText(String(Math.ceil(t.restante / 1000)));
    this.contagemSolar.setText(`${entregues}/${this.totalBateriasSolar}`);
    const seguro = entregues >= this.totalBateriasSolar;
    this.danoSolar.setText(seguro ? 'SAFE' : `Radiation +${danoDaTempestade(entregues)}`);
    this.danoSolar.setColor(seguro ? '#86efac' : '#fecaca');
    this.bateriasSolar.forEach((b, i) => b.setVisible(i < entregues));
    const fracao = Math.max(0, Math.min(1, t.restante / PRAZO_TEMPESTADE_MS));
    const urgente = t.restante <= 10_000;
    this.tempoSolar.setColor(urgente ? '#fecaca' : '#ffffff');
    this.anelSolar.clear();
    if (fracao > 0) {
      this.anelSolar.lineStyle(Math.max(2, Math.round(6 * this.layout.u)), urgente ? 0xff5b5b : 0xffd93b, 1);
      this.anelSolar.beginPath();
      this.anelSolar.arc(0, 0, this.anelSolarRaio, -Math.PI / 2, -Math.PI / 2 + Math.PI * 2 * fracao, false);
      this.anelSolar.strokePath();
    }
    if (configuracoesAbertas) return;
    this.animacaoSolar += dt;
    const reduz = movimentoReduzido();
    // Heartbeat: the banner swells, trembles and flashes white in sync with the alarm.
    const bruto = (1 - Math.cos(this.animacaoSolar * Math.PI * 2 / 620)) / 2;
    const batida = bruto * bruto * (3 - 2 * bruto);
    const tremor = reduz ? 0 : Math.sin(this.animacaoSolar * Math.PI * 2 / 80) * 2 * batida;
    this.alertaSolar.setX(Math.round(this.alertaSolarX + tremor));
    this.alertaSolar.setY(Math.round(this.alertaSolarY + batida * (reduz ? 1 : 6) * this.layout.u));
    this.flashSolar.setAlpha(reduz ? 0 : 0.16 * batida);
    this.tituloSolar.setScale(1 + batida * (reduz ? 0 : 0.09));
    if (t.status === 'alerta') {
      this.proximoAlarme -= dt;
      if (this.proximoAlarme <= 0) { tocarSfx('alarme'); this.proximoAlarme = 2000; }
    }
  }

  // Decorative containers have no hit area: the map remains clickable between buttons.
  private criarHUD(W: number, H: number) {
    const l = this.layout = calcularLayoutHud(W, H, this.u), u = l.u;
    const px = (v: number) => Math.round(v * u);
    const pad = px(8);
    this.tituloHud = criarTituloHud(this, l.titulo, u);
    this.textos.dia = this.tituloHud.data;
    const marte = sessao.mundo === 'marte';
    const descricoes: [IconeJogo, string, number][] = [['oxygen', 'Oxygen', 0x4ade80], ['radiation', 'Radiation', 0xfde047], [marte ? 'wrench' : 'rocket', sessao.cap.nomeMeta, 0x60a5fa]];
    this.recursos = l.recursos.map((r, i) => criarIndicador(this, r, u, ...descricoes[i]));
    const menu = criarBotaoPilula(this, l.menu, u, '', () => this.abrirMenu());
    const simbolo = this.add.graphics().lineStyle(Math.max(2, px(2.5)), 0xffffff);
    const cx = Math.round(l.menu.w / 2), cy = Math.round(l.menu.h / 2);
    for (const dy of [-6, 0, 6]) simbolo.lineBetween(cx - px(7), cy + px(dy), cx + px(7), cy + px(dy));
    menu.caixa.add(simbolo).setDepth(10).setData('acao', 'menu');
    this.btMenu = menu.caixa;
    const nave = sessao.mundo === 'nave';
    this.capsula = criarCapsulaRecursos(this, l.capsula, u, nave ? {
      nomes: ['Batteries at the Power Room', 'Carrying batteries', 'Air recycler: batteries delivered today', 'Storm shelter: batteries delivered today', 'Engines: batteries delivered today'],
      icones: ['energy', 'backpack', 'heart', 'shield', 'rocket'],
    } : marte ? {
      nomes: ['Batteries at the lander', 'Carrying batteries', 'Life support: batteries delivered today', 'Shield: batteries delivered today', 'Heating: batteries delivered today'],
      icones: ['energy', 'backpack', 'heart', 'shield', 'energy'],
    } : undefined);
    const o = l.objetivo;
    this.objetivo = criarPilula(this, o.x, o.y, o.w, o.h, u, 0xfde047);
    const estrela = criarIconeJogo(this, pad + px(10), Math.round(o.h / 2), 'star', px(24));
    this.textos.tarefa = this.add.text(px(30), Math.round(o.h / 2), '', letra(px(12), '#0b1a4a', {
      wordWrap: { width: o.w - px(30) - pad }, lineSpacing: 0,
    })).setOrigin(0, 0.5);
    this.objetivo.add([estrela, this.textos.tarefa]);
    // Pulse only the star; the second-row elements stay on the same baseline.
    if (!movimentoReduzido()) this.tweens.add({ targets: estrela, alpha: 0.45, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    (['mais', 'menos', 'mira'] as const).forEach((icone, i) => criarBotaoZoom(this, l.zoom[i], u, icone,
      () => i === 2 ? sessao.irPara(U_INICIAL) : sessao.zoom(i === 0 ? -0.5 : 0.5)));
    const nivel = criarPilula(this, l.nivel.x, l.nivel.y, l.nivel.w, l.nivel.h, u);
    this.textos.altitude = this.add.text(Math.round(l.nivel.w / 2), Math.round(l.nivel.h / 2), '', letra(px(12), '#ffffff')).setOrigin(0.5);
    nivel.add(this.textos.altitude);
    const caixaEditar=l.editar;
    const dicaEditar=this.dicaEditarBase=this.add.text(caixaEditar.x-px(12),caixaEditar.y+caixaEditar.h/2,'Edit base · B',letra(px(13),'#ffffff',{
      backgroundColor:'#17263f',padding:{x:px(10),y:px(7)},
    })).setOrigin(1,0.5).setDepth(20).setVisible(false);
    const editar=criarBotaoPilula(this,caixaEditar,u,'',()=>{dicaEditar.setVisible(false);this.abrirEditor();});
    editar.texto.setVisible(false);
    const fundoEditar=editar.caixa.list[0] as Phaser.GameObjects.Graphics;
    const centroX=caixaEditar.w/2,centroY=caixaEditar.h/2,raio=Math.min(caixaEditar.w,caixaEditar.h)/2;
    const desenharEditar=(sobre=false)=>{
      fundoEditar.clear().fillStyle(0x07142c,0.65).fillCircle(centroX,centroY+px(3),raio+px(1))
        .fillStyle(sobre?0x397cff:0x2563eb).fillCircle(centroX,centroY,raio)
        .fillStyle(0x8bbaff,0.35).fillEllipse(centroX,centroY-raio*0.5,raio*1.45,raio*0.63)
        .lineStyle(Math.max(2,px(3)),0xffffff).strokeCircle(centroX,centroY,raio);
    };
    desenharEditar();
    const iconeEditar=this.add.graphics().fillStyle(0xffffff);
    const ponto=(x:number,y:number)=>({x:centroX+px(x),y:centroY+px(y)});
    iconeEditar.fillPoints([ponto(-8,4),ponto(3,-7),ponto(7,-3),ponto(-4,8)],true)
      .fillPoints([ponto(4,-8),ponto(6,-10),ponto(10,-6),ponto(8,-4)],true)
      .fillPoints([ponto(-9,5),ponto(-5,9),ponto(-10,10)],true);
    editar.caixa.add(iconeEditar)
      .setDepth(10).setData('acao','editar-base').setVisible(false);
    const areaEditar=editar.caixa.list.find(o=>o.type==='Zone')!;
    areaEditar.on('pointerover',()=>{desenharEditar(true);dicaEditar.setVisible(true);})
      .on('pointerout',()=>{desenharEditar();dicaEditar.setVisible(false);});
    this.btEditarBase=editar.caixa;
  }

  // ---------- HUD ----------
  private atualizar() {
    const e = sessao.estado;
    const marte = sessao.mundo === 'marte';
    this.textos.dia.setText(sessao.fase === 'inicio'
      ? `Exploring \u00b7 ${marte ? 'Jezero crater' : 'Shackleton rim'}`
      : `${marte ? 'Mars \u00b7 ' : sessao.mundo === 'nave' ? 'Ship \u00b7 ' : ''}Day ${Math.min(e.dia, C_().dias)} of ${C_().dias} \u00b7 ${dataBonita(sessao.data)}`);
    this.tituloHud.atualizar(this.textos.dia.text);
    const valores = [e.oxigenio, e.dose, sessao.mundo==='lua'?sessao.progressoFoguete:e.meta];
    this.recursos.forEach((r, i) => { r.caixa.setVisible(sessao.fase !== 'inicio'); r.atualizar(valores[i]); });
    const d = sessao.entregas;
    // On Mars the last counter is the heating (the dome is built through construction, not powered).
    const contadores = [sessao.noHabitat, sessao.carregando, d.oxigenio, d.blindagem, marte ? d.aquecimento : d.meta];
    this.capsula.caixa.setVisible(sessao.fase === 'dia');
    this.capsula.atualizar(contadores);
    this.objetivo.setVisible(sessao.fase === 'dia' || (sessao.fase === 'inicio' && !!sessao.rover?.dirigindo));
    // One short order at a time: where to go, what to do there.
    const origem = sessao.mundo === 'lua' ? 'Battery Bank' : marte ? 'Lander' : 'Power Room';
    let objetivo = sessao.noHabitat ? `Get today's batteries at the ${origem}`
      : sessao.carregando ? 'Give batteries to the rooms (E)' : 'All done! Press END DAY';
    if (sessao.tempestade.status === 'alerta') {
      objetivo = sessao.noHabitat ? 'STORM! Get batteries at the Battery Bank'
        : sessao.carregando ? 'STORM! Batteries to the Radiation Shield'
        : 'No batteries left. Hold on, the storm hits!';
    } else if (sessao.mundo === 'lua' && e.dia === 1) {
      if (sessao.noHabitat) objetivo = '1/4  Get batteries at the Battery Bank (E)';
      else if (!sessao.carregando) objetivo = '4/4  All done! Press END DAY';
      else if (!d.oxigenio) objetivo = '2/4  Give 1 battery to Life Support';
      else if (!d.meta) objetivo = '3/4  Give 1 battery to the Rocket Workshop';
      else objetivo = '4/4  Share the rest, then END DAY';
    }
    if (sessao.rover?.dirigindo) objetivo = sessao.roverCarregado
      ? 'WASD to drive  ·  E to get out'
      : 'Rover needs 1 battery. E to get out';
    this.textos.tarefa.setText(objetivo);

    this.textos.tarefa.setScale(1);
    this.textos.tarefa.setScale(Math.min(1, (this.layout.objetivo.h - Math.round(6 * this.layout.u)) / this.textos.tarefa.height));

    this.textoFim.setText(sessao.fase === 'inicio' ? '◀  MENU' : 'END DAY  ▶');
    this.btFim.setVisible(sessao.fase === 'dia' || sessao.fase === 'inicio');
  }

  // Notices: the dark pill of the task screens, above the bottom bar. Green good news, yellow careful.
  private mensagem(s: string, cor = '#ffffff') {
    this.aviso?.destroy();
    const u = this.u;
    const W = this.scale.width, H = this.scale.height;
    const largura = Math.min(W - 32 * u, 680 * u), pad = 18 * u, reserva = 38 * u;
    const primeiro = s.match(/^\p{Extended_Pictographic}\uFE0F?/u)?.[0];
    const id = primeiro ? resolverIcone(primeiro) : cor === '#86efac' ? 'success' : cor === '#fca5a5' || cor === '#fde68a' ? 'warning' : 'helmet';
    const t = this.add.text(reserva/2, 0, textoDoJogo(s), letra(16 * u, cor === '#e2e8f0' ? '#ffffff' : cor, { align: 'center', wordWrap: { width: largura - 2 * pad - reserva }, lineSpacing: 2 * u })).setOrigin(0.5);
    const w = Math.min(largura, t.width + 2 * pad + reserva), h = Math.max(42 * u,t.height + 18 * u), r = Math.min(h / 2, 24 * u);
    const icone = criarIconeJogo(this,-w/2+pad+14*u,0,id,30*u);
    const g = this.add.graphics()
      .fillStyle(0x0b1a4a, 0.7).fillRoundedRect(-w / 2 + 2 * u, -h / 2 + 4 * u, w, h, r)
      .fillStyle(CONTORNO, 0.96).fillRoundedRect(-w / 2, -h / 2, w, h, r)
      .lineStyle(3 * u, 0xffffff).strokeRoundedRect(-w / 2, -h / 2, w, h, r);
    const c = this.add.container(W / 2, H - 70 * u - h / 2, [g, icone, t]).setDepth(20);
    this.aviso = c;
    if (!movimentoReduzido()) {
      c.setScale(0.6).setAlpha(0);
      this.tweens.add({ targets: c, scale: 1, alpha: 1, duration: 260, ease: 'Back.easeOut' });
    }
    // Longer notices stay longer, so there is time to read them.
    this.tweens.add({ targets: c, alpha: 0, delay: Math.max(5500, s.length * 90), duration: 700, onComplete: () => c.destroy() });
  }

  // ---------- chapter flow (rules: ../regras.ts) ----------
  private irPara(f: Fase) {
    sessao.fase = f;
    if (f === 'dia') {
      this.danoTempestade = 0;
      this.bateriasTempestade = 0;
    }
    sessao.emitir('fase', f);
    this.atualizar();
    this.mostrarFase();
    if (f === 'dia' && sessao.tempestade.status === 'alerta') {
      sessao.emitir('mensagem', `⏱ Storm coming! ${this.totalBateriasSolar} batteries to the Radiation Shield, fast!`, '#fde68a');
    }
  }

  private terminarDia() {
    if (sessao.abastecendoRover) return;
    // While exploring, this button goes back to the title screen.
    if (sessao.fase === 'inicio') { this.mostrarFase(); return; }
    if (sessao.fase !== 'dia') return;
    this.atualizarTempestade(0);
    if (sessao.tempestade.status === 'alerta') {
      sessao.emitir('mensagem', '⚠ Power the Radiation Shield first!', '#fde68a');
      return;
    }
    const antes = sessao.estado;
    const dia = sessao.dia;
    const ataque = sessao.tempestade.status === 'atingida';
    const aloc = ataque ? { ...sessao.entregas, blindagem: dia.nivel } : sessao.entregas;
    sessao.estado = fimDoDia(antes, aloc, dia, C_());
    if (sessao.evento?.def.efeito === 'radiacao') sessao.estado = { ...sessao.estado, dose: Math.min(100, sessao.estado.dose + DOSE_ALARME) };
    this.ultimoDia = { antes, entregas: { ...sessao.entregas }, nivel: dia.nivel, fato: dia.fato, frio: dia.frio ?? 0,
      danoTempestade: ataque ? this.danoTempestade : 0, bateriasTempestade: this.bateriasTempestade };
    sessao.carregando = 0;
    sessao.noHabitat = 0;
    this.irPara('noite');
    sessao.emitir('estado');
  }

  private get ultimoDia() { return sessao.ultimoDia ?? undefined; }
  private set ultimoDia(v: RelatorioDia | undefined) { sessao.ultimoDia=v??null; }

  private mostrarFase() {
    this.fecharPainel();
    const f = sessao.fase;
    if (f === 'inicio') {
      if (sessao.explorando) return;   // EXPLORE A BASE: free walk, no title screen
      // Title screen (Radar.ts): LAUNCH starts the first morning; "Explore" leaves the base open.
      // The title screen has its own music switch: refresh ours when it closes.
      const dados: DadosRadar = {
        aoComecar: () => this.irPara('manha'),
        aoExplorar: (mundo) => { if (mundo !== sessao.mundo) explorarMundo3D(this, mundo); },
      };
      this.scene.launch('Radar', dados);
    } else if (f === 'manha') {
      const d = sessao.dia;
      const n = bateriasDoDia(sessao.estado, C_());
      const enf = naEnfermaria(sessao.estado);
      const marte = sessao.mundo === 'marte';
      const sup = marte ? undefined : suprimentoDoDia(sessao.estado.dia);
      const lua = sessao.mundo === 'lua', dia1 = sessao.estado.dia === 1;
      const intro = !lua && dia1 ? sessao.cap.introducao.map((t) => ({ icone: marte ? 'mars' : 'rocket', texto: t, cor: '#fde68a' })) : [];
      // One short line per bubble, the icon says what it is about. Story first, then today's numbers.
      this.abrirPainel(`${marte ? 'Mars \u00b7 ' : sessao.mundo === 'nave' ? 'Ship \u00b7 ' : ''}Day ${sessao.estado.dia} \u00b7 ${dataBonita(sessao.data)}`, CONTROLE, [
        ...intro,
        ...(lua && dia1 ? [{ icone: 'rocket', texto: 'Our rocket broke on the trip. Build a new one to fly to Mars!', cor: '#fde047', negrito: true }] : []),
        { icone: 'sun', texto: d.curto },
        d.nivel
          ? { icone: 'radiation', texto: `Storm: ${NIVEIS[d.nivel]}! The Shield needs ${d.nivel} batteries.`, cor: CORES_NIVEL[d.nivel], negrito: true }
          : { icone: 'shield', texto: 'Calm Sun. No Shield needed today.', cor: CORES_NIVEL[0], negrito: true },
        ...(lua && d.nivel >= 3 ? [{ icone: 'timer', texto: `Hurry! ${PRAZO_TEMPESTADE_MS / 1000} seconds to power the Shield.`, cor: '#fde68a', negrito: true }] : []),
        ...(marte && d.frio ? [{ icone: 'cold', texto: `Cold night: ${d.minima ?? ''} \u00b0C! Heating needs ${d.frio} batteries.`, cor: '#93c5fd', negrito: true }] : []),
        { icone: 'energy', texto: `${n} batteries today.`, cor: '#86efac', negrito: true },
        ...(enf ? [{ icone: 'heart', texto: `${enf} astronaut${enf > 1 ? 's are' : ' is'} sick: ${enf} fewer batteries.`, cor: '#fca5a5' }] : []),
        ...(sup ? [{ icone: 'cargo', texto: sup.aviso, cor: '#fde68a', negrito: true }] : []),
        ...(lua && dia1 ? [{ icone: 'goal', texto: 'Follow the yellow arrows!', cor: '#fde047', negrito: true }] : []),
        ...((lua || marte) && sessao.rover && !dia1 ? [{ icone: 'rover', texto: 'Rover: 1 battery = drive all day.' }] : []),
      ], [{ texto: 'GO!  \u25b6', acao: () => {
        sessao.novoDia(); this.irPara('dia');
        if (sup) this.entregaPendente = this.time.delayedCall(1200, () => sessao.emitir('suprimento', sup.tipo));
      }, principal: true }]);
    } else if (f === 'noite') {
      const u = this.ultimoDia!;
      const e = sessao.estado;
      const delta = (a: number, b: number) => `${b - a >= 0 ? '+' : ''}${Math.round(b - a)}`;
      const desprotegido = Math.max(0, u.nivel - u.entregas.blindagem);
      const r = resultado(e, C_());
      // A problem left unfixed is told here, then forgotten: tomorrow is a new day.
      const perdido = sessao.evento?.def;
      sessao.evento = null;
      // One line per bar, with an arrow: green when it got better, red when it got worse.
      // The numbers say it: value, arrow, green when it got better and red when it got worse.
      const linha = (icone: string, nome: string, valor: number, antes: number, maisEhBom: boolean) => {
        const d0 = Math.round(valor - antes);
        const seta = d0 > 0 ? `   \u25b2 ${d0}` : d0 < 0 ? `   \u25bc ${-d0}` : '';
        const bom = d0 === 0 ? null : (d0 > 0) === maisEhBom;
        return { icone, texto: `${nome}: ${Math.round(valor)}%${seta}`, cor: bom === null ? '#ffffff' : bom ? '#86efac' : '#fca5a5', negrito: true };
      };
      const marte = sessao.mundo === 'marte';
      this.abrirPainel('Night report', COMPUTADOR, [
        linha('oxygen', 'Oxygen', e.oxigenio, u.antes.oxigenio, true),
        linha('radiation', 'Radiation', e.dose, u.antes.dose, false),
        linha(marte ? 'wrench' : 'rocket', sessao.cap.nomeMeta, e.meta, u.antes.meta, true),
        desprotegido
          ? { icone: 'warning', texto: `The Shield was ${desprotegido} batter${desprotegido > 1 ? 'ies' : 'y'} short. Ouch, radiation!`, cor: '#fde68a' }
          : { icone: 'shield', texto: 'The Shield held. Crew safe!', cor: '#86efac' },
        ...(u.danoTempestade ? [{ icone: 'radiation', texto: `The storm hit: +${u.danoTempestade} radiation.`, cor: '#fca5a5' }] : []),
        ...(u.frio ? [u.entregas.aquecimento < u.frio
          ? { icone: 'cold', texto: `Too cold! -${(u.frio - u.entregas.aquecimento) * 10} oxygen.`, cor: '#fca5a5' }
          : { icone: 'cold', texto: 'Heating on. Machines stayed warm!', cor: '#86efac' }] : []),
        ...(perdido ? [perdido.efeito === 'radiacao'
          ? { icone: 'radiation', texto: `Alarm missed: +${DOSE_ALARME} radiation.`, cor: '#fde68a' }
          : { icone: 'wrench', texto: `The ${TIPOS[perdido.modulo].nome} was not fixed.`, cor: '#fde68a' }] : []),
        { icone: 'idea', texto: u.fato, tamanho: 16, cor: '#bfdbfe' },
      ], [{ texto: r ? 'SEE THE RESULT  \u25b6' : 'NEXT MORNING  \u25b6', acao: () => this.irPara(r ? 'fim' : 'manha'), principal: true }]);
    } else if (f === 'fim') {
      const e = sessao.estado;
      const r = resultado(e, C_());
      const marte = sessao.mundo === 'marte';
      const titulo = r === 'vitoria' ? (marte ? 'Mission complete!' : 'Launch! To Mars!') : r === 'sem-oxigenio' ? 'Out of oxygen' : r === 'radiacao' ? 'Too much radiation'
        : marte ? 'The base was not finished' : 'The rocket was not ready';
      // Result, score (with what it is made of), then the lessons of the chapter and where the data came from.
      const venceu = r === 'vitoria';
      const pontos = [...sessao.pontos, pontuacao(e)];
      const placar = [
        { icone: venceu ? 'check' : 'cross', texto: venceu ? sessao.cap.vitoria[1] : sessao.cap.metaIncompleta, negrito: true },
        { icone: 'star', texto: `${pontuacao(e)} points!`, cor: '#fde047', negrito: true, tamanho: 26 },
        { icone: 'oxygen', texto: `Oxygen  ${Math.round(e.oxigenio)}`, negrito: true },
        { icone: 'heart', texto: `Health  ${Math.round(100 - e.dose)}`, negrito: true },
        { icone: marte ? 'wrench' : 'rocket', texto: `${sessao.cap.nomeMeta}  ${Math.round(e.meta)}`, negrito: true },
        ...(marte && venceu ? [{ icone: 'star', texto: `All chapters: ${pontos.reduce((a, b) => a + (b ?? 0), 0)} of ${300 * CAPITULOS.length}`, cor: '#fde047', negrito: true }] : []),
        ...sessao.cap.licoes.map((l) => ({ icone: 'idea', texto: l, cor: '#bfdbfe' })),
        { icone: 'antenna', texto: sessao.cap.notaDados, cor: '#94a3b8', tamanho: 15 },
      ];
      if (sessao.mundo === 'nave') {
        // Chapter 2 ends at Mars: the arrival and landing (Viagem), then chapter 3 on Mars.
        this.abrirPainel(venceu ? sessao.cap.vitoria[0] : r === 'sem-oxigenio' ? 'Out of oxygen' : r === 'radiacao' ? 'Too much radiation' : 'The ship missed Mars', CONTROLE, placar, venceu
          ? [{ texto: 'Build ship', acao: () => this.scene.launch('NaveTarefa', { aoConcluir: () => this.mensagem('Ship route complete', '#86efac') }) },
             { texto: 'Land on Mars  ▶', acao: () => { this.fecharPainel(); this.scene.launch('Viagem', { etapa: 'chegada', aoTerminar: () => iniciarMarte3D(this, e.dose, pontos) }); }, principal: true }]
          // Trying again: the crew rests first (regras.ts DESCANSO).
          : [{ texto: 'Try the trip again', acao: () => iniciarNave3D(this, Math.min(e.dose, DESCANSO), sessao.pontos), principal: true }]);
        return;
      }
      if (marte) {
        this.abrirPainel(titulo, CONTROLE, placar, [{ texto: 'PLAY AGAIN FROM THE MOON', acao: () => location.reload(), principal: true }]);
        return;
      }
      const jogarDeNovo = { texto: venceu ? 'PLAY CHAPTER 1 AGAIN' : 'PLAY AGAIN', acao: () => { sessao.reiniciar(); this.scene.get('Superficie').scene.restart(); this.irPara('inicio'); } };
      this.abrirPainel(titulo, CONTROLE, placar, venceu
        ? [jogarDeNovo, { texto: 'Board the ship  ▶', acao: () => this.embarcar(e), principal: true }]
        : [{ ...jogarDeNovo, principal: true }]);
    }
  }

  devValores() { return { ...sessao.estado }; }
  devAplicar(valores: Pick<Estado, 'oxigenio' | 'dose' | 'meta'>) {
    if (sessao.fase !== 'dia') { sessao.novoDia(); this.irPara('dia'); }
    sessao.estado = { ...sessao.estado, ...valores };
    sessao.emitir('estado');
  }
  devTempestade() {
    if (sessao.mundo !== 'lua') return;
    if (sessao.fase !== 'dia') { sessao.novoDia(); this.irPara('dia'); }
    sessao.nivelTeste = 3;
    sessao.entregas.blindagem = 0;
    sessao.noHabitat = Math.max(sessao.noHabitat, 3 - sessao.carregando);
    sessao.tempestade.iniciar(3);
    this.proximoAlarme = 0;
    sessao.emitir('estado');
    this.atualizarTempestade(0);
  }
  devResultado(finalCapitulo: boolean) {
    if (finalCapitulo) sessao.estado = { ...sessao.estado, dia: C_().dias + 1 };
    const r = resultado(sessao.estado, C_());
    if (r) { sessao.tempestade.iniciar(0); this.irPara('fim'); }
    return r;
  }

  // The rocket lifts off the pad (Superficie), meets the Mars ship in lunar orbit and the ship
  // crosses to Mars on the zoom out (sessao.partir, drawn by Espaco), then the
  // crew continues in chapter 2.
  private embarcar(e: Estado) {
    this.fecharPainel();
    const sup = this.scene.get('Superficie') as unknown as { decolar(fim: () => void): void };
    sup.decolar(() => sessao.partir(() => this.iniciarPrototipo(e)));
  }

  // Chapter 2 runs on this same engine, on the ship's deck (irParaMarte.ts). Hand the crew over
  // keeping its radiation dose and the score so far.
  private iniciarPrototipo(e: Estado) {
    iniciarNave3D(this, e.dose, [pontuacao(e)]);
  }

  private fecharPainel() {
    this.timersChat.forEach((t) => t.remove());
    this.timersChat = [];
    this.painel.forEach((o) => o.destroy());
    this.painel = [];
    this.acaoPrincipal = undefined;
  }

  // Morning, night and end panels: the same size as a task panel (660 x 480 at the UI scale), told as a
  // chat. The messages arrive one by one, each after a moment of "typing...". When they do not all fit,
  // they go on pages: NEXT shows the following page, the real buttons wait on the last one. A click or
  // ENTER first shows the whole page at once.
  private abrirPainel(titulo: string, quem: Remetente, partes: Parte[], botoes: Botao[]) {
    this.fecharPainel();
    if (quem===CONTROLE) tocarSfx('radio');
    this.aviso?.destroy();   // an old notice would sit on top of the panel
    this.aviso = undefined;
    const W = this.scale.width, H = this.scale.height, k = this.u;
    const itens = partes.map((p0) => {
      const p = typeof p0 === 'string' ? { texto: p0 } : p0;
      return { ...p, texto: textoDoJogo(p.texto), icone: p.icone ? resolverIcone(p.icone) : undefined };
    });
    const largura = Math.min(W - 40 * k, 660 * k), altura = Math.min(H - 40 * k, 480 * k);
    const x0 = (W - largura) / 2, y0 = (H - altura) / 2 + 8 * k;
    const util = largura - 52 * k - 96 * k - 32 * k;   // frame, avatar column and margins, bubble padding
    const estilo = (p: (typeof itens)[number], util0: number) => letra((p.tamanho ?? 18) * k, p.cor ?? '#ffffff', {
      wordWrap: { width: util0, useAdvancedWrap: true }, fontStyle: p.negrito ? '700' : '500', lineSpacing: 2 * k,
    });

    const antes = this.children.list.length;
    const fundo = this.add.rectangle(0, 0, W, H, 0x020617, 0.55).setOrigin(0).setInteractive();
    const { tela, rodape, borda } = moldura(this, { x: x0, y: y0, w: largura, h: altura }, k, titulo.toUpperCase());

    // Sender: round avatar on the left, name over the first bubble.
    const topo = tela.y + 16 * k;
    const ax = tela.x + 22 * k + 20 * k, bx = tela.x + 74 * k;
    this.add.container(ax, topo + 22 * k + 20 * k, [
      discoAzul(this.add.graphics(), 40 / 52 * k, quem.cor),
      this.add.text(0, 0, quem.sigla, letra(14 * k)).setOrigin(0.5),
    ]);
    this.add.text(bx + 4 * k, topo + 10 * k, quem.nome, letra(14 * k, '#fde047')).setOrigin(0, 0.5);

    // One bubble per message: an icon and a short line in a dark pill with a white edge.
    // A bubble taller than a whole page (it should not happen with short texts) is scaled down to fit.
    const yInicio = topo + 22 * k, yFim = tela.y + tela.h - 14 * k;
    const bolhas = itens.map((p) => {
      const ic = p.icone ? 36 * k : 0, dx = p.icone ? 48 * k : 0;
      const t = this.add.text(16 * k + dx, 0, p.texto, estilo(p, util - dx));
      const w = t.width + 32 * k + dx, h = Math.max(t.height, ic) + 22 * k;
      t.setY((h - t.height) / 2);
      const g = this.add.graphics();
      const c = this.add.container(bx, 0, [g, t]).setVisible(false);
      if (p.icone) c.add(criarIconeJogo(this, 16 * k + ic / 2, h / 2, p.icone, ic));
      const s = Math.min(1, (yFim - yInicio) / h);
      c.setScale(s);
      return { c, g, w, h, s };
    });
    // Pages: as many bubbles as fit, top to bottom.
    const paginas: number[][] = [[]];
    let y = yInicio;
    bolhas.forEach((b, i) => {
      if (y + b.h * b.s > yFim && paginas[paginas.length - 1].length) { paginas.push([]); y = yInicio; }
      const primeira = !paginas[paginas.length - 1].length;
      paginas[paginas.length - 1].push(i);
      b.c.setY(y);
      // Only the first bubble of a page has the tail toward the avatar, as in a chat app.
      const r = Math.min(b.h / 2, 18 * k), canto = primeira ? 4 * k : r;
      b.g.fillStyle(CONTORNO, 0.96).fillRoundedRect(0, 0, b.w, b.h, { tl: canto, tr: r, br: r, bl: r })
        .lineStyle(2 * k, 0xffffff, 0.85).strokeRoundedRect(0, 0, b.w, b.h, { tl: canto, tr: r, br: r, bl: r });
      if (primeira) b.g.fillStyle(CONTORNO, 0.96).fillTriangle(1 * k, 1 * k, -9 * k, 1 * k, 1 * k, 12 * k);
      y += b.h * b.s + 10 * k;
    });
    // "typing...": three dots in a small bubble where the next message will be.
    const pontos = [0, 1, 2].map((i) => this.add.circle(16 * k + i * 12 * k, 17 * k, 4 * k, 0xffffff));
    const digitando = this.add.container(bx, 0, [
      this.add.graphics().fillStyle(CONTORNO, 0.96).fillRoundedRect(0, 0, 56 * k, 34 * k, { tl: 4 * k, tr: 17 * k, br: 17 * k, bl: 17 * k }),
      ...pontos,
    ]).setVisible(false);
    pontos.forEach((d, i) => this.tweens.add({ targets: d, y: 11 * k, duration: 260, yoyo: true, repeat: -1, delay: i * 120, ease: 'Sine.easeInOut' }));
    // Page dots just under the screen: which page this is, and that there is more.
    const bolinhas = paginas.length > 1 ? paginas.map((_, i) =>
      this.add.circle(x0 + largura / 2 + (i - (paginas.length - 1) / 2) * 18 * k, tela.y + tela.h + 9 * k, 5 * k, 0xffffff, 0.4)) : [];
    borda();

    // Buttons centered in the footer; the main one is green (ENTER), the others slate.
    const alturaBt = Math.min(rodape.h, 48 * k), gap = 14 * k, tam = 19 * k;
    const montarBotoes = (lista: Botao[]) => {
      const larguras = lista.map((b) => {
        const t = this.make.text({ x: 0, y: 0, text: b.texto, style: letra(tam) }, false);
        const w = t.width + 2.2 * tam;
        t.destroy();
        return w;
      });
      let x = x0 + largura / 2 - (larguras.reduce((a, b) => a + b, 0) + gap * (lista.length - 1)) / 2;
      return lista.map((b, i) => {
        const bt = botaoVerde(this, x + larguras[i] / 2, rodape.y + rodape.h / 2, b.texto, tam, alturaBt, k, () => { tocarSfx('clique'); b.acao(); },
          { pulsar: false, pararPropagacao: true, animarHover: true, ...(b.principal ? {} : { cor: 0x475569 }) });
        x += larguras[i] + gap;
        return bt.setVisible(false);
      });
    };
    let pagina = 0;
    const seguinte: Botao = { texto: 'NEXT  ▶', acao: () => abrirPagina(pagina + 1), principal: true };
    const btsSeguinte = paginas.length > 1 ? montarBotoes([seguinte]) : [];
    const btsFinais = montarBotoes(botoes);

    // ----- the messages arrive -----
    const reduzido = movimentoReduzido();
    const mostrar = (i: number, animar: boolean) => {
      const { c, s } = bolhas[i];
      if (c.visible) return;
      c.setVisible(true);
      if (animar) {
        c.setScale(0.85 * s).setAlpha(0);
        this.tweens.add({ targets: c, scale: s, alpha: 1, duration: 220, ease: 'Back.easeOut' });
      }
    };
    const terminar = () => {
      this.timersChat.forEach((t) => t.remove());
      this.timersChat = [];
      digitando.setVisible(false);
      paginas[pagina].forEach((i) => mostrar(i, false));
      const ultima = pagina === paginas.length - 1;
      (ultima ? btsFinais : btsSeguinte).forEach((b) => {
        b.setVisible(true);
        if (!reduzido) { b.setAlpha(0); this.tweens.add({ targets: b, alpha: 1, duration: 250 }); }
      });
      this.acaoPrincipal = ultima ? botoes.find((b) => b.principal)?.acao : seguinte.acao;
      fundo.off('pointerdown');
    };
    const proxima = () => {
      const i = paginas[pagina].find((n) => !bolhas[n].c.visible);
      if (i === undefined) { terminar(); return; }
      // Typing time grows with the message, within limits.
      const espera = Phaser.Math.Clamp(itens[i].texto.length * 18, 450, 1100);
      digitando.setPosition(bx, bolhas[i].c.y).setVisible(true);
      this.timersChat.push(this.time.delayedCall(espera, () => {
        digitando.setVisible(false);
        mostrar(i, true);
        tocarSfx('bolha');
        this.timersChat.push(this.time.delayedCall(350, proxima));
      }));
    };
    const abrirPagina = (n: number) => {
      this.timersChat.forEach((t) => t.remove());
      this.timersChat = [];
      pagina = n;
      bolhas.forEach((b, i) => { if (!paginas[n].includes(i)) b.c.setVisible(false); });
      [...btsSeguinte, ...btsFinais].forEach((b) => b.setVisible(false));
      bolinhas.forEach((b, i) => b.setFillStyle(i === n ? 0xfde047 : 0xffffff, i === n ? 1 : 0.4));
      if (reduzido) { terminar(); return; }
      this.acaoPrincipal = terminar;     // ENTER first shows the whole page
      fundo.off('pointerdown').on('pointerdown', terminar);
      this.timersChat.push(this.time.delayedCall(n === 0 ? 300 : 150, proxima));
    };
    abrirPagina(0);
    this.painel = this.children.list.slice(antes);
    this.children.bringToTop(this.btMenu);
  }
}
