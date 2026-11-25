"use client";

import { useEffect, useMemo, useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { createGrimoireDmSubmission } from "@/app/grimoire-gathering/dm/actions";
import { GameForm } from "@/components/game-form";
import type { LegalRewardOptions } from "@/lib/game-reward-selections";
import { parseStoredGameSummary } from "@/lib/game-summary";
import type { GrimoireEventSlot, SeasonEvent } from "@/lib/grimoire";

type GrimoireDmSubmissionFormProps = {
  events: SeasonEvent[];
  initialEventId?: string;
  initialValues?: { discord?: string; email?: string; name?: string };
  legalRewardsJson: string;
  slotsByEvent: Record<string, GrimoireEventSlot[]>;
  setupHeader?: ReactNode;
};

export function GrimoireDmSubmissionForm({ events, initialEventId, initialValues, legalRewardsJson, slotsByEvent, setupHeader }: GrimoireDmSubmissionFormProps) {
  const router = useRouter();
  const legalRewards = useMemo(() => JSON.parse(legalRewardsJson) as LegalRewardOptions, [legalRewardsJson]);
  const defaultEventId = events.some((event) => event.id === initialEventId) ? initialEventId! : events[0]?.id ?? "";
  const [selectedEventId, setSelectedEventId] = useState(defaultEventId);
  const eventSlots = slotsByEvent[selectedEventId] ?? [];
  const openSlots = useMemo(() => (slotsByEvent[selectedEventId] ?? []).filter((slot) => !slot.isFull), [selectedEventId, slotsByEvent]);
  const [selectedEventSlotId, setSelectedEventSlotId] = useState(openSlots[0]?.id ?? "");
  const [message, setMessage] = useState("");
  const [formKey, setFormKey] = useState(0);
  useEffect(() => { setSelectedEventSlotId(openSlots[0]?.id ?? ""); }, [openSlots]);

  if (!events.length) return (
    <div className="stack">
      {setupHeader && <section className="card stack dm-game-setup-card">{setupHeader}</section>}
      <p className="empty">There is no upcoming Grimoire event open for game submissions yet.</p>
    </div>
  );

  return (
    <div className="stack">
      {message && <p role="status">{message}</p>}
      <GameForm
        key={formKey}
        eventMode
        setupHeader={setupHeader}
        players={[]}
        {...legalRewards}
        submissionDisabled={!selectedEventSlotId || !openSlots.some((slot) => slot.id === selectedEventSlotId)}
        submitLabel="Submit game for review"
        pendingLabel="Saving submission..."
        eventDetails={
          <div className="form-stack">
            <p className="muted">Choose a published Grimoire event and an open time slot. The game follows that slot’s published schedule and is submitted for admin review.</p>
            <label>DM name<input defaultValue={initialValues?.name ?? ""} name="name" required type="text" /></label>
            <label>Discord handle<input defaultValue={initialValues?.discord ?? ""} name="discord" placeholder="@spellbookdm" type="text" /></label>
            <label>DM email<input defaultValue={initialValues?.email ?? ""} name="email" required type="email" /></label>
            <label>Planned event
              <select aria-label="Planned event" name="eventId" value={selectedEventId} required onChange={(event) => setSelectedEventId(event.target.value)}>
                {events.map((event) => <option key={event.id} value={event.id}>{event.subtitle} ({event.displayDate})</option>)}
              </select>
            </label>
            <label>Event time slot
              <select aria-label="Event time slot" name="eventSlotId" value={selectedEventSlotId} required onChange={(event) => setSelectedEventSlotId(event.target.value)}>
                {!openSlots.length && <option value="">No open time slots</option>}
                {openSlots.map((slot) => <option key={slot.id} value={slot.id}>{slot.label} ({slot.availableGameSlots} of {slot.gameSlotCount} open)</option>)}
              </select>
            </label>
            {!eventSlots.length && <p className="muted">No planned time slots are available for the selected event yet.</p>}
            {!!eventSlots.length && !openSlots.length && <p className="muted">All game slots for this event are currently full. Event admins need to open more table slots before another DM can submit for this event.</p>}
          </div>
        }
        eventNotes={<label>Notes for staff<textarea name="notes" placeholder="Share prep needs, content notes, or anything staff should know." /></label>}
        submitGame={async (formData) => {
          formData.set("gameCode", String(formData.get("adventureCode") ?? ""));
          formData.set("seats", String(formData.get("seatCapacity") ?? "6"));
          const summary = parseStoredGameSummary(String(formData.get("gameSummary") ?? ""));
          formData.set("summary", [summary.gameSummary, summary.themes.length ? `Themes:\n${summary.themes.join("\n")}` : "", summary.contentAdvisories.length ? `Content advisories:\n${summary.contentAdvisories.join("\n")}` : ""].filter(Boolean).join("\n\n"));
          const result = await createGrimoireDmSubmission(formData);
          if (result?.error) return { error: result.error };
          setMessage(result?.success ?? "Submission saved.");
          setSelectedEventId(defaultEventId);
          setSelectedEventSlotId((slotsByEvent[defaultEventId] ?? []).find((slot) => !slot.isFull)?.id ?? "");
          setFormKey((key) => key + 1);
          router.refresh();
        }}
      />
    </div>
  );
}
