"use client";

import { useState } from "react";

import { DatePickerField } from "@/components/date-picker-field";
import {
  dmServiceActivities,
  dmServiceAwardCategories,
} from "@/lib/dm-service-awards";

type ActivityRow = {
  id: number;
};

export function DmServiceLogForm({
  createAction,
}: {
  createAction: (formData: FormData) => void;
}) {
  const [rows, setRows] = useState<ActivityRow[]>([{ id: 0 }]);

  return (
    <form action={createAction} className="form-stack">
      <DatePickerField label="Activity date" name="activityDate" required type="date" />
      <label>
        Title
        <input
          name="title"
          placeholder="Adventure, session, mentoring, or award name"
          required
          type="text"
        />
      </label>
      <label>
        Adventure code
        <input name="adventureCode" placeholder="Optional" type="text" />
      </label>

      <div className="dm-service-activity-rows">
        {rows.map((row, index) => (
          <div className="dm-service-activity-row" key={row.id}>
            <div className="inline-actions" style={{ justifyContent: "space-between" }}>
              <strong>Activity {index + 1}</strong>
              {rows.length > 1 ? (
                <button
                  className="button-danger button-small"
                  onClick={() => setRows((currentRows) => currentRows.filter((entry) => entry.id !== row.id))}
                  type="button"
                >
                  Remove
                </button>
              ) : null}
            </div>
            <div className="form-grid">
              <label className="form-span-full">
                Activity
                <select name="activityType" required>
                  {dmServiceAwardCategories.map((category) => (
                    <optgroup key={category} label={category}>
                      {dmServiceActivities
                        .filter((activity) => activity.category === category)
                        .map((activity) => (
                          <option key={activity.value} value={activity.value}>
                            {activity.label} - {activity.award}
                          </option>
                        ))}
                    </optgroup>
                  ))}
                </select>
              </label>
              <label>
                Service hours
                <input
                  defaultValue="0"
                  min="0"
                  name="activityHours"
                  step="0.25"
                  type="number"
                />
              </label>
            </div>
            <p className="muted" style={{ margin: 0 }}>
              Enter hours for service activities. Fixed-hour achievements use their award value.
            </p>
          </div>
        ))}
      </div>

      <button
        className="button secondary"
        onClick={() =>
          setRows((currentRows) => [
            ...currentRows,
            { id: (currentRows.at(-1)?.id ?? 0) + 1 },
          ])
        }
        type="button"
      >
        Add activity
      </button>

      <div className="form-grid">
        <label>
          Used safety tools?
          <select defaultValue="no" name="safetyToolsUsed">
            <option value="no">No</option>
            <option value="yes">Yes (+1 service hour)</option>
          </select>
        </label>
        <label>
          New AL players
          <input defaultValue="0" min="0" name="newAlPlayerCount" step="1" type="number" />
        </label>
      </div>
      <p className="muted" style={{ margin: 0 }}>
        Each new AL player adds 1 service hour.
      </p>

      <label>
        Notes
        <textarea name="notes" placeholder="Optional context for this service entry." />
      </label>
      <button className="button" type="submit">
        Log service
      </button>
    </form>
  );
}
