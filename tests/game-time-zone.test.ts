import assert from "node:assert/strict";
import test from "node:test";
import { formatGameDateInZone, gameDateToUtc } from "../lib/game-time-zone";

test("game times use the selected timezone and seasonal offset", () => {
  assert.equal(gameDateToUtc("2026-01-15T19:00", "America/Edmonton"), "2026-01-16T02:00:00.000Z");
  assert.equal(gameDateToUtc("2026-07-15T19:00", "America/Edmonton"), "2026-07-16T01:00:00.000Z");
  assert.equal(gameDateToUtc("2026-07-15T19:00", "Asia/Kathmandu"), "2026-07-15T13:15:00.000Z");
  assert.equal(gameDateToUtc("2026-07-15T19:00", "UTC"), "2026-07-15T19:00:00.000Z");
});

test("skipped daylight-saving times and invalid calendar inputs are rejected", () => {
  assert.throws(() => gameDateToUtc("2026-03-08T02:30", "America/Edmonton"), /does not exist/);
  assert.throws(() => gameDateToUtc("2026-02-30T19:00", "UTC"), /valid game date/);
  assert.throws(() => gameDateToUtc("", "UTC"), /valid game date/);
  assert.throws(() => gameDateToUtc("2026-07-15T19:00", "Not/AZone"));
});

test("repeated hours choose the first occurrence while unchanged edits preserve the saved instant", () => {
  assert.equal(gameDateToUtc("2026-11-01T01:30", "America/Edmonton"), "2026-11-01T07:30:00.000Z");
  const saved = "2026-11-01T08:30:00.000Z";
  const local = formatGameDateInZone(saved, "America/Edmonton");
  assert.equal(local, "2026-11-01T01:30");
  assert.equal(gameDateToUtc(local, "America/Edmonton", saved), saved);
  assert.equal(gameDateToUtc("2026-11-01T03:30", "America/Edmonton", saved), "2026-11-01T10:30:00.000Z");
});
