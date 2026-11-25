"use client";

import { useEffect, useId, useMemo, useRef, useState, useTransition } from "react";
import type { ReactNode } from "react";

import { lookupAdventureCatalogAutofill } from "@/lib/adventure-catalog-client";
import { BulletTextarea } from "@/components/bullet-textarea";
import { formatGameDateInZone, gameDateToUtc } from "@/lib/game-time-zone";
import { DatePickerField } from "@/components/date-picker-field";
import { GameRewardFields } from "@/components/game-reward-fields";
import { HomepageSpeechBubble } from "@/components/homepage-speech-bubble";
import { SearchIcon } from "@/components/search-icon";
import { parseStoredGameSummary, serializeGameSummarySections } from "@/lib/game-summary";
import {
  TBD_CHARACTER_LABEL,
  TBD_CHARACTER_OPTION_LABEL,
  TBD_CHARACTER_VALUE,
} from "@/lib/game-participants";
import { isPaidTicketPrice } from "@/lib/utils";

type Player = {
  id: string;
  name: string;
  characters: Array<{ id: string; name: string }>;
};

type Participant = {
  userId: string;
  userName: string;
  characterId: null | string;
  characterName: string;
};

export type GameFormInitialValues = {
  id?: string;
  title: string;
  adventureCode: string;
  source: string;
  gameSummary: string;
  ticketPrice: string;
  isGrimTidings?: boolean;
  grimTidingCost?: string;
  hasTicketAccessCode?: boolean;
  datePlayed: string;
  duration: string;
  tier: "TIER_1" | "TIER_2" | "TIER_3" | "TIER_4";
  seatCapacity: string;
  serviceHours: string;
  downtimeDaysAwarded: string;
  rewardsSummary: string;
  magicItemsAwarded: string;
  consumablesAwarded: string;
  spellbookAwarded: string;
  sessionNotes: string;
  status: "SCHEDULED" | "COMPLETED" | "CANCELLED";
  adventureImagePath?: string | null;
  participants: Participant[];
};

type GameFormProps = {
  setupHeader?: ReactNode;
  eventMode?: boolean;
  eventDetails?: ReactNode;
  eventNotes?: ReactNode;
  submissionDisabled?: boolean;
  allowCancelledStatus?: boolean;
  initialValues?: GameFormInitialValues;
  legalBlessingOptions?: string[];
  legalBoonOptions?: string[];
  legalBuildMagicItemOptions?: string[];
  legalCharmOptions?: string[];
  legalCommonMagicItemOptions?: string[];
  legalConsumableOptions?: string[];
  legalMinorPropertyOptions?: string[];
  pendingLabel?: string;
  players: Player[];
  submitGame: (
    formData: FormData
  ) => Promise<
    | {
        error?: string;
        fieldErrors?: Partial<Record<GameFormFieldName, string>>;
      }
    | void
  >;
  submitLabel?: string;
};

type GameFormFieldName =
  | "title"
  | "adventureCode"
  | "source"
  | "gameSummary"
  | "ticketPrice"
  | "isGrimTidings"
  | "grimTidingCost"
  | "ticketAccessCode"
  | "datePlayed"
  | "duration"
  | "tier"
  | "seatCapacity"
  | "serviceHours"
  | "downtimeDaysAwarded"
  | "rewardsSummary"
  | "magicItemsAwarded"
  | "consumablesAwarded"
  | "spellbookAwarded"
  | "sessionNotes"
  | "status"
  | "participants"
  | "adventureImage";

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

