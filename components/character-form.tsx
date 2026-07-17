"use client";

import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { createCharacter } from "@/app/player/characters/new/actions";
import { ConfirmCheckbox } from "@/components/confirm-checkbox";
import {
  DND_CLASSES,
  getDefaultLegalSubclassOptions,
  getSubclassOptionsForClassFromMap,
  type LegalSubclassOptionsMap,
} from "@/lib/character-options";
import {
  CLASS_GRANTED_LANGUAGES,
  CLASS_GRANTED_LANGUAGE_GROUP_TITLE,
  COMMON_MAGIC_ITEM_SLOT_COUNT,
  DND_SKILLS,
  getCharmSlotCount,
  getClassGrantedLanguages,
  getCharacterTier,
  getConsumableItemLimit,
  getLegalFeatGroups,
  getLegalLanguageGroups,
  getLegalToolGroups,
  getMagicItemLimit,
  hasBoonSlot,
  parseMagicItems,
  parseSkillSelections,
  parseToggleSelections,
  serializeSkillSelections,
} from "@/lib/character";
import {
  getDefaultLegalBlessingOptions,
  getDefaultLegalBoonOptions,
  getDefaultLegalCharmOptions,
  getDefaultLegalFeatOptions,
  getDefaultLegalLanguageOptions,
  getDefaultLegalToolOptions,
} from "@/lib/league-legal-choices";

type FormState = {
  error: string;
  success?: string;
};
type CharacterFormValues = {
  name: string;
  characterSheetLink: string | null;
  armorClass: number | null;
  spellSaveDc: number | null;
  tokenImagePath: string | null;
  class1Name: string;
  class1Subclass: string | null;
  class1Level: number;
  class2Name: string | null;
  class2Subclass: string | null;
  class2Level: number | null;
  class3Name: string | null;
  class3Subclass: string | null;
  class3Level: number | null;
  feats: string | null;
  proficiencies: string | null;
  tools: string | null;
  languages: string | null;
  notes: string | null;
  backstory: string | null;
  totalGold: number;
  magicItems: string;
  commonMagicItems: string;
  consumables: string;
  boon: string | null;
  blessing: string | null;
  charms: string;
};

function ensureItemSlots(items: string[], count: number) {
  return Array.from({ length: count }, (_, index) => items[index] ?? "");
}

function ensureSelectableItemSlots(items: string[], count: number, options: string[]) {
  const optionSet = new Set(options);

  return Array.from({ length: count }, (_, index) => {
    const item = items[index] ?? "";
    return optionSet.has(item) ? item : "";
  });
}

function clampLevel(value: number, min: number, max: number) {
  if (Number.isNaN(value)) {
    return min;
  }

  return Math.min(Math.max(value, min), max);
}

function filterBooleanSelections(
  selections: Record<string, true>,
  allowedOptions: string[]
) {
  const allowedSet = new Set(allowedOptions);

  return Object.fromEntries(
    Object.entries(selections).filter(([option, selected]) => selected && allowedSet.has(option))
  ) as Record<string, true>;
}

function serializeToggleSelections(selections: Record<string, true>) {
  return JSON.stringify(
    Object.keys(selections).filter((option) => selections[option] === true)
  );
}

const whiteDividerStyle = {
  width: "100%",
  height: "1px",
  margin: "0.8rem 0",
  background: "rgba(255, 255, 255, 0.85)",
} as const;

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();

  return (
    <button type="submit" disabled={pending}>
      {pending ? "Saving..." : label}
    </button>
  );
}

