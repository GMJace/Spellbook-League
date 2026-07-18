"use client";

import { createGame } from "@/app/dm/games/actions";
import { GameForm, type GameFormInitialValues } from "@/components/game-form";

type CreateGameFormProps = {
  initialValuesJson?: string;
  playersJson: string;
  submitLabel?: string;
};

export function CreateGameForm({
  initialValuesJson,
  playersJson,
  submitLabel,
}: CreateGameFormProps) {
  const initialValues = initialValuesJson
    ? (JSON.parse(initialValuesJson) as GameFormInitialValues)
    : undefined;
  const players = JSON.parse(playersJson) as Array<{
    id: string;
    name: string;
    characters: Array<{ id: string; name: string }>;
  }>;

  return (
    <GameForm
      initialValues={initialValues}
      players={players}
      submitGame={createGame}
      submitLabel={submitLabel}
    />
  );
}
