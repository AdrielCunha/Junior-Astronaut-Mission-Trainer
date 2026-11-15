// Historical facts checked against NASA's Apollo LRV documentation.
export const ROVER_APOLLO = {
  titulo: 'The car that drove on the Moon',
  paragrafos: [
    'Apollo astronauts drove it on the Moon in 1971 and 1972.',
    'It came folded up, like a camping chair!',
    'Each wheel was made of wire mesh and had its own motor.',
    'All three rovers are still on the Moon today!',
  ],
  fonte: 'NASA · Apollo Lunar Roving Vehicle',
  url: 'https://ares.jsc.nasa.gov/interaction/lmdp/documents/58199main_exploring_the_moon.pdf',
} as const;

// On Mars the same rover is parked by the Lander, but the real Apollo rovers never left the Moon: this panel
// owns up to it with a joke, and still teaches the real facts.
export const ROVER_APOLLO_MARTE = {
  pilula: 'APOLLO LRV · ON VACATION',
  titulo: 'Wait… this rover never went to Mars!',
  paragrafos: [
    'The real Apollo rovers only drove on the Moon, in 1971 and 1972. All three are still parked there!',
    'This one is our pretend copy. It begged to come along, so we packed it in the ship. Shh, do not tell NASA!',
    'Real Mars rovers, like Perseverance, have 6 wheels and can drive all by themselves.',
  ],
  fonte: 'NASA · Apollo Lunar Roving Vehicle · Mars 2020 Perseverance',
} as const;
