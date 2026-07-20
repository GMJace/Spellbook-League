"use client";

import { useState } from "react";

import {
  parseStoredGameRewardSelections,
  type LegalRewardOptions,
} from "@/lib/game-reward-selections";

function RewardSelectList({
  addLabel,
  emptyMessage,
  name,
  noneLabel,
  options,
  values,
  onChange,
}: {
  addLabel: string;
  emptyMessage: string;
  name: string;
  noneLabel: string;
  options: string[];
  values: string[];
  onChange: (nextValues: string[]) => void;
}) {
  return (
    <div className="stack" style={{ gap: "0.75rem" }}>
      {values.length ? (
        values.map((value, index) => (
          <div
            key={`${name}-${index}`}
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              alignItems: "end",
            }}
          >
            <label style={{ margin: 0 }}>
              <span className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
                Selection {index + 1}
              </span>
              <select
                name={name}
                value={value}
                onChange={(event) => {
                  const nextValues = [...values];
                  nextValues[index] = event.target.value;
                  onChange(nextValues);
                }}
              >
                <option value="">{noneLabel}</option>
                {options.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                onChange(values.filter((_, currentIndex) => currentIndex !== index));
              }}
            >
              Remove
            </button>
          </div>
        ))
      ) : (
        <p className="muted" style={{ margin: 0 }}>
          {emptyMessage}
        </p>
      )}

      <div>
        <button
          className="secondary"
          type="button"
          onClick={() => {
            onChange([...values, ""]);
          }}
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}

export function GameRewardFields({
  initialConsumablesAwarded = "",
  initialMagicItemsAwarded = "",
  legalBlessingOptions,
  legalBoonOptions,
  legalBuildMagicItemOptions,
  legalCharmOptions,
  legalCommonMagicItemOptions,
  legalConsumableOptions,
}: {
  initialConsumablesAwarded?: string;
  initialMagicItemsAwarded?: string;
  legalBlessingOptions: string[];
  legalBoonOptions: string[];
  legalBuildMagicItemOptions: string[];
  legalCharmOptions: string[];
  legalCommonMagicItemOptions: string[];
  legalConsumableOptions: string[];
}) {
  const initialSelections = parseStoredGameRewardSelections(
    {
      magicItemsAwarded: initialMagicItemsAwarded,
      consumablesAwarded: initialConsumablesAwarded,
    },
    {
      legalBuildMagicItemOptions,
      legalCommonMagicItemOptions,
      legalConsumableOptions,
      legalBoonOptions,
      legalBlessingOptions,
      legalCharmOptions,
    } satisfies LegalRewardOptions
  );
  const [buildMagicItems, setBuildMagicItems] = useState(initialSelections.buildMagicItems);
  const [commonMagicItems, setCommonMagicItems] = useState(initialSelections.commonMagicItems);
  const [consumables, setConsumables] = useState(initialSelections.consumables);
  const [boons, setBoons] = useState(initialSelections.boons);
  const [blessings, setBlessings] = useState(initialSelections.blessings);
  const [charms, setCharms] = useState(initialSelections.charms);
  const [additionalMagicRewardNotes, setAdditionalMagicRewardNotes] = useState(
    initialSelections.additionalMagicRewardNotes
  );
  const [additionalConsumableNotes, setAdditionalConsumableNotes] = useState(
    initialSelections.additionalConsumableNotes
  );

  return (
    <div className="stack">
      <div className="stack" style={{ gap: 0 }}>
        <img
          alt="Reward selections divider"
          className="ggcon-table-divider"
          src="/divider4.png"
        />
        <h2 style={{ margin: 0 }}>Legal reward selections</h2>
        <p className="muted" style={{ margin: "0.35rem 0 0" }}>
          Pick rewards from the current league legal lists. Any older or custom notes stay in
          the additional notes boxes below.
        </p>
      </div>

      <div className="list-card stack">
        <strong>Uncommon+ magic items</strong>
        <RewardSelectList
          addLabel="Add Uncommon+ magic item"
          emptyMessage="No Uncommon+ magic items selected yet."
          name="rewardBuildMagicItems"
          noneLabel="Select an Uncommon+ magic item"
          onChange={setBuildMagicItems}
          options={legalBuildMagicItemOptions}
          values={buildMagicItems}
        />
      </div>

      <div className="list-card stack">
        <strong>Common magic items</strong>
        <RewardSelectList
          addLabel="Add common magic item"
          emptyMessage="No common magic items selected yet."
          name="rewardCommonMagicItems"
          noneLabel="Select a common magic item"
          onChange={setCommonMagicItems}
          options={legalCommonMagicItemOptions}
          values={commonMagicItems}
        />
      </div>

      <div className="list-card stack">
        <strong>Consumables</strong>
        <RewardSelectList
          addLabel="Add consumable"
          emptyMessage="No consumables selected yet."
          name="rewardConsumables"
          noneLabel="Select a consumable"
          onChange={setConsumables}
          options={legalConsumableOptions}
          values={consumables}
        />
      </div>

      <div className="list-card stack">
        <strong>Boons, blessings, and charms</strong>
        <RewardSelectList
          addLabel="Add boon"
          emptyMessage="No boons selected yet."
          name="rewardBoons"
          noneLabel="Select a boon"
          onChange={setBoons}
          options={legalBoonOptions}
          values={boons}
        />
        <RewardSelectList
          addLabel="Add blessing"
          emptyMessage="No blessings selected yet."
          name="rewardBlessings"
          noneLabel="Select a blessing"
          onChange={setBlessings}
          options={legalBlessingOptions}
          values={blessings}
        />
        <RewardSelectList
          addLabel="Add charm"
          emptyMessage="No charms selected yet."
          name="rewardCharms"
          noneLabel="Select a charm"
          onChange={setCharms}
          options={legalCharmOptions}
          values={charms}
        />
      </div>

      <div className="form-grid">
        <label>
          Additional magic reward notes
          <textarea
            name="magicItemsAwardedAdditional"
            onChange={(event) => setAdditionalMagicRewardNotes(event.target.value)}
            placeholder="Add older rewards, custom notes, or anything not covered above. Use one item per line."
            value={additionalMagicRewardNotes}
          />
        </label>
        <label>
          Additional consumable notes
          <textarea
            name="consumablesAwardedAdditional"
            onChange={(event) => setAdditionalConsumableNotes(event.target.value)}
            placeholder="Add older consumable notes or custom entries. Use one item per line."
            value={additionalConsumableNotes}
          />
        </label>
      </div>
    </div>
  );
}
