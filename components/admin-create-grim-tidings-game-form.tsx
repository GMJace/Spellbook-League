"use client";

import { createAdminGrimTidingsGame } from "@/app/admin/ticket-sales/actions";
import { GameForm, type GameFormInitialValues } from "@/components/game-form";
import type { LegalRewardOptions } from "@/lib/game-reward-selections";

type AdminCreateGrimTidingsGameFormProps = {
  legalRewardsJson: string;
  playersJson: string;
};

const initialValues: GameFormInitialValues = {
  title: "",
  adventureCode: "",
  source: "",
  gameSummary: "",
  ticketPrice: "Free",
  isGrimTidings: true,
  grimTidingCost: "1",
  datePlayed: "",
  duration: "",
  tier: "TIER_1",
  seatCapacity: "6",
  serviceHours: "0",
  downtimeDaysAwarded: "0",
  rewardsSummary: "",
  magicItemsAwarded: "",
  consumablesAwarded: "",
  spellbookAwarded: "",
  sessionNotes: "",
  status: "SCHEDULED",
  participants: [],
};

export function AdminCreateGrimTidingsGameForm({
  legalRewardsJson,
  playersJson,
}: AdminCreateGrimTidingsGameFormProps) {
  const legalRewards = JSON.parse(legalRewardsJson) as LegalRewardOptions;
  const players = JSON.parse(playersJson) as Array<{
    id: string;
    name: string;
    characters: Array<{ id: string; name: string }>;
  }>;

  return (
    <GameForm
      initialValues={initialValues}
      legalBlessingOptions={legalRewards.legalBlessingOptions}
      legalBoonOptions={legalRewards.legalBoonOptions}
      legalBuildMagicItemOptions={legalRewards.legalBuildMagicItemOptions}
      legalCharmOptions={legalRewards.legalCharmOptions}
      legalCommonMagicItemOptions={legalRewards.legalCommonMagicItemOptions}
      legalConsumableOptions={legalRewards.legalConsumableOptions}
      legalMinorPropertyOptions={legalRewards.legalMinorPropertyOptions}
      pendingLabel="Creating Grim Tidings game..."
      players={players}
      submitGame={createAdminGrimTidingsGame}
      submitLabel="Create Grim Tidings game"
    />
  );
}
