// Generated with AI assistance (Claude). See README, "Use of AI tools".
// Background music. A plain HTMLAudioElement is used so playback can start on the first user
// gesture, as browsers require, and so a scene restart on resize does not restart the track.
//
// Each place (title screen, Moon, ship, Mars) has its own playlist. Entering a place starts its
// own theme; after that the tracks are shuffled so the same one never plays twice in a row, with
// a short silence between them, and a change of place fades the old music out first.
//
// Autoplay: Chrome only unlocks sound on "activation" events (keydown, mousedown, pointerup,
// touchend, click). A touch pointerdown does NOT count, so listening only to pointerdown left
// phones silent forever. We listen to all of them and keep listening until play() succeeds.
const VOLUME = 0.3;
const CHAVE_MUDO = 'lunar-odyssey-mudo';
const CHAVE_VOLUME = 'lunar-odyssey-volume-musica';
const BASE = import.meta.env?.BASE_URL ?? '/';
const FADE_MS = 1200;
const PAUSA_MS: [number, number] = [3000, 9000];   // silence between two tracks of a playlist

export type AmbienteAudio = 'inicio' | 'lua' | 'nave' | 'marte';
export type EstadoAudio = 'tocando' | 'bloqueado' | 'mudo';

// Every track exists in public/audio as <name>.ogg and <name>.m4a (Safari needs the m4a).
// The first track of each list is that place's theme, played on arrival. To add music, drop
// both files in public/audio and list the name here.
const PLAYLISTS: Record<AmbienteAudio, string[]> = {
  inicio: ['Aventura-Espacial-8-Bit'],
  lua: ['lunar-odyssey-theme', 'Beneath_the_Silver_Tide'],
  nave: ['Beneath_the_Silver_Tide', 'lunar-odyssey-theme'],
  marte: ['Across_the_Crimson_Basin-aero', 'Beneath_the_Silver_Tide'],
};

const EVENTOS_GESTO = ['pointerup', 'touchend', 'mousedown', 'click', 'keydown'] as const;

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
let bloqueado = true;            // until the browser lets us play
let fila: string[] = [];         // tracks still to play in this round of the playlist
let faixaAtual = '';
let fade = 1;                    // 0..1, multiplies the volume during fades
let timerFade: number | undefined;
let timerPausa: number | undefined;
let esperandoGesto = false;
const ouvintes = new Set<(e: EstadoAudio) => void>();

function lerMudo() {
  try { return localStorage.getItem(CHAVE_MUDO) === '1'; } catch { return false; }
}

function salvarMudo() {
  try { localStorage.setItem(CHAVE_MUDO, mudo ? '1' : '0'); } catch { /* private mode */ }
}

function aplicarVolume() {
  if (audio) audio.volume = Math.max(0, Math.min(1, VOLUME * volume * volume * fade));
}

function avisar() {
  const e = estadoAudio();
  for (const f of ouvintes) f(e);
}

// A new round of the playlist: the place's theme first when arriving, shuffled afterwards,
// never starting with the track that just played.
function novaRodada(chegando: boolean) {
  const lista = PLAYLISTS[ambienteAtual];
  if (chegando) { fila = [...lista]; return; }
  fila = [...lista].sort(() => Math.random() - 0.5);
  if (fila.length > 1 && fila[0] === faixaAtual) fila.push(fila.shift()!);
}

function proximaFaixa() {
  if (!fila.length) novaRodada(false);
  return fila.shift()!;
}

function carregarFaixa(el: HTMLAudioElement, nome: string) {
  faixaAtual = nome;
  el.replaceChildren();
  // No codecs in the type: the files mix Opus and Vorbis, and a wrong codecs string makes some
  // browsers (Safari, older Firefox) skip a file they could play.
  const ogg = document.createElement('source');
  ogg.src = `${BASE}audio/${nome}.ogg`;
  ogg.type = 'audio/ogg';
  const m4a = document.createElement('source');
  m4a.src = `${BASE}audio/${nome}.m4a`;
  m4a.type = 'audio/mp4';
  // With <source> children the error fires on the last source, not on the element: if no file
  // of this track can play, skip to another one so the music does not stop.
  m4a.addEventListener('error', () => {
    if (PLAYLISTS[ambienteAtual].length > 1) window.setTimeout(() => trocarFaixa(proximaFaixa()), 500);
  });
  el.append(ogg, m4a);
  el.load();
}

