// Temporary developer tools. Enabled on the dev server, or explicitly with ?dev.
import type Phaser from 'phaser';
import type { Interface } from './cenas/Interface';
import type { Base } from './cenas/Base';
import { CAPITULOS } from './capitulos';
import { sessao } from './cenas/sessao';
import { iniciarMundo3D } from './cenas/irParaMarte';
import { PRAZO_TEMPESTADE_MS } from './cenas/tempestadeSolar';

export function instalarMenuDev(jogo: Phaser.Game) {
  const estilo = document.createElement('style');
  estilo.textContent = `
    #mission-dev-launch{position:fixed;bottom:12px;left:50%;transform:translateX(-50%);z-index:10010;border:2px solid #fff;border-radius:999px;background:#17263f;color:#fddd45;padding:6px 14px;font:bold 13px Fredoka,system-ui;cursor:pointer}
    #mission-dev{box-sizing:border-box;width:min(440px,calc(100vw - 24px));max-height:calc(100dvh - 24px);overflow:auto;padding:22px;border:3px solid white;border-radius:26px;background:#14243e;color:white;box-shadow:0 8px 0 #070e24;font:16px Fredoka,system-ui}
    #mission-dev::backdrop{background:#040c20aa} #mission-dev h2{color:#ffd93b;margin:0 0 6px;font-size:28px} #mission-dev p{font-size:13px;color:#bfd6ef;margin:8px 0 16px}
    #mission-dev button,#mission-dev select,#mission-dev input[type=number]{font:inherit;border:2px solid #bddfff;border-radius:12px;padding:8px;background:#203956;color:white;box-sizing:border-box}
    #mission-dev button{cursor:pointer} #mission-dev button:hover{background:#35557b} #mission-dev button:focus-visible,#mission-dev input:focus-visible,#mission-dev select:focus-visible{outline:3px solid #ffd93b;outline-offset:2px}
    #mission-dev .dev-resource{display:grid;grid-template-columns:1fr 76px 44px 52px;gap:6px;align-items:center;margin:10px 0} #mission-dev input[type=number]{width:76px} #mission-dev input[type=range]{grid-column:1/-1;width:100%;accent-color:#4ade80;margin:0 0 6px}
    #mission-dev .dev-actions{display:grid;gap:8px;margin-top:14px} #mission-dev .dev-green{background:#15803d} #mission-dev .dev-red{background:#a53646} #mission-dev select{width:100%;margin-bottom:8px} #mission-dev label{display:block} #mission-dev output{display:block;color:#fde68a;font-size:14px;min-height:20px;margin-top:12px} #mission-dev .dev-close{float:right;padding:3px 10px}
  `;
  document.head.append(estilo);
  const abrir = document.createElement('button');
  abrir.id = 'mission-dev-launch'; abrir.textContent = 'DEV'; abrir.title = 'Developer tools (F2)';
  const dialog = document.createElement('dialog'); dialog.id = 'mission-dev';
  dialog.setAttribute('aria-labelledby', 'mission-dev-title');
  dialog.innerHTML = `<button type="button" class="dev-close" aria-label="Close developer menu">×</button><h2 id="mission-dev-title">DEV TOOLS</h2><p>Temporary test controls — changes affect the current mission.<br>F2 opens / closes this menu. The game waits while it is open.</p>
    <div class="dev-actions"><button type="button" data-action="edit"><img src="icons/lunar-v6/wrench.png" alt="" width="24" height="24" style="vertical-align:middle;margin-right:8px">EDIT BASE &amp; OBJECTS</button></div><p>Moon / Mars surface: click to select, R to turn, click or E to place.</p>
    <div id="dev-values"></div><div class="dev-actions"><button type="button" class="dev-green" data-action="apply">Apply values</button><button type="button" data-action="check">Check mission result</button><button type="button" data-action="finish">Test end of chapter</button><button type="button" class="dev-red" data-action="storm">Trigger solar storm · ${PRAZO_TEMPESTADE_MS / 1000}s</button></div>
    <hr><label for="dev-chapter">Jump to chapter (starts a fresh chapter)</label><select id="dev-chapter">${CAPITULOS.map((c, i) => `<option value="${i}">${c.numero}. ${c.titulo}</option>`).join('')}</select><button type="button" data-action="chapter">Open chapter</button><output aria-live="polite"></output>`;
  document.body.append(abrir, dialog);
  const campos = dialog.querySelector<HTMLElement>('#dev-values')!;
  const nomes = { oxigenio: 'Oxygen', dose: 'Radiation', meta: 'Rocket / progress' };
  for (const [key, nome] of Object.entries(nomes)) {
    const linha = document.createElement('div'); linha.className = 'dev-resource';
    linha.innerHTML = `<label for="dev-${key}">${nome} %</label><input id="dev-${key}" type="number" min="0" max="100" step="1" aria-label="${nome} percent"><button type="button" data-value="0">0</button><button type="button" data-value="100">100</button><input type="range" min="0" max="100" step="1" aria-label="${nome} slider">`;
    const numero = linha.querySelector<HTMLInputElement>('input[type=number]')!;
    const slider = linha.querySelector<HTMLInputElement>('input[type=range]')!;
    numero.addEventListener('input', () => { slider.value = numero.value; });
    slider.addEventListener('input', () => { numero.value = slider.value; });
    linha.querySelectorAll<HTMLButtonElement>('button').forEach(b => b.addEventListener('click', () => { numero.value = slider.value = b.dataset.value!; }));
    campos.append(linha);
  }
  let pausadas: string[] = [];
  const status = (texto: string) => { dialog.querySelector('output')!.textContent = texto; };
  const retomar = () => {
    for (const key of pausadas) if (jogo.scene.isPaused(key)) {
      jogo.scene.getScene(key).input.keyboard?.resetKeys();
      jogo.scene.resume(key);
    }
    pausadas = [];
  };
  const fechar = () => { retomar(); dialog.close(); };
  const alvo = (): Interface | Base => jogo.scene.getScene(jogo.scene.isActive('Base') || jogo.scene.isPaused('Base') ? 'Base' : 'Interface') as Interface | Base;
  const disponivel = () => {
    if (sessao.emTarefa || jogo.scene.isActive('MenuJogo') || jogo.scene.isPaused('MenuJogo') || jogo.scene.isActive('Radar') || jogo.scene.isPaused('Radar')) {
      status('Close the task / menu and start the mission first.'); return false;
    }
    return true;
  };
  const mostrar = () => {
    if (dialog.open) { fechar(); return; }
    if (!jogo.scene || (!jogo.scene.isActive('Interface') && !jogo.scene.isActive('Base'))) return;
    pausadas = jogo.scene.getScenes(true).map(scene => scene.sys.settings.key);
    for (const key of pausadas) { const scene = jogo.scene.getScene(key); scene.input.keyboard?.resetKeys(); jogo.scene.pause(key); }
    const valores = alvo().devValores();
    dialog.querySelector<HTMLSelectElement>('#dev-chapter')!.value = String(sessao.capIdx);
    for (const key of ['oxigenio', 'dose', 'meta'] as const) {
      const numero = dialog.querySelector<HTMLInputElement>(`#dev-${key}`)!;
      numero.value = String(Math.round(valores[key]));
      numero.closest('.dev-resource')!.querySelector<HTMLInputElement>('input[type=range]')!.value = numero.value;
    }
    status('Oxygen 0% or radiation 100% fails the mission. Oxygen 100% is safe.');
    dialog.showModal();
  };
  const aplicar = () => {
    const valores = {} as { oxigenio: number; dose: number; meta: number };
    for (const key of ['oxigenio', 'dose', 'meta'] as const) {
      const input = dialog.querySelector<HTMLInputElement>(`#dev-${key}`)!;
      if (!input.validity.valid || input.value === '' || !Number.isFinite(input.valueAsNumber)) { status('Enter whole numbers from 0 to 100.'); input.focus(); return false; }
      valores[key] = input.valueAsNumber;
    }
    alvo().devAplicar(valores); return true;
  };
  dialog.querySelector('.dev-close')!.addEventListener('click', fechar);
  dialog.addEventListener('cancel', event => { event.preventDefault(); fechar(); });
  dialog.addEventListener('close', retomar);
  for (const tipo of ['keydown', 'keyup', 'pointerdown', 'pointerup', 'wheel']) dialog.addEventListener(tipo, event => event.stopPropagation());
  dialog.addEventListener('keydown', event => { if (event.key === 'F2') { event.preventDefault(); fechar(); } });
  dialog.querySelectorAll<HTMLButtonElement>('[data-action]').forEach(botao => botao.addEventListener('click', () => {
    const acao = botao.dataset.action;
    if(acao==='edit') {
      if(!disponivel() || jogo.scene.isPaused('Base') || sessao.editandoBase || sessao.mundo==='nave' || sessao.vista!=='chao' || (sessao.fase!=='dia' && sessao.fase!=='inicio')) {status('Open the Moon or Mars surface during the day to edit.');return;}
      fechar();
      (jogo.scene.getScene('Interface') as Interface).abrirEditor();return;
    }
    if (acao === 'chapter') {
      const indice = Number(dialog.querySelector<HTMLSelectElement>('#dev-chapter')!.value);
      const capitulo = CAPITULOS[indice];
      if (!capitulo) { status('Select a chapter first.'); return; }
      // Find the scene while the menu has it paused, before closing resumes the game.
      const cena = jogo.scene.scenes.find((c) => c.sys.isActive() || jogo.scene.isPaused(c.sys.settings.key));
      if (!cena) { status('No mission scene is available.'); return; }
      fechar();
      iniciarMundo3D(cena, capitulo.tema, indice, 0, []);
      return;
    }
    if (!disponivel()) return;
    if (acao === 'storm') {
      if (sessao.mundo !== 'lua' || jogo.scene.isPaused('Base')) { status(`The ${PRAZO_TEMPESTADE_MS / 1000}-second shield emergency is available in chapter 1 (Moon).`); return; }
      (alvo() as Interface).devTempestade(); fechar(); return;
    }
    if (!aplicar()) return;
    if (acao === 'apply') { status('Values applied. Close this menu to resume.'); return; }
    const resultado = alvo().devResultado(acao === 'finish');
    if (resultado) fechar();
    else status('Mission still running. Rocket 100% wins after the chapter deadline.');
  }));
  abrir.addEventListener('click', mostrar);
  const tecla = (event: KeyboardEvent) => { if (event.key === 'F2') { event.preventDefault(); mostrar(); } };
  window.addEventListener('keydown', tecla);
  jogo.events.once('destroy', () => { retomar(); abrir.remove(); dialog.remove(); estilo.remove(); window.removeEventListener('keydown', tecla); });
}
