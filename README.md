# Lunar Odyssey

A browser game for kids ages 7 to 12, built for the NASA Space Apps Challenge 2026, challenge "Build a Junior Astronaut Mission Trainer".

**Status:** in development (hackathon weekend, November 14-15, 2026). Chapter 1 (the Moon base) is playable from start to end. Chapters 2 and 3 are not built yet.

## The idea

You lead a crew from a base on the Moon, across the trip to Mars, to a new base on Mars. Every day you have fewer batteries than the mission needs, so every choice has a cost: a battery spent on building the rocket is a battery that does not make oxygen or power the radiation shield.

The solar storms in the game are storms that really happened. Their dates and strength come from NASA data.

## Three chapters

| Chapter | Place | Goal |
|---|---|---|
| 1 | Moon base | Build the rocket |
| 2 | Spacecraft | Reach Mars |
| 3 | Mars base | Build the base and survive |

Each chapter is a series of days. Each day: read the morning report, send batteries to the rooms, see what happened overnight.

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

Oxygen, batteries and mission progress are simplified models made for teaching. They are not measurements.

## Tech

Phaser 3, TypeScript, Vite. Runs in the browser with no account and no download.

To run it locally (Node 24; the tests run TypeScript directly in Node):

```bash
npm install
npm run dev     # play at http://localhost:5173
npm test        # game rules + engine (physics, building, map projection, planet positions)
```

How the game is built (engine, scenes, zoom, art pipeline in Blender): see [ARCHITECTURE.md](ARCHITECTURE.md).

Controls: WASD or click to walk, Space to jump, click a module (or E) to use it, mouse wheel or
pinch to zoom; zoom out past the ground to fly to the whole Moon and on to the planets.

## Use of AI tools

The team used Claude (Anthropic) to explore the NASA APIs, to draft project documents including this README, and to write code. Files with AI-generated code say so in a comment at the top of the file.
