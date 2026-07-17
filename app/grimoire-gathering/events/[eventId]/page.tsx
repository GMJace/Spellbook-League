import Link from "next/link";
import { notFound } from "next/navigation";

import { LocalizedEventTime } from "@/components/localized-event-time";
import {
  formatGrimoireTier,
  formatUsd,
  grimoireEventTicketNotice,
} from "@/lib/grimoire";
import { getGrimoireEventById, getMergedGamesForEvent } from "@/lib/grimoire-server";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    eventId: string;
  }>;
};

export default async function GrimoireEventPackPage({ params }: PageProps) {
  const { eventId } = await params;
  const event = await getGrimoireEventById(eventId);

  if (!event) {
    notFound();
  }

  const games = await getMergedGamesForEvent(event.id);
  const dms = [...new Set(games.map((game) => game.dm))].sort((left, right) =>
    left.localeCompare(right),
  );

  return (
    <main className="page-shell">
      <section className="stack">
        <div className="section-heading">
          <div className="stack" style={{ gap: "0.45rem" }}>
            <p className="eyebrow">Event Pack</p>
            <h1 style={{ margin: 0 }}>{event.subtitle}</h1>
            <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
              {grimoireEventTicketNotice}
            </p>
            <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
              {event.displayDate} · {event.ticketLabel} · {event.ticketPrice}
            </p>
          </div>

          <div className="inline-actions" style={{ flexWrap: "wrap" }}>
            <Link className="button secondary" href="/grimoire-gathering">
              Back to Grimoire
            </Link>
            <Link className="button secondary" href="/grimoire-gathering/dm">
              Become a DM
            </Link>
            <Link className="button" href="/grimoire-gathering/cart">
              Open cart
            </Link>
          </div>
        </div>

        <div className="grid two ggcon-detail-grid">
          <section className="card ledger-panel stack">
            <div className="stack" style={{ gap: "0.45rem" }}>
              <p className="eyebrow">Theme</p>
              <h2 style={{ margin: 0 }}>{event.theme}</h2>
              <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                {event.focus}
              </p>
            </div>

            <ul className="contact-list ggcon-feature-list">
              {event.themeDetails.map((detail) => (
                <li key={detail}>{detail}</li>
              ))}
            </ul>
          </section>

          <section className="card ledger-panel stack">
            <div className="stack" style={{ gap: "0.45rem" }}>
              <p className="eyebrow">DM Roster</p>
              <h2 style={{ margin: 0 }}>Dungeon Masters</h2>
            </div>

            {dms.length ? (
              <div className="ggcon-summary-metrics">
                {dms.map((dm) => (
                  <div className="list-card stack" key={dm} style={{ gap: "0.35rem" }}>
                    <span className="muted">DM</span>
                    <strong>{dm}</strong>
                  </div>
                ))}
              </div>
            ) : (
              <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                No Dungeon Masters have been posted for this event yet.
              </p>
            )}

            <div className="list-card stack">
              <span className="muted">Games posted</span>
              <strong>{games.length}</strong>
              <span className="muted">
                Ticket pricing from {formatUsd(event.ticketPriceUsd)} for the event badge.
              </span>
            </div>
          </section>
        </div>

        <section className="card ledger-panel stack">
          <div className="section-heading">
            <div className="stack" style={{ gap: "0.45rem" }}>
              <h2 style={{ margin: 0 }}>Event Games</h2>
              <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                Full game lineup for {event.subtitle}, including approved submitted
                tables and listed Dungeon Masters.
              </p>
            </div>
          </div>

          {games.length ? (
            <div className="table-wrap ledger-table">
              <table>
                <thead>
                  <tr>
                    <th>Game</th>
                    <th>Tier</th>
                    <th>Start Time</th>
                    <th>DM</th>
                    <th>Price</th>
                    <th>Details</th>
                  </tr>
                </thead>
                <tbody>
                  {games.map((game) => (
                    <tr key={game.slug}>
                      <td>
                        <div className="stack" style={{ gap: "0.25rem" }}>
                          <strong>{game.game}</strong>
                          {game.gameCode ? (
                            <span className="muted ggcon-meta-note">{game.gameCode}</span>
                          ) : null}
                        </div>
                      </td>
                      <td>{formatGrimoireTier(game.tier)}</td>
                      <td>
                        <LocalizedEventTime isoString={game.startAt} />
                      </td>
                      <td>{game.dm}</td>
                      <td>{game.ticketPrice}</td>
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
          ) : (
            <div className="empty">
              No games have been posted for this event yet. Dungeon Masters can add tables from
              the Grimoire DM page.
            </div>
          )}
        </section>
      </section>
    </main>
  );
}
