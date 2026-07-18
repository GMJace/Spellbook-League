import Link from "next/link";

import { GrimoireGatheringsText } from "@/components/grimoire-gathering-text";
import { LocalizedEventTime } from "@/components/localized-event-time";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { getHomepageData } from "@/lib/data";
import { getProDmRatingSummaryMap, getProDmReviews } from "@/lib/pro-dm-reviews";
import { getProDmRosterEntries } from "@/lib/pro-dm-roster";
import { getSeasonSchedule } from "@/lib/grimoire-server";
import { prisma } from "@/lib/prisma";
import { formatTier, isPaidTicketPrice } from "@/lib/utils";

export const dynamic = "force-dynamic";

const publishingStoreUrl = "https://www.spellbookpublishing.com/";

export default async function StorePage() {
  const now = new Date();
  const [seasonSchedule, homepageData, proDmRosterEntries, proDmReviews] =
    await Promise.all([
      getSeasonSchedule(),
      getHomepageData(),
      getProDmRosterEntries(),
      getProDmReviews(),
    ]);

  const upcomingEvents = seasonSchedule
    .filter((event) => new Date(event.date).getTime() >= now.getTime())
    .slice(0, 3);

  const ticketedLeagueGames = homepageData.openLeagueGames.filter((game) =>
    isPaidTicketPrice(game.ticketPrice),
  );

  const listedRosterEntries = proDmRosterEntries.filter((entry) => entry.isListed);
  const proDms = await prisma.user.findMany({
    where: {
      id: {
        in: listedRosterEntries.map((entry) => entry.userId),
      },
      roles: {
        some: {
          role: "DM",
        },
      },
    },
    include: {
      gamesCreated: {
        select: {
          _count: {
            select: {
              participants: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const rosterEntryMap = new Map(listedRosterEntries.map((entry) => [entry.userId, entry]));
  const ratingSummaryMap = getProDmRatingSummaryMap(listedRosterEntries, proDmReviews);

  const featuredProDms = proDms
    .map((dm) => {
      const gamesHosted = dm.gamesCreated.length;
      const playersHosted = dm.gamesCreated.reduce(
        (sum, game) => sum + game._count.participants,
        0,
      );
      const rosterEntry = rosterEntryMap.get(dm.id);
      const ratingSummary = ratingSummaryMap.get(dm.id);

      return {
        id: dm.id,
        name: dm.name,
        headline: rosterEntry?.headline,
        specialties: rosterEntry?.specialties,
        rating: ratingSummary?.rating ?? rosterEntry?.rating ?? 5,
        reviewCount: ratingSummary?.reviewCount ?? 0,
        gamesHosted,
        playersHosted,
      };
    })
    .sort((a, b) => b.rating - a.rating || b.gamesHosted - a.gamesHosted || a.name.localeCompare(b.name))
    .slice(0, 3);

  return (
    <main className="stack store-page">
      <section className="card ledger-panel stack store-hero">
        <p className="eyebrow">Storefront</p>
        <h1 style={{ margin: 0 }}>Explore the <RainbowSpellbook /> Store</h1>
        <p className="muted store-hero-copy" style={{ margin: 0, maxWidth: "68ch" }}>
          Find upcoming <GrimoireGatheringsText /> event access, paid league tables,
          professional Dungeon Masters, and official <RainbowSpellbook /> Publishing
          releases in one place.
        </p>
        <div className="inline-actions" style={{ flexWrap: "wrap" }}>
          <Link className="button secondary" href="/grimoire-gathering/cart">
            Open Grimoire cart
          </Link>
          <Link className="button secondary" href="/league/cart">
            Open league cart
          </Link>
          <a className="button" href={publishingStoreUrl} rel="noreferrer" target="_blank">
            Visit SPELLBOOK Publishing
          </a>
        </div>
      </section>

      <section className="list-card stack">
        <div className="section-heading">
          <div className="stack" style={{ gap: "0.35rem" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              Upcoming events
            </p>
            <h2 style={{ margin: 0 }}>
              <GrimoireGatheringsText />
            </h2>
          </div>
          <Link className="button secondary" href="/grimoire-gathering">
            View Grimoire hub
          </Link>
        </div>

        {upcomingEvents.length ? (
          <div className="store-card-grid">
            {upcomingEvents.map((event) => (
              <article key={event.id} className="store-card stack">
                <div className="stack" style={{ gap: "0.45rem" }}>
                  <h3 style={{ margin: 0 }}>{event.subtitle}</h3>
                  <p className="muted" style={{ margin: 0 }}>
                    {event.displayDate}
                  </p>
                </div>
                <p style={{ margin: 0 }}>
                  <strong>Theme:</strong> {event.theme}
                </p>
                <p className="muted" style={{ margin: 0 }}>
                  {event.focus}
                </p>
                <p style={{ margin: 0 }}>
                  <strong>Badge:</strong> {event.ticketPrice}
                </p>
                <div className="inline-actions" style={{ flexWrap: "wrap" }}>
                  <Link className="button secondary" href={`/grimoire-gathering/events/${event.id}`}>
                    Event pack
                  </Link>
                  <Link className="button secondary" href="/grimoire-gathering/cart">
                    Buy tickets
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No upcoming <GrimoireGatheringsText /> events are posted right now.
          </p>
        )}
      </section>

      <section className="list-card stack">
        <div className="store-line-divider" aria-hidden="true" />
        <div className="section-heading">
          <div className="stack" style={{ gap: "0.35rem" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              Paid tickets
            </p>
            <h2 style={{ margin: 0 }}>League Games Selling Tickets</h2>
          </div>
          <Link className="button secondary" href="/league">
            View league hub
          </Link>
        </div>

        {ticketedLeagueGames.length ? (
          <div className="store-card-grid store-card-grid-league">
            {ticketedLeagueGames.map((game) => {
              const signedUpCount = game._count.participants;
              const openSpots = Math.max(game.seatCapacity - signedUpCount, 0);

              return (
                <article key={game.id} className="store-card stack">
                  <div className="stack" style={{ gap: "0.45rem" }}>
                    <h3 style={{ margin: 0 }}>{game.title}</h3>
                    <p className="muted" style={{ margin: 0 }}>
                      {game.adventureCode}
                    </p>
                  </div>
                  <p style={{ margin: 0 }}>
                    <LocalizedEventTime isoString={game.datePlayed.toISOString()} />
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>DM:</strong> {game.dm?.name ?? game.dmName ?? "SPELLBOOK DM"}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Tier:</strong> {formatTier(game.tier)}
                  </p>
                  <p style={{ margin: 0 }}>
                    <strong>Price:</strong> {game.ticketPrice}
                  </p>
                  <p className="muted" style={{ margin: 0 }}>
                    {signedUpCount} registered, {openSpots} spots open
                  </p>
                  <div className="inline-actions" style={{ flexWrap: "wrap" }}>
                    <Link className="button secondary" href={`/league/games/${game.id}`}>
                      View game
                    </Link>
                    <Link
                      className="button secondary"
                      href={`/league/cart?games=${encodeURIComponent(game.id)}`}
                    >
                      Add ticket
                    </Link>
                  </div>
                </article>
              );
            })}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            No paid league games are currently available for ticket purchase.
          </p>
        )}
      </section>

      <section className="list-card stack">
        <img
          alt="Store section divider"
          className="store-section-divider"
          src="/divider4.png"
        />
        <div className="section-heading">
          <div className="stack" style={{ gap: "0.35rem" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              Professional tables
            </p>
            <h2 style={{ margin: 0 }}>Hire a Professional <RainbowSpellbook /> DM</h2>
          </div>
          <Link className="button secondary" href="/hire-a-dm">
            Open roster
          </Link>
        </div>

        {featuredProDms.length ? (
          <div className="store-card-grid store-card-grid-compact">
            {featuredProDms.map((dm) => (
              <article key={dm.id} className="store-card stack">
                <div className="stack" style={{ gap: "0.35rem" }}>
                  <h3 style={{ margin: 0 }}>{dm.name}</h3>
                  {dm.headline ? <p className="muted" style={{ margin: 0 }}>{dm.headline}</p> : null}
                </div>
                <p style={{ margin: 0 }}>
                  <strong>Rating:</strong> {dm.rating.toFixed(1)}/5
                  {dm.reviewCount ? ` from ${dm.reviewCount} review${dm.reviewCount === 1 ? "" : "s"}` : ""}
                </p>
                {dm.specialties ? (
                  <p style={{ margin: 0 }}>
                    <strong>Specialties:</strong> {dm.specialties}
                  </p>
                ) : null}
                <p className="muted" style={{ margin: 0 }}>
                  {dm.gamesHosted} logged game{dm.gamesHosted === 1 ? "" : "s"} and{" "}
                  {dm.playersHosted} hosted player seat{dm.playersHosted === 1 ? "" : "s"}.
                </p>
                <div>
                  <Link className="button secondary" href={`/hire-a-dm/${dm.id}`}>
                    View DM
                  </Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted" style={{ margin: 0 }}>
            The professional DM roster will appear here as new listings go live.
          </p>
        )}
      </section>

      <img
        alt="Store section divider"
        className="store-section-divider"
        src="/divider4.png"
      />

      <section className="grid two store-feature-grid">
        <section className="list-card stack">
          <div className="stack" style={{ gap: "0.35rem" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              Official products
            </p>
            <h2 style={{ margin: 0 }}><RainbowSpellbook /> Publishing</h2>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Looking for books, adventures, and published releases beyond league
            tickets? Visit the official <RainbowSpellbook /> Publishing store.
          </p>
          <p style={{ margin: 0 }}>
            Use the main store to browse external products and publishing updates,
            then come back here to book events, league tickets, and DM services.
          </p>
          <div className="inline-actions" style={{ flexWrap: "wrap" }}>
            <a className="button" href={publishingStoreUrl} rel="noreferrer" target="_blank">
              Visit Publishing Store
            </a>
          </div>
        </section>

        <section className="list-card stack">
          <div className="stack" style={{ gap: "0.35rem" }}>
            <p className="eyebrow" style={{ margin: 0 }}>
              DM's Guild
            </p>
            <h2 style={{ margin: 0 }}>Find <RainbowSpellbook /> on the DM&apos;s Guild</h2>
          </div>
          <p className="muted" style={{ margin: 0 }}>
            Browse <RainbowSpellbook /> titles, adventures, and marketplace releases on
            the DM&apos;s Guild storefront.
          </p>
          <p style={{ margin: 0 }}>
            Visit the collection to discover published content from GM Jace alongside
            official releases and community-supported material.
          </p>
          <div className="inline-actions" style={{ flexWrap: "wrap" }}>
            <a
              className="button"
              href="https://www.dmsguild.com/en/browse?keyword=GM%20Jace"
              rel="noreferrer"
              target="_blank"
            >
              Open DM&apos;s Guild
            </a>
          </div>
        </section>
      </section>
    </main>
  );
}
