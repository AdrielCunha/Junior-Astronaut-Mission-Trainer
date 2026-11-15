// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Screen-space layer on top of everything: resource bars, build bar, zoom controls, messages,
// and the morning / night / end panels that run the chapter rules (../regras.ts).
import Phaser from 'phaser';
import { abrirVideo, configuracoesAbertas } from '../video';
import { CAPITULOS } from '../capitulos';
import type { DadosRadar } from './Radar';
import { fimDoDia, resultado, pontuacao, bateriasDoDia, naEnfermaria, type Estado } from '../regras';
import { TIPOS } from '../engine/construcao';
import { suprimentoDoDia } from '../engine/suprimentos';
import { sessao, fonte, dataBonita, U_INICIAL, COR, dadosTerreno, type Fase } from './sessao';
import { alternarMudo, estaMudo } from '../audio';
import { alternarEfeitos, efeitosEstaoMudos } from '../sfx';

type Botao = { texto: string; acao: () => void; principal?: boolean };
const NIVEIS = ['CALM', 'RISING', 'HIGH', 'EXTREME'];
const CORES_NIVEL = ['#4ade80', '#facc15', '#fb923c', '#f87171'];
// The rules of the chapter being played (the Moon, or Mars on the same engine).
const C_ = () => sessao.C;
const corDaBarra = (v: number, inverter = false) => {
  const x = inverter ? 100 - v : v;
  return x > 70 ? 0x22c55e : x >= 30 ? 0xeab308 : 0xef4444;
};

export class Interface extends Phaser.Scene {
  private u = 1;
  private hud!: Phaser.GameObjects.Graphics;
  private textos: Record<string, Phaser.GameObjects.Text> = {};
  private painel: Phaser.GameObjects.GameObject[] = [];
  private acaoPrincipal?: () => void;
  private aviso?: Phaser.GameObjects.Text;
  private btFim!: Phaser.GameObjects.Text;
  private cortina!: Phaser.GameObjects.Rectangle;
  private btVideo!: Phaser.GameObjects.Text;
  private btSom!: Phaser.GameObjects.Text;
  private btEfeitos!: Phaser.GameObjects.Text;

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
    const u = this.u;
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

    // ----- top bar -----
    this.hud = this.add.graphics();
    this.textos.titulo = this.texto(16 * u, 10 * u, 'LUNAR ODYSSEY', 18, '#f8fafc', { fontStyle: 'bold' });
    this.textos.dia = this.texto(16 * u, 34 * u, '', 13, '#93c5fd', { fontStyle: 'bold' });
    this.textos.barras = this.texto(0, 0, '', 1);
    this.textos.baterias = this.texto(W - 16 * u, 12 * u, '', 15, '#f8fafc', { fontStyle: 'bold', align: 'right' }).setOrigin(1, 0);
    this.textos.tarefa = this.texto(16 * u, 62 * u, '', 14, '#fde68a', { fontStyle: 'bold', lineSpacing: 4 * u });

    // ----- main button (bottom right) -----
    const yb = H - 16 * u;
    this.btFim = this.botao(W - 16 * u, yb, 'End day  ▶', () => this.terminarDia(), COR.azul, 16).setOrigin(1, 1);
    this.btSom = this.botao(W - 16 * u, 62 * u, estaMudo() ? 'Music off' : 'Music on', () => this.atualizarSom(alternarMudo()), '#334155', 12).setOrigin(1, 0).setDepth(10);
    this.btEfeitos = this.botao(W - 16 * u, 94 * u, efeitosEstaoMudos() ? 'Effects off' : 'Effects on', () => this.atualizarEfeitos(alternarEfeitos()), '#334155', 12).setOrigin(1, 0).setDepth(10);

    this.btVideo = this.botao(W-16*u,98*u,'Video & comfort',()=>abrirVideo(),'#334155',12).setFontSize(Math.max(12,12*u)).setPadding(10,8,10,8).setOrigin(1,0).setDepth(10);
    this.cortina = this.add.rectangle(0,0,W,H,0x05070f).setOrigin(0).setDepth(10_000_000).setAlpha(0);

