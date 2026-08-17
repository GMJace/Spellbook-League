import { createCharacterTrade } from "@/app/player/characters/[id]/trades/actions";

type TradeTargetCharacter = {
  id: string;
  name: string;
  userName: string;
};

function TradeSideFields({
  prefix,
  title,
}: {
  prefix: "proposer" | "recipient";
  title: string;
}) {
  return (
    <div className="list-card stack">
      <h2 style={{ margin: 0 }}>{title}</h2>
      <label>
        Item (Counts as)
        <input name={`${prefix}Item`} required type="text" />
      </label>
      <label>
        Item Name
        <input name={`${prefix}ItemName`} type="text" />
      </label>
      <label>
        Minor Property
        <input name={`${prefix}MinorProperty`} type="text" />
      </label>
      <label>
        Notes (Flavor)
        <input name={`${prefix}FlavorNotes`} type="text" />
      </label>
      <label>
        Item received in adventure code
        <input name={`${prefix}AdventureCode`} type="text" />
      </label>
      <label>
        Downtime days spent
        <input defaultValue="0" min="0" name={`${prefix}DowntimeDaysSpent`} type="number" />
      </label>
    </div>
  );
}

export function PlayerTradeLogForm({
  characterId,
  characterName,
  currentPlayerName,
  targetCharacters,
}: {
  characterId: string;
  characterName: string;
  currentPlayerName: string;
  targetCharacters: TradeTargetCharacter[];
}) {
  return (
    <form action={createCharacterTrade} className="stack">
      <input name="characterId" type="hidden" value={characterId} />

      <div className="list-card stack">
        <h2 style={{ margin: 0 }}>Player 1</h2>
        <label>
          Player
          <input readOnly type="text" value={currentPlayerName} />
        </label>
        <label>
          Character
          <input readOnly type="text" value={characterName} />
        </label>
      </div>

      <TradeSideFields prefix="proposer" title="Player 1 trade details" />

      <div className="list-card stack">
        <h2 style={{ margin: 0 }}>Player 2</h2>
        <label>
          Character
          <select defaultValue="" name="recipientCharacterId" required>
            <option value="">Select the other player's character</option>
            {targetCharacters.map((targetCharacter) => (
              <option key={targetCharacter.id} value={targetCharacter.id}>
                {targetCharacter.userName} - {targetCharacter.name}
              </option>
            ))}
          </select>
        </label>
      </div>

      <TradeSideFields prefix="recipient" title="Player 2 trade details" />

      <div>
        <button className="button" disabled={!targetCharacters.length} type="submit">
          Save trade
        </button>
      </div>
    </form>
  );
}
