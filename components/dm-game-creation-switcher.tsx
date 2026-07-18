"use client";

import { useState } from "react";

import { CreateGameForm } from "@/components/create-game-form";
import { GrimoireDmSubmissionForm } from "@/components/grimoire-dm-submission-form";
import type { GameFormInitialValues } from "@/components/game-form";
import type { GrimoireEventSlot, SeasonEvent } from "@/lib/grimoire";

type DmGameCreationSwitcherProps = {
  dmProfile: {
    discord?: string;
    email?: string;
    name?: string;
  };
  eventOptions: SeasonEvent[];
  initialGameValues?: GameFormInitialValues;
  initialEventId?: string;
  playersJson: string;
  slotsByEvent: Record<string, GrimoireEventSlot[]>;
};

type CreationMode = "league" | "event";

export function DmGameCreationSwitcher({
  dmProfile,
  eventOptions,
  initialGameValues,
  initialEventId,
  playersJson,
  slotsByEvent,
}: DmGameCreationSwitcherProps) {
  const [mode, setMode] = useState<CreationMode>("league");

  return (
    <div className="stack">
      <div className="inline-actions" style={{ flexWrap: "wrap" }}>
        <button
          className={mode === "league" ? "button" : "button secondary"}
          onClick={() => {
            setMode("league");
          }}
          type="button"
        >
          Regular league game
        </button>
        <button
          className={mode === "event" ? "button" : "button secondary"}
          onClick={() => {
            setMode("event");
          }}
          type="button"
        >
          Event game
        </button>
      </div>

      {mode === "league" ? (
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>
            {initialGameValues
              ? "Duplicate a previous league game, update the new date and any details you want to change, then save it as a fresh signup."
              : "Create or log a standard league game with participants, rewards, and session notes."}
          </p>
          <CreateGameForm
            initialValuesJson={
              initialGameValues ? JSON.stringify(initialGameValues) : undefined
            }
            playersJson={playersJson}
            submitLabel={initialGameValues ? "Create duplicated game" : undefined}
          />
        </div>
      ) : (
        <div className="stack">
          {eventOptions.length ? (
            <>
              <p className="muted" style={{ margin: 0 }}>
                Submit a curated event game for any published Grimoire event. Choose the event,
                then pick one of its published time slots for admin review.
              </p>
              <section className="list-card stack">
                <div>
                  <p className="eyebrow" style={{ margin: 0 }}>Event Submission</p>
                  <h2 style={{ margin: "0.35rem 0 0" }}>Published Grimoire events</h2>
                  <p className="muted" style={{ margin: "0.5rem 0 0" }}>
                    Choose one of the published events, then select one of that event&apos;s
                    published slots and submit your table for admin review.
                  </p>
                </div>
                <GrimoireDmSubmissionForm
                  events={eventOptions}
                  initialEventId={initialEventId}
                  initialValues={dmProfile}
                  slotsByEvent={slotsByEvent}
                />
              </section>
            </>
          ) : (
            <div className="empty">
              There is no upcoming Grimoire event open for curated event-game submissions yet.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
