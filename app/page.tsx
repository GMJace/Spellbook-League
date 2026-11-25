import Link from "next/link";
import type { ReactNode } from "react";
import {
  HomepageDmActivityCard,
  HomepagePlayerActivityCard,
} from "@/components/homepage-activity-board";
import { GrimoireGatheringsText } from "@/components/grimoire-gathering-text";
import { HomepageQuestboard } from "@/components/homepage-questboard";
import { HomepageSpeechBubble } from "@/components/homepage-speech-bubble";
import { HomepageSigilArt } from "@/components/homepage-sigil-art";
import { HomepageWizardArt } from "@/components/homepage-wizard-art";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { SpellbookMonthlyForm } from "@/components/spellbook-monthly-form";
import { getHomepageData } from "@/lib/data";
import { QuestsGuidesSection } from "@/components/quests-guides-section";
import { LoreGuidesSection } from "@/components/lore-guides-section";
import { questboardExamples } from "@/lib/questboard-preview";

function HomepageCommunityCallout({
  id,
  title,
  children,
  action,
}: {
  id?: string;
  title: string;
  children: ReactNode;
  action: { href: string; label: string };
}) {
  return (
    <section id={id} className="stack">
      <h2 className="homepage-mercane-heading">{title}</h2>
      <p className="muted homepage-mercane-description">{children}</p>

      <div className="homepage-mercane-actions">
        <Link className="button button-secondary" href={action.href}>
          {action.label}
        </Link>
      </div>
    </section>
  );
}

