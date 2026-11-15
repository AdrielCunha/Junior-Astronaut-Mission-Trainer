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
(`uGlobo`) follow from them. Flight frames (`filme.ts`) download in the background and are
decoded off the main thread into premultiplied `ImageBitmap`s. They reach the GPU one at a time
while the player is on the ground (one every 200 ms), and just in time during a flight. Uploading
`<img>` frames as they arrived made the browser convert each one on the main thread (about 100 ms
per HD frame) and cost most of the frame time while walking; see `tools/dev/medir_desempenho.mjs`
(`GPU=1` for the real GPU, `PERFIL=dir` for CPU profiles, `resumir_cpuprofile.py` to read them).

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


## Colony ground art and music

`render_terrain.py` keeps the measured LOLA heights and camera projection. The ground uses the
same warm regolith palette as the Moon and flight, without topographic contour lines.
Crater bowls, raised rims and rounded rock clusters are procedural illustrations, not surveyed
NASA features. A subdivided rendering mesh adds shallow depressions outside the colony center;
rocks have broad organic deformations, subdivision, smooth shading and contact shadows.
The renderer exports `relevo.crateras` (center, radius, depth) and `relevo.pedras` (world-space
bounding boxes) alongside the image. `Terreno.altura` applies the same bowl/rim formula on top
of the archived LOLA grid, so feet, shadows and click projection follow crater depth. Walking
slows progressively to 50% inside a crater, with normal control restored outside; jumps retain
air momentum. `Grade` rejects footprints overlapping rocks or the full crater rim and includes
rock boxes in the existing physics/pathfinding obstacles. The Sun casts shadows to make
the relief readable. The terrain uses no inverted outline shell, which would self-shadow bowls.
Rebuild with `blender -b -P tools/lua3d/render_terrain.py`. In the live MCP session, set
`EXPORTAR_TERRENO = True` before running the script to also export the game image.

`src/audio.ts` plays the theme through HTML audio after the first user gesture, with Ogg Opus
and AAC/M4A sources in `public/audio/`. The Music button and M toggle playback and persist mute.
Phaser audio remains disabled because this track uses HTML audio. Classic mode stays silent.


## Colony layout, foundations and occlusion

`BASE_PADRAO` groups the solar field behind habitation, keeps life support and the shield
nearby, and moves the launch pad beyond the workshop. `Grade.procurarComEspaco` scores nearby
flat sites by distance to the desired sector and slope, leaving a tile of circulation between
footprints when available. `SETORES_SUPRIMENTOS` assigns later equipment to distinct sectors.
The standard nearest-free placement remains a fallback on constrained maps.

Module floors use `Terreno.alturaMax` plus a small clearance. The live foundation follows
sampled soil heights on the two visible edges, with warm regolith colors matching the Blender
model skids. Sprites retain their generated camera anchors; changing a model always requires
regenerating `modulos.json` along with its PNG. `make_modules.py` supports
`EXPORTAR_MODULOS=True` when exporting from the live MCP session.

`Superficie.atualizarOclusao` checks the commander's position relative to module footprints
and roof heights. Where their screen bounds overlap, it corrects front/back drawing order and
smoothly fades an obstructing module to 38% opacity. The module returns to full opacity when
the commander moves clear. This is a bounding-rectangle approximation for the rendered sprite,
not per-pixel occlusion. Ground foundations follow the same fade and draw order.


The colony planner also penalizes overlapping projected silhouettes (including the launch
tower) and reserves the central service court for circulation. `Superficie.desenharCaminhos`
draws subtle tracks along actual collision-aware routes, sampling the terrain height; these
tracks update when supply equipment joins the base. The complete supply layout is tested for
free circulation and an unobstructed court.

Destination flags now use a triangular pennant turned 30 degrees in Blender. The emblem is
inset near the mast to avoid clipping it at the tip. The runtime marker keeps its compact
scale and foreground depth; source renders and anchors are regenerated by `make_flags.py`.

## Video comfort and lunar surface details

`src/video.ts` owns validated browser preferences and the accessible native settings dialog.
The HUD's **Video & comfort** button opens it without replacing the mission panel. While it is
open, movement and camera navigation pause. Escape cancels; Save persists the selection when
local storage is available. Quality affects effect budgets immediately and asset selection on
next load. Reduced motion respects the device preference by default, replaces cinematic flights
with a short fade, freezes decorative animation and space-view time drift, and skips downloading
the flight film until full motion is requested. Mission state is not reloaded to apply comfort
settings.

