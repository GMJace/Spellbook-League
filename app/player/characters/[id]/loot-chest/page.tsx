import Link from "next/link";
import { notFound } from "next/navigation";

import { redeemChestCode } from "@/app/player/characters/[id]/loot-chest/actions";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function LootChestPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams?: Promise<{
    code?: string;
    error?: string;
    redeemed?: string;
  }>;
}) {
  const user = await requireRole("PLAYER");
  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

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

  const statusMessage = resolvedSearchParams?.redeemed
    ? "Chest code redeemed."
    : resolvedSearchParams?.error === "already-redeemed"
      ? "That chest code was already redeemed."
      : resolvedSearchParams?.error === "invalid-code"
        ? "That chest code was not found for this character."
        : resolvedSearchParams?.error === "missing-code"
          ? "Enter a chest code to redeem."
          : "";

  return (
    <main className="stack loot-chest-page">
      <section className="panel stack">
        <div className="section-heading">
          <div>
            <p className="eyebrow">Character rewards</p>
            <h1 style={{ margin: "0.35rem 0 0" }}>Loot Chest Page</h1>
            <p className="muted" style={{ margin: "0.5rem 0 0" }}>
              Redeem a chest code for {character.name}.
            </p>
          </div>
          <Link className="button button-secondary" href={`/player/characters/${character.id}`}>
            Back to character
          </Link>
        </div>
      </section>

      <section className="loot-chest-stage" aria-label="Redeem chest code">
        <img
          alt="Ornate fantasy treasure chest"
          className="loot-chest-image"
          src="/loot-chest.png"
        />
        <form action={redeemChestCode.bind(null, character.id)} className="loot-chest-code-form">
          <label htmlFor="lootChestCode">Redeem chest code</label>
          <div className="loot-chest-code-row">
            <input
              autoComplete="off"
              defaultValue={resolvedSearchParams?.code ?? ""}
              id="lootChestCode"
              name="code"
              placeholder="CHEST-XXXX-XXXX-XXXX"
              type="text"
            />
            <button type="submit">Redeem</button>
          </div>
          {statusMessage ? (
            <p className={resolvedSearchParams?.redeemed ? "loot-chest-success" : "loot-chest-error"}>
              {statusMessage}
            </p>
          ) : null}
        </form>
      </section>

      {resolvedSearchParams?.redeemed ? (
        <section className="loot-chest-reward-section">
          <article className="loot-chest-magic-card">
            <div className="loot-chest-magic-card-inner">
              <p className="eyebrow" style={{ margin: 0 }}>Magic item</p>
              <h2 style={{ margin: 0 }}>Reward card</h2>
              <p className="muted" style={{ margin: 0 }}>
                Magic item card reveal will appear here.
              </p>
            </div>
          </article>
        </section>
      ) : null}
    </main>
  );
}
