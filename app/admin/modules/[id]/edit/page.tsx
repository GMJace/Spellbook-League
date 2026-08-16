import Link from "next/link";
import { notFound } from "next/navigation";

import { updateAdventureModule } from "@/app/admin/modules/actions";
import { AdminPageHeader } from "@/components/admin-page-header";
import {
  ADVENTURE_CATALOG_TIER_OPTIONS,
  parseAdventureCatalogListJson,
} from "@/lib/adventure-catalog";
import { requireAdminUser } from "@/lib/admin";
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

function formatListForTextarea(value: string) {
  return parseAdventureCatalogListJson(value).join("\n");
}

export default async function AdminModuleEditPage({ params, searchParams }: PageProps) {
  await requireAdminUser();

  const [{ id }, query] = await Promise.all([params, searchParams]);
  const module = await prisma.adventureCatalog.findUnique({
    where: { id },
  });

  if (!module) {
    notFound();
  }

  const moduleMessageMap: Record<string, string> = {
    conflict: "A module with that code, title, and tier already exists.",
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
            <input name="moduleId" type="hidden" value={module.id} />

            <div className="form-grid">
              <label>
                Adventure code
                <input defaultValue={module.adventureCode} name="adventureCode" required type="text" />
              </label>
              <label>
                Title
                <input defaultValue={module.title} name="title" required type="text" />
              </label>
              <label>
                Tier
                <select defaultValue={module.tier} name="tier" required>
                  {ADVENTURE_CATALOG_TIER_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Duration
                <input defaultValue={module.duration} name="duration" type="text" />
              </label>
              <label>
                Awarded gold / GP summary
                <input defaultValue={module.gold} name="gold" type="text" />
              </label>
              <label>
                Page numbers
                <input defaultValue={module.pageNumbers} name="pageNumbers" type="text" />
              </label>
              <label>
                Source sheet
                <input defaultValue={module.sourceSheet} name="sourceSheet" type="text" />
              </label>
              <label>
                Spellbooks / scrolls
                <input defaultValue={module.spellbook} name="spellbook" type="text" />
              </label>
            </div>

            <label>
              Story awards / session notes
              <textarea defaultValue={module.storyAwards} name="storyAwards" rows={5} />
            </label>

            <label>
              Source notes
              <textarea defaultValue={module.sourceNotes} name="sourceNotes" rows={4} />
            </label>

            <div className="form-grid">
              <label>
                Consumables
                <textarea
                  defaultValue={formatListForTextarea(module.consumablesJson)}
                  name="consumables"
                  rows={6}
                />
              </label>
              <label>
                Common magic items
                <textarea
                  defaultValue={formatListForTextarea(module.commonMagicItemsJson)}
                  name="commonMagicItems"
                  rows={6}
                />
              </label>
              <label>
                Uncommon magic items
                <textarea
                  defaultValue={formatListForTextarea(module.uncommonMagicItemsJson)}
                  name="uncommonMagicItems"
                  rows={6}
                />
              </label>
              <label>
                Rare magic items
                <textarea
                  defaultValue={formatListForTextarea(module.rareMagicItemsJson)}
                  name="rareMagicItems"
                  rows={6}
                />
              </label>
              <label>
                Very rare magic items
                <textarea
                  defaultValue={formatListForTextarea(module.veryRareMagicItemsJson)}
                  name="veryRareMagicItems"
                  rows={6}
                />
              </label>
              <label>
                Legendary magic items
                <textarea
                  defaultValue={formatListForTextarea(module.legendaryMagicItemsJson)}
                  name="legendaryMagicItems"
                  rows={6}
                />
              </label>
              <label>
                Unique / custom magic items
                <textarea
                  defaultValue={formatListForTextarea(module.uniqueMagicItemsJson)}
                  name="uniqueMagicItems"
                  rows={6}
                />
              </label>
            </div>

            <p className="muted" style={{ margin: 0 }}>
              Use one item per line in the reward textareas. Saving here updates the module
              autofill data used in league game creation.
            </p>

            <div className="inline-actions" style={{ justifyContent: "space-between" }}>
              <Link className="button secondary" href="/admin/modules?sort=code">
                Back to list
              </Link>
              <button className="button-secondary" type="submit">
                Save module
              </button>
            </div>
          </form>
        </section>
      </section>
    </main>
  );
}
