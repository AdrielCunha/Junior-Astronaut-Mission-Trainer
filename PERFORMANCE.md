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
