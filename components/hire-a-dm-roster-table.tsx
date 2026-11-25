"use client";

import Link from "next/link";
import { useMemo, useState } from "react";

import { ProfileAvatar } from "@/components/profile-avatar";
import { RainbowSpellbook } from "@/components/rainbow-spellbook";
import { SearchIcon } from "@/components/search-icon";
import { formatStarRating } from "@/lib/utils";

export type HireDmRosterRow = {
  id: string;
  name: string;
  email: string;
  profileImagePath: string | null;
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
  const [searchDraft, setSearchDraft] = useState("");
  const filteredRoster = useMemo(() => filterRoster(roster, search), [roster, search]);

  return (
    <div className="stack" style={{ gap: "0.8rem" }}>
      <div className="stack" style={{ gap: "0.45rem" }}>
        <strong>
          <RainbowSpellbook /> DMs
        </strong>
        <form
          className="search-row"
          onSubmit={(event) => {
            event.preventDefault();
            setSearch(searchDraft);
          }}
        >
          <input
            aria-label="Search dungeon masters"
            className="input"
            onChange={(event) => setSearchDraft(event.target.value)}
            placeholder="Search by DM name or specialty"
            type="search"
            value={searchDraft}
          />
          <button className="button secondary search-icon-button" type="submit" aria-label="Search dungeon masters">
            <SearchIcon />
          </button>
        </form>
      </div>

      <div className="hire-dm-roster-cards">
        {roster.length === 0 ? (
          <p className="muted">
            The <RainbowSpellbook /> DM roster is empty right now.
          </p>
        ) : filteredRoster.length ? (
          filteredRoster.map((dm: HireDmRosterRow) => (
            <article className="list-card stack" key={dm.id} aria-label={dm.name}>
              <ProfileAvatar name={dm.name} src={dm.profileImagePath} size={96} />
              <dl className="dashboard-account-info">
                <div><dt>Dungeon Master:</dt><dd>{dm.name}</dd></div>
                <div><dt>Rating:</dt><dd>{formatStarRating(dm.rating)}</dd></div>
                <div><dt>Experience:</dt><dd>{dm.gamesLogged} games, {dm.playersHosted} players hosted</dd></div>
              </dl>
              <div className="inline-actions">
                <Link
                  className="button button-secondary button-small"
                  href={`/hire-a-dm/${dm.id}`}
                >
                  View profile
                </Link>
                {dm.isListed ? (
                  <>
                    <Link className="button button-small" href={`/hire-a-dm/${dm.id}/hire`}>
                      Hire DM
                    </Link>
                    <Link className="button button-secondary button-small" href={`/hire-a-dm/${dm.id}/rate`}>
                      Rate DM
                    </Link>
                  </>
                ) : (
                  <span className="muted">Not listed</span>
                )}
              </div>
            </article>
          ))
        ) : (
          <p className="muted">No DMs match that search.</p>
        )}
      </div>
    </div>
  );
}
