"use client";

import { useState } from "react";

import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import type { RateDmGameOption } from "@/lib/pro-dm-rating";

const SPELLBOOK_RATING_EMAIL = "jace@spellbookpublishing.com";
const EMAIL_SUBJECT = "Rate a DM";

function buildMailtoLink({
  dmName,
  game,
  date,
  rating,
  notes,
}: {
  dmName: string;
  game: string;
  date: string;
  rating: number;
  notes: string;
}) {
  const body = [
    `DM: ${dmName}`,
    `Game: ${game}`,
    `Date: ${date}`,
    `Rating: ${rating}/5`,
    "",
    "Notes:",
    notes || "No additional notes provided.",
  ].join("\n");

  return `mailto:${encodeURIComponent(
    SPELLBOOK_RATING_EMAIL
  )}?subject=${encodeURIComponent(EMAIL_SUBJECT)}&body=${encodeURIComponent(body)}`;
}

export function RateDmForm({
  userId,
  dmName,
  eligibleGames,
}: {
  userId: string;
  dmName: string;
  eligibleGames: RateDmGameOption[];
}) {
  const [gameId, setGameId] = useState(eligibleGames[0]?.id ?? "");
  const [rating, setRating] = useState("5");
  const [notes, setNotes] = useState("");
  const [error, setError] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const selectedGame =
    eligibleGames.find((entry) => entry.id === gameId) ?? eligibleGames[0] ?? null;

  const today = new Date();
  const maxDate = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(
    2,
    "0"
  )}-${String(today.getDate()).padStart(2, "0")}`;

  return (
    <form
      className="form-stack"
      onSubmit={async (event) => {
        event.preventDefault();
        setError("");

        if (!selectedGame) {
          setError("Choose a completed game you played with this DM before submitting.");
          return;
        }

        if (selectedGame.date > maxDate) {
          setError("You can only rate games that have already been played.");
          return;
        }

        setIsSubmitting(true);

        try {
          const response = await fetch("/api/rate-dm", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              userId,
              gameId: selectedGame.id,
              game: selectedGame.game,
              date: selectedGame.date,
              rating: Number(rating),
              notes,
            }),
          });

          if (!response.ok) {
            const payload = (await response.json().catch(() => null)) as { error?: string } | null;

            throw new Error(payload?.error ?? "Unable to save the DM rating right now.");
          }

          window.location.href = buildMailtoLink({
            dmName,
            game: selectedGame.game,
            date: selectedGame.date,
            rating: Number(rating),
            notes,
          });
        } catch (submissionError) {
          setError(
            submissionError instanceof Error
              ? submissionError.message
              : "Unable to save the DM rating right now."
          );
          setIsSubmitting(false);
          return;
        }

        setIsSubmitting(false);
      }}
    >
      <div className="list-card stack">
        <div>
          <h2 style={{ margin: 0 }}>Rate this professional DM</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            Saving this form updates the public rating, then opens an email draft to
            <RainbowSpellbook /> with the same feedback. Only completed games
            already tied to your account can be selected here.
          </p>
        </div>

        <label>
          Game
          <select
            name="gameId"
            onChange={(event) => setGameId(event.target.value)}
            required
            value={gameId}
          >
            {eligibleGames.length ? (
              eligibleGames.map((game) => (
                <option key={game.id} value={game.id}>
                  {game.optionLabel}
                </option>
              ))
            ) : (
              <option value="">No completed games available to rate</option>
            )}
          </select>
        </label>

        <label>
          Date
          <input
            name="date"
            disabled={!selectedGame}
            max={maxDate}
            readOnly
            required
            type="date"
            value={selectedGame?.date ?? ""}
          />
        </label>

        <label>
          Rating
          <select
            name="rating"
            onChange={(event) => setRating(event.target.value)}
            value={rating}
          >
            {[5, 4, 3, 2, 1].map((value) => (
              <option key={value} value={value}>
                {value} star{value === 1 ? "" : "s"}
              </option>
            ))}
          </select>
        </label>

        <label>
          Notes
          <textarea
            name="notes"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Share what worked well, table style notes, or feedback worth passing to SPELLBOOK."
            rows={6}
            value={notes}
          />
        </label>

        {error ? <p style={{ color: "#ffffff", margin: 0 }}>{error}</p> : null}
      </div>

      <button disabled={isSubmitting || !selectedGame} type="submit">
        {isSubmitting ? "Saving..." : "Submit Rating"}
      </button>
    </form>
  );
}
