// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Screen-space layer on top of everything: resource bars, build bar, zoom controls, messages,
// and the morning / night / end panels that run the chapter rules (../regras.ts).
import Phaser from 'phaser';
import { tocarSfx } from '../sfx';
import { PRAZO_TEMPESTADE_MS, danoDaTempestade } from './tempestadeSolar';
import { configuracoesAbertas, movimentoReduzido } from '../video';
import lua from '../dados/lua.json';
import { CAPITULOS } from '../capitulos';
import { calcularLayoutHud } from './layoutHud';
import { PreferenciaDicas } from './dicasControles';
import type { DadosRadar } from './Radar';
import { fimDoDia, resultado, pontuacao, bateriasDoDia, naEnfermaria, type Estado } from '../regras';
import { suprimentoDoDia } from '../engine/suprimentos';
import { sessao, fonte, dataBonita, U_INICIAL, COR, type Fase } from './sessao';
import { alternarMudo } from '../audio';
import { letra, criarPilula, criarCapsulaRecursos, criarBotaoPilula, criarIndicador, criarIconeJogo, botaoVerde, criarDicasRecolhiveis, criarFaixaHud, criarTituloHud, criarBotaoZoom } from '../tarefas/estilo';
import type { IconeJogo } from '../dados/icones';

type Botao = { texto: string; acao: () => void; principal?: boolean };
const NIVEIS = ['CALM', 'RISING', 'HIGH', 'EXTREME'];
const CORES_NIVEL = ['#4ade80', '#facc15', '#fb923c', '#f87171'];
const C = CAPITULOS[0].config;

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
  private aviso?: Phaser.GameObjects.Text;
  private alertaSolar!: Phaser.GameObjects.Container;
  private iconeSolar!: Phaser.GameObjects.Image;
  private tituloSolar!: Phaser.GameObjects.Text;
  private anelSolar!: Phaser.GameObjects.Graphics;
  private anelSolarRaio = 0;
  private tempoSolar!: Phaser.GameObjects.Text;
  private contagemSolar!: Phaser.GameObjects.Text;
  private danoSolar!: Phaser.GameObjects.Text;
  private bateriasSolar: Phaser.GameObjects.Image[] = [];
  private totalBateriasSolar = 3;
  private flashSolar!: Phaser.GameObjects.Graphics;
  private desfechoPendente: { tipo: 'protegida' | 'atingida'; baterias: number } | null = null;
  private danoTempestade = 0;
  private bateriasTempestade = 0;
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
    this.btFim = botaoVerde(this, Math.round(fim.x + fim.w / 2), Math.round(fim.y + fim.h / 2), 'End day  \u25b6', Math.round(17 * l.u), fim.h, l.u,
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
    kb.on('keydown-ENTER', () => { if (!configuracoesAbertas) this.acaoPrincipal?.(); });

    sessao.ouvir(this, 'mensagem', (s, cor) => this.mensagem(s, cor));
    sessao.ouvir(this, 'desbloqueado', () => this.atualizar());
    sessao.ouvir(this, 'estado', () => this.atualizar());

    this.atualizar();
    this.mostrarFase();
  }

  private abrirMenu() {
    if (sessao.emTarefa || sessao.transicao || configuracoesAbertas || this.scene.isActive('MenuJogo')) return;
    this.scene.launch('MenuJogo', { aoSairTitulo: () => this.abrirTelaInicial() });
  }

  private abrirTelaInicial() {
    const retomar = () => { this.atualizar(); if (sessao.fase !== 'inicio') this.mostrarFase(); };
    const dados: DadosRadar = {
      continuar: sessao.fase !== 'inicio',
      aoNovoJogo: () => {
        this.entregaPendente?.remove();
        this.entregaPendente = undefined;
        this.aviso?.destroy();
        sessao.reiniciar();
        this.ultimoDia = undefined;
        this.scene.get('Superficie').scene.restart();
        this.irPara('manha');
      },
      aoComecar: () => { if (sessao.fase === 'inicio') this.irPara('manha'); else retomar(); },
      aoExplorar: retomar,
    };
    this.scene.launch('Radar', dados);
  }

  update(_tempo: number, dt: number) {
    this.cortina.setAlpha(sessao.transicao ? Math.sin(Math.PI * sessao.transicao.t) : 0);
    if (this.scene.isVisible() && !sessao.emTarefa && !configuracoesAbertas && !sessao.transicao && this.preferenciaDicas.passo(dt)) this.dicas.definir(true);
    this.atualizarTempestade(dt);
    this.textos.altitude.setText(sessao.vista === 'chao' ? 'Ground' : 'Space');
  }

  private criarAlertaSolar() {
    const l = this.layout, px = (v: number) => Math.round(v * l.u);
    const w = Math.min(this.scale.width - 2 * l.margem, px(560)), h = px(116);
    const x = Math.round((this.scale.width - w) / 2), y = l.objetivo.y + l.objetivo.h + l.espaco;
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
    // Battery slots: each delivered battery fills one slot. The banner is built once, before the
    // storm day, so size it for the strongest storm in the chapter instead of today's level.
    const n = this.totalBateriasSolar = Math.max(1, ...lua.dias.map((dia) => dia.nivel));
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
    const instrucao = this.add.text(Math.round(w / 2), Math.round(h * 0.88), 'Power the shield! Timer runs during tasks.', letra(px(12), '#ffffff', {
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
      const motivo = baterias === 0
        ? 'the shield was empty'
        : `less damage because ${baterias} batter${baterias === 1 ? 'y was' : 'ies were'} already in the shield`;
      this.danoTempestade = dano;
      this.bateriasTempestade = baterias;
      sessao.estado = { ...sessao.estado, dose: Math.min(100, sessao.estado.dose + dano) };
      sessao.emitir('estado');
      sessao.emitir('mensagem', `Solar storm hit! Radiation +${dano}: ${motivo}. ${nome} storm: place all ${this.totalBateriasSolar} batteries for full protection.`, '#fca5a5');
      tocarSfx('erro');
    } else {
      this.danoTempestade = 0;
      this.bateriasTempestade = baterias;
      sessao.emitir('mensagem', `Full protection! All ${this.totalBateriasSolar} batteries held the ${nome.toLowerCase()} storm.`, '#86efac');
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
    criarFaixaHud(this, l.faixa, u);
    const pad = px(8);
    this.tituloHud = criarTituloHud(this, l.titulo, u);
    this.textos.dia = this.tituloHud.data;
    const descricoes: [IconeJogo, string, number][] = [['oxygen', 'Oxygen', 0x4ade80], ['radiation', 'Radiation', 0xfde047], ['rocket', 'Rocket', 0x60a5fa]];
    this.recursos = l.recursos.map((r, i) => criarIndicador(this, r, u, ...descricoes[i]));
    const menu = criarBotaoPilula(this, l.menu, u, '', () => this.abrirMenu());
    const simbolo = this.add.graphics().lineStyle(Math.max(2, px(2.5)), 0xffffff);
    const cx = Math.round(l.menu.w / 2), cy = Math.round(l.menu.h / 2);
    for (const dy of [-6, 0, 6]) simbolo.lineBetween(cx - px(7), cy + px(dy), cx + px(7), cy + px(dy));
    menu.caixa.add(simbolo).setDepth(10).setData('acao', 'menu');
    this.btMenu = menu.caixa;
    this.capsula = criarCapsulaRecursos(this, l.capsula, u);
    const o = l.objetivo;
    this.objetivo = criarPilula(this, o.x, o.y, o.w, o.h, u, 0xffd93b);
    const estrela = criarIconeJogo(this, pad + px(10), Math.round(o.h / 2), 'star', px(20)).setTint(0x0b1a4a);
    this.textos.tarefa = this.add.text(px(30), Math.round(o.h / 2), '', letra(px(12), '#0b1a4a', {
      wordWrap: { width: o.w - px(30) - pad }, lineSpacing: 0,
    })).setOrigin(0, 0.5);
    this.objetivo.add([estrela, this.textos.tarefa]);
    // Pulse only the star; the second-row elements stay on the same baseline.
    if (!movimentoReduzido()) this.tweens.add({ targets: estrela, alpha: 0.45, duration: 1100, yoyo: true, repeat: -1, ease: 'Sine.easeInOut' });
    (['mais', 'menos', 'casa'] as const).forEach((icone, i) => criarBotaoZoom(this, l.zoom[i], u, icone,
      () => i === 2 ? sessao.irPara(U_INICIAL) : sessao.zoom(i === 0 ? -0.5 : 0.5)));
    const nivel = criarPilula(this, l.nivel.x, l.nivel.y, l.nivel.w, l.nivel.h, u);
    this.textos.altitude = this.add.text(Math.round(l.nivel.w / 2), Math.round(l.nivel.h / 2), '', letra(px(12), '#bfdbfe')).setOrigin(0.5);
    nivel.add(this.textos.altitude);
  }

  // ---------- HUD ----------
  private atualizar() {
    const e = sessao.estado;
    this.textos.dia.setText(sessao.fase === 'inicio'
      ? `Exploring \u00b7 Shackleton rim`
      : `Day ${Math.min(e.dia, C.dias)} of ${C.dias} \u00b7 ${dataBonita(sessao.data)}`);
    this.tituloHud.atualizar(this.textos.dia.text);
    const valores = [e.oxigenio, e.dose, e.meta];
    this.recursos.forEach((r, i) => { r.caixa.setVisible(sessao.fase !== 'inicio'); r.atualizar(valores[i]); });
    const d = sessao.entregas;
    const contadores = [sessao.noHabitat, sessao.carregando, d.oxigenio, d.blindagem, d.meta];
    this.capsula.caixa.setVisible(sessao.fase === 'dia');
    this.capsula.atualizar(contadores);
    this.objetivo.setVisible(sessao.fase === 'dia' || (sessao.fase === 'inicio' && !!sessao.rover?.dirigindo));
    let objetivo = sessao.noHabitat
      ? "Walk to the Habitat to pick up today's batteries."
      : sessao.carregando ? 'Click a room (or press E next to it) to give it a battery.' : 'All batteries used. Press "End day".';
    if (sessao.tempestade.status === 'alerta') {
      objetivo = sessao.noHabitat ? 'Emergency: pick up batteries at the Habitat.'
        : sessao.carregando ? 'Emergency: take batteries to the Radiation Shield.'
        : 'Shield incomplete! No batteries left. Wait for impact.';
    } else if (e.dia === 1) {
      if (sessao.noHabitat) objetivo = '1/4: Walk to the Habitat. Click it or press E nearby to pick up batteries.';
      else if (!sessao.carregando) objetivo = '4/4: Batteries allocated! Press "End day" to see the results.';
      else if (!d.oxigenio) objetivo = '2/4: Take a battery to Life Support. Complete its task to deliver it.';
      else if (!d.meta) objetivo = '3/4: Take a battery to the Rocket Workshop. Complete its task.';
      else objetivo = '4/4: Choose where the remaining batteries go, then press "End day".';
    }
    if (sessao.rover?.dirigindo) objetivo = sessao.roverCarregado
      ? 'Rover battery charged. WASD / arrows to drive. E to get out.'
      : 'Rover battery empty. Press E to get out and bring 1 battery from the Habitat.';
    this.textos.tarefa.setText(objetivo);

    this.textos.tarefa.setScale(1);
    this.textos.tarefa.setScale(Math.min(1, (this.layout.objetivo.h - Math.round(6 * this.layout.u)) / this.textos.tarefa.height));

    this.textoFim.setText(sessao.fase === 'inicio' ? '◀  Menu' : 'End day  ▶');
    this.btFim.setVisible(sessao.fase === 'dia' || sessao.fase === 'inicio');
  }

  private mensagem(s: string, cor = '#e2e8f0') {
    this.aviso?.destroy();
    const u = this.u;
    const W = this.scale.width, H = this.scale.height;
    const t = this.texto(W / 2, H - 120 * u, s, 15, cor, {
      backgroundColor: '#0f172aee', padding: { x: 14 * u, y: 9 * u }, align: 'center',
      wordWrap: { width: Math.min(W - 40, 720 * u) },
    }).setOrigin(0.5, 1);
    this.aviso = t;
    this.tweens.add({ targets: t, alpha: 0, delay: 5500, duration: 700, onComplete: () => t.destroy() });
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
      sessao.emitir('mensagem', `Solar storm incoming! Take ${this.totalBateriasSolar} batteries to the Radiation Shield. The timer keeps running during tasks!`, '#fde68a');
    }
  }

  private terminarDia() {
    // While exploring, this button goes back to the title screen.
    if (sessao.fase === 'inicio') { this.mostrarFase(); return; }
    if (sessao.fase !== 'dia') return;
    this.atualizarTempestade(0);
    if (sessao.tempestade.status === 'alerta') {
      sessao.emitir('mensagem', 'Emergency! Power the Radiation Shield before ending the day.', '#fde68a');
      return;
    }
    const antes = sessao.estado;
    // If the storm hit, its damage was already applied during the day: do not charge the same
    // battery shortfall again at night. Treat the shield as satisfied for tonight's dose.
    const ataque = sessao.tempestade.status === 'atingida';
    const aloc = ataque ? { ...sessao.entregas, blindagem: sessao.dia.nivel } : sessao.entregas;
    sessao.estado = fimDoDia(antes, aloc, { nivel: sessao.dia.nivel }, C);
    this.ultimoDia = {
      antes, entregas: { ...sessao.entregas }, nivel: sessao.dia.nivel, fato: sessao.dia.fato,
      danoTempestade: ataque ? this.danoTempestade : 0, bateriasTempestade: this.bateriasTempestade,
    };
    sessao.carregando = 0;
    sessao.noHabitat = 0;
    sessao.emitir('estado');
    this.irPara('noite');
  }

  private ultimoDia?: {
    antes: Estado; entregas: typeof sessao.entregas; nivel: number; fato: string;
    danoTempestade: number; bateriasTempestade: number;
  };

  private mostrarFase() {
    this.fecharPainel();
    const f = sessao.fase;
    if (f === 'inicio') {
      // Title screen (Radar.ts): LAUNCH starts the first morning; "Explore" leaves the base open.
      // The title screen has its own music switch: refresh ours when it closes.
      const dados: DadosRadar = {
        aoComecar: () => this.irPara('manha'),
        aoExplorar: () => {},
      };
      this.scene.launch('Radar', dados);
    } else if (f === 'manha') {
      const d = sessao.dia;
      const n = bateriasDoDia(sessao.estado, C);
      const enf = naEnfermaria(sessao.estado);
      const sup = suprimentoDoDia(sessao.estado.dia);
      this.abrirPainel(`Day ${sessao.estado.dia} · ${dataBonita(sessao.data)}`, [
        { texto: 'Mission Control', cor: '#93c5fd', negrito: true },
        d.aviso,
        { texto: `Radiation today: ${NIVEIS[d.nivel]}${d.nivel ? ` · the shield needs ${d.nivel} batteries` : ''}`, cor: CORES_NIVEL[d.nivel], negrito: true },
        { texto: `Batteries today: ${n}${enf ? ` (${enf} astronaut${enf > 1 ? 's' : ''} in the infirmary)` : ''}`, cor: '#86efac', negrito: true },
        'Optional rover: bring 1 battery from the Habitat to drive all day. A new day needs a new battery.',
        ...(sessao.estado.dia === 1 ? [
          'First mission: pick up batteries at the Habitat, then take one to Life Support and one to the Rocket Workshop. Click a building or press E nearby.',
          'Complete each room\'s task to deliver its first battery. Choose where the rest go, then press "End day". Oxygen and rocket progress update overnight.',
        ] : []),
        ...(d.nivel >= 3 ? [{ texto: `Emergency: ${PRAZO_TEMPESTADE_MS / 1000} seconds to deliver ${d.nivel} batteries to the Radiation Shield. The countdown starts when you press Go and continues during tasks. The pause menu stops it.`, cor: '#fde68a', negrito: true }] : []),
        ...(sup ? [{ texto: `Supply drop: ${sup.aviso}`, cor: '#fde68a', negrito: true }] : []),
      ], [{ texto: 'Go!', acao: () => {
        sessao.novoDia(); this.irPara('dia');
        if (sup) this.entregaPendente = this.time.delayedCall(1200, () => sessao.emitir('suprimento', sup.tipo));
      }, principal: true }]);
    } else if (f === 'noite') {
      const u = this.ultimoDia!;
      const e = sessao.estado;
      const delta = (a: number, b: number) => `${b - a >= 0 ? '+' : ''}${Math.round(b - a)}`;
      const desprotegido = Math.max(0, u.nivel - u.entregas.blindagem);
      const linhaDose = u.danoTempestade
        ? `Radiation dose ${Math.round(e.dose)}% (${delta(u.antes.dose, e.dose)} overnight): the storm hit with ${u.bateriasTempestade}/${u.nivel} batteries and added ${u.danoTempestade} during the day.`
        : `Radiation dose ${Math.round(e.dose)}% (${delta(u.antes.dose, e.dose)})${desprotegido ? `: the shield was ${desprotegido} batteries short of the storm.` : ': the shield held.'}`;
      const r = resultado(e, C);
      this.abrirPainel('Night report', [
        `Oxygen ${Math.round(e.oxigenio)}% (${delta(u.antes.oxigenio, e.oxigenio)}): ${u.entregas.oxigenio} batteries made oxygen, the crew breathed ${C.oxigenioPorNoite}.`,
        linhaDose,
        `Rocket ${Math.round(e.meta)}% (${delta(u.antes.meta, e.meta)}).`,
        ...(sessao.diaCargaRover === u.antes.dia ? ['Rover: 1 battery powered your drives today. A new battery is needed tomorrow.'] : []),
        { texto: u.fato, cor: '#86efac' },
      ], [{ texto: r ? 'See the result' : 'Next morning', acao: () => this.irPara(r ? 'fim' : 'manha'), principal: true }]);
    } else if (f === 'fim') {
      const e = sessao.estado;
      const r = resultado(e, C);
      const titulo = r === 'vitoria' ? 'Launch! To Mars!' : r === 'sem-oxigenio' ? 'Out of oxygen' : r === 'radiacao' ? 'Too much radiation' : 'The rocket was not ready';
      const jogarDeNovo = { texto: r === 'vitoria' ? 'Play chapter 1 again' : 'Play again', acao: () => { sessao.reiniciar(); this.scene.get('Superficie').scene.restart(); this.irPara('inicio'); } };
      this.abrirPainel(titulo, [
        `Score: ${pontuacao(e)}  (oxygen ${Math.round(e.oxigenio)} + health ${Math.round(100 - e.dose)} + rocket ${Math.round(e.meta)})`,
        'Every battery was a choice. On a real mission, power for one system is power taken from another.',
        { texto: `Real data: ${lua.nota}`, cor: '#94a3b8', tamanho: 12 },
      ], r === 'vitoria'
        ? [jogarDeNovo, { texto: 'Board the ship  ▶', acao: () => this.iniciarPrototipo(e), principal: true }]
        : [{ ...jogarDeNovo, principal: true }]);
    }
  }

  // Chapters 2 and 3 live in the Base prototype, which has its own art (spacecraft, Mars) and
  // mechanics (heating, dome). Hand the crew over keeping its radiation dose and the score so far.
  // Temporary development controls. Only called by the opt-in DEV panel.
  devValores() { return { ...sessao.estado }; }
  devAplicar(valores: Pick<Estado, 'oxigenio' | 'dose' | 'meta'>) {
    if (sessao.fase !== 'dia') { sessao.novoDia(); this.irPara('dia'); }
    sessao.estado = { ...sessao.estado, ...valores };
    sessao.emitir('estado');
  }
  devTempestade() {
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
    if (finalCapitulo) sessao.estado = { ...sessao.estado, dia: C.dias + 1 };
    const r = resultado(sessao.estado, C);
    if (r) { sessao.tempestade.iniciar(0); this.irPara('fim'); }
    return r;
  }

  private iniciarPrototipo(e: Estado) {
    this.scene.stop('Espaco');
    this.scene.stop('Superficie');
    this.scene.stop('Tarefa');
    this.scene.start('Base', { capitulo: 1, dose: e.dose, pontos: [pontuacao(e)] });
    this.scene.stop();
  }

  private fecharPainel() {
    this.painel.forEach((o) => o.destroy());
    this.painel = [];
    this.acaoPrincipal = undefined;
  }

  private abrirPainel(titulo: string, partes: (string | { texto: string; cor?: string; negrito?: boolean; tamanho?: number })[], botoes: Botao[]) {
    this.fecharPainel();
    const u = this.u, px = (n: number) => Math.round(n * u);
    const W = this.scale.width, H = this.scale.height;
    const largura = Math.round(Math.min(W - 24, px(640)));
    const margem = px(24), util = largura - 2 * margem;
    const fundo = this.add.rectangle(0, 0, W, H, 0x050e25, 0.68).setOrigin(0).setInteractive();
    fundo.on('pointerdown', (_p: unknown, _x: unknown, _y: unknown, ev: Phaser.Types.Input.EventData) => ev.stopPropagation());
    const caixa = this.add.graphics();
    const itens: Phaser.GameObjects.GameObject[] = [caixa];
    let y = margem;
    const t = this.add.text(Math.round(largura / 2), y, titulo, letra(px(27), '#fde047', {
      stroke: '#07142f', strokeThickness: px(5), align: 'center', wordWrap: { width: util },
      shadow: { offsetX: 0, offsetY: px(2), color: '#07142f', blur: 0, fill: true, stroke: true },
    })).setOrigin(0.5, 0);
    itens.push(t); y += Math.round(t.height) + px(18);
    for (const p0 of partes) {
      const p = typeof p0 === 'string' ? { texto: p0 } : p0;
      if (p.texto === 'Mission Control') {
        const label = this.add.text(0, 0, p.texto, letra(px(16), '#ffffff', { fontStyle: '700' })).setOrigin(0.5);
        const w = Math.min(util, Math.round(label.width) + px(32)), h = px(34);
        const pill = criarPilula(this, margem, y, w, h, u, 0x2563eb, 0x7dd3fc);
        label.setPosition(Math.round(w / 2), Math.round(h / 2));
        pill.add(label); itens.push(pill); y += h + px(14);
        continue;
      }
      const padding = px(14), espacoIcone = p.negrito ? px(18) : 0;
      const l = this.add.text(margem + padding + espacoIcone, y + px(12), p.texto, letra(px(p.tamanho ?? 16), p.cor ?? '#dbeafe', {
        wordWrap: { width: util - 2 * padding - espacoIcone, useAdvancedWrap: true },
        fontStyle: p.negrito ? '700' : '500', lineSpacing: px(3),
      }));
      const h = Math.max(px(42), Math.round(l.height) + px(24));
      const row = this.add.graphics().fillStyle(p.negrito ? 0x203653 : 0x0b1a4a, 0.8)
        .fillRoundedRect(margem, y, util, h, px(14));
      if (p.negrito) {
        const cor = Number.parseInt((p.cor ?? '#7dd3fc').replace('#', ''), 16);
        row.fillStyle(cor).fillCircle(margem + padding + px(4), Math.round(y + h / 2), px(4));
      }
      itens.push(row, l); y += h + px(10);
    }
    y += px(8);
    for (const b of botoes) {
      const h = px(48);
      let bt: Phaser.GameObjects.Container;
      if (b.principal) {
        bt = botaoVerde(this, Math.round(largura / 2), y + Math.round(h / 2), b.texto, px(19), h, u, b.acao,
          { largura: util, altura: h, pulsar: false, pararPropagacao: true, animarHover: true });
        this.acaoPrincipal = b.acao;
      } else bt = criarBotaoPilula(this, { x: margem, y, w: util, h }, u, b.texto, b.acao).caixa;
      itens.push(bt); y += h + px(12);
    }
    const altura = y - px(12) + margem;
    caixa.fillStyle(0x050b1b, 0.65).fillRoundedRect(px(3), px(7), largura, altura, px(28))
      .fillStyle(0x14243e).fillRoundedRect(0, 0, largura, altura, px(28))
      .lineStyle(px(4), 0xffffff).strokeRoundedRect(0, 0, largura, altura, px(28))
      .lineStyle(Math.max(1, px(1)), 0x7dd3fc, 0.35).strokeRoundedRect(px(7), px(7), largura - px(14), altura - px(14), px(22));
    const escala = Math.min(1, (H - 32) / (altura + px(8)));
    const c = this.add.container(Math.round((W - largura * escala) / 2), Math.round((H - altura * escala) / 2), itens).setScale(escala);
    this.painel = [fundo, c];
    this.children.bringToTop(this.btMenu);
  }
}
