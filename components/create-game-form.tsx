"use client";

import { createGame } from "@/app/dm/games/actions";
import { GameForm, type GameFormInitialValues } from "@/components/game-form";
import type { LegalRewardOptions } from "@/lib/game-reward-selections";

type CreateGameFormProps = {
  initialValuesJson?: string;
  legalRewardsJson: string;
  playersJson: string;
  submitLabel?: string;
};

export function CreateGameForm({
  initialValuesJson,
  legalRewardsJson,
  playersJson,
  submitLabel,
}: CreateGameFormProps) {
  const initialValues = initialValuesJson
    ? (JSON.parse(initialValuesJson) as GameFormInitialValues)
    : undefined;
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
      players={players}
      submitGame={createGame}
      submitLabel={submitLabel}
    />
  );
}
