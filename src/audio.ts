// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Background music. A plain HTMLAudioElement is used so playback can start on the first user
// gesture, as browsers require, and so a scene restart on resize does not restart the track.
const VOLUME = 0.3;
const CHAVE_MUDO = 'lunar-odyssey-mudo';
const BASE = import.meta.env.BASE_URL;

let audio: HTMLAudioElement | null = null;
let iniciado = false;
let comecou = false;
let mudo = lerMudo();

function lerMudo() {
  try { return localStorage.getItem(CHAVE_MUDO) === '1'; } catch { return false; }
}

function salvarMudo() {
  try { localStorage.setItem(CHAVE_MUDO, mudo ? '1' : '0'); } catch { /* private mode */ }
}

function criarAudio() {
  if (audio) return audio;
  audio = new Audio();
  audio.loop = true;
  audio.preload = 'none';
  audio.volume = VOLUME;
  audio.style.display = 'none';

  const ogg = document.createElement('source');
  ogg.src = `${BASE}audio/lunar-odyssey-theme.ogg`;
  ogg.type = 'audio/ogg; codecs="opus"';
  const m4a = document.createElement('source');
  m4a.src = `${BASE}audio/lunar-odyssey-theme.m4a`;
  m4a.type = 'audio/mp4; codecs="mp4a.40.2"';

  audio.append(ogg, m4a);
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
  if (mudo || comecou) return;
  a.play().then(() => { comecou = true; }).catch(() => {
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

export function alternarMudo() {
  mudo = !mudo;
  salvarMudo();
  const a = criarAudio();
  if (mudo) a.pause();
  else tocar();
  return mudo;
}
