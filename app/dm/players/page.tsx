// @ts-nocheck
import Link from "next/link";
import { redirect } from "next/navigation";

import { DmPlayerRosterTable } from "@/components/dm-player-roster-table";
import { requireUser } from "@/lib/auth";
import {
  canViewPrivateCharacterRoster,
  isCharacterRosterAdmin,
} from "@/lib/character-visibility";
import { prisma } from "@/lib/prisma";

type PageProps = {
  searchParams?: Promise<{
    q?: string;
  }>;
};

export default async function DmPlayersPage({ searchParams }: PageProps) {
  const currentUser = await requireUser({ allowMissingDiscord: true });
  const isDm = currentUser.roles.includes("DM");
  const isAdminViewer = isCharacterRosterAdmin(currentUser.roles);

  if (!isDm && !isAdminViewer) {
    redirect("/");
  }

  const resolvedSearchParams = searchParams ? await searchParams : undefined;
  const query = resolvedSearchParams?.q?.trim() ?? "";
  const canSeePrivateCharacters = await canViewPrivateCharacterRoster(currentUser);

  const characters = await prisma.character.findMany({
    where: {
      ...(canSeePrivateCharacters ? {} : { isPubliclyViewable: true }),
      user: {
        roles: {
          some: {
            role: "PLAYER",
          },
        },
      },
    },
    include: {
      user: {
        select: {
          name: true,
          discordHandle: true,
        },
      },
      _count: {
        select: {
          participants: true,
        },
      },
    },
    orderBy: [{ user: { name: "asc" } }, { name: "asc" }],
  });

  const rosterRows = characters.map((character) => ({
    id: character.id,
    playerName: character.user.name,
    discordHandle: character.user.discordHandle,
    characterName: character.name,
    class1Name: character.class1Name,
    class1Subclass: character.class1Subclass,
    class1Level: character.class1Level,
    class2Name: character.class2Name,
    class2Subclass: character.class2Subclass,
    class2Level: character.class2Level,
    class3Name: character.class3Name,
    class3Subclass: character.class3Subclass,
    class3Level: character.class3Level,
    games: character._count.participants,
  }));

  return (
    <main className="page-shell">
      <section className="stack">
        <div className="list-card stack">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>PLAYER ROSTER</h2>
            <Link className="button secondary" href={isAdminViewer && !isDm ? "/admin/users" : "/dm"}>
              Back to DM page
            </Link>
          </div>

          <DmPlayerRosterTable initialSearch={query} rows={rosterRows} />
        </div>
      </section>
    </main>
  );
}
