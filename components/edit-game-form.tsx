"use client";

import { updateGame } from "@/app/dm/games/actions";
import { GameForm, type GameFormInitialValues } from "@/components/game-form";

type EditGameFormProps = {
  initialValuesJson: string;
  playersJson: string;
};

export function EditGameForm({
  initialValuesJson,
  playersJson,
}: EditGameFormProps) {
  const initialValues = JSON.parse(initialValuesJson) as GameFormInitialValues;
  const players = JSON.parse(playersJson) as Array<{
    id: string;
    name: string;
    characters: Array<{ id: string; name: string }>;
  }>;

  return (
    <GameForm
      initialValues={initialValues}
      pendingLabel="Saving changes..."
      players={players}
      submitGame={updateGame}
      submitLabel="Save changes"
    />
  );
}
