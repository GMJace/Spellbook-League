import Link from "next/link";
import { notFound } from "next/navigation";
import { CharacterForm } from "@/components/character-form";
import { updateCharacter } from "@/app/player/characters/[id]/actions";
import { requireRole } from "@/lib/auth";
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
import { prisma } from "@/lib/prisma";

export const dynamic = "force-dynamic";

export default async function EditCharacterPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ created?: string; updated?: string; error?: string; message?: string }>;
}) {
  const user = await requireRole("PLAYER");
  const { id } = await params;
  const query = await searchParams;
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

  const character = await prisma.character.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!character) {
    notFound();
  }

  return (
    <main className="stack character-workflow-page">
      <section className="panel ledger-panel stack">
        <div
          style={{
            display: "flex",
            gap: "1rem",
            justifyContent: "space-between",
            alignItems: "flex-start",
            flexWrap: "wrap",
          }}
        >
          <div>
          <p className="eyebrow">Edit character log</p>
          <h1>{character.name}</h1>
          </div>
          <Link className="button button-secondary" href={`/player/characters/${character.id}`}>
            Back
          </Link>
        </div>
      </section>

      <section className="card ledger-panel stack">
        {query.message ? (
          <div className="character-form-error-alert" role="alert">
            <p style={{ margin: 0 }}>Could not save character logsheet: {query.message}</p>
          </div>
        ) : query.error === "invalid" ? (
          <div className="character-form-error-alert" role="alert">
            <p style={{ margin: 0 }}>Please complete the character details.</p>
          </div>
        ) : null}
        {query.created === "1" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>Character created.</p>
        ) : null}
        {query.updated === "1" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>Character updated.</p>
        ) : null}
        <CharacterForm
          action={updateCharacter.bind(null, character.id)}
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
          submitLabel="Update character log"
          initialValues={{
            name: character.name,
            characterSheetLink: character.characterSheetLink,
            isPubliclyViewable: character.isPubliclyViewable,
            blindsightFt: character.blindsightFt,
            darkvisionFt: character.darkvisionFt,
            tremorsenseFt: character.tremorsenseFt,
            truesightFt: character.truesightFt,
            hitPoints: character.hitPoints,
            armorClass: character.armorClass,
            passivePerception: character.passivePerception,
            spellSaveDc: character.spellSaveDc,
            tokenImagePath: character.tokenImagePath,
            class1Name: character.class1Name,
            class1Subclass: character.class1Subclass,
            class1Level: character.class1Level,
            class2Name: character.class2Name,
            class2Subclass: character.class2Subclass,
            class2Level: character.class2Level,
            class3Name: character.class3Name,
            class3Subclass: character.class3Subclass,
            class3Level: character.class3Level,
            feats: character.feats,
            proficiencies: character.proficiencies,
            tools: character.tools,
            languages: character.languages,
            notes: character.notes,
            backstory: character.backstory,
            totalGold: character.totalGold,
            magicItems: character.magicItems,
            magicItemMinorProperties: character.magicItemMinorProperties,
            magicItemFlavors: character.magicItemFlavors,
            commonMagicItems: character.commonMagicItems,
            commonMagicItemMinorProperties: character.commonMagicItemMinorProperties,
            commonMagicItemFlavors: character.commonMagicItemFlavors,
            consumables: character.consumables,
            boon: character.boon,
            blessing: character.blessing,
            charms: character.charms,
          }}
        />
      </section>
    </main>
  );
}
