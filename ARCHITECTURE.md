# Architecture

How Lunar Odyssey is put together: the engine, the scenes, the art pipeline and the data.
Written for the team, so anyone can change one part without breaking another.

## The big picture

```
 tools/lua3d/  (Python + Blender, run once)           src/  (TypeScript, runs in the browser)
 ─────────────────────────────────────────            ───────────────────────────────────────
 NASA LOLA polar DEM ──make_terrain.py──► dados/terreno.json ──► engine/terreno.ts (heights, slopes)
                     ──render_terrain.py─► public/lua/terrain.png  + pixel mapping in terreno.json
                     ──make_flight.py────► public/lua/voo/f00..71.webp + dados/voo.json
 NASA LROC + LOLA    ──make_moon.py──────► public/lua/sky.jpg, dados/moon_view.json (camera)
                     ──make_moon_textures► public/lua/moon_albedo.png, moon_height.png (live Moon)
 NASA SVS star maps                         dados/moon_view.json (camera vectors)
                     ──make_constellations► public/lua/constelacoes/*, dados/constelacoes.json
 (shapes)            ──make_astronaut.py─► public/lua/astronaut.png + dados/astronauta.json
                     ──make_modules.py───► public/lua/modulos/*.png + dados/modulos.json
                                                          │
                       engine/  pure TS, no Phaser, tested with node --test
                       cenas/   Phaser scenes that draw the engine's state
```

Rule of thumb: **anything that can be computed without Phaser lives in `src/engine/` and has a
test**. Scenes only read input, call the engine and draw.

## Folders

| Path | What is there |
|---|---|
| `src/main.ts` | Starts Phaser with the three scenes. `?classic` opens the first prototype (`Base.ts`). |
| `src/regras.ts` | Chapter rules: oxygen, radiation dose, goal, end of day. Pure, tested (`regras.test.ts`). |
| `src/engine/iso.ts` | Map coordinates ↔ screen pixels (and back, onto the ground under the cursor). |
| `src/engine/terreno.ts` | Real heights and slopes of the map. |
| `src/engine/fisica.ts` | Lunar gravity, jumping, falling, collision with modules, slope limits. |
| `src/engine/construcao.ts` | Module types, the occupancy grid, where things fit (free, flat), the default base layout. |
| `src/engine/suprimentos.ts` | Equipment unlocked during the chapter (by day) and the cargo lander's braking burn. |
| `src/engine/astro.ts` | Sun, planets and Moon positions for a date (NASA JPL orbital elements). |
| `src/engine/engine.test.ts` | Tests for all of the above. |
| `src/cenas/sessao.ts` | State shared by the scenes, event bus, the zoom model. |
| `src/cenas/Espaco.ts` | Sky, constellation tracing, Moon view, solar system. |
| `src/cenas/Superficie.ts` | The map, modules (Blender pictures), the commander, cargo; the ground camera. |
| `src/cenas/Interface.ts` | HUD bars, build bar, zoom buttons, morning / night / end panels. |
| `src/cenas/desenho.ts` | Code-drawn extras: foundations on slopes, the commander's shadow and batteries, cargo. |
| `src/cenas/globo.ts` | Globe math for the Moon view (spin on a date, base pin, Sun over the base). |
| `src/cenas/luaShader.ts` | The Moon drawn live by the GPU (toon shading, relief, outline). |
| `src/cenas/Base.ts` | First prototype (fixed base). Kept until the team moves its chapters over. |
| `src/dados/` | JSON made by the tools or by the NASA data scripts. Do not edit by hand. |
| `public/lua/` | Pictures made by the tools. Do not edit by hand. |
| `tools/lua3d/` | Asset pipeline (below). `nasa/` holds source files, `.cache/` is scratch (both ignored or rebuildable). |
| `tools/dev/capturar_voo.mjs` | Records the zoom flight frame by frame from the dev server (headless Chrome), to review motion. |

## Scenes

Three Phaser scenes run **at the same time**, stacked bottom to top:

```
 Interface   screen space: bars, buttons, panels, wheel / pinch input
 Superficie  world camera: map + modules + commander, region layers, globe during the flight
 Espaco      screen space: star sky, Moon view, planets
```

They never call each other's drawing code. They share `sessao` (state) and talk through events
(`sessao.emitir` / `sessao.ouvir`): `fase`, `estado`, `mensagem`, `construir`, `construido`.
`Espaco.update` runs first each frame and advances the zoom (`sessao.passo`), so all three see the
same zoom in the same frame.

## Coordinates

* **Map**: `gx, gy` in tiles (0..64), `z` height in tiles, up. One tile = 80 m of real ground.
  Blender builds the map with X = gx, Y = −gy, Z = height.
* **Screen**: `iso.paraTela(P, gx, gy, z)` with `P = terreno.json.imagem`
  (`pixel = origem + gx·ex + gy·ey + z·ez`). The numbers come from the Blender camera, so sprites
  drawn by code sit exactly on the rendered picture. Never hard-code tile sizes.
