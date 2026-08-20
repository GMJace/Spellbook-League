import Link from "next/link";
import { notFound } from "next/navigation";

import {
  acceptTradingPostProposal,
  createTradingPostListing,
  createTradingPostProposal,
  declineTradingPostProposal,
  withdrawTradingPostListing,
} from "@/app/player/characters/[id]/trading-post/actions";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { requireRole } from "@/lib/auth";
import {
  formatTradingPostItemName,
  formatTradingPostProposalStatus,
  formatTradingPostRarity,
  TRADING_POST_RARITY_OPTIONS,
} from "@/lib/trading-post";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    listing?: string;
    proposal?: string;
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
        <p style={{ margin: "0.2rem 0 0" }}>
          {formatTradingPostItemName(listing)}
        </p>
      </div>
      <div>
        <p className="muted" style={{ margin: 0 }}>
          Minor Property
        </p>
        <p style={{ margin: "0.2rem 0 0" }}>{formatOptionalText(listing.minorProperty)}</p>
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

function ProposalFields({
  characterId,
  listingId,
}: {
  characterId: string;
  listingId: string;
}) {
  return (
    <form action={createTradingPostProposal} className="stack" style={{ gap: "0.75rem" }}>
      <input name="characterId" type="hidden" value={characterId} />
      <input name="listingId" type="hidden" value={listingId} />

      <div
        style={{
          display: "grid",
          gap: "0.75rem",
          gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
        }}
      >
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
          <input name="flavorNotes" type="text" />
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

export default async function CharacterTradingPostPage({
  params,
  searchParams,
}: PageProps) {
  const user = await requireRole("PLAYER");
  const { id } = await params;
  const query = await searchParams;

  const [character, activeListings, incomingProposals, outgoingProposals] = await Promise.all([
    prisma.character.findFirst({
      where: {
        id,
        userId: user.id,
      },
      select: {
        id: true,
        name: true,
      },
    }),
    prisma.tradingPostListing.findMany({
      where: {
        status: "ACTIVE",
      },
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
        proposals: {
          where: {
            proposerCharacterId: id,
          },
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
          select: {
            id: true,
            status: true,
            createdAt: true,
          },
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
    prisma.tradingPostProposal.findMany({
      where: {
        status: "PENDING",
        listing: {
          characterId: id,
          userId: user.id,
          status: "ACTIVE",
        },
      },
      include: {
        listing: {
          select: {
            id: true,
            rarity: true,
            item: true,
            itemName: true,
            minorProperty: true,
            flavorNotes: true,
            adventureCode: true,
            downtimeDaysSpent: true,
            lookingFor: true,
            character: {
              select: {
                id: true,
                name: true,
              },
            },
          },
        },
        proposerCharacter: {
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
    }),
    prisma.tradingPostProposal.findMany({
      where: {
        proposerCharacterId: id,
      },
      include: {
        listing: {
          select: {
            id: true,
            status: true,
            rarity: true,
            item: true,
            itemName: true,
            minorProperty: true,
            flavorNotes: true,
            adventureCode: true,
            downtimeDaysSpent: true,
            lookingFor: true,
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
        },
      },
      orderBy: {
        createdAt: "desc",
      },
    }),
  ]);

  if (!character) {
    notFound();
  }

  return (
    <main className="page-shell">
      <section className="stack">
        {query.listing === "created" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>Trading Post listing added.</p>
        ) : null}
        {query.listing === "withdrawn" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>Trading Post listing removed.</p>
        ) : null}
        {query.listing === "invalid" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Please complete the listing details and try again.
          </p>
        ) : null}
        {query.listing === "missing" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            That Trading Post listing is no longer available.
          </p>
        ) : null}
        {query.proposal === "sent" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>Trade proposal sent for review.</p>
        ) : null}
        {query.proposal === "accepted" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Trade proposal accepted and added to both trade logs.
          </p>
        ) : null}
        {query.proposal === "declined" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>Trade proposal declined.</p>
        ) : null}
        {query.proposal === "duplicate" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            You already have a pending proposal on that listing.
          </p>
        ) : null}
        {query.proposal === "invalid" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Please complete the proposal details and try again.
          </p>
        ) : null}
        {query.proposal === "missing" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            That proposal or listing is no longer available.
          </p>
        ) : null}

        <div className="section-heading">
          <div className="stack" style={{ gap: "0.35rem" }}>
            <p className="eyebrow">Character logsheet</p>
            <h1 style={{ margin: 0 }}>Trading Post for {character.name}</h1>
            <p className="muted" style={{ margin: 0 }}>
              Offer magic items for trade, browse current listings, and review trade proposals for
              this character.
            </p>
          </div>
          <Link className="button button-secondary" href={`/player/characters/${character.id}`}>
            Back to character
          </Link>
        </div>

        <section className="list-card stack">
          <div className="section-heading">
            <div className="stack" style={{ gap: "0.35rem" }}>
              <h2 style={{ margin: 0 }}>Post an item for trade</h2>
              <p className="muted" style={{ margin: 0 }}>
                Add the item details exactly as this character has them recorded.
              </p>
            </div>
          </div>

          <form action={createTradingPostListing} className="form-stack">
            <input name="characterId" type="hidden" value={character.id} />

            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
              }}
            >
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
                <input name="flavorNotes" type="text" />
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
              <button className="button" type="submit">
                Add item to Trading Post
              </button>
            </div>
          </form>
        </section>

        <section className="list-card stack">
          <div className="section-heading">
            <div className="stack" style={{ gap: "0.35rem" }}>
              <h2 style={{ margin: 0 }}>Items currently up for trade</h2>
              <p className="muted" style={{ margin: 0 }}>
                Browse active listings and offer another item of the same rarity.
              </p>
            </div>
          </div>

          {activeListings.length ? (
            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
                alignItems: "start",
              }}
            >
              {activeListings.map((listing) => {
                const latestOwnProposal = listing.proposals[0] ?? null;
                const isOwnListing = listing.characterId === character.id;

                return (
                  <article
                    className="list-card stack"
                    key={listing.id}
                    style={{
                      gap: "0.85rem",
                      minHeight: "100%",
                    }}
                  >
                    <div className="stack" style={{ gap: "0.25rem" }}>
                      <p className="eyebrow" style={{ margin: 0 }}>
                        {formatTradingPostRarity(listing.rarity)}
                      </p>
                      <h3 style={{ margin: 0 }}>{formatTradingPostItemName(listing)}</h3>
                      <p className="muted" style={{ margin: 0 }}>
                        Offered by {listing.character.user.name} · {listing.character.name}
                      </p>
                      <p className="muted" style={{ margin: 0 }}>
                        Posted {formatDate(listing.createdAt)}
                      </p>
                    </div>

                    {renderListingDetails(listing)}

                    {isOwnListing ? (
                      <form action={withdrawTradingPostListing.bind(null, character.id, listing.id)}>
                        <ConfirmSubmitButton
                          className="button button-danger button-small"
                          message="Remove this Trading Post listing?"
                        >
                          Remove listing
                        </ConfirmSubmitButton>
                      </form>
                    ) : latestOwnProposal?.status === "PENDING" ? (
                      <div className="stack" style={{ gap: "0.45rem" }}>
                        <p className="muted" style={{ margin: 0 }}>
                          Your current proposal is pending review.
                        </p>
                        <p className="muted" style={{ margin: 0 }}>
                          Sent {formatDate(latestOwnProposal.createdAt)}
                        </p>
                      </div>
                    ) : (
                      <details className="table-action-menu">
                        <summary className="button button-secondary button-small table-action-menu-summary">
                          Make trade offer
                        </summary>
                        <div className="table-action-menu-panel stack">
                          {latestOwnProposal ? (
                            <p className="muted" style={{ margin: 0 }}>
                              Previous proposal:{" "}
                              {formatTradingPostProposalStatus(latestOwnProposal.status)}
                            </p>
                          ) : null}
                          <p className="muted" style={{ margin: 0 }}>
                            Offer a {formatTradingPostRarity(listing.rarity)} item from{" "}
                            {character.name}.
                          </p>
                          <ProposalFields characterId={character.id} listingId={listing.id} />
                        </div>
                      </details>
                    )}
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="muted" style={{ margin: 0 }}>
              No items are on the Trading Post yet.
            </p>
          )}
        </section>

        <section className="list-card stack">
          <div className="section-heading">
            <div className="stack" style={{ gap: "0.35rem" }}>
              <h2 style={{ margin: 0 }}>Trade proposals</h2>
              <p className="muted" style={{ margin: 0 }}>
                Review incoming offers on your listings and track proposals sent by this
                character.
              </p>
            </div>
          </div>

          <div className="stack">
            <div className="section-heading">
              <h3 style={{ margin: 0 }}>Incoming proposals</h3>
            </div>

            {incomingProposals.length ? (
              incomingProposals.map((proposal) => (
                <article className="list-card stack" key={proposal.id}>
                  <div
                    style={{
                      display: "grid",
                      gap: "1rem",
                      gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
                    }}
                  >
                    <div className="stack" style={{ gap: "0.45rem" }}>
                      <div>
                        <p className="eyebrow" style={{ margin: 0 }}>
                          Your listing
                        </p>
                        <h4 style={{ margin: "0.2rem 0 0" }}>
                          {formatTradingPostItemName(proposal.listing)}
                        </h4>
                        <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                          {formatTradingPostRarity(proposal.listing.rarity)}
                        </p>
                      </div>
                      {renderListingDetails(proposal.listing)}
                    </div>

                    <div className="stack" style={{ gap: "0.45rem" }}>
                      <div>
                        <p className="eyebrow" style={{ margin: 0 }}>
                          Proposed item
                        </p>
                        <h4 style={{ margin: "0.2rem 0 0" }}>
                          {formatTradingPostItemName(proposal)}
                        </h4>
                        <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                          Offered by {proposal.proposerCharacter.user.name} ·{" "}
                          {proposal.proposerCharacter.name}
                        </p>
                        <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                          Sent {formatDate(proposal.createdAt)}
                        </p>
                      </div>

                      <div className="stack" style={{ gap: "0.45rem" }}>
                        <div>
                          <p className="muted" style={{ margin: 0 }}>
                            Minor Property
                          </p>
                          <p style={{ margin: "0.2rem 0 0" }}>
                            {formatOptionalText(proposal.minorProperty)}
                          </p>
                        </div>
                        <div>
                          <p className="muted" style={{ margin: 0 }}>
                            Notes (Flavor)
                          </p>
                          <p style={{ margin: "0.2rem 0 0", whiteSpace: "pre-wrap" }}>
                            {formatOptionalText(proposal.flavorNotes)}
                          </p>
                        </div>
                        <div>
                          <p className="muted" style={{ margin: 0 }}>
                            Item received in adventure code
                          </p>
                          <p style={{ margin: "0.2rem 0 0" }}>
                            {formatOptionalText(proposal.adventureCode)}
                          </p>
                        </div>
                        <div>
                          <p className="muted" style={{ margin: 0 }}>
                            Downtime days spent
                          </p>
                          <p style={{ margin: "0.2rem 0 0" }}>{proposal.downtimeDaysSpent}</p>
                        </div>
                      </div>
                    </div>
                  </div>

                  <div style={{ display: "flex", gap: "0.75rem", flexWrap: "wrap" }}>
                    <form action={acceptTradingPostProposal.bind(null, character.id, proposal.id)}>
                      <button className="button button-secondary button-small" type="submit">
                        Accept trade
                      </button>
                    </form>
                    <form action={declineTradingPostProposal.bind(null, character.id, proposal.id)}>
                      <button className="button button-secondary button-small" type="submit">
                        Decline trade
                      </button>
                    </form>
                  </div>
                </article>
              ))
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                No incoming proposals are waiting for review.
              </p>
            )}
          </div>

          <div className="stack">
            <div className="section-heading">
              <h3 style={{ margin: 0 }}>Your recent proposals</h3>
            </div>

            {outgoingProposals.length ? (
              <div className="table-wrap">
                <table className="ledger-table">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Status</th>
                      <th>Offered to</th>
                      <th>Their item</th>
                      <th>Your offer</th>
                    </tr>
                  </thead>
                  <tbody>
                    {outgoingProposals.map((proposal) => (
                      <tr key={proposal.id}>
                        <td>{formatDate(proposal.createdAt)}</td>
                        <td>{formatTradingPostProposalStatus(proposal.status)}</td>
                        <td>
                          <div>{proposal.listing.character.name}</div>
                          <div className="muted">{proposal.listing.character.user.name}</div>
                        </td>
                        <td>{formatTradingPostItemName(proposal.listing)}</td>
                        <td>{formatTradingPostItemName(proposal)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                This character has not sent any trade proposals yet.
              </p>
            )}
          </div>
        </section>
      </section>
    </main>
  );
}
