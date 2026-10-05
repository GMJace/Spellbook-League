"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";

import { formatGrimoireTier, type GrimoireGame, type SeasonEvent } from "@/lib/grimoire";

type GrimoireEventCalendarProps = {
  canViewGames: boolean;
  event: SeasonEvent;
  games: GrimoireGame[];
  nextAccessAt: string;
  publicOpensAt: string;
  tomeKeyOpensAt: string;
};

type DateParts = {
  day: number;
  hour: number;
  minute: number;
  month: number;
  second: number;
  weekday: string;
  year: number;
};

const EVENT_TIME_ZONE = "America/Edmonton";
const EVENT_DAYS = ["Friday", "Saturday", "Sunday"] as const;
const HOUR_START = 8;
const HOUR_END = 22;

function getTimeZoneDateParts(date: Date, timeZone: string): DateParts {
  const formatter = new Intl.DateTimeFormat("en-US", {
    day: "2-digit",
    hour: "2-digit",
    hour12: false,
    minute: "2-digit",
    month: "2-digit",
    second: "2-digit",
    timeZone,
    weekday: "long",
    year: "numeric",
  });
  const parts = Object.fromEntries(
    formatter.formatToParts(date).map((part) => [part.type, part.value]),
  );

  return {
    day: Number(parts.day),
    hour: Number(parts.hour),
    minute: Number(parts.minute),
    month: Number(parts.month),
    second: Number(parts.second),
    weekday: parts.weekday,
    year: Number(parts.year),
  };
}

function zonedTimeToDate(
  parts: Pick<DateParts, "day" | "month" | "year"> & {
    hour: number;
    minute?: number;
  },
  timeZone: string,
) {
  let utcTime = Date.UTC(
    parts.year,
    parts.month - 1,
    parts.day,
    parts.hour,
    parts.minute ?? 0,
    0,
  );

  for (let index = 0; index < 2; index += 1) {
    const zoneParts = getTimeZoneDateParts(new Date(utcTime), timeZone);
    const zoneAsUtc = Date.UTC(
      zoneParts.year,
      zoneParts.month - 1,
      zoneParts.day,
      zoneParts.hour,
      zoneParts.minute,
      zoneParts.second,
    );
    utcTime -= zoneAsUtc - utcTime;
  }

  return new Date(utcTime);
}

function addDays(parts: Pick<DateParts, "day" | "month" | "year">, days: number) {
  const date = new Date(Date.UTC(parts.year, parts.month - 1, parts.day + days, 12));

  return {
    day: date.getUTCDate(),
    month: date.getUTCMonth() + 1,
    year: date.getUTCFullYear(),
  };
}

function getEventCalendarDays(eventStartIso: string) {
  const eventParts = getTimeZoneDateParts(new Date(eventStartIso), EVENT_TIME_ZONE);
  const weekdayIndex = EVENT_DAYS.findIndex((day) => day === eventParts.weekday);
  const fridayOffset = weekdayIndex >= 0 ? -weekdayIndex : -1;
  const friday = addDays(eventParts, fridayOffset);

  return EVENT_DAYS.map((label, index) => {
    const dateParts = addDays(friday, index);
    const start = zonedTimeToDate({ ...dateParts, hour: HOUR_START }, EVENT_TIME_ZONE);
    const end = zonedTimeToDate({ ...dateParts, hour: HOUR_END }, EVENT_TIME_ZONE);

    return {
      end,
      label,
      start,
      ...dateParts,
    };
  });
}

function formatLocalDate(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    month: "short",
    timeZone,
    weekday: "short",
  }).format(date);
}

function formatLocalHour(date: Date, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    hour: "numeric",
    minute: "2-digit",
    timeZone,
  }).format(date);
}

function formatAccessTime(isoString: string, timeZone?: string) {
  return new Intl.DateTimeFormat("en-US", {
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    month: "short",
    timeZone,
    timeZoneName: "short",
    weekday: "short",
  }).format(new Date(isoString));
}

function getCartHref(game: GrimoireGame) {
  const params = new URLSearchParams({
    badges: "1",
    games: game.slug,
  });

  return `/grimoire-gathering/cart?${params.toString()}`;
}

