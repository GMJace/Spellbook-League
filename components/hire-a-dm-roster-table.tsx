"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { formatStarRating } from "@/lib/utils";

export type HireDmRosterRow = {
  id: string;
  name: string;
  email: string;
  isListed: boolean;
  rating: number;
  specialties: string | null;
  headline: string | null;
  gamesLogged: number;
  playersHosted: number;
};

function filterRoster(rows: HireDmRosterRow[], query: string) {
  const normalized = query.trim().toLowerCase();

  if (!normalized) {
    return rows;
  }

  return rows.filter((row) => {
    return (
      row.name.toLowerCase().includes(normalized) ||
      (row.specialties ?? "").toLowerCase().includes(normalized)
    );
  });
}

export function HireDmRosterTable({ roster }: { roster: HireDmRosterRow[] }) {
  const [search, setSearch] = useState("");
  const filteredRoster = useMemo(() => filterRoster(roster, search), [roster, search]);

  return (
    <div className="stack" style={{ gap: "0.8rem" }}>
      <div className="stack" style={{ gap: "0.45rem" }}>
        <strong>
          <RainbowSpellbook /> DMs
        </strong>
        <input
          aria-label="Search dungeon masters"
          className="input"
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search by DM name or specialty"
          type="search"
          value={search}
        />
      </div>

      <div className="table-wrap">
        <table className="ledger-table">
          <thead>
            <tr>
              <th>Dungeon Master</th>
              <th>Rating</th>
              <th>Experience</th>
              <th>Profile</th>
              <th>Hire DM</th>
              <th>Rate DM</th>
            </tr>
          </thead>
          <tbody>
            {roster.length === 0 ? (
              <tr>
                <td className="muted" colSpan={6}>
                  The <RainbowSpellbook /> DM roster is empty right now.
                </td>
              </tr>
            ) : filteredRoster.length ? (
              filteredRoster.map((dm: HireDmRosterRow) => (
                <tr key={dm.id}>
                  <td>{dm.name}</td>
                  <td>{formatStarRating(dm.rating)}</td>
                  <td>
                    {dm.gamesLogged} games, {dm.playersHosted} players hosted
                  </td>
                  <td>
                    <Link
                      className="button button-secondary button-small"
                      href={`/hire-a-dm/${dm.id}`}
                    >
                      View profile
                    </Link>
                  </td>
                  <td>
                    {dm.isListed ? (
                      <Link
                        className="button button-small"
                        href={`/hire-a-dm/${dm.id}/hire`}
                      >
                        Hire DM
                      </Link>
                    ) : (
                      <span className="muted">Not listed</span>
                    )}
                  </td>
                  <td>
                    {dm.isListed ? (
                      <Link
                        className="button button-secondary button-small"
                        href={`/hire-a-dm/${dm.id}/rate`}
                      >
                        Rate DM
                      </Link>
                    ) : (
                      <span className="muted">Not listed</span>
                    )}
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td className="muted" colSpan={6}>
                  No DMs match that search.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
