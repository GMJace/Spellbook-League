import Link from "next/link";
import {
  HomepageDmActivityCard,
  HomepagePlayerActivityCard,
} from "@/components/homepage-activity-board";
import { GrimoireGatheringsText } from "@/components/grimoire-gathering-text";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { SpellbookMonthlyForm } from "@/components/spellbook-monthly-form";
import { TableActionMenu } from "@/components/table-action-menu";
import { getHomepageData } from "@/lib/data";
import { formatDateTime, formatTier, isPaidTicketPrice } from "@/lib/utils";

export default async function HomePage() {
  const discordIframeProps = {
    allowtransparency: "true",
  } as { allowtransparency: string };
  const { playerRoster, dmRoster, openLeagueGames } = await getHomepageData();
  const magicHeadline = [
    ["W", "#FF0000"],
    ["H", "#D100D8"],
    ["E", "#8F34E8"],
    ["R", "#8B2BE2"],
    ["E", "#9700E8"],
    [" ", ""],
    ["T", "#5616FF"],
    ["H", "#003BFF"],
    ["E", "#005CFF"],
    [" ", ""],
    ["M", "#00A6E8"],
    ["A", "#00E5E5"],
    ["G", "#00D7C7"],
    ["I", "#00E8B8"],
    ["C", "#00D82F"],
    [" ", ""],
    ["I", "#00D814"],
    ["S", "#A8E000"],
    [" ", ""],
    ["W", "#F3F000"],
    ["R", "#D7B52C"],
    ["I", "#E1AF22"],
    ["T", "#DD9B00"],
    ["T", "#E29B00"],
    ["E", "#C3492E"],
    ["N", "#F00000"],
  ] as const;

  return (
    <main className="stack">
      <section className="homepage-magic-heading" aria-label="WHERE THE MAGIC IS WRITTEN">
        <h1>
          {magicHeadline.map(([letter, color], index) =>
            letter === " " ? (
              <span key={`space-${index}`} className="homepage-magic-heading-space">
                {" "}
              </span>
            ) : (
              <span key={`${letter}-${index}`} style={{ color }}>
                {letter}
              </span>
            )
          )}
        </h1>
      </section>

      <section className="homepage-banner">
        <div className="homepage-banner-art">
          <img
            alt="SPELLBOOK homepage banner"
            className="homepage-banner-image"
            src="/wizard.svg"
          />
        </div>
        <p
          style={{
            margin: "1rem auto 0",
            maxWidth: "52rem",
            textAlign: "center",
            fontSize: "32pt",
            lineHeight: 1.7,
          }}
        >
          Adventure from the comfort of your own home with a welcoming online
          community and top-tier Dungeon Masters running official{" "}
          <strong>
            <RainbowSpellbook />
          </strong>{" "}
          Adventurers&apos; League games on Roll20.
        </p>
        <img
          alt="Rainbow jewel border"
          className="homepage-banner-divider"
          src="/jewel-border-rainbow-sb.png"
        />
      </section>

      <section className="card ledger-panel stack homepage-encounters">
        <div className="stack" style={{ gap: "0.6rem" }}>
          <h2 style={{ margin: 0 }}>Organized Play</h2>
        </div>

        <div className="homepage-encounters-grid">
          <Link
            className="handbook-link-card homepage-encounter-link homepage-spellbook-link"
            href="/league"
          >
            <img
              alt="SPELLBOOK icon"
              className="homepage-spellbook-icon"
              src="/SB_Logo.png"
            />
            <strong>
              <RainbowSpellbook /> League
            </strong>
          </Link>

          <Link
            href="/grimoire-gathering"
            className="handbook-link-card homepage-encounter-link homepage-ggcon-link"
          >
            <img
              alt="GGCON icon"
              className="homepage-ggcon-icon"
              src="/grimoire-gathering-logo.jpg"
            />
            <strong>
              <GrimoireGatheringsText />
            </strong>
          </Link>

          <Link
            className="handbook-link-card homepage-encounter-link homepage-character-log-link"
            href="/hire-a-dm"
          >
            <img
              alt="Hire a DM icon"
              className="homepage-character-log-icon"
              src="/Spellbook-icon.png"
            />
            <strong>HIRE A DM</strong>
          </Link>
        </div>
      </section>

      <section className="card ledger-panel stack homepage-handbooks">
        <div className="inline-actions" style={{ justifyContent: "space-between" }}>
          <div className="stack" style={{ gap: "0.25rem" }}>
            <h2 style={{ margin: 0 }}>Adventurers&apos; League Guides</h2>
            <p className="muted" style={{ margin: 0, fontSize: "0.95rem" }}>
              Downloadable PDFs
            </p>
          </div>
        </div>
        <div className="handbook-link-grid">
          <a
            className="handbook-link-card"
            href="/handbooks/adventurers-league-players-guide-v2026.4.pdf"
            download
            rel="noreferrer"
            target="_blank"
          >
            <img
              alt="Adventurers League logo"
              className="handbook-link-logo"
              src="/al-logo-white.png"
            />
            <strong>Player&apos;s Guide</strong>
          </a>
          <a
            className="handbook-link-card"
            href="/handbooks/adventurers-league-dm-guide-v2026.2.pdf"
            download
            rel="noreferrer"
            target="_blank"
          >
            <img
              alt="Adventurers League logo"
              className="handbook-link-logo"
              src="/al-logo-white.png"
            />
            <strong>DM&apos;s Guide</strong>
          </a>
          <a
            className="handbook-link-card"
            href="/handbooks/adventurers-league-dm-service-awards-2025v2.2.pdf"
            download
            rel="noreferrer"
            target="_blank"
          >
            <img
              alt="Adventurers League logo"
              className="handbook-link-logo"
              src="/al-logo-white.png"
            />
            <strong>DM Service Awards</strong>
          </a>
        </div>
        <div className="handbook-link-grid">
          <a
            className="handbook-link-card"
            href="/handbooks/adventurers-league-adaptation-guide-v2026.2.pdf"
            download
            rel="noreferrer"
            target="_blank"
          >
            <img
              alt="Adventurers League logo"
              className="handbook-link-logo"
              src="/al-logo-white.png"
            />
            <strong>Adaptation Guide</strong>
          </a>
          <a
            className="handbook-link-card"
            href="/handbooks/adventurers-league-organizers-guide-v12.pdf"
            download
            rel="noreferrer"
            target="_blank"
          >
            <img
              alt="Adventurers League logo"
              className="handbook-link-logo"
              src="/al-logo-white.png"
            />
            <strong>Organizer&apos;s Guide</strong>
          </a>
          <a
            className="handbook-link-card"
            href="/handbooks/dungeoncraft-cc-v1.9c.pdf"
            download
            rel="noreferrer"
            target="_blank"
          >
            <img
              alt="Adventurers League logo"
              className="handbook-link-logo"
              src="/al-logo-white.png"
            />
            <strong>Dungeoncraft</strong>
          </a>
        </div>
      </section>

      <section className="card ledger-panel stack homepage-open-games-section">
        <img
          alt="Open league games divider"
          className="homepage-roster-divider"
          src="/divider4.png"
        />

        <div className="inline-actions" style={{ justifyContent: "space-between" }}>
          <h2 style={{ margin: 0 }}>Current open league games</h2>
        </div>

        <div className="list-card stack">
          <div className="table-wrap ledger-table activity-table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Date &amp; time</th>
                  <th>Game</th>
                  <th>DM</th>
                  <th>Tier</th>
                  <th>Price</th>
                  <th>Players</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {openLeagueGames.length ? (
                  openLeagueGames.map((game) => (
                    (() => {
                      const signedUpCount = game._count.participants;

                      return (
                        <tr key={game.id}>
                          <td>{formatDateTime(game.datePlayed)}</td>
                          <td>
                            <div className="stack" style={{ gap: "0.2rem" }}>
                              <strong>{game.title}</strong>
                              <span className="muted">{game.adventureCode}</span>
                            </div>
                          </td>
                          <td>{game.dm?.name ?? game.dmName ?? "SPELLBOOK DM"}</td>
                          <td>{formatTier(game.tier)}</td>
                          <td>{game.ticketPrice}</td>
                          <td>{signedUpCount}/{game.seatCapacity}</td>
                          <td>
                            <TableActionMenu>
                              <Link
                                className="button button-secondary button-small"
                                href={`/league/games/${game.id}`}
                              >
                                View game
                              </Link>
                              {game.dm?.id ? (
                                <Link
                                  className="button button-secondary button-small"
                                  href={`/dm/${game.dm.id}`}
                                >
                                  View DM
                                </Link>
                              ) : null}
                              {isPaidTicketPrice(game.ticketPrice) ? (
                                <Link
                                  className="button button-small"
                                  href={`/league/cart?games=${encodeURIComponent(game.id)}`}
                                >
                                  Add to cart
                                </Link>
                              ) : null}
                            </TableActionMenu>
                          </td>
                        </tr>
                      );
                    })()
                  ))
                ) : (
                  <tr>
                    <td className="muted" colSpan={7}>
                      No open league games are scheduled right now.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>

          <img
            alt="Open league games divider"
            className="homepage-roster-divider"
            src="/divider4.png"
          />
        </div>
      </section>

      <HomepagePlayerActivityCard playerRoster={playerRoster} />

      <section className="homepage-community-row">
        <HomepageDmActivityCard dmRoster={dmRoster} />

        <section className="card ledger-panel stack homepage-discord">
          <a
            href="https://discord.gg/wxnpXZchWx"
            target="_blank"
            rel="noreferrer"
            className="discord-link-card button"
          >
            Join the <RainbowSpellbook /> Discord
          </a>
          <div className="homepage-discord-logo-wrap">
            <img
              alt="SPELLBOOK Discord logo"
              className="homepage-discord-logo"
              src="/SB_Discord.png"
            />
          </div>
          <div className="discord-widget-wrap">
            <iframe
              src="https://discord.com/widget?id=744348925414080592&theme=dark"
              width="300"
              height="500"
              frameBorder="0"
              sandbox="allow-popups allow-popups-to-escape-sandbox allow-same-origin allow-scripts"
              title="Discord server widget"
              {...discordIframeProps}
            />
          </div>
        </section>
      </section>

      <section className="card ledger-panel stack homepage-tv-section">
        <h2 className="homepage-tv-heading">
          <RainbowSpellbook /> TV
        </h2>

        <div className="homepage-tv-grid">
          <a
            className="handbook-link-card homepage-tv-card homepage-tv-card-youtube"
            href="https://www.youtube.com/@spellbookrpg"
            rel="noreferrer"
            target="_blank"
          >
            <svg
              aria-hidden="true"
              className="homepage-tv-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M21.6 7.2a3 3 0 0 0-2.1-2.1C17.6 4.5 12 4.5 12 4.5s-5.6 0-7.5.6A3 3 0 0 0 2.4 7.2 31.8 31.8 0 0 0 1.9 12c0 1.6.2 3.2.5 4.8a3 3 0 0 0 2.1 2.1c1.9.5 7.5.6 7.5.6s5.6 0 7.5-.6a3 3 0 0 0 2.1-2.1c.4-1.6.5-3.2.5-4.8s-.1-3.2-.5-4.8Z" />
              <path d="m10 15.5 5.2-3.5L10 8.5v7Z" fill="#000000" />
            </svg>
            <strong>YouTube</strong>
          </a>

          <a
            className="handbook-link-card homepage-tv-card homepage-tv-card-twitch"
            href="https://www.twitch.tv/spellbookrpg"
            rel="noreferrer"
            target="_blank"
          >
            <svg
              aria-hidden="true"
              className="homepage-tv-icon"
              viewBox="0 0 24 24"
              fill="currentColor"
            >
              <path d="M5 2 3 7v13h5v4l4-4h4l5-5V2H5Zm14 12-3 3h-4l-3 3v-3H6V4h13v10ZM10 7H8v6h2V7Zm5 0h-2v6h2V7Z" />
            </svg>
            <strong>Twitch</strong>
          </a>
        </div>

        <img
          alt="Homepage divider"
          className="homepage-roster-divider"
          src="/divider4.png"
        />
      </section>

      <section className="card ledger-panel stack homepage-monthly-section">
        <h2 style={{ margin: 0, textAlign: "center" }}>
          <RainbowSpellbook /> Monthly
        </h2>
        <div className="stack" style={{ gap: "0.5rem", textAlign: "center" }}>
          <p style={{ margin: 0 }}>KNOWLEDGE IS POWER</p>
          <p style={{ margin: 0 }}>
            Stay Informed - Get the <RainbowSpellbook /> Monthly
          </p>
        </div>

        <SpellbookMonthlyForm />
      </section>
    </main>
  );
}
