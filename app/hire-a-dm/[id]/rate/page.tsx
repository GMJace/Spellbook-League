import Link from "next/link";
import { notFound } from "next/navigation";

import { RateDmForm } from "@/components/rate-dm-form";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { requireUser } from "@/lib/auth";
import { getRateDmGameOptions } from "@/lib/pro-dm-rating";
import { getProDmRosterEntry } from "@/lib/pro-dm-roster";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function RateDmPage({ params }: PageProps) {
  const { id } = await params;
  const currentUser = await requireUser({ allowMissingDiscord: true });
  const dmProfile = await getProDmRosterEntry(id);

  if (!dmProfile?.isListed) {
    notFound();
  }

  const dm = await prisma.user.findFirst({
    where: {
      id,
      roles: {
        some: {
          role: "DM",
        },
      },
    },
    select: {
      id: true,
      name: true,
    },
  });

  if (!dm) {
    notFound();
  }

  const eligibleGames = await getRateDmGameOptions(dm.id, currentUser.id);

  return (
    <main className="page-shell">
      <section className="stack">
        <div className="list-card stack">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Rate a professional DM</p>
              <h1 style={{ margin: "0.35rem 0 0" }}>Rate {dm.name}</h1>
              <p className="muted" style={{ margin: "0.5rem 0 0", maxWidth: "62ch" }}>
                Share your game feedback here. Only completed games already logged to your
                account can be rated, and your submission still opens an email draft to
                <RainbowSpellbook />.
              </p>
            </div>

            <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
              <Link className="button button-secondary" href="/hire-a-dm">
                Back to roster
              </Link>
              <Link className="button button-secondary" href={`/hire-a-dm/${dm.id}`}>
                View profile
              </Link>
            </div>
          </div>
        </div>

        <RateDmForm dmName={dm.name} eligibleGames={eligibleGames} userId={dm.id} />
      </section>
    </main>
  );
}
