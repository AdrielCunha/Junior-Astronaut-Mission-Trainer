// Generated with AI assistance (Claude). See README, "Use of AI tools".
import Phaser from 'phaser';
import { CAPITULOS } from './capitulos';
import { inicioDoCapitulo } from './regras';
import { forcarEvento, proximoCapitulo, type EstadoTeste, type ParamEvento } from './test-harness';
import { Espaco } from './cenas/Espaco';
import { Superficie } from './cenas/Superficie';
import { Interface } from './cenas/Interface';
import { Base } from './cenas/Base';
import { CenaTarefa } from './cenas/Tarefa';
import { Radar } from './cenas/Radar';
import { Carregar } from './cenas/Carregar';
import { Viagem } from './cenas/Viagem';
import { MarteVista } from './cenas/MarteVista';
import { iniciarAudio } from './audio';
import { NaveTarefa } from './cenas/NaveTarefa';
import { FiltroO2Tarefa } from './cenas/FiltroO2Tarefa';
import { OxigenioFaixaTarefa } from './cenas/OxigenioFaixaTarefa';
import { ReatorTarefa } from './cenas/ReatorTarefa';
import { DesviarEnergiaTarefa } from './cenas/DesviarEnergiaTarefa';
import { FiacaoTarefa } from './cenas/FiacaoTarefa';
import { PotenciaMotorTarefa } from './cenas/PotenciaMotorTarefa';
import { DirecaoTarefa } from './cenas/DirecaoTarefa';
import { MapearRotaTarefa } from './cenas/MapearRotaTarefa';
import { TransferirDadosTarefa } from './cenas/TransferirDadosTarefa';
import { ComunicacoesTarefa } from './cenas/ComunicacoesTarefa';
import { IluminacaoTarefa } from './cenas/IluminacaoTarefa';
import { ColapsoReatorTarefa } from './cenas/ColapsoReatorTarefa';
import { TrocarFiltroCo2Tarefa } from './cenas/TrocarFiltroCo2Tarefa';
import { EquilibrarValvulasTarefa } from './cenas/EquilibrarValvulasTarefa';
import { TaparTempestadeTarefa } from './cenas/TaparTempestadeTarefa';
import { FecharEscotilhasTarefa } from './cenas/FecharEscotilhasTarefa';
import { PaineisSolaresTarefa } from './cenas/PaineisSolaresTarefa';
import { BANCO } from './tarefas';
import { sessao } from './cenas/sessao';

// Carregar (loading screen) loads the assets, then starts three scenes that run together, bottom to top: Espaco (stars, Moon, planets), Superficie (the map,
// the commander, the modules) and Interface (bars and panels). See ARCHITECTURE.md.
// ?classic opens the first prototype (fixed base, click the rooms), kept while the team moves over.
// Canvas text does not make the browser fetch a font, so ask for the task font up front.
document.fonts?.load('600 16px Fredoka').catch(() => {});
const classico = new URLSearchParams(location.search).has('classic');

const debugEnabled = new URLSearchParams(location.search).has('debug');

