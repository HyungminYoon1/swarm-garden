# Edge-case verification — 2026-10-13 — swarm-garden

LOCAL ONLY. Parent integrates/releases. No commit, push, deployment, sibling change or new server. Main loopback server remains running. Baseline tracked tree was clean; starting HEAD: 86b39c5.

## Results and reproducible commands

- NEW ordinary Node tests: **9** in `test/edge-20261013.test.js`. E01 etc. below mean declaration order in that file.
- Initial new regression batch: **4 actual failures** on unchanged production modules; remaining initial cases passed on baseline and are coverage additions, not RED_GREEN. 
- Confirmed defect groups: **3** (group repeated write/delete manifestations by the boundary described below). 
- Full `npm test`: **46/46 PASS**. `npm run check` and `git diff --check`: PASS.
- NEW browser B: `tools/browser-edge-20261013.mjs`, local Chrome, fresh isolated contexts, muted audio, 1440/390/320 pixels, real keyboard and mobile-emulated taps. Full results in `output/playwright/edge-20261013/browser.json`. No uncaught page exceptions; no horizontal overflow.
- CI: new Node file is automatically discovered by existing `node --test` / `npm test` in `.github/workflows/pages.yml`. Workflow unchanged. Browser script is repeatable optional tooling, **NOT in ordinary CI** (Playwright is an existing local QA dependency). Remote CI and LIVE: **NOT_RUN**.

Run from this repository:
```powershell
node --test test/edge-20261013.test.js
npm test
npm run check
node tools/browser-edge-20261013.mjs
git diff --check
```

Browser defaults: existing sibling-root `../output/playwright/implement-20261012/package.json` (Playwright 1.61.1), Chrome `C:/Program Files/Google/Chrome/Application/chrome.exe`, URL `http://127.0.0.1:59540/swarm-garden/`. Overrides: `PLAYWRIGHT_PACKAGE`, `CHROME_PATH`, `EDGE_BASE_URL`; `EDGE_FIXTURES_ONLY=1` runs just the injected fixture group. Dependencies are read only; evidence is written only within this owned repo. Script closes its own browser/contexts and never controls the shared server.

## Actual red / green evidence

E01/E02 private no-op writes/deletes reported success and could publish/remove summary; E03 empty-string aggregate was treated as absent and overwritten; E04 aggregate no-op set/clear reported success. Each is now rejected or reported as unconfirmed.

Production edits: `dist/src/storage.js, dist/src/progress.js`. Test doubles are explicit bounded in-memory fixtures, not real device denial/quota measurements or external validation. Readback confirms the value observed immediately afterward; it cannot make two localStorage keys transactional or prevent future concurrent writes.

- `output/playwright/edge-20261013/red.tap`: original new tests before production edits.
- `output/playwright/edge-20261013/green.tap`: same regression tests after minimal changes.
- `output/playwright/edge-20261013/full-test.txt`, `check.txt`: full suite and static check.

Evidence folder is ignored. Red logs are preserved, not reconstructed by reverting code. Previously documented 2026-10-13 bugs are existing work and are not counted here.

## Feature/control matrix

| Feature/control | Concrete test / command | Result and boundary |
| --- | --- | --- |
| Flock population / seed / torus / speed invariants | NEW E05 40/280 population, uint32 max, deterministic four ticks, torus coordinates and 35..110 speed | PASS; existing model seed-invalid suite also passes |
| Rules / timestep / pointer / environment | Existing model/missions tests; NEW E07 invalid beacon -1/WIDTH/NaN/string/null atomicity | PASS; physics and force bounds unchanged |
| Obstacle cap / repeated input / clear | NEW E06 12 obstacles then overflow/outside/type/NaN leaves world unchanged; B 13 keyboard Enter presses and clear | PASS; max12 unchanged |
| Crosswind exact tick / terminal / retry | NEW E07 tick479/480 reversal; E08 synthetic near-deadline state freezes after terminal; B real start/pause/retry | PASS; terminal setup is TEST_DOUBLE, not a full UI success |
| Mission success / failure / measured intervals | Existing missions/analysis tests actual seeded motion and bounded measurement reports | PASS full suite; all-seed guarantee NOT_RUN |
| Storage settings / five summaries / three unique missions | Existing storage suite; NEW E09 cloned reload, repeat clear, peer preservation | PASS; no retention changes |
| Private/aggregate readback / empty corrupt aggregate | NEW E01–04; B no-op settings write error UI | RED_GREEN 4 tests; no multi-tab atomic claim |
| Visibility / delayed animation / keyboard/mobile | NEW B injected hidden/visible listener, no auto-resume, beacon ArrowRight/Enter/Space, invalid seed empty/0/overflow | PASS TEST_DOUBLE visibility plus real UI input at three widths |
| Export/import / undo / decode/audio | No such product controls or APIs | N/A; reset/retake/clear and animation lifecycle covered |

B = the new browser command above. Existing tests are explicitly marked; running them again does not make them new coverage. No source-string-only test was added.

## Source accounting

- **VERIFIED**: `architecture.md`, `README.md`, `docs/decisions.md` read with authority precedence. `api-spec.md`, `requirements.md` absent in this repo (N/A, not silently skipped).
- **VERIFIED**: modified production modules `dist/src/storage.js, dist/src/progress.js`, added executable test/browser files, `package.json`, `.gitattributes`, `.gitignore`, and Pages workflow.
- **PARTIAL**: whole `dist/`, `test/`, `tools/`, `docs/` source review. Inventoried first; inspected applicable storage, model, UI lifecycle and existing regression files. All ordinary tests executed, but this is not a claim of full line-by-line review of every renderer, historical verification note or optional browser script.
- Existing `docs/verification.md` receives a new top link; old LOCAL/CI/LIVE claims remain historical.
- **NOT_INSPECTED / out of scope**: siblings' implementation and private files. No .env/credential values read or printed.

Inventory at intake (repository files, excluding .git/dependencies/output; inventory is not full-file review):

```text
tools\serve.mjs
tools\check.mjs
tools\browser-audit-20261013.js
test\storage.test.js
test\model.test.js
test\missions.test.js
test\analysis.test.js
README.md
package.json
docs\verification.md
docs\decisions.md
dist\styles.css
dist\src\ui.js
dist\src\storage.js
dist\src\progress.js
dist\src\model.js
dist\src\missions.js
dist\src\app.js
dist\src\analysis.js
dist\index.html
architecture.md
.gitignore
.github\workflows\pages.yml
.gitattributes
```

## Capture and limitations

`output/playwright/edge-20261013/viewport-1440.png`, `viewport-390.png`, `viewport-320.png` and injected storage-error capture. Narrow captures inspected for clipping/overlap; no layout/CSS redesign was made. Browser validation covers Chrome emulation, not a physical touchscreen, screen reader, Firefox/WebKit or all OS lifecycle behavior. No actual clinical/audio/photometric or real-world traffic/biology measurement. Concurrency fixtures are deterministic schedules, not exhaustive races. 

See [decision log](decisions.md) for D11. Preserve existing scientific model, game rules, safety and retention boundaries.
