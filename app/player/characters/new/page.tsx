import Link from "next/link";
import { redirect } from "next/navigation";
import { importCharacterLogsheet } from "@/app/player/characters/new/actions";
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
      <div
        style={{
          display: "flex",
          gap: "0.75rem",
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        <Link className="button button-secondary" href="/player/character-logsheet-template">
          Download character import template
        </Link>
        <p className="muted" style={{ margin: 0 }}>
          Fill out this CSV template to prepare for character logsheet imports.
        </p>
      </div>
      <form action={importCharacterLogsheet} className="list-card form-stack">
        <div>
          <h2 style={{ margin: 0 }}>Import a character logsheet</h2>
          <p className="muted" style={{ margin: "0.35rem 0 0" }}>
            Upload the completed CSV template to create one or more character logs from the sheet.
          </p>
        </div>
        <label>
          Completed character logsheet spreadsheet
          <input
            accept=".csv,text/csv,.xlsx,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet"
            name="characterLogsheetFile"
            required
            type="file"
          />
        </label>
        <button type="submit">Import character logsheet</button>
      </form>
      <img
        alt="Character import divider"
        className="homepage-roster-divider"
        src="/divider4.png"
      />
      {query.message ? (
        <p style={{ color: "#ffffff", margin: 0 }}>
          Could not save character logsheet: {query.message}
        </p>
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
