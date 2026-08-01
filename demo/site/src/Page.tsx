/**
 * The demo site page layout.
 *
 * A polished, plausible marketing/content page. The EDITABLE regions
 * (hero, intro, showcase, features, split) are rendered ENTIRELY from
 * `EditableTarget`s — they hardcode NO copy; every visible string in those
 * regions comes from the adapter's content map (seeded by {@link SeedContent},
 * replaced live by the host's `cms/sendElements`).
 *
 * The nav and footer are NEW, non-editable chrome (plain markup). Section
 * framing text that is not part of an editable region (e.g. the features
 * heading) is likewise plain chrome. The `EditableTarget`s and their
 * `data-cms` structure are preserved so host editing keeps working.
 *
 * Targets (SIFR-T-0007): hero, intro (text), showcase (image card), features
 * (list), and split — which holds a `container` content item that expands into
 * two nested container targets (the nested-container requirement).
 */

import type { ReactNode } from "react";
import { EditableTarget } from "@stardust-cms/iframe-adapter";
import { TARGET_IDS } from "@demo/shared/content-model";

/** Gradient square logo mark used in the nav and footer chrome. */
function LogoMark(): ReactNode {
  return <span className="brand__mark" aria-hidden="true" />;
}

/** Sticky top navigation — non-editable chrome. */
function SiteHeader(): ReactNode {
  return (
    <header className="site-nav">
      <div className="site-nav__inner">
        <a className="brand" href="#">
          <LogoMark />
          <span className="brand__word">Northwind</span>
        </a>
        <nav className="site-nav__links" aria-label="Primary">
          <a href="#">Product</a>
          <a href="#">Features</a>
          <a href="#">Pricing</a>
          <a href="#">Docs</a>
        </nav>
        <a className="btn btn--solid site-nav__cta" href="#">
          Get started
        </a>
      </div>
    </header>
  );
}

/** Dark footer — non-editable chrome. */
function SiteFooter(): ReactNode {
  return (
    <footer className="site-footer">
      <div className="site-footer__inner container">
        <div className="site-footer__brand">
          <a className="brand brand--onDark" href="#">
            <LogoMark />
            <span className="brand__word">Northwind</span>
          </a>
          <p className="site-footer__tagline">
            The content engine that lives where your site does.
          </p>
        </div>
        <div className="site-footer__cols">
          <div className="site-footer__col">
            <h4>Product</h4>
            <a href="#">Features</a>
            <a href="#">Pricing</a>
            <a href="#">Changelog</a>
          </div>
          <div className="site-footer__col">
            <h4>Company</h4>
            <a href="#">About</a>
            <a href="#">Blog</a>
            <a href="#">Careers</a>
          </div>
          <div className="site-footer__col">
            <h4>Resources</h4>
            <a href="#">Docs</a>
            <a href="#">API</a>
            <a href="#">Support</a>
          </div>
        </div>
      </div>
      <div className="site-footer__bottom container">
        <span>© 2026 Northwind Labs · Built on the Stardust content engine</span>
      </div>
    </footer>
  );
}

export function Page(): ReactNode {
  return (
    <div className="site">
      <SiteHeader />

      <main>
        {/* HERO — editable title + subtitle, framed by an eyebrow pill, CTAs,
            and a gradient hero panel (all non-editable chrome). */}
        <section className="hero">
          <div className="container hero__inner">
            <span className="pill">✦ Now with live collaboration</span>
            <div className="hero__copy">
              <EditableTarget targetId={TARGET_IDS.hero} />
            </div>
            <div className="hero__cta">
              <a className="btn btn--solid" href="#">
                Start free
              </a>
              <a className="btn btn--outline" href="#">
                Live demo
              </a>
            </div>
          </div>
          <div className="container">
            <div className="hero__panel" aria-hidden="true" />
          </div>
        </section>

        {/* FEATURES band — non-editable heading chrome + editable subhead
            (intro target) + editable feature cards (features target). */}
        <section className="features">
          <div className="container">
            <div className="section-head">
              <h2>Everything your content team needs</h2>
              <div className="section-head__sub">
                <EditableTarget targetId={TARGET_IDS.intro} />
              </div>
            </div>
            <EditableTarget targetId={TARGET_IDS.features} />
          </div>
        </section>

        {/* SHOWCASE — two-column: left editable copy (the split container's
            nested child targets), right editable gradient image panel
            (showcase target). */}
        <section className="showcase">
          <div className="container showcase__grid">
            <div className="showcase__copy">
              <span className="tag">In-content editing</span>
              <EditableTarget targetId={TARGET_IDS.split} isContainer />
            </div>
            <div className="showcase__media">
              <EditableTarget targetId={TARGET_IDS.showcase} />
            </div>
          </div>
        </section>
      </main>

      <SiteFooter />
    </div>
  );
}
