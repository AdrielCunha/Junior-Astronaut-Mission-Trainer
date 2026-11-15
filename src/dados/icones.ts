// User-selected lunar_icons_v6 artwork. Original PNGs and editable SVGs are kept together.
// PNG textures are loaded once by Carregar; secondary UI meanings reuse this same set.
import { t } from '../idioma';

export const ICONES = {
  oxygen: 'icons/lunar-v6/oxygen.png',
  radiation: 'icons/lunar-v6/radiation.png',
  rocket: 'icons/lunar-v6/rocket.png',
  energy: 'icons/lunar-v6/energy.png',
  backpack: 'icons/lunar-v6/backpack.png',
  heart: 'icons/lunar-v6/heart.png',
  shield: 'icons/lunar-v6/shield.png',
  wrench: 'icons/lunar-v6/wrench.png',
  // Extra icons in the same style (tools/icones/make_icons.py), so messages show a picture instead of an emoji.
  sun: 'icons/lunar-v6/sun.png',
  moon: 'icons/lunar-v6/moon.png',
  star: 'icons/lunar-v6/star.png',
  timer: 'icons/lunar-v6/timer.png',
  cargo: 'icons/lunar-v6/cargo.png',
  idea: 'icons/lunar-v6/idea.png',
  check: 'icons/lunar-v6/check.png',
  cross: 'icons/lunar-v6/cross.png',
  warning: 'icons/lunar-v6/warning.png',
  helmet: 'icons/lunar-v6/helmet.png',
  antenna: 'icons/lunar-v6/antenna.png',
  cold: 'icons/lunar-v6/cold.png',
  mars: 'icons/lunar-v6/mars.png',
  rover: 'icons/lunar-v6/rover.png',
  plant: 'icons/lunar-v6/plant.png',
  goal: 'icons/lunar-v6/goal.png',
  // The suit button of the start screen: a 3D shirt rendered in Blender (tools/lua3d/make_icone_camisa.py).
  shirt: 'icons/lunar-v6/shirt.png',
} as const;

export type IconeJogo = keyof typeof ICONES;

export const chaveIcone = (id: IconeJogo) => `icon_${id}`;

// Compatibility for older chapter messages: always display the game's own artwork.
const LEGADOS: Record<string, IconeJogo> = {
  '🔋':'energy','✋':'backpack','❤':'heart','❤️':'heart','💨':'oxygen','☢':'radiation','☢️':'radiation',
  '🚀':'rocket','🛡':'shield','🛡️':'shield','🔧':'wrench','⭐':'star','🌟':'star','🏆':'star',
  '🔥':'warning','☀':'sun','☀️':'sun','📦':'cargo','⚠':'warning','⚠️':'warning',
  '🤕':'heart','💡':'idea','🏗':'wrench','🏗️':'wrench','🎉':'star','⏱':'timer','⏱️':'timer',
  '✅':'check','❌':'cross','🙂':'check','😔':'cross','📊':'star','🥶':'cold','🌙':'moon',
  '📡':'antenna','🧑‍🚀':'helmet','👩‍🚀':'helmet','🚙':'rover', '🧪':'idea','🔦':'idea','❄':'cold','❄️':'cold','🚩':'goal','☄':'star','🌪':'mars','🌱':'plant','👉':'goal','➡️':'goal','🔴':'mars','🧑':'helmet',
  hand:'backpack',heating:'energy',construction:'wrench',
  medical:'heart',science:'idea',success:'check',failure:'cross',data:'antenna',
  solar:'energy',
};
export function resolverIcone(id: string): IconeJogo {
  return Object.prototype.hasOwnProperty.call(ICONES,id) ? id as IconeJogo : LEGADOS[id] ?? 'wrench';
}

// Pictograms are separate images, not platform-dependent characters inside sentences.
export function textoDoJogo(texto: string) {
  return t(texto).replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u,'')
    .replace(/(\d+)\s*🔋+/gu,`$1 ${t('batteries')}`)
    .replace(/🔋/gu,t('batteries'))
    .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu,'')
    .replace(/ {2,}/g,' ').trim();
}
