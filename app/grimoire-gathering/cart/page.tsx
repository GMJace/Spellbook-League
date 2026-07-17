import { GrimoireCartBuilder } from "@/components/grimoire-cart-builder";
import { getCuratedGamesForEvent, getNextGrimoireEvent } from "@/lib/grimoire-server";

type PageProps = {
  searchParams: Promise<{
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

export default async function GrimoireCartPage({ searchParams }: PageProps) {
  const resolvedSearchParams = await searchParams;
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
          hostedButtonId={process.env.GG_PAYPAL_HOSTED_BUTTON_ID?.trim() ?? null}
          initialSelectedGameSlugs={parseSelectedGames(resolvedSearchParams.games)}
          nextEvent={nextEvent}
          paypalLink={process.env.GG_PAYPAL_LINK?.trim() ?? null}
        />
      </section>
    </main>
  );
}