* **Zoom scale**: `s` = screen pixels per km. The terrain picture is `S_MAPA` = 530 px/km.
  Region layers and the globe know their own px/km and are scaled to the map's.

## Zoom: ground → Moon → planets

One number, `u = ln(S_MAX / s)`, describes how far out the camera is (`s` = screen px per km).

| View | Input |
|---|---|
| `chao` (ground) | wheel / pinch zoom freely, around the cursor or the fingers; drag pans; tap walks |
| `lua` (the globe) | wheel / pinch out: fly to the planets; in: fly back to the ground |
| `sistema` (out to Mars's orbit) | wheel / pinch in: fly back to the Moon |

Pushing past the edge of a view calls `sessao.voar(destino)`, and **the whole flight plays**;
input waits until it lands.

**Ground ⇄ Moon is a film rendered in Blender** (`make_flight.py`): one continuous 3D shot of
one Moon at real size, where nested patches of NASA polar relief (the game map at 80 m, 64 km at
320 m, 800 km at 3.8 km) sit on the sphere at their true place and curvature. The camera starts at
the game's map framing and pulls back to the Moon view of day 1. In the game
(`sessao.quadroFilme`):

```
 prep 0.35 s      the ground camera glides to frame 0's framing (map center, same px/km)
 film 3.8 s       p = camera log distance 0 → 1, eased in and out
 back             the same, backwards
```

* **No blending.** At each moment the frame rendered just before `p` is shown, shrunk to the
  current distance (`voo.razao ** -(p - p_i)`). Frames are rendered 12% larger than the screen
  (`voo.margem`) so the shrinking frame always covers it. Blending two frames ghosted.
* **Frames where they are needed.** While the camera only backs away (p < 0.3) the shrink is
  exact, so few frames go there; 104 of the 120 go to the part where the camera turns toward
  the globe (`voo.p` lists each frame's p).
* **The colony is live.** The terrain picture dissolves into frame 0, but the modules, the
  commander and cargo stay and shrink with the frames until the view starts turning; then a
  light and the "Your base" label follow the base's pixel in each frame (`voo.base`, from Blender).
* **The live Moon.** At the end the frames fade into the Moon view: the Moon there is drawn by a
  GPU shader (`luaShader.ts`): NASA color reduced to the toon palette, LOLA relief, real Sun in
  hard bands, outline. Crisp at any size, it turns smoothly (time runs on, no wrap).

The frames cover the screen (`escalaFilme`), so the ground framing (`uFilme`) and the globe size
(`uGlobo`) follow from them. Flight frames load in the background and are drawn once off screen
before the first flight (a first draw uploads to the GPU and would stutter).

**Moon ⇄ planets** is drawn live (Espaco): `u` eases with the same iOS-like curve
(`curva`, cubic-bezier 0.7, 0, 0.2, 1), positions from `engine/astro.ts`. The view stops at
Mars's orbit: Mars is marked as the next stop, locked until the rocket gets there (chapter 3).
That is also where the rocket's trip to Mars can be followed later.

The Moon view turns slowly (6 h of Moon time per second), drawn live, so the spin is continuous.

## Physics

`fisica.passo(corpo, entrada, chao, caixas, dt)` moves one body: steering, jump, gravity, ground
contact, sliding along module walls, and no climbing slopes above 20° (real LOLA slope).

Scale: the map is real (80 m tiles) but people and modules are drawn far larger, as on any game
map. Vertical motion uses real lunar gravity, 1.62 m/s², at the size the astronaut is drawn, so a
jump rises and floats like a real Moon jump (about 6× higher and longer than on Earth). Walking
speed is set for play, not to scale. Cargo drops with no parachute (no air) and the game says how
long the same fall takes on Earth.

## The base and new equipment

Players do not build. The crew's base is already standing when the game starts:
`construcao.BASE_PADRAO` lists each module with an offset from the map center, and
`montarBasePadrao` puts each one on the nearest flat, free spot of the real terrain (slope under
10 degrees, from LOLA), so the layout follows the ground. The rooms ring the habitat, so carrying
batteries is a short walk.

Players run it, as in the first prototype: walk (keys or click), pick up the day's batteries at
the Habitat, click a room (or press E next to it) to give it a battery. Rooms you can use carry
their name and light up under the cursor.

**Equipment unlocks.** On some mornings (`suprimentos.SUPRIMENTOS`) Mission Control announces a
supply drop. A cargo lander (Blender model) comes down next to the base, lands, leaves the
equipment and lifts off again:

| Day | Equipment | Real fact shown |
|---|---|---|
| 2 | Comms Antenna | radio takes about 1.3 s from the Moon to Earth |
| 4 | Greenhouse | plants give back oxygen; NASA's Veggie garden on the ISS |
| 5 | Ice Drill | water ice in the polar craters that never see the Sun |
| 6 | Rover | NASA's Lunar Terrain Vehicle for Artemis |

There is no air on the Moon, so the lander cannot use a parachute: it falls, then fires its
engine just hard enough to touch down softly (`empuxoDePouso`, tested). The flame grows with the
thrust. Equipment does not change the rules yet; it is the hook for that when the team picks
the numbers.

`Grade` still checks footprints (`pode`: outside, occupied, too steep) and is used to place the
default base and the equipment.

## Rules (chapter 1)

`Interface` runs the day: intro panel, then morning panel (with the supply drop, if any), then
the commander picks up the day's batteries at the Habitat and carries them to the rooms
(`sessao.entregas`), "End day" calls `regras.fimDoDia`, night panel, next morning or the end
panel. Rooms are modules with `tipo.sala` set.

### Merging the team's chapters 2 and 3 (`origin/main`, not merged yet)

The remote changed the rules API. When we merge, only these places change:

| Here | After the merge |
|---|---|
| `Alocacao = { suporte, blindagem, oficina }` | `Alocacao = Record<Efeito, number>`: `oxigenio`, `blindagem`, `meta`, `aquecimento` |
| `construcao.Tipo.sala` | becomes an `Efeito` (`suporte` → `oxigenio`, `oficina` → `meta`) |
| `estadoInicial()` | `inicioDoCapitulo(CAPITULOS[i].config, dose)` |
| `fimDoDia(e, a, d)`, `bateriasDoDia(e)`, `resultado(e)` | take the chapter `Config` as the last argument |
| delivering a battery (`Superficie.usar`) | call `regras.entregar(e, a, efeito, config)`: on Mars it builds the module first |
| texts in `Interface` | read from `capitulos.ts` (intro, victory, lessons, credits) |

Chapter 3 (Mars) "starts empty, build the modules first" fits the build engine directly: its
module costs (`config.obras`) can become the battery cost of each crate.

## Art pipeline (`tools/lua3d/`)

All renders share one look: flat color bands from a toon ramp (Shader to RGB → Constant ramp),
a cool purple shadow tone, and a dark outline from an inverted hull (Solidify, flipped normals).
Palette constants sit at the top of each script.

| Script | Run with | Makes |
|---|---|---|
| `make_terrain.py` | `python3` | cuts the 64 × 64 map from LOLA LDEM_80S_80M (HTTP range, ~0.5 MB) |
| `render_terrain.py` | `blender -b -P` | the map picture and its pixel mapping |
| `make_flight.py` | `blender -b -P` | the ground → Moon flight frames (LDEM_80S_80M, LDEM_75S_240M, CGI Moon Kit) |
| `make_moon.py` | `blender -b -P` | the star sky and the Moon view camera (`moon_view.json`) |
| `make_moon_textures.py` | `python3` | toon albedo + height maps for the live Moon shader |
| `make_constellations.py` | `python3` | one picture per constellation figure in view |
| `make_astronaut.py` | `blender -b -P` | the commander, 8 directions × (stand + 8 hop frames) |
| `make_modules.py` | `blender -b -P` | habitat, life support, shield (regolith berm), workshop, solar panel, pad + rocket in 5 stages |
| `comum.py` | (imported) | shared palette, toon materials, cube-sphere, LOLA polar reader |
| `bl.py` | `python3 bl.py --run script.py` | runs any of the Blender scripts **live** in an open Blender (official "MCP" extension, port 9876), to look and tweak |

`npm run assets` runs them all in order (needs Blender 5.x and ImageMagick). Pictures are
reduced to 255-color PNGs, which suits flat toon colors.

**Use the NVIDIA GPU.** On a laptop with two GPUs, headless Blender renders EEVEE on the
integrated one unless told otherwise: `prime-run blender -b -P ...` (Linux). The flight went
from about 3 minutes per frame to under 1 second.

## Data sources (for the "NASA Data" and "References" fields)

| Data | Source | Used for |
|---|---|---|
| Map heights and slopes | LRO LOLA LDEM_80S_80M, LDEM_75S_240M (NASA PDS Geosciences Node) | the ground, what is buildable, region layers |
| Moon color and global relief | NASA SVS CGI Moon Kit (LRO LROC color, LOLA) | the globe |
| Stars and constellation figures | NASA SVS Deep Star Maps 2020 (credit also ESA/Gaia/DPAC) | the sky |
| Planet positions | NASA JPL "Approximate Positions of the Planets" (Standish) | the solar system view |
| Storms, doses | DONKI, OSDR RadLab (see README) | the chapter rules |

## Tests

```bash
npm test          # rules + engine: projection, gravity, collisions, slopes, building, planets
npx tsc --noEmit  # types
```

In the dev server (`npm run dev`), `window.sessao` and `window.superficie` expose the game to
browser tests; they are stripped from the production build.
