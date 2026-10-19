import assert from "node:assert/strict";
import { test } from "node:test";
import { redirectWithinSite } from "../lib/site-redirect";

test("curated game success redirects stay on the browser's public origin", () => {
  const path = "/admin/grimoire-gathering?game=created&editEvent=ggcon-feymas-annual";
  const response = redirectWithinSite(path);
  assert.equal(response.status, 303);
  assert.equal(response.headers.get("Location"), path);
  assert.equal(new URL(response.headers.get("Location")!, "https://www.spellbookrpg.games/admin/grimoire-gathering/curated-games/create").href,
    `https://www.spellbookrpg.games${path}`);
});

test("editing, validation, and auth fallback redirects keep their path and query", () => {
  for (const path of ["/login", "/", "/admin/grimoire-gathering?game=updated&editGame=example", "/admin/grimoire-gathering?game=invalid-fields&gameDetails=Choose+a+slot"])
    assert.equal(redirectWithinSite(path).headers.get("Location"), path);
});

test("the same relative redirect also works on localhost in development", () => {
  const response = redirectWithinSite("/admin/grimoire-gathering?game=created");
  assert.equal(new URL(response.headers.get("Location")!, "http://localhost:3000").origin, "http://localhost:3000");
});

test("external URLs and unsafe Location headers cannot be used", () => {
  for (const path of ["https://evil.example", "//evil.example", "/\\evil.example", "/path\r\nLocation: https://evil.example"])
    assert.throws(() => redirectWithinSite(path));
});
