import { GrimoireCartBuilder } from "@/components/grimoire-cart-builder";
import { getCuratedGamesForEvent, getNextGrimoireEvent } from "@/lib/grimoire-server";
import { getPayPalClientId } from "@/lib/paypal";

type PageProps = {
  searchParams: Promise<{
    badges?: string | string[];
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

export default async function GrimoireCartPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
  const paypalClientId = getPayPalClientId();
  const nextEvent = await getNextGrimoireEvent();

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
          games={nextEventGames}
          initialBadgeQuantity={parseBadgeQuantity(resolvedSearchParams.badges)}
          initialSelectedGameSlugs={parseSelectedGames(resolvedSearchParams.games)}
          nextEvent={nextEvent}
          paypalClientId={paypalClientId}
        />
      </section>
    </main>
  );
}
