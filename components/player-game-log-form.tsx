"use client";

import { useFormStatus } from "react-dom";

import {
  createPlayerGameLog,
  updatePlayerGameLog,
} from "@/app/player/characters/[id]/games/actions";
import { DatePickerField } from "@/components/date-picker-field";

export type PlayerGameLogInitialValues = {
  title: string;
  adventureCode: string;
  datePlayed: string;
  tier: "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";
  dmName: string;
  rewardsSummary: string;
  magicItemsAwarded: string;
  consumablesAwarded: string;
  sessionNotes: string;
};

const tiers = [
  { value: "TIER_1", label: "Tier 1" },
  { value: "TIER_2", label: "Tier 2" },
  { value: "TIER_3", label: "Tier 3" },
  { value: "TIER_4", label: "Tier 4" },
];

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return <button type="submit">{pending ? "Saving..." : label}</button>;
}

export function PlayerGameLogForm({
  characterId,
  gameId,
  initialValues,
  submitLabel,
}: {
  characterId: string;
  gameId?: string;
  initialValues?: PlayerGameLogInitialValues;
  submitLabel: string;
}) {
  const formAction = gameId ? updatePlayerGameLog : createPlayerGameLog;

  return (
    <form action={formAction} className="form-stack">
      <input name="characterId" type="hidden" value={characterId} />
      {gameId ? <input name="gameId" type="hidden" value={gameId} /> : null}
      <div className="form-grid">
        <label>
          Game title
          <input
            defaultValue={initialValues?.title ?? ""}
            name="title"
            required
            type="text"
          />
        </label>
        <label>
          Adventure code
          <input
            defaultValue={initialValues?.adventureCode ?? ""}
            name="adventureCode"
            required
            type="text"
          />
        </label>
        <DatePickerField
          defaultValue={initialValues?.datePlayed ?? ""}
          label="Date played"
          name="datePlayed"
          required
        />
        <label>
          Tier
          <select defaultValue={initialValues?.tier ?? "TIER_1"} name="tier">
            {tiers.map((tier) => (
              <option key={tier.value} value={tier.value}>
                {tier.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Dungeon Master
          <input
            defaultValue={initialValues?.dmName ?? ""}
            name="dmName"
            required
            placeholder="Name of the Dungeon Master"
            type="text"
          />
        </label>
      </div>

      <input name="status" type="hidden" value="COMPLETED" />

      <label>
        Awarded Gold
        <textarea
          defaultValue={initialValues?.rewardsSummary ?? ""}
          name="rewardsSummary"
        />
      </label>
      <label>
        Magic items awarded
        <textarea
          defaultValue={initialValues?.magicItemsAwarded ?? ""}
          name="magicItemsAwarded"
        />
      </label>
      <label>
        Consumables awarded
        <textarea
          defaultValue={initialValues?.consumablesAwarded ?? ""}
          name="consumablesAwarded"
        />
      </label>
      <label>
        Session notes/Story Awards
        <textarea
          defaultValue={initialValues?.sessionNotes ?? ""}
          name="sessionNotes"
        />
      </label>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
