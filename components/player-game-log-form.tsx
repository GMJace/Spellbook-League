"use client";

import { useFormStatus } from "react-dom";

import {
  createPlayerGameLog,
  updatePlayerGameLog,
} from "@/app/player/characters/[id]/games/actions";
import { BulletTextarea } from "@/components/bullet-textarea";
import { DatePickerField } from "@/components/date-picker-field";
import { GameRewardFields } from "@/components/game-reward-fields";

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
  legalBlessingOptions = [],
  legalBoonOptions = [],
  legalBuildMagicItemOptions = [],
  legalCharmOptions = [],
  legalCommonMagicItemOptions = [],
  legalConsumableOptions = [],
  legalMinorPropertyOptions = [],
  metadataLocked = false,
  showTierField = true,
  submitLabel,
}: {
  characterId: string;
  gameId?: string;
  initialValues?: PlayerGameLogInitialValues;
  legalBlessingOptions?: string[];
  legalBoonOptions?: string[];
  legalBuildMagicItemOptions?: string[];
  legalCharmOptions?: string[];
  legalCommonMagicItemOptions?: string[];
  legalConsumableOptions?: string[];
  legalMinorPropertyOptions?: string[];
  metadataLocked?: boolean;
  showTierField?: boolean;
  submitLabel: string;
}) {
  const formAction = gameId ? updatePlayerGameLog : createPlayerGameLog;
  const fieldBlockStyle = { gap: "0.35rem" } as const;
  const resolvedTier = initialValues?.tier ?? "TIER_1";

  return (
    <form action={formAction} className="form-stack">
      <input name="characterId" type="hidden" value={characterId} />
      {gameId ? <input name="gameId" type="hidden" value={gameId} /> : null}
      {metadataLocked ? (
        <input name="datePlayed" type="hidden" value={initialValues?.datePlayed ?? ""} />
      ) : null}
      {!showTierField ? <input name="tier" type="hidden" value={resolvedTier} /> : null}
      <input name="status" type="hidden" value="COMPLETED" />

      {metadataLocked ? (
        <div className="list-card stack" style={{ gap: "0.35rem" }}>
          <p className="muted" style={{ margin: 0 }}>
            This log was submitted by a DM. You can edit your rewards and notes here,
            but the game details stay read-only.
          </p>
        </div>
      ) : null}

      <div className="form-grid">
        <div className="stack" style={fieldBlockStyle}>
          <label>
            Game title
            <input
              readOnly={metadataLocked}
              defaultValue={initialValues?.title ?? ""}
              name="title"
              required
              type="text"
            />
          </label>
        </div>
        <div className="stack" style={fieldBlockStyle}>
          <label>
            Adventure code
            <input
              readOnly={metadataLocked}
              defaultValue={initialValues?.adventureCode ?? ""}
              name="adventureCode"
              required
              type="text"
            />
          </label>
        </div>
        <div className="stack" style={fieldBlockStyle}>
          <DatePickerField
            defaultValue={initialValues?.datePlayed ?? ""}
            disabled={metadataLocked}
            label="Date played"
            name="datePlayed"
            required
          />
        </div>
        {showTierField ? (
          <div className="stack" style={fieldBlockStyle}>
            <label>
              Tier
              <select defaultValue={resolvedTier} name="tier">
                {tiers.map((tier) => (
                  <option key={tier.value} value={tier.value}>
                    {tier.label}
                  </option>
                ))}
              </select>
            </label>
          </div>
        ) : null}
        <div className="stack" style={fieldBlockStyle}>
          <label>
            Dungeon Master
            <input
              readOnly={metadataLocked}
              defaultValue={initialValues?.dmName ?? ""}
              name="dmName"
              required
              placeholder="Name of the Dungeon Master"
              type="text"
            />
          </label>
        </div>
      </div>

      <div className="form-grid">
        <div className="stack" style={fieldBlockStyle}>
          <label>
            Awarded Gold (Total in GP)
            <input
              defaultValue={initialValues?.rewardsSummary ?? ""}
              name="rewardsSummary"
              type="text"
            />
          </label>
        </div>
      </div>

      <GameRewardFields
        initialConsumablesAwarded={initialValues?.consumablesAwarded ?? ""}
        initialMagicItemsAwarded={initialValues?.magicItemsAwarded ?? ""}
        legalBlessingOptions={legalBlessingOptions}
        legalBoonOptions={legalBoonOptions}
        legalBuildMagicItemOptions={legalBuildMagicItemOptions}
        legalCharmOptions={legalCharmOptions}
        legalCommonMagicItemOptions={legalCommonMagicItemOptions}
        legalConsumableOptions={legalConsumableOptions}
        legalMinorPropertyOptions={legalMinorPropertyOptions}
      />

      <label>
        Session notes/Story Awards
        <BulletTextarea
          defaultValue={initialValues?.sessionNotes ?? ""}
          name="sessionNotes"
        />
      </label>
      <p className="muted" style={{ margin: 0 }}>
        Each line is a bullet point.
      </p>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
