import Link from "next/link";

import { FlyingCarpetBadge } from "@/components/flying-carpet-badge";
import { GrimoireGatheringText } from "@/components/grimoire-gathering-text";

export function FlyingCarpetSection() {
  return (
    <section className="card ledger-panel ggcon-flying-carpet-section">
      <img
        alt="Grimoire divider"
        className="ggcon-table-divider ggcon-flying-carpet-divider"
        src="/divider4.png"
      />
      <div className="stack" style={{ gap: "1rem" }}>
        <div className="stack" style={{ gap: "0.45rem" }}>
          <p className="eyebrow" style={{ margin: 0 }}>Limited Badge</p>
          <h2 className="ggcon-flying-carpet-title" style={{ margin: 0 }}>
            Tome Key Badge
          </h2>
        </div>

        <div className="ggcon-flying-carpet-grid">
          <div className="stack ggcon-flying-carpet-copy">
            <p className="ggcon-flying-carpet-body" style={{ margin: 0 }}>
              Upgrade your <GrimoireGatheringText /> weekend with the limited
              Tome Key Badge and get the jump on the event before the
              public rush begins.
            </p>

            <div className="ggcon-flying-carpet-badge-wrap">
              <FlyingCarpetBadge className="ggcon-flying-carpet-badge-image" />
            </div>
          </div>

          <div className="ggcon-flying-carpet-aside">
            <div className="ggcon-flying-carpet-benefits">
              <div className="ggcon-flying-carpet-benefit">
                <span className="pill ggcon-flying-carpet-pill">Total Tome</span>
                <p style={{ margin: 0 }}>
                  Reserve tickets for event games two weeks before registration opens to
                  the general public, giving you the best chance to play the adventures
                  you want.
                </p>
              </div>
              <div className="ggcon-flying-carpet-benefit">
                <span className="pill ggcon-flying-carpet-pill">Three Wishes Draw</span>
                <p style={{ margin: 0 }}>
                  Receive one entry into a draw for free badges to the next three
                  Grimoire events you attend. Each draw offers a 1-in-30 chance to win.
                </p>
              </div>
              <div className="ggcon-flying-carpet-benefit">
                <span className="pill ggcon-flying-carpet-pill">Libram Arcanum Channel</span>
                <p style={{ margin: 0 }}>
                  Gain access to the event&apos;s exclusive Libram Arcanum Channel, where
                  players can coordinate their parties, prepare their characters, and
                  plan ahead for select adventures.
                </p>
              </div>
            </div>

            <div className="inline-actions ggcon-flying-carpet-aside-actions">
              <Link
                className="button ggcon-flying-carpet-button"
                href="/grimoire-gathering/cart?badges=1&badgeType=FLYING_CARPET"
              >
                Claim Yours in Cart
              </Link>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
