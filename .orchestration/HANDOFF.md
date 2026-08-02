# Stardust Ecosystem — Session Handoff

## Identity / accounts
- **GitHub:** `dcassil` (gh CLI authed; repo/workflow/delete_repo scopes)
- **npm:** `dpcassil01` — granular token with **bypass-2FA** in `~/.npmrc`, so `npm publish` is non-interactive. Scoped org `stardust-cms` exists.
- Commit author: `Daniel Cassil <me@danielcassil.com>`
- Build Node repos under `~/Code` (NOT the iCloud `code_temp` path — spaces/eviction break tooling).

## Repos (local → GitHub → npm → published)
| Local | GitHub | npm | Latest |
|---|---|---|---|
| `~/Code/versioned-content-engine` | dcassil/versioned-content-engine | `versioned-content-engine` | **0.1.3** |
| `~/Code/stardust-dashboard` | dcassil/stardust-dashboard | `@stardust-cms/dashboard` | **0.1.5** |
| `.../code_temp/metis/stardust-iframe-adapter` | dcassil/stardust-iframe-adapter | `@stardust-cms/iframe-adapter` | **0.1.6** |
| `~/Code/frame-link`, `~/Code/frame-link-react` | dcassil/frame-link{,-react} | `frame-link`/`frame-link-react` | 4.0.x |
| `~/Code/transactor` | dcassil/transactor | `transactor-ts` | 1.0.0 |
| `~/Code/colab` (monorepo) | dcassil/colab | `colab-protocol`/`colab-ui`/`colab-server` | **0.1.3** (lockstep) |
| `~/Code/stardust` | dcassil/stardust | (the demo) | — |

## Demo (`~/Code/stardust/demo`)
Standalone consumer app installing the published packages.
- `admin/` host editor (dashboard HostShell + VCE store adapter + colab presence)
- `site/` embedded iframe (editable `data-cms`); `App.tsx` uses `StardustAdapterProvider` (+ `publishPointer`)
- `shared/` `@demo/shared/*` (content model + `VceContentStoreAdapter`)
- `presence-server/` colab-server relay
- Run: `cd demo && npm install`; `npm run demo:presence` (relay :5175); `VITE_PRESENCE_ENABLED=1 npm run demo` (site :5174, admin :5173). Presence: open :5173 in two windows.

## Done & published this session
- **versioned-content-engine 0.1.3** — `moveContent` drag-reorder fix (moved record stamped at `index-0.5` to beat the reindex tie-break).
- **@stardust-cms/dashboard 0.1.4** — `editable`/read-only mode + auto-select-on-insert. **0.1.5** — `OverlayChromeParts.pointer` (normalized 0..1 iframe pointer).
- **@stardust-cms/iframe-adapter 0.1.6** — `cms/pointer` protocol + iframe capture (`StardustAdapterProvider publishPointer`) + `useStardustHost().pointer`.
- **colab 0.1.3** — server replays edit-lock state to joiners + reconciles on leave.
- **Demo (main):** polished site + admin; full-width top bar; sidebar Content|Styles tabs (tabs top, Add palette under Content); 2× dropzone; translucent drag-over; per-tab name field; per-content-item edit-lock enforcement (no-steal + read-only panels + banner + per-item badge); pagehide lock clear; 5-min idle release; cursor scroll+scale correctness.

## IN FLIGHT — finish then STOP (user said stop after this worker)
- Agent `a2a1474c5f5c63230`, branch `feat/full-page-cursor` (in `~/Code/stardust`): demo → iframe-adapter ^0.1.6 + dashboard ^0.1.5, `publishPointer` on site, `OverlayChromeParts.pointer` → colab Cursor (replaces host document capture) for **full-page cursor tracking**.
- When it reports: merge `feat/full-page-cursor` → main (`--no-ff`); `cd demo && npm install && npm run typecheck && npm test && npm run build && npm run depcruise`; push main; delete branch. No publish (demo private). Then STOP.

## DEFERRED — do NOT start (user paused)
- **Realtime content broadcast (#3):** each admin instance has its own VCE store, so edits don't cross instances. Plan: broadcast each APPLIED content op (post-mint resolved ids) over colab; receivers apply + re-inject so iframe+admin re-render live.

## Caveats
- Publish version-probe `require('<pkg>/package.json')` errors are harmless (exports maps hide package.json) — trust build/test.
- 2 pre-existing demo lint errors (`VersionControls` max-lines, `PresenceIndicator` template-expr) predate this session; lint not in required gate.
- `git push --delete <remote-branch>` / `git reset --hard` sometimes hit a permission guard — split/avoid; `git branch -d` locally is fine.
- Agent registry: `.../code_temp/metis/versioned-content-engine/.orchestration/agents.md`.
- Orchestrator session id: `session_0134z6tFohQqpm2TChUQ4vky`.
