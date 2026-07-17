import Link from "next/link";

import { updateLeagueLegalChoices } from "@/app/admin/league-choices/actions";
import { AdminPageHeader } from "@/components/admin-page-header";
import { DND_CLASSES } from "@/lib/character-options";
import { requireAdminUser } from "@/lib/admin";
import {
  getLeagueLegalBlessingOptions,
  getLeagueLegalBoonOptions,
  getLeagueLegalCharmOptions,
  getLeagueLegalConsumableOptions,
  getLeagueLegalFeatOptions,
  getLeagueLegalLanguageOptions,
  getLeagueLegalMagicItemOptions,
  getLeagueLegalSubclassOptions,
  getLeagueLegalToolOptions,
  MAGIC_ITEM_RARITIES,
} from "@/lib/league-legal-choices";

export default async function AdminLeagueChoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ choices?: string }>;
}) {
  await requireAdminUser();

  const params = await searchParams;
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

  const choiceMessageMap: Record<string, string> = {
    saved: "League legal choices updated.",
  };
  const choiceMessage = params.choices ? choiceMessageMap[params.choices] : "";

  return (
    <main className="page-shell">
      <section className="stack">
        {choiceMessage ? (
          <p style={{ color: "#ffffff", margin: 0 }}>{choiceMessage}</p>
        ) : null}

        <AdminPageHeader
          description="Update the live legal subclass lists used by character creation and character log editing. Feats, tools, languages, boons, blessings, and charms all live here now."
          title="League legal choices"
        />

        <section className="list-card stack">
          <img
            alt="League legal choices divider"
            className="ggcon-table-divider"
            src="/divider4.png"
          />
          <div>
            <h2 style={{ margin: 0 }}>Legal subclasses</h2>
            <p className="muted" style={{ margin: "0.35rem 0 0" }}>
              Enter one legal subclass per line for each class. Saving here updates
              the dropdowns and server-side validation.
            </p>
          </div>

          <form action={updateLeagueLegalChoices} className="form-stack">
            <div className="form-grid">
              {DND_CLASSES.map((className) => (
                <label key={className}>
                  {className}
                  <textarea
                    defaultValue={legalSubclassOptions[className].join("\n")}
                    name={`subclasses:${className}`}
                    rows={8}
                  />
                </label>
              ))}
            </div>

            <img
              alt="League legal magic items divider"
              className="ggcon-table-divider"
              src="/divider4.png"
            />

            <div>
              <h2 style={{ margin: 0 }}>Legal magic items</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Enter one legal magic item per line for each rarity. Unique and
                artifact items are combined into one shared list. These lists are
                stored in the same live admin choices table as subclasses.
              </p>
            </div>

            <div className="form-grid">
              {MAGIC_ITEM_RARITIES.map((rarity) => (
                <label key={rarity}>
                  {rarity}
                  <textarea
                    defaultValue={legalMagicItemOptions[rarity].join("\n")}
                    name={`magic-items:${rarity}`}
                    rows={8}
                  />
                </label>
              ))}
            </div>

            <img
              alt="League legal consumables divider"
              className="ggcon-table-divider"
              src="/divider4.png"
            />

            <div>
              <h2 style={{ margin: 0 }}>Legal consumables</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Enter one legal consumable per line in a single shared list.
              </p>
            </div>

            <label className="league-choices-consumables-field">
              All consumables
              <textarea
                defaultValue={legalConsumableOptions.join("\n")}
                name="consumables"
                rows={24}
              />
            </label>

            <img
              alt="League legal feats divider"
              className="ggcon-table-divider"
              src="/divider4.png"
            />

            <div>
              <h2 style={{ margin: 0 }}>Legal feats</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Enter one legal feat per line in the shared list used by the feats
                checklist on character forms.
              </p>
            </div>

            <label className="league-choices-consumables-field">
              All feats
              <textarea
                defaultValue={legalFeatOptions.join("\n")}
                name="feats"
                rows={24}
              />
            </label>

            <img
              alt="League legal tools divider"
              className="ggcon-table-divider"
              src="/divider4.png"
            />

            <div>
              <h2 style={{ margin: 0 }}>Legal tools</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Enter one legal tool proficiency per line in the shared list used by
                the tools checklist on character forms.
              </p>
            </div>

            <label className="league-choices-consumables-field">
              All tools
              <textarea
                defaultValue={legalToolOptions.join("\n")}
                name="tools"
                rows={24}
              />
            </label>

            <img
              alt="League legal languages divider"
              className="ggcon-table-divider"
              src="/divider4.png"
            />

            <div>
              <h2 style={{ margin: 0 }}>Legal languages</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Enter one legal language per line in the shared list used by the
                languages checklist. Class-granted languages stay automatic.
              </p>
            </div>

            <label className="league-choices-consumables-field">
              All languages
              <textarea
                defaultValue={legalLanguageOptions.join("\n")}
                name="languages"
                rows={24}
              />
            </label>

            <img
              alt="League legal boons divider"
              className="ggcon-table-divider"
              src="/divider4.png"
            />

            <div>
              <h2 style={{ margin: 0 }}>Legal boons</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Enter one legal boon per line. If this list is empty, boon entries
                remain free-text until you are ready to lock them down.
              </p>
            </div>

            <label className="league-choices-consumables-field">
              All boons
              <textarea
                defaultValue={legalBoonOptions.join("\n")}
                name="boons"
                rows={12}
              />
            </label>

            <img
              alt="League legal blessings divider"
              className="ggcon-table-divider"
              src="/divider4.png"
            />

            <div>
              <h2 style={{ margin: 0 }}>Legal blessings</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Enter one legal blessing per line. If this list is empty, blessing
                entries remain free-text until you are ready to lock them down.
              </p>
            </div>

            <label className="league-choices-consumables-field">
              All blessings
              <textarea
                defaultValue={legalBlessingOptions.join("\n")}
                name="blessings"
                rows={12}
              />
            </label>

            <img
              alt="League legal charms divider"
              className="ggcon-table-divider"
              src="/divider4.png"
            />

            <div>
              <h2 style={{ margin: 0 }}>Legal charms</h2>
              <p className="muted" style={{ margin: "0.35rem 0 0" }}>
                Enter one legal charm per line. This list feeds the charm slot
                selectors on character forms.
              </p>
            </div>

            <label className="league-choices-consumables-field">
              All charms
              <textarea
                defaultValue={legalCharmOptions.join("\n")}
                name="charms"
                rows={18}
              />
            </label>

            <button className="button-secondary" type="submit">
              Save league legal choices
            </button>
          </form>
        </section>
      </section>
    </main>
  );
}