    // ----- zoom (right side) -----
    const zx = W - 16 * u, zy = H * 0.42;
    this.botao(zx, zy, '+', () => sessao.zoom(-0.5), '#334155', 18).setOrigin(1, 0.5);
    this.botao(zx, zy + 44 * u, '−', () => sessao.zoom(0.5), '#334155', 18).setOrigin(1, 0.5);
    this.botao(zx, zy + 88 * u, '⌂', () => sessao.irPara(U_INICIAL), '#334155', 18).setOrigin(1, 0.5);
    this.textos.altitude = this.texto(zx - 48 * u, zy + 44 * u, '', 12, '#94a3b8', { align: 'right' }).setOrigin(1, 0.5);

    this.textos.ajuda = this.texto(16 * u, H - 100 * u,
      'WASD or click: walk · Space: jump · click a room (or E next to it): use it · wheel or pinch: zoom to space',
      12, '#94a3b8', { stroke: '#020617', strokeThickness: 3 });

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
    kb.on('keydown-M', () => {if (!configuracoesAbertas) this.atualizarSom(alternarMudo());});
    kb.on('keydown-ENTER', () => {if (!configuracoesAbertas) this.acaoPrincipal?.();});

    sessao.ouvir(this, 'mensagem', (s, cor) => this.mensagem(s, cor));
    sessao.ouvir(this, 'desbloqueado', () => this.atualizar());
    sessao.ouvir(this, 'estado', () => this.atualizar());
    sessao.ouvir(this, 'zoomMarte', () => this.zoomMarte());

