// @ts-nocheck
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import { auth } from "@/auth";
import { approvePendingGameLog } from "@/app/player/characters/[id]/actions";
import { CharacterBuildDisplay } from "@/components/character-build-display";
import { ProfileAvatar } from "@/components/profile-avatar";
import {
  COMMON_MAGIC_ITEM_SLOT_COUNT,
  formatFeatSelections,
  formatLanguageSelections,
  formatSkillSelections,
  formatToolSelections,
  getCharmSlotCount,
  getConsumableItemLimit,
  getMagicItemLimit,
  getCharacterTier,
  hasBoonSlot,
} from "@/lib/character";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    reviewed?: string;
    updated?: string;
    error?: string;
  }>;
};

function getTotalLevel(character: {
  class1Level: number | null;
  class2Level: number | null;
  class3Level: number | null;
}) {
  return (
    (character.class1Level ?? 0) +
    (character.class2Level ?? 0) +
    (character.class3Level ?? 0)
  );
}

function getTierLabel(tier: number) {
  return `Tier ${tier}`;
}

function parseMagicItems(raw: string | null, slots: number) {
  if (!raw) {
    return Array.from({ length: slots }, () => "");
  }

  try {
    const parsed = JSON.parse(raw);

    if (Array.isArray(parsed)) {
      return Array.from({ length: slots }, (_, index) => {
        const value = parsed[index];
        return typeof value === "string" ? value : "";
      });
    }
  } catch {
    return Array.from({ length: slots }, () => "");
  }

  return Array.from({ length: slots }, () => "");
}

function getMagicItemLabel(index: number) {
  return index < 3 ? `Item ${index + 1} (attunement)` : `Item ${index + 1}`;
}

function getCommonMagicItemLabel(index: number) {
  return `Common Magic Item Slot ${index + 1}`;
}

function getConsumableLabel(index: number) {
  return `Consumable Slot ${index + 1}`;
}

function getCharmLabel(index: number) {
  return `Charm Slot ${index + 1}`;
}

function getVisibleSlottedItems(
  items: string[],
  minorProperties: string[],
  flavors: string[],
  getLabel: (index: number) => string,
) {
  return items
    .map((item, index) => ({
      label: getLabel(index),
      value: item.trim(),
      minorProperty: (minorProperties[index] ?? "").trim(),
      flavor: (flavors[index] ?? "").trim(),
    }))
    .filter((item) => item.value);
}

function formatMagicItemDisplay(value: string, minorProperty: string, flavor: string) {
  const details = [
    minorProperty ? `Minor Property: ${minorProperty}` : "",
    flavor ? `Flavor: ${flavor}` : "",
  ].filter(Boolean);

  return details.length ? `${value} (${details.join(" | ")})` : value;
}

function formatDate(date: Date) {
  return new Intl.DateTimeFormat("en-CA", {
    year: "numeric",
    month: "short",
    day: "numeric",
  }).format(date);
}

function getGameDmName(game: { dm?: { name: string } | null; dmName?: string | null }) {
  return game.dm?.name ?? game.dmName ?? "Unknown DM";
}

function formatCharacterNotes(value: string | null | undefined) {
  return value?.trim() ? value : "None recorded";
}

const sectionItemHeaderStyle = {
  margin: 0,
  fontSize: "calc(1em + 4pt)",
} as const;

const detailCardStyle = {
  display: "grid",
  gap: "0.75rem",
  padding: "1rem",
  borderRadius: "18px",
  border: "1px solid rgba(255, 255, 255, 0.08)",
  background: "rgba(255, 255, 255, 0.02)",
  alignContent: "start",
} as const;

