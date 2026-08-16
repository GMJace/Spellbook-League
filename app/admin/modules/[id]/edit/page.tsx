import Link from "next/link";
import { notFound } from "next/navigation";

import { updateAdventureModule } from "@/app/admin/modules/actions";
import { AdminModuleForm } from "@/components/admin-module-form";
import { AdminPageHeader } from "@/components/admin-page-header";
import { requireAdminUser } from "@/lib/admin";
import {
  buildUncommonPlusMagicItems,
  buildUncommonPlusRarityByItem,
  mergeUniqueOptions,
  parseAdminModuleMagicItem,
} from "@/lib/admin-module-magic-items";
import { parseAdventureCatalogListJson } from "@/lib/adventure-catalog";
import {
  getCharacterBuildMagicItemOptions,
  getLeagueLegalMagicItemOptions,
  getLeagueLegalMinorPropertyOptions,
} from "@/lib/league-legal-choices";
import { prisma } from "@/lib/prisma";
import { formatDate, formatTier } from "@/lib/utils";

export const dynamic = "force-dynamic";

type PageProps = {
  params: Promise<{
    id: string;
  }>;
  searchParams: Promise<{
    module?: string;
  }>;
};

export default async function AdminModuleEditPage({ params, searchParams }: PageProps) {
  await requireAdminUser();

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [module, legalMagicItemOptions, legalMinorPropertyOptions] = await Promise.all([
    prisma.adventureCatalog.findUnique({
      where: { id },
    }),
    getLeagueLegalMagicItemOptions(),
    getLeagueLegalMinorPropertyOptions(),
  ]);

  if (!module) {
    notFound();
  }

  const existingCommonMagicItems = parseAdventureCatalogListJson(module.commonMagicItemsJson).map(
    parseAdminModuleMagicItem
  );
  const existingUncommonPlusMagicItems = buildUncommonPlusMagicItems(module);
  const legalCommonMagicItemOptions = mergeUniqueOptions(
    legalMagicItemOptions.Common,
    existingCommonMagicItems.map((item) => item.item)
  );
  const legalUncommonPlusMagicItemOptions = mergeUniqueOptions(
    getCharacterBuildMagicItemOptions(legalMagicItemOptions),
    existingUncommonPlusMagicItems.map((item) => item.item)
  );
  const uncommonPlusRarityByItem = {
    ...buildUncommonPlusRarityByItem(legalMagicItemOptions),
    ...Object.fromEntries(existingUncommonPlusMagicItems.map((item) => [item.item, item.rarity])),
  };

  const moduleMessageMap: Record<string, string> = {
    conflict: "A module with that code, title, and tier already exists.",
    "image-invalid": "Adventure art must be an image file under 5 MB.",
    invalid: "That module update could not be completed.",
    updated: "Module saved.",
  };
  const moduleMessage = query.module ? moduleMessageMap[query.module] : "";

  return (
    <main className="page-shell">
      <section className="stack">
        {moduleMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{moduleMessage}</p> : null}

        <AdminPageHeader
          description="Edit the live module autofill record and keep the workbook provenance close at hand for cleanup."
          extraActions={
            <Link className="button secondary" href="/admin/modules?sort=code">
              Back to modules
            </Link>
          }
          title="Edit module"
        />

        <section className="list-card stack">
          <img alt="Module edit divider" className="ggcon-table-divider" src="/divider4.png" />
          <div
            className="inline-actions"
            style={{ justifyContent: "space-between", alignItems: "flex-start" }}
          >
            <div>
              <h2 style={{ margin: 0 }}>{module.title}</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                {module.adventureCode} | {formatTier(module.tier)}
              </p>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Updated {formatDate(module.updatedAt)}
              </p>
            </div>
          </div>

          <form action={updateAdventureModule} className="form-stack">
            <AdminModuleForm
              cancelHref="/admin/modules?sort=code"
              initialValues={{
                moduleId: module.id,
                adventureCode: module.adventureCode,
                title: module.title,
                tier: module.tier,
                duration: module.duration,
                sourceSheet: module.sourceSheet,
                gameSummary: module.gameSummary,
                adventureImagePath: module.adventureImagePath,
                serviceHours: String(module.serviceHours ?? 0),
                downtimeDaysAwarded: String(module.downtimeDaysAwarded ?? 0),
                gold: module.gold,
                commonMagicItems: existingCommonMagicItems,
                uncommonPlusMagicItems: existingUncommonPlusMagicItems,
                consumables: parseAdventureCatalogListJson(module.consumablesJson),
                spellbook: module.spellbook,
                boons: parseAdventureCatalogListJson(module.boonsJson),
                blessings: parseAdventureCatalogListJson(module.blessingsJson),
                charms: parseAdventureCatalogListJson(module.charmsJson),
                additionalMagicRewardNotes: module.additionalMagicRewardNotes,
                additionalConsumableNotes: module.additionalConsumableNotes,
                storyAwards: module.storyAwards,
                sourceNotes: module.sourceNotes,
              }}
              legalCommonMagicItemOptions={legalCommonMagicItemOptions}
              legalMinorPropertyOptions={legalMinorPropertyOptions}
              legalUncommonPlusMagicItemOptions={legalUncommonPlusMagicItemOptions}
              submitLabel="Save module"
              uncommonPlusRarityByItem={uncommonPlusRarityByItem}
            />
          </form>
        </section>
      </section>
    </main>
  );
}
