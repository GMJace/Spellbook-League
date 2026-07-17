import Link from "next/link";

import {
  HireDmRosterTable,
  type HireDmRosterRow,
} from "@/components/hire-a-dm-roster-table";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { getProDmRatingSummaryMap, getProDmReviews } from "@/lib/pro-dm-reviews";
import { getProDmRosterEntries } from "@/lib/pro-dm-roster";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function HireADmPage() {
  const proDmRosterEntries = (await getProDmRosterEntries()).filter(
    (entry) => entry.isListed
  );
  const proDmReviews = await getProDmReviews();

  const proDms = await prisma.user.findMany({
    where: {
      id: {
        in: proDmRosterEntries.map((entry) => entry.userId),
      },
      roles: {
        some: {
          role: "DM",
        },
      },
    },
    include: {
      gamesCreated: {
        select: {
          _count: {
            select: {
              participants: true,
            },
          },
        },
      },
    },
    orderBy: { name: "asc" },
  });

  const rosterEntryMap = new Map(
    proDmRosterEntries.map((entry) => [entry.userId, entry])
  );
  const ratingSummaryMap = getProDmRatingSummaryMap(proDmRosterEntries, proDmReviews);
  type ProDmRow = (typeof proDms)[number];

  const roster = proDms
    .map((dm: ProDmRow): HireDmRosterRow => {
      const games = dm.gamesCreated as Array<{
        _count: {
          participants: number;
        };
      }>;

      return {
        id: dm.id,
        name: dm.name,
        email: dm.email,
        rating: ratingSummaryMap.get(dm.id)?.rating ?? rosterEntryMap.get(dm.id)?.rating ?? 5,
        specialties: rosterEntryMap.get(dm.id)?.specialties ?? null,
        headline: rosterEntryMap.get(dm.id)?.headline ?? null,
        gamesLogged: games.length,
        playersHosted: games.reduce((sum, game) => sum + game._count.participants, 0),
      };
    })
    .sort(
      (a: HireDmRosterRow, b: HireDmRosterRow) =>
        b.rating - a.rating || a.name.localeCompare(b.name)
    );

  return (
    <main className="page-shell">
      <section className="stack">
        <div className="list-card stack">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Public roster</p>
              <h1 style={{ margin: "0.35rem 0 0" }}>Hire a DM</h1>
              <p className="muted" style={{ margin: "0.5rem 0 0", maxWidth: "62ch" }}>
                Browse the Professional <RainbowSpellbook /> DMs roster,
                compare ratings and table specialties, and open each
                DM&apos;s public profile before booking.
              </p>
            </div>
            <Link className="button secondary" href="/">
              Back
            </Link>
          </div>
        </div>

        <div className="list-card stack">
          <HireDmRosterTable roster={roster} />
        </div>
      </section>
    </main>
  );
}
