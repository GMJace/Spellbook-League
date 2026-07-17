import { GrimoireGatheringText } from "@/components/grimoire-gathering-text";
import { RegisterForm } from "@/components/register-form";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";

export default function RegisterPage() {
  const allowGoogle = Boolean(
    process.env.AUTH_GOOGLE_ID && process.env.AUTH_GOOGLE_SECRET
  );
  const allowDiscord = Boolean(
    process.env.AUTH_DISCORD_ID && process.env.AUTH_DISCORD_SECRET
  );

  return (
    <main className="grid two">
      <section className="panel stack">
        <div>
          <p className="eyebrow">Create account</p>
          <h1>
            Joining <RainbowSpellbook /> Adventurers League
          </h1>
        </div>
        <div className="stack" style={{ gap: "0.85rem" }}>
          <p className="muted" style={{ margin: 0 }}>
            Creating a <RainbowSpellbook /> account and registering your
            characters is completely free. Once registered, you can join games,
            track your progress, and participate in the current <RainbowSpellbook />{" "}
            season.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            <RainbowSpellbook /> Conventions, such as{" "}
            <GrimoireGatheringText />, will feature ticketed games that run
            monthly during the season. Players may sign up for the season at
            any point, even if they miss the beginning. In addition to
            convention games, <RainbowSpellbook /> also offers many weekly
            one-shots, several of which are completely free to play.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            Participation in every event is not mandatory. However, the more
            games you play and log during the season, the further your
            character progresses through the seasonal track. <RainbowSpellbook />{" "}
            seasons last approximately three-quarters of a year, with seasonal
            awards and prizes distributed at the final convention of the
            season.
          </p>
        </div>
        <div>
          <h2 style={{ margin: 0 }}>
            Becoming a <RainbowSpellbook /> Dungeon Master
          </h2>
        </div>
        <div className="stack" style={{ gap: "0.85rem" }}>
          <p className="muted" style={{ margin: 0 }}>
            Players and community members interested in running games may apply
            to become part of the official <RainbowSpellbook /> DM roster.
          </p>
          <p className="muted" style={{ margin: 0 }}>
            <RainbowSpellbook /> DMs may be invited to run professional
            convention tables, including ticketed games where players purchase
            seats and DMs are paid for their time. Becoming part of the roster
            does not require you to run every event, but active participation,
            reliability, and logged games will help establish your place within
            the season and the broader <RainbowSpellbook /> community.
          </p>
        </div>
      </section>
      <section className="panel">
        <RegisterForm allowDiscord={allowDiscord} allowGoogle={allowGoogle} />
      </section>
    </main>
  );
}
