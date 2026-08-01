/**
 * `createRelayTransport` — a demo `ColabTransport` that bridges `colab-ui`'s
 * message model to the `colab-server` relay's wire protocol.
 *
 * WHY A CUSTOM TRANSPORT (not `createSocketIoTransport`): the published 0.1.0
 * packages ship two DIFFERENT socket.io wire surfaces:
 *   - `colab-ui`'s default transport speaks a single `colab:msg` event and puts
 *     only `{ identity, token }` in the handshake `auth`, announcing the room via
 *     a separate `emit("join", room)`.
 *   - `colab-server` speaks DISCRETE events (`pointer` / `interaction` / `update`
 *     / `leave` inbound; `roster` / `participant_*` / `server_pointer` /
 *     `server_interaction` outbound) and derives the room from `auth.roomId` at
 *     connection time (a socket with no `auth.roomId` is disconnected on sight).
 * They are therefore wire-incompatible out of the box. This transport is the
 * exact adapter the `<ColabProvider transport>` seam exists for: it connects with
 * the relay's `{ roomId, identity }` handshake and maps colab envelopes onto the
 * relay's discrete events in both directions.
 *
 * It also BUFFERS sends issued before the socket connects: `colab-ui`'s
 * `startSession` fires `connect()` (async) then synchronously relays messages, so
 * pre-connect sends must queue rather than throw.
 *
 * `socket.io-client` is imported lazily inside `connect()` (matching colab-ui's
 * own optional-dependency discipline), so it is pulled only on the presence path.
 */

import type { ColabTransport } from "colab-ui/react";
import {
  COLAB_EVENTS,
  COLAB_SERVER_EVENTS,
  type ColabMessage,
  type Identity,
} from "colab-protocol";

export interface RelayTransportOptions {
  url: string;
  room: string;
  identity: Identity;
}

/** Minimal structural socket shape this transport needs (no socket.io types). */
interface MinimalSocket {
  on(event: string, handler: (payload: unknown) => void): void;
  emit(event: string, payload: unknown): void;
  disconnect(): void;
}

/** The relay's server→client event names this transport forwards inbound. */
const SERVER_EVENTS = [
  COLAB_SERVER_EVENTS.ROSTER,
  COLAB_SERVER_EVENTS.PARTICIPANT_JOINED,
  COLAB_SERVER_EVENTS.PARTICIPANT_UPDATED,
  COLAB_SERVER_EVENTS.PARTICIPANT_LEFT,
  COLAB_SERVER_EVENTS.POINTER,
  COLAB_SERVER_EVENTS.INTERACTION,
] as const;

/** Client→server events the relay accepts (JOIN is via the handshake instead). */
const CLIENT_RELAY_EVENTS = new Set<string>([
  COLAB_EVENTS.POINTER,
  COLAB_EVENTS.INTERACTION,
  COLAB_EVENTS.UPDATE,
  COLAB_EVENTS.LEAVE,
]);

/** Build a `colab-server`-compatible {@link ColabTransport}. */
export function createRelayTransport(
  opts: RelayTransportOptions,
): ColabTransport {
  let socket: MinimalSocket | undefined;
  let connected = false;
  const pending: ColabMessage[] = [];
  const handlers = new Set<(message: ColabMessage) => void>();

  const deliver = (message: ColabMessage): void => {
    for (const handler of Array.from(handlers)) handler(message);
  };

  return {
    async connect(): Promise<void> {
      const mod = await import("socket.io-client");
      const s = mod.io(opts.url, {
        // The relay reads the room + identity from the handshake `auth`; a socket
        // without `roomId` is rejected. This is the load-bearing difference from
        // colab-ui's default transport.
        auth: { roomId: opts.room, identity: opts.identity },
      }) as unknown as MinimalSocket;
      socket = s;
      // Wire every relay server→client event to an inbound `ColabMessage` BEFORE
      // awaiting `connect`. The relay emits the initial ROSTER synchronously in
      // its `connection` handler (right after our `connect`), so the listeners
      // must already be attached or that first roster frame is missed. The relay
      // already emits `createMessage(type, from, payload)` envelopes, so we
      // forward them verbatim to the session's inbound router.
      for (const event of SERVER_EVENTS) {
        s.on(event, (payload) => {
          deliver(payload as ColabMessage);
        });
      }
      await new Promise<void>((resolve) => {
        s.on("connect", () => {
          resolve();
        });
      });
      connected = true;
      while (pending.length > 0) {
        const message = pending.shift();
        if (message) this.send(message);
      }
    },
    disconnect(): void {
      connected = false;
      pending.length = 0;
      handlers.clear();
      socket?.disconnect();
      socket = undefined;
    },
    send(message: ColabMessage): void {
      if (!connected || socket === undefined) {
        pending.push(message);
        return;
      }
      // JOIN is carried by the handshake `auth`, so the relay has no `join`
      // event — drop the session's JOIN send (roster attribution already
      // happened at connect). All other client events map 1:1 by `type`.
      if (message.type === COLAB_EVENTS.JOIN) return;
      if (CLIENT_RELAY_EVENTS.has(message.type)) {
        socket.emit(message.type, message);
      }
    },
    subscribe(handler: (message: ColabMessage) => void): () => void {
      handlers.add(handler);
      return () => {
        handlers.delete(handler);
      };
    },
  };
}