`Ambiente` draws alternating boot imprints only on grounded soil, with small ballistic dust grains
instead of drifting atmospheric smoke. Footprints use scene timestamps: 40 seconds at full
opacity, followed by a 20-second smooth fade, then removal. Walking more never evicts existing
prints. Expiration is refreshed at 5 Hz, including while standing still; timestamps also age
while the player views space. Low quality reduces dust counts and update frequency.

Building lights are part of `make_modules.py`: recessed metal fixtures, emissive lenses and
windows, with actual Blender area lights illuminating the platform surfaces. There are no
runtime point-light dots or exposed life-support fan. Life support uses a sealed coolant loop,
radiator fins, tanks and an instrument display. Life-support and workshop displays have three
Blender-rendered states (`*_anim1`, `*_anim2` plus the base PNG). `Superficie.animarModulos`
changes these sprites slowly and freezes them under reduced motion or disabled effects.


Destination markers use `Terreno.altura` for their foot anchor. When planted inside a bowl,
the standard animation settles from the undepressed surface toward the floor; reduced motion
places it directly. A contact shadow is projected onto the sampled ground, and a geometry
mask samples the foreground terrain horizon per sprite column so crater rims can occlude the
mast base. The marker retains its foreground ordering relative to buildings.


## Constellation visibility and measurements

Constellation textures load in both quality modes. The sky is at depth -100 and constellation
figures at -90, underneath the Moon, planets and ground. Low quality draws less often, rather
than removing the feature. Reduced motion shows one static figure; full motion traces and fades
one figure at a time. Replacing it or restarting the scene also removes its tween and mask.

Production builds normally omit the scene inspection globals. Set `VITE_MEDIR=1` only for an
explicit benchmark build to expose them to `tools/dev/medir_missao.mjs`. The script uses fresh
Chrome profiles, CDP CPU throttling and real requestAnimationFrame timestamps, verifies that
walking moves the character and waits for each destination view before measuring it. See
`PERFORMANCE.md` for the recorded environment, raw JSON and reproduction commands.


## Approved cartoon lunar palette

`src/dados/paleta_lua.json` is the shared source of the approved cool lunar colors. The terrain,
regional flight patches, global Moon albedo, live Moon shader and module foundation materials
read the same palette. `tools/lua3d/estilo_lua.py` also builds the illustrated crater outlines,
shared by the playable ground render and the fine polar patch in the zoom flight. Georeferencing,
physics heights and camera framing remain the same.

Rebuild the ground, Moon maps and modules using their normal generators. Rebuild both flight
sets with `make_flight.py -- --frames 120 --w 1280 --h 720 --nome voo` and
`make_flight.py -- --frames 80 --w 640 --h 360 --nome voo_leve`. The optional
`--destino /path/to/staging` writes flight images and metadata under that root, so a complete set
can be checked before replacing the live assets. NASA source imagery and DEM windows are cached
locally; sky and constellation imagery are unaffected by the surface palette.


## The trip to Mars (between chapters)

`Viagem` (src/cenas/Viagem.ts) is a short animation scene drawn on top of everything:

1. **Liftoff**, end of chapter 1, "Board the ship": `Superficie.decolar` swaps the pad picture for an
   empty pad and flies the rocket (`public/lua/viagem/foguete.png`) on its engine against lunar
   gravity (acceleration grows as propellant burns), with dust and a flickering flame; the camera
   follows. Then `Viagem` plays `'partida'` and the crew continues in chapter 2 (Base prototype).
2. **Cruise**: the solar system tilted like the Moon view, Sun in the middle, Earth and Mars at their
   real positions for each day of a real 259-day transfer from May 13, 2024 (`engine/astro.ts`),
   and a simplified transfer arc (it widens from Earth's orbit to Mars's while turning around the
   Sun; not a computed trajectory). The ship (`nave_d<k>.png`, 16 headings) follows it.
3. **Arrival**, chapter 2 "Next chapter" (`'chegada'`): the ship finishes the arc, the wide view fades,
   Mars grows into a live globe and the ship swings around it and brakes, engine first.

With reduced motion, liftoff is skipped and the scene runs three times faster.

**Planets drawn live.** `planetaShader.ts` is the Moon shader without relief, for any planet map:
toon light bands and outline from `paleta_lua.json`, the Sun direction given on screen, and an
optional haze on the lit edge (Earth blue, Mars dust). Maps: `make_planet_textures.py` reduces each
NASA map to a few flat colors (Mars saturation pushed toward rust; the Viking mosaic is pale).

**Models.** `make_ship.py` renders the transfer ship (habitat with window band and mission
stripe, docking nose, truss, two propellant tanks, engine, solar wings, radiators) from the tilted
solar-system camera, and the rocket alone from the map's camera. `make_sun.py` renders the Sun
(granulation bands, darker limb, soft rays). All use the shared palette through `comum.py`.
