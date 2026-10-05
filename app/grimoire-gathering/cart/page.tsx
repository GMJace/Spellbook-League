import { auth } from "@/auth";
import { GrimoireCartBuilder } from "@/components/grimoire-cart-builder";
import {
  getCombinedSalesTaxRatePct,
  normalizeTicketSalesRateSettings,
} from "@/lib/checkout-pricing";
import {
  getCuratedGamesForEvent,
  getGrimoireGameAccessForEvent,
  getNextGrimoireEvent,
} from "@/lib/grimoire-server";
import { getPayPalClientId } from "@/lib/paypal";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams: Promise<{
    badges?: string | string[];
    badgeType?: string | string[];
    games?: string | string[];
  }>;
};

function parseSelectedGames(rawValue: string | string[] | undefined) {
  if (!rawValue) {
    return [];
  }

  const values = Array.isArray(rawValue) ? rawValue : [rawValue];

  return values
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter(Boolean);
}

function parseBadgeQuantity(rawValue: string | string[] | undefined) {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;
  const parsed = Number(value);

  if (!Number.isFinite(parsed)) {
    return 0;
  }

  return Math.max(0, Math.min(6, Math.trunc(parsed)));
}

function parseBadgeType(rawValue: string | string[] | undefined) {
  const value = Array.isArray(rawValue) ? rawValue[0] : rawValue;

  return value === "FLYING_CARPET" ? "FLYING_CARPET" : "REGULAR";
}

export default async function GrimoireCartPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const session = await auth();
  const paypalClientId = getPayPalClientId();
  const checkoutUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: {
          id: session.user.id,
        },
        select: {
          storeCreditHeldUsd: true,
          storeCreditUsd: true,
        },
      })
    : null;
  const [nextEvent, ticketSalesSettings] = await Promise.all([
    getNextGrimoireEvent(),
    prisma.ticketSalesSettings.findUnique({
      where: {
        id: "default",
      },
    }),
  ]);
  const salesTaxRatePct = getCombinedSalesTaxRatePct(
    normalizeTicketSalesRateSettings(ticketSalesSettings),
  );

  if (!nextEvent) {
    return (
      <main className="page-shell">
        <section className="stack">
          <div className="empty">No Grimoire event is available for checkout yet.</div>
        </section>
      </main>
    );
  }

  const gameAccess = await getGrimoireGameAccessForEvent(nextEvent, session?.user?.id);
  const nextEventGames = gameAccess.canViewGames
    ? await getCuratedGamesForEvent(nextEvent.id)
    : [];

  return (
    <main className="page-shell">
      <section className="stack">
        {!gameAccess.canViewGames ? (
          <section className="card ledger-panel stack">
            <p className="eyebrow">Game Ticket Access</p>
            <h1 style={{ margin: 0 }}>Tome Key early access</h1>
            <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
              Game tickets open to Tome Key Badge holders on{" "}
              {new Intl.DateTimeFormat("en-US", {
                dateStyle: "medium",
                timeStyle: "short",
                timeZone: "America/Edmonton",
              }).format(new Date(gameAccess.tomeKeyOpensAt))}{" "}
              Mountain, then to the public 48 hours later. You can still buy badges now.
            </p>
          </section>
        ) : null}
        <GrimoireCartBuilder
          availableStoreCreditUsd={
            checkoutUser
              ? Math.max(
                  Math.round((checkoutUser.storeCreditUsd - checkoutUser.storeCreditHeldUsd) * 100) / 100,
                  0,
                )
              : 0
          }
          games={nextEventGames}
          initialBadgeQuantity={parseBadgeQuantity(resolvedSearchParams.badges)}
          initialBadgeType={parseBadgeType(resolvedSearchParams.badgeType)}
          initialSelectedGameSlugs={parseSelectedGames(resolvedSearchParams.games)}
          nextEvent={nextEvent}
          paypalClientId={paypalClientId}
          salesTaxRatePct={salesTaxRatePct}
        />
      </section>
    </main>
  );
}
