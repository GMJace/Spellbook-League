"use client";

import { createGame } from "@/app/dm/games/actions";
import { GameForm } from "@/components/game-form";

type CreateGameFormProps = {
  playersJson: string;
};

export function CreateGameForm({ playersJson }: CreateGameFormProps) {
  const players = JSON.parse(playersJson) as Array<{
    id: string;
    name: string;
    characters: Array<{ id: string; name: string }>;
  }>;

  return <GameForm players={players} submitGame={createGame} />;
}
