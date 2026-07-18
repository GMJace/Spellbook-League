"use client";

import { useMemo, useState, useTransition } from "react";

import { BulletTextarea } from "@/components/bullet-textarea";
import { DatePickerField } from "@/components/date-picker-field";

type Player = {
  id: string;
  name: string;
  characters: Array<{ id: string; name: string }>;
};

type Participant = {
  userId: string;
  userName: string;
  characterId: string;
  characterName: string;
};

export type GameFormInitialValues = {
  id?: string;
  title: string;
  adventureCode: string;
  gameSummary: string;
  ticketPrice: string;
  datePlayed: string;
  tier: "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";
  seatCapacity: string;
  serviceHours: string;
  downtimeDaysAwarded: string;
  rewardsSummary: string;
  magicItemsAwarded: string;
  consumablesAwarded: string;
  sessionNotes: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  adventureImagePath?: string | null;
  participants: Participant[];
};

type GameFormProps = {
  initialValues?: GameFormInitialValues;
  pendingLabel?: string;
  players: Player[];
  submitGame: (formData: FormData) => Promise<{ error?: string } | void>;
  submitLabel?: string;
};

const tiers = [
  { value: "TIER_1", label: "Tier 1" },
  { value: "TIER_2", label: "Tier 2" },
  { value: "TIER_3", label: "Tier 3" },
  { value: "TIER_4", label: "Tier 4" },
];

const statuses = [
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
];

const GAME_CARD_IMAGE_WIDTH = 960;
const GAME_CARD_IMAGE_HEIGHT = 540;

async function resizeAdventureImage(file: File) {
  const objectUrl = URL.createObjectURL(file);

  try {
    const image = await new Promise<HTMLImageElement>((resolve, reject) => {
      const nextImage = new Image();

      nextImage.onload = () => resolve(nextImage);
      nextImage.onerror = () => reject(new Error("Unable to load the selected image."));
      nextImage.src = objectUrl;
    });

    const widthRatio = GAME_CARD_IMAGE_WIDTH / image.width;
    const heightRatio = GAME_CARD_IMAGE_HEIGHT / image.height;
    const scale = Math.min(1, widthRatio, heightRatio);
    const targetWidth = Math.max(1, Math.round(image.width * scale));
    const targetHeight = Math.max(1, Math.round(image.height * scale));

    if (targetWidth === image.width && targetHeight === image.height) {
      return file;
    }

    const canvas = document.createElement("canvas");
    canvas.width = targetWidth;
    canvas.height = targetHeight;

    const context = canvas.getContext("2d");

    if (!context) {
      throw new Error("Unable to prepare the image for upload.");
    }

    context.drawImage(image, 0, 0, targetWidth, targetHeight);

    const resizedBlob = await new Promise<Blob>((resolve, reject) => {
      canvas.toBlob(
        (blob) => {
          if (!blob) {
            reject(new Error("Unable to resize the selected image."));
            return;
          }

          resolve(blob);
        },
        "image/webp",
        0.86,
      );
    });

    const baseName = file.name.replace(/\.[^.]+$/, "");

    return new File([resizedBlob], `${baseName || "adventure-cover"}.webp`, {
      type: "image/webp",
      lastModified: Date.now(),
    });
  } finally {
    URL.revokeObjectURL(objectUrl);
  }
}

