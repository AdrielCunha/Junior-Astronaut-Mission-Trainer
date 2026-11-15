# Mission performance measurement

Measured on November 14, 2026, local time in America/Sao_Paulo.
Baseline: `76c9e71e03f79fc0231158258619351b4c722f1c`. Candidate game code: `bbd640d64f1824ff2907b3878f45faa1ebecf1bd`.
Only the clean committed candidate was measured. Concurrent uncommitted flight-loader experiments are excluded.

## Method

Production Vite builds, each with the same explicit `VITE_MEDIR=1` scene-inspection bridge.
Chrome Chrome/150.0.7871.46, Linux, Intel Core i7-13620H.
Renderer: `ANGLE (Intel, Mesa Intel(R) Graphics (RPL-P), OpenGL ES 3.2)`. Hardware rendering, not SwiftShader.
Desktop: 1366 x 768, HD assets, no CPU slowdown. Mobile simulation: 412 x 915, low-quality assets,
4x CPU slowdown through CDP. This is desktop hardware with mobile dimensions and slower CPU,
not a physical phone or a throttled mobile GPU. No network latency was simulated.

Each profile uses a fresh browser profile, disabled HTTP cache and a localhost production server.
Startup is the first frame with the surface initialized and loading scene closed. The title menu
is then dismissed. Full-motion profiles finish background film downloads and wait another three
seconds before gameplay samples. Surface idle is sampled for three seconds, real walking for
four seconds, the first flight for 4.4 seconds, Moon idle for 2.2 seconds, the next flight for
2.8 seconds and solar-system idle for 2.2 seconds. Reduced-motion view changes are sampled for
0.9 seconds, including their 0.28-second fade. A view is always confirmed before the next sample.
Walking must actually move the body; the records include distance and footprint counts.
Music is not started during these runs because the harness does not supply a trusted playback gesture.

FPS is 1000 divided by the mean requestAnimationFrame interval. P95 is the 95th percentile of
those intervals; it describes frame pacing, not INP. Long tasks are observed separately.
Canvas gameplay is evaluated through frame timing and readiness, not an LCP score. FCP and
stage-end JS heap snapshots are available in the raw JSON. Heap snapshots exclude GPU texture memory.

## Summary

| Profile | Ready, s | Walking FPS | Walking p95, ms | Frames over 50 ms while walking | Total transferred, MiB |
| --- | ---: | ---: | ---: | ---: | ---: |
| Baseline desktop | 3.41 | 52.6 | 33.4 | 0.5% | 10.50 |
| Baseline mobile | 9.57 | 60.0 | 16.7 | 0.0% | 4.33 |
| PR desktop | 1.67 | 60.0 | 16.8 | 0.0% | 10.72 |
| PR mobile | 3.41 | 60.0 | 16.7 | 0.0% | 4.58 |
| PR mobile, reduced motion | 7.02 | 60.0 | 16.8 | 0.0% | 3.22 |

## All sampled stages

