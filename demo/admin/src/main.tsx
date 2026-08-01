import { createRoot } from "react-dom/client";
import { App } from "./App";
// Dashboard design tokens (admin-*/ov-* base styling). Demo styles.css is
// imported after so the demo's palette/panel/version-control styling wins.
import "@stardust-cms/dashboard/tokens";
import "./styles.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Demo admin: #root element not found");
}

// NOTE: StrictMode is intentionally NOT used. React StrictMode double-invokes
// effects (mount → unmount → mount) in development, which makes
// `FrameLinkProvider` destroy its first frame-link instance mid-handshake and
// tears down the one-time `connect()` in a way that leaves the connection in an
// error state during dev. The adapter's own tests cover StrictMode-safety of the
// provider; the demo runs without it so the live handshake is stable to observe.
createRoot(rootEl).render(<App />);
