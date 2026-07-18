"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { LocalizedEventTime } from "@/components/localized-event-time";
import { PayPalCheckoutButton } from "@/components/paypal-checkout-button";
import type { LeaguePayPalCheckoutPayload } from "@/lib/paypal-checkout-types";
import { formatTier, formatUsd } from "@/lib/utils";

type LeagueCartGame = {
  id: string;
  title: string;
  adventureCode: string;
  datePlayed: string;
  dmName: string;
  tier: "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";
  ticketPrice: string;
  ticketPriceUsd: number;
  seatCapacity: number;
  participantCount: number;
};

type LeagueCartBuilderProps = {
  games: LeagueCartGame[];
  initialSelectedGameIds: string[];
  paypalClientId: string | null;
};

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/i;

function isValidEmailAddress(value: string) {
  return EMAIL_PATTERN.test(value.trim());
}

export function LeagueCartBuilder({
  games,
  initialSelectedGameIds,
  paypalClientId,
}: LeagueCartBuilderProps) {
  const [selectedGameQuantities, setSelectedGameQuantities] = useState(() =>
    Object.fromEntries(
      initialSelectedGameIds
        .filter((id) => games.some((game) => game.id === id))
        .map((id) => [id, 1]),
    ) as Record<string, number>,
  );
  const [guestEmailsByGame, setGuestEmailsByGame] = useState<Record<string, string[]>>({});

  const updateSelectedQuantity = (gameId: string, quantity: number) => {
    setSelectedGameQuantities((current) => ({
      ...current,
      [gameId]: quantity,
    }));
    setGuestEmailsByGame((current) => {
      const nextEmails = current[gameId] ?? [];
      const guestTicketCount = Math.max(quantity - 1, 0);

      return {
        ...current,
        [gameId]: nextEmails.slice(0, guestTicketCount).concat(
          Array.from({ length: Math.max(guestTicketCount - nextEmails.length, 0) }, () => ""),
        ),
      };
    });
  };

  const updateGuestEmail = (gameId: string, index: number, value: string) => {
    setGuestEmailsByGame((current) => {
      const nextEmails = [...(current[gameId] ?? [])];
      nextEmails[index] = value;

      return {
        ...current,
        [gameId]: nextEmails,
      };
    });
  };

  const selectedGames = useMemo(
    () => games.filter((game) => (selectedGameQuantities[game.id] ?? 0) > 0),
    [games, selectedGameQuantities],
  );
  const subtotal = selectedGames.reduce(
    (total, game) => total + game.ticketPriceUsd * (selectedGameQuantities[game.id] ?? 0),
    0,
  );
  const hasSelections = selectedGames.length > 0;
  const guestEmailIssues = selectedGames.flatMap((game) => {
    const quantity = selectedGameQuantities[game.id] ?? 0;
    const requiredGuestCount = Math.max(quantity - 1, 0);
    const guestEmails = (guestEmailsByGame[game.id] ?? []).slice(0, requiredGuestCount);

    return guestEmails.map((email, index) => ({
      email,
      gameId: game.id,
      index,
      valid: isValidEmailAddress(email),
    }));
  });
  const hasIncompleteGuestEmails = guestEmailIssues.some((entry) => !entry.valid);
  const checkoutSummary = selectedGames
    .map((game) => {
      const guestEmails = (guestEmailsByGame[game.id] ?? [])
        .slice(0, Math.max((selectedGameQuantities[game.id] ?? 0) - 1, 0))
        .map((email) => email.trim())
        .filter(Boolean);

      const guestEmailSummary = guestEmails.length
        ? `; Guest emails: ${guestEmails.join(", ")}`
        : "";

      return `${game.title} x${selectedGameQuantities[game.id] ?? 0} (${game.ticketPrice})${guestEmailSummary}`;
    })
    .join(" | ");
  const checkoutPayload: LeaguePayPalCheckoutPayload = {
    checkoutType: "LEAGUE",
    items: selectedGames.map((game) => ({
      gameId: game.id,
      guestEmails: (guestEmailsByGame[game.id] ?? [])
        .slice(0, Math.max((selectedGameQuantities[game.id] ?? 0) - 1, 0))
        .map((email) => email.trim())
        .filter(Boolean),
      quantity: selectedGameQuantities[game.id] ?? 0,
    })),
  };

  return (
    <div className="stack">
      <div className="grid two ggcon-cart-grid">
        <section className="card ledger-panel stack">
          <div className="stack" style={{ gap: "0.45rem" }}>
            <p className="eyebrow">Customize Purchase</p>
            <h1 style={{ margin: 0 }}>League Cart</h1>
            <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
              Add priced league games to your cart before continuing to checkout.
            </p>
          </div>

          <div className="list-card stack">
            <div className="section-heading">
              <h2 style={{ margin: 0 }}>Checkout summary</h2>
            </div>
            {hasSelections ? (
              <div className="stack" style={{ gap: "0.75rem" }}>
                {selectedGames.map((game) => {
                  const guestEmails = (guestEmailsByGame[game.id] ?? [])
                    .slice(0, Math.max((selectedGameQuantities[game.id] ?? 0) - 1, 0))
                    .map((email) => email.trim())
                    .filter(Boolean);

                  return (
                    <div className="stack league-cart-summary-item" key={game.id} style={{ gap: "0.35rem" }}>
                      <div className="ggcon-summary-line">
                        <span>
                          {game.title} x{selectedGameQuantities[game.id] ?? 0}
                        </span>
                        <strong>
                          {formatUsd(game.ticketPriceUsd * (selectedGameQuantities[game.id] ?? 0))}
                        </strong>
                      </div>
                      {guestEmails.length ? (
                        <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                          Extra tickets: {guestEmails.join(", ")}
                        </p>
                      ) : null}
                    </div>
                  );
                })}
                <div className="ggcon-summary-total">
                  <span>Subtotal</span>
                  <strong>{formatUsd(subtotal)}</strong>
                </div>
              </div>
            ) : (
              <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                Add at least one priced league game to start checkout.
              </p>
            )}
          </div>

          <div className="list-card stack">
            <div className="section-heading">
              <h2 style={{ margin: 0 }}>PayPal checkout</h2>
            </div>
            <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
              Selected items: {checkoutSummary || "Nothing selected yet."}
            </p>
            {hasIncompleteGuestEmails ? (
              <p className="muted ggcon-meta-note league-cart-warning" style={{ margin: 0 }}>
                Enter a valid email for each extra ticket before checkout.
              </p>
            ) : null}

            <PayPalCheckoutButton
              clientId={paypalClientId}
              disabled={!hasSelections || hasIncompleteGuestEmails}
              disabledText="Continue to PayPal"
              payload={checkoutPayload}
            />

            <div className="inline-actions" style={{ flexWrap: "wrap" }}>
              <Link className="button secondary" href="/league">
                Back to League
              </Link>
              {selectedGames.length === 1 ? (
                <Link className="button secondary" href={`/league/games/${selectedGames[0].id}`}>
                  Review selected game
                </Link>
              ) : null}
            </div>
          </div>
        </section>

        <section className="card ledger-panel stack ggcon-cart-tickets-card">
          <div className="section-heading">
            <h2 style={{ margin: 0 }}>Priced league games</h2>
          </div>
          <div className="ggcon-ticket-grid league-ticket-grid">
            {games.map((game) => {
              const selectedQuantity = selectedGameQuantities[game.id] ?? 0;
              const openSeats = Math.max(game.seatCapacity - game.participantCount, 0);
              const guestEmails = (guestEmailsByGame[game.id] ?? []).slice(
                0,
                Math.max(selectedQuantity - 1, 0),
              );

              return (
                <div className="ggcon-ticket-option" key={game.id}>
                  <div className="stack" style={{ gap: "0.35rem" }}>
                    <strong>{game.title}</strong>
                    <span className="muted ggcon-meta-note">{game.dmName}</span>
                    <span className="muted ggcon-meta-note">{game.adventureCode}</span>
                    <span className="muted ggcon-meta-note">
                      <LocalizedEventTime isoString={game.datePlayed} /> · {formatTier(game.tier)}
                    </span>
                    <span className="muted ggcon-meta-note">Open seats: {openSeats}</span>
                    <label className="stack ggcon-ticket-quantity" style={{ gap: "0.35rem" }}>
                      <span className="muted">Tickets</span>
                      <select
                        value={selectedQuantity}
                        onChange={(event) =>
                          updateSelectedQuantity(game.id, Number(event.target.value))
                        }
                      >
                        {Array.from({ length: openSeats + 1 }, (_, index) => (
                          <option key={index} value={index}>
                            {index === 0 ? "No tickets" : `${index} ticket${index === 1 ? "" : "s"}`}
                          </option>
                        ))}
                      </select>
                    </label>
                    {selectedQuantity > 1 ? (
                      <div className="stack league-cart-guest-email-group" style={{ gap: "0.5rem" }}>
                        <span className="muted ggcon-meta-note">
                          OPTIONAL. Enter the email for each additional player ticket.
                        </span>
                        {guestEmails.map((email, index) => (
                          <label
                            className="stack league-cart-guest-email-field"
                            key={`${game.id}-guest-${index}`}
                            style={{ gap: "0.35rem" }}
                          >
                            <span className="muted">Additional ticket {index + 2} email</span>
                            <input
                              onChange={(event) =>
                                updateGuestEmail(game.id, index, event.target.value)
                              }
                              placeholder="player@example.com"
                              type="email"
                              value={email}
                            />
                          </label>
                        ))}
                      </div>
                    ) : null}
                  </div>
                  <span className="pill">{game.ticketPrice}</span>
                </div>
              );
            })}
          </div>
        </section>
      </div>
    </div>
  );
}
