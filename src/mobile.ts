// Touch-capable phones and tablets only; a mouse/trackpad does not enable game controls.
import { t } from './idioma';
export const dispositivoMovel = () => window.matchMedia('(hover: none) and (pointer: coarse)').matches;

export function escalaInterface(largura: number, altura: number, minimo = 0.62, maximo = 1.4) {
  const referencia = dispositivoMovel() && largura > altura ? 480 : 650;
  return Math.max(minimo, Math.min(maximo, largura / 1100, altura / referencia));
}

export const controleMovel = { x: 0, y: 0, pular: false };
let puloPendente = false;

export function consumirPuloMovel() {
  const pular = puloPendente;
  puloPendente = false;
  return pular;
}

export function limparControleMovel() {
  controleMovel.x = 0;
  controleMovel.y = 0;
  controleMovel.pular = false;
  puloPendente = false;
}

export function instalarControlesMoveis(jogo: import('phaser').Game) {
  if (!dispositivoMovel()) return;
  const controles = document.createElement('div');
  controles.id = 'controles-moveis';
  controles.innerHTML = '<div class="joystick-area" aria-label="Move"><div class="joystick"><img class="joystick-arte" src="icons/lunar-v6/controle_move.svg" alt="" aria-hidden="true"><div class="joystick-manopla"></div></div></div><div class="botoes-moveis"><button type="button" class="botao-movel" data-acao="pular" aria-label="Jump"><img src="icons/lunar-v6/botao_jump.svg" alt="" aria-hidden="true"></button><button type="button" class="botao-movel botao-acao" data-acao="usar" aria-label="Use"><img src="icons/lunar-v6/botao_use.svg" alt="" aria-hidden="true"></button></div>';
  document.body.appendChild(controles);

  const stick = controles.querySelector<HTMLElement>('.joystick')!;
  const area = controles.querySelector<HTMLElement>('.joystick-area')!;
  const manopla = controles.querySelector<HTMLElement>('.joystick-manopla')!;
  let pointerId: number | null = null;
  const mover = (ev: PointerEvent) => {
    const r = stick.getBoundingClientRect();
    // The SVG ring sits below the MOVE label: work from its center, not the box center.
    const raio = r.width * 0.17;
    const x = ev.clientX - (r.left + r.width * 0.507);
    const y = ev.clientY - (r.top + r.height * 0.562);
    const tamanho = Math.hypot(x, y);
    const fator = tamanho > raio ? raio / tamanho : 1;
    const dx = x * fator / raio, dy = y * fator / raio;
    manopla.style.transform = `translate(${dx * raio}px, ${dy * raio}px)`;
    // Dead zone prevents drift. Movement is mapped to screen axes in Superficie.
    controleMovel.x = Math.hypot(dx, dy) > 0.15 ? dx : 0;
    controleMovel.y = Math.hypot(dx, dy) > 0.15 ? dy : 0;
  };
  area.addEventListener('pointerdown', (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    if (pointerId !== null || !controles.classList.contains('visivel')) return;
    pointerId = ev.pointerId;
    const r = stick.getBoundingClientRect(), a = area.getBoundingClientRect();
    // Place the ring's centre under the finger without introducing initial movement.
    stick.style.left = `${ev.clientX-a.left-r.width*0.507}px`;
    stick.style.top = `${ev.clientY-a.top-r.height*0.562}px`;
    stick.style.bottom = 'auto';
    area.setPointerCapture(pointerId);
  });
  area.addEventListener('pointermove', (ev) => { if (pointerId === ev.pointerId) { ev.preventDefault(); mover(ev); } });
  const zerarJoystick = () => {
    pointerId = null;
    controleMovel.x = controleMovel.y = 0;
    manopla.style.transform = '';
    stick.style.left = ''; stick.style.top = ''; stick.style.bottom = '';
  };
  const soltar = (ev: PointerEvent) => { if (pointerId === ev.pointerId) zerarJoystick(); };
  area.addEventListener('pointerup', soltar);
  area.addEventListener('pointercancel', soltar);
  area.addEventListener('lostpointercapture', soltar);

  const pulo = controles.querySelector<HTMLButtonElement>('[data-acao="pular"]')!;
  pulo.addEventListener('pointerdown', (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    if (!controles.classList.contains('visivel')) return;
    controleMovel.pular = true;
    puloPendente = true;
    pulo.setPointerCapture(ev.pointerId);
  });
  const soltarPulo = () => { controleMovel.pular = false; };
  pulo.addEventListener('pointerup', soltarPulo);
  pulo.addEventListener('pointercancel', soltarPulo);
  pulo.addEventListener('lostpointercapture', soltarPulo);

  controles.querySelector('[data-acao="usar"]')!.addEventListener('pointerdown', (ev) => {
    ev.preventDefault(); ev.stopPropagation();
    if (!jogo.scene.isActive('Superficie')) return;
    if (!controles.classList.contains('visivel')) return;
    const superficie = jogo.scene.getScene('Superficie') as import('./cenas/Superficie').Superficie;
    if (superficie.input.enabled && !jogo.scene.isActive('Radar') && !jogo.scene.isActive('MenuJogo')) superficie.interagirPerto();
  });

  const atualizar = () => {
    if (!jogo.scene.scenes.some(cena => cena.scene.key === 'Superficie')) return;
    const superficie = jogo.scene.getScene('Superficie');
    const habilitado = superficie?.scene.isActive() && superficie.scene.isVisible() && superficie.input.enabled
      && !jogo.scene.isActive('Radar') && !jogo.scene.isActive('MenuJogo') && !jogo.scene.isActive('EditorBase');
    controles.classList.toggle('visivel', !!habilitado);
    if (!habilitado) { limparControleMovel(); zerarJoystick(); }
  };
  jogo.events.on('poststep', atualizar);
  atualizar();
  window.addEventListener('blur', () => { limparControleMovel(); zerarJoystick(); });
  document.addEventListener('visibilitychange', () => { if (document.hidden) { limparControleMovel(); zerarJoystick(); } });
}

export function instalarOrientacaoMovel() {
  if (!dispositivoMovel()) return;
  const aviso = document.createElement('div');
  aviso.id = 'aviso-orientacao';
  aviso.innerHTML = `<div><span aria-hidden="true">↻</span><h1>${t('Turn your device sideways')}</h1><p>${t('Play Lunar Odyssey in landscape mode.')}</p><button type="button">${t('PLAY IN LANDSCAPE')}</button></div>`;
  document.body.appendChild(aviso);
  const atualizar = () => aviso.classList.toggle('visivel', window.innerHeight > window.innerWidth);
  window.addEventListener('resize', atualizar);
  screen.orientation?.addEventListener('change', atualizar);
  aviso.querySelector('button')!.addEventListener('click', async () => {
    try {
      await document.documentElement.requestFullscreen();
      await screen.orientation.lock('landscape');
    } catch {
      // Browsers (especially iOS Safari) may not allow locking; keep the rotate hint visible.
      atualizar();
    }
  });
  atualizar();
}
