import Link from "next/link";
import type { ReactNode } from "react";

import { BulletTextarea } from "@/components/bullet-textarea";
import {
  type AdminModuleMagicItem,
  AdminModuleRewardFields,
  type AdminModuleUncommonPlusMagicItem,
} from "@/components/admin-module-reward-fields";
import { ADVENTURE_CATALOG_TIER_OPTIONS } from "@/lib/adventure-catalog";

type AdminModuleFormValues = {
  moduleId?: string;
  adventureCode: string;
  title: string;
  tier: "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";
  duration: string;
  sourceSheet: string;
  gameSummary: string;
  adventureImagePath?: null | string;
  serviceHours: string;
  downtimeDaysAwarded: string;
  gold: string;
  commonMagicItems: AdminModuleMagicItem[];
  uncommonPlusMagicItems: AdminModuleUncommonPlusMagicItem[];
  consumables: string[];
  spellbook: string;
  boons: string[];
  blessings: string[];
  charms: string[];
  additionalMagicRewardNotes: string;
  additionalConsumableNotes: string;
  storyAwards: string;
  sourceNotes: string;
};

type AdminModuleFormProps = {
  cancelHref?: string;
  extraActions?: ReactNode;
  initialValues: AdminModuleFormValues;
  legalCommonMagicItemOptions: string[];
  legalMinorPropertyOptions: string[];
  legalUncommonPlusMagicItemOptions: string[];
  uncommonPlusRarityByItem: Record<string, AdminModuleUncommonPlusMagicItem["rarity"]>;
  submitLabel: string;
};

export function AdminModuleForm({
  cancelHref,
  extraActions,
  initialValues,
  legalCommonMagicItemOptions,
  legalMinorPropertyOptions,
  legalUncommonPlusMagicItemOptions,
  submitLabel,
  uncommonPlusRarityByItem,
}: AdminModuleFormProps) {
  return (
    <>
      {initialValues.moduleId ? (
        <input name="moduleId" type="hidden" value={initialValues.moduleId} />
      ) : null}

      <div className="form-grid">
        <label>
          Game title
          <input defaultValue={initialValues.title} name="title" required type="text" />
        </label>
        <label>
          Adventure code
          <input defaultValue={initialValues.adventureCode} name="adventureCode" required type="text" />
        </label>
        <label>
          Duration
          <input defaultValue={initialValues.duration} name="duration" placeholder="4 hours" type="text" />
        </label>
        <label>
          Tier
          <select defaultValue={initialValues.tier} name="tier" required>
            {ADVENTURE_CATALOG_TIER_OPTIONS.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </select>
        </label>
      </div>

      <label>
        Adventure cover / badge
        <input accept="image/*" name="adventureImage" type="file" />
      </label>
      {initialValues.adventureImagePath ? (
        <div className="list-card stack" style={{ gap: "0.6rem" }}>
          <span className="muted">Current cover / badge</span>
          <img
            alt={`${initialValues.title} cover art`}
            className="dm-game-detail-image"
            src={initialValues.adventureImagePath}
          />
          <span className="muted">
            Upload a new image above only if you want to replace the current one.
          </span>
        </div>
      ) : null}

      <label>
        Game summary (Include themes and content advisories)
        <BulletTextarea defaultValue={initialValues.gameSummary} name="gameSummary" />
      </label>
      <p className="muted" style={{ margin: 0 }}>
        Each line is a bullet point.
      </p>

      <div className="form-grid">
        <label>
          Source (DM's Guild link)
          <input defaultValue={initialValues.sourceSheet} name="sourceSheet" type="text" />
        </label>
        <label>
          Service hours
          <input
            defaultValue={initialValues.serviceHours}
            inputMode="decimal"
            name="serviceHours"
            placeholder="0"
            type="text"
          />
        </label>
        <label>
          Downtime days awarded
          <input
            defaultValue={initialValues.downtimeDaysAwarded}
            inputMode="numeric"
            min="0"
            name="downtimeDaysAwarded"
            placeholder="0"
            type="number"
          />
        </label>
        <label>
          Awarded Gold (Total in GP)
          <input defaultValue={initialValues.gold} name="gold" type="text" />
        </label>
      </div>

      <AdminModuleRewardFields
        additionalConsumableNotes={initialValues.additionalConsumableNotes}
        additionalMagicRewardNotes={initialValues.additionalMagicRewardNotes}
        blessings={initialValues.blessings}
        boons={initialValues.boons}
        charms={initialValues.charms}
        commonMagicItems={initialValues.commonMagicItems}
        consumables={initialValues.consumables}
        legalCommonMagicItemOptions={legalCommonMagicItemOptions}
        legalMinorPropertyOptions={legalMinorPropertyOptions}
        legalUncommonPlusMagicItemOptions={legalUncommonPlusMagicItemOptions}
        spellbook={initialValues.spellbook}
        uncommonPlusRarityByItem={uncommonPlusRarityByItem}
        uncommonPlusMagicItems={initialValues.uncommonPlusMagicItems}
      />

      <label>
        Session notes/Story Awards
        <BulletTextarea defaultValue={initialValues.storyAwards} name="storyAwards" />
      </label>
      <p className="muted" style={{ margin: 0 }}>
        Each line is a bullet point.
      </p>

      <label>
        Source notes
        <textarea defaultValue={initialValues.sourceNotes} name="sourceNotes" rows={4} />
      </label>

      <div
        className="inline-actions"
        style={{ justifyContent: cancelHref ? "space-between" : "flex-end" }}
      >
        {cancelHref ? (
          <Link className="button secondary" href={cancelHref}>
            Back to list
          </Link>
        ) : null}
        <div className="inline-actions" style={{ gap: "0.75rem" }}>
          {extraActions}
          <button className="button-secondary" type="submit">
          {submitLabel}
          </button>
        </div>
      </div>
    </>
  );
}
