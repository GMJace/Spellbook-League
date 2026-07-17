"use client";

import { adminUpdateLeagueGame } from "@/app/admin/league-games/actions";
import { GameForm, type GameFormInitialValues } from "@/components/game-form";

type AdminLeagueGameEditFormProps = {
  initialValuesJson: string;
  playersJson: string;
};

export function AdminLeagueGameEditForm({
  initialValuesJson,
  playersJson,
}: AdminLeagueGameEditFormProps) {
  const initialValues = JSON.parse(initialValuesJson) as GameFormInitialValues;
  const players = JSON.parse(playersJson) as Array<{
    id: string;
    name: string;
    characters: Array<{ id: string; name: string }>;
  }>;

  return (
    <GameForm
      initialValues={initialValues}
      pendingLabel="Saving game..."
      players={players}
      submitGame={adminUpdateLeagueGame}
      submitLabel="Save changes"
    />
  );
}
