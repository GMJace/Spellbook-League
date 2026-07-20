"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { LocalizedEventTime } from "@/components/localized-event-time";
import { PayPalCheckoutButton } from "@/components/paypal-checkout-button";
import {
  formatGrimoireTier,
  formatUsd,
  type GrimoireGame,
  type SeasonEvent,
} from "@/lib/grimoire";
import type { GrimoirePayPalCheckoutPayload } from "@/lib/paypal-checkout-types";

type GrimoireCartBuilderProps = {
  games: GrimoireGame[];
  initialBadgeQuantity: number;
  initialSelectedGameSlugs: string[];
  nextEvent: SeasonEvent;
  paypalClientId: string | null;
};

const FLYING_CARPET_BADGE_MULTIPLIER = 2;

function getConflictingGames(games: GrimoireGame[]) {
  const byStartAt = new Map<string, GrimoireGame[]>();

  for (const game of games) {
    const entries = byStartAt.get(game.startAt) ?? [];
    entries.push(game);
    byStartAt.set(game.startAt, entries);
  }

  return [...byStartAt.values()].filter((entries) => entries.length > 1);
}

export function GrimoireCartBuilder({
  games,
  initialBadgeQuantity,
  initialSelectedGameSlugs,
  nextEvent,
  paypalClientId,
}: GrimoireCartBuilderProps) {
  const [selectedGameQuantities, setSelectedGameQuantities] = useState(() =>
    Object.fromEntries(
      initialSelectedGameSlugs
        .filter((slug) => games.some((game) => game.slug === slug))
        .map((slug) => [slug, 1]),
    ) as Record<string, number>,
  );
  const [badgeQuantity, setBadgeQuantity] = useState(initialBadgeQuantity);
  const [badgeType, setBadgeType] = useState<"REGULAR" | "FLYING_CARPET">("REGULAR");
  const [conflictAcknowledged, setConflictAcknowledged] = useState(false);
  const [isGiftPurchase, setIsGiftPurchase] = useState(false);
  const [receiverEmails, setReceiverEmails] = useState<string[]>([""]);
  const regularBadgeLabel = nextEvent.ticketLabel;
  const regularBadgePriceUsd = nextEvent.ticketPriceUsd;
  const flyingCarpetBadgeLabel = "Flying Carpet Badge";
  const flyingCarpetBadgePriceUsd = nextEvent.ticketPriceUsd * FLYING_CARPET_BADGE_MULTIPLIER;
  const selectedBadgeLabel =
    badgeType === "FLYING_CARPET" ? flyingCarpetBadgeLabel : regularBadgeLabel;
  const selectedBadgePriceUsd =
    badgeType === "FLYING_CARPET" ? flyingCarpetBadgePriceUsd : regularBadgePriceUsd;
  const selectedBadgePriceText = formatUsd(selectedBadgePriceUsd);

  useEffect(() => {
    const desiredCount = Math.max(badgeQuantity, 1);

    setReceiverEmails((current) => {
      if (current.length === desiredCount) {
        return current;
      }

      if (current.length > desiredCount) {
        return current.slice(0, desiredCount);
      }

      return [...current, ...Array.from({ length: desiredCount - current.length }, () => "")];
    });
  }, [badgeQuantity]);

  const selectedGames = useMemo(
    () => games.filter((game) => (selectedGameQuantities[game.slug] ?? 0) > 0),
    [games, selectedGameQuantities],
  );
  const conflictingGameGroups = useMemo(
    () => getConflictingGames(selectedGames),
    [selectedGames],
  );
  const subtotal =
    badgeQuantity * selectedBadgePriceUsd +
    selectedGames.reduce(
      (total, game) =>
        total + game.ticketPriceUsd * (selectedGameQuantities[game.slug] ?? 0),
      0,
    );
  const hasSelections = badgeQuantity > 0 || selectedGames.length > 0;
  const requiresConflictAcknowledgement = conflictingGameGroups.length > 0;
  const canCheckout =
    hasSelections && (!requiresConflictAcknowledgement || conflictAcknowledged);
  const filledReceiverEmails = receiverEmails
    .map((email) => email.trim())
    .filter(Boolean);
  const checkoutSummary = [
    badgeQuantity > 0
      ? `${selectedBadgeLabel} x${badgeQuantity} (${selectedBadgePriceText})`
      : null,
    ...selectedGames.map(
      (game) =>
        `${game.game} x${selectedGameQuantities[game.slug] ?? 0} (${game.ticketPrice})`,
    ),
    isGiftPurchase && filledReceiverEmails.length > 0
      ? `Receivers: ${filledReceiverEmails.join(", ")}`
      : isGiftPurchase
        ? "Gift purchase"
        : null,
  ]
    .filter(Boolean)
    .join(" | ");
  const checkoutPayload: GrimoirePayPalCheckoutPayload = {
    checkoutType: "GRIMOIRE",
    badgeQuantity,
    badgeType,
    isGiftPurchase,
    receiverEmails: receiverEmails.map((email) => email.trim()).filter(Boolean),
    items: selectedGames.map((game) => ({
      quantity: selectedGameQuantities[game.slug] ?? 0,
      slug: game.slug,
    })),
  };

  return (
    <div className="stack">
      <div className="grid two ggcon-cart-grid">
        <section className="card ledger-panel stack">
          <div className="stack" style={{ gap: "0.45rem" }}>
            <p className="eyebrow">Customize Purchase</p>
            <h1 style={{ margin: 0 }}>Grimoire Cart</h1>
            <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
              Build your badge and game ticket bundle before continuing to PayPal.
            </p>
          </div>

          <div className="list-card stack">
            <div className="section-heading">
              <h2 style={{ margin: 0 }}>Badge</h2>
            </div>
            <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
              A convention badge is required to purchase game tickets. Each
              attendee needs one badge, and one badge allows you to buy tickets
              for any number of games.
            </p>
            <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
              DMs receive an included convention badge as part of the event.
            </p>
            <label className="ggcon-checkbox-row">
              <span>
                {selectedBadgeLabel} for {nextEvent.displayDate}
              </span>
              <span className="pill">{selectedBadgePriceText}</span>
            </label>
            <div className="search-row">
              <label className="stack" style={{ gap: "0.35rem", flex: 1 }}>
                <span className="muted">Badge classification</span>
                <select
                  value={badgeType}
                  onChange={(event) =>
                    setBadgeType(event.target.value as "REGULAR" | "FLYING_CARPET")
                  }
                >
                  <option value="REGULAR">
                    {regularBadgeLabel} ({formatUsd(regularBadgePriceUsd)})
                  </option>
                  <option value="FLYING_CARPET">
                    {flyingCarpetBadgeLabel} ({formatUsd(flyingCarpetBadgePriceUsd)})
                  </option>
                </select>
              </label>
              <label className="stack" style={{ gap: "0.35rem", flex: 1 }}>
                <span className="muted">Badge quantity</span>
                <select
                  value={badgeQuantity}
                  onChange={(event) => setBadgeQuantity(Number(event.target.value))}
                >
                  <option value={0}>No badge</option>
                  <option value={1}>1 badge</option>
                  <option value={2}>2 badges</option>
                  <option value={3}>3 badges</option>
                  <option value={4}>4 badges</option>
                  <option value={5}>5 badges</option>
                  <option value={6}>6 badges</option>
                </select>
              </label>
            </div>
          </div>
        </section>

        <section className="card ledger-panel stack">
          <div className="stack" style={{ gap: "0.45rem" }}>
            <p className="eyebrow">Summary</p>
            <h2 style={{ margin: 0 }}>Cart total</h2>
          </div>

          <div className="list-card stack">
            {hasSelections ? (
              [
                ...(badgeQuantity > 0
                  ? [
                      <div className="ggcon-summary-line" key="badge-summary">
                        <span>
                          {selectedBadgeLabel} x{badgeQuantity}
                        </span>
                        <strong>{formatUsd(selectedBadgePriceUsd * badgeQuantity)}</strong>
                      </div>,
                    ]
                  : []),
                ...selectedGames.map((game) => (
                  <div className="ggcon-summary-line" key={game.slug}>
                    <span>
                      {game.game} x{selectedGameQuantities[game.slug] ?? 0}
                    </span>
                    <strong>
                      {formatUsd(
                        game.ticketPriceUsd * (selectedGameQuantities[game.slug] ?? 0),
                      )}
                    </strong>
                  </div>
                )),
                <div className="ggcon-summary-total" key="subtotal-summary">
                  <span>Subtotal</span>
                  <strong>{formatUsd(subtotal)}</strong>
                </div>,
              ]
            ) : (
              <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                Add a badge or at least one game ticket to start checkout.
              </p>
            )}
          </div>

          <div className="list-card stack">
            <div className="section-heading">
              <h2 style={{ margin: 0 }}>Checkout</h2>
            </div>
            <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
              Selected items: {checkoutSummary || "Nothing selected yet."}
            </p>

            {requiresConflictAcknowledgement ? (
              <div className="ggcon-conflict-notice stack">
                <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                  You have selected multiple games in the same time slot. Please
                  confirm that you understand these tickets conflict before continuing.
                </p>
                <div className="stack" style={{ gap: "0.45rem" }}>
                  {conflictingGameGroups.map((group) => (
                    <p
                      className="muted ggcon-meta-note"
                      key={group.map((game) => game.slug).join("-")}
                      style={{ margin: 0 }}
                    >
                      <strong>Conflict:</strong>{" "}
                      {group.map((game) => game.game).join(" / ")}
                    </p>
                  ))}
                </div>
                <label className="ggcon-inline-checkbox">
                  <input
                    checked={conflictAcknowledged}
                    onChange={(event) => setConflictAcknowledged(event.target.checked)}
                    type="checkbox"
                  />
                  <span>I understand these selected tickets overlap in time.</span>
                </label>
              </div>
            ) : null}

            <div className="ggcon-gift-box stack">
              <label className="ggcon-inline-checkbox">
                <input
                  checked={isGiftPurchase}
                  onChange={(event) => setIsGiftPurchase(event.target.checked)}
                  type="checkbox"
                />
                <span>
                  I am gifting a badge or ticket, or purchasing for someone else.
                </span>
              </label>

              {isGiftPurchase ? (
                <div className="stack" style={{ gap: "0.75rem" }}>
                  {receiverEmails.map((email, index) => (
                    <label className="stack" key={index} style={{ gap: "0.35rem" }}>
                      <span className="muted">
                        Receiver email {index + 1} (optional)
                      </span>
                      <input
                        onChange={(event) =>
                          setReceiverEmails((current) =>
                            current.map((entry, entryIndex) =>
                              entryIndex === index ? event.target.value : entry,
                            ),
                          )
                        }
                        placeholder="friend@example.com"
                        type="email"
                        value={email}
                      />
                    </label>
                  ))}
                </div>
              ) : null}

              <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                If provided, we&apos;ll use this email to send purchase notifications,
                event directions, and convention information directly to the recipient.
              </p>
            </div>

            <PayPalCheckoutButton
              clientId={paypalClientId}
              disabled={!canCheckout}
              disabledText="Continue to PayPal"
              payload={checkoutPayload}
            />

            <div className="inline-actions" style={{ flexWrap: "wrap" }}>
              <Link className="button secondary" href="/grimoire-gathering">
                Back to Grimoire
              </Link>
              {selectedGames.length === 1 ? (
                <Link
                  className="button secondary"
                  href={`/grimoire-gathering/games/${selectedGames[0].slug}`}
                >
                  Review selected game
                </Link>
              ) : null}
            </div>
          </div>
        </section>
      </div>

      <section className="card ledger-panel stack ggcon-cart-tickets-card">
        <div className="section-heading">
          <h2 style={{ margin: 0 }}>Game Tickets</h2>
        </div>
        <div className="ggcon-ticket-grid">
          {games.map((game) => {
            const selectedQuantity = selectedGameQuantities[game.slug] ?? 0;
            const openSeats = Math.max(game.seatCapacity - game.signedUp.length, 0);

            return (
              <label key={game.slug} className="ggcon-ticket-option">
                <div className="stack" style={{ gap: "0.35rem" }}>
                  <strong>{game.game}</strong>
                  <span className="muted ggcon-meta-note">
                    <LocalizedEventTime isoString={game.startAt} /> ·{" "}
                    {formatGrimoireTier(game.tier)} · DM {game.dm}
                  </span>
                  <span className="muted ggcon-meta-note">{game.summary}</span>
                  <span className="muted ggcon-meta-note">
                    Open seats: {openSeats}
                  </span>
                  <label className="stack ggcon-ticket-quantity" style={{ gap: "0.35rem" }}>
                    <span className="muted">Tickets</span>
                    <select
                      value={selectedQuantity}
                      onChange={(event) =>
                        setSelectedGameQuantities((current) => ({
                          ...current,
                          [game.slug]: Number(event.target.value),
                        }))
                      }
                    >
                      {Array.from({ length: openSeats + 1 }, (_, index) => (
                        <option key={index} value={index}>
                          {index === 0 ? "No tickets" : `${index} ticket${index === 1 ? "" : "s"}`}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>
                <span className="pill">{game.ticketPrice}</span>
              </label>
            );
          })}
        </div>
      </section>
    </div>
  );
}
