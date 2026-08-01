/**
 * The demo site page layout.
 *
 * A plausible marketing/content page built ENTIRELY from `EditableTarget`s. It
 * hardcodes NO copy — every visible string comes from the adapter's content map
 * (seeded by {@link SeedContent}, replaced live by the host's `cms/sendElements`).
 * The layout owns only structure and light styling; content is adapter-driven.
 *
 * Targets (SIFR-T-0007): hero, intro (text), showcase (image card), features
 * (list), and split — which holds a `container` content item that expands into
 * two nested container targets (the nested-container requirement).
 */

import type { ReactNode } from "react";
import { EditableTarget } from "@stardust-cms/iframe-adapter";
import { TARGET_IDS } from "@demo/shared/content-model";

function Section({
  label,
  children,
}: {
  label: string;
  children: ReactNode;
}): ReactNode {
  return (
    <section className="demo-section">
      <p className="demo-section__label">{label}</p>
      {children}
    </section>
  );
}

export function Page(): ReactNode {
  return (
    <main className="demo-page">
      <Section label="hero">
        <EditableTarget targetId={TARGET_IDS.hero} />
      </Section>

      <Section label="intro (text)">
        <EditableTarget targetId={TARGET_IDS.intro} />
      </Section>

      <Section label="showcase (image card)">
        <EditableTarget targetId={TARGET_IDS.showcase} />
      </Section>

      <Section label="features (list)">
        <EditableTarget targetId={TARGET_IDS.features} />
      </Section>

      <Section label="split (nested container)">
        {/* The `container` content item seeded here renders two nested
            EditableTargets: split-col.1 and split-col.2. */}
        <EditableTarget targetId={TARGET_IDS.split} isContainer />
      </Section>
    </main>
  );
}
