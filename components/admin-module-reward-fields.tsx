"use client";

import { useState } from "react";

export type AdminModuleUncommonPlusMagicItem = {
  flavorNotes: string;
  item: string;
  minorProperty: string;
  name: string;
  rarity: "LEGENDARY" | "RARE" | "UNCOMMON" | "UNIQUE" | "VERY_RARE";
};

export type AdminModuleMagicItem = {
  flavorNotes: string;
  item: string;
  minorProperty: string;
  name: string;
};

function RepeatableTextList({
  addLabel,
  emptyMessage,
  inputLabel,
  inputName,
  initialValues,
  placeholder,
}: {
  addLabel: string;
  emptyMessage: string;
  inputLabel: string;
  inputName: string;
  initialValues: string[];
  placeholder: string;
}) {
  const [values, setValues] = useState(initialValues);

  return (
    <div className="stack" style={{ gap: "0.75rem" }}>
      {values.length ? (
        values.map((value, index) => (
          <div
            key={`${inputName}-${index}`}
            style={{
              display: "grid",
              gap: "0.75rem",
              gridTemplateColumns: "minmax(0, 1fr) auto",
              alignItems: "end",
            }}
          >
            <label style={{ margin: 0 }}>
              <span className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
                {inputLabel} {index + 1}
              </span>
              <input
                name={inputName}
                placeholder={placeholder}
                type="text"
                value={value}
                onChange={(event) => {
                  const nextValues = [...values];
                  nextValues[index] = event.target.value;
                  setValues(nextValues);
                }}
              />
            </label>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setValues(values.filter((_, currentIndex) => currentIndex !== index));
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
            setValues([...values, ""]);
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
  itemInputName,
  itemNoneLabel,
  itemOptions,
  flavorInputName,
  initialValues,
  minorPropertyInputName,
  minorPropertyOptions,
  nameInputName,
  rarityInputName,
  rarityByItem,
}: {
  addLabel: string;
  emptyMessage: string;
  itemInputName: string;
  itemNoneLabel: string;
  itemOptions: string[];
  flavorInputName: string;
  initialValues: AdminModuleMagicItem[] | AdminModuleUncommonPlusMagicItem[];
  minorPropertyInputName: string;
  minorPropertyOptions: string[];
  nameInputName: string;
  rarityInputName?: string;
  rarityByItem?: Record<string, AdminModuleUncommonPlusMagicItem["rarity"]>;
}) {
  const [values, setValues] = useState(
    initialValues.length
      ? initialValues
      : [
          rarityInputName
            ? {
                flavorNotes: "",
                item: "",
                minorProperty: "",
                name: "",
                rarity: "UNCOMMON",
              }
            : {
                flavorNotes: "",
                item: "",
                minorProperty: "",
                name: "",
              },
        ]
  );

  return (
    <div className="stack" style={{ gap: "0.75rem" }}>
      {values.length ? (
        values.map((value, index) => (
          <div
            key={`${itemInputName}-${index}`}
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
                  name={itemInputName}
                  value={value.item}
                  onChange={(event) => {
                    const nextValues = [...values];
                    nextValues[index] = {
                      ...nextValues[index],
                      item: event.target.value,
                      name: event.target.value ? nextValues[index].name : "",
                      minorProperty: event.target.value ? nextValues[index].minorProperty : "",
                      flavorNotes: event.target.value ? nextValues[index].flavorNotes : "",
                      ...(
                        rarityInputName
                          ? {
                              rarity:
                                (event.target.value
                                  ? rarityByItem?.[event.target.value]
                                  : "UNCOMMON") ??
                                ("rarity" in nextValues[index]
                                  ? nextValues[index].rarity
                                  : "UNCOMMON"),
                            }
                          : {}
                      ),
                    };
                    setValues(nextValues);
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
              {value.item ? (
                <label style={{ margin: 0 }}>
                  <span className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
                    Name
                  </span>
                  <input
                    name={nameInputName}
maxLength={160}
                    placeholder="Add magic item name"
                    type="text"
                    value={value.name}
                    onChange={(event) => {
                      const nextValues = [...values];
                      nextValues[index] = {
                        ...nextValues[index],
                        name: event.target.value,
                      };
                      setValues(nextValues);
                    }}
                  />
                </label>
              ) : null}
              {value.item ? (
                <label style={{ margin: 0 }}>
                  <span className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
                    Minor Property
                  </span>
                  <select
                    name={minorPropertyInputName}
                    value={value.minorProperty}
                    onChange={(event) => {
                      const nextValues = [...values];
                      nextValues[index] = {
                        ...nextValues[index],
                        minorProperty: event.target.value,
                      };
                      setValues(nextValues);
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
              {value.item ? (
                <label style={{ margin: 0 }}>
                  <span className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
                    Notes (Flavor)
                  </span>
                  <input
                    name={flavorInputName}
                    maxLength={2000}
                    placeholder="Add flavor notes"
                    type="text"
                    value={value.flavorNotes}
                    onChange={(event) => {
                      const nextValues = [...values];
                      nextValues[index] = {
                        ...nextValues[index],
                        flavorNotes: event.target.value,
                      };
                      setValues(nextValues);
                    }}
                  />
                </label>
              ) : null}
              {!value.item ? <input name={nameInputName} type="hidden" value="" /> : null}
              {!value.item ? <input name={minorPropertyInputName} type="hidden" value="" /> : null}
              {!value.item ? <input name={flavorInputName} type="hidden" value="" /> : null}
              {rarityInputName ? (
                <input
                  name={rarityInputName}
                  type="hidden"
                  value={"rarity" in value ? value.rarity : "UNCOMMON"}
                />
              ) : null}
            </div>
            <button
              className="secondary"
              type="button"
              onClick={() => {
                setValues(values.filter((_, currentIndex) => currentIndex !== index));
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
            setValues([
              ...values,
              rarityInputName
                ? {
                    flavorNotes: "",
                    item: "",
                    minorProperty: "",
                    name: "",
                    rarity: "UNCOMMON",
                  }
                : {
                    flavorNotes: "",
                    item: "",
                    minorProperty: "",
                    name: "",
                  },
            ]);
          }}
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}

function UncommonPlusMagicItemList({
  initialValues,
  legalMagicItemOptions,
  legalMinorPropertyOptions,
  rarityByItem,
}: {
  initialValues: AdminModuleUncommonPlusMagicItem[];
  legalMagicItemOptions: string[];
  legalMinorPropertyOptions: string[];
  rarityByItem: Record<string, AdminModuleUncommonPlusMagicItem["rarity"]>;
}) {
  return (
    <MagicRewardSelectList
      addLabel="Add uncommon+ magic item"
      emptyMessage="No uncommon+ magic items added yet."
      itemInputName="moduleBuildMagicItems"
      itemNoneLabel="Select an Uncommon+ magic item"
      itemOptions={legalMagicItemOptions}
      flavorInputName="moduleUncommonPlusMagicItemFlavors"
      initialValues={initialValues}
      minorPropertyInputName="moduleUncommonPlusMagicItemMinorProperties"
      minorPropertyOptions={legalMinorPropertyOptions}
      nameInputName="moduleUncommonPlusMagicItemNames"
      rarityInputName="moduleUncommonPlusMagicItemRarities"
      rarityByItem={rarityByItem}
    />
  );
}

export function AdminModuleRewardFields({
  additionalConsumableNotes,
  additionalMagicRewardNotes,
  blessings,
  boons,
  charms,
  commonMagicItems,
  consumables,
  legalCommonMagicItemOptions,
  legalMinorPropertyOptions,
  legalUncommonPlusMagicItemOptions,
  uncommonPlusRarityByItem,
  spellbook,
  uncommonPlusMagicItems,
}: {
  additionalConsumableNotes: string;
  additionalMagicRewardNotes: string;
  blessings: string[];
  boons: string[];
  charms: string[];
  commonMagicItems: AdminModuleMagicItem[];
  consumables: string[];
  legalCommonMagicItemOptions: string[];
  legalMinorPropertyOptions: string[];
  legalUncommonPlusMagicItemOptions: string[];
  spellbook: string;
  uncommonPlusRarityByItem: Record<string, AdminModuleUncommonPlusMagicItem["rarity"]>;
  uncommonPlusMagicItems: AdminModuleUncommonPlusMagicItem[];
}) {
  return (
    <div className="stack">
      <div className="list-card stack">
        <strong>Uncommon+ magic items</strong>
        <UncommonPlusMagicItemList
          initialValues={uncommonPlusMagicItems}
          legalMagicItemOptions={legalUncommonPlusMagicItemOptions}
          legalMinorPropertyOptions={legalMinorPropertyOptions}
          rarityByItem={uncommonPlusRarityByItem}
        />
      </div>

      <div className="list-card stack">
        <strong>Common magic items</strong>
        <MagicRewardSelectList
          addLabel="Add common magic item"
          emptyMessage="No common magic items added yet."
          itemInputName="moduleCommonMagicItems"
          itemNoneLabel="Select a common magic item"
          itemOptions={legalCommonMagicItemOptions}
          initialValues={commonMagicItems}
          flavorInputName="moduleCommonMagicItemFlavors"
          minorPropertyInputName="moduleCommonMagicItemMinorProperties"
          minorPropertyOptions={legalMinorPropertyOptions}
          nameInputName="moduleCommonMagicItemNames"
        />
      </div>

      <div className="list-card stack">
        <strong>Consumables</strong>
        <RepeatableTextList
          addLabel="Add consumable"
          emptyMessage="No consumables added yet."
          initialValues={consumables}
          inputLabel="Consumable"
          inputName="moduleConsumables"
          placeholder="Enter the consumable reward"
        />
      </div>

      <div className="list-card stack">
        <strong>Spellbooks</strong>
        <label style={{ margin: 0 }}>
          <span className="muted" style={{ display: "block", marginBottom: "0.35rem" }}>
            Spellbook rewards
          </span>
          <textarea
            defaultValue={spellbook}
            name="spellbook"
            placeholder="List spellbooks, spells learned, or book details."
            rows={5}
          />
        </label>
      </div>

      <div className="list-card stack">
        <strong>Boons, blessings, and charms</strong>
        <RepeatableTextList
          addLabel="Add boon"
          emptyMessage="No boons added yet."
          initialValues={boons}
          inputLabel="Boon"
          inputName="moduleBoons"
          placeholder="Enter the boon"
        />
        <RepeatableTextList
          addLabel="Add blessing"
          emptyMessage="No blessings added yet."
          initialValues={blessings}
          inputLabel="Blessing"
          inputName="moduleBlessings"
          placeholder="Enter the blessing"
        />
        <RepeatableTextList
          addLabel="Add charm"
          emptyMessage="No charms added yet."
          initialValues={charms}
          inputLabel="Charm"
          inputName="moduleCharms"
          placeholder="Enter the charm"
        />
      </div>

      <div className="form-grid">
        <label>
          Additional magic reward notes
          <textarea
            defaultValue={additionalMagicRewardNotes}
            name="additionalMagicRewardNotes"
            placeholder="Add notes for older rewards, custom items, or anything outside the rarity lists."
            rows={5}
          />
        </label>
        <label>
          Additional consumable notes
          <textarea
            defaultValue={additionalConsumableNotes}
            name="additionalConsumableNotes"
            placeholder="Add custom consumable notes or anything outside the main consumables list."
            rows={5}
          />
        </label>
      </div>
    </div>
  );
}
