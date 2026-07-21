"use client";

import { updateGame } from "@/app/dm/games/actions";
import { GameForm, type GameFormInitialValues } from "@/components/game-form";
import type { LegalRewardOptions } from "@/lib/game-reward-selections";

type EditGameFormProps = {
  initialValuesJson: string;
  legalRewardsJson: string;
  playersJson: string;
};

export function EditGameForm({
  initialValuesJson,
  legalRewardsJson,
  playersJson,
}: EditGameFormProps) {
  const initialValues = JSON.parse(initialValuesJson) as GameFormInitialValues;
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
      pendingLabel="Saving changes..."
      players={players}
      submitGame={updateGame}
      submitLabel="Save changes"
    />
  );
}
