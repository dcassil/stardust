# stardust-demo

A standalone showcase of the **Stardust** in-iframe visual-editing ecosystem. It's a plain consumer
app — it `npm install`s the published packages and wires them into a working editor; nothing here is
a library.

## What it demonstrates

An admin shell embeds a demo site in an iframe and lets you edit it in-context:

- **Select / insert / move / edit / delete** content via overlays and a block palette (the
  `@stardust-cms/dashboard` `HostShell` + block registry).
- **Draft vs live** — edits accrue in a draft; toggle to preview the published state.
- **Publish** — promote the draft to live.
- **Inspect a previous version** — including the corrected delete/history semantics (a deleted item
  still appears when you view a pre-delete version), powered by `versioned-content-engine`.
- **Presence / collaboration** — live participant indicators, remote cursors, and edit-lock badges
  across two admin sessions, powered by the `colab-*` packages over a Socket.IO relay.

## Packages it consumes (all published on npm)

| Package | Role |
|---|---|
| `@stardust-cms/dashboard` | Host dashboard boilerplate (`HostShell`, blocks, overlays) |
| `@stardust-cms/iframe-adapter` | Typed iframe protocol + iframe/host adapters |
| `versioned-content-engine` | Headless draft/live content versioning (the content store) |
| `frame-link` / `frame-link-react` | Typed iframe transport |
| `colab-ui` / `colab-protocol` | Presence/collaboration client + shared types |
| `colab-server` | Socket.IO relay for collaboration sessions (dev dependency) |

## Run it

```bash
npm install
npm run demo          # site → http://localhost:5174, admin → http://localhost:5173
```

Open **http://localhost:5173**.

### Presence (optional, two sessions)

```bash
npm run demo:presence   # Socket.IO relay on http://localhost:5175
# then start the demo with presence enabled:
VITE_PRESENCE_ENABLED=1 npm run demo
```

Open the admin in two browser windows to see live cursors, participant indicators, and edit locks.

## Layout

- `admin/` — the host/editor app (Vite React) rendering `HostShell` + the versioned-content store adapter + colab presence.
- `site/` — the embedded content site with editable `data-cms` targets.
- `shared/` — internal `@demo/shared/*` modules (content model + store adapter) shared by both apps.
- `presence-server/` — a small `colab-server` relay for presence.
- `e2e/` — Playwright tests (overlay alignment, style panel, publish/history, presence).

## Scripts

`demo` · `demo:site` · `demo:admin` · `demo:presence` · `typecheck` · `test` · `build` · `e2e` · `lint` · `depcruise`