const createDebugHarness = () => {
  const estadoBase: EstadoTeste = {
    capitulo: 1,
    dia: 1,
    evento: 'nenhum',
    estado: inicioDoCapitulo(CAPITULOS[0].config),
    dados: { nivel: 0, frio: 0 },
  };

  const painel = document.createElement('div');
  painel.style.position = 'fixed';
  painel.style.top = '16px';
  painel.style.left = '16px';
  painel.style.zIndex = '2000';
  painel.style.display = 'grid';
  painel.style.gap = '8px';
  painel.style.padding = '12px';
  painel.style.borderRadius = '12px';
  painel.style.background = 'rgba(15, 23, 42, 0.9)';
  painel.style.border = '1px solid rgba(148, 163, 184, 0.5)';
  painel.style.boxShadow = '0 12px 32px rgba(15, 23, 42, 0.45)';
  painel.style.color = '#e2e8f0';
  painel.style.fontFamily = 'system-ui, sans-serif';
  painel.style.fontSize = '12px';
  painel.style.maxWidth = '310px';
  // The task list is long: the panel never grows past the window and scrolls instead.
  painel.style.maxHeight = 'calc(100vh - 32px)';
  painel.style.overflowY = 'auto';
  painel.style.boxSizing = 'border-box';

  const titulo = document.createElement('strong');
  titulo.textContent = 'QA Debug';
  painel.appendChild(titulo);

  const status = document.createElement('div');
  status.textContent = `Chapter ${estadoBase.capitulo} · Day ${estadoBase.dia}`;
  painel.appendChild(status);

  const atualizarStatus = () => {
    status.textContent = `Chapter ${estadoBase.capitulo} · Day ${estadoBase.dia} · Event: ${estadoBase.evento}`;
  };

  const criarBotaoPadrao = (texto: string, cor: string, acao: () => void, borda = 'rgba(148, 163, 184, 0.5)') => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = texto;
    btn.style.padding = '8px 10px';
    btn.style.borderRadius = '8px';
    btn.style.border = `1px solid ${borda}`;
    btn.style.background = cor;
    btn.style.color = '#f8fafc';
    btn.style.cursor = 'pointer';
    btn.style.textAlign = 'left';
    btn.style.width = '100%';
    btn.onclick = acao;
    return btn;
  };

  const tabBar = document.createElement('div');
  tabBar.style.display = 'flex';
  tabBar.style.gap = '6px';
  tabBar.style.flexWrap = 'wrap';

  const tabs: { nome: string; conteudo: HTMLDivElement }[] = [];

  const criarTab = (nome: string) => {
    const conteudo = document.createElement('div');
    conteudo.style.display = 'grid';
    conteudo.style.gap = '6px';
    conteudo.style.marginTop = '4px';
    conteudo.style.display = 'none';
    tabs.push({ nome, conteudo });
    return conteudo;
  };

  const eventosTab = criarTab('Events');
  const capitulosTab = criarTab('Chapters');
  const tarefasTab = criarTab('Tasks');
  const fogueteTab = criarTab('Rocket');

  const botaoEvento = (texto: string, tipo: ParamEvento['tipo']) => {
    eventosTab.appendChild(criarBotaoPadrao(texto, '#0f172a', () => {
      const mesmoEstado = forcarEvento(estadoBase, { tipo, nivel: 2, frio: 2, oxigenio: 15 });
      Object.assign(estadoBase, mesmoEstado);
      atualizarStatus();
      console.info('QA event triggered:', estadoBase);
    }, 'rgba(96, 165, 250, 0.8)'));
  };

  const botaoCapitulo = (numero: number) => {
    capitulosTab.appendChild(criarBotaoPadrao(`Chapter ${numero}`, '#111827', () => {
      const alvo = Math.min(Math.max(1, numero), CAPITULOS.length);
      estadoBase.capitulo = alvo;
      estadoBase.dia = 1;
      estadoBase.evento = 'capitulo';
      estadoBase.estado = inicioDoCapitulo(CAPITULOS[alvo - 1].config);
      estadoBase.dados = { nivel: 0, frio: 0 };
      atualizarStatus();
      console.info('QA chapter set:', estadoBase);
    }, 'rgba(148, 163, 184, 0.5)'));
  };

  const painelMensagem = document.createElement('div');
  painelMensagem.style.minHeight = '30px';
  painelMensagem.style.padding = '6px 8px';
  painelMensagem.style.borderRadius = '8px';
  painelMensagem.style.background = 'rgba(15, 118, 110, 0.18)';
  painelMensagem.style.border = '1px solid rgba(45, 212, 191, 0.4)';
  painelMensagem.style.color = '#ccfbf1';
  painelMensagem.style.fontSize = '11px';
  painelMensagem.textContent = 'Task on standby.';

  const dispararTask = (nome: string, acao: () => void) => {
    painelMensagem.textContent = `${nome} started.`;
    acao();
  };

  const taskButtons: Array<{ key: string; label: string; trigger: () => void }> = [
    {
      key: 'nave-capitulo-1',
      label: 'Chapter 1 ship',
      trigger: () => {
        const jogo = (window as typeof window & { __JOGO__?: Phaser.Game }).__JOGO__;
        if (!jogo) {
          painelMensagem.textContent = 'Chapter 1 ship: game is not ready yet.';
          console.warn('Game not ready yet.');
          return;
        }
        if (!jogo.scene.isActive('NaveTarefa')) jogo.scene.run('NaveTarefa');
        console.info('QA ship task triggered.');
      },
    },
    {
      key: 'filtrar-o2',
      label: 'Clean the O2 filter',
      trigger: () => {
        const jogo = (window as typeof window & { __JOGO__?: Phaser.Game }).__JOGO__;
        if (!jogo) {
          painelMensagem.textContent = 'Clean the O2 filter: game is not ready yet.';
          console.warn('Game not ready yet.');
          return;
        }
        if (!jogo.scene.isActive('FiltroO2Tarefa')) jogo.scene.run('FiltroO2Tarefa');
        console.info('QA O2 filter task triggered.');
      },
    },
    {
      key: 'oxigenio-faixa',
      label: 'Keep oxygen in range',
      trigger: () => {
        const jogo = (window as typeof window & { __JOGO__?: Phaser.Game }).__JOGO__;
        if (!jogo) {
          painelMensagem.textContent = 'Keep oxygen in range: game is not ready yet.';
          console.warn('Game not ready yet.');
          return;
        }
        if (!jogo.scene.isActive('OxigenioFaixaTarefa')) jogo.scene.run('OxigenioFaixaTarefa');
        console.info('QA O2 range task triggered.');
      },
    },
    {
      key: 'ligar-reator',
      label: 'Start the reactor',
      trigger: () => {
        const jogo = (window as typeof window & { __JOGO__?: Phaser.Game }).__JOGO__;
        if (!jogo) {
          painelMensagem.textContent = 'Start the reactor: game is not ready yet.';
          console.warn('Game not ready yet.');
          return;
        }
        if (!jogo.scene.isActive('ReatorTarefa')) jogo.scene.run('ReatorTarefa');
        console.info('QA reactor task triggered.');
      },
    },
    {
      key: 'desviar-energia',
      label: 'Split the power',
      trigger: () => {
        const jogo = (window as typeof window & { __JOGO__?: Phaser.Game }).__JOGO__;
        if (!jogo) {
          painelMensagem.textContent = 'Split the power: game is not ready yet.';
          console.warn('Game not ready yet.');
          return;
        }
        if (!jogo.scene.isActive('DesviarEnergiaTarefa')) jogo.scene.run('DesviarEnergiaTarefa');
        console.info('QA power reroute task triggered.');
      },
    },
    {
      key: 'consertar-fiacao',
      label: 'Fix the wiring',
      trigger: () => {
        const jogo = (window as typeof window & { __JOGO__?: Phaser.Game }).__JOGO__;
        if (!jogo) {
          painelMensagem.textContent = 'Fix the wiring: game is not ready yet.';
          console.warn('Game not ready yet.');
          return;
        }
        if (!jogo.scene.isActive('FiacaoTarefa')) jogo.scene.run('FiacaoTarefa');
        console.info('QA wiring task triggered.');
      },
    },
    {
      key: 'ajustar-potencia',
      label: 'Adjust engine power',
      trigger: () => {
        const jogo = (window as typeof window & { __JOGO__?: Phaser.Game }).__JOGO__;
        if (!jogo) {
          painelMensagem.textContent = 'Adjust engine power: game is not ready yet.';
          console.warn('Game not ready yet.');
          return;
        }
        if (!jogo.scene.isActive('PotenciaMotorTarefa')) jogo.scene.run('PotenciaMotorTarefa');
        console.info('QA motor power task triggered.');
      },
    },
    {
      key: 'estabilizar-direcao',
      label: 'Steady the steering',
      trigger: () => {
        const jogo = (window as typeof window & { __JOGO__?: Phaser.Game }).__JOGO__;
        if (!jogo) {
          painelMensagem.textContent = 'Steady the steering: game is not ready yet.';
          console.warn('Game not ready yet.');
          return;
        }
        if (!jogo.scene.isActive('DirecaoTarefa')) jogo.scene.run('DirecaoTarefa');
        console.info('QA direction task triggered.');
      },
    },
    {
      key: 'mapear-a-rota',
      label: 'Map the route',
      trigger: () => {
        const jogo = (window as typeof window & { __JOGO__?: Phaser.Game }).__JOGO__;
        if (!jogo) {
          painelMensagem.textContent = 'Map the route: game is not ready yet.';
          console.warn('Game not ready yet.');
          return;
        }
        if (!jogo.scene.isActive('MapearRotaTarefa')) jogo.scene.run('MapearRotaTarefa');
        console.info('QA route task triggered.');
      },
    },
    {
      key: 'transferir-dados',
      label: 'Transfer data',
      trigger: () => {
        const jogo = (window as typeof window & { __JOGO__?: Phaser.Game }).__JOGO__;
        if (!jogo) {
          painelMensagem.textContent = 'Transfer data: game is not ready yet.';
          console.warn('Game not ready yet.');
          return;
        }
        if (!jogo.scene.isActive('TransferirDadosTarefa')) jogo.scene.run('TransferirDadosTarefa');
        console.info('QA transfer task triggered.');
      },
    },
    {
      key: 'consertar-comunicacoes',
      label: 'Tune the radio',
      trigger: () => {
        const jogo = (window as typeof window & { __JOGO__?: Phaser.Game }).__JOGO__;
        if (!jogo) {
          painelMensagem.textContent = 'Tune the radio: game is not ready yet.';
          console.warn('Game not ready yet.');
          return;
        }
        if (!jogo.scene.isActive('ComunicacoesTarefa')) jogo.scene.run('ComunicacoesTarefa');
        console.info('QA communications task triggered.');
      },
    },
    {
      key: 'arrumar-iluminacao',
      label: 'Direct the oxygen',
      trigger: () => {
        const jogo = (window as typeof window & { __JOGO__?: Phaser.Game }).__JOGO__;
        if (!jogo) {
          painelMensagem.textContent = 'Direct the oxygen: game is not ready yet.';
          console.warn('Game not ready yet.');
          return;
        }
        if (!jogo.scene.isActive('IluminacaoTarefa')) jogo.scene.run('IluminacaoTarefa');
        console.info('QA lighting task triggered.');
      },
    },
    {
      key: 'parar-reator',
      label: 'Stop the reactor meltdown',
      trigger: () => {
        const jogo = (window as typeof window & { __JOGO__?: Phaser.Game }).__JOGO__;
        if (!jogo) {
          painelMensagem.textContent = 'Stop the reactor meltdown: game is not ready yet.';
          console.warn('Game not ready yet.');
          return;
        }
        if (!jogo.scene.isActive('ColapsoReatorTarefa')) jogo.scene.run('ColapsoReatorTarefa');
        console.info('QA reactor collapse task triggered.');
      },
    },
  ];

  // Tasks of the Life Support and Radiation Shield groups: one button each, all opened the same way.
  const outrasTasks: Array<[string, string, string]> = [
    ['TrocarFiltroCo2Tarefa', 'Swap the CO₂ filter', 'TrocarFiltroCo2Tarefa'],
    ['EquilibrarValvulasTarefa', 'Balance the valves', 'EquilibrarValvulasTarefa'],
    ['TaparTempestadeTarefa', 'Block the storm', 'TaparTempestadeTarefa'],
    ['FecharEscotilhasTarefa', 'Close the hatches', 'FecharEscotilhasTarefa'],
    ['PaineisSolaresTarefa', 'Charge the solar panels', 'PaineisSolaresTarefa'],
  ];
  outrasTasks.forEach(([key, label, cena]) => taskButtons.push({
    key, label,
    trigger: () => {
      const jogo = (window as typeof window & { __JOGO__?: Phaser.Game }).__JOGO__;
      if (!jogo) { painelMensagem.textContent = `${label}: game is not ready yet.`; return; }
      if (!jogo.scene.isActive(cena)) jogo.scene.run(cena);
    },
  }));

  // Tasks of the bank (src/tarefas): played by the shared 'Tarefa' overlay, one button each.
  BANCO.forEach((tarefa) => taskButtons.push({
    key: `banco-${tarefa.id}`,
    label: tarefa.titulo,
    trigger: () => {
      const jogo = (window as typeof window & { __JOGO__?: Phaser.Game }).__JOGO__;
      if (!jogo) { painelMensagem.textContent = `${tarefa.titulo}: game is not ready yet.`; return; }
      if (!jogo.scene.isActive('Tarefa')) jogo.scene.run('Tarefa', { tarefa, aoTerminar: () => {} });
    },
  }));

  // The debug panel lists only the tasks already redone (new look, own logic and tests).
  const tasksRefeitas = new Set([
    'nave-capitulo-1', 'filtrar-o2', 'oxigenio-faixa', ...outrasTasks.map(([key]) => key),
    'ligar-reator', 'parar-reator', 'desviar-energia', 'consertar-fiacao', 'ajustar-potencia',
    'estabilizar-direcao', ...BANCO.map((t) => `banco-${t.id}`), 'mapear-a-rota', 'transferir-dados', 'consertar-comunicacoes', 'arrumar-iluminacao',
  ]);
  taskButtons.filter(({ key }) => tasksRefeitas.has(key)).forEach(({ label, trigger }) => {
    tarefasTab.appendChild(criarBotaoPadrao(label, '#1e293b', () => dispararTask(label, trigger), 'rgba(96, 165, 250, 0.8)'));
  });

  // Rocket tab: the launch pad shows one of 5 build stages from the chapter goal (meta 0-100, 25 per stage).
  // These buttons set the goal directly so the stages can be checked on the surface.
  const definirMeta = (meta: number) => {
    sessao.estado = { ...sessao.estado, meta };
    sessao.emitir('estado');
    painelMensagem.textContent = `Rocket goal ${meta}% · stage ${Math.min(4, Math.floor(meta / 25))} of 4`;
  };
  fogueteTab.appendChild(criarBotaoPadrao('Build next stage', '#7c2d12', () => {
    const atual = Math.min(4, Math.floor(sessao.estado.meta / 25));
    definirMeta(atual >= 4 ? 0 : (atual + 1) * 25);
  }, 'rgba(249, 115, 22, 0.8)'));
  [0, 1, 2, 3, 4].forEach((etapa) => fogueteTab.appendChild(
    criarBotaoPadrao(etapa === 4 ? 'Stage 4 · finished rocket' : `Stage ${etapa}`, '#1e293b', () => definirMeta(etapa * 25), 'rgba(148, 163, 184, 0.5)'),
  ));

  const alternarTab = (proxima: string) => {
    tabs.forEach(({ nome, conteudo }) => {
      const ativa = nome === proxima;
      conteudo.style.display = ativa ? 'grid' : 'none';
    });
  };

  const criarAba = (nome: string) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.textContent = nome;
    btn.style.padding = '6px 8px';
    btn.style.borderRadius = '8px';
    btn.style.border = '1px solid rgba(148, 163, 184, 0.5)';
    btn.style.background = nome === 'Events' ? '#0f172a' : '#111827';
    btn.style.color = '#e2e8f0';
    btn.style.cursor = 'pointer';
    btn.onclick = () => alternarTab(nome);
    tabBar.appendChild(btn);
  };

  criarAba('Events');
  criarAba('Chapters');
  criarAba('Tasks');
  criarAba('Rocket');

  botaoEvento('Storm', 'tempestade');
  botaoEvento('No oxygen', 'queda-oxigenio');

  const avancar = criarBotaoPadrao('Next chapter', '#052e16', () => {
    const avancado = proximoCapitulo(estadoBase, Math.min(estadoBase.capitulo + 1, CAPITULOS.length));
    Object.assign(estadoBase, avancado);
    atualizarStatus();
    console.info('QA chapter advanced:', estadoBase);
  }, 'rgba(34, 197, 94, 0.8)');
  eventosTab.appendChild(avancar);

  // ship button removed; the panel keeps the task as 'Chapter 1 ship' in the Tasks tab

  for (let index = 1; index <= CAPITULOS.length; index++) botaoCapitulo(index);

  painel.appendChild(tabBar);
  painel.appendChild(eventosTab);
  painel.appendChild(capitulosTab);
  painel.appendChild(tarefasTab);
  painel.appendChild(fogueteTab);
  painel.appendChild(painelMensagem);

  alternarTab('Events');
  atualizarStatus();

  document.body.appendChild(painel);
  (window as typeof window & { __TEST_HARNESS__?: EstadoTeste }).__TEST_HARNESS__ = estadoBase;
  (window as typeof window & { __DEBUG_TASKS__?: Record<string, () => void> }).__DEBUG_TASKS__ = Object.fromEntries(
    taskButtons.map(({ key, trigger }) => [key, trigger]),
  );
};

