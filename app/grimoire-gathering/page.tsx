import Link from "next/link";

import { GrimoireGatheringText } from "@/components/grimoire-gathering-text";
import { LocalizedEventTime } from "@/components/localized-event-time";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import {
  discordInviteUrl,
  formatGrimoireTier,
  grimoireEventTicketNotice,
  type SeasonEvent,
} from "@/lib/grimoire";
import { getMergedGamesForEvent, getNextGrimoireEvent, getSeasonSchedule } from "@/lib/grimoire-server";

export const dynamic = "force-dynamic";
const contactAdminSubject = encodeURIComponent(
  "Grimoire Gathering - Contact Admin"
);

function buildPaypalWidget(nextEvent: SeasonEvent) {
  const paypalLink = process.env.GG_PAYPAL_LINK?.trim();
  const hostedButtonId = process.env.GG_PAYPAL_HOSTED_BUTTON_ID?.trim();

  if (hostedButtonId) {
    return (
      <form
        action="https://www.paypal.com/cgi-bin/webscr"
        className="ggcon-paypal-form stack"
        method="post"
        target="_blank"
      >
        <input type="hidden" name="cmd" value="_s-xclick" />
        <input type="hidden" name="hosted_button_id" value={hostedButtonId} />
        <button className="ggcon-buy-badge-button" type="submit">
          Buy {nextEvent.ticketLabel} with PayPal
        </button>
      </form>
    );
  }

  if (paypalLink) {
    return (
      <a
        className="button ggcon-buy-badge-button"
        href={paypalLink}
        rel="noreferrer"
        target="_blank"
      >
        Buy {nextEvent.ticketLabel} with PayPal
      </a>
    );
  }

  return (
    <Link className="button ggcon-buy-badge-button" href="/grimoire-gathering/cart?badges=1">
      Buy {nextEvent.ticketLabel}
    </Link>
  );
}