export default async function CharacterLogsheetPage({
  params,
  searchParams,
}: PageProps) {
  const session = await auth();

  if (!session?.user?.id) {
    redirect("/login");
  }

  const currentUser = await prisma.user.findUnique({
    where: { id: session.user.id },
    include: {
      roles: true,
    },
  });

  if (!currentUser) {
    redirect("/login");
  }

  const { id } = await params;
  const resolvedSearchParams = searchParams ? await searchParams : undefined;

  const character = await prisma.character.findUnique({
    where: { id },
    include: {
      user: true,
      participants: {
        include: {
          game: {
            include: {
              dm: true,
            },
          },
        },
      },
      achievementAwards: {
        include: {
          achievement: true,
          awardedBy: true,
        },
        orderBy: {
          awardedAt: "desc",
        },
      },
      _count: {
        select: {
          participants: true,
        },
      },
    },
  });

  if (!character) {
    notFound();
  }

  const isDm = currentUser.roles.some((entry: { role: string }) => entry.role === "DM");
  const isOwner = character.userId === currentUser.id;

  if (!isOwner && !isDm) {
    redirect("/player");
  }

  const totalLevel = getTotalLevel(character);
  const tier = getCharacterTier(totalLevel);
  const tierLabel = getTierLabel(tier);
  const magicItemSlots = getMagicItemLimit(tier);
  const consumableSlots = getConsumableItemLimit(tier);
  const boonSlotEnabled = hasBoonSlot(tier);
  const charmSlots = getCharmSlotCount(tier);
  const magicItems = parseMagicItems(character.magicItems, magicItemSlots);
  const magicItemMinorProperties = parseMagicItems(
    character.magicItemMinorProperties,
    magicItemSlots
  );
  const magicItemFlavors = parseMagicItems(character.magicItemFlavors, magicItemSlots);
  const commonMagicItems = parseMagicItems(
    character.commonMagicItems,
    COMMON_MAGIC_ITEM_SLOT_COUNT
  );
  const commonMagicItemMinorProperties = parseMagicItems(
    character.commonMagicItemMinorProperties,
    COMMON_MAGIC_ITEM_SLOT_COUNT
  );
  const commonMagicItemFlavors = parseMagicItems(
    character.commonMagicItemFlavors,
    COMMON_MAGIC_ITEM_SLOT_COUNT
  );
  const consumables = parseMagicItems(character.consumables, consumableSlots);
  const charms = parseMagicItems(character.charms, charmSlots);
  const visibleMagicItems = getVisibleSlottedItems(
    magicItems,
    magicItemMinorProperties,
    magicItemFlavors,
    getMagicItemLabel
  );
  const visibleCommonMagicItems = getVisibleSlottedItems(
    commonMagicItems,
    commonMagicItemMinorProperties,
    commonMagicItemFlavors,
    getCommonMagicItemLabel,
  );
  const visibleConsumables = getVisibleSlottedItems(consumables, [], [], getConsumableLabel);
  const visibleCharms = getVisibleSlottedItems(charms, [], [], getCharmLabel);
  const visibleBoon = boonSlotEnabled ? character.boon.trim() : "";
  const visibleBlessing = character.blessing.trim();
  const upcomingGameSignups = character.participants
    .filter(
      (participant) =>
        participant.game.status === "SCHEDULED" &&
        participant.game.datePlayed.getTime() >= Date.now()
    )
    .sort((left, right) => left.game.datePlayed.getTime() - right.game.datePlayed.getTime());
  const pendingLogReviews = character.participants
    .filter(
      (participant) =>
        participant.game.status === "COMPLETED" && participant.logStatus === "PENDING"
    )
    .sort((left, right) => right.game.datePlayed.getTime() - left.game.datePlayed.getTime());
  const visibleGameLog = character.participants.filter(
    (participant) =>
      participant.game.status === "COMPLETED" && participant.logStatus === "APPROVED"
  );
  const gameLog = [...visibleGameLog].sort((left, right) => {
    return right.game.datePlayed.getTime() - left.game.datePlayed.getTime();
  });
  const backHref = isOwner ? "/player" : "/dm/players";

  return (
    <main className="page-shell">
      <section className="stack">
        {resolvedSearchParams?.reviewed === "1" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Game log approved and added to your adventure log.
          </p>
        ) : null}
        {resolvedSearchParams?.updated === "1" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Character updated.
          </p>
        ) : null}
        {resolvedSearchParams?.logged === "1" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Game logged for this character.
          </p>
        ) : null}
        {resolvedSearchParams?.updatedLog === "1" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Logged game updated.
          </p>
        ) : null}
        {resolvedSearchParams?.error === "review-invalid" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Review the log details and try again.
          </p>
        ) : null}
        {resolvedSearchParams?.error === "review-missing" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            That pending review is no longer available.
          </p>
        ) : null}
        <div className="section-heading">
          <div
            style={{
              display: "flex",
              gap: "1rem",
              alignItems: "center",
              flexWrap: "wrap",
            }}
          >
            <ProfileAvatar
              name={character.user.name}
              src={character.user.profileImagePath}
              size={96}
            />
            <div>
              <p className="eyebrow">Character logsheet</p>
              <h1 style={{ margin: "0.35rem 0 0" }}>{character.name}</h1>
              <p className="muted" style={{ margin: "0.5rem 0 0" }}>
                Owned by {character.user.name}
              </p>
            </div>
          </div>

          <div
            style={{
              display: "flex",
              gap: "0.75rem",
              flexWrap: "wrap",
              justifyContent: "flex-end",
              marginLeft: "auto",
            }}
          >
            <Link className="button button-secondary" href={backHref}>
              Back
            </Link>
            {isOwner ? (
              <>
                <Link
                  className="button button-secondary"
                  href={`/player/characters/${character.id}/games/new`}
                >
                  Log game
                </Link>
                <Link
                  className="button"
                  href={`/player/characters/${character.id}/edit`}
                >
                  Edit character log
                </Link>
              </>
            ) : null}
          </div>
        </div>

        <div className="list-card stack">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>Character record</h2>
          </div>

          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(260px, 1fr))",
              alignItems: "start",
            }}
          >
            <div
              style={{
                display: "grid",
                gap: "0.75rem",
                justifyItems: "start",
              }}
            >
              <p className="muted" style={{ margin: 0 }}>
                Player token
              </p>
              {character.tokenImagePath ? (
                <img
                  src={character.tokenImagePath}
                  alt={`${character.name} token`}
                  style={{
                    width: "112px",
                    height: "112px",
                    objectFit: "cover",
                    borderRadius: "999px",
                    border: "1px solid rgba(255, 255, 255, 0.18)",
                  }}
                />
              ) : (
                <p style={{ margin: 0 }}>No token uploaded</p>
              )}
            </div>

            <div
              style={{
                display: "grid",
                gap: "1rem",
                gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
              }}
            >
              <div>
                <p className="muted" style={sectionItemHeaderStyle}>
                  Character AC
                </p>
                <p style={{ margin: "0.35rem 0 0" }}>
                  {character.armorClass ?? "Not added"}
                </p>
              </div>
              <div>
                <p className="muted" style={sectionItemHeaderStyle}>
                  Spell Save DC
                </p>
                <p style={{ margin: "0.35rem 0 0" }}>
                  {character.spellSaveDc ?? "Not added"}
                </p>
              </div>
            </div>
          </div>

          <div
            aria-hidden="true"
            style={{
              width: "100%",
              height: "1px",
              background: "rgba(255, 255, 255, 0.85)",
            }}
          />

          <div className="stack">
            <div className="section-heading">
              <h3 style={{ margin: 0 }}>Achievements</h3>
            </div>

            <div className="table-wrap">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Badge</th>
                    <th>Name</th>
                    <th>Date</th>
                    <th>Game Code</th>
                    <th>Awarded By</th>
                  </tr>
                </thead>
                <tbody>
                  {character.achievementAwards.length ? (
                    character.achievementAwards.map((award) => (
                      <tr key={award.id}>
                        <td>
                          {award.achievement.badgeImagePath ? (
                            <img
                              alt={`${award.achievement.name} badge`}
                              src={award.achievement.badgeImagePath}
                              style={{
                                width: "48px",
                                height: "48px",
                                objectFit: "cover",
                                borderRadius: "14px",
                                border: "1px solid rgba(255, 255, 255, 0.18)",
                              }}
                            />
                          ) : (
                            <span className="pill">No badge</span>
                          )}
                        </td>
                        <td>{award.achievement.name}</td>
                        <td>{formatDate(award.awardedAt)}</td>
                        <td>{award.gameCode || "N/A"}</td>
                        <td>{award.awardedBy.name}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="muted" colSpan={5}>
                        No achievements awarded yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>

        </div>
        <div className="list-card stack">
          <div
            aria-hidden="true"
            style={{
              width: "100%",
              height: "1px",
              background: "rgba(255, 255, 255, 0.85)",
            }}
          />

          <div className="section-heading">
            <h2 style={{ margin: 0 }}>Character details</h2>
          </div>

          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Build
              </p>
              <div style={{ marginTop: "0.35rem" }}>
                <CharacterBuildDisplay
                  character={character}
                  className="character-build-display-logsheet"
                />
              </div>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Tier
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>{tierLabel}</p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Gold
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>{character.totalGold ?? 0}</p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Games played
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>{visibleGameLog.length}</p>
            </div>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Character sheet
              </p>
              <p style={{ margin: "0.35rem 0 0" }}>
                {character.characterSheetLink ? (
                  <a
                    className="button secondary"
                    href={character.characterSheetLink}
                    target="_blank"
                    rel="noreferrer"
                  >
                    OPEN SHEET
                  </a>
                ) : (
                  "Not added"
                )}
              </p>
            </div>
          </div>

          <div
            aria-hidden="true"
            style={{
              width: "100%",
              height: "1px",
              background: "rgba(255, 255, 255, 0.85)",
            }}
          />

          <div className="section-heading">
            <h3 style={{ margin: 0 }}>Uncommon+ Magic Items</h3>
          </div>

          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {visibleMagicItems.map((item, index) => (
              <div key={`${character.id}-item-${index}`}>
                <p className="muted" style={sectionItemHeaderStyle}>
                  {item.label}
                </p>
                <p style={{ margin: "0.35rem 0 0" }}>
                  {formatMagicItemDisplay(item.value, item.minorProperty, item.flavor)}
                </p>
              </div>
            ))}
          </div>

          <div
            aria-hidden="true"
            style={{
              width: "100%",
              height: "1px",
              background: "rgba(255, 255, 255, 0.85)",
            }}
          />

          <div className="section-heading">
            <h3 style={{ margin: 0 }}>Common Magic Items</h3>
          </div>

          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {visibleCommonMagicItems.map((item, index) => (
              <div key={`${character.id}-common-item-${index}`}>
                <p className="muted" style={sectionItemHeaderStyle}>
                  {item.label}
                </p>
                <p style={{ margin: "0.35rem 0 0" }}>
                  {formatMagicItemDisplay(item.value, item.minorProperty, item.flavor)}
                </p>
              </div>
            ))}
          </div>

          <div
            aria-hidden="true"
            style={{
              width: "100%",
              height: "1px",
              background: "rgba(255, 255, 255, 0.85)",
            }}
          />

          <div className="section-heading">
            <h3 style={{ margin: 0 }}>Consumables</h3>
          </div>

          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {visibleConsumables.map((item, index) => (
              <div key={`${character.id}-consumable-${index}`}>
                <p className="muted" style={sectionItemHeaderStyle}>
                  {item.label}
                </p>
                <p style={{ margin: "0.35rem 0 0" }}>{item.value}</p>
              </div>
            ))}
          </div>

          <div
            aria-hidden="true"
            style={{
              width: "100%",
              height: "1px",
              background: "rgba(255, 255, 255, 0.85)",
            }}
          />

          <div className="section-heading">
            <h3 style={{ margin: 0 }}>Blessings, Charms, Boons</h3>
          </div>

          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            {visibleBoon ? (
              <div>
                <p className="muted" style={sectionItemHeaderStyle}>
                  Boon Slot
                </p>
                <p style={{ margin: "0.35rem 0 0" }}>{visibleBoon}</p>
              </div>
            ) : null}
            {visibleBlessing ? (
              <div>
                <p className="muted" style={sectionItemHeaderStyle}>
                  Blessing Slot
                </p>
                <p style={{ margin: "0.35rem 0 0" }}>{visibleBlessing}</p>
              </div>
            ) : null}
            {visibleCharms.map((item, index) => (
              <div key={`${character.id}-charm-${index}`}>
                <p className="muted" style={sectionItemHeaderStyle}>
                  {item.label}
                </p>
                <p style={{ margin: "0.35rem 0 0" }}>{item.value}</p>
              </div>
            ))}
          </div>
        </div>

        <div className="list-card stack">
          <div
            aria-hidden="true"
            style={{
              width: "100%",
              height: "1px",
              background: "rgba(255, 255, 255, 0.85)",
            }}
          />

          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))",
            }}
          >
            <div style={detailCardStyle}>
              <p className="muted" style={sectionItemHeaderStyle}>
                Feats
              </p>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {formatCharacterNotes(formatFeatSelections(character.feats))}
              </p>
            </div>
            <div style={detailCardStyle}>
              <p className="muted" style={sectionItemHeaderStyle}>
                Skills
              </p>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {formatCharacterNotes(formatSkillSelections(character.proficiencies))}
              </p>
            </div>
            <div style={detailCardStyle}>
              <p className="muted" style={sectionItemHeaderStyle}>
                Tools
              </p>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {formatCharacterNotes(formatToolSelections(character.tools))}
              </p>
            </div>
            <div style={detailCardStyle}>
              <p className="muted" style={sectionItemHeaderStyle}>
                Languages
              </p>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {formatCharacterNotes(formatLanguageSelections(character.languages))}
              </p>
            </div>
            <div style={{ ...detailCardStyle, gridColumn: "1 / -1" }}>
              <p className="muted" style={sectionItemHeaderStyle}>
                Character backstory
              </p>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {formatCharacterNotes(character.backstory)}
              </p>
            </div>
            <div style={{ ...detailCardStyle, gridColumn: "1 / -1" }}>
              <p className="muted" style={sectionItemHeaderStyle}>
                Notes
              </p>
              <p style={{ margin: 0, whiteSpace: "pre-wrap" }}>
                {formatCharacterNotes(character.notes)}
              </p>
            </div>
          </div>
        </div>

        <div className="list-card stack">
          <img
            alt="Adventure log divider"
            className="homepage-roster-divider"
            src="/divider4.png"
          />

          <div className="section-heading">
            <h2 style={{ margin: 0 }}>Adventure log</h2>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Code</th>
                  <th>Title</th>
                  <th>DM</th>
                  <th>Tier</th>
                  {isOwner ? <th>Actions</th> : null}
                </tr>
              </thead>
              <tbody>
                {gameLog.length ? (
                  gameLog.map((participant) => (
                    <tr key={participant.id}>
                      <td>{formatDate(participant.game.datePlayed)}</td>
                      <td>{participant.game.adventureCode}</td>
                      <td>{participant.game.title}</td>
                      <td>{getGameDmName(participant.game)}</td>
                      <td>{participant.game.tier.replaceAll("_", " ")}</td>
                      {isOwner ? (
                        <td>
                          <Link
                            className="button button-secondary button-small"
                            href={`/player/characters/${character.id}/games/${participant.game.id}/edit`}
                          >
                            Edit log
                          </Link>
                        </td>
                      ) : null}
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="muted" colSpan={isOwner ? 6 : 5}>
                      No adventures logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {isOwner ? (
          <div className="list-card stack">
            <div className="section-heading">
              <div>
                <h2 style={{ margin: 0 }}>Upcoming signed-up games</h2>
                <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                  Scheduled games currently tied to this character on the league
                  schedule.
                </p>
              </div>
            </div>

            <div className="table-wrap">
              <table className="ledger-table">
                <thead>
                  <tr>
                    <th>Date</th>
                    <th>Code</th>
                    <th>Title</th>
                    <th>DM</th>
                    <th>Tier</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {upcomingGameSignups.length ? (
                    upcomingGameSignups.map((participant) => (
                      <tr key={participant.id}>
                        <td>{formatDate(participant.game.datePlayed)}</td>
                        <td>{participant.game.adventureCode}</td>
                        <td>{participant.game.title}</td>
                        <td>{getGameDmName(participant.game)}</td>
                        <td>{participant.game.tier.replaceAll("_", " ")}</td>
                        <td>
                          <Link
                            className="button button-secondary button-small"
                            href={`/league/games/${participant.game.id}`}
                          >
                            View game
                          </Link>
                        </td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td className="muted" colSpan={6}>
                        No upcoming scheduled games are tied to this character yet.
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        ) : null}

        {isOwner ? (
          <div className="list-card stack">
            <div className="section-heading">
              <div>
                <h2 style={{ margin: 0 }}>Completed games awaiting approval</h2>
                <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                  DM-created completed games stay out of your adventure log until
                  you approve or revise the details below.
                </p>
              </div>
            </div>

            {pendingLogReviews.length ? (
              pendingLogReviews.map((participant) => (
                <form
                  key={participant.id}
                  action={approvePendingGameLog.bind(null, character.id, participant.id)}
                  className="list-card form-stack"
                >
                  <div
                    style={{
                      display: "grid",
                      gap: "1rem",
                      gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    }}
                  >
                    <div>
                      <p className="muted" style={{ margin: 0 }}>
                        Date
                      </p>
                      <p style={{ margin: "0.35rem 0 0" }}>
                        {formatDate(participant.game.datePlayed)}
                      </p>
                    </div>
                    <div>
                      <p className="muted" style={{ margin: 0 }}>
                        Code
                      </p>
                      <p style={{ margin: "0.35rem 0 0" }}>
                        {participant.game.adventureCode}
                      </p>
                    </div>
                    <div>
                      <p className="muted" style={{ margin: 0 }}>
                        Title
                      </p>
                      <p style={{ margin: "0.35rem 0 0" }}>{participant.game.title}</p>
                    </div>
                    <div>
                      <p className="muted" style={{ margin: 0 }}>
                        DM
                      </p>
                      <p style={{ margin: "0.35rem 0 0" }}>
                        {getGameDmName(participant.game)}
                      </p>
                    </div>
                  </div>

                  <label>
                    Awarded Gold
                    <textarea
                      defaultValue={
                        participant.logRewardsSummary ?? participant.game.rewardsSummary ?? ""
                      }
                      name="rewardsSummary"
                      required
                    />
                  </label>
                  <label>
                    Magic Items Awarded
                    <textarea
                      defaultValue={
                        participant.logMagicItemsAwarded ??
                        participant.game.magicItemsAwarded ??
                        ""
                      }
                      name="magicItemsAwarded"
                    />
                  </label>
                  <label>
                    Consumables Awarded
                    <textarea
                      defaultValue={
                        participant.logConsumablesAwarded ??
                        participant.game.consumablesAwarded ??
                        ""
                      }
                      name="consumablesAwarded"
                    />
                  </label>
                  <label>
                    Session Notes/Story Awards
                    <textarea
                      defaultValue={
                        participant.logSessionNotes ?? participant.game.sessionNotes ?? ""
                      }
                      name="sessionNotes"
                    />
                  </label>

                  <button type="submit">Approve and add to log</button>
                </form>
              ))
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                No completed DM-created games are waiting for approval.
              </p>
            )}
          </div>
        ) : null}
      </section>
    </main>
  );
}
