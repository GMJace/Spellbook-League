import { notFound } from "next/navigation";
import { PlayerGameLogForm } from "@/components/player-game-log-form";
import { requireRole } from "@/lib/auth";
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

  const character = await prisma.character.findFirst({
    where: {
      id,
      userId: user.id,
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!character) {
    notFound();
  }

  return (
    <main className="stack">
      <section className="panel ledger-panel stack">
        <div>
          <p className="eyebrow">Character logsheet</p>
          <h1>Log a game for {character.name}</h1>
          <p className="muted">
            Add a player-managed game entry for this character.
          </p>
        </div>
      </section>

      <section className="card ledger-panel stack">
        {query.error === "invalid" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Please complete the game details.
          </p>
        ) : null}
        <PlayerGameLogForm
          characterId={character.id}
          submitLabel="Save log entry"
        />
      </section>
    </main>
  );
}