export function CharacterForm({
  action,
  submitLabel = "Create character",
  initialValues,
  legalBuildMagicItemOptions = [],
  legalCommonMagicItemOptions = [],
  legalConsumableOptions = [],
  legalBoonOptions = getDefaultLegalBoonOptions(),
  legalBlessingOptions = getDefaultLegalBlessingOptions(),
  legalCharmOptions = getDefaultLegalCharmOptions(),
  legalFeatOptions = getDefaultLegalFeatOptions(),
  legalToolOptions = getDefaultLegalToolOptions(),
  legalLanguageOptions = getDefaultLegalLanguageOptions(),
  legalSubclassOptions = getDefaultLegalSubclassOptions(),
}: {
  action?: (formData: FormData) => void | Promise<void>;
  submitLabel?: string;
  initialValues?: CharacterFormValues;
  legalBuildMagicItemOptions?: string[];
  legalCommonMagicItemOptions?: string[];
  legalConsumableOptions?: string[];
  legalBoonOptions?: string[];
  legalBlessingOptions?: string[];
  legalCharmOptions?: string[];
  legalFeatOptions?: string[];
  legalToolOptions?: string[];
  legalLanguageOptions?: string[];
  legalSubclassOptions?: LegalSubclassOptionsMap;
}) {
  const [class1Name, setClass1Name] = useState<string>(initialValues?.class1Name ?? "");
  const [class2Name, setClass2Name] = useState<string>(initialValues?.class2Name ?? "");
  const [class3Name, setClass3Name] = useState<string>(initialValues?.class3Name ?? "");
  const [class1Subclass, setClass1Subclass] = useState<string>(
    initialValues?.class1Subclass ?? ""
  );
  const [class2Subclass, setClass2Subclass] = useState<string>(
    initialValues?.class2Subclass ?? ""
  );
  const [class3Subclass, setClass3Subclass] = useState<string>(
    initialValues?.class3Subclass ?? ""
  );
  const [class1Level, setClass1Level] = useState<number>(initialValues?.class1Level ?? 1);
  const [class2Level, setClass2Level] = useState<number>(initialValues?.class2Level ?? 0);
  const [class3Level, setClass3Level] = useState<number>(initialValues?.class3Level ?? 0);
  const [featSelections, setFeatSelections] = useState(() =>
    filterBooleanSelections(
      parseToggleSelections(initialValues?.feats ?? ""),
      legalFeatOptions
    )
  );
  const [skillSelections, setSkillSelections] = useState(() =>
    parseSkillSelections(initialValues?.proficiencies ?? "")
  );
  const [toolSelections, setToolSelections] = useState<Record<string, true>>(() =>
    filterBooleanSelections(parseToggleSelections(initialValues?.tools ?? ""), legalToolOptions)
  );
  const [languageSelections, setLanguageSelections] = useState<Record<string, true>>(() =>
    filterBooleanSelections(
      parseToggleSelections(initialValues?.languages ?? ""),
      [...legalLanguageOptions, ...CLASS_GRANTED_LANGUAGES]
    )
  );
  const [notes, setNotes] = useState<string>(initialValues?.notes ?? "");
  const [backstory, setBackstory] = useState<string>(initialValues?.backstory ?? "");
  const [magicItems, setMagicItems] = useState(() =>
    ensureSelectableItemSlots(
      parseMagicItems(initialValues?.magicItems ?? ""),
      1,
      legalBuildMagicItemOptions
    )
  );
  const [commonMagicItems, setCommonMagicItems] = useState(() =>
    ensureSelectableItemSlots(
      parseMagicItems(initialValues?.commonMagicItems ?? ""),
      COMMON_MAGIC_ITEM_SLOT_COUNT,
      legalCommonMagicItemOptions
    )
  );
  const [consumables, setConsumables] = useState(() =>
    ensureSelectableItemSlots(
      parseMagicItems(initialValues?.consumables ?? ""),
      5,
      legalConsumableOptions
    )
  );
  const [boon, setBoon] = useState<string>(() => {
    const initialBoon = initialValues?.boon ?? "";

    if (!legalBoonOptions.length) {
      return initialBoon;
    }

    return legalBoonOptions.includes(initialBoon) ? initialBoon : "";
  });
  const [blessing, setBlessing] = useState<string>(() => {
    const initialBlessing = initialValues?.blessing ?? "";

    if (!legalBlessingOptions.length) {
      return initialBlessing;
    }

    return legalBlessingOptions.includes(initialBlessing) ? initialBlessing : "";
  });
  const [charms, setCharms] = useState(() =>
    legalCharmOptions.length
      ? ensureSelectableItemSlots(
          parseMagicItems(initialValues?.charms ?? ""),
          2,
          legalCharmOptions
        )
      : ensureItemSlots(parseMagicItems(initialValues?.charms ?? ""), 2)
  );
  const notesRef = useRef<HTMLTextAreaElement | null>(null);
  const backstoryRef = useRef<HTMLTextAreaElement | null>(null);

  const class1SubclassOptions = getSubclassOptionsForClassFromMap(legalSubclassOptions, class1Name);
  const class2SubclassOptions = getSubclassOptionsForClassFromMap(legalSubclassOptions, class2Name);
  const class3SubclassOptions = getSubclassOptionsForClassFromMap(legalSubclassOptions, class3Name);
  const totalLevel = class1Level + class2Level + class3Level;
  const tier = getCharacterTier(totalLevel);
  const magicItemLimit = getMagicItemLimit(tier);
  const consumableItemLimit = getConsumableItemLimit(tier);
  const boonSlotEnabled = hasBoonSlot(tier);
  const charmSlotCount = getCharmSlotCount(tier);
  const class1Max = Math.max(1, 20 - class2Level - class3Level);
  const class2Max = Math.max(0, 20 - class1Level - class3Level);
  const class3Max = Math.max(0, 20 - class1Level - class2Level);
  const classGrantedLanguages = getClassGrantedLanguages([
    { className: class1Name, level: class1Level },
    { className: class2Name, level: class2Level },
    { className: class3Name, level: class3Level },
  ]);
  const classGrantedLanguageSet = new Set(classGrantedLanguages);
  const skillGroups = Array.from({ length: 3 }, (_, index) =>
    DND_SKILLS.slice(
      index * Math.ceil(DND_SKILLS.length / 3),
      (index + 1) * Math.ceil(DND_SKILLS.length / 3)
    )
  ).filter((group) => group.length > 0);
  const toolGroups = getLegalToolGroups(legalToolOptions);
  const languageGroups = getLegalLanguageGroups(legalLanguageOptions);
  const featGroups = getLegalFeatGroups(legalFeatOptions);
  const submittedLanguageSelections = { ...languageSelections } as Record<string, true>;
  const targetAction = action ?? createCharacter;

  for (const language of CLASS_GRANTED_LANGUAGES) {
    delete submittedLanguageSelections[language];
  }

  for (const language of classGrantedLanguages) {
    submittedLanguageSelections[language] = true;
  }

  useEffect(() => {
    const nextClass1Level = initialValues?.class1Level ?? 1;
    const nextClass2Level = initialValues?.class2Level ?? 0;
    const nextClass3Level = initialValues?.class3Level ?? 0;
    const nextMagicItemLimit = getMagicItemLimit(
      getCharacterTier(nextClass1Level + nextClass2Level + nextClass3Level)
    );
    const nextConsumableItemLimit = getConsumableItemLimit(
      getCharacterTier(nextClass1Level + nextClass2Level + nextClass3Level)
    );
    const nextTier = getCharacterTier(
      nextClass1Level + nextClass2Level + nextClass3Level
    );
    const nextCharmSlotCount = getCharmSlotCount(nextTier);
    const nextBoonSlotEnabled = hasBoonSlot(nextTier);

    setClass1Name(initialValues?.class1Name ?? "");
    setClass2Name(initialValues?.class2Name ?? "");
    setClass3Name(initialValues?.class3Name ?? "");
    setClass1Subclass(initialValues?.class1Subclass ?? "");
    setClass2Subclass(initialValues?.class2Subclass ?? "");
    setClass3Subclass(initialValues?.class3Subclass ?? "");
    setClass1Level(nextClass1Level);
    setClass2Level(nextClass2Level);
    setClass3Level(nextClass3Level);
    setFeatSelections(
      filterBooleanSelections(
        parseToggleSelections(initialValues?.feats ?? ""),
        legalFeatOptions
      )
    );
    setSkillSelections(parseSkillSelections(initialValues?.proficiencies ?? ""));
    setToolSelections(
      filterBooleanSelections(parseToggleSelections(initialValues?.tools ?? ""), legalToolOptions)
    );
    setLanguageSelections(
      filterBooleanSelections(
        parseToggleSelections(initialValues?.languages ?? ""),
        [...legalLanguageOptions, ...CLASS_GRANTED_LANGUAGES]
      )
    );
    setNotes(initialValues?.notes ?? "");
    setBackstory(initialValues?.backstory ?? "");
    setMagicItems(
      ensureSelectableItemSlots(
        parseMagicItems(initialValues?.magicItems ?? ""),
        nextMagicItemLimit,
        legalBuildMagicItemOptions
      )
    );
    setCommonMagicItems(
      ensureSelectableItemSlots(
        parseMagicItems(initialValues?.commonMagicItems ?? ""),
        COMMON_MAGIC_ITEM_SLOT_COUNT,
        legalCommonMagicItemOptions
      )
    );
    setConsumables(
      ensureSelectableItemSlots(
        parseMagicItems(initialValues?.consumables ?? ""),
        nextConsumableItemLimit,
        legalConsumableOptions
      )
    );
    setBoon(
      nextBoonSlotEnabled
        ? !legalBoonOptions.length || legalBoonOptions.includes(initialValues?.boon ?? "")
          ? initialValues?.boon ?? ""
          : ""
        : ""
    );
    setBlessing(
      !legalBlessingOptions.length ||
        legalBlessingOptions.includes(initialValues?.blessing ?? "")
        ? initialValues?.blessing ?? ""
        : ""
    );
    setCharms(
      legalCharmOptions.length
        ? ensureSelectableItemSlots(
            parseMagicItems(initialValues?.charms ?? ""),
            nextCharmSlotCount,
            legalCharmOptions
          )
        : ensureItemSlots(parseMagicItems(initialValues?.charms ?? ""), nextCharmSlotCount)
    );
  }, [
    initialValues,
    initialValues?.magicItems,
    initialValues?.commonMagicItems,
    initialValues?.consumables,
    initialValues?.boon,
    initialValues?.blessing,
    initialValues?.charms,
    legalBuildMagicItemOptions,
    legalCommonMagicItemOptions,
    legalConsumableOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
    legalFeatOptions,
    legalToolOptions,
    legalLanguageOptions,
  ]);

  useEffect(() => {
    setMagicItems((current) =>
      ensureSelectableItemSlots(current, magicItemLimit, legalBuildMagicItemOptions)
    );
  }, [legalBuildMagicItemOptions, magicItemLimit]);

  useEffect(() => {
    setConsumables((current) => ensureItemSlots(current, consumableItemLimit));
  }, [consumableItemLimit]);

  useEffect(() => {
    if (legalBoonOptions.length && boon && !legalBoonOptions.includes(boon)) {
      setBoon("");
    }
  }, [boon, legalBoonOptions]);

  useEffect(() => {
    if (legalBlessingOptions.length && blessing && !legalBlessingOptions.includes(blessing)) {
      setBlessing("");
    }
  }, [blessing, legalBlessingOptions]);

  useEffect(() => {
    setFeatSelections((current) => filterBooleanSelections(current, legalFeatOptions));
  }, [legalFeatOptions]);

  useEffect(() => {
    setToolSelections((current) =>
      filterBooleanSelections(current, legalToolOptions)
    );
  }, [legalToolOptions]);

  useEffect(() => {
    setLanguageSelections((current) =>
      filterBooleanSelections(current, [...legalLanguageOptions, ...CLASS_GRANTED_LANGUAGES])
    );
  }, [legalLanguageOptions]);

  useEffect(() => {
    setCharms((current) =>
      legalCharmOptions.length
        ? ensureSelectableItemSlots(current, charmSlotCount, legalCharmOptions)
        : ensureItemSlots(current, charmSlotCount)
    );
  }, [charmSlotCount, legalCharmOptions]);

  useEffect(() => {
    if (!boonSlotEnabled) {
      setBoon("");
    }
  }, [boonSlotEnabled]);

  useEffect(() => {
    if (class1Subclass && !class1SubclassOptions.includes(class1Subclass)) {
      setClass1Subclass("");
    }
  }, [class1Subclass, class1SubclassOptions]);

  useEffect(() => {
    if (class2Subclass && !class2SubclassOptions.includes(class2Subclass)) {
      setClass2Subclass("");
    }
  }, [class2Subclass, class2SubclassOptions]);

  useEffect(() => {
    if (class3Subclass && !class3SubclassOptions.includes(class3Subclass)) {
      setClass3Subclass("");
    }
  }, [class3Subclass, class3SubclassOptions]);

  useEffect(() => {
    const detailFields = [
      notesRef.current,
      backstoryRef.current,
    ].filter((field): field is HTMLTextAreaElement => Boolean(field));

    if (!detailFields.length) {
      return;
    }

    for (const field of detailFields) {
      field.style.height = "auto";
    }

    const maxHeight = Math.max(...detailFields.map((field) => field.scrollHeight));

    for (const field of detailFields) {
      field.style.height = `${maxHeight}px`;
    }
  }, [notes, backstory]);

  function updateSkillSelection(
    skillName: (typeof DND_SKILLS)[number]["name"],
    rank: "proficiency" | "expertise",
    checked: boolean
  ) {
    setSkillSelections((current) => {
      const next = { ...current };

      if (!checked) {
        if (rank === "proficiency") {
          delete next[skillName];
        } else if (next[skillName] === "expertise") {
          next[skillName] = "proficiency";
        }
        return next;
      }

      next[skillName] = rank;
      return next;
    });
  }

  function updateToolSelection(
    toolName: string,
    checked: boolean
  ) {
    setToolSelections((current) => {
      const next = { ...current };

      if (checked) {
        next[toolName] = true;
      } else {
        delete next[toolName];
      }

      return next;
    });
  }

  function updateFeatSelection(featName: string, checked: boolean) {
    setFeatSelections((current) => {
      const next = { ...current };

      if (checked) {
        next[featName] = true;
      } else {
        delete next[featName];
      }

      return next;
    });
  }

  function updateLanguageSelection(languageName: string, checked: boolean) {
    setLanguageSelections((current) => {
      const next = { ...current };

      if (checked) {
        next[languageName] = true;
      } else {
        delete next[languageName];
      }

      return next;
    });
  }

  return (
    <form
      action={targetAction}
      className="form-stack"
    >
      <input name="class1Name" type="hidden" value={class1Name} />
      <input name="class2Name" type="hidden" value={class2Name} />
      <input name="class3Name" type="hidden" value={class3Name} />
      <input name="class1Subclass" type="hidden" value={class1Subclass} />
      <input name="class2Subclass" type="hidden" value={class2Subclass} />
      <input name="class3Subclass" type="hidden" value={class3Subclass} />
      <input name="class1Level" type="hidden" value={String(class1Level)} />
      <input name="class2Level" type="hidden" value={String(class2Level)} />
      <input name="class3Level" type="hidden" value={String(class3Level)} />
      <input
        name="proficiencies"
        type="hidden"
        value={serializeSkillSelections(skillSelections)}
      />
      <input
        name="languages"
        type="hidden"
        value={serializeToggleSelections(submittedLanguageSelections)}
      />
      <input name="feats" type="hidden" value={serializeToggleSelections(featSelections)} />
      <input
        name="tools"
        type="hidden"
        value={serializeToggleSelections(toolSelections)}
      />

      <label>
        Character name
        <input name="name" type="text" required defaultValue={initialValues?.name ?? ""} />
      </label>

      <label>
        Character sheet link
        <input
          name="characterSheetLink"
          type="url"
          placeholder="https://..."
          defaultValue={initialValues?.characterSheetLink ?? ""}
        />
      </label>

      <div className="form-grid">
        <label>
          Character AC
          <input
            name="armorClass"
            type="number"
            min="0"
            max="99"
            defaultValue={initialValues?.armorClass ?? ""}
          />
        </label>
        <label>
          Character Spell Save DC
          <input
            name="spellSaveDc"
            type="number"
            min="0"
            max="99"
            defaultValue={initialValues?.spellSaveDc ?? ""}
          />
        </label>
      </div>

      <div className="form-stack" style={{ gap: "0.5rem" }}>
        <label>
          Player token
          <input
            name="tokenImage"
            type="file"
            accept="image/png,image/jpeg,image/webp,image/gif"
          />
        </label>
        <p className="muted" style={{ margin: 0 }}>
          Optional. Upload a PNG, JPG, WEBP, or GIF up to 5 MB.
        </p>
        {initialValues?.tokenImagePath ? (
          <div style={{ display: "grid", gap: "0.5rem", justifyItems: "start" }}>
            <p className="muted" style={{ margin: 0 }}>
              Current token
            </p>
            <img
              src={initialValues.tokenImagePath}
              alt={`${initialValues.name} token`}
              style={{
                width: "96px",
                height: "96px",
                objectFit: "cover",
                borderRadius: "999px",
                border: "1px solid rgba(255, 255, 255, 0.18)",
              }}
            />
            <label className="checkbox-row compact-checkbox-row">
              <ConfirmCheckbox
                message="Remove the current character picture?"
                name="removeTokenImage"
                value="1"
              />
              Remove current picture
            </label>
          </div>
        ) : null}
      </div>

      <div className="stack" style={{ gap: 0 }}>
        <img
          alt="Character build divider"
          className="ggcon-table-divider"
          src="/divider4.png"
        />
        <h2 style={{ margin: 0 }}>Character Build</h2>
      </div>

      <div className="form-grid character-build-grid">
        <label>
          Class 1
          <select
            required
            value={class1Name}
            onChange={(event) => setClass1Name(event.target.value)}
          >
            <option value="" disabled>
              Select a class
            </option>
            {DND_CLASSES.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
        </label>

        <label>
          Class 2
          <select
            value={class2Name}
            onChange={(event) => setClass2Name(event.target.value)}
          >
            <option value="">No second class</option>
            {DND_CLASSES.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
        </label>

        <label>
          Class 3
          <select
            value={class3Name}
            onChange={(event) => setClass3Name(event.target.value)}
          >
            <option value="">No third class</option>
            {DND_CLASSES.map((className) => (
              <option key={className} value={className}>
                {className}
              </option>
            ))}
          </select>
        </label>

        <label>
          Class 1 subclass
          <select
            value={class1Subclass}
            onChange={(event) => setClass1Subclass(event.target.value)}
          >
            <option value="">No subclass selected</option>
            {class1SubclassOptions.map((subclassName) => (
              <option key={subclassName} value={subclassName}>
                {subclassName}
              </option>
            ))}
          </select>
        </label>

        <label>
          Class 2 subclass
          <select
            disabled={!class2Name}
            value={class2Subclass}
            onChange={(event) => setClass2Subclass(event.target.value)}
          >
            <option value="">No subclass selected</option>
            {class2SubclassOptions.map((subclassName) => (
              <option key={subclassName} value={subclassName}>
                {subclassName}
              </option>
            ))}
          </select>
        </label>

        <label>
          Class 3 subclass
          <select
            disabled={!class3Name}
            value={class3Subclass}
            onChange={(event) => setClass3Subclass(event.target.value)}
          >
            <option value="">No subclass selected</option>
            {class3SubclassOptions.map((subclassName) => (
              <option key={subclassName} value={subclassName}>
                {subclassName}
              </option>
            ))}
          </select>
        </label>

        <label>
          Class 1 level
          <input
            type="number"
            min="1"
            max={class1Max}
            required
            value={String(class1Level)}
            onChange={(event) =>
              setClass1Level(
                clampLevel(Number(event.target.value || 1), 1, class1Max)
              )
            }
          />
        </label>

        <label>
          Class 2 level
          <input
            type="number"
            min="0"
            max={class2Max}
            value={String(class2Level)}
            onChange={(event) =>
              setClass2Level(
                clampLevel(Number(event.target.value || 0), 0, class2Max)
              )
            }
          />
        </label>

        <label>
          Class 3 level
          <input
            type="number"
            min="0"
            max={class3Max}
            value={String(class3Level)}
            onChange={(event) =>
              setClass3Level(
                clampLevel(Number(event.target.value || 0), 0, class3Max)
              )
            }
          />
        </label>
      </div>

      <div className="form-grid">
        <label>
          Total gold
          <input
            name="totalGold"
            type="number"
            min="0"
            required
            defaultValue={initialValues?.totalGold ?? 0}
          />
        </label>
        <div className="metric">
          <div className="metric-label">Total level</div>
          <div className="metric-value">{totalLevel}</div>
          <div className="metric-label">
            Tier {tier} | Magic item slots: {magicItemLimit}
          </div>
          <div className="metric-label">Consumable slots: {consumableItemLimit}</div>
          <div className="metric-label">Charm slots: {charmSlotCount}</div>
          <div className="metric-label">Maximum total level: 20</div>
        </div>
      </div>

      <div className="form-stack">
        <div aria-hidden="true" style={whiteDividerStyle} />
        <strong>Current build magic items (Uncommon+)</strong>
        <div className="form-grid">
          {magicItems.map((item, index) => (
            <label key={index}>
              Magic item slot {index + 1}
              {index < 3 ? " (attunement)" : ""}
              <select
                name="magicItems"
                value={item}
                onChange={(event) => {
                  const next = [...magicItems];
                  next[index] = event.target.value;
                  setMagicItems(next);
                }}
              >
                <option value="">Select an Uncommon+ magic item</option>
                {legalBuildMagicItemOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div aria-hidden="true" style={whiteDividerStyle} />
        <strong>Common magic items</strong>
        <div className="form-grid">
          {commonMagicItems.map((item, index) => (
            <label key={`common-${index}`}>
              Common Magic Item Slot {index + 1}
              <select
                name="commonMagicItems"
                value={item}
                onChange={(event) => {
                  const next = [...commonMagicItems];
                  next[index] = event.target.value;
                  setCommonMagicItems(next);
                }}
              >
                <option value="">Select a common magic item</option>
                {legalCommonMagicItemOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div aria-hidden="true" style={whiteDividerStyle} />
        <strong>Consumables</strong>
        <div className="form-grid">
          {consumables.map((item, index) => (
            <label key={`consumable-${index}`}>
              Consumable Slot {index + 1}
              <select
                name="consumables"
                value={item}
                onChange={(event) => {
                  const next = [...consumables];
                  next[index] = event.target.value;
                  setConsumables(next);
                }}
              >
                <option value="">Select a consumable</option>
                {legalConsumableOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          ))}
        </div>

        <div aria-hidden="true" style={whiteDividerStyle} />
        <strong>Boons, blessings, and charms</strong>
        <div className="form-grid">
          {boonSlotEnabled ? (
            <label>
              Boon Slot
              {legalBoonOptions.length ? (
                <select
                  name="boon"
                  value={boon}
                  onChange={(event) => setBoon(event.target.value)}
                >
                  <option value="">No boon selected</option>
                  {legalBoonOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name="boon"
                  type="text"
                  value={boon}
                  onChange={(event) => setBoon(event.target.value)}
                />
              )}
            </label>
          ) : (
            <input name="boon" type="hidden" value="" />
          )}
          <label>
            Blessing Slot
            {legalBlessingOptions.length ? (
              <select
                name="blessing"
                value={blessing}
                onChange={(event) => setBlessing(event.target.value)}
              >
                <option value="">No blessing selected</option>
                {legalBlessingOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            ) : (
              <input
                name="blessing"
                type="text"
                value={blessing}
                onChange={(event) => setBlessing(event.target.value)}
              />
            )}
          </label>
          {charms.map((item, index) => (
            <label key={`charm-${index}`}>
              Charm Slot {index + 1}
              {legalCharmOptions.length ? (
                <select
                  name="charms"
                  value={item}
                  onChange={(event) => {
                    const next = [...charms];
                    next[index] = event.target.value;
                    setCharms(next);
                  }}
                >
                  <option value="">No charm selected</option>
                  {legalCharmOptions.map((option) => (
                    <option key={option} value={option}>
                      {option}
                    </option>
                  ))}
                </select>
              ) : (
                <input
                  name="charms"
                  type="text"
                  value={item}
                  onChange={(event) => {
                    const next = [...charms];
                    next[index] = event.target.value;
                    setCharms(next);
                  }}
                />
              )}
            </label>
          ))}
        </div>
      </div>

      <div className="stack" style={{ gap: 0 }}>
        <img
          alt="Character details divider"
          className="ggcon-table-divider"
          src="/divider4.png"
        />
        <h2 style={{ margin: 0 }}>Character Details</h2>
      </div>

      <div className="form-grid">
        <div className="skill-matrix form-span-full">
          <div aria-hidden="true" style={whiteDividerStyle} />
          <p style={{ margin: 0 }}>Skills</p>
          <div className="skill-matrix-columns">
            {skillGroups.map((group, groupIndex) => (
              <div className="skill-matrix-group" key={`skill-group-${groupIndex + 1}`}>
                <div className="skill-matrix-grid">
                  <div className="skill-matrix-header">Skill</div>
                  <div className="skill-matrix-header">Proficiency</div>
                  <div className="skill-matrix-header">Expertise</div>
                  {group.map((skill) => (
                    <div className="skill-matrix-row" key={skill.name}>
                      <div className="skill-matrix-skill">
                        <span className="skill-matrix-ability">{skill.ability}</span>
                        <span>{skill.name}</span>
                      </div>
                      <input
                        aria-label={`${skill.name} proficiency`}
                        checked={
                          skillSelections[skill.name] === "proficiency" ||
                          skillSelections[skill.name] === "expertise"
                        }
                        className="skill-matrix-checkbox"
                        onChange={(event) =>
                          updateSkillSelection(
                            skill.name,
                            "proficiency",
                            event.target.checked
                          )
                        }
                        type="checkbox"
                      />
                      <input
                        aria-label={`${skill.name} expertise`}
                        checked={skillSelections[skill.name] === "expertise"}
                        className="skill-matrix-checkbox"
                        onChange={(event) =>
                          updateSkillSelection(
                            skill.name,
                            "expertise",
                            event.target.checked
                          )
                        }
                        type="checkbox"
                      />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <div className="tool-matrix form-span-full">
          <div aria-hidden="true" style={whiteDividerStyle} />
          <p style={{ margin: 0 }}>Tools</p>
          <div className="tool-matrix-grid">
            {toolGroups.map((group) => (
              <div className="tool-matrix-group" key={group.title}>
                <div className="tool-matrix-group-title">{group.title}</div>
                {group.note ? (
                  <div className="tool-matrix-group-note">{group.note}</div>
                ) : null}
                <div className="tool-matrix-options">
                  {group.tools.map((tool) => (
                    <label className="tool-matrix-option" key={tool}>
                      <input
                        aria-label={`${tool} proficiency`}
                        checked={toolSelections[tool] === true}
                        onChange={(event) => updateToolSelection(tool, event.target.checked)}
                        type="checkbox"
                      />
                      <span>{tool}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <label className="form-span-full">
          <div className="language-matrix">
            <div aria-hidden="true" style={whiteDividerStyle} />
            <p style={{ margin: 0 }}>Languages</p>
            <div className="language-matrix-grid">
              {languageGroups.map((group) => (
                <div className="language-matrix-group" key={group.title}>
                  <div className="language-matrix-group-title">{group.title}</div>
                  {group.note ? (
                    <div className="language-matrix-group-note">{group.note}</div>
                  ) : null}
                  {group.languages.length ? (
                    <div className="language-matrix-options">
                      {group.languages.map((language) => {
                        const isClassGrantedLanguageGroup =
                          group.title === CLASS_GRANTED_LANGUAGE_GROUP_TITLE;

                        return (
                          <label className="language-matrix-option" key={language}>
                            <input
                              checked={
                                isClassGrantedLanguageGroup
                                  ? classGrantedLanguageSet.has(language)
                                  : languageSelections[language] === true
                              }
                              disabled={isClassGrantedLanguageGroup}
                              onChange={
                                isClassGrantedLanguageGroup
                                  ? undefined
                                  : (event) =>
                                      updateLanguageSelection(language, event.target.checked)
                              }
                              type="checkbox"
                            />
                            <span>{language}</span>
                          </label>
                        );
                      })}
                    </div>
                  ) : null}
                </div>
              ))}
            </div>
          </div>
        </label>
        <div className="feat-matrix form-span-full">
          <div aria-hidden="true" style={whiteDividerStyle} />
          <p style={{ margin: 0 }}>Feats</p>
          <div className="feat-matrix-grid">
            {featGroups.map((group) => (
              <div className="feat-matrix-group" key={group.title}>
                <div className="feat-matrix-group-title">{group.title}</div>
                {group.note ? (
                  <div className="feat-matrix-group-note">{group.note}</div>
                ) : null}
                <div className="feat-matrix-options">
                  {group.feats.map((feat) => (
                    <label className="feat-matrix-option" key={feat}>
                      <input
                        checked={featSelections[feat] === true}
                        onChange={(event) => updateFeatSelection(feat, event.target.checked)}
                        type="checkbox"
                      />
                      <span>{feat}</span>
                    </label>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
        <label className="form-span-full">
          <div aria-hidden="true" style={whiteDividerStyle} />
          Character backstory
          <textarea
            name="backstory"
            onChange={(event) => setBackstory(event.target.value)}
            placeholder="Add the character's backstory, history, or notable lore."
            ref={backstoryRef}
            style={{ overflow: "hidden", resize: "none" }}
            value={backstory}
          />
        </label>
        <label className="form-span-full">
          <div aria-hidden="true" style={whiteDividerStyle} />
          Notes
          <textarea
            name="notes"
            onChange={(event) => setNotes(event.target.value)}
            placeholder="Add character notes, reminders, or other important details."
            ref={notesRef}
            style={{ overflow: "hidden", resize: "none" }}
            value={notes}
          />
        </label>
      </div>

      <SubmitButton label={submitLabel} />
    </form>
  );
}
