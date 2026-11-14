# Lunar Odyssey

A browser game for kids ages 7 to 12, built for the NASA Space Apps Challenge 2026, challenge "Build a Junior Astronaut Mission Trainer".

**Status:** in development (hackathon weekend, November 14-15, 2026). All three chapters are playable from start to end.

## The idea

You lead a crew from a base on the Moon, across the trip to Mars, to a new base on Mars. Every day you have fewer batteries than the mission needs, so every choice has a cost: a battery spent on building the rocket is a battery that does not make oxygen or power the radiation shield.

The solar storms in the game are storms that really happened. Their dates and strength come from NASA data.

## Three chapters

| Chapter | Place | Goal | Real days used |
|---|---|---|---|
| 1 | Moon base | Build the rocket | May 5-12, 2024 |
| 2 | Spacecraft | Reach Mars | May 13-17, 2024 |
| 3 | Mars | Build a base from nothing and survive the cold nights | May 18-25, 2024 |

Each chapter is a series of days. Each day: read the morning report, send batteries to the rooms, see what happened overnight. The crew's radiation dose carries from one chapter to the next. The real trip to Mars takes about 7 months; the game shortens it to 5 days.

## NASA data

The data is downloaded once and stored in the game as archived data. The game does not show it as live.

| Source | Used for |
|---|---|
| [DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) space weather database | Solar flares and coronal mass ejections that become the storm warnings |
| [RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) radiation dosimetry database | Measured radiation dose: LRO/CRaTER in lunar orbit, Curiosity/MSL-RAD on the surface of Mars |
| [Curiosity REMS weather](https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json) | Real temperatures on Mars for the cold nights |
| [OSDR](https://osdr.nasa.gov/bio/repo/) Open Science Data Repository | Short science facts about health and plants in space |
| [LRO LOLA polar elevation](https://pds-geosciences.wustl.edu/lro/lro-l-lola-3-rdr-v1/lrolol_1xxx/data/lola_gdr/polar/img/) (LDEM_80S_80M, LDEM_75S_240M) | The real ground of the base on the rim of Shackleton crater, its slopes, and the zoom-out regions |
| [NASA SVS CGI Moon Kit](https://svs.gsfc.nasa.gov/4720) (LRO LROC color + LOLA) | The whole Moon |
| [NASA SVS Deep Star Maps 2020](https://svs.gsfc.nasa.gov/4851) (with ESA/Gaia/DPAC) | The star sky and constellation figures, in their real directions |
| [NASA JPL approximate planet positions](https://ssd.jpl.nasa.gov/planets/approx_pos.html) | Where the Sun, Earth and planets are on each chapter day |
| [DONKI](https://ccmc.gsfc.nasa.gov/tools/DONKI/) space weather database | Solar flares, coronal mass ejections, particle events and ENLIL model runs that become the morning warnings |
| [OSDR RadLab](https://visualization.osdr.nasa.gov/radlab/gui/data-api/) radiation dosimetry database | Measured radiation dose that sets each day's storm level: LRO/CRaTER in lunar orbit, BioSentinel in deep space, Curiosity/MSL-RAD on the surface of Mars |
| [Curiosity REMS weather](https://mars.nasa.gov/rss/api/?feed=weather&category=msl&feedtype=json) | Real night temperatures on Mars, which set how much heating each night needs |

Each day's storm level is the day's mean dose divided by a calm day for the same instrument: below 1.6 is calm, below 10 medium, below 100 high, otherwise extreme. In the morning the player only sees a forecast range, built by the game from the DONKI events known that day (it is not an official NASA forecast); the real level is revealed at night. Shielding for the worst case wastes batteries, shielding for the best case hurts the crew. The files in `src/dados/` list every source link; the game shows them on its "Real NASA data" screen.

Oxygen, batteries and mission progress are simplified models made for teaching. They are not measurements.

## Tech

Phaser 3, TypeScript, Vite. Runs in the browser with no account and no download.

To run it locally (Node 24; the tests run TypeScript directly in Node):

```bash
npm install
npm run dev     # play at http://localhost:5173
npm test        # game rules + engine (physics, building, map projection, planet positions)
npm test        # game balance, checked against the real May 2024 storm in all three chapters
``'

How the game is built (engine, scenes, zoom, art pipeline in Blender): see [ARCHITECTURE.md](ARCHITECTURE.md).

Controls: WASD or click to walk, Space to jump, click a module (or E) to use it, mouse wheel or
pinch to zoom; zoom out past the ground to fly to the whole Moon and on to the planets.

## Use of AI tools

The team used Claude (Anthropic) to explore the NASA APIs, to draft project documents including this README, and to write code. Files with AI-generated code say so in a comment at the top of the file.