function criarAudio() {
  if (audio) return audio;
  audio = new Audio();
  audio.preload = 'none';
  audio.style.display = 'none';
  aplicarVolume();
  novaRodada(true);
  carregarFaixa(audio, proximaFaixa());

  audio.addEventListener('ended', () => {
    // A short breath of silence, then the next track of the same place.
    window.clearTimeout(timerPausa);
    const espera = PAUSA_MS[0] + Math.random() * (PAUSA_MS[1] - PAUSA_MS[0]);
    timerPausa = window.setTimeout(() => trocarFaixa(proximaFaixa()), espera);
  });

  document.body.append(audio);
  return audio;
}

function trocarFaixa(nome: string) {
  const a = criarAudio();
  carregarFaixa(a, nome);
  fade = 0; aplicarVolume();
  tocar();
  animarFade(1);
}

function animarFade(alvo: number, depois?: () => void) {
  window.clearInterval(timerFade);
  const passo = 50 / FADE_MS;
  timerFade = window.setInterval(() => {
    fade = alvo > fade ? Math.min(alvo, fade + passo) : Math.max(alvo, fade - passo);
    aplicarVolume();
    if (fade === alvo) { window.clearInterval(timerFade); depois?.(); }
  }, 50);
}

function esperarInteracao() {
  if (esperandoGesto) return;
  esperandoGesto = true;
  for (const ev of EVENTOS_GESTO) window.addEventListener(ev, aoGesto, { capture: true });
}

function pararDeEsperar() {
  esperandoGesto = false;
  for (const ev of EVENTOS_GESTO) window.removeEventListener(ev, aoGesto, { capture: true });
}

// Runs inside the gesture: play() must be called synchronously here, or Safari refuses it.
function aoGesto() {
  if (mudo) { pararDeEsperar(); return; }
  tocar();
}

function tocar() {
  const a = criarAudio();
  if (mudo || !a.paused) return;
  let p: Promise<void> | undefined;
  try { p = a.play(); } catch { esperarInteracao(); return; }
  if (!p) return;
  p.then(() => {
    pararDeEsperar();
    if (bloqueado) { bloqueado = false; avisar(); }
    if (mudo) a.pause();
  }).catch((err: unknown) => {
    // NotAllowedError: no gesture yet. AbortError: a new load() interrupted it, nothing to do.
    if ((err as DOMException)?.name === 'NotAllowedError') {
      if (!bloqueado) { bloqueado = true; avisar(); }
      esperarInteracao();
    }
  });
}

/** Switches to the playlist of a place. Same place: nothing happens (safe on scene restarts). */
export function definirAmbienteMusica(ambiente: AmbienteAudio) {
  if (ambiente === ambienteAtual && audio) return;
  ambienteAtual = ambiente;
  novaRodada(true);
  if (!audio) return;
  window.clearTimeout(timerPausa);
  const proxima = proximaFaixa();
  if (audio.paused) { carregarFaixa(audio, proxima); if (!mudo && !bloqueado) tocar(); return; }
  animarFade(0, () => trocarFaixa(proxima));
}

export function definirMusicaDaFase(fase: Exclude<AmbienteAudio, 'inicio'>) { definirAmbienteMusica(fase); }

export function iniciarAudio() {
  if (iniciado) return;
  iniciado = true;
  criarAudio();
  // A page that already had a gesture may play at once; otherwise the first gesture starts it.
  if (!mudo) { tocar(); esperarInteracao(); }
}

/** 'bloqueado' means the browser is still waiting for a click or key before allowing sound. */
export function estadoAudio(): EstadoAudio {
  if (mudo) return 'mudo';
  return bloqueado ? 'bloqueado' : 'tocando';
}

/** Calls f whenever the state changes. Returns the function that stops listening. */
export function aoMudarAudio(f: (e: EstadoAudio) => void) {
  ouvintes.add(f);
  return () => { ouvintes.delete(f); };
}

/** Turns the music on from a button. Call it inside the click (pointerup) handler. */
export function ativarSom() {
  if (mudo) { mudo = false; salvarMudo(); }
  tocar();
  avisar();
}

export function estaMudo() {
  return mudo;
}

export function volumeMusica() { return volume; }
export function definirVolumeMusica(valor: number) {
  volume = Math.max(0, Math.min(1, valor));
  try { localStorage.setItem(CHAVE_VOLUME, String(volume)); } catch { /* private mode */ }
  aplicarVolume();
}

export function alternarMudo() {
  mudo = !mudo;
  salvarMudo();
  const a = criarAudio();
  if (mudo) a.pause();
  else tocar();
  avisar();
  return mudo;
}
