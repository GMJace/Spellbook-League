import Link from "next/link";
import { notFound } from "next/navigation";

import {
  promotePendingAdventureModule,
  updatePendingAdventureModule,
} from "@/app/admin/modules/actions";
import { AdminModuleForm } from "@/components/admin-module-form";
import { AdminPageHeader } from "@/components/admin-page-header";
import {
  buildUncommonPlusMagicItems,
  buildUncommonPlusRarityByItem,
  mergeUniqueOptions,
  parseAdminModuleMagicItem,
} from "@/lib/admin-module-magic-items";
import { parseAdventureCatalogListJson } from "@/lib/adventure-catalog";
import { requireAdminUser } from "@/lib/admin";
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

export default async function PendingAdminModulePage({ params, searchParams }: PageProps) {
  await requireAdminUser();

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const [pendingModule, legalMagicItemOptions, legalMinorPropertyOptions] = await Promise.all([
    prisma.pendingAdventureModule.findUnique({
      where: { id },
      include: {
        lastReportedBy: {
          select: {
            name: true,
          },
        },
      },
    }),
    getLeagueLegalMagicItemOptions(),
    getLeagueLegalMinorPropertyOptions(),
  ]);

  if (!pendingModule) {
    notFound();
  }

  const existingCommonMagicItems = parseAdventureCatalogListJson(
    pendingModule.commonMagicItemsJson
  ).map(parseAdminModuleMagicItem);
  const existingUncommonPlusMagicItems = buildUncommonPlusMagicItems(pendingModule);
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
    conflict: "A live module with that code, title, and tier already exists.",
    "image-invalid": "Adventure art must be an image file under 5 MB.",
    invalid: "That pending module update could not be completed.",
    updated: "Pending module saved.",
  };
  const moduleMessage = query.module ? moduleMessageMap[query.module] : "";

  return (
    <main className="page-shell">
      <section className="stack">
        {moduleMessage ? <p style={{ color: "#ffffff", margin: 0 }}>{moduleMessage}</p> : null}

        <AdminPageHeader
          description="Review a player-submitted module, clean up the details, and promote it into the live autofill catalog when it is ready."
          extraActions={
            <Link className="button secondary" href="/admin/modules?sort=code">
              Back to modules
            </Link>
          }
          title="Pending module"
        />

        <section className="list-card stack">
          <img alt="Pending module divider" className="ggcon-table-divider" src="/divider4.png" />
          <div
            className="inline-actions"
            style={{ justifyContent: "space-between", alignItems: "flex-start" }}
          >
            <div>
              <h2 style={{ margin: 0 }}>{pendingModule.title}</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                {pendingModule.adventureCode} | {formatTier(pendingModule.tier)}
              </p>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Last reported {formatDate(pendingModule.lastReportedAt)}
                {pendingModule.lastReportedBy?.name ? ` by ${pendingModule.lastReportedBy.name}` : ""}
              </p>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Reports: {pendingModule.reportCount}
                {pendingModule.reportedDmName ? ` | Reported DM: ${pendingModule.reportedDmName}` : ""}
              </p>
            </div>
          </div>

          <form action={updatePendingAdventureModule} className="form-stack">
            <input name="pendingModuleId" type="hidden" value={pendingModule.id} />
            <AdminModuleForm
              cancelHref="/admin/modules?sort=code"
              extraActions={
                <button className="button" formAction={promotePendingAdventureModule} type="submit">
                  Save to live module database
                </button>
              }
              initialValues={{
                adventureCode: pendingModule.adventureCode,
                title: pendingModule.title,
                tier: pendingModule.tier,
                duration: pendingModule.duration,
                sourceSheet: pendingModule.sourceSheet,
                gameSummary: pendingModule.gameSummary,
                adventureImagePath: pendingModule.adventureImagePath,
                serviceHours: String(pendingModule.serviceHours ?? 0),
                downtimeDaysAwarded: String(pendingModule.downtimeDaysAwarded ?? 0),
                gold: pendingModule.gold,
                commonMagicItems: existingCommonMagicItems,
                uncommonPlusMagicItems: existingUncommonPlusMagicItems,
                consumables: parseAdventureCatalogListJson(pendingModule.consumablesJson),
                spellbook: pendingModule.spellbook,
                boons: parseAdventureCatalogListJson(pendingModule.boonsJson),
                blessings: parseAdventureCatalogListJson(pendingModule.blessingsJson),
                charms: parseAdventureCatalogListJson(pendingModule.charmsJson),
                additionalMagicRewardNotes: pendingModule.additionalMagicRewardNotes,
                additionalConsumableNotes: pendingModule.additionalConsumableNotes,
                storyAwards: pendingModule.storyAwards,
                sourceNotes: pendingModule.sourceNotes,
              }}
              legalCommonMagicItemOptions={legalCommonMagicItemOptions}
              legalMinorPropertyOptions={legalMinorPropertyOptions}
              legalUncommonPlusMagicItemOptions={legalUncommonPlusMagicItemOptions}
              submitLabel="Save pending module"
              uncommonPlusRarityByItem={uncommonPlusRarityByItem}
            />
          </form>
        </section>
      </section>
    </main>
  );
}
