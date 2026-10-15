import type { Prisma } from "@prisma/client";
import Link from "next/link";

import { createMagicItemCardDefinition } from "@/app/admin/magic-item-cards/actions";
import { AdminPageHeader } from "@/components/admin-page-header";
import { SearchIcon } from "@/components/search-icon";
import { requireAdminUser } from "@/lib/admin";
import { listMagicItemCardImages } from "@/lib/magic-item-card-image-upload";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 16;

export default async function AdminMagicItemCardsPage({
  searchParams,
}: {
  searchParams: Promise<{ catalog?: string; page?: string; q?: string }>;
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

  const [total, availableImages] = await Promise.all([
    prisma.magicItemCardDefinition.count({ where }),
    listMagicItemCardImages(),
  ]);
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
  const statusMessages: Record<string, string> = {
    duplicate: "A catalog card with that item name already exists.",
    "image-invalid": "Card images must be JPG, PNG, or WEBP files no larger than 10 MB each.",
    "images-required": "Choose or upload both a front image and a back image.",
    invalid: "Enter a card name and a valid limited-edition total.",
  };
  const statusMessage = params.catalog ? statusMessages[params.catalog] : "";
  const frontImages = availableImages.filter((image) => /(?:-|_)front(?:-[^.]+)?\.[^.]+$/i.test(image.label));
  const backImages = availableImages.filter((image) => /(?:-|_)back(?:-[^.]+)?\.[^.]+$/i.test(image.label));

  return (
    <main className="page-shell stack">
      <AdminPageHeader
        title="Magic item cards"
        description="Review the card catalog, inspect award and chest-code history, and manage cards awarded to characters."
      />

      {statusMessage ? <p style={{ margin: 0 }}>{statusMessage}</p> : null}

      <section className="list-card stack admin-magic-card-create-section">
        <div>
          <h2 style={{ margin: 0 }}>Add card to catalog</h2>
        </div>

        <form action={createMagicItemCardDefinition} className="form-stack">
          <div className="form-grid">
            <label>
              Item name
              <input maxLength={160} name="itemName" required type="text" />
            </label>
            <label>
              Counts as
              <input maxLength={240} name="countsAs" type="text" />
            </label>
            <label>
              Rarity
              <input maxLength={120} name="rarity" type="text" />
            </label>
            <label>
              Minor property
              <input maxLength={240} name="minorProperty" type="text" />
            </label>
            <label>
              Limited-edition total
              <input min={1} name="limitedEditionLimit" step={1} type="number" />
            </label>
          </div>

          <div className="form-grid admin-magic-card-create-images">
            <label>
              Existing front image
              <select name="frontImagePath" defaultValue="">
                <option value="">None selected</option>
                {frontImages.map((image) => (
                  <option key={image.path} value={image.path}>{image.label}</option>
                ))}
              </select>
            </label>
            <label>
              Upload front image
              <input accept="image/jpeg,image/png,image/webp" name="frontImage" type="file" />
            </label>
            <label>
              Existing back image
              <select name="backImagePath" defaultValue="">
                <option value="">None selected</option>
                {backImages.map((image) => (
                  <option key={image.path} value={image.path}>{image.label}</option>
                ))}
              </select>
            </label>
            <label>
              Upload back image
              <input accept="image/jpeg,image/png,image/webp" name="backImage" type="file" />
            </label>
          </div>

          <label>
            Flavor and notes
            <textarea maxLength={4000} name="flavorNotes" rows={5} />
          </label>

          <button className="button" type="submit">Create catalog card</button>
        </form>
      </section>

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
