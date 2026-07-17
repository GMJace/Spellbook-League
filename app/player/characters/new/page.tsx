import { CharacterForm } from "@/components/character-form";
import {
  getLeagueLegalBlessingOptions,
  getLeagueLegalBoonOptions,
  getLeagueLegalCharmOptions,
  getCharacterBuildMagicItemOptions,
  getLeagueLegalConsumableOptions,
  getLeagueLegalFeatOptions,
  getLeagueLegalLanguageOptions,
  getLeagueLegalMagicItemOptions,
  getLeagueLegalSubclassOptions,
  getLeagueLegalToolOptions,
} from "@/lib/league-legal-choices";

export default async function NewCharacterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const query = await searchParams;
  const [
    legalSubclassOptions,
    legalMagicItemOptions,
    legalConsumableOptions,
    legalFeatOptions,
    legalToolOptions,
    legalLanguageOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
  ] = await Promise.all([
    getLeagueLegalSubclassOptions(),
    getLeagueLegalMagicItemOptions(),
    getLeagueLegalConsumableOptions(),
    getLeagueLegalFeatOptions(),
    getLeagueLegalToolOptions(),
    getLeagueLegalLanguageOptions(),
    getLeagueLegalBoonOptions(),
    getLeagueLegalBlessingOptions(),
    getLeagueLegalCharmOptions(),
  ]);

  return (
    <main className="panel stack">
      <div>
        <p className="eyebrow">Character creation</p>
        <h1>Create a new character</h1>
        <p className="muted">
          Create a persistent logsheet record with class splits, gold totals,
          and current build tracking.
        </p>
      </div>
      {query.message ? (
        <p style={{ color: "#ffffff", margin: 0 }}>{query.message}</p>
      ) : query.error === "invalid" ? (
        <p style={{ color: "#ffffff", margin: 0 }}>Please complete the character details.</p>
      ) : null}
      <CharacterForm
        legalBuildMagicItemOptions={getCharacterBuildMagicItemOptions(legalMagicItemOptions)}
        legalCommonMagicItemOptions={legalMagicItemOptions.Common}
        legalConsumableOptions={legalConsumableOptions}
        legalBoonOptions={legalBoonOptions}
        legalBlessingOptions={legalBlessingOptions}
        legalCharmOptions={legalCharmOptions}
        legalFeatOptions={legalFeatOptions}
        legalToolOptions={legalToolOptions}
        legalLanguageOptions={legalLanguageOptions}
        legalSubclassOptions={legalSubclassOptions}
      />
    </main>
  );
}
