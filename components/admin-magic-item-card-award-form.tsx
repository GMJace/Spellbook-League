"use client";

import { useMemo, useState } from "react";

import { awardMagicItemCard } from "@/app/admin/magic-item-cards/actions";

type ChestCodeOption = {
  code: string;
  gameTitle: string;
  id: string;
};

type CharacterOption = {
  chestCodes: ChestCodeOption[];
  id: string;
  name: string;
  playerName: string;
};

export function AdminMagicItemCardAwardForm({
  characters,
  definitionId,
}: {
  characters: CharacterOption[];
  definitionId: string;
}) {
  const [characterId, setCharacterId] = useState(characters[0]?.id ?? "");
  const [gameParticipantId, setGameParticipantId] = useState("");
  const selectedCharacter = useMemo(
    () => characters.find((character) => character.id === characterId),
    [characterId, characters],
  );

  if (!characters.length) {
    return <p className="muted">No characters are available to receive this card.</p>;
  }

  return (
    <form action={awardMagicItemCard} className="form-stack">
      <input name="definitionId" type="hidden" value={definitionId} />
      <div className="form-grid">
        <label>
          Character
          <select
            name="characterId"
            required
            value={characterId}
            onChange={(event) => {
              setCharacterId(event.target.value);
              setGameParticipantId("");
            }}
          >
            {characters.map((character) => (
              <option key={character.id} value={character.id}>
                {character.name} | {character.playerName}
              </option>
            ))}
          </select>
        </label>

        <label>
          Chest code
          <select
            name="gameParticipantId"
            value={gameParticipantId}
            onChange={(event) => setGameParticipantId(event.target.value)}
          >
            <option value="">No chest code (manual admin award)</option>
            {selectedCharacter?.chestCodes.map((chestCode) => (
              <option key={chestCode.id} value={chestCode.id}>
                {chestCode.code} | {chestCode.gameTitle}
              </option>
            ))}
          </select>
        </label>
      </div>
      <button type="submit">Award card</button>
    </form>
  );
}
