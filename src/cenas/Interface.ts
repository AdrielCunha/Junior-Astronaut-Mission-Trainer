// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Screen-space layer on top of everything: resource bars, build bar, zoom controls, messages,
// and the morning / night / end panels that run the chapter rules (../regras.ts).
import Phaser from 'phaser';
import { configuracoesAbertas, movimentoReduzido } from '../video';
import { CAPITULOS } from '../capitulos';
import { calcularLayoutHud } from './layoutHud';
import { PreferenciaDicas } from './dicasControles';
import type { DadosRadar } from './Radar';
import { fimDoDia, resultado, pontuacao, bateriasDoDia, naEnfermaria, type Estado } from '../regras';
import { suprimentoDoDia } from '../engine/suprimentos';
import { sessao, fonte, dataBonita, U_INICIAL, COR, type Fase } from './sessao';
import { alternarMudo } from '../audio';
import { letra, criarPilula, criarCapsulaRecursos, criarBotaoPilula, criarIndicador, botaoVerde, criarDicasRecolhiveis, criarFaixaHud, criarTituloHud, criarBotaoZoom } from '../tarefas/estilo';

type Botao = { texto: string; acao: () => void; principal?: boolean };
const NIVEIS = ['CALM', 'RISING', 'HIGH', 'EXTREME'];
const CORES_NIVEL = ['#4ade80', '#facc15', '#fb923c', '#f87171'];
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
  private aviso?: Phaser.GameObjects.Text;
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
    sessao.ouvir(this, 'zoomMarte', () => this.zoomMarte());

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
    this.textos.altitude.setText(sessao.vista === 'chao' ? 'Ground' : 'Space');
  }

  // Decorative containers have no hit area: the map remains clickable between buttons.
  private criarHUD(W: number, H: number) {
    const l = this.layout = calcularLayoutHud(W, H, this.u), u = l.u;
    const px = (v: number) => Math.round(v * u);
    criarFaixaHud(this, l.faixa, u);
    const pad = px(8);
    this.tituloHud = criarTituloHud(this, l.titulo, u);
    this.textos.dia = this.tituloHud.data;
    const marte = sessao.mundo === 'marte';
    const descricoes: [string, string, number][] = [['\u{1f4a8}', 'Oxygen', 0x4ade80], ['\u2622', 'Radiation', 0xfde047],
      [marte ? '\u{1f3d7}' : '\u{1f680}', sessao.cap.nomeMeta, 0x60a5fa]];
    this.recursos = l.recursos.map((r, i) => criarIndicador(this, r, u, ...descricoes[i]));
    const menu = criarBotaoPilula(this, l.menu, u, '', () => this.abrirMenu());
    const simbolo = this.add.graphics().lineStyle(Math.max(2, px(2.5)), 0xffffff);
    const cx = Math.round(l.menu.w / 2), cy = Math.round(l.menu.h / 2);
    for (const dy of [-6, 0, 6]) simbolo.lineBetween(cx - px(7), cy + px(dy), cx + px(7), cy + px(dy));
    menu.caixa.add(simbolo).setDepth(10).setData('acao', 'menu');
    this.btMenu = menu.caixa;
    this.capsula = criarCapsulaRecursos(this, l.capsula, u, marte ? {
      nomes: ['Batteries at the lander', 'Carrying batteries', 'Life support: batteries delivered today', 'Shield: batteries delivered today', 'Heating: batteries delivered today'],
      icones: ['\u{1f50b}', '\u270b', '\u2764\ufe0f', '\u{1f6e1}', '\u{1f525}'],
    } : undefined);
    const o = l.objetivo;
    this.objetivo = criarPilula(this, o.x, o.y, o.w, o.h, u, 0xffd93b);
    const estrela = this.add.text(pad, Math.round(o.h / 2), '\u2605', letra(px(18), '#0b1a4a')).setOrigin(0, 0.5);
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
    const marte = sessao.mundo === 'marte';
    this.textos.dia.setText(sessao.fase === 'inicio'
      ? `Exploring \u00b7 ${marte ? 'Jezero crater' : 'Shackleton rim'}`
      : `${marte ? 'Mars \u00b7 ' : ''}Day ${Math.min(e.dia, C_().dias)} of ${C_().dias} \u00b7 ${dataBonita(sessao.data)}`);
    this.tituloHud.atualizar(this.textos.dia.text);
    const valores = [e.oxigenio, e.dose, e.meta];
    this.recursos.forEach((r, i) => { r.caixa.setVisible(sessao.fase !== 'inicio'); r.atualizar(valores[i]); });
    const d = sessao.entregas;
    // On Mars the last counter is the heating (the dome is built through construction, not powered).
    const contadores = [sessao.noHabitat, sessao.carregando, d.oxigenio, d.blindagem, marte ? d.aquecimento : d.meta];
    this.capsula.caixa.setVisible(sessao.fase === 'dia');
    this.capsula.atualizar(contadores);
    this.objetivo.setVisible(sessao.fase === 'dia');
    this.textos.tarefa.setText(sessao.noHabitat
      ? `Walk to the ${marte ? 'Lander' : 'Habitat'} to pick up today's batteries.`
      : sessao.carregando ? 'Click a room (or press E next to it) to give it a battery.' : 'All batteries used. Press "End day".');

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
    sessao.emitir('fase', f);
    this.atualizar();
    this.mostrarFase();
  }

  private terminarDia() {
    // While exploring, this button goes back to the title screen.
    if (sessao.fase === 'inicio') { this.mostrarFase(); return; }
    if (sessao.fase !== 'dia') return;
    const antes = sessao.estado;
    // The day that just ended: read it before fimDoDia moves the state on to the next one.
    const dia = sessao.dia;
    sessao.estado = fimDoDia(antes, sessao.entregas, { nivel: dia.nivel, frio: dia.frio }, C_());
    this.ultimoDia = { antes, entregas: { ...sessao.entregas }, nivel: dia.nivel, fato: dia.fato, frio: dia.frio ?? 0 };
    sessao.carregando = 0;
    sessao.noHabitat = 0;
    sessao.emitir('estado');
    this.irPara('noite');
  }

  private ultimoDia?: { antes: Estado; entregas: typeof sessao.entregas; nivel: number; fato: string; frio: number };

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
      const n = bateriasDoDia(sessao.estado, C_());
      const enf = naEnfermaria(sessao.estado);
      const marte = sessao.mundo === 'marte';
      const sup = marte ? undefined : suprimentoDoDia(sessao.estado.dia);
      const intro = marte && sessao.estado.dia === 1 ? sessao.cap.introducao.map((t) => ({ texto: t, cor: '#fde68a' })) : [];
      const frio = marte && d.frio ? [{ texto: `Tonight: ${d.minima ?? ''} °C. Heating needs ${d.frio} batteries, or the cold machines lose ${d.frio * 10} oxygen.`, cor: '#93c5fd', negrito: true }] : [];
      this.abrirPainel(`${marte ? 'Mars · ' : ''}Day ${sessao.estado.dia} · ${dataBonita(sessao.data)}`, [
        ...intro,
        { texto: 'Mission Control', cor: '#93c5fd', negrito: true },
        d.aviso,
        { texto: `Radiation today: ${NIVEIS[d.nivel]}${d.nivel ? ` · the shield needs ${d.nivel} batteries` : ''}`, cor: CORES_NIVEL[d.nivel], negrito: true },
        { texto: `Batteries today: ${n}${enf ? ` (${enf} astronaut${enf > 1 ? 's' : ''} in the infirmary)` : ''}`, cor: '#86efac', negrito: true },
        ...frio,
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
      const r = resultado(e, C_());
      this.abrirPainel('Night report', [
        `Oxygen ${Math.round(e.oxigenio)}% (${delta(u.antes.oxigenio, e.oxigenio)}): ${u.entregas.oxigenio} batteries made oxygen, the crew breathed ${C_().oxigenioPorNoite}.`,
        `Radiation dose ${Math.round(e.dose)}% (${delta(u.antes.dose, e.dose)})${desprotegido ? `: the shield was ${desprotegido} batteries short of the storm.` : ': the shield held.'}`,
        ...(u.frio ? [`Heating: ${u.entregas.aquecimento} of ${u.frio} batteries${u.entregas.aquecimento < u.frio ? `: the cold cost ${(u.frio - u.entregas.aquecimento) * 10} oxygen.` : ': the machines stayed warm.'}`] : []),
        `${sessao.cap.nomeMeta} ${Math.round(e.meta)}% (${delta(u.antes.meta, e.meta)}).`,
        { texto: u.fato, cor: '#86efac' },
      ], [{ texto: r ? 'See the result' : 'Next morning', acao: () => this.irPara(r ? 'fim' : 'manha'), principal: true }]);
    } else if (f === 'fim') {
      const e = sessao.estado;
      const r = resultado(e, C_());
      const marte = sessao.mundo === 'marte';
      const titulo = r === 'vitoria' ? (marte ? 'Mission complete!' : 'Launch! To Mars!') : r === 'sem-oxigenio' ? 'Out of oxygen' : r === 'radiacao' ? 'Too much radiation'
        : marte ? 'The base was not finished' : 'The rocket was not ready';
      if (marte) {
        const total = [...sessao.pontos, pontuacao(e)].reduce((a, b) => a + (b ?? 0), 0);
        this.abrirPainel(titulo, [
          r === 'vitoria' ? sessao.cap.vitoria[0] : sessao.cap.metaIncompleta,
          ...(r === 'vitoria' ? [sessao.cap.vitoria[1]] : []),
          `Chapter score: ${pontuacao(e)}  (oxygen ${Math.round(e.oxigenio)} + health ${Math.round(100 - e.dose)} + base ${Math.round(e.meta)})`,
          ...(r === 'vitoria' ? [{ texto: `Total score: ${total} of ${300 * CAPITULOS.length}`, cor: '#f8fafc', negrito: true }] : []),
          ...sessao.cap.licoes.map((l) => `• ${l}`),
          { texto: `Real data: ${sessao.cap.dados.nota}`, cor: '#94a3b8', tamanho: 12 },
        ], [{ texto: 'Play again from the Moon', acao: () => location.reload(), principal: true }]);
        return;
      }
      const jogarDeNovo = { texto: r === 'vitoria' ? 'Play chapter 1 again' : 'Play again', acao: () => { sessao.reiniciar(); this.scene.get('Superficie').scene.restart(); this.irPara('inicio'); } };
      this.abrirPainel(titulo, [
        `Score: ${pontuacao(e)}  (oxygen ${Math.round(e.oxigenio)} + health ${Math.round(100 - e.dose)} + rocket ${Math.round(e.meta)})`,
        'Every battery was a choice. On a real mission, power for one system is power taken from another.',
        { texto: `Real data: ${sessao.cap.dados.nota}`, cor: '#94a3b8', tamanho: 12 },
      ], r === 'vitoria'
        ? [jogarDeNovo, { texto: 'Board the ship  ▶', acao: () => this.embarcar(e), principal: true }]
        : [{ ...jogarDeNovo, principal: true }]);
    }
  }

  // The rocket lifts off the pad (Superficie), meets the Mars ship in lunar orbit and the ship
  // crosses to Mars on the zoom out (sessao.partir, drawn by Espaco), then the
  // crew continues in chapter 2.
  private embarcar(e: Estado) {
    this.fecharPainel();
    const sup = this.scene.get('Superficie') as unknown as { decolar(fim: () => void): void };
    sup.decolar(() => sessao.partir(() => this.iniciarPrototipo(e)));
  }

  // Chapters 2 and 3 live in the Base prototype, which has its own art (spacecraft, Mars) and
  // mechanics (heating, dome). Hand the crew over keeping its radiation dose and the score so far.
  private iniciarPrototipo(e: Estado) {
    this.scene.stop('Espaco');
    this.scene.stop('Superficie');
    this.scene.stop('Tarefa');
    this.scene.start('Base', { capitulo: 1, dose: e.dose, pontos: [pontuacao(e)] });
    this.scene.stop();
  }

  // Mars: zooming out past the ground opens MarteVista (the Mars film, live globe with its
  // moons, the solar system). The map waits under it, like during a task.
  private zoomMarte() {
    if (sessao.emTarefa || this.scene.isActive('MarteVista')) return;
    sessao.emTarefa = true;
    this.scene.launch('MarteVista', { data: sessao.data, aoVoltar: () => { sessao.emTarefa = false; sessao.irPara(sessao.u); } });
    this.scene.bringToTop('MarteVista');
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