export function GrimoireEventCalendar({
  canViewGames,
  event,
  games,
  nextAccessAt,
  publicOpensAt,
  tomeKeyOpensAt,
}: GrimoireEventCalendarProps) {
  const [userTimeZone, setUserTimeZone] = useState<string>(EVENT_TIME_ZONE);
  const calendarDays = useMemo(() => getEventCalendarDays(event.date), [event.date]);
  const hourRows = useMemo(
    () => Array.from({ length: HOUR_END - HOUR_START }, (_, index) => HOUR_START + index),
    [],
  );

  useEffect(() => {
    setUserTimeZone(Intl.DateTimeFormat().resolvedOptions().timeZone);
  }, []);

  const gamesByDayHour = useMemo(() => {
    const groupedGames = new Map<string, GrimoireGame[]>();

    for (const game of games) {
      const startDate = new Date(game.startAt);
      const dayIndex = calendarDays.findIndex(
        (day) => startDate >= day.start && startDate < day.end,
      );

      if (dayIndex < 0) {
        continue;
      }

      const mountainParts = getTimeZoneDateParts(startDate, EVENT_TIME_ZONE);
      const key = `${dayIndex}:${mountainParts.hour}`;
      groupedGames.set(key, [...(groupedGames.get(key) ?? []), game]);
    }

    return groupedGames;
  }, [calendarDays, games]);

  return (
    <section className="card ledger-panel stack ggcon-calendar-section">
      <div className="section-heading">
        <div className="stack" style={{ gap: "0.45rem" }}>
          <p className="eyebrow">Ticket Sales Calendar</p>
          <h2 style={{ margin: 0 }}>Grimoire Gathering Games</h2>
          <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
            Friday through Sunday, 8:00 AM to 10:00 PM Mountain time, displayed in
            your local time zone.
          </p>
        </div>
        <Link className="button secondary" href="/grimoire-gathering/cart">
          Open cart
        </Link>
      </div>

      {canViewGames ? (
        <div className="ggcon-calendar-wrap">
          <div className="ggcon-calendar-grid">
            <div className="ggcon-calendar-corner">
              <span>Local time</span>
            </div>
            {calendarDays.map((day) => (
              <div className="ggcon-calendar-day-header" key={day.label}>
                <strong>{day.label}</strong>
                <span>{formatLocalDate(day.start, userTimeZone)}</span>
              </div>
            ))}

            {hourRows.map((hour) => {
              const hourStart = zonedTimeToDate(
                { ...calendarDays[0], hour },
                EVENT_TIME_ZONE,
              );

              return [
                <div className="ggcon-calendar-hour" key={`hour-${hour}`}>
                  {formatLocalHour(hourStart, userTimeZone)}
                </div>,
                ...calendarDays.map((day, dayIndex) => {
                  const key = `${dayIndex}:${hour}`;
                  const slotGames = gamesByDayHour.get(key) ?? [];

                  return (
                    <div className="ggcon-calendar-cell" key={`${day.label}-${hour}`}>
                      {slotGames.map((game) => (
                        <article className="ggcon-calendar-game" key={game.slug}>
                          <div className="ggcon-calendar-game-time">
                            {formatLocalHour(new Date(game.startAt), userTimeZone)}
                          </div>
                          <Link
                            className="ggcon-calendar-game-title"
                            href={`/grimoire-gathering/games/${game.slug}`}
                          >
                            {game.game}
                          </Link>
                          <div className="ggcon-calendar-game-meta">
                            {formatGrimoireTier(game.tier)} · {game.ticketPrice}
                          </div>
                          {game.ticketPriceUsd > 0 && !game.isSubmission ? (
                            <Link className="ggcon-calendar-dm-link" href={getCartHref(game)}>
                              DM {game.dm}
                            </Link>
                          ) : (
                            <span className="ggcon-calendar-dm-muted">DM {game.dm}</span>
                          )}
                        </article>
                      ))}
                    </div>
                  );
                }),
              ];
            })}
          </div>
        </div>
      ) : (
        <div className="ggcon-calendar-locked stack">
          <strong>Game ticket listings open early for Tome Key Badge holders.</strong>
          <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
            Tome Key Badge access opens {formatAccessTime(tomeKeyOpensAt, userTimeZone)}.
            Public access opens {formatAccessTime(publicOpensAt, userTimeZone)}.
          </p>
          <p className="muted ggcon-meta-note" style={{ margin: 0 }}>
            Your next access window is {formatAccessTime(nextAccessAt, userTimeZone)}.
          </p>
          <div className="inline-actions" style={{ flexWrap: "wrap" }}>
            <Link
              className="button"
              href="/grimoire-gathering/cart?badges=1&badgeType=FLYING_CARPET"
            >
              Buy Tome Key Badge
            </Link>
            <Link className="button secondary" href="/login">
              Sign in
            </Link>
          </div>
        </div>
      )}
    </section>
  );
}
