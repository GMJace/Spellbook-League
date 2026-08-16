"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";

import {
  createPlayerGameLog,
  updatePlayerGameLog,
} from "@/app/player/characters/[id]/games/actions";
import { lookupAdventureCatalogAutofill } from "@/lib/adventure-catalog-client";
import { BulletTextarea } from "@/components/bullet-textarea";
import { DatePickerField } from "@/components/date-picker-field";
import { GameRewardFields } from "@/components/game-reward-fields";

export type PlayerGameLogInitialValues = {
  title: string;
  adventureCode: string;
  source: string;
  datePlayed: string;
  tier: "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";
  dmName: string;
  rewardsSummary: string;
  magicItemsAwarded: string;
  consumablesAwarded: string;
  spellbookAwarded: string;
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
  const [titleValue, setTitleValue] = useState(initialValues?.title ?? "");
  const [adventureCodeValue, setAdventureCodeValue] = useState(
    initialValues?.adventureCode ?? ""
  );
  const [sourceValue, setSourceValue] = useState(initialValues?.source ?? "");
  const [tierValue, setTierValue] = useState(initialValues?.tier ?? "TIER_1");
  const [rewardsSummaryValue, setRewardsSummaryValue] = useState(
    initialValues?.rewardsSummary ?? ""
  );
  const [magicItemsAwardedValue, setMagicItemsAwardedValue] = useState(
    initialValues?.magicItemsAwarded ?? ""
  );
  const [consumablesAwardedValue, setConsumablesAwardedValue] = useState(
    initialValues?.consumablesAwarded ?? ""
  );
  const [spellbookAwardedValue, setSpellbookAwardedValue] = useState(
    initialValues?.spellbookAwarded ?? ""
  );
  const [sessionNotesValue, setSessionNotesValue] = useState(
    initialValues?.sessionNotes ?? ""
  );
  const [autofillMessage, setAutofillMessage] = useState("");
  const [dmNameValue, setDmNameValue] = useState(initialValues?.dmName ?? "");
  const resolvedTier = tierValue;

  async function autofillAdventureDetails() {
    if (!titleValue.trim() && !adventureCodeValue.trim()) {
      setAutofillMessage("");
      return;
    }

    try {
      const { match } = await lookupAdventureCatalogAutofill({
        adventureCode: adventureCodeValue,
        title: titleValue,
      });

      if (!match) {
        setAutofillMessage("No saved adventure matched that title or code yet.");
        return;
      }

      setTitleValue(match.title);
      setAdventureCodeValue(match.adventureCode);
      setSourceValue(match.source);
      setTierValue(match.tier);
      setRewardsSummaryValue(match.rewardsSummary);
      setMagicItemsAwardedValue(match.magicItemsAwarded);
      setConsumablesAwardedValue(match.consumablesAwarded);
      setSpellbookAwardedValue(match.spellbookAwarded);
      setSessionNotesValue(match.sessionNotes);
      setAutofillMessage(`Loaded adventure details for ${match.adventureCode}.`);
    } catch (lookupError) {
      setAutofillMessage(
        lookupError instanceof Error
          ? lookupError.message
          : "Unable to look up that adventure right now.",
      );
    }
  }

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
              value={titleValue}
              name="title"
              onBlur={() => {
                if (!metadataLocked) {
                  void autofillAdventureDetails();
                }
              }}
              onChange={(event) => {
                setTitleValue(event.target.value);
                setAutofillMessage("");
              }}
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
              value={adventureCodeValue}
              name="adventureCode"
              onBlur={() => {
                if (!metadataLocked) {
                  void autofillAdventureDetails();
                }
              }}
              onChange={(event) => {
                setAdventureCodeValue(event.target.value);
                setAutofillMessage("");
              }}
              required
              type="text"
            />
          </label>
        </div>
        <div className="stack" style={fieldBlockStyle}>
          <label>
            Source (DM's Guild link)
            <input
              readOnly={metadataLocked}
              value={sourceValue}
              name="source"
              onChange={(event) => {
                setSourceValue(event.target.value);
              }}
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
              <select
                name="tier"
                value={resolvedTier}
                onChange={(event) => {
                  setTierValue(event.target.value as PlayerGameLogInitialValues["tier"]);
                }}
              >
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
              value={dmNameValue}
              name="dmName"
              onChange={(event) => {
                setDmNameValue(event.target.value);
              }}
              required
              placeholder="Name of the Dungeon Master"
              type="text"
            />
          </label>
        </div>
      </div>
      {autofillMessage ? <p className="muted" style={{ margin: 0 }}>{autofillMessage}</p> : null}

      <div className="form-grid">
        <div className="stack" style={fieldBlockStyle}>
          <label>
            Awarded Gold (Total in GP)
            <input
              value={rewardsSummaryValue}
              name="rewardsSummary"
              onChange={(event) => {
                setRewardsSummaryValue(event.target.value);
              }}
              type="text"
            />
          </label>
        </div>
      </div>

      <GameRewardFields
        initialConsumablesAwarded={consumablesAwardedValue}
        initialMagicItemsAwarded={magicItemsAwardedValue}
        initialSpellbookAwarded={spellbookAwardedValue}
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
          key={`player-session-notes-${sessionNotesValue}`}
          defaultValue={sessionNotesValue}
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
