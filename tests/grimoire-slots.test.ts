import assert from "node:assert/strict";
import { test } from "node:test";
import {
  buildCustomGrimoireEventSlots,
  buildStandardGrimoireEventSlots,
  formatGrimoireEventDateInput,
  formatGrimoireEventTimeInput,
  getGrimoireEventStartDate,
  STANDARD_GRIMOIRE_TIME_SLOTS,
  type GrimoireTimeSlotKey,
} from "../lib/grimoire-slots";

function schedule(rows: Array<{ date: string; time?: string; count?: string; key?: string }>) {
  const form = new FormData();
  form.set("date", "2026-10-19");
  for (const row of rows) {
    form.append("customSlotDate", row.date);
    form.append("customSlotStartTime", row.time ?? "17:00");
    form.append("customSlotDurationHours", "4");
    form.append("customSlotCount", row.count ?? "1");
    form.append("customSlotKey", row.key ?? "");
  }
  return form;
}

test("a one-day event can start on Monday and offer more than 99 games", () => {
  const result = buildCustomGrimoireEventSlots(schedule([{ date: "2026-10-19", count: "150" }]));
  assert.deepEqual(result.errors, []);
  assert.equal(result.slots.length, 1);
  assert.equal(result.slots[0].gameSlotCount, 150);
  assert.equal(formatGrimoireEventTimeInput(result.slots[0].startAt), "17:00");
});

test("more than six slots may span any number of dates and are sorted", () => {
  const dates = ["2026-10-19", "2026-10-20", "2026-10-21", "2026-10-22", "2026-10-23", "2026-10-24", "2026-11-02", "2026-12-31"];
  const result = buildCustomGrimoireEventSlots(schedule([...dates].reverse().map((date) => ({ date }))));
  assert.deepEqual(result.errors, []);
  assert.deepEqual(result.slots.map((slot) => formatGrimoireEventDateInput(slot.startAt)), dates);
  assert.match(result.slots[0].label, /Oct 19, 2026/);
  assert.equal(formatGrimoireEventTimeInput(result.slots[6].startAt), "17:00");
});

test("editing keeps slot identities even when dates and times change", () => {
  const result = buildCustomGrimoireEventSlots(schedule([{ date: "2026-11-02", key: "custom_original", time: "12:30" }]));
  assert.deepEqual(result.errors, []);
  assert.equal(result.slots[0].slotKey, "custom_original");
});

test("duplicate start times and duplicate identities fail before database save", () => {
  assert.ok(buildCustomGrimoireEventSlots(schedule([{ date: "2026-10-19" }, { date: "2026-10-19" }])).errors.length);
  assert.ok(buildCustomGrimoireEventSlots(schedule([{ date: "2026-10-19", key: "same" }, { date: "2026-10-20", key: "same" }])).errors.length);
});

test("invalid calendar dates, times, and capacities are rejected", () => {
  for (const row of [
    { date: "2026-02-30" }, { date: "2026-10-19", time: "25:00" },
    { date: "2026-10-19", count: "1.5" }, { date: "2026-10-19", count: "-1" },
    { date: "2026-10-19", count: "" }, { date: "2026-10-18" },
  ]) assert.ok(buildCustomGrimoireEventSlots(schedule([row])).errors.length);
});

test("nonexistent daylight-saving times are rejected", () => {
  const form = schedule([{ date: "2027-03-14", time: "02:30" }]);
  assert.match(buildCustomGrimoireEventSlots(form).errors.join(" "), /daylight saving/);
});

test("optional three-day template can begin on any weekday", () => {
  const counts = Object.fromEntries(STANDARD_GRIMOIRE_TIME_SLOTS.map((slot) => [slot.key, 120])) as Record<GrimoireTimeSlotKey, number>;
  const slots = buildStandardGrimoireEventSlots("2026-10-19", counts)!;
  assert.equal(formatGrimoireEventDateInput(slots[0].startAt), "2026-10-19");
  assert.equal(formatGrimoireEventDateInput(slots[5].startAt), "2026-10-21");
  assert.match(slots[0].label, /Monday/);
  assert.equal(buildStandardGrimoireEventSlots("2026-02-30", counts), null);
});

test("event start date stays independent of the first scheduled game", () => {
  assert.equal(formatGrimoireEventDateInput(getGrimoireEventStartDate("2026-10-19")!), "2026-10-19");
  assert.equal(formatGrimoireEventTimeInput(getGrimoireEventStartDate("2026-10-19")!), "00:00");
  assert.equal(getGrimoireEventStartDate("2026-02-30"), null);
});
