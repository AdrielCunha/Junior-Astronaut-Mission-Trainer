// User-selected lunar_icons_v6 artwork. Original PNGs and editable SVGs are kept together.
// PNG textures are loaded once by Carregar; secondary UI meanings reuse this same set.
export const ICONES = {
  oxygen: 'icons/lunar-v6/oxygen.png',
  radiation: 'icons/lunar-v6/radiation.png',
  rocket: 'icons/lunar-v6/rocket.png',
  energy: 'icons/lunar-v6/energy.png',
  backpack: 'icons/lunar-v6/backpack.png',
  heart: 'icons/lunar-v6/heart.png',
  shield: 'icons/lunar-v6/shield.png',
  wrench: 'icons/lunar-v6/wrench.png',
} as const;

export type IconeJogo = keyof typeof ICONES;

export const chaveIcone = (id: IconeJogo) => `icon_${id}`;

// Compatibility for older chapter messages: always display the game's own artwork.
const LEGADOS: Record<string, IconeJogo> = {
  '🔋':'energy','✋':'backpack','❤':'heart','❤️':'heart','💨':'oxygen','☢':'radiation','☢️':'radiation',
  '🚀':'rocket','🛡':'shield','🛡️':'shield','🔧':'wrench','⭐':'rocket','🌟':'rocket','🏆':'rocket',
  '🔥':'energy','☀':'radiation','☀️':'radiation','📦':'backpack','⚠':'radiation','⚠️':'radiation',
  '🤕':'heart','💡':'wrench','🏗':'wrench','🏗️':'wrench','🎉':'shield',
  '✅':'shield','🙂':'shield','😔':'heart','📊':'rocket','🥶':'energy','🌙':'rocket',
  hand:'backpack',star:'rocket',heating:'energy',sun:'radiation',cargo:'backpack',
  warning:'radiation',medical:'heart',science:'wrench',construction:'wrench',
  success:'shield',failure:'heart',data:'rocket',cold:'energy',moon:'rocket',
  solar:'energy',rover:'wrench',helmet:'backpack',
};
export function resolverIcone(id: string): IconeJogo {
  return Object.prototype.hasOwnProperty.call(ICONES,id) ? id as IconeJogo : LEGADOS[id] ?? 'wrench';
}

// Pictograms are separate images, not platform-dependent characters inside sentences.
export function textoDoJogo(texto: string) {
  return texto.replace(/^[\p{Extended_Pictographic}\uFE0F\u200D\s]+/u,'')
    .replace(/(\d+)\s*🔋+/gu,'$1 batteries')
    .replace(/🔋/gu,'batteries')
    .replace(/\p{Extended_Pictographic}|\uFE0F|\u200D/gu,'')
    .replace(/ {2,}/g,' ').trim();
}
