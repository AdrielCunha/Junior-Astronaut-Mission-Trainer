const VOLUME = 0.3;
const CHAVE_MUDO = 'lunar-odyssey-mudo';
const CHAVE_VOLUME = 'lunar-odyssey-volume-musica';
const BASE = import.meta.env.BASE_URL;

export type AmbienteAudio = 'inicio' | 'lua' | 'nave' | 'marte';

const MUSICAS_POR_AMBIENTE: Record<AmbienteAudio, string> = {
  inicio: 'Aventura-Espacial-8-Bit',
  lua: 'lunar-odyssey-theme',
  nave: 'Beneath_the_Silver_Tide',
  marte: 'Across_the_Crimson_Basin-aero',
};

let audio: HTMLAudioElement | null = null;
let ambienteAtual: AmbienteAudio = 'inicio';
let iniciado = false;
let mudo = lerMudo();
let volume = (() => {
  try {
    const salvo = localStorage.getItem(CHAVE_VOLUME);
    if (salvo === null) return 0.7;
    const n = Number(salvo);
    return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.7;
  } catch {
    return 0.7;
  }
})();

function lerMudo() {
  try { return localStorage.getItem(CHAVE_MUDO) === '1'; } catch { return false; }
}

function salvarMudo() {
  try { localStorage.setItem(CHAVE_MUDO, mudo ? '1' : '0'); } catch { /* private mode */ }
}

function carregarFaixa(el: HTMLAudioElement, nome: string) {
  el.replaceChildren();

  const ogg = document.createElement('source');
  ogg.src = `${BASE}audio/${nome}.ogg`;
  ogg.type = 'audio/ogg; codecs="opus"';
  const m4a = document.createElement('source');
  m4a.src = `${BASE}audio/${nome}.m4a`;
  m4a.type = 'audio/mp4; codecs="mp4a.40.2"';

  el.append(ogg, m4a);
  el.load();
}

function criarAudio() {
  if (audio) return audio;
  audio = new Audio();
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = VOLUME * volume * volume;
  audio.style.display = 'none';

  carregarFaixa(audio, MUSICAS_POR_AMBIENTE[ambienteAtual]);

  document.body.append(audio);
  return audio;
}

export function definirAmbienteMusica(ambiente: AmbienteAudio) {
  if (ambiente === ambienteAtual && audio) return;
  ambienteAtual = ambiente;

  const a = criarAudio();
  const estavaTocando = !a.paused;
  carregarFaixa(a, MUSICAS_POR_AMBIENTE[ambienteAtual]);

  if (!mudo && (estavaTocando || iniciado)) {
    tocar();
  }
}

export function definirMusicaDaFase(fase: Exclude<AmbienteAudio, 'inicio'>) { definirAmbienteMusica(fase); }

function esperarInteracao() {
  window.addEventListener('pointerdown', primeiraInteracao);
  window.addEventListener('keydown', primeiraInteracao);
}

function primeiraInteracao() {
  window.removeEventListener('pointerdown', primeiraInteracao);
  window.removeEventListener('keydown', primeiraInteracao);
  tocar();
}

function tocar() {
  const a = criarAudio();
  if (mudo || !a.paused) return;
  a.play().then(() => { if (mudo) a.pause(); }).catch(() => {
    if (!mudo) esperarInteracao();
  });
}

export function iniciarAudio() {
  if (iniciado) return;
  iniciado = true;
  criarAudio();
  if (!mudo) esperarInteracao();
}

export function estaMudo() {
  return mudo;
}

export function volumeMusica() { return volume; }
export function definirVolumeMusica(valor: number) {
  volume = Math.max(0, Math.min(1, valor));
  try { localStorage.setItem(CHAVE_VOLUME, String(volume)); } catch { /* private mode */ }
  if (audio) audio.volume = VOLUME * volume * volume;
}

export function alternarMudo() {
  mudo = !mudo;
  salvarMudo();
  const a = criarAudio();
  if (mudo) a.pause();
  else tocar();
  return mudo;
}