export default async function GrimoireGatheringPage() {
  const seasonSchedule = await getSeasonSchedule();
  const nextEvent = await getNextGrimoireEvent();

  if (!nextEvent) {
    return (
      <main className="stack ggcon-page">
        <section className="card ledger-panel stack ggcon-hero-copy-panel">
          <p className="eyebrow ggcon-hero-copy-heading">
            <RainbowSpellbook />
            &apos;S PREMIERE ONLINE CONVENTION
          </p>
          <p className="ggcon-lead ggcon-hero-copy-body">
            <GrimoireGatheringText /> is <RainbowSpellbook />
            &apos;s monthly online convention,
            bringing players and Dungeon Masters together for a weekend of
            Dungeons &amp; Dragons adventures, organized play, one-shots, and
            epic community games.
          </p>
        </section>

        <section className="card ledger-panel stack">
          <h2 style={{ margin: 0 }}>No Grimoire events have been scheduled yet.</h2>
          <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
            Admin can add the first event from the Grimoire admin page.
          </p>
        </section>
      </main>
    );
  }

  const nextEventHeader = nextEvent.subtitle.replace(/^Season Kickoff\s*:\s*/i, "").trim();
  const featuredSeasonSchedule = seasonSchedule.slice(0, 4);
  const nextEventGames = await getMergedGamesForEvent(nextEvent.id);
  const displayedGames =
    nextEventGames.length > 0
      ? nextEventGames
      : await getMergedGamesForEvent(seasonSchedule[0]?.id ?? nextEvent.id);

  return (
    <main className="stack ggcon-page">
      <section className="card ledger-panel stack ggcon-hero-copy-panel">
        <p className="eyebrow ggcon-hero-copy-heading">
          <RainbowSpellbook />
          &apos;S PREMIERE ONLINE CONVENTION
        </p>
        <p className="ggcon-lead ggcon-hero-copy-body">
          <GrimoireGatheringText /> is <RainbowSpellbook />
          &apos;s monthly online convention,
          bringing players and Dungeon Masters together for a weekend of
          Dungeons &amp; Dragons adventures, organized play, one-shots, and
          epic community games.
        </p>
      </section>

      <section className="ggcon-hero">
        <section className="card ledger-panel stack ggcon-ticket-card">
          <div className="stack" style={{ gap: "0.45rem" }}>
            <p className="eyebrow">Next Event</p>
            {nextEvent.finale ? (
              <span className="pill ggcon-event-pill" style={{ width: "fit-content" }}>
                GGCON Event
              </span>
            ) : null}
            <h2 className="ggcon-ticket-title" style={{ margin: 0 }}>
              {nextEventHeader}
            </h2>
            <p className="muted ggcon-meta-note ggcon-ticket-date" style={{ margin: 0 }}>
              {nextEvent.displayDate}
            </p>
          </div>
          <div className="ggcon-ticket-price-row">
            <span className="ggcon-ticket-price">{nextEvent.ticketPrice}</span>
            <span className="pill ggcon-ticket-label">{nextEvent.ticketLabel}</span>
          </div>
          <p className="ggcon-ticket-copy">{nextEvent.focus}</p>
          <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
            {grimoireEventTicketNotice}
          </p>
          <div className="inline-actions" style={{ flexWrap: "wrap" }}>
            {buildPaypalWidget(nextEvent)}
            <Link className="button secondary" href="/grimoire-gathering/cart">
              Open cart
            </Link>
            <Link className="button secondary" href="/grimoire-gathering/dm">
              Become a DM
            </Link>
            <Link
              className="button secondary"
              href={`/grimoire-gathering/events/${nextEvent.id}`}
            >
              Event pack
            </Link>
          </div>
        </section>

        <div className="ggcon-hero-art">
          <img
            alt="Grimoire Gathering logo"
            className="ggcon-logo"
            src="/grimoire-gathering-banner.png"
          />
        </div>
      </section>

      <section className="card ledger-panel stack">
        <img
          alt="Grimoire divider"
          className="ggcon-table-divider"
          src="/divider4.png"
        />
        <div className="section-heading">
          <div className="stack" style={{ gap: "0.45rem" }}>
            <h2 style={{ margin: 0 }}>Available Games</h2>
            <p className="muted ggcon-meta-note ggcon-available-games-intro" style={{ margin: 0 }}>
              Featured lineup for {nextEvent.displayDate}. All start times
              automatically display in your local time zone, and approved DM
              submissions appear here after staff review.
            </p>
          </div>
          <Link className="button secondary" href="/grimoire-gathering/cart">
            View cart
          </Link>
        </div>
        <div className="table-wrap ledger-table">
          <table>
            <thead>
              <tr>
                <th>Game</th>
                <th>Tier</th>
                <th>Start Time</th>
                <th>DM</th>
                <th>Details</th>
              </tr>
            </thead>
            <tbody>
              {displayedGames.map((game) => (
                <tr key={game.slug}>
                  <td>{game.game}</td>
                  <td>{formatGrimoireTier(game.tier)}</td>
                  <td>
                    <LocalizedEventTime isoString={game.startAt} />
                  </td>
                  <td>{game.dm}</td>
                  <td>
                    <Link
                      className="button secondary ggcon-table-button"
                      href={`/grimoire-gathering/games/${game.slug}`}
                    >
                      View
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card ledger-panel stack">
        <img
          alt="Grimoire divider"
          className="ggcon-table-divider"
          src="/divider4.png"
        />
        <div className="section-heading">
          <div className="stack" style={{ gap: "0.45rem" }}>
            <h2 style={{ margin: 0 }}>Season Schedule</h2>
            <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
              Planned season roadmap for upcoming Grimoire convention weekends.
            </p>
          </div>
        </div>
        <div className="ggcon-schedule-grid">
          {featuredSeasonSchedule.map((event) => (
            <article
              key={event.id}
              className={`ggcon-schedule-card${event.finale ? " finale" : ""}`}
            >
              <p className="ggcon-schedule-month">{event.label}</p>
              {event.finale ? <span className="pill ggcon-event-pill">GGCON Event</span> : null}
              <h3>{event.subtitle}</h3>
              <p className="ggcon-schedule-date">{event.displayDate}</p>
              <p className="ggcon-schedule-theme">Theme: {event.theme}</p>
              <p className="ggcon-schedule-focus">{event.focus}</p>
              <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                {grimoireEventTicketNotice}
              </p>
              <Link className="button secondary ggcon-schedule-button" href={`/grimoire-gathering/events/${event.id}`}>
                Event pack
              </Link>
            </article>
          ))}
        </div>
        <img
          alt="Grimoire divider"
          className="ggcon-table-divider"
          src="/divider4.png"
        />
      </section>

      <section className="homepage-community-row ggcon-community-row">
        <section className="card ledger-panel stack ggcon-community-card-half">
          <h2 style={{ margin: 0 }}>
            <GrimoireGatheringText /> Discord
          </h2>
          <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
            Coordinate with players, meet Dungeon Masters, and keep up with event
            announcements before the next convention weekend.
          </p>
          <div className="inline-actions">
            <a
              className="button ggcon-discord-link"
              href={discordInviteUrl}
              target="_blank"
              rel="noreferrer"
            >
              <svg
                aria-hidden="true"
                className="ggcon-discord-icon"
                viewBox="0 0 24 24"
              >
                <path
                  d="M20.317 4.369a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.211.375-.444.864-.608 1.249a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.249.077.077 0 0 0-.079-.037 19.736 19.736 0 0 0-4.885 1.515.07.07 0 0 0-.032.027C.533 9.046-.32 13.579.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128c.126-.094.252-.192.372-.291a.074.074 0 0 1 .077-.01c3.927 1.793 8.18 1.793 12.061 0a.074.074 0 0 1 .078.009c.12.099.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.891.076.076 0 0 0-.04.107 15.726 15.726 0 0 0 1.225 1.993.077.077 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.056c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03ZM8.02 15.331c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.211 0 2.166 1.094 2.157 2.418 0 1.334-.955 2.419-2.157 2.419Zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.418 2.157-2.418 1.211 0 2.166 1.094 2.157 2.418 0 1.334-.946 2.419-2.157 2.419Z"
                  fill="currentColor"
                />
              </svg>
              Join Discord
            </a>
          </div>
        </section>

        <section className="card ledger-panel stack ggcon-community-card-half">
          <h2 style={{ margin: 0 }}>Contact Admin</h2>
          <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
            Need help with tickets, logistics, or event questions? Send a note
            directly to the <GrimoireGatheringText /> admin inbox.
          </p>
          <div className="inline-actions">
            <a
              className="button secondary"
              href={`mailto:trevor@spellbookrpg.games?subject=${contactAdminSubject}`}
            >
              Contact Admin
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
