// Custom Lunar Odyssey icon set (public/icons). One texture key per icon, loaded by Carregar.
export const ICONES = {
  oxygen: 'icons/oxygen.png',
  radiation: 'icons/radiation.png',
  rocket: 'icons/rocket.png',
  energy: 'icons/energy.png',
  hand: 'icons/hand.png',
  heart: 'icons/heart.png',
  shield: 'icons/shield.png',
  wrench: 'icons/wrench.png',
  star: 'icons/star.png',
} as const;

export type IconeJogo = keyof typeof ICONES;

export const chaveIcone = (id: IconeJogo) => `icon_${id}`;
