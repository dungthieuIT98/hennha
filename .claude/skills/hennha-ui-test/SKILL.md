---
name: hennha-ui-test
description: Playwright user test of the whole DiDateHong app (home, create wizard, receiver, manage, pages) on desktop and phone, plus a 4G + slow-CPU smoothness test that finds what causes jank. Use when asked to test the UI, run e2e / Playwright tests, check the phone layout, test on 4G or a slow network, look for lag/jank/stutter, or write a test report.
---

# Hẹn Nha UI test

Runs the app like a user and writes a report. Scripts live in `scripts/`; nothing is installed in the project.

| Script | What it does | Output |
| --- | --- | --- |
| `scripts/serve.mjs` | Serves `dist/` through the real static code (`server/static.mjs`: allowlist, brotli/gzip, cache headers, ETag), stubs `/api/*` so no Google keys are needed | — |
| `scripts/e2e.mjs` | ~50 user test cases per profile (`desktop` 1280×800, `mobile` 390×844 touch, DPR 3), layout audit per screen, motion checks (H13), server headers (S01–S03), screenshots | `<out>/e2e.json`, `<out>/shots/*.png` (`FAIL-*.png` on failure) |
| `scripts/perf.mjs` | Phone profile under no throttle, 4G and slow 4G (both with CPU 4×): cold load (FCP, LCP, CLS, bytes), frame stats per scenario, trace breakdown, A/B with one effect off. `--only load|frames|trace|ab` runs one part, `--ab base,noStars` picks variants, `--base-gzip <url>` adds a second server to compare loads | `<out>/perf.json` (`perf-<part>.json` with `--only`) |

## Steps

1. Build: `node tools/build.mjs`. Test `dist/`, that is what gets deployed.
2. Install Playwright in the scratchpad, never in the project: `npm i playwright-core` in `<scratch>/pw`. Use the system Chrome (`C:/Program Files/Google/Chrome/Application/chrome.exe`, override with `--chrome`).
3. Start the server as a background task: `node .claude/skills/hennha-ui-test/scripts/serve.mjs --dir dist --port 8765`. It exits with `cannot listen on <port>` when something else holds the port: pick another port, and check with `curl -I` that the headers are this server's before trusting numbers.
4. Functional + layout: `PW_DIR=<scratch>/pw node .claude/skills/hennha-ui-test/scripts/e2e.mjs --base http://127.0.0.1:8765/ --out <scratch>/run`. Add `--profiles mobile` to run one profile.
5. Smoothness: `PW_DIR=<scratch>/pw node .claude/skills/hennha-ui-test/scripts/perf.mjs --base http://127.0.0.1:8765/ --out <scratch>/perf` (10–15 minutes; `--skip-ab` saves half). Run it in the background and do not run e2e at the same time, it skews the numbers.
6. Look at the screenshots, especially `mobile-*.png` and every `FAIL-*.png`, before deciding whether a failure is the app or the test.
7. Write the report (below), then stop the server task.

## Reading the results

- A FAIL is only a bug once it reproduces. Rerun the single flow in a small script (loop it 5–8 times, dump state with `page.evaluate`). Long animations are normal here: tapping the heart to seeing the question takes about 2.7 s, so do not wait less than 8 s for step changes.
- `opacity: 0` still counts as "visible" to Playwright. Wait on a class (`.active`, `.ready`, `.show`) or check `getComputedStyle(...).opacity`.
- On phones only the language button that is not active is shown; set `locale: "vi-VN"` on the context or the VI/EN clicks hang.
- Layout notes in a PASS row (`touch target <44px`, `chữ <11px`) are improvements, not failures. List them in the report.
- Frame stats: `fps` and `p95` frame time (ms), `over33` = frames longer than 2 refreshes, `pctSmooth` = frames ≤ 20 ms. On 4G with CPU 4×, `pctSmooth` under ~80 % or `p95` over ~40 ms in a scenario is visible stutter.
- Cause: compare `ab4g` rows against `base`. The effect whose removal brings the biggest gain is the cause. `trace4g.mainMs` shows if time goes to script (`FunctionCall`, `FireAnimationFrame`), style/layout, or `Paint`; `raster` is GPU/raster thread work (blur, blend modes, large gradients).
- Headless Chrome rasterises in software, so paint/raster costs read higher than on a real phone. Compare variants against each other, not against absolute targets, and say so in the report.

## Report

Write `TEST-REPORT.md` at the repo root (Vietnamese, same tone as the user):

1. Môi trường: date, commit, build size, Chrome version, profiles, throttling values.
2. One table of every test case: `| ID | Khu vực | Test case | Desktop | Mobile | Ghi chú |`, results as ✅ / ❌ / ⚠️ (pass with a note).
3. 4G table: per condition, load metrics and per-scenario `fps / p95 / pctSmooth`; when re-testing a fix, put before and after side by side.
4. Nguyên nhân giật: A/B table and the trace numbers that back it up.
5. Lỗi và cải tiến: one table `| # | Mức | Vấn đề | Bằng chứng | Đề xuất |`, ordered by severity. Only list what a test or measurement showed.
