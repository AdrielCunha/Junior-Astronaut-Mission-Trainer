// Generated with AI assistance. See README, "Use of AI tools".
// Video preferences shared by scenes; storage is optional in private browsing.
import { SKINS, SKIN_PADRAO } from './dados/skins';
export type Video = { qualidade: 'auto' | 'leve' | 'alta'; movimento: 'sistema' | 'reduzido' | 'completo'; efeitos: boolean; pegadas: boolean; skin: string };
const KEY = 'lunar-odyssey-video';
const systemMotion = matchMedia('(prefers-reduced-motion: reduce)');
export const video: Video = { qualidade: 'auto', movimento: 'sistema', efeitos: true, pegadas: true, skin: SKIN_PADRAO };
try {
  const saved = JSON.parse(localStorage.getItem(KEY) ?? '{}');
  if (['auto','leve','alta'].includes(saved.qualidade)) video.qualidade = saved.qualidade;
  if (['sistema','reduzido','completo'].includes(saved.movimento)) video.movimento = saved.movimento;
  if (SKINS.some((s) => s.id === saved.skin)) video.skin = saved.skin;
  for (const key of ['efeitos','pegadas'] as const) if (typeof saved[key] === 'boolean') video[key] = saved[key];
} catch { /* Defaults also work without storage. */ }
export function escolherSkin(id: string) {
  if (!SKINS.some((s) => s.id === id)) return;
  video.skin = id;
  try { localStorage.setItem(KEY,JSON.stringify(video)); } catch { /* Storage is optional. */ }
}
export const movimentoReduzido = () => video.movimento === 'reduzido' || (video.movimento === 'sistema' && systemMotion.matches);
export let configuracoesAbertas = false;
let dialog: HTMLDialogElement | undefined;

export function abrirVideo() {
  if (!dialog) {
    const style = document.createElement('style');
    style.textContent = `#video-settings{color:#e2e8f0;background:#101b30;border:1px solid #475569;border-radius:20px;padding:24px;width:min(440px,calc(100vw - 48px));max-height:85dvh;box-sizing:border-box;overflow:auto;font:15px/1.5 system-ui;box-shadow:0 24px 90px #0009}#video-settings::backdrop{background:#020617bb}#video-settings h2{margin:0 0 8px;color:#fff;font-size:24px}#video-settings p{color:#a9bad0;font-size:13px;margin:8px 0 20px}#video-settings label{display:block;margin:16px 0}#video-settings select{display:block;width:100%;padding:10px;margin-top:6px;background:#1e293b;color:#fff;border:1px solid #64748b;border-radius:8px;font:inherit}#video-settings input{width:18px;height:18px;vertical-align:middle;accent-color:#60a5fa;margin-right:8px}#video-settings button{padding:11px 18px;border:0;border-radius:9px;background:#2563eb;color:white;font:600 15px system-ui;cursor:pointer}#video-settings :focus-visible{outline:3px solid #fbbf24;outline-offset:3px}`;
    document.head.append(style);
    dialog = document.createElement('dialog'); dialog.id = 'video-settings';
    dialog.setAttribute('aria-labelledby','video-title');
    dialog.innerHTML = `<form method="dialog"><h2 id="video-title">Video & comfort</h2><p>Adjust the mission to your screen and comfort.</p><label>Astronaut skin<select name="skin">${SKINS.map((s) => `<option value="${s.id}">${s.nome}</option>`).join('')}</select></label><label>Video quality<select name="qualidade"><option value="auto">Automatic</option><option value="leve">Low · fewer effects</option><option value="alta">High · more detail</option></select></label><label>Camera motion<select name="movimento"><option value="sistema">Use device preference</option><option value="reduzido">Reduced · no zoom flights</option><option value="completo">Full · cinematic zoom</option></select></label><p>Reduced motion uses a short fade between views and keeps decorative lights steady.</p><label><input type="checkbox" name="efeitos">Decorative animations & lunar dust</label><label><input type="checkbox" name="pegadas">Astronaut footprints</label><p>Effects and comfort update immediately. Full video quality applies the next time you open the game.</p><button type="submit">Save & return</button></form>`;
    document.body.append(dialog);
    dialog.querySelector('form')!.addEventListener('submit', () => {
      const form = dialog!.querySelector('form')!;
      const oldQuality = video.qualidade;
      video.skin = (form.elements.namedItem('skin') as HTMLSelectElement).value;
      video.qualidade = (form.elements.namedItem('qualidade') as HTMLSelectElement).value as Video['qualidade'];
      video.movimento = (form.elements.namedItem('movimento') as HTMLSelectElement).value as Video['movimento'];
      video.efeitos = (form.elements.namedItem('efeitos') as HTMLInputElement).checked;
      video.pegadas = (form.elements.namedItem('pegadas') as HTMLInputElement).checked;
      if (oldQuality !== video.qualidade) {const url = new URL(location.href);url.searchParams.delete('leve');url.searchParams.delete('hd');history.replaceState(history.state,'',url);}
      try { localStorage.setItem(KEY,JSON.stringify(video)); } catch { /* Storage is optional. */ }
    });
    dialog.addEventListener('close',()=>{configuracoesAbertas=false;});
    // Phaser listens to keys at window level; modal keys must not reach the game.
    dialog.addEventListener('keydown',e=>e.stopPropagation());
    dialog.addEventListener('keyup',e=>e.stopPropagation());
  }
  const form = dialog.querySelector('form')!;
  for (const key of ['skin','qualidade','movimento'] as const) (form.elements.namedItem(key) as HTMLSelectElement).value = video[key];
  for (const key of ['efeitos','pegadas'] as const) (form.elements.namedItem(key) as HTMLInputElement).checked = video[key];
  configuracoesAbertas=true;
  dialog.showModal();
}
