# Ship stations + new ship tasks (Thruster puffs, Grow the lettuce)
- **Status:** implemented
- **Category:** Navigation (cockpit, window, radio) · Life Support (garden)
- **Chapter(s):** any (ship world only)
- **Trigger:** press E next to a station prop (or tap it while next to it), once per day each. Stations still to do today show a bobbing yellow "!" and the tooltip says "Press E: …" (or "✓ Done today"). Thruster puffs also joins the Engines room tasks (`CENAS_DA_NAVE`). Debug buttons in `?debug=1` (Tasks tab).
- **Reward:** to be defined (for now only `aoConcluir`; the station is marked done for the day)
- **Interaction:** tap buttons / arrow keys (thrusters); tap pots + switch (garden)
- **Difficulty (7–12 years):** short, no penalty

## Stations (`src/engine/estacoes.ts`)
| Prop | Station task |
|---|---|
| Cockpit | Thruster puffs (new) |
| Window | Clean the window |
| Radio | Tune the radio (`ComunicacoesTarefa`) |
| Veggie Garden | Grow the lettuce (new) |

## Thruster puffs (`src/manobra-nave-tarefa.ts`, `cenas/ManobraNaveTarefa.ts`)
- The ship flies up through a green lane that bends. ◀ / ▶ (buttons, arrow keys or A / D) give a small sideways push; the ship keeps drifting until a push the other way stops it.
- Staying in the lane fills "On course" (12 s); leaving it only pauses the bar.
- Fact: "In space nothing slows you down: a push keeps you moving until another push stops you."

## Grow the lettuce (`src/horta-tarefa.ts`, `cenas/HortaTarefa.ts`)
- 3 pots with a water gauge each: tap a pot to add a drop until the gauge is in the green band (too much drips away slowly). Switch on the pink-purple grow light.
- With everything right, oxygen bubbles rise and the lettuce grows (4 s).
- Fact: "In 2015 astronauts on the Space Station grew red romaine lettuce and ate it. Plants also make oxygen!"

## Acceptance criteria
- [x] Logic tests: drifting, edges, lane progress; water band, drip, light needed (`*.test.ts`).
- [x] Verified in Chrome on the ship: 4 "!" markers, tooltip "Press E: Steer the ship", E opens the task, done marks the station for the day, garden opens at its station.
- [x] Verified by hand in Chrome: the full garden task was completed; the landed Greenhouse showed the yellow "!" while its daily task was available, and the station was marked done for the day after completion. The first attempt only needed the landing animation to finish.
- [ ] Not verified: playing the full thruster task by hand (only its logic is covered).

## Equipment that lands on the Moon (same station system, `ESTACOES_MODULO`)
Every piece of equipment brought by a cargo lander (`engine/suprimentos.ts`) is also a station: a yellow "!" above it, **E** next to it, once a day each. The task is different from its fix-it event, so both feel new:
| Equipment (lands on day) | Station task | Fix-it event (unchanged) |
|---|---|---|
| Comms Antenna (2) | Check the antenna cables (`FiacaoTarefa`) | Radio static / send data |
| Greenhouse (4) | Water the lettuce (`HortaTarefa`) | Unbalanced air (valves) |
| Ice Drill (5) | Find the best spot to drill (`ScannerGeloTarefa`) | Overheating |
| Rover (6) | Charge the cargo rover (`BateriaRoverTarefa`) | Lost route |
- Verified in Chrome: a landed Greenhouse shows the "!", E opens the garden task, finishing marks `mod_estufa` done for the day. Test: `estacoes.test.ts` (every supply has a station and none repeats its event's task).