| Profile | Stage | FPS | p95, ms | Long tasks | Total long-task duration, ms |
| --- | --- | ---: | ---: | ---: | ---: |
| Baseline desktop | surface idle | 58.3 | 16.8 | 0 | 0 |
| Baseline desktop | surface walking | 52.6 | 33.4 | 0 | 0 |
| Baseline desktop | surface to Moon | 60.0 | 16.7 | 0 | 0 |
| Baseline desktop | Moon idle | 59.5 | 16.7 | 0 | 0 |
| Baseline desktop | Moon to planets | 60.0 | 16.7 | 0 | 0 |
| Baseline desktop | solar system idle | 60.0 | 16.8 | 0 | 0 |
| Baseline mobile | surface idle | 57.1 | 16.8 | 0 | 0 |
| Baseline mobile | surface walking | 60.0 | 16.7 | 0 | 0 |
| Baseline mobile | surface to Moon | 59.5 | 16.8 | 1 | 52 |
| Baseline mobile | Moon idle | 60.0 | 16.7 | 0 | 0 |
| Baseline mobile | Moon to planets | 59.6 | 16.7 | 0 | 0 |
| Baseline mobile | solar system idle | 60.0 | 16.8 | 0 | 0 |
| PR desktop | surface idle | 60.0 | 16.7 | 0 | 0 |
| PR desktop | surface walking | 60.0 | 16.8 | 0 | 0 |
| PR desktop | surface to Moon | 60.0 | 16.8 | 0 | 0 |
| PR desktop | Moon idle | 60.0 | 16.8 | 0 | 0 |
| PR desktop | Moon to planets | 59.3 | 16.8 | 0 | 0 |
| PR desktop | solar system idle | 60.0 | 16.7 | 0 | 0 |
| PR mobile | surface idle | 60.0 | 16.8 | 0 | 0 |
| PR mobile | surface walking | 60.0 | 16.7 | 0 | 0 |
| PR mobile | surface to Moon | 59.3 | 16.7 | 1 | 62 |
| PR mobile | Moon idle | 60.0 | 16.7 | 0 | 0 |
| PR mobile | Moon to planets | 58.2 | 16.8 | 1 | 93 |
| PR mobile | solar system idle | 60.0 | 16.8 | 0 | 0 |
| PR mobile, reduced motion | surface idle | 60.0 | 16.7 | 0 | 0 |
| PR mobile, reduced motion | surface walking | 60.0 | 16.8 | 0 | 0 |
| PR mobile, reduced motion | surface to Moon | 58.9 | 16.8 | 0 | 0 |
| PR mobile, reduced motion | Moon idle | 60.0 | 16.7 | 0 | 0 |
| PR mobile, reduced motion | Moon to planets | 58.9 | 16.8 | 0 | 0 |
| PR mobile, reduced motion | solar system idle | 60.0 | 16.8 | 0 | 0 |

## Interpretation and limits

Walking stayed near 60 FPS in the committed candidate in both profiles, with 36 to 37 recent
footprints. The baseline mobile profile was also near 60 FPS. These samples do not establish
a statistically significant improvement. The full-motion mobile candidate still registered
isolated long tasks during view changes; see the stage table rather than relying on average FPS.
The reduced-motion profile did not download flight frames and transferred less data.

There is one recorded run per profile. A fresh browser profile does not clear OS and GPU-driver
caches, and external fonts, CPU clocks and other desktop activity vary. Startup differences
must not be interpreted as a proven loading speedup. This is a short-session measurement,
not a sustained thermal test or a 60-second footprint stress test. No gameplay runtime exception
was recorded. The normal production build still emits Vite's existing large-chunk warning.

## Reproduction

```bash
npm test
npm run build
VITE_MEDIR=1 npx vite build --outDir /tmp/lunar-perf
npx vite preview --outDir /tmp/lunar-perf --host 127.0.0.1 --port 5275 --strictPort
```

In another terminal:

```bash
node tools/dev/medir_missao.mjs 'http://127.0.0.1:5275/?hd' 1 1366x768 /tmp/desktop.json full
node tools/dev/medir_missao.mjs 'http://127.0.0.1:5275/?leve' 4 412x915 /tmp/mobile.json full
node tools/dev/medir_missao.mjs 'http://127.0.0.1:5275/?leve' 4 412x915 /tmp/reduced.json reduced
```

Run profiles sequentially to avoid competing Chrome GPU workloads. `CHROME_SOFTWARE=1` is an
optional, explicitly software-rendered stress scenario, not the environment used in this report.
The normal `npm run build` omits scene-inspection globals. For the baseline, use the referenced
commit and apply the same opt-in inspection guard to `Superficie.create` before building.

Raw records:

1. [Baseline desktop](performance/2026-11-14/baseline-desktop.json)
2. [Baseline mobile](performance/2026-11-14/baseline-mobile.json)
3. [Candidate desktop](performance/2026-11-14/candidate-desktop.json)
4. [Candidate mobile](performance/2026-11-14/candidate-mobile.json)
5. [Candidate reduced motion](performance/2026-11-14/candidate-reduced.json)


## Follow-up: the first minute, while the flight film downloads