const ticketPriceOptions = [
  { value: "Free", label: "Free" },
  { value: "$5 USD", label: "$5 USD" },
  { value: "$10 USD", label: "$10 USD" },
  { value: "$15 USD", label: "$15 USD" },
  { value: "$20 USD", label: "$20 USD" },
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
  setupHeader,
  eventMode = false,
  eventDetails,
  eventNotes,
  submissionDisabled = false,
  allowCancelledStatus = false,
  initialValues,
  legalBlessingOptions = [],
  legalBoonOptions = [],
  legalBuildMagicItemOptions = [],
  legalCharmOptions = [],
  legalCommonMagicItemOptions = [],
  legalConsumableOptions = [],
  legalMinorPropertyOptions = [],
  pendingLabel = "Saving game...",
  players,
  submitGame,
  submitLabel = "Save game",
}: GameFormProps) {
  const parsedInitialGameSummary = useMemo(
    () => parseStoredGameSummary(initialValues?.gameSummary),
    [initialValues?.gameSummary]
  );
  const [phase, setPhase] = useState<1 | 2>(1);
  const [newModule, setNewModule] = useState(false);
  const [catalogQuery, setCatalogQuery] = useState("");
  const [catalogMatches, setCatalogMatches] = useState<Array<{ id: string; adventureCode: string; title: string; tier: string }>>([]);
  const [catalogStatus, setCatalogStatus] = useState("");
  const [catalogLoading, setCatalogLoading] = useState(false);
  const [selectedCatalogId, setSelectedCatalogId] = useState("");
  const [selectionLoading, setSelectionLoading] = useState(false);
  const [timeZone, setTimeZone] = useState("UTC");
  const [gameTimeChanged, setGameTimeChanged] = useState(false);
  const [timeZones, setTimeZones] = useState<string[]>(["UTC"]);
  const initialInstant = initialValues?.datePlayed?.endsWith("Z") ? initialValues.datePlayed : "";
  const [dateValue, setDateValue] = useState(initialInstant ? formatGameDateInZone(initialInstant, "UTC") : initialValues?.datePlayed ?? "");
  const phaseHeadingRef = useRef<HTMLHeadingElement>(null);
  const phaseHeadingId = useId();
  useEffect(() => {
    const browserZone = Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
    const supported = (Intl as typeof Intl & { supportedValuesOf?: (key: string) => string[] }).supportedValuesOf?.("timeZone") ?? ["America/Edmonton", "America/New_York", "America/Los_Angeles", "Europe/London", "Europe/Paris", "Asia/Tokyo", "Australia/Sydney"];
    setTimeZones([...new Set([browserZone, "UTC", ...supported])]);
    setTimeZone(browserZone);
    if (initialInstant) setDateValue(formatGameDateInZone(initialInstant, browserZone));
  }, [initialInstant]);
  useEffect(() => {
    if (newModule || phase !== 1 || catalogQuery.trim().length < 2) {
      setCatalogMatches([]); setCatalogLoading(false); setCatalogStatus(""); return;
    }
    const controller = new AbortController();
    setCatalogMatches([]);
    setCatalogStatus("");
    setCatalogLoading(true);
    const timer = window.setTimeout(async () => {
      try {
        const response = await fetch("/api/adventure-catalog/search?q=" + encodeURIComponent(catalogQuery), { signal: controller.signal });
        if (!response.ok) throw new Error("Unable to search the module catalog. Please try again.");
        const data = await response.json();
        if (!controller.signal.aborted) {
          setCatalogMatches(data.matches);
          setCatalogStatus(data.matches.length ? "Select a module below." : "No modules found. Try another title or code, or create a new module.");
        }
      } catch (error) {
        if (!controller.signal.aborted) setCatalogStatus(error instanceof Error ? error.message : "Unable to search the catalog.");
      } finally { if (!controller.signal.aborted) setCatalogLoading(false); }
    }, 300);
    return () => { controller.abort(); window.clearTimeout(timer); };
  }, [catalogQuery, newModule, phase]);
  const [search, setSearch] = useState("");
  const [searchDraft, setSearchDraft] = useState("");
  const [titleValue, setTitleValue] = useState(initialValues?.title ?? "");
  const [adventureCodeValue, setAdventureCodeValue] = useState(initialValues?.adventureCode ?? "");
  const [sourceValue, setSourceValue] = useState(initialValues?.source ?? "");
  const [gameSummaryValue, setGameSummaryValue] = useState(parsedInitialGameSummary.gameSummary);
  const [themesValue, setThemesValue] = useState(parsedInitialGameSummary.themes.join("\n"));
  const [contentAdvisoriesValue, setContentAdvisoriesValue] = useState(
    parsedInitialGameSummary.contentAdvisories.join("\n")
  );
  const [durationValue, setDurationValue] = useState(initialValues?.duration ?? "");
  const [tierValue, setTierValue] = useState(initialValues?.tier ?? "TIER_1");
  const [serviceHoursValue, setServiceHoursValue] = useState(initialValues?.serviceHours ?? "");
  const [downtimeDaysAwardedValue, setDowntimeDaysAwardedValue] = useState(
    initialValues?.downtimeDaysAwarded ?? "0"
  );
  const [rewardsSummaryValue, setRewardsSummaryValue] = useState(
    initialValues?.rewardsSummary ?? ""
  );
  const [magicItemsAwardedValue, setMagicItemsAwardedValue] = useState(
    initialValues?.magicItemsAwarded ?? ""
  );
  const [consumablesAwardedValue, setConsumablesAwardedValue] = useState(
    initialValues?.consumablesAwarded ?? ""
  );
  const [spellbookAwardedValue, setSpellbookAwardedValue] = useState(
    initialValues?.spellbookAwarded ?? ""
  );
  const [sessionNotesValue, setSessionNotesValue] = useState(
    initialValues?.sessionNotes ?? ""
  );
  const [selectedUserId, setSelectedUserId] = useState(players[0]?.id ?? "");
  const [selectedCharacterId, setSelectedCharacterId] = useState("");
  const [participants, setParticipants] = useState<Participant[]>(
    initialValues?.participants ?? [],
  );
  const [error, setError] = useState("");
  const [autofillMessage, setAutofillMessage] = useState("");
  const lookupRequestRef = useRef(0);
  const [fieldErrors, setFieldErrors] = useState<Partial<Record<GameFormFieldName, string>>>({});
  const [isPending, startTransition] = useTransition();
  const resolvedTicketPrice = initialValues?.ticketPrice ?? "Free";
  const [selectedTicketPrice, setSelectedTicketPrice] = useState(resolvedTicketPrice);
  const [isGrimTidingsValue, setIsGrimTidingsValue] = useState(
    Boolean(initialValues?.isGrimTidings) && resolvedTicketPrice === "Free",
  );
  const [adventureImagePreviewPath, setAdventureImagePreviewPath] = useState(
    initialValues?.adventureImagePath ?? null
  );
  const hasCustomTicketPrice = !ticketPriceOptions.some(
    (option) => option.value === resolvedTicketPrice,
  );
  const showTicketAccessCodeControls =
    !isGrimTidingsValue &&
    (isPaidTicketPrice(selectedTicketPrice) || Boolean(initialValues?.hasTicketAccessCode));
  const availableStatuses = allowCancelledStatus
    ? statuses
    : statuses.filter((status) => status.value !== "CANCELLED");

  const errorTextStyle = { color: "#8f341b", margin: 0 };
  const fieldBlockStyle = { gap: "0.35rem" };
  const helperLabelNoteStyle = {
    fontSize: "0.78rem",
    fontWeight: 400,
    lineHeight: 1.35,
  } as const;

  async function autofillAdventureDetails({
    adventureCode = adventureCodeValue,
    showNoMatch = true,
    title = titleValue,
    catalogId,
  }: {
    adventureCode?: string;
    catalogId?: string;
    showNoMatch?: boolean;
    title?: string;
  } = {}) {
    if (!catalogId && !title.trim() && !adventureCode.trim()) {
      setAutofillMessage("");
      return;
    }

    const requestId = ++lookupRequestRef.current;

    try {
      const { match } = await lookupAdventureCatalogAutofill({
        adventureCode,
        title,
        catalogId,
      });

      if (requestId !== lookupRequestRef.current) {
        return;
      }

      if (!match) {
        if (showNoMatch) {
          setAutofillMessage("No saved adventure matched that title or code yet.");
        }
        return;
      }

      setSelectedCatalogId(catalogId ?? "");
      setCatalogMatches([]);
      setCatalogQuery("");
      setTitleValue(match.title);
      setAdventureCodeValue(match.adventureCode);
      setSourceValue(match.source);
      const parsedAutofillGameSummary = parseStoredGameSummary(match.gameSummary);

      setGameSummaryValue(parsedAutofillGameSummary.gameSummary);
      setThemesValue(parsedAutofillGameSummary.themes.join("\n"));
      setContentAdvisoriesValue(parsedAutofillGameSummary.contentAdvisories.join("\n"));
      setDurationValue(match.duration);
      setTierValue(match.tier);
      setServiceHoursValue(match.serviceHours);
      setDowntimeDaysAwardedValue(match.downtimeDaysAwarded);
      setRewardsSummaryValue(match.rewardsSummary);
      setMagicItemsAwardedValue(match.magicItemsAwarded);
      setConsumablesAwardedValue(match.consumablesAwarded);
      setSpellbookAwardedValue(match.spellbookAwarded);
      setSessionNotesValue(match.sessionNotes);
      if (!initialValues?.id) {
        setAdventureImagePreviewPath(match.adventureImagePath);
      }
      setAutofillMessage(`Loaded adventure details for ${match.adventureCode}.`);
      clearFieldError("title");
      clearFieldError("adventureCode");
      clearFieldError("source");
      clearFieldError("gameSummary");
      clearFieldError("duration");
      clearFieldError("tier");
      clearFieldError("serviceHours");
      clearFieldError("downtimeDaysAwarded");
      clearFieldError("rewardsSummary");
      clearFieldError("sessionNotes");
    } catch (lookupError) {
      if (requestId !== lookupRequestRef.current) {
        return;
      }

      setAutofillMessage(
        lookupError instanceof Error
          ? lookupError.message
          : "Unable to look up that adventure right now.",
      );
    }
  }

  function continueToDetails() {
    if (selectionLoading) return;
    if (!titleValue.trim() || !adventureCodeValue.trim()) { setError("Enter an adventure code and game title."); return; }
    if (!newModule && !selectedCatalogId && !(initialValues?.title === titleValue && initialValues?.adventureCode === adventureCodeValue)) {
      setError("Select a module from the catalog, or check the option to create a new module."); return;
    }
    setError(""); setPhase(2);
    requestAnimationFrame(() => phaseHeadingRef.current?.focus());
  }

  function getFieldError(name: GameFormFieldName) {
    return fieldErrors[name] ?? "";
  }

  function clearFieldError(name: GameFormFieldName) {
    setFieldErrors((current) => {
      if (!current[name]) {
        return current;
      }

      const next = { ...current };
      delete next[name];
      return next;
    });
  }

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
      className="form-stack dm-game-form"
      noValidate
      onSubmit={(event) => {
        event.preventDefault();
        if (phase === 1) { continueToDetails(); return; }
        const form = event.currentTarget;
        if (!form.checkValidity()) { form.reportValidity(); return; }
        setError("");
        setFieldErrors({});

        startTransition(async () => {
          try {
            const formData = new FormData(form);
            if (!eventMode) formData.set("datePlayed", initialInstant && !gameTimeChanged ? initialInstant : gameDateToUtc(dateValue, timeZone, initialInstant));
            formData.set("participants", JSON.stringify(participants));
            formData.set(
              "gameSummary",
              serializeGameSummarySections({
                contentAdvisories: String(formData.get("contentAdvisories") ?? "")
                  .replace(/\r\n/g, "\n")
                  .split("\n")
                  .map((line) => line.replace(/^[-*•]\s*/, "").trim())
                  .filter(Boolean),
                gameSummary: String(formData.get("gameSummaryText") ?? ""),
                themes: String(formData.get("themes") ?? "")
                  .replace(/\r\n/g, "\n")
                  .split("\n")
                  .map((line) => line.replace(/^[-*•]\s*/, "").trim())
                  .filter(Boolean),
              })
            );

            const adventureImage = formData.get("adventureImage");

            if (adventureImage instanceof File && adventureImage.size > 0) {
              const resizedImage = await resizeAdventureImage(adventureImage);
              formData.set("adventureImage", resizedImage);
            }

            const result = await submitGame(formData);

            if (result?.fieldErrors) {
              setFieldErrors(result.fieldErrors);
              if (result.fieldErrors.title || result.fieldErrors.adventureCode) setPhase(1);
            }

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
      {!initialValues?.id && adventureImagePreviewPath ? (
        <input
          name="reuseAdventureImagePath"
          type="hidden"
          value={adventureImagePreviewPath}
        />
      ) : null}

      {setupHeader && <section className="card stack dm-game-setup-card">{setupHeader}</section>}
      {phase === 2 && <h2 id={phaseHeadingId} ref={phaseHeadingRef} tabIndex={-1}>Enter game details</h2>}
      <input type="hidden" name="catalogSelectionMode" value={newModule ? "new" : "existing"} />
      <input type="hidden" name="catalogId" value={selectedCatalogId} />
      <fieldset className="form-stack" style={{ border: 0, padding: 0, margin: 0, display: phase === 1 ? "grid" : "none" }} aria-labelledby={phaseHeadingId}>
      <div>
      <div className="dm-game-adventure-layout">
      <div className="stack">
      {phase === 1 && <h2 id={phaseHeadingId} ref={phaseHeadingRef} tabIndex={-1}>Choose your adventure</h2>}
      <label style={{ display: "flex", alignItems: "center", gap: "0.65rem" }}>
        <input style={{ width: "1.1rem", height: "1.1rem", padding: 0, margin: 0, boxShadow: "none", flexShrink: 0 }} type="checkbox" checked={newModule} onChange={(event) => { lookupRequestRef.current++; setNewModule(event.target.checked); setSelectedCatalogId(""); setCatalogQuery(""); setAutofillMessage(""); }} />
        <span>Adventure is not in the catalog — create a new module</span>
      </label>
      {newModule && <p className="muted">Enter a new code and title, then complete the game details. Saving the game submits the module to the pending catalog for review.</p>}
      <div className="form-grid">
        <div className="stack" style={fieldBlockStyle}>
          <label>
            <span>Adventure code</span>
            <input
              aria-invalid={Boolean(getFieldError("adventureCode"))}
              value={adventureCodeValue}
              name="adventureCode"
              onChange={(event) => {
                lookupRequestRef.current += 1;
                setAdventureCodeValue(event.target.value);
                setSelectedCatalogId("");
                setCatalogQuery(event.target.value);
                clearFieldError("adventureCode");
                setAutofillMessage("");
              }}
              type="text"
              required
            />
          </label>
          {getFieldError("adventureCode") ? (
            <p style={errorTextStyle}>{getFieldError("adventureCode")}</p>
          ) : null}
        </div>
        <div className="stack" style={fieldBlockStyle}>
          <label>
            Game title
            <input
              aria-invalid={Boolean(getFieldError("title"))}
              value={titleValue}
              name="title"
              onChange={(event) => {
                lookupRequestRef.current++;
                setTitleValue(event.target.value);
                setSelectedCatalogId("");
                setCatalogQuery(event.target.value);
                clearFieldError("title");
                setAutofillMessage("");
              }}
              type="text"
              required
            />
          </label>
          {getFieldError("title") ? <p style={errorTextStyle}>{getFieldError("title")}</p> : null}
        </div>
      </div>
      </div>
      <div className="dm-game-adventure-character">
        {phase === 1 && <HomepageSpeechBubble>Search by adventure code or game title, then select a catalog match to populate both fields and the adventure details.</HomepageSpeechBubble>}
        <img className="dm-game-adventure-warden" src="/warden%20archon.png" alt="Warden archon" width="1198" height="703" />
      </div>
      </div>
      <div className="dm-game-catalog-divider" />
      </div>
      {!newModule && <div className="stack" aria-busy={catalogLoading || selectionLoading}>
        <p role="status">{catalogLoading ? "Searching the catalog…" : catalogStatus}</p>
        {catalogMatches.map((match) => <button key={match.id} type="button" className="button-secondary" disabled={selectionLoading} onClick={async () => {
          setSelectionLoading(true);
          await autofillAdventureDetails({ catalogId: match.id });
          setSelectionLoading(false);
        }}>{match.adventureCode} — {match.title} · {match.tier.replace("TIER_", "Tier ")}</button>)}
      </div>}
      {autofillMessage && <p role="status">{autofillMessage}</p>}
      <button type="button" onClick={continueToDetails} disabled={selectionLoading}>Continue to game details</button>
      </fieldset>
      <fieldset className="form-stack dm-game-details" style={{ border: 0, padding: 0, margin: 0, display: phase === 2 ? "grid" : "none" }} aria-labelledby={phaseHeadingId}>
      <p><strong>{adventureCodeValue} — {titleValue}</strong></p>
      {eventDetails}
      <div className="form-grid">
        <div className="stack" style={fieldBlockStyle}>
          <label>
            Source (web link)
            <input
              aria-invalid={Boolean(getFieldError("source"))}
              value={sourceValue}
              name="source"
              onChange={(event) => {
                setSourceValue(event.target.value);
                clearFieldError("source");
              }}
              type="text"
            />
          </label>
          {getFieldError("source") ? <p style={errorTextStyle}>{getFieldError("source")}</p> : null}
        </div>
        {!eventMode && <>
        <div className="stack">
        <div className="stack" style={fieldBlockStyle}>
          <label>
            Seat Price
            <select
              aria-invalid={Boolean(getFieldError("ticketPrice"))}
              name="ticketPrice"
              value={selectedTicketPrice}
              onChange={(event) => {
                setSelectedTicketPrice(event.target.value);
                if (event.target.value !== "Free") {
                  setIsGrimTidingsValue(false);
                  clearFieldError("isGrimTidings");
                  clearFieldError("grimTidingCost");
                }
                clearFieldError("ticketPrice");
                clearFieldError("ticketAccessCode");
              }}
              required
            >
              {hasCustomTicketPrice ? (
                <option value={resolvedTicketPrice}>{resolvedTicketPrice}</option>
              ) : null}
              {ticketPriceOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </label>
          {isGrimTidingsValue ? (
            <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
              Grim Tidings games use the Free price option and are claimed from the league cart by
              spending Tidings.
            </p>
          ) : null}
          {getFieldError("ticketPrice") ? (
            <p style={errorTextStyle}>{getFieldError("ticketPrice")}</p>
          ) : null}
        </div>
        {selectedTicketPrice === "Free" ? (
          <div className="stack grim-tidings-field" style={fieldBlockStyle}>
            <label className="muted ggcon-meta-note grim-tidings-option">
              <input
                checked={isGrimTidingsValue}
                name="isGrimTidings"
                onChange={(event) => {
                  const nextValue = event.target.checked;

                  setIsGrimTidingsValue(nextValue);
                  clearFieldError("isGrimTidings");
                  clearFieldError("grimTidingCost");
                  clearFieldError("ticketPrice");
                  clearFieldError("ticketAccessCode");

                  if (nextValue) {
                    setSelectedTicketPrice("Free");
                  }
                }}
                type="checkbox"
              />
              <span>Grim Tidings game</span>
            </label>
            <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
              Limited-access league game that players unlock by spending Tidings.
            </p>
            {getFieldError("isGrimTidings") ? (
              <p style={errorTextStyle}>{getFieldError("isGrimTidings")}</p>
            ) : null}
          </div>
        ) : null}
        {isGrimTidingsValue ? (
          <div className="stack" style={fieldBlockStyle}>
            <label>
              Tiding cost
              <input
                aria-invalid={Boolean(getFieldError("grimTidingCost"))}
                defaultValue={initialValues?.grimTidingCost ?? "1"}
                min="1"
                max="99"
                name="grimTidingCost"
                type="number"
              />
            </label>
            <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
              One signup spends this many Tidings from the player account.
            </p>
            {getFieldError("grimTidingCost") ? (
              <p style={errorTextStyle}>{getFieldError("grimTidingCost")}</p>
            ) : null}
          </div>
        ) : (
          <input name="grimTidingCost" type="hidden" value={initialValues?.grimTidingCost ?? "1"} />
        )}
        {showTicketAccessCodeControls ? (
          <div className="stack" style={fieldBlockStyle}>
            <label>
              Ticket access code
              <input
                aria-invalid={Boolean(getFieldError("ticketAccessCode"))}
                autoComplete="off"
                name="ticketAccessCode"
                placeholder={
                  initialValues?.hasTicketAccessCode
                    ? "Enter a new code to replace the current one"
                    : "Optional code for free player entry"
                }
                type="text"
              />
            </label>
            {initialValues?.hasTicketAccessCode ? (
              <label
                className="muted ggcon-meta-note"
                style={{ alignItems: "center", display: "flex", gap: "0.45rem" }}
              >
                <input name="clearTicketAccessCode" type="checkbox" value="true" />
                Remove the current access code
              </label>
            ) : (
              <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                Optional. Players can enter this code in the league cart to join without buying a
                ticket.
              </p>
            )}
            {initialValues?.hasTicketAccessCode ? (
              <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
                Leave this blank to keep the current code, enter a new one to replace it, or check
                the box above to remove it.
              </p>
            ) : null}
            {getFieldError("ticketAccessCode") ? (
              <p style={errorTextStyle}>{getFieldError("ticketAccessCode")}</p>
            ) : null}
          </div>
        ) : null}
        </div>
        </>}
        {!eventMode && <>
        <div className="stack" style={fieldBlockStyle}>
          <DatePickerField
            buttonClassName="button button-secondary dm-game-calendar-button"
            aria-invalid={Boolean(getFieldError("datePlayed"))}
            value={dateValue}
            onChange={(event) => { setDateValue(event.target.value); setGameTimeChanged(true); clearFieldError("datePlayed"); }}
            label="Date and time"
            name="datePlayed"
            required
            type="datetime-local"
          />
          <label>Timezone
            <select aria-label="Timezone" name="timeZone" value={timeZone} onChange={(event) => { setTimeZone(event.target.value); setGameTimeChanged(true); }}>
              {timeZones.map((zone) => <option key={zone} value={zone}>{zone.replaceAll("_", " ")}</option>)}
            </select>
          </label>
          <input type="hidden" name="datePlayedLocal" value={dateValue} />
          <input type="hidden" name="originalDatePlayed" value={initialInstant} />
          <input type="hidden" name="preserveOriginalGameTime" value={initialInstant && !gameTimeChanged ? "true" : "false"} />
          <small className="muted">During a repeated daylight-saving hour, the first occurrence is used.</small>
          {getFieldError("datePlayed") ? (
            <p style={errorTextStyle}>{getFieldError("datePlayed")}</p>
          ) : null}
        </div>
        </>}
        <div className="stack" style={fieldBlockStyle}>
          <label>
            Duration
            <input
              aria-invalid={Boolean(getFieldError("duration"))}
              value={durationValue}
              name="duration"
              onChange={(event) => {
                setDurationValue(event.target.value);
                clearFieldError("duration");
              }}
              placeholder="4 hours"
              type="text"
            />
          </label>
          {getFieldError("duration") ? (
            <p style={errorTextStyle}>{getFieldError("duration")}</p>
          ) : null}
        </div>
        <div className="stack" style={fieldBlockStyle}>
          <label>
            Tier
            <select
              aria-invalid={Boolean(getFieldError("tier"))}
              name="tier"
              value={tierValue}
              onChange={(event) => {
                setTierValue(event.target.value as GameFormInitialValues["tier"]);
                clearFieldError("tier");
              }}
            >
              {tiers.map((tier) => (
                <option key={tier.value} value={tier.value}>
                  {tier.label}
                </option>
              ))}
            </select>
          </label>
          {getFieldError("tier") ? <p style={errorTextStyle}>{getFieldError("tier")}</p> : null}
        </div>
        <div className="stack" style={fieldBlockStyle}>
          <label>
            Player capacity
            <input
              aria-invalid={Boolean(getFieldError("seatCapacity"))}
              defaultValue={initialValues?.seatCapacity ?? "6"}
              max={eventMode ? 8 : 12}
              min="1"
              name="seatCapacity"
              type="number"
            />
          </label>
          {getFieldError("seatCapacity") ? (
            <p style={errorTextStyle}>{getFieldError("seatCapacity")}</p>
          ) : null}
        </div>
        {!eventMode && <>
        <div className="stack" style={fieldBlockStyle}>
          <label>
            Status
            <select
              aria-invalid={Boolean(getFieldError("status"))}
              name="status"
              defaultValue={initialValues?.status ?? "SCHEDULED"}
            >
              {availableStatuses.map((status) => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </label>
          {getFieldError("status") ? (
            <p style={errorTextStyle}>{getFieldError("status")}</p>
          ) : null}
        </div>
        </>}
      </div>
      {autofillMessage ? <p className="muted" style={{ margin: 0 }}>{autofillMessage}</p> : null}

      {!eventMode && <>
      <label>
        Adventure cover / badge
        <input
          accept="image/*"
          aria-invalid={Boolean(getFieldError("adventureImage"))}
          name="adventureImage"
          type="file"
        />
      </label>
      {getFieldError("adventureImage") ? (
        <p style={errorTextStyle}>{getFieldError("adventureImage")}</p>
      ) : null}
      {adventureImagePreviewPath ? (
        <div className="list-card stack" style={{ gap: "0.6rem" }}>
          <span className="muted">Current cover / badge</span>
          <img
            alt={`${titleValue || initialValues?.title || "Adventure"} cover art`}
            className="dm-game-detail-image"
            src={adventureImagePreviewPath}
          />
          <span className="muted">
            Upload a new image above only if you want to replace the current one.
          </span>
        </div>
      ) : null}

      </>}
      <label>
        <span
          style={{
            alignItems: "baseline",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.45rem",
          }}
        >
          <span>Game summary</span>
          <span className="muted" style={helperLabelNoteStyle}>
            Use full sentences or paragraphs here.
          </span>
        </span>
        <textarea
          aria-invalid={Boolean(getFieldError("gameSummary"))}
          value={gameSummaryValue}
          name="gameSummaryText"
          required={eventMode}
          onChange={(event) => {
            setGameSummaryValue(event.target.value);
            clearFieldError("gameSummary");
          }}
        />
      </label>
      {getFieldError("gameSummary") ? (
        <p style={errorTextStyle}>{getFieldError("gameSummary")}</p>
      ) : null}

      <label>
        <span
          style={{
            alignItems: "baseline",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.45rem",
          }}
        >
          <span>Themes</span>
          <span className="muted" style={helperLabelNoteStyle}>
            Each line is a bullet point.
          </span>
        </span>
        <BulletTextarea
          key={`themes-${themesValue}`}
          aria-invalid={Boolean(getFieldError("gameSummary"))}
          defaultValue={themesValue}
          name="themes"
          onBlur={() => {
            clearFieldError("gameSummary");
          }}
        />
      </label>

      <label>
        <span
          style={{
            alignItems: "baseline",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.45rem",
          }}
        >
          <span>Content Advisories</span>
          <span className="muted" style={helperLabelNoteStyle}>
            Each line is a bullet point.
          </span>
        </span>
        <BulletTextarea
          key={`content-advisories-${contentAdvisoriesValue}`}
          aria-invalid={Boolean(getFieldError("gameSummary"))}
          defaultValue={contentAdvisoriesValue}
          name="contentAdvisories"
          onBlur={() => {
            clearFieldError("gameSummary");
          }}
        />
      </label>

      <label>
        <span
          style={{
            alignItems: "baseline",
            display: "flex",
            flexWrap: "wrap",
            gap: "0.45rem",
          }}
        >
          <span>Service hours</span>
          <span className="muted" style={helperLabelNoteStyle}>
            Optional. SPELLBOOK DM service hours earned for running this game.
            Decimals like 2.5 are fine.
          </span>
        </span>
        <input
          aria-invalid={Boolean(getFieldError("serviceHours"))}
          value={serviceHoursValue}
          inputMode="decimal"
          name="serviceHours"
          onChange={(event) => {
            setServiceHoursValue(event.target.value);
            clearFieldError("serviceHours");
          }}
          placeholder="4"
          type="text"
        />
      </label>
      {getFieldError("serviceHours") ? (
        <p style={errorTextStyle}>{getFieldError("serviceHours")}</p>
      ) : null}

      <div className="form-grid">
        <div className="stack" style={fieldBlockStyle}>
          <label>
            Downtime days awarded to players
            <input
              aria-invalid={Boolean(getFieldError("downtimeDaysAwarded"))}
              value={downtimeDaysAwardedValue}
              inputMode="numeric"
              min="0"
              name="downtimeDaysAwarded"
              onChange={(event) => {
                setDowntimeDaysAwardedValue(event.target.value);
                clearFieldError("downtimeDaysAwarded");
              }}
              placeholder="0"
              type="number"
            />
          </label>
          {getFieldError("downtimeDaysAwarded") ? (
            <p style={errorTextStyle}>{getFieldError("downtimeDaysAwarded")}</p>
          ) : null}
        </div>

        <div className="stack" style={fieldBlockStyle}>
          <label>
            <span>Awarded Coin (Total in GP) <small className="muted">Optional. Can be variable.</small></span>
            <input
              aria-invalid={Boolean(getFieldError("rewardsSummary"))}
              value={rewardsSummaryValue}
              name="rewardsSummary"
              onChange={(event) => {
                setRewardsSummaryValue(event.target.value);
                clearFieldError("rewardsSummary");
              }}
              type="text"
            />
          </label>
          {getFieldError("rewardsSummary") ? (
            <p style={errorTextStyle}>{getFieldError("rewardsSummary")}</p>
          ) : null}
        </div>
      </div>
      <GameRewardFields
        initialConsumablesAwarded={consumablesAwardedValue}
        initialMagicItemsAwarded={magicItemsAwardedValue}
        initialSpellbookAwarded={spellbookAwardedValue}
        legalBlessingOptions={legalBlessingOptions}
        legalBoonOptions={legalBoonOptions}
        legalBuildMagicItemOptions={legalBuildMagicItemOptions}
        legalCharmOptions={legalCharmOptions}
        legalCommonMagicItemOptions={legalCommonMagicItemOptions}
        legalConsumableOptions={legalConsumableOptions}
        legalMinorPropertyOptions={legalMinorPropertyOptions}
      />
      {getFieldError("magicItemsAwarded") ? (
        <p style={errorTextStyle}>{getFieldError("magicItemsAwarded")}</p>
      ) : null}
      {getFieldError("consumablesAwarded") ? (
        <p style={errorTextStyle}>{getFieldError("consumablesAwarded")}</p>
      ) : null}
      {getFieldError("spellbookAwarded") ? (
        <p style={errorTextStyle}>{getFieldError("spellbookAwarded")}</p>
      ) : null}
      <label>
        Session notes/Story Awards
        <BulletTextarea
          key={`session-notes-${sessionNotesValue}`}
          aria-invalid={Boolean(getFieldError("sessionNotes"))}
          defaultValue={sessionNotesValue}
          name="sessionNotes"
          onBlur={() => {
            clearFieldError("sessionNotes");
          }}
        />
      </label>
      {getFieldError("sessionNotes") ? (
        <p style={errorTextStyle}>{getFieldError("sessionNotes")}</p>
      ) : null}
      <p className="muted" style={{ margin: 0 }}>
        Each line is a bullet point.
      </p>

      {!eventMode && <>
      <div className="list-card stack dm-game-section-heading">
          <h2>Participants</h2>
          <p className="muted">
            Search Player Roster, then select one of their characters or mark them as TBD before
            adding them to the game.
          </p>
          {getFieldError("participants") ? (
            <p style={errorTextStyle}>{getFieldError("participants")}</p>
          ) : null}
      </div>
      <div className="panel stack dm-game-player-search">
        <div className="form-grid">
          <div className="stack" style={fieldBlockStyle}>
            <span>Search players</span>
            <div className="search-row">
              <input
                type="search"
                value={searchDraft}
                onChange={(event) => {
                  setSearchDraft(event.target.value);
                  clearFieldError("participants");
                }}
                placeholder="Search by player name"
              />
              <button
                aria-label="Search players"
                className="button secondary search-icon-button"
                onClick={() => setSearch(searchDraft)}
                type="button"
              >
                <SearchIcon />
              </button>
            </div>
          </div>
          <label>
            Player
            <select
              value={selectedPlayer?.id ?? ""}
              onChange={(event) => {
                setSelectedUserId(event.target.value);
                setSelectedCharacterId("");
                clearFieldError("participants");
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
                clearFieldError("participants");
              }}
            >
              <option value="">Select a character or TBD</option>
              <option value={TBD_CHARACTER_VALUE}>{TBD_CHARACTER_OPTION_LABEL}</option>
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
                  setFieldErrors((current) => ({
                    ...current,
                    participants: "Choose a player and either a character or TBD.",
                  }));
                  setError("Choose a player and either a character or TBD.");
                  return;
                }

                const character =
                  selectedCharacterId === TBD_CHARACTER_VALUE
                    ? null
                    : selectedPlayer.characters.find((entry) => entry.id === selectedCharacterId);

                if (selectedCharacterId !== TBD_CHARACTER_VALUE && !character) {
                  setFieldErrors((current) => ({
                    ...current,
                    participants: "The selected character was not found.",
                  }));
                  setError("The selected character was not found.");
                  return;
                }

                const exists = participants.some(
                  (participant) =>
                    Boolean(character?.id) && participant.characterId === character?.id
                );

                if (exists) {
                  setFieldErrors((current) => ({
                    ...current,
                    participants: "A character cannot be added to the same game twice.",
                  }));
                  setError("A character cannot be added to the same game twice.");
                  return;
                }

                setParticipants((current) => [
                  ...current,
                  {
                    userId: selectedPlayer.id,
                    userName: selectedPlayer.name,
                    characterId: character?.id ?? null,
                    characterName: character?.name ?? TBD_CHARACTER_LABEL,
                  },
                ]);
                setSelectedCharacterId("");
                setError("");
                clearFieldError("participants");
              }}
            >
              Add participant
            </button>
          </div>
        </div>

        <div className="stack">
          {participants.length ? (
            participants.map((participant, participantIndex) => (
              <div
                key={`${participant.userId}-${participant.characterId ?? "tbd"}-${participantIndex}`}
                className="list-card"
              >
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
                          (_, index) => index !== participantIndex
                        )
                      );
                      clearFieldError("participants");
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

      </>}
      {eventNotes}
      </fieldset>
      {error ? <p role="alert" style={errorTextStyle}>{error}</p> : null}

      {phase === 2 && <div className="inline-actions">
      <button type="button" className="button-secondary" onClick={() => setPhase(1)} disabled={isPending}>Back to adventure</button>
      <button type="submit" disabled={isPending || submissionDisabled}>
        {isPending ? pendingLabel : submitLabel}
      </button>
      </div>}
    </form>
  );
}
