/**
 * Shared demo content vocabulary.
 *
 * This module is the single source of truth for the demo's target ids and the
 * seed content tree. It is imported by BOTH:
 *
 *  - the demo **site** (SIFR-T-0007), which seeds its `StardustAdapterProvider`
 *    with this content so the page renders standalone, and
 *  - the demo **admin** content store (SIFR-T-0009), which holds the same tree,
 *    applies structured operations to it, and re-injects it via
 *    `cms/sendElements`.
 *
 * Keeping the ids and shapes here guarantees the site's rendered DOM, the host's
 * geometry stream, and the store's operation targets all speak one vocabulary.
 *
 * It depends ONLY on the framework-agnostic protocol subpath — no React, no host
 * or iframe runtime code — so it is safe for the store (which must stay
 * React/transport-free) to import.
 */

import type { CmsContent, ContentPayload } from "@stardust-cms/iframe-adapter/protocol";

/**
 * The demo's editable target ids.
 *
 * `hero`, `intro`, `showcase`, `features` are flat targets. `split` holds a
 * single `container` content item whose {@link ContentRenderer} expands into two
 * nested child targets — `split-col.1` and `split-col.2` — which are the
 * demo's nested-container targets (each is a real, discoverable
 * `data-cms-container-target`).
 */
export const TARGET_IDS = {
  hero: "hero",
  intro: "intro",
  showcase: "showcase",
  features: "features",
  split: "split",
} as const;

/** The id of the `container` content item placed inside the `split` target. */
export const SPLIT_CONTAINER_ID = "split-col";

/** The two nested child targets produced by the split container. */
export const SPLIT_CHILD_TARGETS = {
  left: `${SPLIT_CONTAINER_ID}.1`,
  right: `${SPLIT_CONTAINER_ID}.2`,
} as const;

/** Every flat target rendered as an `EditableTarget` on the page. */
export const PAGE_TARGET_IDS: readonly string[] = [
  TARGET_IDS.hero,
  TARGET_IDS.intro,
  TARGET_IDS.showcase,
  TARGET_IDS.features,
  TARGET_IDS.split,
];

/**
 * A single seed item: which target it belongs to, its index within that target,
 * and the {@link CmsContent} to render. This is exactly the information needed
 * to build a {@link ContentPayload} for `cms/sendElements`.
 */
export interface SeedItem {
  targetId: string;
  index: number;
  content: CmsContent;
}

/**
 * The demo's seed content tree. Ordered, keyed by (targetId, index). Rendered on
 * first load with no host connected, and used as the store's initial snapshot.
 */
export const SEED_CONTENT: readonly SeedItem[] = [
  {
    targetId: TARGET_IDS.hero,
    index: 0,
    content: {
      id: "hero-title",
      type: "text",
      value: "Edit any website, live, from an admin panel.",
      styleGroup: "hero-title",
    },
  },
  {
    targetId: TARGET_IDS.hero,
    index: 1,
    content: {
      id: "hero-subtitle",
      type: "text",
      value:
        "A typed iframe adapter streams geometry to the host so overlays track every target as it scrolls, resizes, and re-renders.",
      styleGroup: "hero-subtitle",
    },
  },
  {
    targetId: TARGET_IDS.intro,
    index: 0,
    content: {
      id: "intro-body",
      type: "text",
      value:
        "This page is a plain public site. It is wrapped once in StardustAdapterProvider and annotates its regions with EditableTarget — nothing else. The admin shell embeds it in an iframe and edits it over frame-link.",
      styleGroup: "intro-body",
    },
  },
  {
    targetId: TARGET_IDS.showcase,
    index: 0,
    content: {
      id: "showcase-image",
      type: "image",
      value:
        "data:image/svg+xml;utf8," +
        encodeURIComponent(
          '<svg xmlns="http://www.w3.org/2000/svg" width="480" height="240"><defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#6366f1"/><stop offset="1" stop-color="#ec4899"/></linearGradient></defs><rect width="480" height="240" rx="16" fill="url(#g)"/><text x="240" y="130" font-family="sans-serif" font-size="26" fill="white" text-anchor="middle">Content Card</text></svg>',
        ),
      styleGroup: "showcase-image",
    },
  },
  {
    targetId: TARGET_IDS.showcase,
    index: 1,
    content: {
      id: "showcase-caption",
      type: "text",
      value: "An image target — edit its source from the admin side panel.",
      styleGroup: "showcase-caption",
    },
  },
  {
    targetId: TARGET_IDS.features,
    index: 0,
    content: {
      id: "feature-1",
      type: "text",
      value: "Typed, structured-clone-safe protocol",
      styleGroup: "feature-item",
    },
  },
  {
    targetId: TARGET_IDS.features,
    index: 1,
    content: {
      id: "feature-2",
      type: "text",
      value: "Explicit-origin frame-link handshake (never *)",
      styleGroup: "feature-item",
    },
  },
  {
    targetId: TARGET_IDS.features,
    index: 2,
    content: {
      id: "feature-3",
      type: "text",
      value: "Overlays that track geometry under scroll and resize",
      styleGroup: "feature-item",
    },
  },
  // The nested container: a single `container` content item in the `split`
  // target. Its renderer expands into the two child targets below.
  {
    targetId: TARGET_IDS.split,
    index: 0,
    content: {
      id: SPLIT_CONTAINER_ID,
      type: "container",
      column: false,
      styleGroup: "split",
    },
  },
  // Children live inside the container's nested targets.
  {
    targetId: SPLIT_CHILD_TARGETS.left,
    index: 0,
    content: {
      id: "split-left-heading",
      type: "text",
      value: "Nested container — left column",
      styleGroup: "split-heading",
    },
  },
  {
    targetId: SPLIT_CHILD_TARGETS.left,
    index: 1,
    content: {
      id: "split-left-body",
      type: "text",
      value:
        "Drop a block here from the admin palette. Child geometry streams individually so its overlay lands precisely.",
      styleGroup: "split-body",
    },
  },
  {
    targetId: SPLIT_CHILD_TARGETS.right,
    index: 0,
    content: {
      id: "split-right-heading",
      type: "text",
      value: "Nested container — right column",
      styleGroup: "split-heading",
    },
  },
  {
    targetId: SPLIT_CHILD_TARGETS.right,
    index: 1,
    content: {
      id: "split-right-body",
      type: "text",
      value:
        "Each child block carries its own stable id so the host can address it for move, edit, and delete.",
      styleGroup: "split-body",
    },
  },
];

/** Build a `cms/sendElements` payload for a single seed item. */
export function seedItemToPayload(item: SeedItem): ContentPayload {
  return {
    targetId: item.targetId,
    contentId: item.content.id,
    index: item.index,
    content: item.content,
  };
}

/** Every seed item as a `cms/sendElements` payload, ready to inject/render. */
export function seedPayloads(): ContentPayload[] {
  return SEED_CONTENT.map(seedItemToPayload);
}
