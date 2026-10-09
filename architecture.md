# SWARM GARDEN architecture

## Purpose

A seeded, interactive Boids simulation with separation/alignment/cohesion, user obstacles and pointer guidance.

## Structure

Independent static GitHub Pages site at /swarm-garden/. dist/src/model.js owns pure calculation; dist/src/app.js owns UI, bounded inputs, playback and page lifecycle; dist/styles.css owns responsive presentation. snapshot-based fixed-step flock model -> Canvas scene; control validation and lifecycle remain in UI.

dist/src/missions.js composes the existing pure model into seeded, fixed-tick missions. It owns mission definitions, environmental fields, transient control budgets and objectives measured from actual boids; it has no DOM, clock, storage or network access. app.js renders this same state and pauses on hidden pages. Mission flocks are fixed at 60, lab flocks remain 40–280, obstacles remain at most 12, hazards at most 3. Neighbour and objective scans remain bounded O(n²); no spatial or architectural rewrite is introduced.

No backend, account, tracking, cookies, external fonts or runtime API. World coordinates, seeds, beacons and comparison baselines stay in transient page memory. Optional page-scoped WebMCP tools use the same validated state/actions as the visible controls, and feature-detect unsupported browsers. Tool summaries contain no private image bytes.

## Analysis and local storage boundaries (D07–D09)

dist/src/analysis.js is pure calculation. missions.js feeds each actual post-step objective measurement, mean torus distance to the active target center, exposure and broken-hold event into at-most-one-second intervals; intervals split on gate changes and include the terminal tick. At most 78 intervals are possible under the existing 75-second / three-gate campaign. Reports rank the three largest sums of condition-deficit duration, exposure integrals and hold-reset counts. Condition durations overlap; they are not elapsed time or inferred causes. No animals are removed and the report never invents loss counts. All displayed times use simulation seconds, distance uses model pixels, exposure uses flock-seconds. Reports preserve deadline/damage priority and original mission thresholds. Comparison requires the same mission ID and seed and shows raw deltas, not an attributed improvement score.

dist/src/storage.js is the sole private localStorage boundary. `swarm-garden-record-v1` contains only version, bounded rule settings, trail toggle, up to three independently completed mission IDs and the five most recent completed-run summaries (type, status, simulation time, secured gates, guidance time, exposure, condition-deficit times, reset count). It excludes seeds, coordinates, routes, raw action history, names, files and timestamps. Input is capped at 8,192 characters, structurally validated and range-checked; invalid/unavailable storage falls back to default in-memory state. Storage is attempted on explicit settings changes and run completion, never on initial view, hints, examples or mission selection. A successful result can count a mission once; failures and repeated wins do not add achievements. Storage can be edited by the device owner; this is not a verified public ranking. UI shows storage failures without blocking simulation. No new network permission is added.

dist/src/progress.js owns only `web-lab-progress-v1`, the approved same-origin gallery aggregate: `{version:1,apps:{[repoId]:{completed,total,updatedAt}}}`. Exactly 15 known repository IDs are allowed; at most 15 records, integer `0 <= completed <= total <= 1000`, canonical ISO UTC timestamps, at most 8,192 characters. Read-modify-write preserves other apps' valid records; malformed aggregates are left untouched. Own completed count comes from the actual durable unique mission IDs after private storage succeeds, total is three. A timestamp records a real summary write, never an invented completion date. No private payload is copied into the aggregate. Clearing removes the private key and only `apps["swarm-garden"]`; it never calls localStorage.clear(). Writes are synchronous best-effort read-modify-write, not transactional across tabs; other tabs can race and the UI reports write failure. There is no backend synchronization.

app.js restores only settings and summaries. A fresh page always starts the seed-21 mission paused; it does not restore an active run. “직전 시작 설정·시드로 재도전” restores the page-memory baseline's mission, seed and actual first-tick rules, then starts paused; guidance and later rule changes must be performed again. “같은 시드 재도전” keeps current rules for comparison. Changing mission or seed suppresses comparison with the previous result. Clear stops the current run, drops comparison/results, restores defaults and removes saved progress. A compact visible storage notice and explicit clear button describe this retention. This approved addition supersedes only D02/D05's old no-persistence boundary; pure mechanics, CSP and all existing tests remain intact.

No eval, user HTML injection or remote embeds. External links use noopener/noreferrer. CSP restricts connections and execution; GitHub hosting logs are separate. Only dist is deployed. UTF-8 without BOM / CRLF. Preserve all other repositories.

## Visual direction

deep-blue luminous motion field. The working surface opens immediately; no marketing landing page ahead of controls. Keyboard controls, touch input, readable labels and reduced motion are part of the UI. Diagrams/canvas represent actual computed state rather than decorative or fictional results.
