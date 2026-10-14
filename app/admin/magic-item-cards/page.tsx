import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { AdminPageHeader } from "@/components/admin-page-header";
import { SearchIcon } from "@/components/search-icon";
import { requireAdminUser } from "@/lib/admin";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 16;

export default async function AdminMagicItemCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; q?: string }>;
}) {
  await requireAdminUser();
  const params = await searchParams;
  const query = (params.q ?? "").trim().slice(0, 100);
  const requestedPage = Number(params.page ?? "1");
  const validRequestedPage = Number.isSafeInteger(requestedPage) && requestedPage > 0
    ? Math.min(requestedPage, 10000)
    : 1;
  const where: Prisma.MagicItemCardDefinitionWhereInput = query
    ? {
        OR: [
          { itemName: { contains: query } },
          { countsAs: { contains: query } },
          { rarity: { contains: query } },
          { minorProperty: { contains: query } },
          { flavorNotes: { contains: query } },
        ],
      }
    : {};

  const total = await prisma.magicItemCardDefinition.count({ where });
  const pages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const page = Math.min(validRequestedPage, pages);

  const definitions = await prisma.magicItemCardDefinition.findMany({
    where,
    include: {
      _count: {
        select: {
          awards: true,
        },
      },
    },
    orderBy: [{ itemName: "asc" }],
    skip: (page - 1) * PAGE_SIZE,
    take: PAGE_SIZE,
  });
  const pageHref = (nextPage: number) => {
    const next = new URLSearchParams();
    if (query) next.set("q", query);
    next.set("page", String(nextPage));
    return `/admin/magic-item-cards?${next.toString()}`;
  };

  return (
    <main className="page-shell stack">
      <AdminPageHeader
        title="Magic item cards"
        description="Review the card catalog, inspect award and chest-code history, and manage cards awarded to characters."
      />

      <section className="stack admin-magic-card-catalog-section">
        <div className="section-heading">
          <div>
            <h2 style={{ margin: 0 }}>Card catalog</h2>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              {total} card{total === 1 ? "" : "s"} {query ? "found" : "in the catalog"}
            </p>
          </div>
        </div>

        <form action="/admin/magic-item-cards" method="get" className="stack" style={{ gap: "0.45rem" }}>
          <span>Search card catalog</span>
          <div className="search-row">
            <input
              defaultValue={query}
              name="q"
              placeholder="Card name, rarity, property, or details"
              type="search"
            />
            <button
              aria-label="Search card catalog"
              className="button secondary search-icon-button"
              title="Search card catalog"
              type="submit"
            >
              <SearchIcon />
            </button>
          </div>
        </form>

        {definitions.length ? (
          <>
            <div className="admin-magic-card-catalog-grid">
              {definitions.map((definition) => (
                <article className="admin-magic-card-catalog-item" key={definition.id}>
                  <img
                    alt={`${definition.itemName} card front`}
                    className="admin-magic-card-catalog-image"
                    src={definition.frontImagePath}
                  />
                  <div className="stack" style={{ gap: "0.55rem" }}>
                    <h3 style={{ margin: 0 }}>{definition.itemName}</h3>
                    <p className="muted" style={{ margin: 0 }}>
                      {definition.rarity || "Rarity not added"}
                    </p>
                    <p style={{ margin: 0 }}>
                      <strong>{definition.awardedCount}</strong> given out
                      {definition.limitedEditionLimit != null
                        ? ` of ${definition.limitedEditionLimit}`
                        : ""}
                      {definition._count.awards !== definition.awardedCount
                        ? ` · ${definition._count.awards} currently awarded`
                        : ""}
                    </p>
                    <Link
                      className="button secondary"
                      href={`/admin/magic-item-cards/${definition.id}`}
                    >
                      Open card
                    </Link>
                  </div>
                </article>
              ))}
            </div>

            {pages > 1 ? (
              <nav className="admin-magic-card-catalog-pagination" aria-label="Card catalog pages">
                <Link
                  aria-disabled={page <= 1}
                  aria-label="Previous 16 cards"
                  className={`button secondary admin-magic-card-page-button ${page <= 1 ? "disabled" : ""}`}
                  href={pageHref(Math.max(1, page - 1))}
                  title="Previous 16 cards"
                >
                  &larr;
                </Link>
                <span>Page {page} of {pages}</span>
                <Link
                  aria-disabled={page >= pages}
                  aria-label="Next 16 cards"
                  className={`button secondary admin-magic-card-page-button ${page >= pages ? "disabled" : ""}`}
                  href={pageHref(Math.min(pages, page + 1))}
                  title="Next 16 cards"
                >
                  &rarr;
                </Link>
              </nav>
            ) : null}
          </>
        ) : (
          <p className="muted">
            {query ? "No magic item cards match that search." : "No magic item cards are in the catalog yet."}
          </p>
        )}
      </section>
    </main>
  );
}
