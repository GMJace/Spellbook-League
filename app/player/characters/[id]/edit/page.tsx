import Link from "next/link";
import { notFound } from "next/navigation";
import { CharacterForm } from "@/components/character-form";
import { updateCharacter } from "@/app/player/characters/[id]/actions";
import { CharacterBuildDisplay } from "@/components/character-build-display";
import {
  getCharacterTier,
  getCharacterTotalLevel,
} from "@/lib/character";
import { requireRole } from "@/lib/auth";
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

  const character = await prisma.character.findFirst({
    where: {
      id,
      userId: user.id,
    },
  });

  if (!character) {
    notFound();
  }

  const totalLevel = getCharacterTotalLevel(character);
  const tier = getCharacterTier(totalLevel);

  return (
    <main className="stack">
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
          <div className="stack" style={{ gap: "0.5rem", marginTop: "0.5rem" }}>
            <div>
              <p className="muted" style={{ margin: 0 }}>
                Build
              </p>
              <div style={{ marginTop: "0.35rem" }}>
                <CharacterBuildDisplay character={character} compact />
              </div>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Tier {tier}
            </p>
          </div>
          </div>
          <Link className="button button-secondary" href={`/player/characters/${character.id}`}>
            Return to character log
          </Link>
        </div>
      </section>

      <section className="card ledger-panel stack">
        {query.message ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{query.message}</p>
        ) : query.error === "invalid" ? (
          <p style={{ color: "#ffffff", margin: 0 }}>Please complete the character details.</p>
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
          legalCommonMagicItemOptions={legalMagicItemOptions.Common}
          legalConsumableOptions={legalConsumableOptions}
          legalBoonOptions={legalBoonOptions}
          legalBlessingOptions={legalBlessingOptions}
          legalCharmOptions={legalCharmOptions}
          legalFeatOptions={legalFeatOptions}
          legalToolOptions={legalToolOptions}
          legalLanguageOptions={legalLanguageOptions}
          legalSubclassOptions={legalSubclassOptions}
          submitLabel="Update character log"
          initialValues={{
            name: character.name,
            characterSheetLink: character.characterSheetLink,
            armorClass: character.armorClass,
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
            commonMagicItems: character.commonMagicItems,
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
