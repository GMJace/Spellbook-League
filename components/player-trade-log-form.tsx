"use client";

import { useMemo, useState } from "react";
import { createCharacterTrade } from "@/app/player/characters/[id]/trades/actions";

type TradeTargetCharacter = {
  id: string;
  name: string;
  userName: string;
};

export type PlayerTradeLogInitialValues = {
  proposerPlayerName: string;
  proposerCharacterName: string;
  recipientCharacterId?: string;
  recipientPlayerName: string;
  recipientCharacterName: string;
  proposerItem: string;
  proposerItemName: string;
  proposerMinorProperty: string;
  proposerFlavorNotes: string;
  proposerAdventureCode: string;
  proposerSpecialNotes: string;
  recipientItem: string;
  recipientItemName: string;
  recipientMinorProperty: string;
  recipientFlavorNotes: string;
  recipientAdventureCode: string;
  recipientSpecialNotes: string;
};

function TradeSideFields({
  prefix,
  title,
  initialValues,
}: {
  prefix: "proposer" | "recipient";
  title: string;
  initialValues?: PlayerTradeLogInitialValues;
}) {
  return (
    <div className="list-card stack">
      <h2 style={{ margin: 0 }}>{title}</h2>
      <label>
        Item (Counts as)
        <input
          defaultValue={prefix === "proposer" ? initialValues?.proposerItem : initialValues?.recipientItem}
          name={`${prefix}Item`}
          required
          type="text"
        />
      </label>
      <label>
        Item Name
        <input
          defaultValue={
            prefix === "proposer"
              ? initialValues?.proposerItemName
              : initialValues?.recipientItemName
          }
          name={`${prefix}ItemName`}
          type="text"
        />
      </label>
      <label>
        Minor Property
        <input
          defaultValue={
            prefix === "proposer"
              ? initialValues?.proposerMinorProperty
              : initialValues?.recipientMinorProperty
          }
          name={`${prefix}MinorProperty`}
          type="text"
        />
      </label>
      <label>
        Notes (Flavor)
        <input
          defaultValue={
            prefix === "proposer"
              ? initialValues?.proposerFlavorNotes
              : initialValues?.recipientFlavorNotes
          }
          name={`${prefix}FlavorNotes`}
          type="text"
        />
      </label>
      <label>
        Item received in adventure code
        <input
          defaultValue={
            prefix === "proposer"
              ? initialValues?.proposerAdventureCode
              : initialValues?.recipientAdventureCode
          }
          name={`${prefix}AdventureCode`}
          type="text"
        />
      </label>
      <p className="muted" style={{ margin: 0 }}>
        Downtime days spent: 5 DT to conclude the trade.
      </p>
      <label>
        Special notes
        <textarea
          defaultValue={
            prefix === "proposer"
              ? initialValues?.proposerSpecialNotes
              : initialValues?.recipientSpecialNotes
          }
          name={`${prefix}SpecialNotes`}
          rows={3}
        />
      </label>
    </div>
  );
}

export function PlayerTradeLogForm({
  characterId,
  characterName,
  currentPlayerName,
  targetCharacters,
  formAction = createCharacterTrade,
  initialValues,
  submitLabel = "Save trade",
  tradeId,
}: {
  characterId: string;
  characterName: string;
  currentPlayerName: string;
  targetCharacters: TradeTargetCharacter[];
  formAction?: (formData: FormData) => void | Promise<void>;
  initialValues?: PlayerTradeLogInitialValues;
  submitLabel?: string;
  tradeId?: string;
}) {
  const [isOnSpellbook, setIsOnSpellbook] = useState(Boolean(initialValues?.recipientCharacterId));
  const [selectedRecipientCharacterId, setSelectedRecipientCharacterId] = useState(
    initialValues?.recipientCharacterId ?? "",
  );
  const [manualRecipientPlayerName, setManualRecipientPlayerName] = useState(
    initialValues?.recipientPlayerName ?? "",
  );
  const [manualRecipientCharacterName, setManualRecipientCharacterName] = useState(
    initialValues?.recipientCharacterName ?? "",
  );

  const selectedRecipientCharacter = useMemo(
    () =>
      targetCharacters.find(
        (targetCharacter) => targetCharacter.id === selectedRecipientCharacterId,
      ) ?? null,
    [selectedRecipientCharacterId, targetCharacters],
  );

  const recipientPlayerName = isOnSpellbook
    ? selectedRecipientCharacter?.userName ?? ""
    : manualRecipientPlayerName;
  const recipientCharacterName = isOnSpellbook
    ? selectedRecipientCharacter?.name ?? ""
    : manualRecipientCharacterName;

  return (
    <form action={formAction} className="stack">
      <input name="characterId" type="hidden" value={characterId} />
      {tradeId ? <input name="tradeId" type="hidden" value={tradeId} /> : null}

      <div className="list-card stack">
        <h2 style={{ margin: 0 }}>Player 1</h2>
        <label>
          Player name
          <input
            defaultValue={initialValues?.proposerPlayerName ?? currentPlayerName}
            name="proposerPlayerName"
            required
            type="text"
          />
        </label>
        <label>
          Character name
          <input
            defaultValue={initialValues?.proposerCharacterName ?? characterName}
            name="proposerCharacterName"
            required
            type="text"
          />
        </label>
      </div>

      <TradeSideFields initialValues={initialValues} prefix="proposer" title="Player 1 trade details" />

      <div className="list-card stack">
        <h2 style={{ margin: 0 }}>Player 2</h2>
        <label className="checkbox-row compact-checkbox-row">
          <input
            checked={isOnSpellbook}
            onChange={(event) => {
              const nextChecked = event.target.checked;
              setIsOnSpellbook(nextChecked);

              if (!nextChecked) {
                setSelectedRecipientCharacterId("");
              }
            }}
            type="checkbox"
          />
          <span>On SPELLBOOK</span>
        </label>
        {isOnSpellbook ? (
          <label>
            Character roster
            <select
              defaultValue=""
              name="recipientCharacterId"
              onChange={(event) => setSelectedRecipientCharacterId(event.target.value)}
              required
              value={selectedRecipientCharacterId}
            >
              <option value="">Select a character from the player roster</option>
              {targetCharacters.map((targetCharacter) => (
                <option key={targetCharacter.id} value={targetCharacter.id}>
                  {targetCharacter.userName} - {targetCharacter.name}
                </option>
              ))}
            </select>
          </label>
        ) : null}
        <label>
          Player name
          <input
            name="recipientPlayerName"
            onChange={(event) => setManualRecipientPlayerName(event.target.value)}
            readOnly={isOnSpellbook}
            required
            type="text"
            value={recipientPlayerName}
          />
        </label>
        <label>
          Character name
          <input
            name="recipientCharacterName"
            onChange={(event) => setManualRecipientCharacterName(event.target.value)}
            readOnly={isOnSpellbook}
            required
            type="text"
            value={recipientCharacterName}
          />
        </label>
        <p className="muted" style={{ margin: 0 }}>
          Check this when the other side uses SPELLBOOK. Their player and character names will
          populate from the roster. Leave it unchecked to enter both manually.
        </p>
      </div>

      <TradeSideFields initialValues={initialValues} prefix="recipient" title="Player 2 trade details" />

      <div>
        <button className="button" type="submit">{submitLabel}</button>
      </div>
    </form>
  );
}
