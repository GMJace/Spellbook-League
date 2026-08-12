"use client";

import { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";

import { createGrimoireDmSubmission } from "@/app/grimoire-gathering/dm/actions";
import { BulletTextarea } from "@/components/bullet-textarea";
import { GameRewardFields } from "@/components/game-reward-fields";
import type { LegalRewardOptions } from "@/lib/game-reward-selections";
import type { GrimoireEventSlot, SeasonEvent } from "@/lib/grimoire";

type GrimoireDmSubmissionFormProps = {
  events: SeasonEvent[];
  initialEventId?: string;
  initialValues?: {
    discord?: string;
    email?: string;
    name?: string;
  };
  legalRewardsJson: string;
  slotsByEvent: Record<string, GrimoireEventSlot[]>;
};

const tiers = [
  { value: "TIER_1", label: "Tier 1" },
  { value: "TIER_2", label: "Tier 2" },
  { value: "TIER_3", label: "Tier 3" },
  { value: "TIER_4", label: "Tier 4" },
] as const;

export function GrimoireDmSubmissionForm({
  events,
  initialEventId,
  initialValues,
  legalRewardsJson,
  slotsByEvent,
}: GrimoireDmSubmissionFormProps) {
  const router = useRouter();
  const legalRewards = useMemo(
    () => JSON.parse(legalRewardsJson) as LegalRewardOptions,
    [legalRewardsJson]
  );
  const defaultEventId = initialEventId ?? events[0]?.id ?? "";
  const [selectedEventId, setSelectedEventId] = useState(defaultEventId);
  const eventSlots = useMemo(
    () => slotsByEvent[selectedEventId] ?? [],
    [selectedEventId, slotsByEvent]
  );
  const openSlots = useMemo(
    () => eventSlots.filter((slot) => !slot.isFull),
    [eventSlots]
  );
  const [selectedEventSlotId, setSelectedEventSlotId] = useState(
    openSlots[0]?.id ?? ""
  );
  const [message, setMessage] = useState("");
  const [rewardFieldsKey, setRewardFieldsKey] = useState(0);
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    setSelectedEventSlotId(openSlots[0]?.id ?? "");
  }, [openSlots]);

  return (
    <form
      className="form-stack"
      onSubmit={(event) => {
        event.preventDefault();
        setMessage("");

        const form = event.currentTarget;
        const formData = new FormData(form);

        startTransition(async () => {
          const result = await createGrimoireDmSubmission(formData);

          if (result?.error) {
            setMessage(result.error);
            return;
          }

          setMessage(result?.success ?? "Submission saved.");
          form.reset();
          setSelectedEventId(defaultEventId);
          setSelectedEventSlotId(
            (slotsByEvent[defaultEventId] ?? []).find((slot) => !slot.isFull)?.id ?? ""
          );
          setRewardFieldsKey((current) => current + 1);
          router.refresh();
        });
      }}
    >
      <div className="form-grid">
        <label>
          DM name
          <input defaultValue={initialValues?.name ?? ""} name="name" required type="text" />
        </label>
        <label>
          Discord handle
          <input
            defaultValue={initialValues?.discord ?? ""}
            name="discord"
            placeholder="@spellbookdm"
            type="text"
          />
        </label>
      </div>

      <label>
        DM email
        <input defaultValue={initialValues?.email ?? ""} name="email" required type="email" />
      </label>

      <div className="form-grid">
        <label>
          Game title
          <input name="title" required type="text" />
        </label>

        <label>
          Game code
          <input name="gameCode" required type="text" />
        </label>
      </div>

      <div className="form-grid">
        <label>
          Published event
          <select
            name="eventId"
            onChange={(event) => {
              setSelectedEventId(event.target.value);
            }}
            required
            value={selectedEventId}
          >
            {events.map((event) => (
              <option key={event.id} value={event.id}>
                {event.subtitle} ({event.displayDate})
              </option>
            ))}
          </select>
        </label>
        <label>
          Event time slot
          <select
            name="eventSlotId"
            onChange={(event) => {
              setSelectedEventSlotId(event.target.value);
            }}
            required
            value={selectedEventSlotId}
          >
            {openSlots.map((slot) => (
              <option key={slot.id} value={slot.id}>
                {slot.label} ({slot.availableGameSlots} of {slot.gameSlotCount} open)
              </option>
            ))}
          </select>
        </label>
        <label>
          Tier
          <select defaultValue="TIER_1" name="tier">
            {tiers.map((tier) => (
              <option key={tier.value} value={tier.value}>
                {tier.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          Seats
          <input defaultValue={6} max={8} min={1} name="seats" type="number" />
        </label>
      </div>

      {eventSlots.length ? null : (
        <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
          No published time slots are available for the selected event yet.
        </p>
      )}
      {eventSlots.length && !openSlots.length ? (
        <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
          All game slots for this event are currently full. Event admins need to open more table
          slots before another DM can submit for this event.
        </p>
      ) : null}

      <label>
        Game summary (Include themes and content advisories)
        <textarea name="summary" required />
      </label>
      <p className="muted" style={{ margin: 0 }}>
        Each line is a bullet point.
      </p>

      <label>
        Service hours (AL DM rewards)
        <input
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
            inputMode="numeric"
            min="0"
            name="downtimeDaysAwarded"
            placeholder="0"
            type="number"
          />
        </label>

        <label>
          Awarded Gold (Total in GP)
          <input name="rewardsSummary" type="text" />
        </label>
      </div>

      <GameRewardFields
        key={rewardFieldsKey}
        legalBlessingOptions={legalRewards.legalBlessingOptions}
        legalBoonOptions={legalRewards.legalBoonOptions}
        legalBuildMagicItemOptions={legalRewards.legalBuildMagicItemOptions}
        legalCharmOptions={legalRewards.legalCharmOptions}
        legalCommonMagicItemOptions={legalRewards.legalCommonMagicItemOptions}
        legalConsumableOptions={legalRewards.legalConsumableOptions}
        legalMinorPropertyOptions={legalRewards.legalMinorPropertyOptions}
      />

      <label>
        Session notes/Story Awards
        <BulletTextarea name="sessionNotes" />
      </label>
      <p className="muted" style={{ margin: 0 }}>
        Each line is a bullet point.
      </p>

      <label>
        Notes for staff
        <textarea
          name="notes"
          placeholder="Share prep needs, content notes, or anything staff should know."
        />
      </label>

      {message ? <p className="muted ggcon-meta-note">{message}</p> : null}

      <button disabled={isPending || !openSlots.length} type="submit">
        {isPending ? "Saving submission..." : "Submit game for review"}
      </button>
    </form>
  );
}
