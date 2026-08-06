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
  const listedProDmRosterEntries = (await getProDmRosterEntries()).filter(
    (entry) => entry.isListed
  );
  const proDmReviews = await getProDmReviews();

  const dms = await prisma.user.findMany({
    where: {
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
    listedProDmRosterEntries.map((entry) => [entry.userId, entry])
  );
  const ratingSummaryMap = getProDmRatingSummaryMap(listedProDmRosterEntries, proDmReviews);
  type DmRow = (typeof dms)[number];

  const roster = dms
    .map((dm: DmRow): HireDmRosterRow => {
      const games = dm.gamesCreated as Array<{
        _count: {
          participants: number;
        };
      }>;

      return {
        id: dm.id,
        name: dm.name,
        email: dm.email,
        isListed: rosterEntryMap.has(dm.id),
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
                Browse the <RainbowSpellbook /> DM roster, compare ratings and
                table specialties, and open each DM&apos;s public profile before
                booking.
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
