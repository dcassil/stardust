import { createRoot } from "react-dom/client";
import { App } from "./App";
import "./styles.css";

const rootEl = document.getElementById("root");
if (!rootEl) {
  throw new Error("Demo site: #root element not found");
}

// StrictMode intentionally omitted — see the admin's main.tsx note: its
// dev-only effect double-invocation destabilizes the live frame-link handshake.
createRoot(rootEl).render(<App />);
