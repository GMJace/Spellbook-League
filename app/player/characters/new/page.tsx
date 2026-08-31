import Link from "next/link";
import { redirect } from "next/navigation";
import { importCharacterLogsheet } from "@/app/player/characters/new/actions";
import { CharacterCreationWorkspace } from "@/components/character-creation-workspace";
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
        <h1>Create a New Character Logsheet</h1>
      </div>
      <CharacterCreationWorkspace
        spreadsheetImportCard={
          <form action={importCharacterLogsheet} className="list-card form-stack character-import-card">
            <div>
              <h2 style={{ margin: 0 }}>Import Character by Spreadsheet</h2>
              <ol className="muted" style={{ margin: "0.35rem 0 0", paddingLeft: "1.25rem" }}>
                <li>Download the CSV template</li>
                <li>
                  Upload the template using Microsoft Excel, Google Sheets or spreadsheet
                  equivalent
                </li>
                <li>Fill it out for one of your characters, one character at a time</li>
                <li>Upload it here</li>
              </ol>
            </div>
            <Link className="button button-secondary" href="/player/character-logsheet-template">
              Download character import template
            </Link>
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
        }
        feedback={
          query.message ? (
            <p style={{ margin: 0 }}>
              Could not save character logsheet: {query.message}
            </p>
          ) : query.error === "invalid" ? (
            <p style={{ margin: 0 }}>Please complete the character details.</p>
          ) : null
        }
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
