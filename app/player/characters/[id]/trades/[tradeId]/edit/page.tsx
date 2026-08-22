import { notFound } from "next/navigation";
import {
  PlayerTradeLogForm,
  type PlayerTradeLogInitialValues,
} from "@/components/player-trade-log-form";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { updateCharacterTrade } from "@/app/player/characters/[id]/trades/actions";

export const dynamic = "force-dynamic";

export default async function EditCharacterTradePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string; tradeId: string }>;
  searchParams: Promise<{ trade?: string }>;
}) {
  const user = await requireRole("PLAYER");
  const { id, tradeId } = await params;
  const query = await searchParams;

  const [character, targetCharacters, trade] = await Promise.all([
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
    prisma.characterTrade.findFirst({
      where: {
        id: tradeId,
        OR: [
          { proposerUserId: user.id },
          { recipientUserId: user.id },
        ],
      },
    }),
  ]);

  if (!character || !trade) {
    notFound();
  }

  const initialValues: PlayerTradeLogInitialValues = {
    proposerPlayerName: trade.proposerPlayerName,
    proposerCharacterName: trade.proposerCharacterName,
    recipientCharacterId: trade.recipientCharacterId ?? undefined,
    recipientPlayerName: trade.recipientPlayerName,
    recipientCharacterName: trade.recipientCharacterName,
    proposerItem: trade.proposerItem,
    proposerItemName: trade.proposerItemName,
    proposerMinorProperty: trade.proposerMinorProperty,
    proposerFlavorNotes: trade.proposerFlavorNotes,
    proposerAdventureCode: trade.proposerAdventureCode,
    proposerSpecialNotes: trade.proposerSpecialNotes,
    recipientItem: trade.recipientItem,
    recipientItemName: trade.recipientItemName,
    recipientMinorProperty: trade.recipientMinorProperty,
    recipientFlavorNotes: trade.recipientFlavorNotes,
    recipientAdventureCode: trade.recipientAdventureCode,
    recipientSpecialNotes: trade.recipientSpecialNotes,
  };

  return (
    <main className="stack">
      <section className="panel stack">
        <div>
          <p className="eyebrow">Character logsheet</p>
          <h1>Edit trade for {character.name}</h1>
          <p className="muted">
            Update the trade details for both characters. Each side still spends 5 DT to conclude
            the trade.
          </p>
        </div>
        {query.trade === "invalid" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>Please complete the trade details.</p>
        ) : null}
        {query.trade === "missing" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            The selected player, character, or trade could not be found.
          </p>
        ) : null}
        <PlayerTradeLogForm
          characterId={character.id}
          characterName={character.name}
          currentPlayerName={user.name}
          formAction={updateCharacterTrade}
          initialValues={initialValues}
          submitLabel="Save trade changes"
          targetCharacters={targetCharacters.map((targetCharacter) => ({
            id: targetCharacter.id,
            name: targetCharacter.name,
            userName: targetCharacter.user.name,
          }))}
          tradeId={trade.id}
        />
      </section>
    </main>
  );
}
