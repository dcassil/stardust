# stardust

A standalone showcase for the **Stardust** in-iframe visual-editing ecosystem — a runnable
demo that wires the published packages together into a working editor.

## What's here

- **`demo/`** — a standalone consumer app (admin shell + embedded site) built on the published
  packages, demonstrating the full workflow: select → insert/move/edit/delete content over an
  embedded site, toggle draft/live, publish, and inspect a previous version (including corrected
  delete/history semantics).

## The ecosystem it consumes (all on npm)

| Package | Role |
|---|---|
| [`@stardust-cms/dashboard`](https://www.npmjs.com/package/@stardust-cms/dashboard) | Host dashboard boilerplate (`HostShell`, block registry, overlays) |
| [`@stardust-cms/iframe-adapter`](https://www.npmjs.com/package/@stardust-cms/iframe-adapter) | Typed iframe protocol + iframe/host adapters |
| [`versioned-content-engine`](https://www.npmjs.com/package/versioned-content-engine) | Headless draft/live content versioning engine (the content store) |
| [`frame-link`](https://www.npmjs.com/package/frame-link) / [`frame-link-react`](https://www.npmjs.com/package/frame-link-react) | Typed iframe transport |
| `colab-ui` / `colab-server` / `colab-protocol` | Generic presence/collaboration (integration in progress) |

## Run the demo

```bash
cd demo
npm install
npm run demo      # site on :5174, admin on :5173 — open http://localhost:5173
```

## License

MIT © Daniel Cassil