    this.atualizar();
    this.mostrarFase();
  }

  private atualizarSom(mudo: boolean) {
    this.btSom.setText(mudo ? 'Music off' : 'Music on');
  }

  private atualizarEfeitos(mudo: boolean) {
    this.btEfeitos.setText(mudo ? 'Effects off' : 'Effects on');
  }

  update() {
    this.cortina.setAlpha(sessao.transicao ? Math.sin(Math.PI*sessao.transicao.t) : 0);
    const n = sessao.nivel;
    this.textos.altitude.setText(sessao.voo ? '' : sessao.vista === 'chao' ? 'Ground' : sessao.vista === 'lua' ? 'Moon' : 'Solar\nsystem');
    // Ground-only controls fade out in space.
    const a = n < 1.02 ? 1 : 0.25;
    this.textos.ajuda.setAlpha(a);
  }

  // ---------- HUD ----------
  private atualizar() {
    const W = this.scale.width;
    const u = this.u;
    const e = sessao.estado;
    const g = this.hud.clear();
    g.fillStyle(0x020617, 0.72).fillRect(0, 0, W, 54 * u);

    const marte = sessao.mundo === 'marte';
    this.textos.titulo.setText(marte ? 'MARS BASE' : 'LUNAR ODYSSEY');
    this.textos.dia.setText(sessao.fase === 'inicio'
      ? `Exploring · ${dadosTerreno.centro.lat.toFixed(2)}°, ${dadosTerreno.centro.lon.toFixed(1)}° · ${marte ? 'Jezero crater' : 'Shackleton rim'}`
      : `${marte ? 'Chapter 3 · ' : ''}Day ${Math.min(e.dia, C_().dias)} of ${C_().dias} · ${dataBonita(sessao.data)}`);

    // Bars: oxygen, radiation dose (lower is better), rocket. None while just exploring the base.
    const barras: [string, number, number][] = sessao.fase === 'inicio' ? [] : [
      ['Oxygen', e.oxigenio, corDaBarra(e.oxigenio)],
      ['Radiation', e.dose, corDaBarra(e.dose, true)],
      [sessao.cap.nomeMeta, e.meta, 0x60a5fa],
    ];
    for (let i = 0; i < 3; i++) this.textos[`b${i}`]?.setText('');
    const bw = 130 * u, x0 = W / 2 - (barras.length * (bw + 24 * u)) / 2;
    for (const [i, [nome, v, cor]] of barras.entries()) {
      const x = x0 + i * (bw + 24 * u), y = 26 * u;
      g.fillStyle(0x1e293b).fillRoundedRect(x, y, bw, 12 * u, 4 * u);
      g.fillStyle(cor).fillRoundedRect(x, y, Math.max(4, (bw * v) / 100), 12 * u, 4 * u);
      const id = `b${i}`;
      if (!this.textos[id]) this.textos[id] = this.texto(x, 8 * u, '', 12, '#cbd5e1', { fontStyle: 'bold' });
      this.textos[id].setText(`${nome} ${Math.round(v)}%`);
    }

    // Batteries and the to-do line.
    const d = sessao.entregas;
    this.textos.baterias.setText(sessao.fase === 'dia'
      ? `Batteries at ${marte ? 'the lander' : 'habitat'} ${sessao.noHabitat} · carrying ${sessao.carregando}\n` +
        (marte ? `Life ${d.oxigenio} · Shield ${d.blindagem} · Heat ${d.aquecimento}` : `Life ${d.oxigenio} · Shield ${d.blindagem} · Rocket ${d.meta}`)
      : '');
    this.textos.tarefa.setText(sessao.fase === 'dia'
      ? (sessao.noHabitat ? `Walk to the ${marte ? 'Lander' : 'Habitat'} to pick up today's batteries.` : sessao.carregando ? 'Click a room (or press E next to it) to give it a battery.' : 'All batteries used. Press "End day".')
      : '');

    this.btFim.setText(sessao.fase === 'inicio' ? '◀  Menu' : 'End day  ▶');
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
        aoComecar: () => { this.atualizarSom(estaMudo()); this.irPara('manha'); },
        aoExplorar: () => this.atualizarSom(estaMudo()),
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
        if (sup) this.time.delayedCall(1200, () => sessao.emitir('suprimento', sup.tipo));
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
    const u = this.u;
    const W = this.scale.width, H = this.scale.height;
    const largura = Math.min(W - 24, 620 * u);
    const margem = 22 * u;
    const fundo = this.add.rectangle(0, 0, W, H, 0x020617, 0.5).setOrigin(0).setInteractive();
    const caixa = this.add.graphics();
    const itens: Phaser.GameObjects.GameObject[] = [caixa];
    let y = margem;
    const t = this.texto(margem, y, titulo, 22, '#f8fafc', { fontStyle: 'bold', wordWrap: { width: largura - 2 * margem } });
    itens.push(t); y += t.height + 10 * u;
    for (const p0 of partes) {
      const p = typeof p0 === 'string' ? { texto: p0 } : p0;
      const l = this.texto(margem, y, p.texto, p.tamanho ?? 15, p.cor ?? '#cbd5e1', {
        wordWrap: { width: largura - 2 * margem, useAdvancedWrap: true }, fontStyle: p.negrito ? 'bold' : 'normal', lineSpacing: 3 * u,
      });
      itens.push(l); y += l.height + 8 * u;
    }
    y += 6 * u;
    let x = largura - margem;
    for (const b of [...botoes].reverse()) {
      const bt = this.botao(x, y, b.texto, b.acao, b.principal ? COR.azul : '#334155', 16).setOrigin(1, 0);
      if (b.principal) this.acaoPrincipal = b.acao;
      itens.push(bt); x -= bt.width + 10 * u;
    }
    const altura = y + 44 * u + margem / 2;
    caixa.fillStyle(COR.fundoPainel, 0.97).fillRoundedRect(0, 0, largura, altura, 14 * u);
    caixa.lineStyle(2, COR.borda).strokeRoundedRect(0, 0, largura, altura, 14 * u);
    const escala = Math.min(1, (H - 24) / altura);
    const c = this.add.container((W - largura * escala) / 2, (H - altura * escala) / 2, itens).setScale(escala);
    this.painel = [fundo, c];
    this.children.bringToTop(this.btSom);
    this.children.bringToTop(this.btVideo);
  }
}