export default async function HomePage({ searchParams }: {
  searchParams: Promise<{ questboard?: string }>;
}) {
  const discordIframeProps = {
    allowtransparency: "true",
  } as { allowtransparency: string };
  const { playerRoster, dmRoster, openLeagueGames } = await getHomepageData();
  const previewQuestboard =
    process.env.NODE_ENV === "development" && (await searchParams).questboard === "preview";
  const openQuests = previewQuestboard
    ? questboardExamples.map((quest) => ({ ...quest, href: `/league/games/preview/${quest.slug}` }))
    : openLeagueGames.map((game) => ({
        href: `/league/games/${game.id}`,
        title: game.title,
        gm: game.dm?.name ?? game.dmName ?? "SPELLBOOK DM",
        dateTime: game.datePlayed.toISOString(),
      }));
  const magicHeadline = [
    ["W", "#FF0000"],
    ["H", "#FF8C00"],
    ["E", "#FFEE00"],
    ["R", "#4DE94C"],
    ["E", "#3783FF"],
    [" ", ""],
    ["T", "#4815AA"],
    ["H", "#FF0000"],
    ["E", "#FF8C00"],
    [" ", ""],
    ["M", "#FFEE00"],
    ["A", "#4DE94C"],
    ["G", "#3783FF"],
    ["I", "#4815AA"],
    ["C", "#FF0000"],
    [" ", ""],
    ["I", "#FF8C00"],
    ["S", "#FFEE00"],
    [" ", ""],
    ["W", "#4DE94C"],
    ["R", "#3783FF"],
    ["I", "#4815AA"],
    ["T", "#FF0000"],
    ["T", "#FF8C00"],
    ["E", "#FFEE00"],
    ["N", "#4DE94C"],
  ] as const;

  return (
    <main className="stack">
      <section className="homepage-banner">
        <HomepageWizardArt />
        <img
          alt="Rainbow jewel border"
          className="homepage-banner-divider"
          src="/jewel-border-rainbow-sb.png"
        />
      </section>

      <section className="homepage-magic-heading" aria-label="WHERE THE MAGIC IS WRITTEN">
        <img
          className="homepage-magic-logo"
          src="/Spellbook-Logo.png"
          alt="SPELLBOOK"
          width="800"
          height="200"
        />
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

      <div className="homepage-character-intro">
        <HomepageSpeechBubble>
          Adventure from the comfort of your own home with a welcoming online community
          and top-tier Dungeon Masters running{" "}
          <strong><RainbowSpellbook /></strong> QUESTS.
        </HomepageSpeechBubble>
        <img
          alt=""
          className="homepage-warden-archon"
          height="703"
          src="/warden%20archon.png"
          width="1198"
        />
      </div>

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
              <RainbowSpellbook /> QUESTS
              <small className="homepage-encounter-subtitle">(1SHOTS &amp; CAMPAIGNS)</small>
            </strong>
          </Link>

          <Link
            href="/grimoire-gathering"
            className="handbook-link-card homepage-encounter-link homepage-ggcon-link"
          >
            <img
              alt="Grimoire Gathering banner"
              className="homepage-ggcon-icon"
              src="/grimoire-gathering-banner.png"
            />
            <strong>
              <GrimoireGatheringsText />
              <small className="homepage-encounter-subtitle">(ONLINE CONVENTIONS)</small>
            </strong>
          </Link>

          <Link
            className="handbook-link-card homepage-encounter-link homepage-character-log-link"
            href="/hire-a-dm"
          >
            <img
              alt="Hire a SPELLBOOK DM icon"
              className="homepage-character-log-icon"
              src="/grim-book.png?v=2"
            />
            <strong>
              Hire a <RainbowSpellbook /> DM
              <small className="homepage-encounter-subtitle">(CUSTOM ADVENTURES)</small>
            </strong>
          </Link>
        </div>
      </section>

      <div className="homepage-character-intro homepage-character-intro-left">
        <img
          alt=""
          className="homepage-character-art"
          height="703"
          src="/dwarf%20wizard.png"
          width="1198"
        />
        <HomepageSpeechBubble>
          easy to use guides to turn any table into a <RainbowSpellbook /> QUESTS table.
        </HomepageSpeechBubble>
      </div>

      <QuestsGuidesSection />

      <div className="homepage-character-intro">
        <HomepageSpeechBubble>
          Explore the lore of the <strong>ORDO</strong>, discover{" "}
          <strong>Sigil, the City of Doors</strong>, and learn how to adapt both to any
          campaign setting in the multiverse.
        </HomepageSpeechBubble>
        <img
          alt="Arcanaloth"
          className="homepage-character-art homepage-arcanaloth"
          height="703"
          src="/arcanaloth.png"
          width="1198"
        />
      </div>

      <LoreGuidesSection />

      <img alt="" className="homepage-community-divider" src="/divider4.png" />

      <HomepageQuestboard quests={openQuests} />

      <div className="homepage-character-intro homepage-character-intro-left">
        <img
          alt=""
          className="homepage-character-art"
          height="703"
          src="/dragon%20knight.png"
          width="1198"
        />
        <HomepageSpeechBubble>
          Create your Agent of the ORDO; the multiversal guild that protects the balance in all its forms.
        </HomepageSpeechBubble>
      </div>

      <HomepagePlayerActivityCard playerRoster={playerRoster} />

      <HomepageSigilArt />

      <div className="card ledger-panel stack homepage-mercane-callout">
        <h2 style={{ margin: 0 }}>DOWNTIME ACTIVITIES</h2>
        <div className="homepage-mercane-grid">
          <div className="stack">
            <HomepageCommunityCallout
              title="Mercane Marketplace"
              action={{ href: "/mercane-mercantile", label: "Browse Mercane Marketplace" }}
            >
              <strong>Mercane Marketplace</strong> is the QUESTS marketplace for trading magic item cards.
              Browse other players’ listings, offer your own cards for trade, and find the items that bring
              your character’s build together.
            </HomepageCommunityCallout>

            <hr className="homepage-mercane-divider" />

            <HomepageCommunityCallout
              id="the-keep"
              title="The Keep"
              action={{ href: "/quests/bastions", label: "Browse The Keep's Bastions" }}
            >
              Between QUESTS, return to the Keep in the City of Doors to research leads, commission gear,
              or train for your next assignment. As your ORDO agent advances through the four tiers,
              more Bastion facilities open to you. Log your Downtime spending in the character tracker.
            </HomepageCommunityCallout>
          </div>

          <div className="homepage-mercane-art">
            <img
              alt="Mercane Marketplace artwork"
              className="homepage-mercane-image"
              src="/mercane-mercantile.png"
            />
          </div>
        </div>

        <img alt="" className="homepage-roster-divider" src="/divider4.png" />
      </div>

      <img alt="" className="homepage-community-divider" src="/divider4.png" />

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

      <img
        alt="Wizard TV"
        className="homepage-wizard-tv"
        height="703"
        src="/wizard%20tv.png"
        width="1198"
      />

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
