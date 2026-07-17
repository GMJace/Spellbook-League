import Link from "next/link";
import { notFound } from "next/navigation";

import { HireDmEmailForm } from "@/components/hire-dm-email-form";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { getProDmRosterEntry } from "@/lib/pro-dm-roster";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
};

export default async function HireDmContactPage({ params }: PageProps) {
  const { id } = await params;
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
      email: true,
    },
  });

  if (!dm) {
    notFound();
  }

  return (
    <main className="page-shell">
      <section className="stack">
        <div className="list-card stack">
          <div className="section-heading">
            <div>
              <p className="eyebrow">Hire a professional DM</p>
              <h1 style={{ margin: "0.35rem 0 0" }}>Hire {dm.name}</h1>
              <p className="muted" style={{ margin: "0.5rem 0 0", maxWidth: "62ch" }}>
                Fill out the table contact details below and we&apos;ll open an email draft to
                both <RainbowSpellbook /> and {dm.name}.
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

        <HireDmEmailForm dmEmail={dm.email} dmName={dm.name} />
      </section>
    </main>
  );
}