Measured on November 14, 2026, evening, same machine, browser and renderer as above (Chrome
150, Intel RPL-P iGPU through ANGLE, hardware rendering). Baseline: `65405d9` (PR #5).
Candidate: this branch. Both are production builds with `VITE_MEDIR=1`.

### What the first report did not sample

The method above waits until every flight frame has downloaded, then 3 more seconds, before
the first sample. A player reported that the start is the laggiest part, and that is exactly the
window it skipped. `medir_missao.mjs` now takes two extra samples in full motion, right after
the title menu closes and while the film is still downloading: `early surface idle` and
`early surface walking`. Everything after them is unchanged, so the other stages stay comparable.

### Cause

A CPU profile of that window (Chrome, `tools/dev/medir_desempenho.mjs` with `PERFIL=dir`,
summarized by `tools/dev/resumir_cpuprofile.py`) put about 70% of the main thread in
`texImage2D`, called from `filme.ts`: each frame was handed to Phaser as an `<img>` as soon as it
arrived, and the browser premultiplied and converted it on the main thread while uploading it,
close to 100 ms per HD frame with the CPU slowed 4x. Firefox's console warning about
"Alpha-premult and y-flip" points at the same path.

### Change

1. `filme.ts` decodes frames with `createImageBitmap(..., { premultiplyAlpha: 'premultiply' })`,
   off the main thread, and keeps them in memory instead of making textures right away.
2. `Espaco` sends them to the GPU one at a time on the ground: every 150 ms while the commander
   stands still, every 700 ms while walking. During a flight, the frame shown and the two on
   each side are sent just in time if still missing.
3. Smaller per-frame savings: footprints keep their screen shape from when they are made and a
   new step is appended instead of redrawing all of them (full redraw once a second for the fade,
   lifetime unchanged); `Grade.caixas()` is kept until the base changes; module depth is only set
   when it changes; the caption date reuses one `Intl.DateTimeFormat`.

### Summary

| Profile | Ready, s | Early idle FPS | Early walking FPS | Early frames over 50 ms | First flight FPS | First flight long tasks |
| --- | ---: | ---: | ---: | ---: | ---: | ---: |
| Baseline HD, CPU 4x | 9.77 | 11.1 | 14.7 | 52.5% | 48.8 | 1 |
| Candidate HD, CPU 4x | 5.55 | 50.0 | 52.3 | 0.9% | 45.2 | 18 |
| Baseline desktop | 2.97 | 46.1 | 53.8 | 0.7% | 60.0 | 0 |
| Candidate desktop | 2.69 | 54.7 | 60.0 | 0.0% | 59.5 | 0 |
| Baseline mobile | 3.41 | 59.0 | 60.0 | 0.0% | 60.0 | 0 |
| Candidate mobile | 3.70 | 60.0 | 60.0 | 0.0% | 60.0 | 0 |

### All sampled stages

| Profile | Stage | FPS | p95, ms | Frames over 50 ms | Long tasks | Long-task total, ms |
| --- | --- | ---: | ---: | ---: | ---: | ---: |
| Baseline HD, CPU 4x | early surface idle | 11.1 | 183.3 | 51.4% | 0 | 0 |
| Baseline HD, CPU 4x | early surface walking | 14.7 | 166.7 | 52.5% | 0 | 0 |
| Baseline HD, CPU 4x | surface idle | 59.7 | 16.7 | 0.0% | 0 | 0 |
| Baseline HD, CPU 4x | surface walking | 59.5 | 16.8 | 0.0% | 0 | 0 |
| Baseline HD, CPU 4x | surface to Moon | 48.8 | 33.4 | 0.5% | 1 | 68 |
| Baseline HD, CPU 4x | Moon idle | 59.1 | 16.8 | 0.0% | 0 | 0 |
| Baseline HD, CPU 4x | Moon to planets | 50.4 | 33.4 | 1.4% | 1 | 110 |
| Baseline HD, CPU 4x | solar system idle | 60.0 | 16.8 | 0.0% | 0 | 0 |
| Candidate HD, CPU 4x | early surface idle | 50.0 | 33.4 | 0.7% | 1 | 50 |
| Candidate HD, CPU 4x | early surface walking | 52.3 | 33.4 | 0.9% | 0 | 0 |
| Candidate HD, CPU 4x | surface idle | 56.4 | 33.3 | 0.0% | 0 | 0 |
| Candidate HD, CPU 4x | surface walking | 59.0 | 16.8 | 0.0% | 0 | 0 |
| Candidate HD, CPU 4x | surface to Moon | 45.2 | 66.7 | 8.0% | 18 | 1250 |
| Candidate HD, CPU 4x | Moon idle | 60.0 | 16.8 | 0.0% | 0 | 0 |
| Candidate HD, CPU 4x | Moon to planets | 59.6 | 16.7 | 0.0% | 0 | 0 |
| Candidate HD, CPU 4x | solar system idle | 60.0 | 16.8 | 0.0% | 0 | 0 |
| Baseline desktop | early surface idle | 46.1 | 33.4 | 0.7% | 0 | 0 |
| Baseline desktop | early surface walking | 53.8 | 33.3 | 0.0% | 0 | 0 |
| Baseline desktop | surface idle | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Baseline desktop | surface walking | 60.0 | 16.8 | 0.0% | 0 | 0 |
| Baseline desktop | surface to Moon | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Baseline desktop | Moon idle | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Baseline desktop | Moon to planets | 60.0 | 16.8 | 0.0% | 0 | 0 |
| Baseline desktop | solar system idle | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Candidate desktop | early surface idle | 54.7 | 33.3 | 0.0% | 0 | 0 |
| Candidate desktop | early surface walking | 60.0 | 16.8 | 0.0% | 0 | 0 |
| Candidate desktop | surface idle | 59.0 | 16.8 | 0.0% | 0 | 0 |
| Candidate desktop | surface walking | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Candidate desktop | surface to Moon | 59.5 | 16.7 | 0.0% | 0 | 0 |
| Candidate desktop | Moon idle | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Candidate desktop | Moon to planets | 59.6 | 16.8 | 0.0% | 0 | 0 |
| Candidate desktop | solar system idle | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Baseline mobile | early surface idle | 59.0 | 16.8 | 0.0% | 0 | 0 |
| Baseline mobile | early surface walking | 60.0 | 16.8 | 0.0% | 0 | 0 |
| Baseline mobile | surface idle | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Baseline mobile | surface walking | 60.0 | 16.8 | 0.0% | 0 | 0 |
| Baseline mobile | surface to Moon | 60.0 | 16.8 | 0.0% | 0 | 0 |
| Baseline mobile | Moon idle | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Baseline mobile | Moon to planets | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Baseline mobile | solar system idle | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Candidate mobile | early surface idle | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Candidate mobile | early surface walking | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Candidate mobile | surface idle | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Candidate mobile | surface walking | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Candidate mobile | surface to Moon | 60.0 | 16.8 | 0.0% | 0 | 0 |
| Candidate mobile | Moon idle | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Candidate mobile | Moon to planets | 60.0 | 16.7 | 0.0% | 0 | 0 |
| Candidate mobile | solar system idle | 60.0 | 16.8 | 0.0% | 0 | 0 |

### Interpretation and limits

The early window is where the change matters: with HD frames and the CPU slowed 4x, the baseline
spent about half its frames over 50 ms while the film downloaded; the candidate stays near 50 FPS.
With the light mobile frames (640 x 360) the baseline was already smooth on this GPU, and the
candidate matches it.

The cost moved, it did not vanish. If the player flies a few seconds after the game opens, frames
not yet uploaded go up during the first flight: in the HD CPU 4x run the first flight had 18 long
tasks against 1 in the baseline (45 against 49 FPS). Players normally stand on the ground longer
before flying (intro, morning report, walking), and frames keep going up meanwhile.

One run per profile, as above. During the HD CPU 4x runs another Blender render was using the
NVIDIA GPU and some CPU; Chrome rendered on the Intel GPU, and baseline and candidate ran back to
back under the same load. Startup times vary with OS caches and machine activity.

Raw records: [`performance/2026-11-14-carregador/`](performance/2026-11-14-carregador/).