export function GameForm({
  initialValues,
  pendingLabel = "Saving game...",
  players,
  submitGame,
  submitLabel = "Save game",
}: GameFormProps) {
  const [search, setSearch] = useState("");
  const [selectedUserId, setSelectedUserId] = useState(players[0]?.id ?? "");
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [participants, setParticipants] = useState<Participant[]>(
    initialValues?.participants ?? [],
  );
  const [error, setError] = useState("");
  const [isPending, startTransition] = useTransition();

  const filteredPlayers = useMemo(() => {
    const query = search.trim().toLowerCase();
    if (!query) {
      return players;
    }

    return players.filter((player) => player.name.toLowerCase().includes(query));
  }, [players, search]);

  const selectedPlayer =
    players.find((player) => player.id === selectedUserId) ?? filteredPlayers[0] ?? players[0];

  const characters = selectedPlayer?.characters ?? [];

  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault();
        setError("");

        startTransition(async () => {
          try {
            const formData = new FormData(event.currentTarget);
            formData.set("participants", JSON.stringify(participants));

            const adventureImage = formData.get("adventureImage");

            if (adventureImage instanceof File && adventureImage.size > 0) {
              const resizedImage = await resizeAdventureImage(adventureImage);
              formData.set("adventureImage", resizedImage);
            }

            const result = await submitGame(formData);

            if (result?.error) {
              setError(result.error);
            }
          } catch (submissionError) {
            setError(
              submissionError instanceof Error
                ? submissionError.message
                : "Unable to prepare the image for upload.",
            );
          }
        });
      }}
    >
      {initialValues?.id ? (
        <input name="gameId" type="hidden" value={initialValues.id} />
      ) : null}
      {!initialValues?.id && initialValues?.adventureImagePath ? (
        <input
          name="reuseAdventureImagePath"
          type="hidden"
          value={initialValues.adventureImagePath}
        />
      ) : null}

      <div className="form-grid">
        <label>
          Game title
          <input defaultValue={initialValues?.title ?? ""} name="title" type="text" required />
        </label>
        <label>
          Adventure code
          <input
            defaultValue={initialValues?.adventureCode ?? ""}
            name="adventureCode"
            type="text"
            required
          />
        </label>
        <label>
          Price
          <input
            defaultValue={initialValues?.ticketPrice ?? "Free"}
            name="ticketPrice"
            placeholder="Free"
            type="text"
            required
          />
        </label>
        <DatePickerField
          defaultValue={initialValues?.datePlayed ?? ""}
          label="Date and time"
          name="datePlayed"
          required
          type="datetime-local"
        />
        <label>
          Tier
          <select name="tier" defaultValue={initialValues?.tier ?? "TIER_1"}>
            {tiers.map((tier) => (
              <option key={tier.value} value={tier.value}>
                {tier.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Player capacity
          <input
            defaultValue={initialValues?.seatCapacity ?? "6"}
            max="12"
            min="1"
            name="seatCapacity"
            type="number"
          />
        </label>
        <label>
          Status
          <select name="status" defaultValue={initialValues?.status ?? "SCHEDULED"}>
            {statuses.map((status) => (
              <option key={status.value} value={status.value}>
                {status.label}
              </option>
            ))}
          </select>
        </label>
        <div className="metric">
          <div className="metric-label">Number of players</div>
          <div className="metric-value">{participants.length}</div>
        </div>
      </div>

      <label>
        Adventure cover / badge
        <input accept="image/*" name="adventureImage" type="file" />
      </label>
      {initialValues?.adventureImagePath ? (
        <div className="list-card stack" style={{ gap: "0.6rem" }}>
          <span className="muted">Current cover / badge</span>
          <img
            alt={`${initialValues.title} cover art`}
            className="dm-game-detail-image"
            src={initialValues.adventureImagePath}
          />
          <span className="muted">
            Upload a new image above only if you want to replace the current one.
          </span>
        </div>
      ) : null}

      <label>
        Game summary (Include themes and content advisories)
        <textarea defaultValue={initialValues?.gameSummary ?? ""} name="gameSummary" />
      </label>
      <p className="muted" style={{ margin: 0 }}>
        Each line is a bullet point.
      </p>

      <label>
        Service hours (AL DM rewards)
        <input
          defaultValue={initialValues?.serviceHours ?? ""}
          inputMode="decimal"
          name="serviceHours"
          placeholder="4"
          type="text"
        />
      </label>
      <p className="muted" style={{ margin: 0 }}>
        Optional. Enter the Adventurers League service hours earned for running
        this game. Decimals like 2.5 are fine.
      </p>

      <div className="form-grid">
        <label>
          Downtime days awarded
          <input
            defaultValue={initialValues?.downtimeDaysAwarded ?? "0"}
            inputMode="numeric"
            min="0"
            name="downtimeDaysAwarded"
            placeholder="0"
            type="number"
          />
        </label>

        <label>
          Awarded Gold (Total in GP)
          <input
            defaultValue={initialValues?.rewardsSummary ?? ""}
            name="rewardsSummary"
            type="text"
          />
        </label>
      </div>
      <label>
        Magic items awarded
        <BulletTextarea
          defaultValue={initialValues?.magicItemsAwarded ?? ""}
          name="magicItemsAwarded"
        />
      </label>
      <p className="muted" style={{ margin: 0 }}>
        Each line is a bullet point.
      </p>
      <label>
        Consumables awarded
        <BulletTextarea
          defaultValue={initialValues?.consumablesAwarded ?? ""}
          name="consumablesAwarded"
        />
      </label>
      <p className="muted" style={{ margin: 0 }}>
        Each line is a bullet point.
      </p>
      <label>
        Session notes/Story Awards
        <BulletTextarea defaultValue={initialValues?.sessionNotes ?? ""} name="sessionNotes" />
      </label>
      <p className="muted" style={{ margin: 0 }}>
        Each line is a bullet point.
      </p>

      <div className="panel stack">
        <div>
          <h2>Participants</h2>
          <p className="muted">
            Search league players, then select one of their characters before
            adding them to the game.
          </p>
        </div>
        <div className="form-grid">
          <label>
            Search players
            <input
              type="search"
              value={search}
              onChange={(event) => {
                setSearch(event.target.value);
              }}
              placeholder="Search by player name"
            />
          </label>
          <label>
            Player
            <select
              value={selectedPlayer?.id ?? ""}
              onChange={(event) => {
                setSelectedUserId(event.target.value);
                setSelectedCharacterId("");
              }}
            >
              {filteredPlayers.map((player) => (
                <option key={player.id} value={player.id}>
                  {player.name}
                </option>
              ))}
            </select>
          </label>
          <label>
            Character
            <select
              value={selectedCharacterId}
              onChange={(event) => {
                setSelectedCharacterId(event.target.value);
              }}
            >
              <option value="">Select a character</option>
              {characters.map((character) => (
                <option key={character.id} value={character.id}>
                  {character.name}
                </option>
              ))}
            </select>
          </label>
          <div className="inline-actions" style={{ alignItems: "end" }}>
            <button
              type="button"
              onClick={() => {
                if (!selectedPlayer || !selectedCharacterId) {
                  setError("Choose a player and one of their characters.");
                  return;
                }

                const character = selectedPlayer.characters.find(
                  (entry) => entry.id === selectedCharacterId
                );

                if (!character) {
                  setError("The selected character was not found.");
                  return;
                }

                const exists = participants.some(
                  (participant) => participant.characterId === character.id
                );

                if (exists) {
                  setError("A character cannot be added to the same game twice.");
                  return;
                }

                setParticipants((current) => [
                  ...current,
                  {
                    userId: selectedPlayer.id,
                    userName: selectedPlayer.name,
                    characterId: character.id,
                    characterName: character.name,
                  },
                ]);
                setSelectedCharacterId("");
                setError("");
              }}
            >
              Add participant
            </button>
          </div>
        </div>

        <div className="stack">
          {participants.length ? (
            participants.map((participant) => (
              <div key={participant.characterId} className="list-card">
                <div className="inline-actions" style={{ justifyContent: "space-between" }}>
                  <div>
                    <strong>{participant.characterName}</strong>
                    <div className="muted">{participant.userName}</div>
                  </div>
                  <button
                    type="button"
                    className="secondary"
                    onClick={() => {
                      if (
                        !window.confirm(
                          `Remove ${participant.characterName} from this game?`
                        )
                      ) {
                        return;
                      }

                      setParticipants((current) =>
                        current.filter(
                          (entry) => entry.characterId !== participant.characterId
                        )
                      );
                    }}
                  >
                    Remove
                  </button>
                </div>
              </div>
            ))
          ) : (
            <div className="empty">No participants added yet.</div>
          )}
        </div>
      </div>

      {error ? <p style={{ color: "#8f341b" }}>{error}</p> : null}

      <button type="submit" disabled={isPending}>
        {isPending ? pendingLabel : submitLabel}
      </button>
    </form>
  );
}