if (debugEnabled) createDebugHarness();

const jogo = new Phaser.Game({
  type: Phaser.AUTO,
  parent: 'jogo',
  backgroundColor: '#05070f',
  // RESIZE: the canvas always fills the window; the scenes redraw at the new size.
  scale: { mode: Phaser.Scale.RESIZE, width: '100%', height: '100%' },
  // The music is played by audio.ts with a plain HTMLAudioElement, so Phaser's audio system
  // stays off. It would also warn when started before a tap.
  audio: { noAudio: true },
  // Load scenes first, then the world and overlays. The task scenes are registered so they can be
  // launched individually while the player is exploring the base. Radar is also kept available for the
  // title screen flow added on main.
  scene: classico
    ? [Carregar, Base, NaveTarefa, FiltroO2Tarefa, OxigenioFaixaTarefa, ReatorTarefa, DesviarEnergiaTarefa, FiacaoTarefa, PotenciaMotorTarefa, DirecaoTarefa, MapearRotaTarefa, TransferirDadosTarefa, ComunicacoesTarefa, IluminacaoTarefa, ColapsoReatorTarefa,
      TrocarFiltroCo2Tarefa, EquilibrarValvulasTarefa, TaparTempestadeTarefa, FecharEscotilhasTarefa, PaineisSolaresTarefa, CenaTarefa, Radar, Viagem, MarteVista]
    : [Carregar, Espaco, Superficie, Interface, Base, NaveTarefa, FiltroO2Tarefa, OxigenioFaixaTarefa, ReatorTarefa, DesviarEnergiaTarefa, FiacaoTarefa, PotenciaMotorTarefa, DirecaoTarefa, MapearRotaTarefa, TransferirDadosTarefa, ComunicacoesTarefa, IluminacaoTarefa, ColapsoReatorTarefa,
      TrocarFiltroCo2Tarefa, EquilibrarValvulasTarefa, TaparTempestadeTarefa, FecharEscotilhasTarefa, PaineisSolaresTarefa, CenaTarefa, Radar, Viagem, MarteVista],
});

(window as typeof window & { __JOGO__?: Phaser.Game }).__JOGO__ = jogo;
// Dev server only: the DEV button that jumps to the trip and Mars scenes (not in the production build).
if (import.meta.env.DEV) void import('./dev/painelCenas').then((m) => m.criarPainelCenas(jogo));

// The classic prototype has no music control, so it stays silent.
if (!classico) iniciarAudio();
