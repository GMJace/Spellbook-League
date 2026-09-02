import Link from "next/link";
import type { Prisma, TradingPostRarity } from "@prisma/client";

import { auth } from "@/auth";
import {
  createTradingPostProposal,
  createGuestTradingPostListing,
  createGuestTradingPostProposal,
} from "@/app/player/characters/[id]/trading-post/actions";
import { TableActionMenu } from "@/components/table-action-menu";
import {
  formatTradingPostItemName,
  formatTradingPostRarity,
  TRADING_POST_RARITY_OPTIONS,
} from "@/lib/trading-post";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

const PAGE_SIZE = 12;

type PageProps = {
  searchParams?: Promise<{
    page?: string;
    q?: string;
    rarity?: string;
    proposal?: string;
    listing?: string;
  }>;
};

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function formatOptionalText(value: string) {
  return value.trim() || "Not added";
}

function getListingOwnerLabel(listing: {
  character: {
    name: string;
    user: {
      name: string;
    };
  } | null;
  guestPlayerName: string;
  guestCharacterName: string;
}) {
  if (listing.character?.user?.name) {
    return `${listing.character.user.name} · ${listing.character.name}`;
  }

  return `${listing.guestPlayerName} · ${listing.guestCharacterName}`;
}

function buildMercaneHref({
  page,
  rarity,
  searchTerm,
}: {
  page?: number;
  rarity: "ALL" | TradingPostRarity;
  searchTerm: string;
}) {
  const params = new URLSearchParams();

  if (searchTerm) {
    params.set("q", searchTerm);
  }

  if (rarity !== "ALL") {
    params.set("rarity", rarity);
  }

  if (page && page > 1) {
    params.set("page", String(page));
  }

  const query = params.toString();
  return query ? `/mercane-mercantile?${query}` : "/mercane-mercantile";
}

function renderListingDetails(listing: {
  item: string;
  itemName: string;
  minorProperty: string;
  flavorNotes: string;
  adventureCode: string;
  downtimeDaysSpent: number;
  lookingFor: string;
}) {
  return (
    <div className="stack" style={{ gap: "0.45rem" }}>
      <div>
        <p className="muted" style={{ margin: 0 }}>
          Item
        </p>
        <p style={{ margin: "0.2rem 0 0" }}>{formatTradingPostItemName(listing)}</p>
      </div>
      <div>
        <p className="muted" style={{ margin: 0 }}>
          Minor Property
        </p>
        <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-wrap" }}>
          {formatOptionalText(listing.minorProperty)}
        </p>
      </div>
      <div>
        <p className="muted" style={{ margin: 0 }}>
          Notes (Flavor)
        </p>
        <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-wrap" }}>
          {formatOptionalText(listing.flavorNotes)}
        </p>
      </div>
      <div>
        <p className="muted" style={{ margin: 0 }}>
          Item received in adventure code
        </p>
        <p style={{ margin: "0.2rem 0 0" }}>{formatOptionalText(listing.adventureCode)}</p>
      </div>
      <div>
        <p className="muted" style={{ margin: 0 }}>
          Downtime days spent
        </p>
        <p style={{ margin: "0.2rem 0 0" }}>{listing.downtimeDaysSpent}</p>
      </div>
      <div>
        <p className="muted" style={{ margin: 0 }}>
          Looking For
        </p>
        <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-wrap" }}>
          {formatOptionalText(listing.lookingFor)}
        </p>
      </div>
    </div>
  );
}

function GuestProposalFields({ listingId }: { listingId: string }) {
  return (
    <form action={createGuestTradingPostProposal} className="stack" style={{ gap: "0.75rem" }}>
      <input name="listingId" type="hidden" value={listingId} />

      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Guest name</span>
          <input name="guestPlayerName" required type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Guest character name</span>
          <input name="guestCharacterName" required type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Item (Counts as)</span>
          <input name="item" required type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Name</span>
          <input name="itemName" type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Minor Property</span>
          <input name="minorProperty" type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Notes (Flavor)</span>
          <input maxLength={2000} name="flavorNotes" type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Item received in adventure code</span>
          <input name="adventureCode" type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Downtime days spent</span>
          <input defaultValue="0" min="0" name="downtimeDaysSpent" type="number" />
        </label>
      </div>

      <div>
        <button className="button button-secondary button-small" type="submit">
          Send guest trade proposal
        </button>
      </div>
    </form>
  );
}

