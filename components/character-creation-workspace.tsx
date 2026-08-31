"use client";

import { type ReactNode, useState, useTransition } from "react";
import {
  CharacterForm,
  type CharacterFormValues,
} from "@/components/character-form";
import type { LegalFeatGroup, LegalLanguageGroup, LegalToolGroup } from "@/lib/character";
import type { LegalSubclassOptionsMap } from "@/lib/character-options";

function buildImportedInitialValues(character: Record<string, unknown>): Partial<CharacterFormValues> {
  const nextValues: Partial<CharacterFormValues> = {
    characterSheetLink:
      typeof character.characterSheetLink === "string" ? character.characterSheetLink : null,
    feats: typeof character.feats === "string" ? character.feats : undefined,
    backstory: typeof character.backstory === "string" ? character.backstory : undefined,
    languages: typeof character.languages === "string" ? character.languages : undefined,
    name: typeof character.name === "string" ? character.name : "",
    proficiencies:
      typeof character.proficiencies === "string" ? character.proficiencies : undefined,
    tools: typeof character.tools === "string" ? character.tools : undefined,
  };

  for (const [key, value] of Object.entries(character)) {
    if (
      [
        "armorClass",
        "blindsightFt",
        "darkvisionFt",
        "hitPoints",
        "passivePerception",
        "spellSaveDc",
        "totalGold",
        "tremorsenseFt",
        "truesightFt",
        "class1Level",
        "class2Level",
        "class3Level",
      ].includes(key) &&
      typeof value === "number"
    ) {
      nextValues[key as keyof CharacterFormValues] = value as never;
    }

    if (
      [
        "class1Name",
        "class1Subclass",
        "class2Name",
        "class2Subclass",
        "class3Name",
        "class3Subclass",
      ].includes(key) &&
      (typeof value === "string" || value === null)
    ) {
      nextValues[key as keyof CharacterFormValues] = value as never;
    }
  }

  return nextValues;
}

export function CharacterCreationWorkspace({
  feedback,
  legalBlessingOptions,
  legalBoonOptions,
  legalBuildMagicItemOptions,
  legalCharmOptions,
  legalCommonMagicItemOptions,
  legalConsumableOptions,
  legalFeatGroups,
  legalFeatOptions,
  legalLanguageGroups,
  legalLanguageOptions,
  legalMinorPropertyOptions,
  legalSubclassOptions,
  legalToolGroups,
  legalToolOptions,
  legalUncommonMagicItemOptions,
  spreadsheetImportCard,
}: {
  feedback?: ReactNode;
  legalBlessingOptions: string[];
  legalBoonOptions: string[];
  legalBuildMagicItemOptions: string[];
  legalCharmOptions: string[];
  legalCommonMagicItemOptions: string[];
  legalConsumableOptions: string[];
  legalFeatGroups: LegalFeatGroup[];
  legalFeatOptions: string[];
  legalLanguageGroups: LegalLanguageGroup[];
  legalLanguageOptions: string[];
  legalMinorPropertyOptions: string[];
  legalSubclassOptions: LegalSubclassOptionsMap;
  legalToolGroups: LegalToolGroup[];
  legalToolOptions: string[];
  legalUncommonMagicItemOptions: string[];
  spreadsheetImportCard: ReactNode;
}) {
  const [characterPdfFile, setCharacterPdfFile] = useState<File | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<string | null>(null);
  const [importedValues, setImportedValues] = useState<Partial<CharacterFormValues> | undefined>();
  const [formKey, setFormKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  return (
    <>
      {feedback ? (
        <div className="character-form-error-alert" role="alert">
          {feedback}
        </div>
      ) : null}
      {errorMessage ? (
        <div className="character-form-error-alert" role="alert">
          {errorMessage}
        </div>
      ) : null}
      <div className="store-line-divider" />
      <div className="character-import-grid">
        {spreadsheetImportCard}
        <form
          className="list-card form-stack character-import-card"
          onSubmit={(event) => {
            event.preventDefault();

            startTransition(async () => {
              setErrorMessage(null);
              setStatusMessage(null);

              try {
                if (!characterPdfFile) {
                  throw new Error("Choose a D&D Beyond exported PDF first.");
                }

                const formData = new FormData();
                formData.set("characterPdfFile", characterPdfFile);

                const response = await fetch("/api/dndbeyond/character-import", {
                  body: formData,
                  method: "POST",
                });
                const payload = (await response.json()) as {
                  character?: Record<string, unknown>;
                  error?: string;
                };

                if (!response.ok || !payload.character) {
                  throw new Error(
                    payload.error ?? "The D&D Beyond PDF import could not be completed.",
                  );
                }

                const nextValues = buildImportedInitialValues(payload.character);
                setImportedValues(nextValues);
                setFormKey((current) => current + 1);
                setStatusMessage(
                  `Imported ${nextValues.name || "character details"} from a D&D Beyond PDF. Review the form below before saving.`,
                );
              } catch (error) {
                setErrorMessage(
                  error instanceof Error
                    ? error.message
                    : "The D&D Beyond PDF import could not be completed.",
                );
              }
            });
          }}
        >
          <div>
            <h2 style={{ margin: 0 }}>Import Character from D&amp;D Beyond PDF</h2>
            <ol className="muted" style={{ margin: "0.35rem 0 0", paddingLeft: "1.25rem" }}>
              <li>Export your character sheet from DnDBeyond.com as a PDF</li>
              <li>
                Upload the exported PDF here
              </li>
              <li>
                Review the character upload before saving (DnDBeyond is a less accurate uploading
                process and will most likely be missing information that needs completion or
                editing)
              </li>
            </ol>
          </div>
          <label>
            D&amp;D Beyond exported PDF
            <input
              accept=".pdf,application/pdf"
              onChange={(event) => setCharacterPdfFile(event.target.files?.[0] ?? null)}
              type="file"
            />
          </label>
          <p className="muted" style={{ margin: 0, fontSize: "0.85rem" }}>
            Importing again will replace any unsaved values currently in the form.
          </p>
          <button disabled={isPending} type="submit">
            {isPending ? "Importing..." : "Import from D&D Beyond PDF"}
          </button>
          {statusMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{statusMessage}</p> : null}
        </form>
      </div>
      <p className="muted character-import-manual-note">
        You can also create a Character Logsheet manually.
      </p>
      <img
        alt="Character import divider"
        className="homepage-roster-divider"
        src="/divider4.png"
      />
      <CharacterForm
        key={formKey}
        initialValues={importedValues}
        legalBuildMagicItemOptions={legalBuildMagicItemOptions}
        legalUncommonMagicItemOptions={legalUncommonMagicItemOptions}
        legalCommonMagicItemOptions={legalCommonMagicItemOptions}
        legalMinorPropertyOptions={legalMinorPropertyOptions}
        legalConsumableOptions={legalConsumableOptions}
        legalBoonOptions={legalBoonOptions}
        legalBlessingOptions={legalBlessingOptions}
        legalCharmOptions={legalCharmOptions}
        legalFeatGroups={legalFeatGroups}
        legalFeatOptions={legalFeatOptions}
        legalToolGroups={legalToolGroups}
        legalToolOptions={legalToolOptions}
        legalLanguageGroups={legalLanguageGroups}
        legalLanguageOptions={legalLanguageOptions}
        legalSubclassOptions={legalSubclassOptions}
      />
    </>
  );
}
