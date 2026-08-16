import { auth } from "@/auth";
import { GrimoireCartBuilder } from "@/components/grimoire-cart-builder";
import {
  getCombinedSalesTaxRatePct,
  normalizeTicketSalesRateSettings,
} from "@/lib/checkout-pricing";
import { getCuratedGamesForEvent, getNextGrimoireEvent } from "@/lib/grimoire-server";
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

  const nextEventGames = await getCuratedGamesForEvent(nextEvent.id);

  return (
    <main className="page-shell">
      <section className="stack">
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
