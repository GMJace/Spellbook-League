"use client";

import { useState } from "react";

import { CreateGameForm } from "@/components/create-game-form";
import { GrimoireDmSubmissionForm } from "@/components/grimoire-dm-submission-form";
import type { GameFormInitialValues } from "@/components/game-form";
import type { LegalRewardOptions } from "@/lib/game-reward-selections";
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
  legalRewardsJson: string;
  playersJson: string;
  slotsByEvent: Record<string, GrimoireEventSlot[]>;
};

type CreationMode = "league" | "event";

export function DmGameCreationSwitcher({
  dmProfile,
  eventOptions,
  initialGameValues,
  initialEventId,
  legalRewardsJson,
  playersJson,
  slotsByEvent,
}: DmGameCreationSwitcherProps) {
  const [mode, setMode] = useState<CreationMode>("league");

  const modeControls = (
    <div className="inline-actions" style={{ flexWrap: "wrap" }}>
        <button
          className={mode === "league" ? "button" : "button secondary"}
          onClick={() => {
            setMode("league");
          }}
          type="button"
        >
          SPELLBOOK QUESTS game
        </button>
        <button
          className={mode === "event" ? "button" : "button secondary"}
          onClick={() => {
            setMode("event");
          }}
          type="button"
        >
          Grimoire Event Game
        </button>
      </div>
  );

  return (
    <div className="stack">


      {mode === "league" ? (
        <div className="stack">
          <CreateGameForm
            setupHeader={<>{modeControls}<p className="muted" style={{ margin: 0 }}>
            {initialGameValues
              ? "Duplicate a previous league game, update the new date and any details you want to change, then save it as a fresh signup."
              : "Create or log a SPELLBOOK QUEST or GRIMOIRE Game"}
          </p></>}
            initialValuesJson={
              initialGameValues ? JSON.stringify(initialGameValues) : undefined
            }
            legalRewardsJson={legalRewardsJson}
            playersJson={playersJson}
            submitLabel={initialGameValues ? "Create duplicated game" : undefined}
          />
        </div>
      ) : (
        <GrimoireDmSubmissionForm
          setupHeader={<>{modeControls}<p className="muted" style={{ margin: 0 }}>Create or log a SPELLBOOK QUEST or GRIMOIRE Game</p></>}
          events={eventOptions}
          initialEventId={initialEventId}
          initialValues={dmProfile}
          legalRewardsJson={legalRewardsJson}
          slotsByEvent={slotsByEvent}
        />
      )}
    </div>
  );
}
