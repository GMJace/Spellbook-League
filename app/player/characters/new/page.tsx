import { redirect } from "next/navigation";
import { CharacterForm } from "@/components/character-form";
import { getCharacterLimitForRoles } from "@/lib/character-limits";
import {
  getLeagueLegalBlessingOptions,
  getLeagueLegalBoonOptions,
  getLeagueLegalCharmOptions,
  getCharacterBuildMagicItemOptions,
  getLeagueLegalConsumableOptions,
  getLeagueLegalFeatGroups,
  getLeagueLegalFeatOptions,
  getLeagueLegalLanguageGroups,
  getLeagueLegalLanguageOptions,
  getLeagueLegalMagicItemOptions,
  getLeagueLegalMinorPropertyOptions,
  getLeagueLegalSubclassOptions,
  getLeagueLegalToolGroups,
  getLeagueLegalToolOptions,
} from "@/lib/league-legal-choices";
import { requireRole } from "@/lib/auth";
import { prisma } from "@/lib/prisma";

export default async function NewCharacterPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; message?: string }>;
}) {
  const query = await searchParams;
  const user = await requireRole("PLAYER");
  const characterLimit = getCharacterLimitForRoles(user.roles);
  const existingCharacterCount = await prisma.character.count({
    where: {
      userId: user.id,
    },
  });

  if (existingCharacterCount >= characterLimit) {
    redirect(`/player?characterLimit=reached&limit=${characterLimit}`);
  }

  const [
    legalSubclassOptions,
    legalMagicItemOptions,
    legalMinorPropertyOptions,
    legalConsumableOptions,
    legalFeatGroups,
    legalFeatOptions,
    legalToolGroups,
    legalToolOptions,
    legalLanguageGroups,
    legalLanguageOptions,
    legalBoonOptions,
    legalBlessingOptions,
    legalCharmOptions,
  ] = await Promise.all([
    getLeagueLegalSubclassOptions(),
    getLeagueLegalMagicItemOptions(),
    getLeagueLegalMinorPropertyOptions(),
    getLeagueLegalConsumableOptions(),
    getLeagueLegalFeatGroups(),
    getLeagueLegalFeatOptions(),
    getLeagueLegalToolGroups(),
    getLeagueLegalToolOptions(),
    getLeagueLegalLanguageGroups(),
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
        legalUncommonMagicItemOptions={legalMagicItemOptions.Uncommon}
        legalCommonMagicItemOptions={legalMagicItemOptions.Common}
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
    </main>
  );
}