function PlayerProposalFields({
  characters,
  listingId,
}: {
  characters: Array<{ id: string; name: string }>;
  listingId: string;
}) {
  return (
    <form action={createTradingPostProposal} className="stack" style={{ gap: "0.75rem" }}>
      <input name="listingId" type="hidden" value={listingId} />

      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Offer from character</span>
          <select defaultValue={characters[0]?.id} name="characterId" required>
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name}
              </option>
            ))}
          </select>
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Item (Counts as)</span>
          <input name="item" required type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Name</span>
          <input name="itemName" type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Minor Property</span>
          <input name="minorProperty" type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Notes (Flavor)</span>
          <input maxLength={2000} name="flavorNotes" type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Item received in adventure code</span>
          <input name="adventureCode" type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Downtime days spent</span>
          <input defaultValue="0" min="0" name="downtimeDaysSpent" type="number" />
        </label>
      </div>

      <div>
        <button className="button button-secondary button-small" type="submit">
          Send trade proposal
        </button>
      </div>
    </form>
  );
}

function GuestListingFields() {
  return (
    <form action={createGuestTradingPostListing} className="stack" style={{ gap: "0.75rem" }}>
      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Guest name</span>
          <input name="guestPlayerName" required type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Guest character name</span>
          <input name="guestCharacterName" required type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Rarity</span>
          <select defaultValue="UNCOMMON" name="rarity" required>
            {TRADING_POST_RARITY_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Item (Counts as)</span>
          <input name="item" required type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Name</span>
          <input name="itemName" type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Minor Property</span>
          <input name="minorProperty" type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Notes (Flavor)</span>
          <input maxLength={2000} name="flavorNotes" type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Item received in adventure code</span>
          <input name="adventureCode" type="text" />
        </label>
        <label className="stack" style={{ gap: "0.35rem" }}>
          <span>Downtime days spent</span>
          <input defaultValue="0" min="0" name="downtimeDaysSpent" type="number" />
        </label>
        <label className="stack" style={{ gap: "0.35rem", gridColumn: "1 / -1" }}>
          <span>Looking For</span>
          <textarea name="lookingFor" rows={4} />
        </label>
      </div>

      <div>
        <button className="button button-secondary button-small" type="submit">
          Post guest listing
        </button>
      </div>
    </form>
  );
}

export default async function MercaneMercantilePage({ searchParams }: PageProps) {
  const session = await auth();
  const query = searchParams ? await searchParams : undefined;
  const rawSearchTerm = typeof query?.q === "string" ? query.q : "";
  const searchTerm = rawSearchTerm.trim();
  const rawRarity = typeof query?.rarity === "string" ? query.rarity : "";
  const selectedRarity = TRADING_POST_RARITY_OPTIONS.some((option) => option.value === rawRarity)
    ? (rawRarity as TradingPostRarity)
    : "ALL";
  const parsedPage = Number(query?.page);
  const requestedPage = Number.isFinite(parsedPage) && parsedPage > 0 ? Math.floor(parsedPage) : 1;

  const currentUser = session?.user?.id
    ? await prisma.user.findUnique({
        where: {
          id: session.user.id,
        },
        select: {
          roles: {
            select: {
              role: true,
            },
          },
          characters: {
            where: {
              isPubliclyViewable: true,
            },
            orderBy: {
              name: "asc",
            },
            select: {
              id: true,
              name: true,
            },
          },
        },
      })
    : null;

  const where: Prisma.TradingPostListingWhereInput = {
    status: "ACTIVE",
    AND: [
      {
        OR: [
          {
            character: {
              isPubliclyViewable: true,
            },
          },
          {
            characterId: null,
          },
        ],
      },
      ...(selectedRarity !== "ALL" ? [{ rarity: selectedRarity }] : []),
      ...(searchTerm
        ? [
            {
              OR: [
                { item: { contains: searchTerm } },
                { itemName: { contains: searchTerm } },
                { guestPlayerName: { contains: searchTerm } },
                { guestCharacterName: { contains: searchTerm } },
                { minorProperty: { contains: searchTerm } },
                { flavorNotes: { contains: searchTerm } },
                { adventureCode: { contains: searchTerm } },
                { lookingFor: { contains: searchTerm } },
                {
                  character: {
                    name: {
                      contains: searchTerm,
                    },
                  },
                },
                {
                  character: {
                    user: {
                      name: {
                        contains: searchTerm,
                      },
                    },
                  },
                },
              ],
            },
          ]
        : []),
    ],
  };

  const totalListings = await prisma.tradingPostListing.count({ where });
  const totalPages = Math.max(1, Math.ceil(totalListings / PAGE_SIZE));
  const currentPage = Math.min(requestedPage, totalPages);
  const skip = (currentPage - 1) * PAGE_SIZE;

  const listings = await prisma.tradingPostListing.findMany({
    where,
    include: {
      character: {
        select: {
          id: true,
          name: true,
          user: {
            select: {
              name: true,
            },
          },
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    skip,
    take: PAGE_SIZE,
  });

  const placeholderCount = listings.length ? Math.max(0, PAGE_SIZE - listings.length) : 0;
  const resultStart = totalListings ? skip + 1 : 0;
  const resultEnd = skip + listings.length;
  const canTradeWithCharacter = Boolean(
    currentUser?.roles.some((entry) => entry.role === "PLAYER") && currentUser.characters.length
  );

  return (
    <main className="page-shell">
      <section className="stack">
        {query?.proposal === "guest-sent" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Guest trade proposal sent for review.
          </p>
        ) : null}
        {query?.proposal === "guest-invalid" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Please complete the guest trade details and try again.
          </p>
        ) : null}
        {query?.proposal === "guest-missing" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            That Mercane Mercantile listing is no longer available.
          </p>
        ) : null}
        {query?.proposal === "guest-hosted" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Guest-hosted listings can be browsed publicly, but in-app trade offers currently work
            only on character-owned listings.
          </p>
        ) : null}
        {query?.listing === "guest-created" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Guest Mercane Mercantile listing posted.
          </p>
        ) : null}
        {query?.listing === "guest-invalid" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Please complete the guest listing details and try again.
          </p>
        ) : null}

        <section className="card ledger-panel stack mercane-hero-card">
          <div className="section-heading">
            <div className="stack" style={{ gap: "0.35rem" }}>
              <p className="eyebrow" style={{ margin: 0 }}>
                Public marketplace
              </p>
              <h1 style={{ margin: 0 }}>Mercane Mercantile</h1>
              <p className="muted" style={{ margin: 0 }}>
                Browse what other players have listed, discover rare and useful treasures, and
                make trade offers directly from the live market whether you are signed in or
                browsing as a guest.
              </p>
              {!session?.user?.id ? (
                <p className="muted" style={{ margin: 0 }}>
                  No sign-in is required to browse the market, post your own guest listing, or
                  submit a guest trade proposal on a character-owned listing.
                </p>
              ) : null}
            </div>

            {canTradeWithCharacter ? (
              <TableActionMenu label="Trade magic item" summarySmall={false}>
                {currentUser?.characters.map((character) => (
                  <Link
                    className="button button-secondary button-small"
                    href={`/player/characters/${character.id}/trading-post`}
                    key={character.id}
                  >
                    {character.name}
                  </Link>
                ))}
              </TableActionMenu>
            ) : (
              <TableActionMenu label="Trade magic item" summarySmall={false}>
                <p className="muted" style={{ margin: 0 }}>
                  Post your own guest magic item listing to the public market.
                </p>
                <GuestListingFields />
                {session?.user?.id ? (
                  <Link className="button button-secondary button-small" href="/player/characters/new">
                    Create a player character instead
                  </Link>
                ) : null}
              </TableActionMenu>
            )}
          </div>

          <form action="/mercane-mercantile" className="mercane-filter-grid" method="get">
            <label className="stack" style={{ gap: "0.35rem" }}>
              <span>Keyword search</span>
              <input
                defaultValue={searchTerm}
                name="q"
                placeholder="Search by item, owner, notes, or adventure code"
                type="search"
              />
            </label>
            <label className="stack" style={{ gap: "0.35rem" }}>
              <span>Rarity</span>
              <select defaultValue={selectedRarity} name="rarity">
                <option value="ALL">All rarities</option>
                {TRADING_POST_RARITY_OPTIONS.map((option) => (
                  <option key={option.value} value={option.value}>
                    {option.label}
                  </option>
                ))}
              </select>
            </label>
            <div className="mercane-filter-actions">
              <button className="button" type="submit">
                Search listings
              </button>
              <Link className="button button-secondary" href="/mercane-mercantile">
                Clear filters
              </Link>
            </div>
          </form>
        </section>

        <section className="list-card stack" id="mercane-market-listings">
          <div className="section-heading">
            <div className="stack" style={{ gap: "0.35rem" }}>
              <h2 style={{ margin: 0 }}>Magic items currently up for trade</h2>
              <p className="muted" style={{ margin: 0 }}>
                {totalListings
                  ? `Showing ${resultStart}-${resultEnd} of ${totalListings} public listings.`
                  : "No public listings match the current filters."}
              </p>
            </div>
          </div>

          {listings.length ? (
            <div className="mercane-grid-shell">
              <div className="trading-post-active-grid mercane-results-grid">
                {listings.map((listing) => (
                  <article className="mercane-listing-card stack" key={listing.id}>
                    <div className="stack" style={{ gap: "0.25rem" }}>
                      <p className="eyebrow" style={{ margin: 0 }}>
                        {formatTradingPostRarity(listing.rarity)}
                      </p>
                      <h3 style={{ margin: 0 }}>{formatTradingPostItemName(listing)}</h3>
                      <p className="muted" style={{ margin: 0 }}>
                        Offered by {getListingOwnerLabel(listing)}
                      </p>
                      <p className="muted" style={{ margin: 0 }}>
                        Posted {formatDate(listing.createdAt)}
                      </p>
                    </div>

                    {renderListingDetails(listing)}

                    {canTradeWithCharacter &&
                    listing.userId &&
                    listing.characterId &&
                    listing.userId !== session?.user?.id ? (
                      <details className="table-action-menu">
                        <summary className="button button-secondary button-small table-action-menu-summary">
                          Propose trade
                        </summary>
                        <div className="table-action-menu-panel stack">
                          <p className="muted" style={{ margin: 0 }}>
                            Offer a matching-rarity magic item from one of your characters.
                          </p>
                          <PlayerProposalFields
                            characters={currentUser?.characters ?? []}
                            listingId={listing.id}
                          />
                        </div>
                      </details>
                    ) : !session?.user?.id && listing.userId && listing.characterId ? (
                      <details className="table-action-menu">
                        <summary className="button button-secondary button-small table-action-menu-summary">
                          Propose trade
                        </summary>
                        <div className="table-action-menu-panel stack">
                          <p className="muted" style={{ margin: 0 }}>
                            Enter your guest name, your character name, and the item you want to
                            offer for this listing.
                          </p>
                          <GuestProposalFields listingId={listing.id} />
                        </div>
                      </details>
                    ) : !listing.userId || !listing.characterId ? (
                      <p className="muted" style={{ margin: 0 }}>
                        Guest-hosted listing
                      </p>
                    ) : null}
                  </article>
                ))}

                {Array.from({ length: placeholderCount }, (_, index) => (
                  <article
                    aria-hidden="true"
                    className="mercane-listing-card mercane-listing-card-placeholder stack"
                    key={`mercane-placeholder-${index}`}
                  />
                ))}
              </div>
            </div>
          ) : (
            <div className="empty">
              Try a different keyword or rarity filter, or check back once more items are listed in
              the Mercane Mercantile.
            </div>
          )}

          {totalPages > 1 ? (
            <div className="mercane-pagination">
              {currentPage > 1 ? (
                <Link
                  className="button button-secondary"
                  href={buildMercaneHref({
                    page: currentPage - 1,
                    rarity: selectedRarity,
                    searchTerm,
                  })}
                >
                  Previous 12
                </Link>
              ) : (
                <span />
              )}

              <p className="muted" style={{ margin: 0 }}>
                Page {currentPage} of {totalPages}
              </p>

              {currentPage < totalPages ? (
                <Link
                  className="button button-secondary"
                  href={buildMercaneHref({
                    page: currentPage + 1,
                    rarity: selectedRarity,
                    searchTerm,
                  })}
                >
                  Next 12
                </Link>
              ) : (
                <span />
              )}
            </div>
          ) : null}
        </section>
      </section>
    </main>
  );
}
