// @ts-nocheck
import Link from "next/link";
import { notFound, redirect } from "next/navigation";

import {
  approvePendingGameLog,
  deleteCharacter,
} from "@/app/player/characters/[id]/actions";
import { deletePlayerGameLog } from "@/app/player/characters/[id]/games/actions";
import {
  confirmCharacterTrade,
  deleteCharacterTrade,
} from "@/app/player/characters/[id]/trades/actions";
import { CharacterBuildDisplay } from "@/components/character-build-display";
import { ConfirmSubmitButton } from "@/components/confirm-submit-button";
import { CopyMusterInfoButton } from "@/components/copy-muster-info-button";
import { ProfileAvatar } from "@/components/profile-avatar";
import { TableActionMenu } from "@/components/table-action-menu";
import {
  COMMON_MAGIC_ITEM_SLOT_COUNT,
  formatClassSummary,
  formatFeatSelections,
  formatLanguageSelections,
  formatSkillSelections,
  formatToolSelections,
  getCharmSlotCount,
  getConsumableItemLimit,
  getMagicItemLimit,
  getCharacterTier,
  hasBoonSlot,
  parseMagicItemFlavorDetails,
} from "@/lib/character";
import {
  canViewPrivateCharacterRoster,
  canViewPublicCharacterRoster,
  isCharacterRosterAdmin,
} from "@/lib/character-visibility";
import { requireUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";
const TRADE_DOWNTIME_DAYS = 5;

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams?: Promise<{
    reviewed?: string;
    updated?: string;
    error?: string;
    trade?: string;
    downtime?: string;
    imported?: string;
    logged?: string;
    updatedLog?: string;
    deletedLog?: string;
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
  names: string[],
  minorProperties: string[],
  flavors: string[],
  getLabel: (index: number) => string,
) {
  return items
    .map((item, index) => ({
      label: getLabel(index),
      value: item.trim(),
      name: (names[index] ?? "").trim(),
      minorProperty: (minorProperties[index] ?? "").trim(),
      flavor: (flavors[index] ?? "").trim(),
    }))
    .filter((item) => item.value);
}

function getMagicItemDetailLines(item: {
  value: string;
  name: string;
  minorProperty: string;
  flavor: string;
}) {
  return [
    { label: "Item (counts as)", value: item.value },
    { label: "Name", value: item.name || "Not added" },
    { label: "Minor Property", value: item.minorProperty || "Not added" },
    { label: "Notes (Flavor)", value: item.flavor || "Not added" },
  ];
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

function formatOptionalLogText(value: string | null | undefined) {
  return value?.trim() ? value : "Not added";
}

function formatTradeItemSummary(item: {
  item: string;
  itemName: string;
  minorProperty: string;
  flavorNotes: string;
  specialNotes: string;
}) {
  const lines = [item.itemName || item.item];

  if (item.itemName && item.itemName !== item.item) {
    lines.push(`Counts as: ${item.item}`);
  }

  if (item.minorProperty) {
    lines.push(`Minor Property: ${item.minorProperty}`);
  }

  if (item.flavorNotes) {
    lines.push(`Notes: ${item.flavorNotes}`);
  }

  if (item.specialNotes) {
    lines.push(`Special Notes: ${item.specialNotes}`);
  }

  return lines;
}

function formatMusterMagicItem(item: {
  value: string;
  name: string;
}) {
  if (item.name && item.name !== item.value) {
    return `${item.name} (counts as ${item.value})`;
  }

  return item.name || item.value;
}

function formatMusterList(values: string[]) {
  return values.length ? values.join(", ") : "None recorded";
}

const sectionItemHeaderStyle = {
  margin: 0,
  fontSize: "calc(1em + 4pt)",
} as const;

const whiteLineDividerStyle = {
  width: "100%",
  height: "1px",
  background: "rgba(255, 255, 255, 0.85)",
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
  const currentUser = await requireUser({ allowMissingDiscord: true });

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
      tradesProposed: {
        include: {
          recipientCharacter: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      tradesReceived: {
        include: {
          proposerCharacter: {
            include: {
              user: true,
            },
          },
        },
        orderBy: {
          createdAt: "desc",
        },
      },
      downtimeEntries: {
        include: {
          user: true,
        },
        orderBy: {
          spentAt: "desc",
        },
      },
    },
  });

  if (!character) {
    notFound();
  }

  const isOwner = character.userId === currentUser.id;
  const isDm = currentUser.roles.includes("DM");
  const isAdminViewer = isCharacterRosterAdmin(currentUser.roles);
  const canSeePrivateCharacters = await canViewPrivateCharacterRoster(currentUser);
  const canSeePublicCharacter =
    character.isPubliclyViewable && canViewPublicCharacterRoster(currentUser);

  if (!isOwner && !canSeePrivateCharacters && !canSeePublicCharacter) {
    if (isDm) {
      redirect("/dm/players");
    }

    if (isAdminViewer) {
      redirect("/admin/users");
    }

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
  const magicItemFlavorDetails = parseMagicItemFlavorDetails(character.magicItemFlavors);
  const magicItemMinorProperties = parseMagicItems(
    character.magicItemMinorProperties,
    magicItemSlots
  );
  const magicItemNames = Array.from({ length: magicItemSlots }, (_, index) =>
    magicItemFlavorDetails[index]?.name ?? ""
  );
  const magicItemFlavors = Array.from({ length: magicItemSlots }, (_, index) =>
    magicItemFlavorDetails[index]?.notes ?? ""
  );
  const commonMagicItems = parseMagicItems(
    character.commonMagicItems,
    COMMON_MAGIC_ITEM_SLOT_COUNT
  );
  const commonMagicItemFlavorDetails = parseMagicItemFlavorDetails(
    character.commonMagicItemFlavors
  );
  const commonMagicItemMinorProperties = parseMagicItems(
    character.commonMagicItemMinorProperties,
    COMMON_MAGIC_ITEM_SLOT_COUNT
  );
  const commonMagicItemNames = Array.from(
    { length: COMMON_MAGIC_ITEM_SLOT_COUNT },
    (_, index) => commonMagicItemFlavorDetails[index]?.name ?? ""
  );
  const commonMagicItemFlavors = Array.from(
    { length: COMMON_MAGIC_ITEM_SLOT_COUNT },
    (_, index) => commonMagicItemFlavorDetails[index]?.notes ?? ""
  );
  const consumables = parseMagicItems(character.consumables, consumableSlots);
  const charms = parseMagicItems(character.charms, charmSlots);
  const visibleMagicItems = getVisibleSlottedItems(
    magicItems,
    magicItemNames,
    magicItemMinorProperties,
    magicItemFlavors,
    getMagicItemLabel
  );
  const visibleCommonMagicItems = getVisibleSlottedItems(
    commonMagicItems,
    commonMagicItemNames,
    commonMagicItemMinorProperties,
    commonMagicItemFlavors,
    getCommonMagicItemLabel,
  );
  const visibleConsumables = getVisibleSlottedItems(consumables, [], [], [], getConsumableLabel);
  const visibleCharms = getVisibleSlottedItems(charms, [], [], [], getCharmLabel);
  const visibleBoon = boonSlotEnabled ? character.boon.trim() : "";
  const visibleBlessing = character.blessing.trim();
  const musterText = [
    `Character Name: ${character.name}`,
    `Build: ${formatClassSummary(character) || "No classes recorded"}`,
    `Character HP: ${character.hitPoints ?? "Not added"}`,
    `Character AC: ${character.armorClass ?? "Not added"}`,
    `Passive Perception: ${character.passivePerception ?? "Not added"}`,
    `Spell Save DC: ${character.spellSaveDc ?? "Not added"}`,
    `Uncommon Magic Items: ${formatMusterList(
      visibleMagicItems.map((item) => formatMusterMagicItem(item))
    )}`,
    `Common Magic Items: ${formatMusterList(
      visibleCommonMagicItems.map((item) => formatMusterMagicItem(item))
    )}`,
    `Consumables: ${formatMusterList(visibleConsumables.map((item) => item.value))}`,
    `Blessings, Charms, Boons: ${formatMusterList(
      [visibleBlessing, ...visibleCharms.map((item) => item.value), visibleBoon]
        .map((value) => value.trim())
        .filter(Boolean)
    )}`,
    `Character Sheet Link: ${character.characterSheetLink || "Not added"}`,
  ].join("\n");
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
  const tradeLog = [...character.tradesProposed, ...character.tradesReceived].sort(
    (left, right) => right.createdAt.getTime() - left.createdAt.getTime()
  );
  const earnedDowntimeDays = visibleGameLog.length * 10;
  const tradeDowntimeDaysSpent = tradeLog.reduce((total, trade) => {
    if (trade.status !== "CONFIRMED") {
      return total;
    }

    return total + TRADE_DOWNTIME_DAYS;
  }, 0);
  const loggedDowntimeDaysSpent = character.downtimeEntries.reduce(
    (total, entry) => total + entry.downtimeDaysSpent,
    0
  );
  const totalDowntimeDaysSpent = tradeDowntimeDaysSpent + loggedDowntimeDaysSpent;
  const remainingDowntimeDays = earnedDowntimeDays - totalDowntimeDaysSpent;
  const tradeLogPlaceholderCount = Math.max(0, 5 - tradeLog.length - (tradeLog.length ? 0 : 1));
  const backHref = isOwner ? "/player" : isDm ? "/dm/players" : isAdminViewer ? "/admin/users" : "/";

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
        {resolvedSearchParams?.imported ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Imported {resolvedSearchParams.imported} game log
            {resolvedSearchParams.imported === "1" ? " entry." : " entries."}
          </p>
        ) : null}
        {resolvedSearchParams?.updatedLog === "1" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Logged game updated.
          </p>
        ) : null}
        {resolvedSearchParams?.deletedLog === "1" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Logged game deleted.
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
        {resolvedSearchParams?.trade === "created" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Trade logged and sent to the other player for confirmation.
          </p>
        ) : null}
        {resolvedSearchParams?.trade === "confirmed" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Trade confirmed.
          </p>
        ) : null}
        {resolvedSearchParams?.trade === "updated" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Trade updated.
          </p>
        ) : null}
        {resolvedSearchParams?.trade === "deleted" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Trade deleted.
          </p>
        ) : null}
        {resolvedSearchParams?.trade === "missing" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            That trade is no longer available.
          </p>
        ) : null}
        {resolvedSearchParams?.downtime === "logged" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>
            Downtime logged for this character.
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
              <TableActionMenu
                label="Character actions"
                panelStyle={{ minWidth: "14rem" }}
                summaryClassName="button-secondary"
                summarySmall={false}
              >
                <CopyMusterInfoButton
                  className="button button-secondary button-small"
                  text={musterText}
                />
                <Link
                  className="button button-secondary button-small"
                  href={`/player/characters/${character.id}/games/new`}
                >
                  Log game
                </Link>
                <Link
                  className="button button-secondary button-small"
                  href={`/player/characters/${character.id}/games/import`}
                >
                  Import logsheet
                </Link>
                <Link
                  className="button button-secondary button-small"
                  href={`/player/characters/${character.id}/trades/new`}
                >
                  Log trade
                </Link>
                <Link
                  className="button button-secondary button-small"
                  href={`/player/characters/${character.id}/downtime/new`}
                >
                  Log downtime
                </Link>
                <Link
                  className="button button-secondary button-small"
                  href={`/player/characters/${character.id}/trading-post`}
                >
                  Trading Post
                </Link>
                <Link
                  className="button button-secondary button-small"
                  href={`/player/characters/${character.id}/edit`}
                >
                  Edit character log
                </Link>
                <form action={deleteCharacter.bind(null, character.id)}>
                  <ConfirmSubmitButton
                    className="button button-danger button-small"
                    message="Delete this character? This cannot be undone."
                  >
                    Delete character
                  </ConfirmSubmitButton>
                </form>
              </TableActionMenu>
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
                gridTemplateColumns: "repeat(2, minmax(160px, 1fr))",
              }}
            >
              <div>
                <p className="muted" style={sectionItemHeaderStyle}>
                  Character HP
                </p>
                <p style={{ margin: "0.35rem 0 0" }}>
                  {character.hitPoints ?? "Not added"}
                </p>
              </div>
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
                  Passive Perception
                </p>
                <p style={{ margin: "0.35rem 0 0" }}>
                  {character.passivePerception ?? "Not added"}
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
            {visibleMagicItems.length ? (
              visibleMagicItems.map((item, index) => (
                <div key={`${character.id}-item-${index}`} style={detailCardStyle}>
                  <p className="muted" style={sectionItemHeaderStyle}>
                    {item.label}
                  </p>
                  {getMagicItemDetailLines(item).map((detail) => (
                    <div key={`${item.label}-${detail.label}`} className="stack" style={{ gap: "0.2rem" }}>
                      <p className="muted" style={{ margin: 0 }}>
                        {detail.label}
                      </p>
                      <p style={{ margin: 0 }}>{detail.value}</p>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                No uncommon+ magic items recorded.
              </p>
            )}
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
            {visibleCommonMagicItems.length ? (
              visibleCommonMagicItems.map((item, index) => (
                <div key={`${character.id}-common-item-${index}`} style={detailCardStyle}>
                  <p className="muted" style={sectionItemHeaderStyle}>
                    {item.label}
                  </p>
                  {getMagicItemDetailLines(item).map((detail) => (
                    <div key={`${item.label}-${detail.label}`} className="stack" style={{ gap: "0.2rem" }}>
                      <p className="muted" style={{ margin: 0 }}>
                        {detail.label}
                      </p>
                      <p style={{ margin: 0 }}>{detail.value}</p>
                    </div>
                  ))}
                </div>
              ))
            ) : (
              <p className="muted" style={{ margin: 0 }}>
                No common magic items recorded.
              </p>
            )}
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
            alt="Downtime divider"
            className="homepage-roster-divider"
            src="/divider4.png"
          />

          <div className="section-heading">
            <div>
              <h2 style={{ margin: 0 }}>Downtime Log</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Earned DT is 10 downtime days for each approved logged game. Spent DT includes
                confirmed trade downtime and all downtime log entries. Remaining DT equals Earned
                DT minus Spent DT.
              </p>
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gap: "1rem",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            }}
          >
            <div className="metric" style={{ display: "grid", gap: "0.35rem" }}>
              <span className="metric-label">Earned DT</span>
              <strong className="metric-value">{earnedDowntimeDays}</strong>
            </div>
            <div className="metric" style={{ display: "grid", gap: "0.35rem" }}>
              <span className="metric-label">Spent DT</span>
              <strong className="metric-value">{totalDowntimeDaysSpent}</strong>
            </div>
            <div className="metric" style={{ display: "grid", gap: "0.35rem" }}>
              <span className="metric-label">Remaining DT</span>
              <strong className="metric-value">{remainingDowntimeDays}</strong>
            </div>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Activity</th>
                  <th>DT spent</th>
                  <th>Related code</th>
                  <th>Notes</th>
                </tr>
              </thead>
              <tbody>
                {character.downtimeEntries.length ? (
                  character.downtimeEntries.map((entry) => (
                    <tr key={entry.id}>
                      <td>{formatDate(entry.spentAt)}</td>
                      <td>{entry.activity}</td>
                      <td>{entry.downtimeDaysSpent}</td>
                      <td>{formatOptionalLogText(entry.relatedAdventureCode)}</td>
                      <td style={{ whiteSpace: "pre-wrap" }}>
                        {formatOptionalLogText(entry.notes)}
                      </td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td className="muted" colSpan={5}>
                      No downtime logged yet.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        <div className="list-card stack">
          <div aria-hidden="true" style={whiteLineDividerStyle} />

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
                          <TableActionMenu>
                            <Link
                              className="button button-secondary button-small"
                              href={`/player/characters/${character.id}/games/${participant.game.id}`}
                            >
                              View log
                            </Link>
                            <Link
                              className="button button-secondary button-small"
                              href={`/player/characters/${character.id}/games/${participant.game.id}/edit`}
                            >
                              Edit log
                            </Link>
                            <form
                              action={deletePlayerGameLog.bind(
                                null,
                                character.id,
                                participant.game.id,
                              )}
                            >
                              <ConfirmSubmitButton
                                className="button button-danger button-small"
                                message="Delete this logged game? This cannot be undone."
                              >
                                Delete log
                              </ConfirmSubmitButton>
                            </form>
                          </TableActionMenu>
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

        <div className="list-card stack">
          <div aria-hidden="true" style={whiteLineDividerStyle} />

          <div className="section-heading">
            <h2 style={{ margin: 0 }}>Trade log</h2>
          </div>

          <div className="table-wrap">
            <table className="ledger-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Status</th>
                  <th>Trade partner</th>
                  <th>You send</th>
                  <th>You receive</th>
                  <th>Adventure codes</th>
                  <th>Downtime</th>
                  {isOwner ? <th>Action</th> : null}
                </tr>
              </thead>
              <tbody>
                {tradeLog.length ? (
                  tradeLog.map((trade) => {
                    const isTradeProposer = trade.proposerCharacterId === character.id;
                    const counterpartyCharacter = isTradeProposer
                      ? trade.recipientCharacter
                      : trade.proposerCharacter;
                    const counterpartyCharacterName = isTradeProposer
                      ? trade.recipientCharacterName
                      : trade.proposerCharacterName;
                    const counterpartyPlayerName = isTradeProposer
                      ? trade.recipientPlayerName
                      : trade.proposerPlayerName;
                    const sentItemLines = formatTradeItemSummary({
                      item: isTradeProposer ? trade.proposerItem : trade.recipientItem,
                      itemName: isTradeProposer
                        ? trade.proposerItemName
                        : trade.recipientItemName,
                      minorProperty: isTradeProposer
                        ? trade.proposerMinorProperty
                        : trade.recipientMinorProperty,
                      flavorNotes: isTradeProposer
                        ? trade.proposerFlavorNotes
                        : trade.recipientFlavorNotes,
                      specialNotes: isTradeProposer
                        ? trade.proposerSpecialNotes
                        : trade.recipientSpecialNotes,
                    });
                    const receivedItemLines = formatTradeItemSummary({
                      item: isTradeProposer ? trade.recipientItem : trade.proposerItem,
                      itemName: isTradeProposer
                        ? trade.recipientItemName
                        : trade.proposerItemName,
                      minorProperty: isTradeProposer
                        ? trade.recipientMinorProperty
                        : trade.proposerMinorProperty,
                      flavorNotes: isTradeProposer
                        ? trade.recipientFlavorNotes
                        : trade.proposerFlavorNotes,
                      specialNotes: isTradeProposer
                        ? trade.recipientSpecialNotes
                        : trade.proposerSpecialNotes,
                    });
                    const canConfirmTrade =
                      isOwner &&
                      trade.status === "PENDING" &&
                      trade.recipientCharacterId === character.id;

                    return (
                      <tr key={trade.id}>
                        <td>{formatDate(trade.createdAt)}</td>
                        <td>{trade.status === "CONFIRMED" ? "Confirmed" : "Pending"}</td>
                        <td>
                          <div>{counterpartyCharacterName || counterpartyCharacter?.name || "Unknown character"}</div>
                          <div className="muted">
                            {counterpartyPlayerName || counterpartyCharacter?.user?.name || "Unknown player"}
                          </div>
                        </td>
                        <td>
                          {sentItemLines.map((line) => (
                            <div key={`${trade.id}-send-${line}`}>{line}</div>
                          ))}
                        </td>
                        <td>
                          {receivedItemLines.map((line) => (
                            <div key={`${trade.id}-receive-${line}`}>{line}</div>
                          ))}
                        </td>
                        <td>
                          <div>
                            Sent:{" "}
                            {isTradeProposer
                              ? trade.proposerAdventureCode || "Not added"
                              : trade.recipientAdventureCode || "Not added"}
                          </div>
                          <div>
                            Received:{" "}
                            {isTradeProposer
                              ? trade.recipientAdventureCode || "Not added"
                              : trade.proposerAdventureCode || "Not added"}
                          </div>
                        </td>
                        <td>
                          <div>
                            Sent: {TRADE_DOWNTIME_DAYS}
                          </div>
                          <div>
                            Received: {TRADE_DOWNTIME_DAYS}
                          </div>
                        </td>
                        {isOwner ? (
                          <td>
                            <TableActionMenu>
                              <Link
                                className="button button-secondary button-small"
                                href={`/player/characters/${character.id}/trades/${trade.id}`}
                              >
                                View trade
                              </Link>
                              <Link
                                className="button button-secondary button-small"
                                href={`/player/characters/${character.id}/trades/${trade.id}/edit`}
                              >
                                Edit trade
                              </Link>
                              <form action={deleteCharacterTrade.bind(null, character.id, trade.id)}>
                                <ConfirmSubmitButton
                                  className="button button-danger button-small"
                                  message="Delete this trade? This cannot be undone."
                                >
                                  Delete trade
                                </ConfirmSubmitButton>
                              </form>
                              {canConfirmTrade ? (
                                <form action={confirmCharacterTrade.bind(null, character.id, trade.id)}>
                                  <button className="button button-secondary button-small" type="submit">
                                    Confirm trade
                                  </button>
                                </form>
                              ) : null}
                            </TableActionMenu>
                          </td>
                        ) : null}
                      </tr>
                    );
                  })
                ) : (
                  <tr>
                    <td className="muted" colSpan={isOwner ? 8 : 7}>
                      No trades logged yet.
                    </td>
                  </tr>
                )}
                {Array.from({ length: tradeLogPlaceholderCount }, (_, index) => (
                  <tr key={`trade-placeholder-${index}`}>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    <td>&nbsp;</td>
                    {isOwner ? <td>&nbsp;</td> : null}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {isOwner ? (
          <div className="list-card stack">
            <img
              alt="Upcoming games divider"
              className="homepage-roster-divider"
              src="/divider4.png"
            />

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
                          <TableActionMenu>
                            <Link
                              className="button button-secondary button-small"
                              href={`/league/games/${participant.game.id}`}
                            >
                              View game
                            </Link>
                          </TableActionMenu>
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
            <div aria-hidden="true" style={whiteLineDividerStyle} />

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
                    Spellbooks Awarded
                    <textarea
                      defaultValue={
                        participant.logSpellbookAwarded ??
                        participant.game.spellbookAwarded ??
                        ""
                      }
                      name="spellbookAwarded"
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
