import assert from "node:assert/strict";
import { test } from "node:test";
import { buildCuratedGameSlug } from "../lib/curated-game-slug";

test("repeated adventures receive independent URLs for different listings", () => {
  const first = buildCuratedGameSlug("Feymas Adventure", "a2f365bc-335c-4fe1-ae30-67c3ece3a62b");
  const second = buildCuratedGameSlug("Feymas Adventure", "b3d443bd-3caa-446b-933f-522b37c275cd");
  assert.notEqual(first, second);
  assert.match(first!, /^feymas-adventure-/);
});

test("different titles that normalize identically still get different URLs", () => {
  assert.notEqual(buildCuratedGameSlug("A Dragon's Gift!", "game-a"), buildCuratedGameSlug("A Dragon s Gift", "game-b"));
});

test("URL generation is stable for a given listing and strips punctuation", () => {
  assert.equal(buildCuratedGameSlug("  A Feymas: Adventure!  ", "game-id"), "a-feymas-adventure-game-id");
  assert.equal(buildCuratedGameSlug("!!!", "game-id"), null);
});
