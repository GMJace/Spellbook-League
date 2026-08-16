"use client";

import { useEffect, useState } from "react";

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

function MagicRewardSelectList({
  addLabel,
  emptyMessage,
  itemName,
  itemDisplayLabel,
  itemNoneLabel,
  itemOptions,
  items,
  itemNames,
  itemFlavors,
  minorProperties,
  nameName,
  flavorName,
  minorPropertyName,
  minorPropertyOptions,
  onChange,
}: {
  addLabel: string;
  emptyMessage: string;
  itemName: string;
  itemDisplayLabel: string;
  itemNoneLabel: string;
  itemOptions: string[];
  items: string[];
  itemNames: string[];
  itemFlavors: string[];
  minorProperties: string[];
  nameName: string;
  flavorName: string;
  minorPropertyName: string;
  minorPropertyOptions: string[];
  onChange: (
    nextItems: string[],
    nextNames: string[],
    nextMinorProperties: string[],
    nextFlavors: string[]
  ) => void;
}) {
  return (
    <div className="stack" style={{ gap: "0.75rem" }}>
      {items.length ? (
        items.map((item, index) => (
          <div
            key={`${itemName}-${index}`}
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              alignItems: "end",
            }}
          >
            <div className="stack" style={{ gap: "0.75rem" }}>
              <label style={{ margin: 0 }}>
                <span className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
                  Selection {index + 1} · Item (counts as)
                </span>
                <select
                  name={itemName}
                  value={item}
                  onChange={(event) => {
                    const nextItems = [...items];
                    const nextNames = [...itemNames];
                    const nextMinorProperties = [...minorProperties];
                    const nextFlavors = [...itemFlavors];
                    nextItems[index] = event.target.value;

                    if (!event.target.value) {
                      nextNames[index] = "";
                      nextMinorProperties[index] = "";
                      nextFlavors[index] = "";
                    }

                    onChange(nextItems, nextNames, nextMinorProperties, nextFlavors);
                  }}
                >
                  <option value="">{itemNoneLabel}</option>
                  {itemOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              </label>
              {item ? (
                <label style={{ margin: 0 }}>
                  <span className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
                    Name
                  </span>
                  <input
                    name={nameName}
                    maxLength={160}
                    placeholder={`Add ${itemDisplayLabel.toLowerCase()} name`}
                    type="text"
                    value={itemNames[index] ?? ""}
                    onChange={(event) => {
                      const nextNames = [...itemNames];
                      nextNames[index] = event.target.value;
                      onChange(items, nextNames, minorProperties, itemFlavors);
                    }}
                  />
                </label>
              ) : null}
              {item ? (
                <label style={{ margin: 0 }}>
                  <span className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
                    Minor Property
                  </span>
                  <select
                    name={minorPropertyName}
                    value={minorProperties[index] ?? ""}
                    onChange={(event) => {
                      const nextMinorProperties = [...minorProperties];
                      nextMinorProperties[index] = event.target.value;
                      onChange(items, itemNames, nextMinorProperties, itemFlavors);
                    }}
                  >
                    <option value="">No minor property</option>
                    {minorPropertyOptions.map((option) => (
                      <option key={option} value={option}>
                        {option}
                      </option>
                    ))}
                  </select>
                </label>
              ) : null}
              {item ? (
                <label style={{ margin: 0 }}>
                  <span className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
                    Notes (Flavor)
                  </span>
                  <input
                    name={flavorName}
                    maxLength={160}
                    placeholder="Add flavor notes"
                    type="text"
                    value={itemFlavors[index] ?? ""}
                    onChange={(event) => {
                      const nextFlavors = [...itemFlavors];
                      nextFlavors[index] = event.target.value;
                      onChange(items, itemNames, minorProperties, nextFlavors);
                    }}
                  />
                </label>
              ) : null}
              {!item ? <input name={nameName} type="hidden" value="" /> : null}
              {!item ? <input name={minorPropertyName} type="hidden" value="" /> : null}
              {!item ? <input name={flavorName} type="hidden" value="" /> : null}
            </div>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                onChange(
                  items.filter((_, currentIndex) => currentIndex !== index),
                  itemNames.filter((_, currentIndex) => currentIndex !== index),
                  minorProperties.filter((_, currentIndex) => currentIndex !== index),
                  itemFlavors.filter((_, currentIndex) => currentIndex !== index)
                );
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
            onChange(
              [...items, ""],
              [...itemNames, ""],
              [...minorProperties, ""],
              [...itemFlavors, ""]
            );
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
  legalMinorPropertyOptions,
}: {
  initialConsumablesAwarded?: string;
  initialMagicItemsAwarded?: string;
  legalBlessingOptions: string[];
  legalBoonOptions: string[];
  legalBuildMagicItemOptions: string[];
  legalCharmOptions: string[];
  legalCommonMagicItemOptions: string[];
  legalConsumableOptions: string[];
  legalMinorPropertyOptions: string[];
}) {
  function buildSelections() {
    return parseStoredGameRewardSelections(
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
        legalMinorPropertyOptions,
      } satisfies LegalRewardOptions
    );
  }

  const initialSelections = buildSelections();
  const [buildMagicItems, setBuildMagicItems] = useState(initialSelections.buildMagicItems);
  const [buildMagicItemNames, setBuildMagicItemNames] = useState(
    initialSelections.buildMagicItemNames
  );
  const [buildMagicItemMinorProperties, setBuildMagicItemMinorProperties] = useState(
    initialSelections.buildMagicItemMinorProperties
  );
  const [buildMagicItemFlavors, setBuildMagicItemFlavors] = useState(
    initialSelections.buildMagicItemFlavors
  );
  const [commonMagicItems, setCommonMagicItems] = useState(initialSelections.commonMagicItems);
  const [commonMagicItemNames, setCommonMagicItemNames] = useState(
    initialSelections.commonMagicItemNames
  );
  const [commonMagicItemMinorProperties, setCommonMagicItemMinorProperties] = useState(
    initialSelections.commonMagicItemMinorProperties
  );
  const [commonMagicItemFlavors, setCommonMagicItemFlavors] = useState(
    initialSelections.commonMagicItemFlavors
  );
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

  useEffect(() => {
    const nextSelections = buildSelections();

    setBuildMagicItems(nextSelections.buildMagicItems);
    setBuildMagicItemNames(nextSelections.buildMagicItemNames);
    setBuildMagicItemMinorProperties(nextSelections.buildMagicItemMinorProperties);
    setBuildMagicItemFlavors(nextSelections.buildMagicItemFlavors);
    setCommonMagicItems(nextSelections.commonMagicItems);
    setCommonMagicItemNames(nextSelections.commonMagicItemNames);
    setCommonMagicItemMinorProperties(nextSelections.commonMagicItemMinorProperties);
    setCommonMagicItemFlavors(nextSelections.commonMagicItemFlavors);
    setConsumables(nextSelections.consumables);
    setBoons(nextSelections.boons);
    setBlessings(nextSelections.blessings);
    setCharms(nextSelections.charms);
    setAdditionalMagicRewardNotes(nextSelections.additionalMagicRewardNotes);
    setAdditionalConsumableNotes(nextSelections.additionalConsumableNotes);
  }, [
    initialConsumablesAwarded,
    initialMagicItemsAwarded,
    legalBlessingOptions,
    legalBoonOptions,
    legalBuildMagicItemOptions,
    legalCharmOptions,
    legalCommonMagicItemOptions,
    legalConsumableOptions,
    legalMinorPropertyOptions,
  ]);

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
        <MagicRewardSelectList
          addLabel="Add Uncommon+ magic item"
          emptyMessage="No Uncommon+ magic items selected yet."
          itemName="rewardBuildMagicItems"
          itemDisplayLabel="magic item"
          itemNoneLabel="Select an Uncommon+ magic item"
          itemOptions={legalBuildMagicItemOptions}
          items={buildMagicItems}
          itemNames={buildMagicItemNames}
          itemFlavors={buildMagicItemFlavors}
          nameName="rewardBuildMagicItemNames"
          minorProperties={buildMagicItemMinorProperties}
          flavorName="rewardBuildMagicItemFlavors"
          minorPropertyName="rewardBuildMagicItemMinorProperties"
          minorPropertyOptions={legalMinorPropertyOptions}
          onChange={(nextItems, nextNames, nextMinorProperties, nextFlavors) => {
            setBuildMagicItems(nextItems);
            setBuildMagicItemNames(nextNames);
            setBuildMagicItemMinorProperties(nextMinorProperties);
            setBuildMagicItemFlavors(nextFlavors);
          }}
        />
      </div>

      <div className="list-card stack">
        <strong>Common magic items</strong>
        <MagicRewardSelectList
          addLabel="Add common magic item"
          emptyMessage="No common magic items selected yet."
          itemName="rewardCommonMagicItems"
          itemDisplayLabel="common magic item"
          itemNoneLabel="Select a common magic item"
          itemOptions={legalCommonMagicItemOptions}
          items={commonMagicItems}
          itemNames={commonMagicItemNames}
          itemFlavors={commonMagicItemFlavors}
          nameName="rewardCommonMagicItemNames"
          minorProperties={commonMagicItemMinorProperties}
          flavorName="rewardCommonMagicItemFlavors"
          minorPropertyName="rewardCommonMagicItemMinorProperties"
          minorPropertyOptions={legalMinorPropertyOptions}
          onChange={(nextItems, nextNames, nextMinorProperties, nextFlavors) => {
            setCommonMagicItems(nextItems);
            setCommonMagicItemNames(nextNames);
            setCommonMagicItemMinorProperties(nextMinorProperties);
            setCommonMagicItemFlavors(nextFlavors);
          }}
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
