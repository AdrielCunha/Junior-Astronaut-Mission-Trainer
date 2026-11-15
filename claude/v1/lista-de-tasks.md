# Task list

## Overview
This file centralizes the game's tasks and points to the specification files in `claude/v1/tasks/`.

## Code references
- `src/main.ts` — scene registration and debug tools.
- `src/cenas/NaveTarefa.ts` — visual reference for the mini-game scenes.
- `src/nave-tarefa.ts` — pure logic reference.
- `src/regras.ts` — oxygen, radiation, and construction rules.
- `src/capitulos.ts` — game themes and chapters.

## Backlog

### Life Support
- `task-clean-duct` — status: idea — clean dust from the duct
- `task-replace-co2-filter` — status: idea — replace the CO₂ filter
- `task-balance-valves` — status: idea — balance O₂ and CO₂ until the green band is reached

### Radiation Shield
- `task-block-solar-storm` — status: idea — block the solar storm with water bags
- `task-rotate-solar-shield` — status: idea — rotate the shield toward the Sun
- `task-close-hatches` — status: idea — close the hatches before the storm

### Energy
- `task-charge-solar-panels` — status: implemented — wipe moon dust off the panels and tilt them toward the Sun
- `task-follow-the-sun` — status: implemented — keep the panel facing the moving Sun until the battery fills
- `task-out-of-the-shadow` — status: implemented — slide the panels out of the boulders' long shadows (Moon only)
- `task-swap-rover-battery` — status: implemented — take the empty rover battery out, turn the new one the right way, latch it
- `task-fix-rover-fender` — status: implemented — after driving a while, cover the broken fender with maps and clamp them
- `task-rover-delivery-run` — status: implemented — drive the rover through flags across the base (reusable expedition system)

### Ship
- `task-clean-ship-window` — status: implemented — wipe fog and dust off the window, then find Earth (Engines room, ship only)
- `task-ship-stations` — status: implemented — E at the Cockpit (Thruster puffs), Window, Radio and Veggie Garden (Grow the lettuce), once a day each; garden task gives +1 oxygen point (up to 100)
- `task-ship-explorations` — status: implemented — hot/cold hunts on the deck: patch 3 air leaks, find the lost wrench

### Exploration events (engine/exploracao.ts)
- `task-find-lost-sample` — status: implemented — hot/cold search for a sample case, then bring it to the Habitat (Moon)
- `task-relight-beacons` — status: implemented — visit 3 dark beacons around the base and stay to relight them (Moon)
- `task-ice-scout` — status: implemented — hot/cold search for a dark crater, then "Scan for ice" (Moon)
- `task-mars-sample-tubes` — status: implemented — pick up 3 sample tubes in order (Mars)
- `task-mars-pack` — status: implemented — rover on Mars, Heating task (gold blankets), space rock, dust devil, Mars ice (Phoenix)

### Next ideas
See `claude/v1/plano-tasks-exploracao.md` (exploration events, more rover and ship tasks).

## Note
The tasks above were reconstructed from the game's context and project narrative because the original folder was removed from the repository during the branch switch and no local copy remained.

