import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerGameLogForm } from "@/components/player-game-log-form";
import { requireRole } from "@/lib/auth";
import { getCharacterBuildMagicItemOptions, getLeagueLegalBlessingOptions, getLeagueLegalBoonOptions, getLeagueLegalCharmOptions, getLeagueLegalConsumableOptions, getLeagueLegalMagicItemOptions, getLeagueLegalMinorPropertyOptions } from "@/lib/league-legal-choices";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewPlayerGameLogPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const user = await requireRole("PLAYER");
  const { id } = await params;
  const query = await searchParams;

  const [
    character,
    legalMagicItemOptions,
    legalConsumableOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
    legalMinorPropertyOptions,
  ] = await Promise.all([
    prisma.character.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
      },
    }),
    getLeagueLegalMagicItemOptions(),
    getLeagueLegalConsumableOptions(),
    getLeagueLegalBoonOptions(),
    getLeagueLegalBlessingOptions(),
    getLeagueLegalCharmOptions(),
    getLeagueLegalMinorPropertyOptions(),
  ]);

  if (!character) {
    notFound();
  }

  return (
    <main className="stack">
      <section className="panel stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Character logsheet</p>
            <h1>Log a game for {character.name}</h1>
            <p className="muted">
              Add a player-managed game entry for this character.
            </p>
          </div>
          <Link className="button button-secondary" href={`/player/characters/${character.id}`}>
            Back
          </Link>
        </div>
        {query.error === "invalid" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Please complete the game details.
          </p>
        ) : null}
        <PlayerGameLogForm
          characterId={character.id}
          legalBlessingOptions={legalBlessingOptions}
          legalBoonOptions={legalBoonOptions}
          legalBuildMagicItemOptions={getCharacterBuildMagicItemOptions(legalMagicItemOptions)}
          legalCharmOptions={legalCharmOptions}
          legalCommonMagicItemOptions={legalMagicItemOptions.Common}
          legalConsumableOptions={legalConsumableOptions}
          legalMinorPropertyOptions={legalMinorPropertyOptions}
          submitLabel="Save log entry"
        />
      </section>
    </main>
  );
}
