# SWARM GARDEN architecture

## Purpose

A seeded, interactive Boids simulation with separation/alignment/cohesion, user obstacles and pointer guidance.

## Structure

Independent static GitHub Pages site at /swarm-garden/. dist/src/model.js owns pure calculation; dist/src/app.js owns UI, bounded inputs, playback and page lifecycle; dist/styles.css owns responsive presentation. snapshot-based fixed-step flock model -> Canvas scene; control validation and lifecycle remain in UI.

No backend, account, tracking, cookies, visitor persistence, external fonts or runtime API. Input and experiments are transient page memory; explicit image download is user-owned local output, not server storage. Optional page-scoped WebMCP tools use the same validated state/actions as the visible controls, and feature-detect unsupported browsers. Tool summaries contain no private image bytes.

No eval, user HTML injection or remote embeds. External links use noopener/noreferrer. CSP restricts connections and execution; GitHub hosting logs are separate. Only dist is deployed. UTF-8 without BOM / CRLF. Preserve all other repositories.

## Visual direction

deep-blue luminous motion field. The working surface opens immediately; no marketing landing page ahead of controls. Keyboard controls, touch input, readable labels and reduced motion are part of the UI. Diagrams/canvas represent actual computed state rather than decorative or fictional results.
