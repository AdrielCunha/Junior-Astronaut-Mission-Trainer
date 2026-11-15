// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Background music. A plain HTMLAudioElement is used so playback can start on the first user
// gesture, as browsers require, and so a scene restart on resize does not restart the track.
const VOLUME = 0.3;
const CHAVE_MUDO = 'lunar-odyssey-mudo';
const CHAVE_VOLUME = 'lunar-odyssey-volume-musica';
const BASE = import.meta.env.BASE_URL;

const FAIXAS = [
  'lunar-odyssey-theme',
  'Beneath_the_Silver_Tide',
  'Across_the_Crimson_Basin-aero',
];

let audio: HTMLAudioElement | null = null;
let faixaAtual = 0;
let iniciado = false;
let mudo = lerMudo();
let volume = (() => { try { const salvo = localStorage.getItem(CHAVE_VOLUME); if (salvo === null) return 0.7; const n = Number(salvo); return Number.isFinite(n) ? Math.max(0, Math.min(1, n)) : 0.7; } catch { return 0.7; } })();

function lerMudo() {
  try { return localStorage.getItem(CHAVE_MUDO) === '1'; } catch { return false; }
}

function salvarMudo() {
  try { localStorage.setItem(CHAVE_MUDO, mudo ? '1' : '0'); } catch { /* private mode */ }
}

function carregarFaixa(el: HTMLAudioElement, indice: number) {
  const nome = FAIXAS[indice];
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
  audio.preload = 'none';
  audio.volume = VOLUME * volume * volume;
  audio.style.display = 'none';

  carregarFaixa(audio, faixaAtual);

  audio.addEventListener('ended', () => {
    if (!audio) return;
    faixaAtual = (faixaAtual + 1) % FAIXAS.length;
    carregarFaixa(audio, faixaAtual);
    if (!mudo) {
      audio.play().catch(() => {});
    }
  });

  document.body.append(audio);
  return audio;
}

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