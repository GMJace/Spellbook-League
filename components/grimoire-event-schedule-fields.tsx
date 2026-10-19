"use client";

import { useRef, useState } from "react";
import { DatePickerField } from "@/components/date-picker-field";
import { STANDARD_GRIMOIRE_TIME_SLOTS, getGrimoireEventDateFieldName } from "@/lib/grimoire-slots";

type SlotInput = {
  slotKey: string;
  date: string;
  startTime: string;
  durationHours: number;
  gameSlotCount: number;
};

export function GrimoireEventScheduleFields({
  initialDate = "",
  initialDisplayDate = "",
  initialSlots = [],
}: {
  initialDate?: string;
  initialDisplayDate?: string;
  initialSlots?: SlotInput[];
}) {
  const [date, setDate] = useState(initialDate);
  const [useTemplate, setUseTemplate] = useState(
    initialSlots.length === STANDARD_GRIMOIRE_TIME_SLOTS.length &&
    STANDARD_GRIMOIRE_TIME_SLOTS.every((slot) => initialSlots.some((entry) => entry.slotKey === slot.key)),
  );
  const [rows, setRows] = useState(() => (initialSlots.length ? initialSlots : [{
    slotKey: "", date: initialDate, startTime: "", durationHours: 4, gameSlotCount: 1,
  }]).map((slot, id) => ({ ...slot, id })));
  const nextId = useRef(rows.length);

  function updateRow(id: number, changes: Partial<SlotInput>) {
    setRows((current) => current.map((row) => row.id === id ? { ...row, ...changes } : row));
  }

  return (
    <div className="stack">
      <div className="form-grid">
        <DatePickerField label="Event start date" name="date" required value={date}
          onChange={(event) => {
            const value = event.target.value;
            setDate(value);
            setRows((current) => current.map((row) => !row.date ? { ...row, date: value } : row));
          }} />
        <label>Display date
          <input defaultValue={initialDisplayDate} name="displayDate" placeholder="October 19–30, 2026" required type="text" />
        </label>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Start on any date. Add time slots on as many dates as your event needs, with any number of tables per slot. All times use Mountain time (America/Edmonton).
      </p>
      <label className="ggcon-checkbox-row ggcon-template-checkbox-row">
        <input checked={useTemplate} onChange={(event) => setUseTemplate(event.target.checked)}
          name="useEventTimeSlotTemplate" type="checkbox" />
        <span>Use event time slot template</span>
      </label>
      {useTemplate ? (
        <div className="stack">
          <p className="muted" style={{ margin: 0 }}>The optional template covers three days starting on your chosen date. Each time slot lasts four hours.</p>
          <div className="form-grid">
            {STANDARD_GRIMOIRE_TIME_SLOTS.map((slot) => (
              <label key={slot.key}>Day {slot.dayOffset + 1}, {slot.hour === 12 ? "12pm" : slot.hour > 12 ? `${slot.hour - 12}pm` : `${slot.hour}am`}
                <input name={getGrimoireEventDateFieldName(slot.key)} type="number" min="0" step="1" required
                  defaultValue={initialSlots.find((entry) => entry.slotKey === slot.key)?.gameSlotCount ?? 0} />
              </label>
            ))}
          </div>
        </div>
      ) : (
        <div className="stack">
          <strong>Custom event time slots</strong>
          {rows.map((row, index) => (
            <fieldset key={row.id} className="ggcon-custom-slot-row">
              <legend>Time slot {index + 1}</legend>
              <input type="hidden" name="customSlotKey" value={row.slotKey} />
              <div className="form-grid">
                <DatePickerField label={`Slot ${index + 1} date`} name="customSlotDate" required min={date || undefined}
                  value={row.date} onChange={(event) => updateRow(row.id, { date: event.target.value })} />
                <label>Start time
                  <input name="customSlotStartTime" type="time" required value={row.startTime}
                    onChange={(event) => updateRow(row.id, { startTime: event.target.value })} />
                </label>
                <label>Duration hours
                  <input name="customSlotDurationHours" type="number" min="0.5" max="24" step="0.5" required
                    value={row.durationHours} onChange={(event) => updateRow(row.id, { durationHours: Number(event.target.value) })} />
                </label>
                <label>Number of game tables
                  <input name="customSlotCount" type="number" min="0" step="1" required
                    value={row.gameSlotCount} onChange={(event) => updateRow(row.id, { gameSlotCount: Number(event.target.value) })} />
                </label>
              </div>
              <button className="button-danger button-small" type="button" disabled={rows.length === 1}
                onClick={() => setRows((current) => current.filter((entry) => entry.id !== row.id))}>
                Remove time slot {index + 1}
              </button>
            </fieldset>
          ))}
          <button type="button" className="button button-secondary" onClick={() => {
            const id = nextId.current++;
            setRows((current) => [...current, { id, slotKey: "", date: current[current.length - 1]?.date || date,
              startTime: "", durationHours: 4, gameSlotCount: 1 }]);
          }}>Add time slot</button>
        </div>
      )}
    </div>
  );
}
