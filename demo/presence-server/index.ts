/**
 * Demo `colab` presence relay — a tiny runnable Socket.IO server built on the
 * published `colab-server` package.
 *
 * PRESENCE / EDIT-LOCKS ONLY. This is the relay the demo admin's
 * `<ColabProvider>` connects to (see `admin/src/presence/config.ts`
 * `PRESENCE_SERVER_URL`). It fans out pointer + edit-lock + roster events between
 * the admin tabs sharing the presence room, replacing the old server-less
 * BroadcastChannel mock.
 *
 * CORS ORIGIN is EXPLICIT (never `"*"`, per NFR-002): only the demo admin origin
 * may connect. Override host/port/origin via env for other setups.
 *
 * Run: `npm run demo:presence` (from `demo/`), which invokes this via `tsx`.
 */

import { createColabServer } from "colab-server";

/** The admin origin allowed to connect (the demo admin dev server). */
const ADMIN_ORIGIN = process.env.PRESENCE_ALLOWED_ORIGIN ?? "http://localhost:5173";
const PORT = Number(process.env.PRESENCE_PORT ?? "5175");
const HOST = process.env.PRESENCE_HOST ?? "127.0.0.1";

async function main(): Promise<void> {
  const server = createColabServer({
    host: HOST,
    port: PORT,
    // Explicit allow-list — the admin dev origin only. NEVER "*".
    cors: { origin: ADMIN_ORIGIN },
  });

  const port = await server.listen(PORT, HOST);
  console.log(
    `[demo colab relay] listening on http://${HOST}:${String(port)} (origin: ${ADMIN_ORIGIN})`,
  );

  const shutdown = (): void => {
    void server.close().then(() => process.exit(0));
  };
  process.on("SIGINT", shutdown);
  process.on("SIGTERM", shutdown);
}

void main();
