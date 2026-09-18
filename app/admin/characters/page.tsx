import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin-page-header";
import { requireAdminUser } from "@/lib/admin";
import { isDndBeyondLink } from "@/lib/dnd-beyond-character-import";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 50;

export default async function AdminCharactersPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; page?: string }>;
}) {
  await requireAdminUser();
  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 100);
  const requestedPage = Number(params.page ?? "1");
  const page = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, 10000)
    : 1;
  const where: Prisma.CharacterWhereInput = query
    ? {
        OR: [
          { name: { contains: query } },
          { user: { is: { name: { contains: query } } } },
          { user: { is: { email: { contains: query } } } },
        ],
      }
    : {};
  const [total, characters] = await Promise.all([
    prisma.character.count({ where }),
    prisma.character.findMany({
      where,
      include: { user: { select: { name: true, email: true } } },
      orderBy: [{ user: { name: "asc" } }, { name: "asc" }],
      skip: (page - 1) * PAGE_SIZE,
      take: PAGE_SIZE,
    }),
  ]);
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    next.set("page", String(nextPage));
    return `/admin/characters?${next.toString()}`;
  };

  return (
    <main className="page-shell stack">
      <AdminPageHeader
        title="Character roster"
        description="Find player characters, edit their logsheets, and maintain D&D Beyond character sheet links."
      />
      <section className="list-card stack">
        <form action="/admin/characters" method="get" className="inline-actions" style={{ flexWrap: "wrap" }}>
          <label style={{ flex: "1 1 18rem" }}>
            Search characters or players
            <input name="q" type="search" defaultValue={query} placeholder="Character, player, or email" />
          </label>
          <button type="submit">Search</button>
        </form>
        <p className="muted" style={{ margin: 0 }}>
          {total} character{total === 1 ? "" : "s"} found
        </p>
        {characters.length ? (
          <div className="stack">
            {characters.map((character) => (
              <article className="list-card" key={character.id}>
                <div className="section-heading" style={{ gap: "1rem" }}>
                  <div>
                    <h2 style={{ margin: 0 }}>{character.name}</h2>
                    <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                      {character.user.name} · {character.user.email}
                    </p>
                    <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                      D&amp;D Beyond: {character.dndBeyondError
                        ? `Sync needs attention: ${character.dndBeyondError}`
                        : isDndBeyondLink(character.characterSheetLink)
                          ? character.dndBeyondSyncLink === character.characterSheetLink && character.dndBeyondSyncedAt
                            ? `Last synced ${character.dndBeyondSyncedAt.toLocaleString("en-US")}`
                            : "Awaiting first sync"
                          : "No D&D Beyond link"}
                    </p>
                  </div>
                  <div className="inline-actions" style={{ flexWrap: "wrap" }}>
                    <Link className="button secondary" href={`/player/characters/${character.id}`}>View logsheet</Link>
                    <Link className="button" href={`/admin/characters/${character.id}/edit`}>Edit logsheet and link</Link>
                  </div>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">No matching characters.</p>
        )}
        {pages > 1 ? (
          <nav className="inline-actions" aria-label="Character roster pages">
            {page > 1 ? <Link className="button secondary" href={pageHref(page - 1)}>Previous</Link> : null}
            <span>Page {page} of {pages}</span>
            {page < pages ? <Link className="button secondary" href={pageHref(page + 1)}>Next</Link> : null}
          </nav>
        ) : null}
      </section>
    </main>
  );
}
