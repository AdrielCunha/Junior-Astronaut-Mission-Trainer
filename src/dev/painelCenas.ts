// Generated with AI assistance. See README, "Use of AI tools".
// Dev server only (main.ts loads it under import.meta.env.DEV, so it is not in the production
// build): a small "DEV" button that jumps straight to the trip and Mars scenes, to test them
// without playing a whole chapter first.
import Phaser from 'phaser';
import { sessao } from '../cenas/sessao';
import { TerrenoMarte } from './TerrenoMarte';
import { iniciarMarte3D, iniciarNave3D } from '../cenas/irParaMarte';
import { dispositivoMovel } from '../mobile';

const CENAS_DO_JOGO = ['Radar', 'Espaco', 'Superficie', 'Interface', 'Tarefa', 'Base', 'Viagem', 'MarteVista'];

export function criarPainelCenas(jogo: Phaser.Game) {
  const sm = jogo.scene;
  const ativa = (k: string) => !!sm.getScene(k) && (sm.isActive(k) || sm.isPaused(k));
  const parar = (...ks: string[]) => ks.forEach((k) => { if (ativa(k)) sm.stop(k); });
  const depois = (ms: number, fn: () => void) => window.setTimeout(fn, ms);

  // --- the panel ---
  const raiz = document.createElement('div');
  raiz.style.cssText = 'position:fixed;left:8px;top:50%;transform:translateY(-50%);z-index:1000;font:13px system-ui,sans-serif;display:flex;align-items:flex-start;gap:6px';
  if (dispositivoMovel()) raiz.style.cssText += ';left:calc(max(12px,env(safe-area-inset-left)) + 58px);top:calc(max(10px,env(safe-area-inset-top)) + 3px);transform:none;z-index:61';
  const abrir = document.createElement('button');
  abrir.textContent = 'DEV';
  abrir.title = 'Test scenes (dev server only)';
  abrir.style.cssText = 'background:#7c3aed;color:#fff;border:0;border-radius:6px;padding:6px 8px;font-weight:700;cursor:pointer;opacity:.85';
  const lista = document.createElement('div');
  lista.style.cssText = 'display:none;flex-direction:column;gap:4px;background:#0f172aee;border:1px solid #334155;border-radius:8px;padding:8px;max-width:240px';
  const estado = document.createElement('div');
  estado.style.cssText = 'color:#94a3b8;font-size:12px;margin-top:4px;white-space:pre-wrap';
  abrir.onclick = () => { lista.style.display = lista.style.display === 'none' ? 'flex' : 'none'; };
  raiz.append(abrir, lista);
  document.body.append(raiz);
  const visibilidadeEditor=(aberto:boolean)=>{raiz.style.display=aberto?'none':'flex';};
  visibilidadeEditor(sessao.editandoBase);
  jogo.events.on('base-planner-visibility',visibilidadeEditor);
  jogo.events.once('destroy',()=>{jogo.events.off('base-planner-visibility',visibilidadeEditor);raiz.remove();});

  const avisar = (s: string) => { estado.textContent = s; };
  const titulo = (s: string) => {
    const t = document.createElement('div');
    t.textContent = s;
    t.style.cssText = 'color:#c4b5fd;font-weight:700;margin-top:4px';
    lista.append(t);
  };
  const botao = (rotulo: string, acao: () => void) => {
    const b = document.createElement('button');
    b.textContent = rotulo;
    b.style.cssText = 'background:#1e293b;color:#e2e8f0;border:1px solid #334155;border-radius:6px;padding:6px 8px;text-align:left;cursor:pointer';
    b.onmouseenter = () => { b.style.background = '#334155'; };
    b.onmouseleave = () => { b.style.background = '#1e293b'; };
    b.onclick = () => {
      avisar('');
      try { acao(); } catch (e) { avisar(String(e)); console.error(e); }
      if (!estado.textContent) lista.style.display = 'none';   // close, unless there is a warning to read
    };
    lista.append(b);
  };

  // --- helpers ---
  // A running scene to load from (getScenes(true) can come back empty while the game runs).
  const cenaRodando = () => sm.scenes.find((c) => c.sys.isActive()) ?? sm.scenes.find((c) => c.sys.settings.status === Phaser.Scenes.RUNNING);
  // The Moon scenes (chapter 1) must be running for the departure.
  const naLua = () => {
    if (!ativa('Superficie')) { avisar('The Moon scenes are not running (you are in chapter 2 or 3). Use "Reload: chapter 1".'); return false; }
    if (ativa('Radar')) sm.stop('Radar');
    (sm.getScene('Interface') as unknown as { fecharPainel?: () => void }).fecharPainel?.();
    return true;
  };
  const paraCapitulo2 = () => (sm.getScene('Interface') as unknown as { iniciarPrototipo(e: unknown): void }).iniciarPrototipo(sessao.estado);
  const fimPartida = () => { if (ativa('Interface')) paraCapitulo2(); };
  // Chapter 3 is the 3D Mars (irParaMarte.ts), loaded from whatever scene is running.
  const marte3D = () => {
    const ativa = cenaRodando();
    if (!ativa) { avisar('No running scene to load from.'); return; }
    iniciarMarte3D(ativa, 10, [200, 200]);
  };
  const chegada = () => {
    sm.getScenes(true).forEach((s) => { if (s.scene.key === 'Radar') sm.stop('Radar'); });
    sm.run('Chegada', { mundo: 'marte', aoTerminar: marte3D });
    sm.bringToTop('Chegada');
  };

  // --- the scenes ---
  titulo('Leaving the Moon (chapter 1)');
  botao('Full departure: liftoff, zoom, leaving the Moon, cruise', () => {
    if (!naLua()) return;
    if (!sessao.filmePronto) avisar('The zoom film is still downloading: the flight starts when it is ready.');
    (sm.getScene('Superficie') as unknown as { decolar(fim: () => void): void }).decolar(() => sessao.partir(fimPartida));
  });
  botao('Skip to leaving the Moon', () => {
    if (!naLua()) return;
    sessao.voo = null; sessao.transicao = null;
    sessao.vista = 'lua'; sessao.u = sessao.alvo = sessao.uGlobo;
    sessao.partir(fimPartida);
  });
  botao('Skip to the cruise to Mars', () => {
    if (!naLua()) return;
    sessao.voo = null; sessao.transicao = null;
    sessao.vista = 'sistema'; sessao.u = sessao.alvo = sessao.uSistema;
    sessao.partida = { fase: 'cruzeiro', t: 0, fim: fimPartida, acabou: false };
  });
  titulo('Arriving at Mars');
  botao('Arrival: flight to Mars, then landing', chegada);
  botao('Skip to the landing', marte3D);
  titulo('Chapters');
  botao('Chapter 2: the ship (3D, playable)', () => {
    const ativa = cenaRodando();
    if (!ativa) { avisar('No running scene to load from.'); return; }
    iniciarNave3D(ativa, 5, [200]);
  });
  botao('Chapter 3: Mars (3D, playable)', marte3D);
  botao('Mars, zoom out to space', () => {
    marte3D();
    // Once the Mars scenes are up, close the morning report and zoom out (the Mars film).
    depois(1500, () => {
      (sm.getScene('Interface') as unknown as { fecharPainel?: () => void }).fecharPainel?.();
      sessao.voar('lua');
    });
  });
  titulo('Mars map');
  botao('Mars map preview (Jezero)', () => {
    if (!sm.getScene('TerrenoMarte')) sm.add('TerrenoMarte', TerrenoMarte, false);
    const pausadas = sm.getScenes(true).map((s) => s.scene.key).filter((k) => k !== 'TerrenoMarte');
    pausadas.forEach((k) => { sm.pause(k); sm.getScene(k).cameras.main.setVisible(false); });
    sm.run('TerrenoMarte', { aoSair: () => pausadas.forEach((k) => { sm.getScene(k).cameras.main.setVisible(true); sm.resume(k); }) });
    sm.bringToTop('TerrenoMarte');
  });
  titulo('');
  botao('Reload: chapter 1', () => location.reload());
  lista.append(estado);
}
