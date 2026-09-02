import Link from "next/link";
import { notFound } from "next/navigation";
import { PlayerTradeLogForm } from "@/components/player-trade-log-form";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function NewCharacterTradePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ trade?: string }>;
}) {
  const user = await requireRole("PLAYER");
  const { id } = await params;
  const query = await searchParams;

  const [character, targetCharacters] = await Promise.all([
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
    prisma.character.findMany({
      where: {
        id: {
          not: id,
        },
        user: {
          roles: {
            some: {
              role: "PLAYER",
            },
          },
        },
      },
      select: {
        id: true,
        name: true,
        user: {
          select: {
            name: true,
          },
        },
      },
      orderBy: [{ user: { name: "asc" } }, { name: "asc" }],
    }),
  ]);

  if (!character) {
    notFound();
  }

  return (
    <main className="stack character-workflow-page">
      <section className="panel stack">
        <div
          style={{
            alignItems: "flex-start",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.75rem",
            justifyContent: "space-between",
          }}
        >
          <div style={{ flex: "1 1 0", minWidth: 0 }}>
            <p className="eyebrow">Character logsheet</p>
            <h1>Log a trade for {character.name}</h1>
            <p className="muted">
              Record an item trade between this character and another character. Linked characters on
              SPELLBOOK can confirm the trade from their trade log, and off-app trades can be entered
              manually.
            </p>
          </div>
          <Link
            className="button button-secondary"
            href={`/player/characters/${character.id}`}
            style={{ marginLeft: "auto" }}
          >
            Back
          </Link>
        </div>
        {query.trade === "invalid" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>Please complete the trade details.</p>
        ) : null}
        {query.trade === "missing" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            The selected player or character could not be found.
          </p>
        ) : null}
        <PlayerTradeLogForm
          characterId={character.id}
          characterName={character.name}
          currentPlayerName={user.name}
          targetCharacters={targetCharacters.map((targetCharacter) => ({
            id: targetCharacter.id,
            name: targetCharacter.name,
            userName: targetCharacter.user.name,
          }))}
        />
      </section>
    </main>
  );
}
