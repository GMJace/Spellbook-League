import Link from "next/link";
import { notFound } from "next/navigation";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatOptionalText(value: string | null | undefined) {
  return value?.trim() ? value : "Not added";
}

function renderTradeItemSummary({
  item,
  itemName,
  minorProperty,
  flavorNotes,
  specialNotes,
  adventureCode,
}: {
  item: string;
  itemName: string;
  minorProperty: string;
  flavorNotes: string;
  specialNotes: string;
  adventureCode: string;
}) {
  return (
    <div className="stack" style={{ gap: "0.35rem" }}>
      <div>
        <p className="muted" style={{ margin: 0 }}>
          Item
        </p>
        <p style={{ margin: "0.2rem 0 0" }}>{itemName || item}</p>
      </div>
      <div>
        <p className="muted" style={{ margin: 0 }}>
          Counts as
        </p>
        <p style={{ margin: "0.2rem 0 0" }}>{item}</p>
      </div>
      <div>
        <p className="muted" style={{ margin: 0 }}>
          Minor Property
        </p>
        <p style={{ margin: "0.2rem 0 0" }}>{formatOptionalText(minorProperty)}</p>
      </div>
      <div>
        <p className="muted" style={{ margin: 0 }}>
          Notes (Flavor)
        </p>
        <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-wrap" }}>
          {formatOptionalText(flavorNotes)}
        </p>
      </div>
      <div>
        <p className="muted" style={{ margin: 0 }}>
          Item received in adventure code
        </p>
        <p style={{ margin: "0.2rem 0 0" }}>{formatOptionalText(adventureCode)}</p>
      </div>
      <div>
        <p className="muted" style={{ margin: 0 }}>
          Special notes
        </p>
        <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-wrap" }}>
          {formatOptionalText(specialNotes)}
        </p>
      </div>
      <div>
        <p className="muted" style={{ margin: 0 }}>
          Downtime days spent
        </p>
        <p style={{ margin: "0.2rem 0 0" }}>5</p>
      </div>
    </div>
  );
}

export default async function CharacterTradeDetailPage({
  params,
}: {
  params: Promise<{ id: string; tradeId: string }>;
}) {
  const user = await requireRole("PLAYER");
  const { id, tradeId } = await params;

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

  const trade = await prisma.characterTrade.findFirst({
    where: {
      id: tradeId,
      OR: [
        { proposerCharacterId: character.id },
        { recipientCharacterId: character.id },
      ],
    },
    include: {
      proposerCharacter: {
        include: {
          user: true,
        },
      },
      recipientCharacter: {
        include: {
          user: true,
        },
      },
    },
  });

  if (!trade) {
    notFound();
  }

  return (
    <main className="stack">
      <section className="panel stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Character logsheet</p>
            <h1 style={{ margin: "0.35rem 0 0" }}>View trade for {character.name}</h1>
            <p className="muted" style={{ margin: "0.5rem 0 0" }}>
              Full trade details for both characters involved.
            </p>
          </div>
          <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
            <Link className="button button-secondary" href={`/player/characters/${character.id}`}>
              Back
            </Link>
            <Link className="button" href={`/player/characters/${character.id}/trades/${trade.id}/edit`}>
              Edit trade
            </Link>
          </div>
        </div>
      </section>

      <section className="panel stack">
        <div className="list-card stack">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>Trade overview</h2>
          </div>
          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <div className="stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Date</span>
              <strong>{formatDate(trade.createdAt)}</strong>
            </div>
            <div className="stack" style={{ gap: "0.35rem" }}>
              <span className="muted">Status</span>
              <strong>{trade.status === "CONFIRMED" ? "Confirmed" : "Pending"}</strong>
            </div>
          </div>
        </div>

        <div
          style={{
            display: "grid",
            gap: "1rem",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
          }}
        >
          <div className="list-card stack">
            <h2 style={{ margin: 0 }}>Player 1</h2>
            <p style={{ margin: 0 }}>
              <strong>{trade.proposerCharacterName}</strong>
            </p>
            <p className="muted" style={{ margin: 0 }}>
              {trade.proposerPlayerName}
            </p>
            {renderTradeItemSummary({
              item: trade.proposerItem,
              itemName: trade.proposerItemName,
              minorProperty: trade.proposerMinorProperty,
              flavorNotes: trade.proposerFlavorNotes,
              specialNotes: trade.proposerSpecialNotes,
              adventureCode: trade.proposerAdventureCode,
            })}
          </div>

          <div className="list-card stack">
            <h2 style={{ margin: 0 }}>Player 2</h2>
            <p style={{ margin: 0 }}>
              <strong>{trade.recipientCharacterName}</strong>
            </p>
            <p className="muted" style={{ margin: 0 }}>
              {trade.recipientPlayerName}
            </p>
            {renderTradeItemSummary({
              item: trade.recipientItem,
              itemName: trade.recipientItemName,
              minorProperty: trade.recipientMinorProperty,
              flavorNotes: trade.recipientFlavorNotes,
              specialNotes: trade.recipientSpecialNotes,
              adventureCode: trade.recipientAdventureCode,
            })}
          </div>
        </div>
      </section>
    </main>
  );
}
